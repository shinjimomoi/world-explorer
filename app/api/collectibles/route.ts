import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET: fetch all collectibles for a user
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("collectibles")
    .select("country, rarity, unlocked_at")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ collectibles: data ?? [] });
}

// POST: unlock a new collectible
export async function POST(req: Request) {
  try {
    const { userId, country, rarity } = await req.json();
    if (!userId || !country) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if already unlocked
    const { data: existing } = await supabaseAdmin
      .from("collectibles")
      .select("id")
      .eq("user_id", userId)
      .eq("country", country)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, alreadyUnlocked: true });
    }

    const { error } = await supabaseAdmin
      .from("collectibles")
      .insert({
        user_id: userId,
        country,
        rarity: rarity || "common",
        unlocked_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[collectibles] Insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alreadyUnlocked: false });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
