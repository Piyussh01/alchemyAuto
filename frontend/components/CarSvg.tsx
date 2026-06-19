// components/CarSvg.tsx
// All car art is drawn as SVG — no photography. A sleek wedge hero car, plus
// compact side silhouettes per body type for the model cards.
"use client";

import type { BodyType } from "@/lib/inventory";

/** Big hero car — a low alchemical wedge GT, charcoal body with a gold beltline. */
export function HeroCar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 900 340" className={className} role="img" aria-label="Alchemy Auto wedge sports car">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2c33" />
          <stop offset="0.5" stopColor="#17181c" />
          <stop offset="1" stopColor="#0c0c0f" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfe6ec" />
          <stop offset="1" stopColor="#9aa6b2" />
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9c7a2e" />
          <stop offset="0.5" stopColor="#e9cf8e" />
          <stop offset="1" stopColor="#9c7a2e" />
        </linearGradient>
        <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(0,0,0,0.28)" />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="460" cy="312" rx="380" ry="20" fill="url(#shadow)" />

      {/* glasshouse (drawn first, body laps over the base) */}
      <path d="M 392 196 L 436 150 L 548 150 L 602 196 Z" fill="url(#glass)" />
      <line x1="498" y1="150" x2="498" y2="196" stroke="#0c0c0f" strokeWidth="3" opacity="0.5" />

      {/* main body with tucked wheel arches */}
      <path
        d="M 70 246
           C 82 224, 140 208, 215 200
           C 286 194, 338 194, 392 194
           L 744 194
           C 804 194, 838 206, 862 226
           L 862 246
           L 797 246
           A 72 72 0 0 0 653 246
           L 287 246
           A 72 72 0 0 0 143 246
           L 70 246 Z"
        fill="url(#body)"
        stroke="#000"
        strokeWidth="1"
      />

      {/* top reflection highlight */}
      <path
        d="M 150 206 C 260 192, 470 192, 740 198"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* gold beltline + character line */}
      <path d="M 392 197 L 742 197" stroke="url(#gold)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 150 224 C 360 214, 560 214, 800 224" fill="none" stroke="url(#gold)" strokeWidth="2" opacity="0.85" />

      {/* headlight + taillight */}
      <path d="M 74 226 q 16 -6 30 -2 l -2 10 q -16 2 -28 0 Z" fill="#f4e7c2" opacity="0.9" />
      <rect x="838" y="206" width="22" height="9" rx="3" fill="url(#gold)" />

      {/* wheels */}
      {[215, 725].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={246} r={70} fill="#0e0e11" />
          <circle cx={cx} cy={246} r={70} fill="none" stroke="#26262c" strokeWidth="3" />
          <circle cx={cx} cy={246} r={42} fill="#1a1b20" stroke="url(#gold)" strokeWidth="2" />
          {Array.from({ length: 5 }).map((_, i) => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return (
              <line
                key={i}
                x1={cx} y1={246}
                x2={cx + Math.cos(a) * 40} y2={246 + Math.sin(a) * 40}
                stroke="#3a3b42" strokeWidth="6" strokeLinecap="round"
              />
            );
          })}
          <circle cx={cx} cy={246} r={9} fill="url(#gold)" />
        </g>
      ))}
    </svg>
  );
}

/** Compact side silhouette per body type — filled with currentColor. */
export function BodySilhouette({ body, className = "" }: { body: BodyType; className?: string }) {
  const paths: Record<BodyType, string> = {
    // low fastback coupe
    Coupe: "M6 34 C10 22 26 18 44 17 C54 9 78 9 92 18 L108 20 C116 21 118 26 118 34 L6 34 Z",
    // three-box sedan
    Sedan: "M4 34 C8 25 22 22 40 21 C50 13 76 13 88 21 L110 23 C116 24 118 28 118 34 L4 34 Z",
    // pickup: cab + bed
    Pickup: "M4 34 C6 27 14 24 30 23 C38 14 56 14 64 23 L70 24 L70 22 L116 22 C118 22 118 24 118 26 L118 34 L4 34 Z",
    // tall boxy SUV
    SUV: "M5 34 C7 24 16 20 30 19 C36 9 84 9 92 19 L110 21 C116 22 118 25 118 34 L5 34 Z",
  };
  return (
    <svg viewBox="0 0 124 44" className={className} fill="none" aria-hidden>
      <path d={paths[body]} fill="currentColor" opacity="0.92" />
      {/* wheels */}
      <circle cx="30" cy="34" r="9" fill="#0c0c0f" />
      <circle cx="30" cy="34" r="4" fill="#b9933f" />
      <circle cx="94" cy="34" r="9" fill="#0c0c0f" />
      <circle cx="94" cy="34" r="4" fill="#b9933f" />
    </svg>
  );
}

/** Tiny alchemy mark for the logo (triangle = "fire/transmutation"). */
export function AlchemyMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 6 L26 24 L6 24 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <line x1="11" y1="17.5" x2="21" y2="17.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
