import type { AnalistaFiscal } from "@/lib/constants";
import { isValidEmail, normalizeEmail, parseResponsibleEmails } from "@/lib/sector-emails";
import type { CompanyWithRelations } from "@/lib/services/companies";
import { getSetting } from "@/lib/services/settings";

async function getAnalistaEmail(analista: AnalistaFiscal): Promise<string | null> {
  const key = analista === "Rafael" ? "analyst_email_rafael" : "analyst_email_sara";
  const email = (await getSetting(key))?.trim();
  return email && isValidEmail(email) ? email : null;
}

export async function collectMeetingAttendees(
  company: CompanyWithRelations,
  franqueadoEmail?: string | null,
): Promise<string[]> {
  return collectMeetingAttendeesForCompanies([company], franqueadoEmail);
}

export async function collectMeetingAttendeesForCompanies(
  companies: CompanyWithRelations[],
  franqueadoEmail?: string | null,
): Promise<string[]> {
  const emails = new Set<string>();

  const franchisee = franqueadoEmail?.trim();
  if (franchisee && isValidEmail(franchisee)) {
    emails.add(normalizeEmail(franchisee));
  }

  for (const company of companies) {
    for (const item of company.companySectors) {
      if (item.sector.slug === "fiscal") {
        const analista = company.fiscalOnboarding?.analistaResponsavel as AnalistaFiscal | undefined;
        if (analista) {
          const analystEmail = await getAnalistaEmail(analista);
          if (analystEmail) {
            emails.add(normalizeEmail(analystEmail));
          }
        }
      }

      for (const sectorEmail of parseResponsibleEmails(item.sector.responsibleEmails)) {
        if (isValidEmail(sectorEmail)) {
          emails.add(normalizeEmail(sectorEmail));
        }
      }
    }
  }

  return [...emails];
}
