"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusSegmentBar, type SegmentOption } from "@/components/ui/StatusSegmentBar";
import type { DocumentoStatus, FaturamentoStatus, PrFranqueadoStatus } from "@/lib/constants";
import {
  DOCUMENTO_STATUS_OPTIONS,
  FATURAMENTO_STATUS_OPTIONS,
  PR_FRANQUEADO_STATUS_OPTIONS,
} from "@/lib/status-segment-options";
import { getCompanyFaturamentoStatus } from "@/lib/company-faturamento";
import type { CompanyWithRelations } from "@/lib/services/companies";

type Props = {
  company: CompanyWithRelations;
};

function FollowUpStatusField<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (status: T) => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:gap-6">
        <Label className="shrink-0 self-start text-left text-sm font-medium text-foreground sm:w-32 sm:pt-1.5">
          {label}
        </Label>
        <StatusSegmentBar
          fullWidth
          className="w-full sm:min-w-0 sm:flex-1"
          options={options}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

export function CompanyFollowUpCard({ company }: Props) {
  const router = useRouter();
  const [observacoes, setObservacoes] = useState(company.observacoes ?? "");
  const [contratoStatus, setContratoStatus] = useState<DocumentoStatus | null>(
    (company.contratoStatus as DocumentoStatus | null) ?? null,
  );
  const [prFranqueadoStatus, setPrFranqueadoStatus] = useState<PrFranqueadoStatus | null>(
    (company.prFranqueadoStatus as PrFranqueadoStatus | null) ?? null,
  );
  const [faturamentoStatus, setFaturamentoStatus] = useState<FaturamentoStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const contractedSectors = useMemo(
    () =>
      [...company.companySectors].sort((a, b) =>
        a.sector.name.localeCompare(b.sector.name, "pt-BR"),
      ),
    [company.companySectors],
  );

  useEffect(() => {
    setObservacoes(company.observacoes ?? "");
    setContratoStatus((company.contratoStatus as DocumentoStatus | null) ?? null);
    setPrFranqueadoStatus((company.prFranqueadoStatus as PrFranqueadoStatus | null) ?? null);
    setFaturamentoStatus(getCompanyFaturamentoStatus(company.companySectors));
  }, [company]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/companies/${company.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function patchAllSectorsFaturamento(status: FaturamentoStatus) {
    setSaving(true);
    try {
      await Promise.all(
        contractedSectors.map((item) =>
          fetch(`/api/companies/${company.id}/sectors`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sectorId: item.sectorId, faturamentoStatus: status }),
          }),
        ),
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveObservacoes() {
    const value = observacoes.trim() || null;
    if (value === (company.observacoes ?? null)) return;
    await patch({ observacoes: value });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Acompanhamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 xl:grid-cols-2">
          <FollowUpStatusField
            label="Contrato"
            options={DOCUMENTO_STATUS_OPTIONS}
            value={contratoStatus}
            disabled={saving}
            onChange={async (status) => {
              setContratoStatus(status);
              await patch({ contratoStatus: status });
            }}
          />

          <FollowUpStatusField
            label="PR franqueado"
            options={PR_FRANQUEADO_STATUS_OPTIONS}
            value={prFranqueadoStatus}
            disabled={saving}
            onChange={async (status) => {
              setPrFranqueadoStatus(status);
              await patch({ prFranqueadoStatus: status });
            }}
          />

          {contractedSectors.length > 0 && (
            <FollowUpStatusField
              label="Faturamento"
              options={FATURAMENTO_STATUS_OPTIONS}
              value={faturamentoStatus}
              disabled={saving}
              onChange={async (status) => {
                setFaturamentoStatus(status);
                await patchAllSectorsFaturamento(status);
              }}
            />
          )}
        </div>

        <div className="flex flex-col items-start space-y-2">
          <Label className="self-start" htmlFor="observacoes">
            Observações
          </Label>
          <textarea
            id="observacoes"
            className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder='Ex: "Franqueado ainda não respondeu"'
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            onBlur={saveObservacoes}
            disabled={saving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
