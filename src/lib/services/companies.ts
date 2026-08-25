import { randomUUID } from "node:crypto";

import { and, count, countDistinct, eq, isNotNull, or, sql, sum } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  companies,
  companySectors,
  fiscalOnboarding,
  franchises,
  meetings,
  sectors,
  type Company,
  type CompanySector,
  type FiscalOnboarding,
  type Sector,
} from "@/lib/db/schema";
import type { DocumentoStatus, FaturamentoStatus, PrFranqueadoStatus } from "@/lib/constants";
import { SECTOR_SLUGS } from "@/lib/constants";
import {
  listFranchiseMeetingsMap,
  updateFranchiseMeeting,
  type FranchiseMeeting,
} from "@/lib/services/meetings";

export type CompanyWithRelations = Company & {
  franchise: { id: string; name: string; active: boolean; email: string | null };
  companySectors: Array<
    CompanySector & {
      sector: Sector;
    }
  >;
  fiscalOnboarding: FiscalOnboarding | null;
  meeting: FranchiseMeeting | null;
};

export type ListCompaniesOptions = {
  sectorSlug?: string;
  franchiseId?: string;
  effectiveEntryOnly?: boolean;
};

export function hasEffectiveEntry(company: CompanyWithRelations): boolean {
  if (company.contratoStatus !== "assinado") {
    return false;
  }

  if (company.prFranqueadoStatus !== "concluido") {
    return false;
  }

  const contractedSectors = company.companySectors;
  if (contractedSectors.length === 0) {
    return false;
  }

  return contractedSectors.every((sector) => sector.faturamentoStatus === "recebido");
}

function shouldApplyEffectiveEntryFilter(options: ListCompaniesOptions): boolean {
  if (options.effectiveEntryOnly === true) {
    return true;
  }

  if (options.effectiveEntryOnly === false) {
    return false;
  }

  if (
    options.sectorSlug &&
    SECTOR_SLUGS.includes(options.sectorSlug as (typeof SECTOR_SLUGS)[number])
  ) {
    return true;
  }

  return false;
}

export type CreateCompanyInput = {
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpj: string;
  franchiseId: string;
  tributacao?: string | null;
  situacaoCadastral?: string | null;
  contratoStatus?: DocumentoStatus | null;
  prFranqueadoStatus?: PrFranqueadoStatus | null;
  prLink?: string | null;
  competenciaEntrada?: string | null;
  cnpjwsRaw?: string | null;
  sectorIds: string[];
  sectorValues?: Record<string, number>;
  fiscal?: {
    inscricaoEstadual?: string | null;
    inscricaoEstadualAuto?: boolean;
    estado?: string | null;
    municipio?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cep?: string | null;
    sistemaContratado?: string | null;
    tributacao?: string | null;
  };
  meeting?: {
    scheduledAt?: string | null;
    durationMin?: number;
    notes?: string | null;
    franqueadoEmail?: string | null;
  };
};

export type UpdateCompanyInput = Partial<
  Pick<
    Company,
    | "razaoSocial"
    | "nomeFantasia"
    | "tributacao"
    | "situacaoCadastral"
    | "contratoStatus"
    | "prFranqueadoStatus"
    | "observacoes"
    | "prLink"
    | "competenciaEntrada"
    | "status"
  >
> & {
  fiscal?: Partial<
    Pick<
      FiscalOnboarding,
      | "inscricaoEstadual"
      | "inscricaoEstadualAuto"
      | "estado"
      | "municipio"
      | "logradouro"
      | "numero"
      | "complemento"
      | "bairro"
      | "cep"
      | "sistemaContratado"
      | "tributacao"
      | "analistaResponsavel"
      | "completedAt"
    >
  >;
};

export type UpdateCompanySectorInput = {
  valor?: number;
  quantidadeVidas?: number | null;
  faturamentoStatus?: FaturamentoStatus | null;
  status?: string;
};

export type UpdateMeetingInput = {
  scheduledAt?: string | null;
  durationMin?: number;
  notes?: string | null;
  franqueadoEmail?: string | null;
  syncWithCalendar?: boolean;
  saveFranchiseEmail?: boolean;
  acknowledgeConflict?: boolean;
};

