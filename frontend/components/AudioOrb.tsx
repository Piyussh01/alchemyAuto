// components/AudioOrb.tsx
"use client";

import { BarVisualizer, useVoiceAssistant } from "@livekit/components-react";
import { motion } from "framer-motion";

const STATE_STYLES: Record<string, { scale: number[]; glow: string; duration: number }> = {
  disconnected: { scale: [1, 1], glow: "rgba(120,120,140,0.25)", duration: 4 },
  connecting: { scale: [1, 1.04, 1], glow: "rgba(124,92,255,0.35)", duration: 1.6 },
  initializing: { scale: [1, 1.04, 1], glow: "rgba(124,92,255,0.35)", duration: 1.6 },
  listening: { scale: [1, 1.08, 1], glow: "rgba(124,92,255,0.55)", duration: 2.4 },
  thinking: { scale: [1, 1.03, 1.06, 1.03, 1], glow: "rgba(200,162,75,0.5)", duration: 1.2 },
  speaking: { scale: [1, 1.06, 1], glow: "rgba(200,162,75,0.85)", duration: 0.9 },
};

/** Alchemical voice orb. `size` (px) scales the whole thing for hero vs. floating use. */
export default function AudioOrb({ size = 288 }: { size?: number }) {
  const { state, audioTrack } = useVoiceAssistant();
  const s = STATE_STYLES[state] ?? STATE_STYLES.disconnected;

  const ring1 = size * 0.9;
  const ring2 = size * 0.72;
  const core = size * 0.6;
  const blur = Math.max(8, size * 0.11);

  return (
    <div className="relative flex items-center justify-center" style={{ height: size, width: size }}>
      {/* halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ filter: `blur(${blur}px)` }}
        animate={{ backgroundColor: s.glow, scale: s.scale }}
        transition={{ duration: s.duration, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* counter-rotating alchemical rings */}
      <motion.div
        className="absolute rounded-full border border-[#C8A24B]/30"
        style={{ height: ring1, width: ring1, boxShadow: "inset 0 0 40px rgba(200,162,75,0.25), 0 0 30px rgba(200,162,75,0.15)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute rounded-full border border-[#7C5CFF]/30"
        style={{ height: ring2, width: ring2 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      {/* glass core + volume bars */}
      <motion.div
        className="relative flex items-center justify-center rounded-full bg-gradient-to-br from-[#13245A] to-[#0A1A3F] shadow-[inset_0_0_60px_rgba(200,162,75,0.3)] backdrop-blur-xl"
        style={{ height: core, width: core }}
        animate={{ scale: s.scale }}
        transition={{ duration: s.duration, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="flex items-center justify-center" style={{ height: size * 0.28, gap: Math.max(3, size * 0.02) }}>
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={5}
            options={{ minHeight: Math.max(4, size * 0.03), maxHeight: size * 0.26 }}
            className="alchemy-visualizer flex h-full items-center"
            style={{ gap: Math.max(3, size * 0.02) }}
          />
        </div>
      </motion.div>
    </div>
  );
}
