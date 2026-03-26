import type { JsonValue, TeamConfigSurface, TeamRecordMeta } from "./types";

type SupabaseFetchOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
};

export type SupabaseRestConfig = {
  url: string;
  apiKey: string;
};

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getSupabaseRestConfig(
  mode: "server" | "client" = "server"
): SupabaseRestConfig | null {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const apiKey =
    mode === "server"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? null
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? null;

  if (!supabaseUrl || !apiKey) return null;

  return {
    url: normalizeUrl(supabaseUrl),
    apiKey,
  };
}

export function createSupabaseHeaders(apiKey: string, bearerToken?: string): HeadersInit {
  const headers: Record<string, string> = {
    apikey: apiKey,
    Authorization: `Bearer ${bearerToken ?? apiKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  return headers;
}

export async function supabaseFetchJson<T>(
  config: SupabaseRestConfig,
  path: string,
  options: SupabaseFetchOptions = {}
): Promise<T> {
  const response = await fetch(`${config.url}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...createSupabaseHeaders(config.apiKey),
      ...options.headers,
    },
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body, jsonReplacer),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function supabaseAuthUser<T>(
  config: SupabaseRestConfig,
  accessToken: string
): Promise<T> {
  const response = await fetch(`${config.url}/auth/v1/user`, {
    method: "GET",
    headers: createSupabaseHeaders(config.apiKey, accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase auth failed (${response.status}): ${text || response.statusText}`);
  }

  return (await response.json()) as T;
}

export function jsonReplacer(_: string, value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function toRecordMeta(
  input: Partial<TeamRecordMeta> & Record<string, unknown>,
  fallbackCreatedAt: string
): TeamRecordMeta {
  return {
    createdAt: String(input.createdAt ?? fallbackCreatedAt),
    updatedAt: String(input.updatedAt ?? fallbackCreatedAt),
    createdBy:
      typeof input.createdBy === "string" && input.createdBy.trim()
        ? input.createdBy.trim()
        : null,
    origin:
      typeof input.origin === "string" && input.origin.trim() ? input.origin.trim() : null,
  };
}

export function getTeamConfigReady(config: TeamConfigSurface): boolean {
  return config.ready && config.client.enabled;
}
