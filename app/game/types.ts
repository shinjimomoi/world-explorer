import type { Country } from "@/data/countries";

// ─── types ───────────────────────────────────────────────────────────────────

export type Difficulty = "easy" | "hard" | "survival" | "daily";
export type GamePhase = "playing" | "ended";

export interface ClickInfo {
  lat: number;
  lng: number;
  country: Country | null;
}

export interface GuessResult {
  guessLat: number | null;
  guessLng: number | null;
  country: Country;
  distanceKm: number | null;
  basePoints: number;
  multiplier: number;
  points: number;
  timedOut: boolean;
}

export interface RoundRecord {
  round: number;
  country: Country;
  points: number;
  distanceKm: number | null;
  timedOut: boolean;
}

export interface D3Projection {
  invert(point: [number, number]): [number, number] | null;
}

export interface ZoomState {
  center: [number, number];
  zoom: number;
}

// ─── constants ───────────────────────────────────────────────────────────────

export const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
export const TOTAL_ROUNDS = process.env.NODE_ENV === "development" ? 3 : 10;
export const MAX_POINTS = 1000;
export const STREAK_THRESHOLD = 500;
export const RESULT_MS = 5000;
export const INTRO_MS = 3000;
export const SURVIVAL_LIVES = 3;
export const SURVIVAL_TIMER = 20;
export const DEFAULT_PROJECTION: { scale: number; center: [number, number] } = {
  scale: 160,
  center: [0, 10],
};
