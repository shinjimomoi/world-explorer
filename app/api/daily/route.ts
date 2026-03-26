import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTodayDateStr } from "@/lib/dailyChallenge";

// GET: check if user has played today's daily
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const guestId = searchParams.get("guestId");
  const today = getTodayDateStr();

  if (!userId && !guestId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("daily_attempts")
    .select("completed, created_at")
    .eq("daily_date", today);

  if (userId) query = query.eq("user_id", userId);
  else query = query.eq("guest_id", guestId!);

  const { data } = await query.single();

  // Also fetch the score from scores table if completed
  let score: number | null = null;
  if (data?.completed) {
    let scoreQuery = supabaseAdmin
      .from("scores")
      .select("score")
      .eq("category", "Daily Challenge")
      .order("created_at", { ascending: false })
      .limit(1);

    if (userId) scoreQuery = scoreQuery.eq("user_id", userId);
    const { data: scoreData } = await scoreQuery.single();
    score = scoreData?.score ?? null;
  }

  return NextResponse.json({
    played: data?.completed === true,
    started: !!data,
    score,
  });
}

// POST: record daily attempt start or completion
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, guestId, score, bestStreak, name } = body;
    const today = getTodayDateStr();

    if (action === "start") {
      // Check if already exists
      let checkQuery = supabaseAdmin
        .from("daily_attempts")
        .select("id, completed")
        .eq("daily_date", today);

      if (userId) checkQuery = checkQuery.eq("user_id", userId);
      else checkQuery = checkQuery.eq("guest_id", guestId);

      const { data: existing } = await checkQuery.single();

      if (existing?.completed) {
        return NextResponse.json({ ok: false, alreadyPlayed: true });
      }

      if (existing) {
        // Started but not completed — allow replay
        return NextResponse.json({ ok: true });
      }

      // Insert new attempt
      const row: Record<string, unknown> = {
        daily_date: today,
        completed: false,
      };
      if (userId) row.user_id = userId;
      if (guestId) row.guest_id = guestId;

      const { error } = await supabaseAdmin
        .from("daily_attempts")
        .insert(row);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "complete") {
      // Mark attempt as completed
      let updateQuery = supabaseAdmin
        .from("daily_attempts")
        .update({ completed: true })
        .eq("daily_date", today);

      if (userId) updateQuery = updateQuery.eq("user_id", userId);
      else updateQuery = updateQuery.eq("guest_id", guestId);

      await updateQuery;

      // Save score to scores table
      const scoreRow: Record<string, unknown> = {
        name: name || "Player",
        score,
        best_streak: bestStreak,
        category: "Daily Challenge",
      };
      if (userId) scoreRow.user_id = userId;
      await supabaseAdmin.from("scores").insert(scoreRow);

      // Update daily streak for signed-in users
      if (userId) {
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("daily_streak, last_daily_date")
          .eq("id", userId)
          .single();

        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        let newStreak = 1;
        if (user?.last_daily_date === yesterdayStr) {
          newStreak = (user.daily_streak ?? 0) + 1;
        }

        await supabaseAdmin
          .from("users")
          .update({ daily_streak: newStreak, last_daily_date: today })
          .eq("id", userId);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
