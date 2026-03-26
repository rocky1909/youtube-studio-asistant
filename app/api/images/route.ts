import { NextResponse } from "next/server";

import { generateImagesServer } from "@/lib/server/studio";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Record<string, unknown>;
      idea?: Record<string, unknown>;
      script?: Record<string, unknown>;
      prompts?: Record<string, string>;
      aspectRatio?: string;
    };

    if (!body.brief || !body.idea || !body.script) {
      return NextResponse.json(
        { error: "Missing brief, idea, or script payload." },
        { status: 400 }
      );
    }

    const result = await generateImagesServer({
      brief: body.brief as never,
      idea: body.idea as never,
      script: body.script as never,
      prompts: body.prompts,
      aspectRatio: body.aspectRatio,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate images.",
      },
      { status: 500 }
    );
  }
}
