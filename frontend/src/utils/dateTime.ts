/** India Standard Time for all clinic-facing dates and times in the UI. */
export const IST_TIMEZONE = 'Asia/Kolkata';

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  timeZone: IST_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  timeZone: IST_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

const defaultTimeOptions: Intl.DateTimeFormatOptions = {
  timeZone: IST_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
};

/** API returns IST wall-clock without a Z suffix; treat as Asia/Kolkata. */
export function parseDocOsDateTime(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const base = trimmed.includes('T') ? trimmed : `${trimmed}T00:00:00`;
  const withoutFraction = base.replace(/\.\d+$/, '');
  const parsed = new Date(`${withoutFraction}+05:30`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDate(value: string | Date): Date | null {
  if (typeof value === 'string') {
    return parseDocOsDateTime(value);
  }
  return Number.isNaN(value.getTime()) ? null : value;
}

/** `dateStyle` / `timeStyle` cannot be combined with day/month/hour fields — use IST timezone only. */
function mergeFormatOptions(
  defaults: Intl.DateTimeFormatOptions,
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormatOptions {
  if (!options) {
    return defaults;
  }
  if (options.dateStyle !== undefined || options.timeStyle !== undefined) {
    return { timeZone: IST_TIMEZONE, ...options };
  }
  return { ...defaults, ...options };
}

/** YYYY-MM-DD in IST for date inputs and API date query params. */
export function getIstDateInputValue(reference: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(reference);
}

/** Add calendar days in IST; returns YYYY-MM-DD for filters and API params. */
export function shiftIstDateInput(reference: Date, deltaDays: number): string {
  const [y, m, d] = getIstDateInputValue(reference).split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return getIstDateInputValue(shifted);
}

export function formatDateIST(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value == null) return '—';
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-IN', mergeFormatOptions(defaultDateOptions, options));
}

export function formatDateTimeIST(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value == null) return '—';
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleString('en-IN', mergeFormatOptions(defaultDateTimeOptions, options));
}

export function formatTimeIST(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value == null) return '—';
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleTimeString('en-IN', mergeFormatOptions(defaultTimeOptions, options));
}

/** Visit/history rows that are calendar dates (may arrive as date-only ISO). */
export function formatVisitDateIST(value: string | Date | null | undefined): string {
  if (value == null) return '—';
  if (typeof value === 'string') {
    const dayPart = value.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayPart)) {
      const [y, m, d] = dayPart.split('-').map(Number);
      const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return formatDateIST(noonUtc);
    }
  }
  return formatDateIST(value);
}
