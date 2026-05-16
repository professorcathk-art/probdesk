"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionSlice = {
  landingIntentText: string | null;
  setLandingIntentText: (text: string | null) => void;
  /** Cleared after onboarding consumes the landing draft */
  clearLandingIntent: () => void;
};

export const useSessionStore = create<SessionSlice>()(
  persist(
    (set) => ({
      landingIntentText: null,
      setLandingIntentText: (text) => set({ landingIntentText: text }),
      clearLandingIntent: () => set({ landingIntentText: null }),
    }),
    { name: "probdesk-session" },
  ),
);
