"use client";

export function LandingStarfield() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-[9] overflow-hidden">
      <div className="landing-star-layer-a absolute inset-[-30%] size-[160%]" />
      <div className="landing-star-layer-b absolute inset-[-35%] left-[-10%] size-[170%]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.55),rgba(0,0,0,0.82))]" />
    </div>
  );
}
