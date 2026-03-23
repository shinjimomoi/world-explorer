import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  try {
    // Fetch user row
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    // Fetch mastery rows
    const { data: mastery } = await supabaseAdmin
      .from("mastery")
      .select("*")
      .eq("user_id", userId);

    // Fetch recent scores
    const { data: scores } = await supabaseAdmin
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Best streak from scores
    const { data: bestStreakRow } = await supabaseAdmin
      .from("scores")
      .select("best_streak")
      .eq("user_id", userId)
      .order("best_streak", { ascending: false })
      .limit(1)
      .single();

    // Total games count
    const { count: totalGames } = await supabaseAdmin
      .from("scores")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    return NextResponse.json({
      user,
      mastery: mastery ?? [],
      recentScores: scores ?? [],
      bestStreak: bestStreakRow?.best_streak ?? 0,
      totalGames: totalGames ?? 0,
    });
  } catch (err) {
    console.error("[profile] Error:", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
