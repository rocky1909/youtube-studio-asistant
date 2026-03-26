import { NextResponse } from "next/server";

import { generateScriptServer } from "@/lib/server/studio";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Record<string, unknown>;
      idea?: Record<string, unknown>;
      sceneCount?: number;
    };

    if (!body.brief || !body.idea) {
      return NextResponse.json({ error: "Missing brief or idea payload." }, { status: 400 });
    }

    const result = await generateScriptServer({
      brief: body.brief as never,
      idea: body.idea as never,
      sceneCount: body.sceneCount,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate script.",
      },
      { status: 500 }
    );
  }
}
