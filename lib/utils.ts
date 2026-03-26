export type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassDictionary
  | ClassArray;

export interface ClassDictionary {
  [key: string]: boolean | null | undefined;
}

export interface ClassArray extends Array<ClassValue> {}

function flattenClassValue(value: ClassValue, tokens: string[]): void {
  if (!value) return;

  if (typeof value === "string" || typeof value === "number") {
    tokens.push(String(value));
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => flattenClassValue(item, tokens));
    return;
  }

  if (typeof value === "object") {
    Object.entries(value).forEach(([key, enabled]) => {
      if (enabled) tokens.push(key);
    });
  }
}

export function cn(...inputs: ClassValue[]): string {
  const tokens: string[] = [];
  inputs.forEach((input) => flattenClassValue(input, tokens));
  return tokens.join(" ");
}

export function createId(prefix = "id"): string {
  const randomId =
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

  return prefix ? `${prefix}_${randomId}` : randomId;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(
  value: Date | string | number,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatDateTime(
  value: Date | string | number,
  locale = "en-US",
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  }
): string {
  const date = toDate(value);
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
