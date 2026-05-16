"use client";

import { useMemo } from "react";

const STAR_COUNT = 140;

/** Deterministic pseudo-random for stable SSR + client (no hydration mismatch). */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233 + 42.42069) * 43758.5453123;
  return x - Math.floor(x);
}

type StarDef = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  warm: boolean;
};

export function LandingGalaxyScene() {
  const stars = useMemo(() => {
    const out: StarDef[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const r1 = seeded(i, 1);
      const r2 = seeded(i, 2);
      const r3 = seeded(i, 3);
      const r4 = seeded(i, 4);
      const r5 = seeded(i, 5);
      out.push({
        id: i,
        left: r1 * 100,
        top: r2 * 100,
        size: r3 > 0.92 ? 2.25 : r3 > 0.65 ? 1.5 : 1,
        duration: 2.2 + r4 * 3.8,
        delay: r5 * 6,
        warm: seeded(i, 6) > 0.82,
      });
    }
    return out;
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep space base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_130%_90%_at_50%_-10%,rgb(15,23,42)_0%,rgb(3,7,18)_42%,rgb(0,0,0)_100%)]" />

      {/* Milky band — soft diagonal glow */}
      <div
        className="absolute -left-[20%] top-[8%] h-[140%] w-[140%] rotate-[28deg] opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 55% 18% at 50% 50%, rgba(196, 181, 253, 0.22) 0%, rgba(99, 102, 241, 0.14) 35%, rgba(59, 130, 246, 0.06) 55%, transparent 72%)",
          filter: "blur(1px)",
        }}
      />
      <div
        className="absolute -right-[30%] bottom-[-20%] h-[110%] w-[110%] rotate-[-18deg] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 50% 22% at 60% 40%, rgba(56, 189, 248, 0.12) 0%, rgba(30, 58, 138, 0.08) 40%, transparent 65%)",
          filter: "blur(4px)",
        }}
      />

      {/* Slow drifting dust (CSS — visible grain) */}
      <div className="landing-galaxy-dust-a absolute inset-[-40%] opacity-[0.55]" />
      <div className="landing-galaxy-dust-b absolute inset-[-45%] opacity-[0.4]" />

      {/* Twinkling stars */}
      <div className="absolute inset-0">
        {stars.map((s) => (
          <span
            key={s.id}
            className={`landing-galaxy-star absolute rounded-full ${s.warm ? "landing-galaxy-star--warm" : ""}`}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Keep centre readable — light vignette only at edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_80%_at_50%_40%,transparent_0%,transparent_50%,rgba(0,0,0,0.22)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,transparent_58%,rgba(0,0,0,0.38)_100%)]" />
    </div>
  );
}
