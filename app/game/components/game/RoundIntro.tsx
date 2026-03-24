import { Heart } from "lucide-react";
import type { Country } from "@/data/countries";
import { SURVIVAL_LIVES, INTRO_MS } from "../../types";

export default function RoundIntro({
  round,
  totalRounds,
  country,
  hint,
  fading,
  message,
  survival,
  lives,
}: {
  round: number;
  totalRounds: number;
  country: Country;
  hint?: string;
  fading: boolean;
  message?: string | null;
  survival?: boolean;
  lives?: number;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div
        className="flex flex-col items-center text-center"
        style={{
          background: "rgba(17, 17, 17, 0.92)",
          backdropFilter: "blur(20px)",
          border: "1px solid #222222",
          borderRadius: 16,
          padding: "32px 48px",
          animation: fading
            ? "introOut 300ms ease-out forwards"
            : "introIn 200ms ease-out both",
        }}
      >
        {message && (
          <p className="mb-3 text-sm font-semibold text-accent">{message}</p>
        )}
        <p
          className="mb-3 text-[11px] font-medium uppercase text-accent"
          style={{ letterSpacing: "0.15em" }}
        >
          {survival ? `Round ${round}` : `Round ${round}/${totalRounds}`}
        </p>
        {survival && lives !== undefined && (
          <div className="mb-3 flex items-center gap-1">
            {Array.from({ length: SURVIVAL_LIVES }).map((_, i) => (
              <Heart
                key={i}
                className="h-4 w-4"
                strokeWidth={1.5}
                fill={i < lives ? "#f87171" : "none"}
                color={i < lives ? "#f87171" : "#333333"}
              />
            ))}
          </div>
        )}
        <h2 className="mb-2 text-[32px] font-bold leading-tight text-white">
          {country.name}
        </h2>
        <p className="mb-5 text-sm text-[#888888]">
          Find {country.capital}
          {hint ? ` · ${hint}` : ""}
        </p>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-[#1a1a1a]">
          <div
            className="h-full rounded-full bg-accent"
            style={{ animation: `shrink ${INTRO_MS}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  );
}
