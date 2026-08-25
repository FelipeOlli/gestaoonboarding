import { FiscalTable } from "@/components/sectors/FiscalTable";
import { listCompanies } from "@/lib/services/companies";
import { ensureFranchiseMeetingCompanies } from "@/lib/services/meetings";

export const dynamic = "force-dynamic";

export default async function FiscalPage() {
  const companies = await listCompanies({ sectorSlug: "fiscal" });
  const franchiseIds = [...new Set(companies.map((company) => company.franchiseId))];

  await Promise.all(franchiseIds.map((franchiseId) => ensureFranchiseMeetingCompanies(franchiseId)));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
        <p className="text-sm text-muted-foreground">
          Empresas com entrada efetiva no setor fiscal: PR Franqueado concluído, contrato
          assinado e faturamento recebido em todos os setores contratados. Defina o analista
          responsável (Rafael ou Sara).
        </p>
      </div>

      {companies.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhuma empresa com entrada efetiva no setor fiscal.
        </p>
      ) : (
        <FiscalTable companies={companies} />
      )}
    </div>
  );
}
