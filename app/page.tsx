"use client";

import { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import DifficultyModal from "./components/DifficultyModal";
import { useRouter } from "next/navigation";
import type { Difficulty } from "./game/WorldMap";
import type { Category } from "@/data/categories";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Calendar, Clock, CheckCircle } from "lucide-react";
import { getDailyNumber, getTimeUntilNextDaily } from "@/lib/dailyChallenge";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const TICKER_CITIES = [
  "Tokyo", "Paris", "Nairobi", "Buenos Aires", "Bangkok",
  "Cairo", "Ottawa", "Oslo", "Seoul", "Lima",
  "Canberra", "Berlin", "Brasília", "Hanoi", "Accra",
  "Madrid", "Ankara", "Havana",
];

function DailyCard() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [status, setStatus] = useState<{ played: boolean; score: number | null } | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilNextDaily());
  const dailyNum = getDailyNumber();

  useEffect(() => {
    // Check if already played
    const guestId = typeof window !== "undefined" ? localStorage.getItem("world_explorer_guest_id") : null;
    const userId = isSignedIn && user ? user.id : null;
    if (!userId && !guestId) {
      setStatus({ played: false, score: null });
      return;
    }
    const params = userId ? `userId=${userId}` : `guestId=${guestId}`;
    fetch(`/api/daily?${params}`)
      .then((r) => r.json())
      .then((d) => setStatus({ played: d.played, score: d.score }))
      .catch(() => setStatus({ played: false, score: null }));
  }, [isSignedIn, user]);

  // Countdown timer
  useEffect(() => {
    const iv = setInterval(() => setCountdown(getTimeUntilNextDaily()), 60000);
    return () => clearInterval(iv);
  }, []);

  function handlePlay() {
    // Ensure guest ID exists
    if (!isSignedIn) {
      if (typeof window !== "undefined" && !localStorage.getItem("world_explorer_guest_id")) {
        localStorage.setItem("world_explorer_guest_id", crypto.randomUUID());
      }
    }
    router.push("/game?difficulty=daily");
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-[#333333] bg-[#111111] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-foreground">Daily Challenge</p>
            <p className="text-[11px] text-accent">Daily #{dailyNum}</p>
          </div>
        </div>
        <div className="text-right">
          {status?.played ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
              <span className="font-mono text-sm font-bold text-accent">
                {(status.score ?? 0).toLocaleString()}
              </span>
            </div>
          ) : (
            <button
              onClick={handlePlay}
              className="cursor-pointer rounded-lg bg-[#f0f0f0] px-4 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98]"
            >
              Play now
            </button>
          )}
        </div>
      </div>
      {status?.played && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#555555]">
          <Clock className="h-3 w-3" strokeWidth={1.5} />
          <span>Next challenge in {countdown.hours}h {countdown.minutes}m</span>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [showModal, setShowModal] = useState(false);

  function handleSelect(difficulty: Difficulty, category: Category) {
    setShowModal(false);
    router.push(`/game?difficulty=${difficulty}&category=${category}`);
  }

  const tickerText = TICKER_CITIES.join(" · ") + " · ";

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Map background */}
      <div
        className="absolute inset-0"
        style={{
          animation: "panMap 60s linear infinite alternate",
          width: "110%",
          left: "-5%",
        }}
      >
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 160, center: [0, 10] }}
          width={960}
          height={500}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: any) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: { fill: "#1a1a1a", stroke: "#2a2a2a", strokeWidth: 0.5, outline: "none" },
                    hover:   { fill: "#1a1a1a", stroke: "#2a2a2a", strokeWidth: 0.5, outline: "none" },
                    pressed: { fill: "#1a1a1a", stroke: "#2a2a2a", strokeWidth: 0.5, outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
        </ComposableMap>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Hero content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <p
            className="text-[11px] font-medium uppercase text-accent"
            style={{ letterSpacing: "0.15em" }}
          >
            Capital City Quiz
          </p>
          <h1 className="text-6xl font-bold tracking-tight text-white sm:text-[64px]">
            World Explorer
          </h1>
          <p className="max-w-md text-base text-[#888888]">
            How well do you know the world&apos;s capitals?
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="cursor-pointer rounded-lg bg-[#f0f0f0] px-10 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-all duration-150 hover:bg-[#e5e5e5] active:scale-[0.98]"
        >
          Play
        </button>

        <div className="flex items-center gap-3 text-xs text-[#666666]">
          <span>195 capitals</span>
          <span className="text-[#333333]">·</span>
          <span>7 regions</span>
          <span className="text-[#333333]">·</span>
          <span>2 difficulty levels</span>
        </div>

        {!isSignedIn && (
          <p className="text-[13px] text-[#666666]">
            Sign in to unlock mastery tracking and personal stats{" "}
            <SignInButton mode="modal">
              <button className="cursor-pointer font-semibold text-accent transition-all duration-150 hover:text-accent-hover">
                Sign in
              </button>
            </SignInButton>
          </p>
        )}

        {/* Daily Challenge card */}
        <DailyCard />
      </div>

      {/* Bottom ticker */}
      <div className="relative z-10 h-8 shrink-0 overflow-hidden opacity-20">
        <div
          className="flex h-full items-center whitespace-nowrap text-xs text-foreground-muted"
          style={{ animation: "ticker 30s linear infinite" }}
        >
          <span>{tickerText}</span>
          <span>{tickerText}</span>
        </div>
      </div>

      {showModal && (
        <DifficultyModal onSelect={handleSelect} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
