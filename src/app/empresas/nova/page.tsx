import { CompanyForm } from "@/components/forms/CompanyForm";

export default function NovaEmpresaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Nova empresa</h2>
        <p className="text-sm text-muted-foreground">
          Cadastre uma empresa com consulta automática de CNPJ e setores contratados.
        </p>
      </div>
      <CompanyForm />
    </div>
  );
}
