"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";

export default function SyncUser() {
  const { isSignedIn, user } = useUser();
  const synced = useRef(false);

  useEffect(() => {
    console.log("[SyncUser] Mount/update — isSignedIn:", isSignedIn, "user:", user?.id);

    if (!isSignedIn || !user || synced.current) return;
    synced.current = true;

    const payload = {
      clerkId: user.id,
      name: user.fullName ?? user.username ?? "",
      email: user.primaryEmailAddress?.emailAddress ?? "",
      avatarUrl: user.imageUrl ?? "",
    };

    console.log("[SyncUser] Calling /api/sync-user with:", payload);

    fetch("/api/sync-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        console.log("[SyncUser] Response:", res.status, data);
      })
      .catch((err) => {
        console.error("[SyncUser] Fetch error:", err);
        synced.current = false;
      });
  }, [isSignedIn, user]);

  return null;
}