export { updateFranchiseMeeting };

export type DashboardMetrics = {
  kpis: {
    total_empresas: number;
    contratos_assinados: number;
    pr_pendente: number;
    reunioes_agendadas: number;
    receita_potencial: number;
    valor_faturado: number;
    valor_pendente: number;
    ticket_medio: number;
  };
  empresas_por_setor: Array<{ setor: string; quantidade: number }>;
  valor_por_setor: Array<{ setor: string; valor: number }>;
  empresas_por_franquia: Array<{ franquia: string; quantidade: number }>;
  status_contrato: { assinado: number; pendente: number };
  status_pr: { preenchido: number; pendente: number };
  faturamento: {
    valor_faturado: number;
    valor_pendente: number;
    setores_faturados: number;
    setores_pendentes: number;
  };
};

function normalizeCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, "").slice(0, 14);
}

function mapCompany(row: {
  company: Company;
  franchise: { id: string; name: string; active: boolean; email: string | null };
  companySectors: Array<CompanySector & { sector: Sector }>;
  fiscalOnboarding: FiscalOnboarding | null;
  meeting: FranchiseMeeting | null;
}): CompanyWithRelations {
  return {
    ...row.company,
    franchise: row.franchise,
    companySectors: row.companySectors,
    fiscalOnboarding: row.fiscalOnboarding,
    meeting: row.meeting,
  };
}

async function loadCompanyRelations(companyId: string): Promise<CompanyWithRelations | null> {
  const db = getDb();

  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    with: {
      franchise: true,
      companySectors: {
        with: { sector: true },
      },
      fiscalOnboarding: true,
    },
  });

  if (!company) return null;

  const meetingsByFranchise = await listFranchiseMeetingsMap();

  return mapCompany({
    company,
    franchise: company.franchise,
    companySectors: company.companySectors,
    fiscalOnboarding: company.fiscalOnboarding,
    meeting: meetingsByFranchise.get(company.franchiseId) ?? null,
  });
}

export async function listCompanies(
  options: ListCompaniesOptions = {},
): Promise<CompanyWithRelations[]> {
  const db = getDb();
  const applyEffectiveEntryFilter = shouldApplyEffectiveEntryFilter(options);

  const [rows, meetingsByFranchise] = await Promise.all([
    db.query.companies.findMany({
      with: {
        franchise: true,
        companySectors: {
          with: { sector: true },
        },
        fiscalOnboarding: true,
      },
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    }),
    listFranchiseMeetingsMap(),
  ]);

  return rows
    .filter((company) => {
      if (options.franchiseId && company.franchiseId !== options.franchiseId) {
        return false;
      }

      if (options.sectorSlug) {
        return company.companySectors.some(
          (item) => item.sector.slug === options.sectorSlug,
        );
      }

      return true;
    })
    .map((company) =>
      mapCompany({
        company,
        franchise: company.franchise,
        companySectors: company.companySectors,
        fiscalOnboarding: company.fiscalOnboarding,
        meeting: meetingsByFranchise.get(company.franchiseId) ?? null,
      }),
    )
    .filter((company) => !applyEffectiveEntryFilter || hasEffectiveEntry(company));
}

export async function getCompany(id: string): Promise<CompanyWithRelations | null> {
  return loadCompanyRelations(id);
}

