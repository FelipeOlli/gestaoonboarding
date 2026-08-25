import { and, isNotNull, ne } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { meetings } from "@/lib/db/schema";
import { listCalendarEvents } from "@/lib/google/calendar";
import type { AnalistaFiscal } from "@/lib/constants";
import { getSetting } from "@/lib/services/settings";
import type { CompanyWithRelations } from "@/lib/services/companies";
import { isValidEmail, normalizeEmail, parseResponsibleEmails } from "@/lib/sector-emails";

export type ConflictingEvent = {
  source: "local" | "google";
  title?: string;
  scheduledAt: string;
  endAt?: string;
  durationMin?: number;
  companyName?: string;
  franchiseName?: string;
  sectorSlug?: string;
  sharedEmails?: string[];
};

export type MeetingConflictResult = {
  conflict: boolean;
  reason?: string;
  conflictingEvents?: ConflictingEvent[];
  googleWarning?: string;
};

export class MeetingConflictError extends Error {
  details: MeetingConflictResult;

  constructor(message: string, details: MeetingConflictResult) {
    super(message);
    this.name = "MeetingConflictError";
    this.details = details;
  }
}

type SectorEmailMap = Map<string, Set<string>>;

async function getAnalistaEmail(analista: AnalistaFiscal): Promise<string | null> {
  const key = analista === "Rafael" ? "analyst_email_rafael" : "analyst_email_sara";
  const email = (await getSetting(key))?.trim();
  return email && isValidEmail(email) ? normalizeEmail(email) : null;
}

function buildSectorEmailMapFromCompany(
  company: Pick<CompanyWithRelations, "companySectors" | "fiscalOnboarding">,
  analystEmails: Partial<Record<AnalistaFiscal, string | null>>,
): SectorEmailMap {
  const result: SectorEmailMap = new Map();

  for (const item of company.companySectors) {
    const slug = item.sector.slug;
    const emails = new Set<string>();

    if (slug === "fiscal") {
      const analista = company.fiscalOnboarding?.analistaResponsavel as AnalistaFiscal | undefined;
      if (analista) {
        const analystEmail = analystEmails[analista];
        if (analystEmail) emails.add(analystEmail);
      }
    }

    for (const sectorEmail of parseResponsibleEmails(item.sector.responsibleEmails)) {
      if (isValidEmail(sectorEmail)) {
        emails.add(normalizeEmail(sectorEmail));
      }
    }

    if (emails.size > 0) {
      result.set(slug, emails);
    }
  }

  return result;
}

function mergeSectorEmailMaps(maps: SectorEmailMap[]): SectorEmailMap {
  const merged: SectorEmailMap = new Map();

  for (const map of maps) {
    for (const [slug, emails] of map) {
      const current = merged.get(slug) ?? new Set<string>();
      for (const email of emails) current.add(email);
      merged.set(slug, current);
    }
  }

  return merged;
}

export async function getSectorResponsibleEmailsForCompany(
  company: Pick<CompanyWithRelations, "companySectors" | "fiscalOnboarding">,
): Promise<SectorEmailMap> {
  const analystEmails: Partial<Record<AnalistaFiscal, string | null>> = {
    Rafael: await getAnalistaEmail("Rafael"),
    Sara: await getAnalistaEmail("Sara"),
  };

  return buildSectorEmailMapFromCompany(company, analystEmails);
}

async function getSectorResponsibleEmailsForCompanies(
  companies: Array<Pick<CompanyWithRelations, "companySectors" | "fiscalOnboarding">>,
): Promise<SectorEmailMap> {
  const analystEmails: Partial<Record<AnalistaFiscal, string | null>> = {
    Rafael: await getAnalistaEmail("Rafael"),
    Sara: await getAnalistaEmail("Sara"),
  };

  return mergeSectorEmailMaps(
    companies.map((company) => buildSectorEmailMapFromCompany(company, analystEmails)),
  );
}

function getAllResponsibleEmails(sectorMap: SectorEmailMap): Set<string> {
  const all = new Set<string>();
  for (const emails of sectorMap.values()) {
    for (const email of emails) all.add(email);
  }
  return all;
}

function timesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

function getContractedSectorSlugs(
  companies: Array<Pick<CompanyWithRelations, "companySectors">>,
): Set<string> {
  const slugs = new Set<string>();

  for (const company of companies) {
    for (const item of company.companySectors) {
      slugs.add(item.sector.slug);
    }
  }

  return slugs;
}

function findSharedSectorSlugs(mapA: Set<string>, mapB: Set<string>): string[] {
  return [...mapA].filter((slug) => mapB.has(slug));
}

function formatSectorLabel(sectorSlug: string): string {
  return sectorSlug.toUpperCase();
}

function formatSectorConflictReason(input: {
  sectorSlugs: string[];
  franchiseName?: string;
  source: "local" | "google";
  eventTitle?: string;
}): string {
  const sectors = input.sectorSlugs.map(formatSectorLabel).join(", ");

  if (input.source === "local" && input.franchiseName) {
    return `Já existe uma reunião agendada para o setor ${sectors} no mesmo horário (franquia "${input.franchiseName}").`;
  }

  if (input.source === "google" && input.eventTitle) {
    return `Já existe um evento no Google Agenda para o setor ${sectors} no mesmo horário ("${input.eventTitle}").`;
  }

  return `Já existe outra reunião agendada para o setor ${sectors} no mesmo horário.`;
}

