import { count, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { companies, fiscalOnboarding } from "@/lib/db/schema";
import { listCompanies } from "@/lib/services/companies";

export type FiscalDashboardMetrics = {
  kpis: {
    total_fiscal: number;
    em_onboarding: number;
    homologadas: number;
    sem_analista: number;
  };
  por_tributacao: Array<{ tributacao: string; quantidade: number }>;
  por_analista: Array<{ analista: string; quantidade: number }>;
};

async function getFiscalCompanyIds() {
  const companies = await listCompanies({ sectorSlug: "fiscal" });
  return companies.map((company) => company.id);
}

export async function getFiscalDashboardMetrics(): Promise<FiscalDashboardMetrics> {
  const db = getDb();
  const fiscalCompanyIds = await getFiscalCompanyIds();

  if (fiscalCompanyIds.length === 0) {
    return {
      kpis: {
        total_fiscal: 0,
        em_onboarding: 0,
        homologadas: 0,
        sem_analista: 0,
      },
      por_tributacao: [],
      por_analista: [],
    };
  }

  const [kpiRow] = await db
    .select({
      totalFiscal: count(companies.id),
      emOnboarding: sql<number>`sum(case when ${fiscalOnboarding.completedAt} is null and (${companies.status} = 'onboarding_fiscal' or ${companies.status} = 'entrada' or ${companies.status} = 'setores_em_andamento') then 1 else 0 end)`,
      homologadas: sql<number>`sum(case when ${companies.status} = 'homologado' or ${fiscalOnboarding.completedAt} is not null then 1 else 0 end)`,
      semAnalista: sql<number>`sum(case when ${fiscalOnboarding.analistaResponsavel} is null or ${fiscalOnboarding.analistaResponsavel} = '' then 1 else 0 end)`,
    })
    .from(companies)
    .leftJoin(fiscalOnboarding, eq(fiscalOnboarding.companyId, companies.id))
    .where(inArray(companies.id, fiscalCompanyIds));

  const porTributacao = await db
    .select({
      tributacao: sql<string>`coalesce(nullif(${fiscalOnboarding.tributacao}, ''), nullif(${companies.tributacao}, ''), 'Não informado')`,
      quantidade: count(companies.id),
    })
    .from(companies)
    .leftJoin(fiscalOnboarding, eq(fiscalOnboarding.companyId, companies.id))
    .where(inArray(companies.id, fiscalCompanyIds))
    .groupBy(
      sql`coalesce(nullif(${fiscalOnboarding.tributacao}, ''), nullif(${companies.tributacao}, ''), 'Não informado')`,
    );

  const porAnalista = await db
    .select({
      analista: sql<string>`coalesce(nullif(${fiscalOnboarding.analistaResponsavel}, ''), 'Sem analista')`,
      quantidade: count(companies.id),
    })
    .from(companies)
    .leftJoin(fiscalOnboarding, eq(fiscalOnboarding.companyId, companies.id))
    .where(inArray(companies.id, fiscalCompanyIds))
    .groupBy(
      sql`coalesce(nullif(${fiscalOnboarding.analistaResponsavel}, ''), 'Sem analista')`,
    );

  return {
    kpis: {
      total_fiscal: Number(kpiRow?.totalFiscal ?? 0),
      em_onboarding: Number(kpiRow?.emOnboarding ?? 0),
      homologadas: Number(kpiRow?.homologadas ?? 0),
      sem_analista: Number(kpiRow?.semAnalista ?? 0),
    },
    por_tributacao: porTributacao.map((row) => ({
      tributacao: row.tributacao,
      quantidade: Number(row.quantidade ?? 0),
    })),
    por_analista: porAnalista.map((row) => ({
      analista: row.analista,
      quantidade: Number(row.quantidade ?? 0),
    })),
  };
}