export async function createCompany(input: CreateCompanyInput): Promise<CompanyWithRelations> {
  const db = getDb();
  const companyId = randomUUID();
  const cnpj = normalizeCnpj(input.cnpj);

  await db.insert(companies).values({
    id: companyId,
    razaoSocial: input.razaoSocial,
    nomeFantasia: input.nomeFantasia ?? null,
    cnpj,
    franchiseId: input.franchiseId,
    tributacao: input.tributacao ?? null,
    situacaoCadastral: input.situacaoCadastral ?? null,
    contratoStatus: input.contratoStatus ?? null,
    prFranqueadoStatus: input.prFranqueadoStatus ?? null,
    prLink: input.prLink ?? null,
    competenciaEntrada: input.competenciaEntrada ?? null,
    cnpjwsRaw: input.cnpjwsRaw ?? null,
    status: "entrada",
  });

  if (input.sectorIds.length > 0) {
    await db.insert(companySectors).values(
      input.sectorIds.map((sectorId) => ({
        id: randomUUID(),
        companyId,
        sectorId,
        valor: input.sectorValues?.[sectorId] ?? 0,
      })),
    );
  }

  if (input.fiscal) {
    await db.insert(fiscalOnboarding).values({
      companyId,
      inscricaoEstadual: input.fiscal.inscricaoEstadual ?? null,
      inscricaoEstadualAuto: input.fiscal.inscricaoEstadualAuto ?? false,
      estado: input.fiscal.estado ?? null,
      municipio: input.fiscal.municipio ?? null,
      logradouro: input.fiscal.logradouro ?? null,
      numero: input.fiscal.numero ?? null,
      complemento: input.fiscal.complemento ?? null,
      bairro: input.fiscal.bairro ?? null,
      cep: input.fiscal.cep ?? null,
      sistemaContratado: input.fiscal.sistemaContratado ?? null,
      tributacao: input.fiscal.tributacao ?? input.tributacao ?? null,
    });
  }

  const created = await loadCompanyRelations(companyId);
  if (!created) {
    throw new Error("Empresa criada, mas não foi possível recarregar os dados.");
  }

  if (input.meeting?.scheduledAt && hasEffectiveEntry(created)) {
    await updateFranchiseMeeting(input.franchiseId, {
      scheduledAt: input.meeting.scheduledAt,
      durationMin: input.meeting.durationMin,
      notes: input.meeting.notes,
      franqueadoEmail: input.meeting.franqueadoEmail,
      syncWithCalendar: true,
      saveFranchiseEmail: Boolean(input.meeting.franqueadoEmail?.trim()),
    });
  }

  const reloaded = await loadCompanyRelations(companyId);
  if (!reloaded) {
    throw new Error("Empresa criada, mas não foi possível recarregar os dados.");
  }

  return reloaded;
}

export async function updateCompany(
  id: string,
  input: UpdateCompanyInput,
): Promise<CompanyWithRelations | null> {
  const db = getDb();

  const patch: Partial<Company> = {};

  if (input.razaoSocial !== undefined) patch.razaoSocial = input.razaoSocial;
  if (input.nomeFantasia !== undefined) patch.nomeFantasia = input.nomeFantasia;
  if (input.tributacao !== undefined) patch.tributacao = input.tributacao;
  if (input.situacaoCadastral !== undefined) patch.situacaoCadastral = input.situacaoCadastral;
  if (input.contratoStatus !== undefined) patch.contratoStatus = input.contratoStatus;
  if (input.prFranqueadoStatus !== undefined) patch.prFranqueadoStatus = input.prFranqueadoStatus;
  if (input.observacoes !== undefined) patch.observacoes = input.observacoes;
  if (input.prLink !== undefined) patch.prLink = input.prLink;
  if (input.competenciaEntrada !== undefined) patch.competenciaEntrada = input.competenciaEntrada;
  if (input.status !== undefined) patch.status = input.status;

  if (Object.keys(patch).length > 0) {
    await db.update(companies).set(patch).where(eq(companies.id, id));
  }

  if (input.fiscal) {
    const existing = await db.query.fiscalOnboarding.findFirst({
      where: eq(fiscalOnboarding.companyId, id),
    });

    if (existing) {
      await db
        .update(fiscalOnboarding)
        .set(input.fiscal)
        .where(eq(fiscalOnboarding.companyId, id));
    } else {
      await db.insert(fiscalOnboarding).values({
        companyId: id,
        ...input.fiscal,
      });
    }
  }

  return loadCompanyRelations(id);
}

export async function contractCompanySector(
  companyId: string,
  sectorId: string,
): Promise<CompanySector | null> {
  const db = getDb();

  const existing = await db.query.companySectors.findFirst({
    where: and(eq(companySectors.companyId, companyId), eq(companySectors.sectorId, sectorId)),
  });

  if (existing) return existing;

  const sector = await db.query.sectors.findFirst({
    where: eq(sectors.id, sectorId),
  });

  if (!sector) return null;

  const id = randomUUID();

  await db.insert(companySectors).values({
    id,
    companyId,
    sectorId,
    valor: 0,
  });

  return (
    (await db.query.companySectors.findFirst({
      where: eq(companySectors.id, id),
    })) ?? null
  );
}

