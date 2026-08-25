import { PrecificacaoTable } from "@/components/sectors/PrecificacaoTable";
import { listCompanies } from "@/lib/services/companies";

export const dynamic = "force-dynamic";

export default async function PrecificacaoPage() {  const companies = await listCompanies();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Empresas</h2>
        <p className="text-sm text-muted-foreground">
          Listagem e gestão de valores, contratos, PR e reuniões de entrada.
        </p>
      </div>

      <PrecificacaoTable companies={companies} />
    </div>
  );
}
