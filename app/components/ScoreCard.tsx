import React from "react";

interface ScoreCardProps {
  totalScore: number;
  bestStreak: number;
  difficulty: "easy" | "hard";
  category: string;
  rating: string;
  maxScore: number;
}

const ScoreCard = React.forwardRef<HTMLDivElement, ScoreCardProps>(
  function ScoreCard({ totalScore, bestStreak, difficulty, category, rating, maxScore }, ref) {
    const pct = Math.min(100, Math.round((totalScore / maxScore) * 100));
    const color = pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : "#f87171";

    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          visibility: "hidden",
          pointerEvents: "none",
          width: 1200,
          height: 630,
          overflow: "hidden",
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#0a0a0a",
          color: "#f0f0f0",
          boxSizing: "border-box",
        }}
      >
        {/* Inner border */}
        <div
          style={{
            position: "absolute",
            inset: 28,
            border: "1px solid #222222",
            borderRadius: 20,
          }}
        />

        {/* Vertical accent line — left side */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 120,
            bottom: 120,
            width: 2,
            borderRadius: 2,
            background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
          }}
        />

        {/* Content block */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 100px",
            gap: 0,
          }}
        >
          {/* App name */}
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#666666",
              marginBottom: 18,
            }}
          >
            World Explorer
          </div>

          {/* Rating */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#f0f0f0",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            {rating}
          </div>

          {/* Score */}
          <div
            style={{
              fontSize: 108,
              fontWeight: 800,
              color: color,
              lineHeight: 1,
              marginBottom: 6,
              letterSpacing: "-3px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {totalScore.toLocaleString()}
          </div>

          {/* "pts" label */}
          <div style={{ fontSize: 20, color: "#666666", marginBottom: 24 }}>
            pts
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: 560,
              height: 6,
              background: "#1a1a1a",
              borderRadius: 6,
              overflow: "hidden",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: color,
                borderRadius: 6,
              }}
            />
          </div>

          {/* Streak + difficulty + category badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 40,
            }}
          >
            {bestStreak > 0 && (
              <div
                style={{
                  padding: "7px 18px",
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.25)",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#4ade80",
                }}
              >
                🔥 Best Streak: {bestStreak}
              </div>
            )}
            <div
              style={{
                padding: "7px 18px",
                background: "rgba(240,240,240,0.06)",
                border: "1px solid rgba(240,240,240,0.15)",
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 600,
                color: "#f0f0f0",
              }}
            >
              {difficulty === "easy" ? "Easy" : "Hard"}
            </div>
            {category !== "All World" && (
              <div
                style={{
                  padding: "7px 18px",
                  background: "rgba(240,240,240,0.06)",
                  border: "1px solid rgba(240,240,240,0.15)",
                  borderRadius: 999,
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#f0f0f0",
                }}
              >
                {category}
              </div>
            )}
          </div>

          {/* CTA */}
          <div style={{ fontSize: 16, color: "#666666", textAlign: "center" }}>
            Can you beat me?{" "}
            <span style={{ color: "#4ade80", fontWeight: 600 }}>
              world-explorer-five-liard.vercel.app
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export default ScoreCard;
