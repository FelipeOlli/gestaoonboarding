export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseResponsibleEmails(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.map((item) => String(item).trim()).filter(Boolean))];
  } catch {
    const legacy = value.trim();
    return legacy ? [legacy] : [];
  }
}

export function serializeResponsibleEmails(emails: string[]): string | null {
  const normalized = [
    ...new Set(
      emails
        .map((email) => email.trim())
        .filter((email) => email.length > 0),
    ),
  ];

  return normalized.length > 0 ? JSON.stringify(normalized) : null;
}

export function sanitizeResponsibleEmails(emails: string[]): string[] {
  return [
    ...new Set(
      emails
        .map((email) => email.trim())
        .filter((email) => email.length > 0 && isValidEmail(email))
        .map(normalizeEmail),
    ),
  ];
}
