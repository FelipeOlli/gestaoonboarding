"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectorWithEmails } from "@/lib/services/sectors";

export function SectorEmailsForm() {
  const [sectors, setSectors] = useState<SectorWithEmails[]>([]);
  const [values, setValues] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sectors")
      .then((res) => res.json())
      .then((data: { sectors: SectorWithEmails[] }) => {
        setSectors(data.sectors ?? []);
        const initial: Record<string, string[]> = {};
        for (const sector of data.sectors ?? []) {
          initial[sector.id] =
            sector.responsibleEmailsList.length > 0 ? [...sector.responsibleEmailsList] : [""];
        }
        setValues(initial);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateEmail(sectorId: string, index: number, email: string) {
    setValues((prev) => {
      const current = [...(prev[sectorId] ?? [""])];
      current[index] = email;
      return { ...prev, [sectorId]: current };
    });
  }

  function addEmail(sectorId: string) {
    setValues((prev) => ({
      ...prev,
      [sectorId]: [...(prev[sectorId] ?? [""]), ""],
    }));
  }

  function removeEmail(sectorId: string, index: number) {
    setValues((prev) => {
      const current = [...(prev[sectorId] ?? [""])];
      current.splice(index, 1);
      return { ...prev, [sectorId]: current.length > 0 ? current : [""] };
    });
  }

  async function saveSector(sectorId: string) {
    setSavingId(sectorId);
    setMessage(null);

    const responsibleEmails = (values[sectorId] ?? []).map((email) => email.trim()).filter(Boolean);

    try {
      const response = await fetch("/api/admin/sectors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectorId,
          responsibleEmails,
        }),
      });

      if (!response.ok) {
        setMessage("Não foi possível salvar os e-mails do setor.");
        return;
      }

      const updated = (await response.json()) as SectorWithEmails;
      setSectors((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setValues((prev) => ({
        ...prev,
        [sectorId]:
          updated.responsibleEmailsList.length > 0 ? [...updated.responsibleEmailsList] : [""],
      }));
      setMessage("E-mails dos setores atualizados.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando setores...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Responsáveis por setor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Cadastre dois ou mais e-mails por departamento. Todos serão adicionados como convidados no
          Google Agenda quando uma reunião for agendada para empresas com o setor contratado.
        </p>

        {sectors.map((sector) => (
          <div
            key={sector.id}
            className="space-y-3 rounded-lg border border-border bg-muted/10 p-4"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{sector.name}</p>
              {sector.description ? (
                <p className="text-xs text-muted-foreground">{sector.description}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="block">E-mails dos responsáveis</Label>
                {(values[sector.id] ?? [""]).map((email, index) => (
                  <div key={`${sector.id}-${index}`} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="responsavel@empresa.com"
                      value={email}
                      onChange={(e) => updateEmail(sector.id, index, e.target.value)}
                      disabled={savingId === sector.id}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeEmail(sector.id, index)}
                      disabled={savingId === sector.id || (values[sector.id] ?? []).length <= 1}
                      aria-label="Remover e-mail"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => addEmail(sector.id)}
                disabled={savingId === sector.id}
              >
                <Plus className="h-4 w-4" />
                Adicionar e-mail
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => saveSector(sector.id)}
              disabled={savingId === sector.id}
            >
              {savingId === sector.id ? "Salvando..." : "Salvar setor"}
            </Button>
          </div>
        ))}

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}