export async function checkFranchiseMeetingConflict(input: {
  franchiseId: string;
  companies: CompanyWithRelations[];
  scheduledAt: string;
  durationMin?: number;
  excludeMeetingId?: string;
  excludeCalendarEventId?: string | null;
}): Promise<MeetingConflictResult> {
  const durationMin = input.durationMin ?? 60;
  const proposedStart = new Date(input.scheduledAt);
  if (Number.isNaN(proposedStart.getTime())) {
    return { conflict: false };
  }

  const proposedEnd = new Date(proposedStart.getTime() + durationMin * 60_000);
  const proposedSectorSlugs = getContractedSectorSlugs(input.companies);
  const franchiseSectorMap = await getSectorResponsibleEmailsForCompanies(input.companies);

  if (proposedSectorSlugs.size === 0) {
    return { conflict: false };
  }

  const conflictingEvents: ConflictingEvent[] = [];
  const db = getDb();

  const otherMeetings = await db.query.meetings.findMany({
    where: and(isNotNull(meetings.scheduledAt), ne(meetings.franchiseId, input.franchiseId)),
    with: {
      franchise: true,
      meetingCompanies: {
        with: {
          company: {
            with: {
              companySectors: { with: { sector: true } },
              fiscalOnboarding: true,
            },
          },
        },
      },
    },
  });

  for (const meeting of otherMeetings) {
    if (input.excludeMeetingId && meeting.id === input.excludeMeetingId) continue;
    if (!meeting.scheduledAt) continue;

    const otherStart = new Date(meeting.scheduledAt);
    const otherDuration = meeting.durationMin ?? 60;
    const otherEnd = new Date(otherStart.getTime() + otherDuration * 60_000);

    if (!timesOverlap(proposedStart, proposedEnd, otherStart, otherEnd)) continue;

    const otherCompanies = meeting.meetingCompanies.map((item) => item.company);
    const otherSectorSlugs = getContractedSectorSlugs(otherCompanies);
    const sharedSectorSlugs = findSharedSectorSlugs(proposedSectorSlugs, otherSectorSlugs);

    if (sharedSectorSlugs.length === 0) continue;

    conflictingEvents.push({
      source: "local",
      title: meeting.franchise.name,
      scheduledAt: meeting.scheduledAt,
      endAt: otherEnd.toISOString(),
      durationMin: otherDuration,
      franchiseName: meeting.franchise.name,
      sectorSlug: sharedSectorSlugs[0],
      sharedEmails: sharedSectorSlugs.map(formatSectorLabel),
    });
  }

  const dayStart = new Date(proposedStart);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(proposedStart);
  dayEnd.setHours(23, 59, 59, 999);

  const responsibleEmails = [...getAllResponsibleEmails(franchiseSectorMap)];
  let googleWarning: string | undefined;

  const { events: googleEvents, error: googleError } = await listCalendarEvents({
    timeMin: dayStart.toISOString(),
    timeMax: dayEnd.toISOString(),
  });

  if (googleError) {
    googleWarning = googleError;
  }

  for (const event of googleEvents) {
    if (input.excludeCalendarEventId && event.id === input.excludeCalendarEventId) continue;

    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime())) continue;
    if (!timesOverlap(proposedStart, proposedEnd, eventStart, eventEnd)) continue;

    const sharedEmails = event.attendeeEmails.filter((email) => responsibleEmails.includes(email));
    const hasResponsibleOverlap = sharedEmails.length > 0;
    const isOnboardingEvent = event.summary?.toUpperCase().includes("ONBOARDING") ?? false;

    if (!hasResponsibleOverlap && !isOnboardingEvent) continue;

    const alreadyFromLocal = conflictingEvents.some(
      (item) =>
        item.source === "local" &&
        Math.abs(new Date(item.scheduledAt).getTime() - eventStart.getTime()) < 60_000,
    );
    if (alreadyFromLocal) continue;

    const sectorSlug = [...proposedSectorSlugs][0];

    conflictingEvents.push({
      source: "google",
      title: event.summary,
      scheduledAt: event.start,
      endAt: event.end,
      sectorSlug,
      sharedEmails: hasResponsibleOverlap
        ? sharedEmails
        : [...proposedSectorSlugs].map(formatSectorLabel),
    });
  }

  if (conflictingEvents.length === 0) {
    return { conflict: false, googleWarning };
  }

  const primary = conflictingEvents[0];
  const conflictSectors = conflictingEvents
    .map((event) => event.sectorSlug)
    .filter((slug): slug is string => Boolean(slug));

  const reason =
    primary.source === "local" && conflictSectors.length > 0
      ? formatSectorConflictReason({
          sectorSlugs: conflictSectors,
          franchiseName: primary.franchiseName,
          source: "local",
        })
      : primary.source === "google"
        ? formatSectorConflictReason({
            sectorSlugs:
              conflictSectors.length > 0
                ? conflictSectors
                : [...proposedSectorSlugs],
            source: "google",
            eventTitle: primary.title,
          })
        : "Já existe outro agendamento neste horário para o mesmo setor.";

  return {
    conflict: true,
    reason,
    conflictingEvents,
    googleWarning,
  };
}

export async function checkMeetingConflict(input: {
  company: CompanyWithRelations;
  scheduledAt: string;
  durationMin?: number;
  excludeMeetingId?: string;
  excludeCalendarEventId?: string | null;
}): Promise<MeetingConflictResult> {
  return checkFranchiseMeetingConflict({
    franchiseId: input.company.franchiseId,
    companies: [input.company],
    scheduledAt: input.scheduledAt,
    durationMin: input.durationMin,
    excludeMeetingId: input.excludeMeetingId,
    excludeCalendarEventId: input.excludeCalendarEventId,
  });
}
