"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export interface GameNavState {
  active: true;
  countryName: string;
  capital: string;
  hint?: string;
  round: number;
  totalRounds: number;
  totalScore: number;
  streak: number;
  timerPct: number;
  timerColor: string;
  isResult: boolean;
  onQuit: () => void;
  // Survival mode fields
  survival?: boolean;
  lives?: number;
  maxLives?: number;
  tier?: string;
  // Daily challenge
  isDaily?: boolean;
}

export type NavbarState = GameNavState | { active: false };

interface NavbarCtx {
  state: NavbarState;
  setState: (s: NavbarState) => void;
}

const NavbarContext = createContext<NavbarCtx>({
  state: { active: false },
  setState: () => {},
});

export function NavbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavbarState>({ active: false });
  return (
    <NavbarContext.Provider value={{ state, setState }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  return useContext(NavbarContext);
}
