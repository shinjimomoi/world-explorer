"use client";

import { useState } from "react";
import DifficultyModal from "./components/DifficultyModal";
import { useRouter } from "next/navigation";
import type { Difficulty } from "./game/WorldMap";
import type { Category } from "@/data/categories";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  function handleSelect(difficulty: Difficulty, category: Category) {
    setShowModal(false);
    router.push(`/game?difficulty=${difficulty}&category=${category}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-4 text-center sm:px-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          World Explorer
        </h1>
        <p className="max-w-md text-sm text-foreground-muted sm:text-base">
          Test your knowledge of world capitals
        </p>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="rounded-lg bg-[#f0f0f0] px-10 py-3.5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-white"
      >
        Play
      </button>

      {showModal && (
        <DifficultyModal onSelect={handleSelect} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
