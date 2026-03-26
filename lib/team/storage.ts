import { getTeamConfigSurface } from "./config";
import { getSupabaseRestConfig, supabaseFetchJson } from "./supabase";
import type {
  AppendHistoryEventInput,
  JsonValue,
  ListHistoryEventsInput,
  LoadProjectSnapshotInput,
  SaveProjectSnapshotInput,
  TeamHistoryRecord,
  TeamOperationResult,
  TeamSnapshotRecord,
} from "./types";

type SupabaseRow = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function coerceJsonValue(value: JsonValue): JsonValue {
  return value;
}

function disabledResult<T>(reason: string, data?: T): TeamOperationResult<T> {
  return {
    ok: false,
    mode: "disabled",
    reason,
    config: getTeamConfigSurface(),
    data,
  };
}

function mapSnapshotRow(row: SupabaseRow): TeamSnapshotRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    snapshotType: String(row.snapshot_type ?? "default"),
    payload: (row.payload as JsonValue) ?? {},
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
    createdBy:
      typeof row.created_by === "string" && row.created_by.trim()
        ? row.created_by
        : null,
    origin: typeof row.origin === "string" && row.origin.trim() ? row.origin : null,
  };
}

function mapHistoryRow(row: SupabaseRow): TeamHistoryRecord {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    eventType: String(row.event_type ?? "event"),
    payload: (row.payload as JsonValue) ?? {},
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
    createdBy:
      typeof row.created_by === "string" && row.created_by.trim()
        ? row.created_by
        : null,
    origin: typeof row.origin === "string" && row.origin.trim() ? row.origin : null,
  };
}

function normalizeLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) return 25;
  return Math.max(1, Math.min(100, Math.round(limit)));
}

export async function saveProjectSnapshot(
  input: SaveProjectSnapshotInput
): Promise<TeamOperationResult<TeamSnapshotRecord>> {
  const config = getTeamConfigSurface();
  const rest = getSupabaseRestConfig("server");

  if (!rest || !config.server.enabled) {
    return disabledResult("Supabase storage is not configured.");
  }

  const payload = {
    project_id: input.projectId,
    snapshot_type: input.snapshotType ?? "default",
    payload: coerceJsonValue(input.payload),
    created_by: input.createdBy ?? null,
    origin: input.origin ?? "api",
  };

  const rows = await supabaseFetchJson<SupabaseRow[]>(
    rest,
    `/rest/v1/${config.client.tables.snapshots}`,
    {
      method: "POST",
      body: payload,
    }
  );

  const snapshot = mapSnapshotRow(rows[0] ?? payload);

  return {
    ok: true,
    mode: "supabase",
    config,
    data: snapshot,
  };
}

export async function loadProjectSnapshot(
  input: LoadProjectSnapshotInput
): Promise<TeamOperationResult<TeamSnapshotRecord | null>> {
  const config = getTeamConfigSurface();
  const rest = getSupabaseRestConfig("server");

  if (!rest || !config.server.enabled) {
    return disabledResult("Supabase storage is not configured.", null);
  }

  const query = new URLSearchParams();
  query.set("project_id", `eq.${input.projectId}`);
  query.set("order", "created_at.desc");
  query.set("limit", "1");

  if (input.snapshotId) {
    query.set("id", `eq.${input.snapshotId}`);
  }

  const rows = await supabaseFetchJson<SupabaseRow[]>(
    rest,
    `/rest/v1/${config.client.tables.snapshots}?${query.toString()}`,
    {
      method: "GET",
    }
  );

  return {
    ok: true,
    mode: "supabase",
    config,
    data: rows[0] ? mapSnapshotRow(rows[0]) : null,
  };
}

export async function appendHistoryEvent(
  input: AppendHistoryEventInput
): Promise<TeamOperationResult<TeamHistoryRecord>> {
  const config = getTeamConfigSurface();
  const rest = getSupabaseRestConfig("server");

  if (!rest || !config.server.enabled) {
    return disabledResult("Supabase history is not configured.");
  }

  const payload = {
    project_id: input.projectId,
    event_type: input.eventType,
    payload: coerceJsonValue(input.payload),
    created_by: input.createdBy ?? null,
    origin: input.origin ?? "api",
  };

  const rows = await supabaseFetchJson<SupabaseRow[]>(
    rest,
    `/rest/v1/${config.client.tables.history}`,
    {
      method: "POST",
      body: payload,
    }
  );

  const event = mapHistoryRow(rows[0] ?? payload);

  return {
    ok: true,
    mode: "supabase",
    config,
    data: event,
  };
}

export async function listHistoryEvents(
  input: ListHistoryEventsInput
): Promise<TeamOperationResult<TeamHistoryRecord[]>> {
  const config = getTeamConfigSurface();
  const rest = getSupabaseRestConfig("server");

  if (!rest || !config.server.enabled) {
    return disabledResult("Supabase history is not configured.", []);
  }

  const query = new URLSearchParams();
  query.set("project_id", `eq.${input.projectId}`);
  query.set("order", "created_at.desc");
  query.set("limit", String(normalizeLimit(input.limit)));

  const rows = await supabaseFetchJson<SupabaseRow[]>(
    rest,
    `/rest/v1/${config.client.tables.history}?${query.toString()}`,
    {
      method: "GET",
    }
  );

  return {
    ok: true,
    mode: "supabase",
    config,
    data: rows.map(mapHistoryRow),
  };
}
