import { NextResponse } from "next/server";

import { generateIdeasServer } from "@/lib/server/studio";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      brief?: Record<string, unknown>;
      count?: number;
    };

    if (!body.brief) {
      return NextResponse.json({ error: "Missing brief payload." }, { status: 400 });
    }

    const result = await generateIdeasServer({
      brief: body.brief as never,
      count: body.count,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate ideas.",
      },
      { status: 500 }
    );
  }
}
