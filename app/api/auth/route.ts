import { NextResponse } from "next/server";

import { getTeamConfigSurface } from "@/lib/team";

export async function GET() {
  const config = getTeamConfigSurface();

  return NextResponse.json(
    {
      ok: true,
      mode: config.provider,
      ready: config.client.capabilities.auth,
      reasons: config.reasons,
      client: config.client,
    },
    { status: 200 }
  );
}
