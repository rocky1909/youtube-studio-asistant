import { getTeamConfigSurface } from "./config";
import { getSupabaseRestConfig, supabaseAuthUser } from "./supabase";
import type { TeamOperationResult } from "./types";

type TeamAuthUser = {
  id: string;
  email?: string | null;
  role?: string | null;
  aud?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

function disabledResult<T>(reason: string, data?: T): TeamOperationResult<T> {
  return {
    ok: false,
    mode: "disabled",
    reason,
    config: getTeamConfigSurface(),
    data,
  };
}

export async function verifyTeamAccessToken(
  accessToken: string
): Promise<TeamOperationResult<TeamAuthUser>> {
  const config = getTeamConfigSurface();
  const rest = getSupabaseRestConfig("server");

  if (!rest || !config.client.enabled) {
    return disabledResult<TeamAuthUser>("Supabase auth is not configured.");
  }

  const user = await supabaseAuthUser<TeamAuthUser>(rest, accessToken);

  return {
    ok: true,
    mode: "supabase",
    config,
    data: user,
  };
}
