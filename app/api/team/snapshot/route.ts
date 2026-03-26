import { NextResponse } from "next/server";

import { loadProjectSnapshot, saveProjectSnapshot } from "@/lib/team";
import type { JsonValue } from "@/lib/team";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const snapshotId = url.searchParams.get("snapshotId") || undefined;

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Missing projectId query parameter." },
      { status: 400 }
    );
  }

  try {
    const result = await loadProjectSnapshot({ projectId, snapshotId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to load team project snapshot.",
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      snapshotType?: string;
      payload?: unknown;
      createdBy?: string | null;
      origin?: string | null;
    };

    if (!body.projectId) {
      return NextResponse.json(
        { ok: false, error: "Missing projectId in request body." },
        { status: 400 }
      );
    }

    if (body.payload === undefined) {
      return NextResponse.json(
        { ok: false, error: "Missing payload in request body." },
        { status: 400 }
      );
    }

    const result = await saveProjectSnapshot({
      projectId: body.projectId,
      snapshotType: body.snapshotType,
      payload: body.payload as JsonValue,
      createdBy: body.createdBy ?? null,
      origin: body.origin ?? null,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to save team project snapshot.",
      },
      { status: 502 }
    );
  }
}
