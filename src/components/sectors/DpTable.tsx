"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusSegmentBar } from "@/components/ui/StatusSegmentBar";
import type { FaturamentoStatus } from "@/lib/constants";
import { FATURAMENTO_STATUS_OPTIONS } from "@/lib/status-segment-options";
import type { CompanyWithRelations } from "@/lib/services/companies";
import { formatCnpj, formatCompetencia, formatCurrency } from "@/lib/utils";

function getDpSector(company: CompanyWithRelations) {
  return company.companySectors.find((item) => item.sector.slug === "dp");
}

export function DpTable({ companies }: { companies: CompanyWithRelations[] }) {
  async function patchSector(
    companyId: string,
    sectorId: string,
    body: Record<string, unknown>,
  ) {
    await fetch(`/api/companies/${companyId}/sectors`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectorId, ...body }),
    });
    window.location.reload();
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Empresa</th>
            <th className="px-4 py-3">Franquia</th>
            <th className="px-4 py-3">CNPJ</th>
            <th className="px-4 py-3">Competência</th>
            <th className="px-4 py-3">Valor DP</th>
            <th className="px-4 py-3">Quantidade de vidas</th>
            <th className="px-4 py-3">Faturamento</th>
            <th className="px-4 py-3">Ação</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            const dpSector = getDpSector(company);
            if (!dpSector) return null;

            return (
              <tr key={company.id} className="border-t border-border align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/empresas/${company.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {company.razaoSocial}
                  </Link>
                </td>
                <td className="px-4 py-3">{company.franchise.name}</td>
                <td className="px-4 py-3">{formatCnpj(company.cnpj)}</td>
                <td className="px-4 py-3">{formatCompetencia(company.competenciaEntrada)}</td>
                <td className="px-4 py-3">{formatCurrency(dpSector.valor)}</td>
                <td className="px-4 py-3">
                  <input
                    className="h-9 w-24 rounded-md border border-border bg-card px-2 text-right text-sm tabular-nums"
                    inputMode="numeric"
                    defaultValue={dpSector.quantidadeVidas ?? ""}
                    placeholder="0"
                    onBlur={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      const quantidadeVidas = digits ? Number.parseInt(digits, 10) : null;
                      if (quantidadeVidas === dpSector.quantidadeVidas) return;
                      patchSector(company.id, dpSector.sectorId, { quantidadeVidas });
                    }}
                  />
                </td>
                <td className="px-4 py-3 min-w-[220px]">
                  <StatusSegmentBar
                    fullWidth
                    options={FATURAMENTO_STATUS_OPTIONS}
                    value={(dpSector.faturamentoStatus as FaturamentoStatus | null) ?? null}
                    onChange={(status) =>
                      patchSector(company.id, dpSector.sectorId, { faturamentoStatus: status })
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/empresas/${company.id}`}>
                      <ExternalLink className="mr-1 h-4 w-4" />
                      Abrir
                    </Link>
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
