"use client";

import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";

export default function SyncUser() {
  const { isSignedIn, user } = useUser();
  const synced = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !user || synced.current) return;
    synced.current = true;

    const userName = user.fullName ?? user.username ?? "";

    // 1. Sync user to Supabase
    fetch("/api/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkId: user.id,
        name: userName,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        avatarUrl: user.imageUrl ?? "",
      }),
    })
      .then((res) => res.json())
      .then(() => {
        // 2. Check for pending guest session
        try {
          const raw = localStorage.getItem("pending_game_session");
          if (!raw) return;
          const session = JSON.parse(raw);
          const playedAt = new Date(session.played_at);
          if (Date.now() - playedAt.getTime() > 24 * 60 * 60 * 1000) {
            localStorage.removeItem("pending_game_session");
            return;
          }

          // 3. Merge guest session
          fetch("/api/merge-guest-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              userName,
              session,
            }),
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.merged) {
                localStorage.removeItem("pending_game_session");
                setToast("Your last game has been saved to your profile!");
                setTimeout(() => setToast(null), 3000);
              }
            })
            .catch(() => {});
        } catch {}
      })
      .catch(() => {
        synced.current = false;
      });
  }, [isSignedIn, user]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
      <div
        className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent"
        style={{ animation: "slideUp 300ms ease-out both" }}
      >
        {toast}
      </div>
    </div>
  );
}
