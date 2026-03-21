"use client";

import { useState } from "react";
import DifficultyModal from "./components/DifficultyModal";
import { useRouter } from "next/navigation";
import type { Difficulty } from "./game/WorldMap";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  function handleSelect(difficulty: Difficulty) {
    setShowModal(false);
    router.push(`/game?difficulty=${difficulty}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 text-center sm:px-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          World Explorer
        </h1>
        <p className="max-w-md text-base text-foreground-muted sm:text-lg">
          Discover countries, test your geography knowledge, and explore the world one capital at a time.
        </p>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="rounded-lg bg-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        Play
      </button>

      {showModal && (
        <DifficultyModal onSelect={handleSelect} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
