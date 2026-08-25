import { DpTable } from "@/components/sectors/DpTable";
import { listCompanies } from "@/lib/services/companies";

export const dynamic = "force-dynamic";

export default async function DpPage() {
  const companies = await listCompanies({ sectorSlug: "dp" });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
        <p className="text-sm text-muted-foreground">
          Empresas com entrada efetiva no setor DP: PR Franqueado concluído, contrato assinado
          e faturamento recebido em todos os setores contratados. Informe a quantidade de vidas
          contratadas.
        </p>
      </div>

      {companies.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhuma empresa com entrada efetiva no setor DP.
        </p>
      ) : (
        <DpTable companies={companies} />
      )}
    </div>
  );
}
