import { NextResponse } from "next/server";

import {
  appendHistoryEvent,
  getSupabaseRestConfig,
  getTeamConfigSurface,
  listHistoryEvents,
  loadProjectSnapshot,
  saveProjectSnapshot,
  supabaseFetchJson,
  type JsonValue,
} from "@/lib/team";
import { createId } from "@/lib/utils";

type SupabaseRow = Record<string, unknown>;

async function ensureProject(projectId: string, name: string, actor: string) {
  const config = getTeamConfigSurface();
  const rest = getSupabaseRestConfig("server");

  if (!rest || !config.server.enabled) {
    return;
  }

  const query = new URLSearchParams();
  query.set("project_id", `eq.${projectId}`);
  query.set("limit", "1");

  const existing = await supabaseFetchJson<SupabaseRow[]>(
    rest,
    `/rest/v1/${config.client.tables.projects}?${query.toString()}`,
    { method: "GET" }
  );

  if (existing[0]) {
    return;
  }

  await supabaseFetchJson<SupabaseRow[]>(
    rest,
    `/rest/v1/${config.client.tables.projects}`,
    {
      method: "POST",
      body: {
        project_id: projectId,
        name,
        metadata: {
          source: "yt-studio-ai",
          actor,
        },
      },
    }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("id");

  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Missing project id." },
      { status: 400 }
    );
  }

  try {
    const [snapshotResult, historyResult] = await Promise.all([
      loadProjectSnapshot({ projectId }),
      listHistoryEvents({ projectId, limit: 25 }),
    ]);

    return NextResponse.json(
      {
        ok: snapshotResult.ok || historyResult.ok,
        provider:
          snapshotResult.mode === "supabase" || historyResult.mode === "supabase"
            ? "supabase"
            : "local",
        projectId,
        snapshot: snapshotResult.data?.payload ?? null,
        history: (historyResult.data ?? []).map((item) => ({
          id: item.id,
          kind: "status_updated",
          actor: item.createdBy ?? "Team",
          actorRole: item.origin ?? "shared",
          title: item.eventType,
          message: JSON.stringify(item.payload),
          status: "succeeded",
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        message: snapshotResult.reason ?? historyResult.reason,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load team project.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: unknown;
      actor?: unknown;
      title?: unknown;
      message?: unknown;
      snapshot?: unknown;
    };

    const actor = typeof body.actor === "string" && body.actor.trim() ? body.actor.trim() : "website-owner";
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "YT Studio AI Project";
    const message =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : "Project snapshot saved from the website.";
    const projectId =
      typeof body.projectId === "string" && body.projectId.trim()
        ? body.projectId.trim()
        : createId("project").replace(/^project_/, "proj_");

    if (!body.snapshot || typeof body.snapshot !== "object") {
      return NextResponse.json(
        { ok: false, error: "Missing snapshot payload." },
        { status: 400 }
      );
    }

    await ensureProject(projectId, title, actor);

    const [snapshotResult, historyResult] = await Promise.all([
      saveProjectSnapshot({
        projectId,
        snapshotType: "website-session",
        payload: body.snapshot as JsonValue,
        createdBy: actor,
        origin: "website",
      }),
      appendHistoryEvent({
        projectId,
        eventType: title,
        payload: { message } as JsonValue,
        createdBy: actor,
        origin: "website",
      }),
    ]);

    return NextResponse.json(
      {
        ok: snapshotResult.ok || historyResult.ok,
        provider:
          snapshotResult.mode === "supabase" || historyResult.mode === "supabase"
            ? "supabase"
            : "local",
        projectId,
        snapshot: body.snapshot,
        history: historyResult.data
          ? [
              {
                id: historyResult.data.id,
                kind: "status_updated",
                actor: historyResult.data.createdBy ?? actor,
                actorRole: historyResult.data.origin ?? "shared",
                title,
                message,
                status: "succeeded",
                createdAt: historyResult.data.createdAt,
                updatedAt: historyResult.data.updatedAt,
              },
            ]
          : [],
        message:
          snapshotResult.ok || historyResult.ok
            ? "Team snapshot saved."
            : snapshotResult.reason ?? historyResult.reason ?? "Team storage is not configured yet.",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save team project.",
      },
      { status: 500 }
    );
  }
}