export async function uncontractCompanySector(
  companyId: string,
  sectorId: string,
): Promise<boolean> {
  const db = getDb();

  const existing = await db.query.companySectors.findFirst({
    where: and(eq(companySectors.companyId, companyId), eq(companySectors.sectorId, sectorId)),
  });

  if (!existing) return false;

  await db
    .delete(companySectors)
    .where(and(eq(companySectors.companyId, companyId), eq(companySectors.sectorId, sectorId)));

  return true;
}

export async function updateCompanySector(
  companyId: string,
  sectorId: string,
  input: UpdateCompanySectorInput,
): Promise<CompanySector | null> {
  const db = getDb();

  const existing = await db.query.companySectors.findFirst({
    where: and(eq(companySectors.companyId, companyId), eq(companySectors.sectorId, sectorId)),
  });

  if (!existing) return null;

  const patch: Partial<CompanySector> = {};

  if (input.valor !== undefined) patch.valor = input.valor;
  if (input.quantidadeVidas !== undefined) patch.quantidadeVidas = input.quantidadeVidas;
  if (input.status !== undefined) patch.status = input.status;

  if (input.faturamentoStatus !== undefined) {
    patch.faturamentoStatus = input.faturamentoStatus;
    patch.faturadoEm =
      input.faturamentoStatus === "recebido" ? new Date().toISOString() : null;
  }

  await db
    .update(companySectors)
    .set(patch)
    .where(and(eq(companySectors.companyId, companyId), eq(companySectors.sectorId, sectorId)));

  return (
    (await db.query.companySectors.findFirst({
      where: and(eq(companySectors.companyId, companyId), eq(companySectors.sectorId, sectorId)),
    })) ?? null
  );
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = getDb();

  const [companyStats] = await db
    .select({
      totalEmpresas: count(companies.id),
      contratosAssinados: sql<number>`sum(case when ${companies.contratoStatus} = 'assinado' then 1 else 0 end)`,
      prPendente: sql<number>`sum(case when ${companies.prFranqueadoStatus} is null or ${companies.prFranqueadoStatus} <> 'concluido' then 1 else 0 end)`,
    })
    .from(companies);

  const [meetingStats] = await db
    .select({
      reunioesAgendadas: count(meetings.id),
    })
    .from(meetings)
    .where(isNotNull(meetings.scheduledAt));

  const [sectorValueStats] = await db
    .select({
      receitaPotencial: sum(companySectors.valor),
      valorFaturado: sql<number>`sum(case when ${companySectors.faturamentoStatus} = 'recebido' then ${companySectors.valor} else 0 end)`,
      valorPendente: sql<number>`sum(case when ${companySectors.faturamentoStatus} is null or ${companySectors.faturamentoStatus} <> 'recebido' then ${companySectors.valor} else 0 end)`,
      setoresFaturados: sql<number>`sum(case when ${companySectors.faturamentoStatus} = 'recebido' then 1 else 0 end)`,
      setoresPendentes: sql<number>`sum(case when ${companySectors.faturamentoStatus} is null or ${companySectors.faturamentoStatus} <> 'recebido' then 1 else 0 end)`,
    })
    .from(companySectors)
    .innerJoin(companies, eq(companySectors.companyId, companies.id));

  const empresasPorSetor = await db
    .select({
      setor: sectors.name,
      quantidade: countDistinct(companies.id),
    })
    .from(companySectors)
    .innerJoin(companies, eq(companySectors.companyId, companies.id))
    .innerJoin(sectors, eq(companySectors.sectorId, sectors.id))
    .groupBy(sectors.id, sectors.name);

  const valorPorSetor = await db
    .select({
      setor: sectors.name,
      valor: sum(companySectors.valor),
    })
    .from(companySectors)
    .innerJoin(companies, eq(companySectors.companyId, companies.id))
    .innerJoin(sectors, eq(companySectors.sectorId, sectors.id))
    .groupBy(sectors.id, sectors.name);

  const empresasPorFranquia = await db
    .select({
      franquia: franchises.name,
      quantidade: count(companies.id),
    })
    .from(companies)
    .innerJoin(franchises, eq(companies.franchiseId, franchises.id))
    .groupBy(franchises.id, franchises.name);

  const [statusContrato] = await db
    .select({
      assinado: sql<number>`sum(case when ${companies.contratoStatus} = 'assinado' then 1 else 0 end)`,
      pendente: sql<number>`sum(case when ${companies.contratoStatus} is null or ${companies.contratoStatus} <> 'assinado' then 1 else 0 end)`,
    })
    .from(companies);

  const [statusPr] = await db
    .select({
      preenchido: sql<number>`sum(case when ${companies.prFranqueadoStatus} = 'concluido' then 1 else 0 end)`,
      pendente: sql<number>`sum(case when ${companies.prFranqueadoStatus} is null or ${companies.prFranqueadoStatus} <> 'concluido' then 1 else 0 end)`,
    })
    .from(companies);

  const totalEmpresas = Number(companyStats?.totalEmpresas ?? 0);
  const receitaPotencial = Number(sectorValueStats?.receitaPotencial ?? 0);
  const valorFaturado = Number(sectorValueStats?.valorFaturado ?? 0);
  const valorPendente = Number(sectorValueStats?.valorPendente ?? 0);

  return {
    kpis: {
      total_empresas: totalEmpresas,
      contratos_assinados: Number(companyStats?.contratosAssinados ?? 0),
      pr_pendente: Number(companyStats?.prPendente ?? 0),
      reunioes_agendadas: Number(meetingStats?.reunioesAgendadas ?? 0),
      receita_potencial: receitaPotencial,
      valor_faturado: valorFaturado,
      valor_pendente: valorPendente,
      ticket_medio: totalEmpresas > 0 ? receitaPotencial / totalEmpresas : 0,
    },
    empresas_por_setor: empresasPorSetor.map((row) => ({
      setor: row.setor,
      quantidade: Number(row.quantidade ?? 0),
    })),
    valor_por_setor: valorPorSetor.map((row) => ({
      setor: row.setor,
      valor: Number(row.valor ?? 0),
    })),
    empresas_por_franquia: empresasPorFranquia.map((row) => ({
      franquia: row.franquia,
      quantidade: Number(row.quantidade ?? 0),
    })),
    status_contrato: {
      assinado: Number(statusContrato?.assinado ?? 0),
      pendente: Number(statusContrato?.pendente ?? 0),
    },
    status_pr: {
      preenchido: Number(statusPr?.preenchido ?? 0),
      pendente: Number(statusPr?.pendente ?? 0),
    },
    faturamento: {
      valor_faturado: valorFaturado,
      valor_pendente: valorPendente,
      setores_faturados: Number(sectorValueStats?.setoresFaturados ?? 0),
      setores_pendentes: Number(sectorValueStats?.setoresPendentes ?? 0),
    },
  };
}

export async function getCompanyByCnpj(cnpj: string): Promise<Company | null> {
  const db = getDb();
  const normalized = normalizeCnpj(cnpj);

  return (
    (await db.query.companies.findFirst({
      where: or(eq(companies.cnpj, normalized), eq(companies.cnpj, cnpj)),
    })) ?? null
  );
}

export type SectorCompanySummary = {
  id: string;
  razaoSocial: string;
  cnpj: string;
  franchiseName: string;
};

export async function listCompaniesBySectorName(sectorName: string): Promise<SectorCompanySummary[]> {
  const db = getDb();
  const normalizedName = sectorName.trim();

  if (!normalizedName) return [];

  const rows = await db
    .selectDistinct({
      id: companies.id,
      razaoSocial: companies.razaoSocial,
      cnpj: companies.cnpj,
      franchiseName: franchises.name,
    })
    .from(companySectors)
    .innerJoin(companies, eq(companySectors.companyId, companies.id))
    .innerJoin(franchises, eq(companies.franchiseId, franchises.id))
    .innerJoin(sectors, eq(companySectors.sectorId, sectors.id))
    .where(eq(sectors.name, normalizedName))
    .orderBy(companies.razaoSocial);

  return rows;
}
