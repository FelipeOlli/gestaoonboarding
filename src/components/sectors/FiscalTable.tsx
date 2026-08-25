"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeetingFields } from "@/components/forms/MeetingFields";
import { ANALISTAS_FISCAIS } from "@/lib/constants";
import type { CompanyWithRelations } from "@/lib/services/companies";
import { formatCompetencia, formatCnpj } from "@/lib/utils";

type FranchiseGroup = {
  franchiseId: string;
  franchiseName: string;
  franchiseEmail: string | null;
  companies: CompanyWithRelations[];
  meeting: CompanyWithRelations["meeting"];
};

function groupCompaniesByFranchise(companies: CompanyWithRelations[]): FranchiseGroup[] {
  const groups = new Map<string, FranchiseGroup>();

  for (const company of companies) {
    const existing = groups.get(company.franchiseId);
    if (existing) {
      existing.companies.push(company);
      continue;
    }

    groups.set(company.franchiseId, {
      franchiseId: company.franchiseId,
      franchiseName: company.franchise.name,
      franchiseEmail: company.franchise.email,
      companies: [company],
      meeting: company.meeting,
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      companies: group.companies.sort((a, b) =>
        a.razaoSocial.localeCompare(b.razaoSocial, "pt-BR"),
      ),
    }))
    .sort((a, b) => a.franchiseName.localeCompare(b.franchiseName, "pt-BR"));
}

export function FiscalTable({ companies }: { companies: CompanyWithRelations[] }) {
  const franchiseGroups = groupCompaniesByFranchise(companies);

  async function patchFiscal(companyId: string, body: Record<string, unknown>) {
    await fetch(`/api/companies/${companyId}/fiscal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
            <th className="px-4 py-3">Tributação</th>
            <th className="px-4 py-3">Analista</th>
            <th className="px-4 py-3">Competência</th>
            <th className="px-4 py-3">Endereço</th>
            <th className="px-4 py-3">IE</th>
            <th className="px-4 py-3">UF</th>
            <th className="px-4 py-3">Município</th>
            <th className="px-4 py-3">Sistema</th>
            <th className="px-4 py-3">Reunião</th>
            <th className="px-4 py-3">Ação</th>
          </tr>
        </thead>
        <tbody>
          {franchiseGroups.map((group) =>
            group.companies.map((company, index) => {
              const fiscal = company.fiscalOnboarding;
              const address = [
                fiscal?.logradouro,
                fiscal?.numero,
                fiscal?.bairro ? `- ${fiscal.bairro}` : null,
              ]
                .filter(Boolean)
                .join(", ");

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
                  <td className="px-4 py-3">
                    {fiscal?.tributacao || company.tributacao || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="h-9 rounded-md border border-border bg-card px-2 text-sm"
                      defaultValue={fiscal?.analistaResponsavel ?? ""}
                      onChange={(e) =>
                        patchFiscal(company.id, {
                          analistaResponsavel: e.target.value || null,
                        })
                      }
                    >
                      <option value="">Selecione</option>
                      {ANALISTAS_FISCAIS.map((analista) => (
                        <option key={analista} value={analista}>
                          {analista}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{formatCompetencia(company.competenciaEntrada)}</td>
                  <td className="px-4 py-3">{address || "—"}</td>
                  <td className="px-4 py-3">
                    {fiscal?.inscricaoEstadual || "—"}
                    {fiscal?.inscricaoEstadualAuto && (
                      <Badge variant="success" className="ml-2">
                        API
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{fiscal?.estado || "—"}</td>
                  <td className="px-4 py-3">{fiscal?.municipio || "—"}</td>
                  <td className="px-4 py-3">{fiscal?.sistemaContratado || "—"}</td>
                  {index === 0 ? (
                    <td className="px-4 py-3 align-middle" rowSpan={group.companies.length}>
                      <MeetingFields
                        franchiseId={group.franchiseId}
                        franchiseName={group.franchiseName}
                        companies={group.companies.map((item) => ({
                          id: item.id,
                          razaoSocial: item.razaoSocial,
                        }))}
                        scheduledAt={group.meeting?.scheduledAt}
                        franqueadoEmail={group.meeting?.franqueadoEmail}
                        franchiseEmail={group.franchiseEmail}
                        syncStatus={group.meeting?.syncStatus}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    {company.prLink ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={company.prLink} target="_blank" rel="noreferrer">
                          Abrir PR <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="warning">PR Backoffice pendente</Badge>
                    )}
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}
