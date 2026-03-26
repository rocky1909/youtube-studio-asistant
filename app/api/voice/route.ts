import { NextResponse } from "next/server";

import { generateVoiceData } from "@/lib/server/media";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: unknown;
      voiceId?: unknown;
      modelId?: unknown;
      voiceSettings?: Record<string, unknown> | null;
      outputFormat?: unknown;
    };

    const result = await generateVoiceData({
      text: body.text,
      voiceId: body.voiceId,
      modelId: body.modelId,
      voiceSettings: body.voiceSettings ?? undefined,
      outputFormat: body.outputFormat,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate voice audio.",
      },
      { status: 400 }
    );
  }
}

