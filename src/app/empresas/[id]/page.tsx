import Link from "next/link";
import { CompanyFollowUpCard } from "@/components/companies/CompanyFollowUpCard";
import { CompanySectorsCard } from "@/components/companies/CompanySectorsCard";
import { MeetingFields } from "@/components/forms/MeetingFields";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompany } from "@/lib/services/companies";
import { getEffectiveEntryCompaniesForFranchise } from "@/lib/services/meetings";
import {
  formatCompetencia,
  formatCnpj,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmpresaDetailPage({  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const franchiseCompanies = await getEffectiveEntryCompaniesForFranchise(company.franchiseId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{company.razaoSocial}</h2>
          <p className="text-sm text-muted-foreground">
            {formatCnpj(company.cnpj)} · {company.franchise.name}
          </p>
        </div>
        {company.prLink && (
          <Button asChild variant="outline">
            <a href={company.prLink} target="_blank" rel="noreferrer">
              Abrir PR <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Nome fantasia:</span>{" "}
              {company.nomeFantasia || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Tributação:</span> {company.tributacao || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Situação:</span>{" "}
              {company.situacaoCadastral || "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Competência:</span>{" "}
              {formatCompetencia(company.competenciaEntrada)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reunião</CardTitle>
          </CardHeader>
          <CardContent>
            <MeetingFields
              franchiseId={company.franchiseId}
              franchiseName={company.franchise.name}
              companies={franchiseCompanies.map((item) => ({
                id: item.id,
                razaoSocial: item.razaoSocial,
              }))}
              scheduledAt={company.meeting?.scheduledAt}
              franqueadoEmail={company.meeting?.franqueadoEmail}
              franchiseEmail={company.franchise.email}
              syncStatus={company.meeting?.syncStatus}
            />
          </CardContent>
        </Card>
      </div>

      <CompanyFollowUpCard company={company} />

      <CompanySectorsCard company={company} />

      <Button asChild variant="link" className="px-0">
        <Link href="/setores/precificacao">Voltar para precificação</Link>
      </Button>
    </div>
  );
}
