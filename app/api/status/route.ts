import { NextResponse } from "next/server";

import { getProviderSnapshot } from "@/lib/server/studio";

export async function GET() {
  return NextResponse.json(getProviderSnapshot(), { status: 200 });
}
