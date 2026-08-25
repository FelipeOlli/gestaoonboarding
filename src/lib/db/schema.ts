import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const COMPANY_STATUSES = [
  "entrada",
  "onboarding_fiscal",
  "setores_em_andamento",
  "homologado",
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const MEETING_SYNC_STATUSES = ["none", "pending", "synced", "failed"] as const;

export type MeetingSyncStatus = (typeof MEETING_SYNC_STATUSES)[number];

export const franchises = sqliteTable("franchises", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sectors = sqliteTable("sectors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  responsibleEmails: text("responsible_emails"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia"),
  cnpj: text("cnpj").notNull().unique(),
  franchiseId: text("franchise_id")
    .notNull()
    .references(() => franchises.id),
  tributacao: text("tributacao"),
  situacaoCadastral: text("situacao_cadastral"),
  contratoStatus: text("contrato_status"),
  prFranqueadoStatus: text("pr_franqueado_status"),
  observacoes: text("observacoes"),
  prLink: text("pr_link"),
  competenciaEntrada: text("competencia_entrada"),
  cnpjwsRaw: text("cnpjws_raw"),
  status: text("status").notNull().default("entrada"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const companySectors = sqliteTable("company_sectors", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  sectorId: text("sector_id")
    .notNull()
    .references(() => sectors.id),
  valor: real("valor").notNull().default(0),
  quantidadeVidas: integer("quantidade_vidas"),
  faturamentoStatus: text("faturamento_status"),
  faturadoEm: text("faturado_em"),
  status: text("status").notNull().default("ativo"),
});

export const fiscalOnboarding = sqliteTable("fiscal_onboarding", {
  companyId: text("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" }),
  inscricaoEstadual: text("inscricao_estadual"),
  inscricaoEstadualAuto: integer("inscricao_estadual_auto", { mode: "boolean" })
    .notNull()
    .default(false),
  estado: text("estado"),
  municipio: text("municipio"),
  logradouro: text("logradouro"),
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cep: text("cep"),
  sistemaContratado: text("sistema_contratado"),
  tributacao: text("tributacao"),
  analistaResponsavel: text("analista_responsavel"),
  completedAt: text("completed_at"),
});

export const meetings = sqliteTable("meetings", {
  id: text("id").primaryKey(),
  franchiseId: text("franchise_id")
    .notNull()
    .unique()
    .references(() => franchises.id, { onDelete: "cascade" }),
  scheduledAt: text("scheduled_at"),
  durationMin: integer("duration_min").notNull().default(60),
  franqueadoEmail: text("franqueado_email"),
  notes: text("notes"),
  calendarEventId: text("calendar_event_id"),
  syncStatus: text("sync_status").notNull().default("none"),
});

export const meetingCompanies = sqliteTable("meeting_companies", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  companyId: text("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const ADMIN_USER_ROLES = ["admin"] as const;
export type AdminUserRole = (typeof ADMIN_USER_ROLES)[number];

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const franchisesRelations = relations(franchises, ({ many, one }) => ({
  companies: many(companies),
  meeting: one(meetings, {
    fields: [franchises.id],
    references: [meetings.franchiseId],
  }),
}));

export const sectorsRelations = relations(sectors, ({ many }) => ({
  companySectors: many(companySectors),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  franchise: one(franchises, {
    fields: [companies.franchiseId],
    references: [franchises.id],
  }),
  companySectors: many(companySectors),
  fiscalOnboarding: one(fiscalOnboarding, {
    fields: [companies.id],
    references: [fiscalOnboarding.companyId],
  }),
  meetingCompany: one(meetingCompanies, {
    fields: [companies.id],
    references: [meetingCompanies.companyId],
  }),
}));

export const companySectorsRelations = relations(companySectors, ({ one }) => ({
  company: one(companies, {
    fields: [companySectors.companyId],
    references: [companies.id],
  }),
  sector: one(sectors, {
    fields: [companySectors.sectorId],
    references: [sectors.id],
  }),
}));

export const fiscalOnboardingRelations = relations(fiscalOnboarding, ({ one }) => ({
  company: one(companies, {
    fields: [fiscalOnboarding.companyId],
    references: [companies.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  franchise: one(franchises, {
    fields: [meetings.franchiseId],
    references: [franchises.id],
  }),
  meetingCompanies: many(meetingCompanies),
}));

export const meetingCompaniesRelations = relations(meetingCompanies, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingCompanies.meetingId],
    references: [meetings.id],
  }),
  company: one(companies, {
    fields: [meetingCompanies.companyId],
    references: [companies.id],
  }),
}));

export type Franchise = typeof franchises.$inferSelect;
export type Sector = typeof sectors.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type CompanySector = typeof companySectors.$inferSelect;
export type FiscalOnboarding = typeof fiscalOnboarding.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type MeetingCompany = typeof meetingCompanies.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;

export type NewFranchise = typeof franchises.$inferInsert;
export type NewSector = typeof sectors.$inferInsert;
export type NewCompany = typeof companies.$inferInsert;
export type NewCompanySector = typeof companySectors.$inferInsert;
export type NewFiscalOnboarding = typeof fiscalOnboarding.$inferInsert;
export type NewMeeting = typeof meetings.$inferInsert;
export type NewMeetingCompany = typeof meetingCompanies.$inferInsert;
