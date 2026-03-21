"use client";

import { useState, useEffect } from "react";

function isPortraitMobile(): boolean {
  // Only trigger on devices narrower than 1024 px in portrait orientation.
  // Desktops (even narrow browser windows) are excluded because they can
  // resize freely; phones and small tablets in portrait genuinely can't play.
  return (
    typeof window !== "undefined" &&
    window.innerWidth < window.innerHeight &&
    window.innerWidth < 1024
  );
}

export default function PortraitOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(isPortraitMobile());

    update(); // set correct state after hydration

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-8 text-center">
      {/* Rotating phone icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        className="h-20 w-20 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ animation: "phoneRock 2s ease-in-out infinite" }}
        aria-hidden="true"
      >
        {/* Phone body (portrait) */}
        <rect x="20" y="10" width="24" height="40" rx="4" />
        <circle cx="32" cy="44" r="2" />
        {/* Rotation arrow */}
        <path d="M10 20 A22 22 0 0 1 54 44" strokeDasharray="4 3" />
        <polyline points="50,38 54,44 48,46" />
      </svg>

      <div>
        <p className="text-xl font-bold text-foreground">Rotate your device</p>
        <p className="mt-1 text-sm text-foreground-muted">
          for the best experience
        </p>
      </div>
    </div>
  );
}
