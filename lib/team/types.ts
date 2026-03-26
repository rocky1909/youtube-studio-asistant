export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export type TeamTableNames = {
  projects: string;
  snapshots: string;
  history: string;
};

export type TeamEnvConfig = {
  supabaseUrl: string | null;
  anonKey: string | null;
  serviceRoleKey: string | null;
  projectRef: string | null;
  tables: TeamTableNames;
};

export type TeamCapabilityState = {
  auth: boolean;
  storage: boolean;
  history: boolean;
};

export type TeamClientConfig = {
  enabled: boolean;
  supabaseUrl: string | null;
  anonKey: string | null;
  projectRef: string | null;
  tables: TeamTableNames;
  capabilities: TeamCapabilityState;
};

export type TeamServerConfig = TeamEnvConfig & {
  enabled: boolean;
  capabilities: TeamCapabilityState;
};

export type TeamConfigSurface = {
  ready: boolean;
  provider: "supabase" | "disabled";
  reasons: string[];
  client: TeamClientConfig;
  server: Omit<TeamServerConfig, "serviceRoleKey">;
};

export type TeamRecordMeta = {
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  origin: string | null;
};

export type TeamSnapshotRecord = TeamRecordMeta & {
  id: string;
  projectId: string;
  snapshotType: string;
  payload: JsonValue;
};

export type TeamHistoryRecord = TeamRecordMeta & {
  id: string;
  projectId: string;
  eventType: string;
  payload: JsonValue;
};

export type SaveProjectSnapshotInput = {
  projectId: string;
  snapshotType?: string;
  payload: JsonValue;
  createdBy?: string | null;
  origin?: string | null;
};

export type LoadProjectSnapshotInput = {
  projectId: string;
  snapshotId?: string;
};

export type AppendHistoryEventInput = {
  projectId: string;
  eventType: string;
  payload: JsonValue;
  createdBy?: string | null;
  origin?: string | null;
};

export type ListHistoryEventsInput = {
  projectId: string;
  limit?: number;
};

export type TeamOperationResult<T> = {
  ok: boolean;
  mode: "supabase" | "disabled";
  reason?: string;
  config: TeamConfigSurface;
  data?: T;
};
