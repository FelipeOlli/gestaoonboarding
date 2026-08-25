"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusSegmentBar } from "@/components/ui/StatusSegmentBar";
import type { CompanyWithRelations } from "@/lib/services/companies";
import type { Sector } from "@/lib/db/schema";
import {
  SECTOR_CONTRACT_STATUS_OPTIONS,
  type SectorContractStatus,
} from "@/lib/status-segment-options";
import { cn, formatCurrencyInput, maskCurrencyInput, parseCurrencyInput } from "@/lib/utils";

type Props = {
  company: CompanyWithRelations;
};

type SectorRow = {
  sector: Sector;
  contracted: boolean;
  sectorId: string;
  valor: number;
  quantidadeVidas: number | null;
};

function parseVidasInput(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10);
}

export function CompanySectorsCard({ company }: Props) {
  const router = useRouter();
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [vidasValues, setVidasValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/catalogs")
      .then((res) => res.json())
      .then((data: { sectors: Sector[] }) => setAllSectors(data.sectors ?? []))
      .catch(() => undefined);
  }, []);

  const rows = useMemo<SectorRow[]>(() => {
    const contractedMap = new Map(
      company.companySectors.map((item) => [item.sectorId, item]),
    );

    const source = allSectors.length > 0 ? allSectors : company.companySectors.map((item) => item.sector);

    return source
      .map((sector) => {
        const contracted = contractedMap.get(sector.id);
        return {
          sector,
          sectorId: sector.id,
          contracted: Boolean(contracted),
          valor: contracted?.valor ?? 0,
          quantidadeVidas: contracted?.quantidadeVidas ?? null,
        };
      })
      .sort((a, b) => a.sector.name.localeCompare(b.sector.name, "pt-BR"));
  }, [allSectors, company.companySectors]);

  useEffect(() => {
    const initialValor: Record<string, string> = {};
    const initialVidas: Record<string, string> = {};

    for (const row of rows) {
      if (row.contracted) {
        initialValor[row.sectorId] = formatCurrencyInput(row.valor);
        if (row.sector.slug === "dp" && row.quantidadeVidas != null) {
          initialVidas[row.sectorId] = String(row.quantidadeVidas);
        }
      }
    }

    setValues(initialValor);
    setVidasValues(initialVidas);
  }, [rows]);

  async function patchSector(sectorId: string, body: Record<string, unknown>) {
    setSaving(true);
    try {
      await fetch(`/api/companies/${company.id}/sectors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId, ...body }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function contractSector(sectorId: string) {
    setSaving(true);
    try {
      await fetch(`/api/companies/${company.id}/sectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function uncontractSector(sectorId: string) {
    setSaving(true);
    try {
      await fetch(`/api/companies/${company.id}/sectors`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorId }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function updateContractStatus(sectorId: string, status: SectorContractStatus) {
    const isContracted = status === "contratado";
    if (isContracted === rows.find((row) => row.sectorId === sectorId)?.contracted) return;

    if (isContracted) {
      await contractSector(sectorId);
    } else {
      await uncontractSector(sectorId);
    }
  }

  async function saveValor(sectorId: string) {
    const valor = parseCurrencyInput(values[sectorId] ?? "");
    const current = company.companySectors.find((item) => item.sectorId === sectorId)?.valor ?? 0;
    if (valor === current) return;
    await patchSector(sectorId, { valor });
  }

  async function saveQuantidadeVidas(sectorId: string) {
    const quantidadeVidas = parseVidasInput(vidasValues[sectorId] ?? "");
    const current =
      company.companySectors.find((item) => item.sectorId === sectorId)?.quantidadeVidas ?? null;
    if (quantidadeVidas === current) return;
    await patchSector(sectorId, { quantidadeVidas });
  }

  const contractedCount = rows.filter((row) => row.contracted).length;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Setores</CardTitle>
        <p className="text-sm text-muted-foreground">
          {contractedCount} de {rows.length} setores contratados
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => {
          const isDp = row.sector.slug === "dp";

          return (
            <div
              key={row.sectorId}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                row.contracted
                  ? "border-border bg-card"
                  : "border-dashed border-border/70 bg-muted/10",
              )}
            >
              <div
                className={cn(
                  "grid gap-4 lg:items-start lg:gap-6",
                  isDp
                    ? "lg:grid-cols-[minmax(0,180px)_minmax(0,200px)_minmax(0,160px)_minmax(0,130px)]"
                    : "lg:grid-cols-[minmax(0,180px)_minmax(0,200px)_minmax(0,220px)]",
                )}
              >
                <div className="flex min-w-0 flex-col items-start space-y-2 self-start">
                  <p className="text-sm font-semibold text-foreground">{row.sector.name}</p>
                  {row.sector.description ? (
                    <p className="text-xs text-muted-foreground">{row.sector.description}</p>
                  ) : null}
                </div>

                <div className="flex min-w-0 w-full flex-col items-start space-y-2">
                  <Label className="min-h-10 self-start leading-snug">Status</Label>
                  <StatusSegmentBar
                    fullWidth
                    className="w-full self-stretch"
                    options={SECTOR_CONTRACT_STATUS_OPTIONS}
                    value={row.contracted ? "contratado" : "nao_contratado"}
                    disabled={saving}
                    onChange={(status) => updateContractStatus(row.sectorId, status)}
                  />
                </div>

                <div className="flex min-w-0 w-full flex-col items-start space-y-2">
                  <Label className="min-h-10 self-start leading-snug" htmlFor={`valor-${row.sectorId}`}>
                    Valor
                  </Label>
                  {row.contracted ? (
                    <div className="relative w-full">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        R$
                      </span>
                      <Input
                        id={`valor-${row.sectorId}`}
                        className="h-10 pl-10 text-right font-medium tabular-nums"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={values[row.sectorId] ?? ""}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [row.sectorId]: maskCurrencyInput(e.target.value),
                          }))
                        }
                        onBlur={() => saveValor(row.sectorId)}
                        disabled={saving}
                      />
                    </div>
                  ) : (
                    <p className="flex h-10 w-full items-center self-start text-sm text-muted-foreground">
                      —
                    </p>
                  )}
                </div>

                {isDp ? (
                  <div className="flex min-w-0 w-full flex-col items-start space-y-2">
                    <Label className="min-h-10 self-start leading-snug" htmlFor={`vidas-${row.sectorId}`}>
                      Quantidade de vidas
                    </Label>
                    {row.contracted ? (
                      <Input
                        id={`vidas-${row.sectorId}`}
                        className="h-10 text-right font-medium tabular-nums"
                        inputMode="numeric"
                        placeholder="0"
                        value={vidasValues[row.sectorId] ?? ""}
                        onChange={(e) =>
                          setVidasValues((prev) => ({
                            ...prev,
                            [row.sectorId]: e.target.value.replace(/\D/g, ""),
                          }))
                        }
                        onBlur={() => saveQuantidadeVidas(row.sectorId)}
                        disabled={saving}
                      />
                    ) : (
                      <p className="flex h-10 w-full items-center self-start text-sm text-muted-foreground">
                        —
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
