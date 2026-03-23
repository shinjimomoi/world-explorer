import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { userId, country, correct } = await req.json();

    if (!userId || !country) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Fetch current row if it exists
    const { data: existing } = await supabaseAdmin
      .from("mastery")
      .select("attempts, correct_count")
      .eq("user_id", userId)
      .eq("country", country)
      .single();

    const attempts = (existing?.attempts ?? 0) + 1;
    const correctCount = (existing?.correct_count ?? 0) + (correct ? 1 : 0);

    const { error } = await supabaseAdmin
      .from("mastery")
      .upsert(
        {
          user_id: userId,
          country,
          attempts,
          correct_count: correctCount,
          last_played: new Date().toISOString(),
        },
        { onConflict: "user_id,country" }
      );

    if (error) {
      console.error("[mastery] Upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return whether this upsert caused a mastery (correct_count hit exactly 3)
    const newlyMastered = correctCount === 3 && (existing?.correct_count ?? 0) < 3;

    return NextResponse.json({ ok: true, newlyMastered });
  } catch (err) {
    console.error("[mastery] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
