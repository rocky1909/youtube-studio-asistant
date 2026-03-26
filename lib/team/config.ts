import type {
  TeamCapabilityState,
  TeamClientConfig,
  TeamConfigSurface,
  TeamEnvConfig,
  TeamServerConfig,
  TeamTableNames,
} from "./types";

function readEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

function readTableNames(): TeamTableNames {
  return {
    projects: readEnv("TEAM_PROJECTS_TABLE") ?? "team_projects",
    snapshots: readEnv("TEAM_SNAPSHOTS_TABLE") ?? "team_project_snapshots",
    history: readEnv("TEAM_HISTORY_TABLE") ?? "team_project_history",
  };
}

function readProjectRef(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.hostname.split(".")[0] || null;
  } catch {
    return null;
  }
}

function buildCapabilities(env: TeamEnvConfig): TeamCapabilityState {
  return {
    auth: Boolean(env.supabaseUrl && env.anonKey),
    storage: Boolean(env.supabaseUrl && env.serviceRoleKey),
    history: Boolean(env.supabaseUrl && env.serviceRoleKey),
  };
}

function buildEnvConfig(): TeamEnvConfig {
  const supabaseUrl = readEnv("SUPABASE_URL") ?? readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = readEnv("SUPABASE_ANON_KEY") ?? readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const tables = readTableNames();

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    projectRef: readProjectRef(supabaseUrl),
    tables,
  };
}

export function getTeamServerConfig(): TeamServerConfig {
  const env = buildEnvConfig();
  const capabilities = buildCapabilities(env);

  return {
    ...env,
    enabled: Boolean(env.supabaseUrl && env.anonKey && env.serviceRoleKey),
    capabilities,
  };
}

export function getTeamClientConfig(): TeamClientConfig {
  const env = buildEnvConfig();

  return {
    enabled: Boolean(env.supabaseUrl && env.anonKey),
    supabaseUrl: env.supabaseUrl,
    anonKey: env.anonKey,
    projectRef: env.projectRef,
    tables: env.tables,
    capabilities: buildCapabilities(env),
  };
}

export function getTeamConfigSurface(): TeamConfigSurface {
  const server = getTeamServerConfig();
  const reasons: string[] = [];

  if (!server.supabaseUrl) reasons.push("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.");
  if (!server.anonKey) reasons.push("Missing SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  if (!server.serviceRoleKey) reasons.push("Missing SUPABASE_SERVICE_ROLE_KEY.");

  return {
    ready: server.enabled,
    provider: server.enabled ? "supabase" : "disabled",
    reasons,
    client: getTeamClientConfig(),
    server: {
      enabled: server.enabled,
      supabaseUrl: server.supabaseUrl,
      anonKey: server.anonKey,
      projectRef: server.projectRef,
      tables: server.tables,
      capabilities: server.capabilities,
    },
  };
}

export function getTeamMode(): "supabase" | "disabled" {
  return getTeamConfigSurface().provider;
}
