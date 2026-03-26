import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getTeamClientConfig } from "@/lib/team";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      redirectTo?: unknown;
    };

    const email = typeof body.email === "string" ? body.email.trim() : "";
    const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo.trim() : "";

    if (!email) {
      return NextResponse.json(
        { ok: false, mode: "mock", message: "Missing email address." },
        { status: 400 }
      );
    }

    const config = getTeamClientConfig();
    if (!config.enabled || !config.supabaseUrl || !config.anonKey) {
      return NextResponse.json(
        {
          ok: false,
          mode: "mock",
          message:
            "Supabase auth is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable magic links.",
        },
        { status: 200 }
      );
    }

    const supabase = createClient(config.supabaseUrl, config.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo || undefined,
        shouldCreateUser: true,
      },
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          mode: "supabase",
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        mode: "supabase",
        message: `Magic link sent to ${email}.`,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "mock",
        message: error instanceof Error ? error.message : "Failed to request magic link.",
      },
      { status: 500 }
    );
  }
}
