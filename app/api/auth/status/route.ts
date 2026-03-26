import { NextResponse } from "next/server";

import { getTeamConfigSurface } from "@/lib/team";

export async function GET() {
  const config = getTeamConfigSurface();

  return NextResponse.json(
    {
      enabled: config.client.capabilities.auth,
      provider: config.provider === "supabase" ? "supabase" : "local",
      configured: config.client.enabled,
      message: config.reasons[0] ?? undefined,
    },
    { status: 200 }
  );
}
