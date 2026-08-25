import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatCurrencyInput(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function maskCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return formatCurrencyInput(amount);
}

export function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function formatCompetencia(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = normalizeCompetencia(value);
  return normalized ?? value;
}

export function normalizeCompetencia(value: string): string | null {
  const trimmed = value.trim();

  const mmYyyy = trimmed.match(/^(\d{2})-(\d{4})$/);
  if (mmYyyy) {
    const month = Number(mmYyyy[1]);
    if (month >= 1 && month <= 12) return `${mmYyyy[1]}-${mmYyyy[2]}`;
    return null;
  }

  const yyyyMm = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    const month = Number(yyyyMm[2]);
    if (month >= 1 && month <= 12) return `${yyyyMm[2]}-${yyyyMm[1]}`;
    return null;
  }

  return null;
}

export function maskCompetenciaInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function toCompetenciaInputValue(value: string | null | undefined) {
  if (!value) return "";
  return normalizeCompetencia(value) ?? value;
}

export function maskDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateInput(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatDateInput(value: string | Date | null | undefined): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = String(value.getFullYear());
    return `${day}/${month}/${year}`;
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value;

  const parsed = parseDateInput(value);
  if (!parsed) return "";

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear());
  return `${day}/${month}/${year}`;
}

export function maskTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function parseTimeInput(value: string): { hours: number; minutes: number } | null {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return { hours, minutes };
}

export function formatTimeInput(value: string | Date | null | undefined): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  if (/^\d{2}:\d{2}$/.test(value)) return value;

  const parsed = parseTimeInput(value);
  if (!parsed) return "";

  const hours = String(parsed.hours).padStart(2, "0");
  const minutes = String(parsed.minutes).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function roundTimeToQuarterHour(value: string): string {
  const parsed = parseTimeInput(value);
  if (!parsed) return value;

  const totalMinutes = parsed.hours * 60 + parsed.minutes;
  const rounded = Math.round(totalMinutes / 15) * 15;
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function validateCnpj(cnpj: string) {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;

  const calc = (length: number) => {
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += Number(digits[length - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === Number(digits[length]);
  };

  return calc(12) && calc(13);
}
