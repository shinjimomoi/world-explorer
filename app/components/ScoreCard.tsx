import React from "react";

interface ScoreCardProps {
  totalScore: number;
  bestStreak: number;
  difficulty: "easy" | "hard";
  rating: string;
  maxScore: number;
}

const ScoreCard = React.forwardRef<HTMLDivElement, ScoreCardProps>(
  function ScoreCard({ totalScore, bestStreak, difficulty, rating, maxScore }, ref) {
    const pct = Math.min(100, Math.round((totalScore / maxScore) * 100));
    const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

    // Dot grid — 5 × 5 top-right decoration
    const dots = Array.from({ length: 25 }, (_, i) => ({
      row: Math.floor(i / 5),
      col: i % 5,
    }));

    return (
      <div
        ref={ref}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -1,
          pointerEvents: "none",
          width: 1200,
          height: 630,
          overflow: "hidden",
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#0f1420",
          color: "#e6edf3",
          boxSizing: "border-box",
        }}
      >
        {/* Inner border */}
        <div
          style={{
            position: "absolute",
            inset: 28,
            border: "1.5px solid #30363d",
            borderRadius: 20,
          }}
        />

        {/* Dot grid — top right */}
        {dots.map(({ row, col }, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 72 + row * 30,
              right: 72 + col * 30,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#30363d",
            }}
          />
        ))}

        {/* Vertical accent line — left side */}
        <div
          style={{
            position: "absolute",
            left: 80,
            top: 120,
            bottom: 120,
            width: 3,
            borderRadius: 3,
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
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#8b949e",
              marginBottom: 18,
            }}
          >
            🌍 World Explorer
          </div>

          {/* Rating */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#e6edf3",
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
          <div style={{ fontSize: 20, color: "#8b949e", marginBottom: 24 }}>
            pts
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: 560,
              height: 10,
              background: "#21262d",
              borderRadius: 10,
              overflow: "hidden",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: color,
                borderRadius: 10,
              }}
            />
          </div>

          {/* Streak + difficulty badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 40,
            }}
          >
            {bestStreak > 0 && (
              <div
                style={{
                  padding: "7px 18px",
                  background: "rgba(251,191,36,0.1)",
                  border: "1px solid rgba(251,191,36,0.35)",
                  borderRadius: 999,
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fbbf24",
                }}
              >
                🔥 Best Streak: {bestStreak}
              </div>
            )}
            <div
              style={{
                padding: "7px 18px",
                background: "rgba(56,139,253,0.1)",
                border: "1px solid rgba(56,139,253,0.35)",
                borderRadius: 999,
                fontSize: 17,
                fontWeight: 700,
                color: "#388bfd",
              }}
            >
              {difficulty === "easy" ? "Easy Mode" : "Hard Mode"}
            </div>
          </div>

          {/* CTA */}
          <div style={{ fontSize: 17, color: "#8b949e", textAlign: "center" }}>
            Can you beat me?{" "}
            <span style={{ color: "#388bfd", fontWeight: 600 }}>
              world-explorer-five-liard.vercel.app
            </span>
          </div>
        </div>
      </div>
    );
  }
);

export default ScoreCard;
