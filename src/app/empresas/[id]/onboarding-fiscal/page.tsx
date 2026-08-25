import { redirect } from "next/navigation";
import { getCompany } from "@/lib/services/companies";

export default async function OnboardingFiscalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = await getCompany(id);

  if (!company?.prLink) {
    redirect(`/empresas/${id}`);
  }

  redirect(company.prLink);
}
