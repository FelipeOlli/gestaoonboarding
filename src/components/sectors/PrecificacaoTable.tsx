"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CompanyWithRelations } from "@/lib/services/companies";
import { StatusSegmentBar } from "@/components/ui/StatusSegmentBar";
import { getCompanyFaturamentoStatus } from "@/lib/company-faturamento";
import type { DocumentoStatus, PrFranqueadoStatus } from "@/lib/constants";
import {
  DOCUMENTO_STATUS_OPTIONS,
  FATURAMENTO_STATUS_OPTIONS,
  PR_FRANQUEADO_STATUS_OPTIONS,
} from "@/lib/status-segment-options";
import {
  formatCnpj,
  formatCompetencia,
  formatCurrency,
  formatDateTime,
} from "@/lib/utils";

type Props = {
  companies: CompanyWithRelations[];
};

export function PrecificacaoTable({ companies }: Props) {
  const [groupByFranchise, setGroupByFranchise] = useState(false);
  const [franchiseFilter, setFranchiseFilter] = useState("");

  const franchises = useMemo(
    () => [...new Set(companies.map((c) => c.franchise.name))].sort(),
    [companies],
  );

  const filtered = useMemo(() => {
    if (!franchiseFilter) return companies;
    return companies.filter((c) => c.franchise.name === franchiseFilter);
  }, [companies, franchiseFilter]);

  const groups = useMemo(() => {
    if (!groupByFranchise) return [{ name: "Todas", items: filtered }];
    const map = new Map<string, CompanyWithRelations[]>();
    for (const company of filtered) {
      const list = map.get(company.franchise.name) ?? [];
      list.push(company);
      map.set(company.franchise.name, list);
    }
    return [...map.entries()].map(([name, items]) => ({ name, items }));
  }, [filtered, groupByFranchise]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={groupByFranchise}
            onChange={(e) => setGroupByFranchise(e.target.checked)}
          />
          Agrupar por franquia
        </label>
        <select
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          value={franchiseFilter}
          onChange={(e) => setFranchiseFilter(e.target.value)}
        >
          <option value="">Todas as franquias</option>
          {franchises.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {companies.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhuma empresa cadastrada. Use o botão &quot;Nova empresa&quot; na barra lateral para
          começar.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.name} className="space-y-3">
            {groupByFranchise && (
              <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
            )}
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Franquia</th>
                    <th className="min-w-[8rem] px-4 py-3">Setores contratados</th>
                    <th className="min-w-[6rem] px-4 py-3">Valores</th>
                    <th className="px-4 py-3">Sistema</th>
                    <th className="px-4 py-3">Competência</th>
                    <th className="px-4 py-3 text-center">Contrato</th>
                    <th className="px-4 py-3 text-center">PR franqueado</th>
                    <th className="px-4 py-3 text-center">Link PR</th>
                    <th className="px-4 py-3 text-center">Faturamento</th>
                    <th className="px-4 py-3 text-center">Reunião</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((company) => (
                    <tr key={company.id} className="border-t border-border align-top">
                      <td className="px-4 py-3">
                        <Link
                          href={`/empresas/${company.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {company.razaoSocial}
                        </Link>
                        <p className="text-xs text-muted-foreground">{formatCnpj(company.cnpj)}</p>
                      </td>
                      <td className="px-4 py-3">{company.franchise.name}</td>
                      <td className="min-w-[8rem] px-4 py-3">
                        <div className="space-y-1">
                          {company.companySectors.map((item) => (
                            <div key={item.id} className="flex items-center">
                              <Badge variant="muted" className="shrink-0">
                                {item.sector.name}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="min-w-[6rem] px-4 py-3">
                        <div className="space-y-1">
                          {company.companySectors.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center whitespace-nowrap"
                            >
                              <span className="text-sm font-medium tabular-nums text-foreground">
                                {formatCurrency(item.valor)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {company.fiscalOnboarding?.sistemaContratado || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {formatCompetencia(company.competenciaEntrada)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusSegmentBar
                          options={DOCUMENTO_STATUS_OPTIONS}
                          value={company.contratoStatus as DocumentoStatus | null}
                          onChange={() => undefined}
                          disabled
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusSegmentBar
                          options={PR_FRANQUEADO_STATUS_OPTIONS}
                          value={company.prFranqueadoStatus as PrFranqueadoStatus | null}
                          onChange={() => undefined}
                          disabled
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {company.prLink ? (
                          <Button asChild size="sm" variant="outline">
                            <a href={company.prLink} target="_blank" rel="noreferrer">
                              Ver PR <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <StatusSegmentBar
                            options={FATURAMENTO_STATUS_OPTIONS}
                            value={getCompanyFaturamentoStatus(company.companySectors)}
                            onChange={() => undefined}
                            disabled
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {company.meeting?.scheduledAt ? (
                          <p className="text-sm text-foreground">
                            {formatDateTime(company.meeting.scheduledAt)}
                          </p>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
