import { NextResponse } from "next/server";

import { generateMediaAssets } from "@/lib/server/media";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: unknown;
      prompt?: unknown;
      negativePrompt?: unknown;
      aspectRatio?: unknown;
      width?: unknown;
      height?: unknown;
      seed?: unknown;
      model?: unknown;
      input?: Record<string, unknown> | null;
      maxWaitMs?: unknown;
    };

    const result = await generateMediaAssets({
      kind: body.kind,
      prompt: body.prompt,
      negativePrompt: body.negativePrompt,
      aspectRatio: body.aspectRatio,
      width: body.width,
      height: body.height,
      seed: body.seed,
      model: body.model,
      input: body.input,
      maxWaitMs: body.maxWaitMs,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate media.",
      },
      { status: 400 }
    );
  }
}

