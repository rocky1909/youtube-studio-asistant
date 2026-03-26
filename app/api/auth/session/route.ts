import { NextResponse } from "next/server";

import { verifyTeamAccessToken } from "@/lib/team";

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim();
}

export async function GET(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, authenticated: false, error: "Missing Bearer token." },
      { status: 401 }
    );
  }

  try {
    const result = await verifyTeamAccessToken(token);
    return NextResponse.json(
      {
        ...result,
        authenticated: result.ok,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        error:
          error instanceof Error ? error.message : "Failed to verify team auth session.",
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: string;
  };
  const token = body.accessToken?.trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, authenticated: false, error: "Missing accessToken in request body." },
      { status: 400 }
    );
  }

  try {
    const result = await verifyTeamAccessToken(token);
    return NextResponse.json(
      {
        ...result,
        authenticated: result.ok,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        error:
          error instanceof Error ? error.message : "Failed to verify team auth session.",
      },
      { status: 502 }
    );
  }
}
