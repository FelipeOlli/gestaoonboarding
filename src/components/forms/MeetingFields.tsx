"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Building2, Calendar, CalendarClock, Clock, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MeetingSyncStatus } from "@/lib/db/schema";
import {
  formatDateInput,
  formatDateTime,
  formatTimeInput,
  maskDateInput,
  maskTimeInput,
  parseDateInput,
  parseTimeInput,
  roundTimeToQuarterHour,
} from "@/lib/utils";

type MeetingCompany = {
  id: string;
  razaoSocial: string;
};

type Props = {
  franchiseId: string;
  franchiseName: string;
  companies: MeetingCompany[];
  scheduledAt?: string | null;
  franqueadoEmail?: string | null;
  franchiseEmail?: string | null;
  syncStatus?: MeetingSyncStatus | string | null;
};

type ConflictState = {
  conflict: boolean;
  reason?: string;
  checking: boolean;
  sectorSlug?: string;
};

const DEFAULT_DURATION_MIN = 60;

export function MeetingFields({
  franchiseId,
  franchiseName,
  companies,
  scheduledAt,
  franqueadoEmail,
  franchiseEmail,
  syncStatus,
}: Props) {
  const initial = splitScheduledAt(scheduledAt);
  const [open, setOpen] = useState(false);
  const [dateValue, setDateValue] = useState(initial.date);
  const [timeValue, setTimeValue] = useState(initial.time);
  const [emailValue, setEmailValue] = useState("");
  const [attendeesPreview, setAttendeesPreview] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<ConflictState>({
    conflict: false,
    checking: false,
  });
  const prevOpenRef = useRef(false);
  const emailTouchedRef = useRef(false);
  const initialEmailRef = useRef("");

  useEffect(() => {
    const parsed = splitScheduledAt(scheduledAt);
    setDateValue(parsed.date);
    setTimeValue(parsed.time);
  }, [scheduledAt]);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open) return;
    if (!justOpened) return;

    emailTouchedRef.current = false;

    const suggested =
      normalizeSuggestedEmail(franqueadoEmail) ||
      normalizeSuggestedEmail(franchiseEmail);

    if (suggested) {
      setEmailValue(suggested);
      initialEmailRef.current = suggested;
      return;
    }

    setEmailValue("");
    initialEmailRef.current = "";

    if (!franchiseId) return;

    const controller = new AbortController();

    fetch(`/api/franchises/${franchiseId}/email`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { email?: string | null }) => {
        if (emailTouchedRef.current) return;

        const fetched = normalizeSuggestedEmail(data.email);
        if (!fetched) return;

        setEmailValue(fetched);
        initialEmailRef.current = fetched;
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [open, franchiseId, franqueadoEmail, franchiseEmail]);

  useEffect(() => {
    if (!open) return;

    const query = emailValue.trim()
      ? `?franqueadoEmail=${encodeURIComponent(emailValue.trim())}`
      : "";

    fetch(`/api/franchises/${franchiseId}/meeting/attendees${query}`)
      .then((res) => res.json())
      .then((data: { attendees?: string[] }) => {
        setAttendeesPreview(data.attendees ?? []);
      })
      .catch(() => setAttendeesPreview([]));
  }, [open, franchiseId, emailValue]);

  useEffect(() => {
    if (!open) return;

    const scheduledIso = combineDateTime(dateValue, timeValue);
    if (!scheduledIso) {
      setConflictState({ conflict: false, checking: false });
      return;
    }

    setConflictState((prev) => ({ ...prev, checking: true }));

    const timer = window.setTimeout(() => {
      fetch(`/api/franchises/${franchiseId}/meeting/check-conflict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledIso,
          durationMin: DEFAULT_DURATION_MIN,
        }),
      })
        .then((res) => res.json())
        .then(
          (data: {
            conflict?: boolean;
            reason?: string;
            conflictingEvents?: Array<{ sectorSlug?: string }>;
          }) => {
            const primarySector = data.conflictingEvents?.[0]?.sectorSlug;
            setConflictState({
              conflict: Boolean(data.conflict),
              reason: data.reason,
              sectorSlug: primarySector,
              checking: false,
            });
          },
        )
        .catch(() => {
          setConflictState({ conflict: false, checking: false });
        });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [open, franchiseId, dateValue, timeValue]);

  async function handleCancel() {
    const confirmed = window.confirm(
      `Cancelar a reunião de ${franchiseName}?\n\nO evento será removido do Google Agenda e os convidados serão notificados.`,
    );
    if (!confirmed) return;

    setCanceling(true);
    setError(null);

    try {
      const response = await fetch(`/api/franchises/${franchiseId}/meeting`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          syncFailed?: boolean;
        } | null;

        setError(
          payload?.syncFailed
            ? `${payload.error ?? "Não foi possível cancelar no Google Agenda."} Tente novamente.`
            : payload?.error ?? "Não foi possível cancelar a reunião.",
        );
        return;
      }

      window.location.reload();
    } finally {
      setCanceling(false);
    }
  }

  async function handleSave() {
    if (!dateValue.trim()) {
      setError("Informe a data da reunião.");
      return;
    }

    if (!parseDateInput(dateValue)) {
      setError("Data inválida. Use o formato dd/mm/aaaa.");
      return;
    }

    if (!timeValue.trim()) {
      setError("Informe o horário da reunião.");
      return;
    }

    if (!parseTimeInput(timeValue)) {
      setError("Horário inválido. Use o formato hh:mm (24 horas).");
      return;
    }

    const scheduledIso = combineDateTime(dateValue, timeValue);
    if (!scheduledIso) {
      setError("Data ou horário inválido.");
      return;
    }

    if (!emailValue.trim()) {
      setError("Informe o e-mail do franqueado.");
      return;
    }

    if (conflictState.conflict) {
      const confirmed = window.confirm(
        `${conflictState.reason ?? "Já existe outra reunião neste horário."}\n\nDeseja continuar mesmo assim?`,
      );
      if (!confirmed) return;
    }

    const trimmedEmail = emailValue.trim();
    const normalizedEmail = normalizeSuggestedEmail(trimmedEmail);
    const storedFranchiseEmail = normalizeSuggestedEmail(franchiseEmail);
    const emailChangedFromInitial = normalizedEmail !== initialEmailRef.current;
    const emailDiffersFromFranchiseDefault =
      normalizedEmail !== storedFranchiseEmail;

    let saveFranchiseEmail = false;
    if (emailChangedFromInitial && emailDiffersFromFranchiseDefault) {
      saveFranchiseEmail = window.confirm(
        "Deseja salvar este e-mail como padrão da franquia para próximos agendamentos?",
      );
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/franchises/${franchiseId}/meeting`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: scheduledIso,
          franqueadoEmail: trimmedEmail,
          syncWithCalendar: true,
          saveFranchiseEmail,
          acknowledgeConflict: conflictState.conflict,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          reason?: string;
          syncFailed?: boolean;
        } | null;

        setError(
          payload?.syncFailed
            ? `${payload.error ?? "Não foi possível sincronizar com o Google Agenda."} Tente salvar novamente.`
            : payload?.reason ??
                payload?.error ??
                "Não foi possível salvar o agendamento.",
        );
        return;
      }

      setOpen(false);
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setEmailValue("");
            setError(null);
            emailTouchedRef.current = false;
            initialEmailRef.current = "";
          }
        }}
      >
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            {scheduledAt ? "Editar Reunião" : "Agendar Reunião"}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[min(92vw,36rem)] max-h-[90vh] overflow-y-auto content-start">
          <DialogHeader>
            <DialogTitle>Agendar reunião da franquia</DialogTitle>
            <DialogDescription>
              Uma reunião por franquia. Todas as empresas com entrada efetiva serão incluídas no
              evento do Google Agenda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <section className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 px-4 py-3.5">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Franquia
                </p>
                <p className="mt-0.5 text-sm font-medium text-foreground">{franchiseName}</p>
              </div>
            </section>

            {companies.length > 0 ? (
              <section className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">Empresas incluídas</h3>
                  <Badge variant="muted" className="ml-auto shrink-0 tabular-nums">
                    {companies.length}
                  </Badge>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {companies.map((company) => (
                    <li key={company.id} className="truncate" title={company.razaoSocial}>
                      {company.razaoSocial}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="space-y-3 rounded-lg border border-border bg-muted/10 p-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">Dados do agendamento</h3>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`meeting-date-${franchiseId}`}>Data</Label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`meeting-date-${franchiseId}`}
                      className="pl-10 tabular-nums"
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/aaaa"
                      value={dateValue}
                      onChange={(e) => setDateValue(maskDateInput(e.target.value))}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`meeting-time-${franchiseId}`}>Horário</Label>
                  <div className="relative">
                    <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`meeting-time-${franchiseId}`}
                      className="pl-10 tabular-nums"
                      type="text"
                      inputMode="numeric"
                      placeholder="hh:mm"
                      value={timeValue}
                      onChange={(e) => setTimeValue(maskTimeInput(e.target.value))}
                      onBlur={() => {
                        if (timeValue.trim() && parseTimeInput(timeValue)) {
                          setTimeValue(roundTimeToQuarterHour(timeValue));
                        }
                      }}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`meeting-email-${franchiseId}`}>E-mail do franqueado</Label>
                  <Input
                    id={`meeting-email-${franchiseId}`}
                    name={`meeting-email-${franchiseId}`}
                    type="email"
                    autoComplete="off"
                    placeholder="franqueado@exemplo.com"
                    value={emailValue}
                    onChange={(e) => {
                      emailTouchedRef.current = true;
                      setEmailValue(e.target.value);
                    }}
                    disabled={saving}
                  />
                </div>
              </div>

              {conflictState.checking ? (
                <p className="text-xs text-muted-foreground">Verificando disponibilidade...</p>
              ) : null}

              {conflictState.conflict && conflictState.reason ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-1">
                    <p>{conflictState.reason}</p>
                    <p className="text-xs text-amber-100/90">
                      Tem certeza de que deseja agendar duas reuniões no mesmo horário?
                    </p>
                    {conflictState.sectorSlug ? (
                      <p className="text-xs text-amber-100/90">
                        Setor em conflito: {conflictState.sectorSlug.toUpperCase()}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            {attendeesPreview.length > 0 ? (
              <section className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">Convidados no Google Agenda</h3>
                  <Badge variant="muted" className="ml-auto shrink-0 tabular-nums">
                    {attendeesPreview.length}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {attendeesPreview.map((email) => (
                    <Badge
                      key={email}
                      variant="muted"
                      className="max-w-full shrink basis-auto truncate font-normal sm:max-w-[calc(50%-0.375rem)]"
                      title={email}
                    >
                      {email}
                    </Badge>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-border pt-4">
              {error ? <p className="text-sm text-rose-400">{error}</p> : null}

              <Button
                type="button"
                className="w-full"
                onClick={handleSave}
                disabled={saving || canceling || conflictState.checking}
              >
                {saving ? "Salvando..." : "Confirmar agendamento"}
              </Button>

              {scheduledAt ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  onClick={handleCancel}
                  disabled={saving || canceling}
                >
                  <XCircle className="h-4 w-4" />
                  {canceling ? "Cancelando reunião..." : "Cancelar reunião"}
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {scheduledAt ? (
        <div className="flex flex-col items-center gap-1">
          <p className="text-center text-xs text-muted-foreground">{formatDateTime(scheduledAt)}</p>
          {syncStatus && syncStatus !== "synced" ? (
            <Badge
              variant={syncStatus === "failed" ? "warning" : "muted"}
              className="text-[10px] font-normal"
            >
              {syncStatus === "failed"
                ? "Não sincronizado"
                : syncStatus === "pending"
                  ? "Sincronizando..."
                  : "Agenda pendente"}
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
            onClick={handleCancel}
            disabled={canceling || saving}
          >
            <XCircle className="h-3.5 w-3.5" />
            {canceling ? "Cancelando..." : "Cancelar reunião"}
          </Button>
          {error ? <p className="max-w-[10rem] text-center text-xs text-rose-400">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSuggestedEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function splitScheduledAt(value?: string | null) {
  if (!value) return { date: "", time: "" };

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };

  return {
    date: formatDateInput(parsed),
    time: formatTimeInput(parsed),
  };
}

function combineDateTime(date: string, time: string): string | null {
  const parsedDate = parseDateInput(date);
  const parsedTime = parseTimeInput(time);
  if (!parsedDate || !parsedTime) return null;

  const combined = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate(),
    parsedTime.hours,
    parsedTime.minutes,
  );
  if (Number.isNaN(combined.getTime())) return null;

  return combined.toISOString();
}
