import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, name, email, avatarUrl } = body;

    console.log("[sync-user] Received:", { clerkId, name, email });

    if (!clerkId) {
      return NextResponse.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: clerkId,
          name,
          email,
          avatar_url: avatarUrl,
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("[sync-user] Supabase error:", JSON.stringify(error));
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    console.log("[sync-user] Success for user:", clerkId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sync-user] Unhandled error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
