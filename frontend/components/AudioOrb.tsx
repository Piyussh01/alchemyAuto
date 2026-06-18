// components/AudioOrb.tsx
"use client";

import { BarVisualizer, useVoiceAssistant } from "@livekit/components-react";
import { motion } from "framer-motion";

// Per-state visual treatment for the orb glow + halo.
const STATE_STYLES: Record<
  string,
  { scale: number[]; glow: string; duration: number }
> = {
  disconnected: { scale: [1, 1], glow: "rgba(120,120,140,0.25)", duration: 4 },
  connecting: { scale: [1, 1.04, 1], glow: "rgba(124,92,255,0.35)", duration: 1.6 },
  initializing: { scale: [1, 1.04, 1], glow: "rgba(124,92,255,0.35)", duration: 1.6 },
  listening: { scale: [1, 1.08, 1], glow: "rgba(124,92,255,0.55)", duration: 2.4 },
  thinking: { scale: [1, 1.03, 1.06, 1.03, 1], glow: "rgba(200,162,75,0.5)", duration: 1.2 },
  speaking: { scale: [1, 1.06, 1], glow: "rgba(200,162,75,0.85)", duration: 0.9 },
};

export default function AudioOrb() {
  const { state, audioTrack } = useVoiceAssistant();
  const s = STATE_STYLES[state] ?? STATE_STYLES.disconnected;

  return (
    <div className="relative flex h-72 w-72 items-center justify-center">
      {/* Outer halo — soft, slow, color shifts with state */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl"
        animate={{ backgroundColor: s.glow, scale: s.scale }}
        transition={{ duration: s.duration, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating alchemical ring */}
      <motion.div
        className="absolute h-64 w-64 rounded-full border border-[#C8A24B]/30"
        style={{
          boxShadow: "inset 0 0 40px rgba(200,162,75,0.25), 0 0 30px rgba(200,162,75,0.15)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute h-52 w-52 rounded-full border border-[#7C5CFF]/30"
        animate={{ rotate: -360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />

      {/* Glass core */}
      <motion.div
        className="relative flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-[#13245A] to-[#0A1A3F] shadow-[inset_0_0_60px_rgba(200,162,75,0.3)] backdrop-blur-xl"
        animate={{ scale: s.scale }}
        transition={{ duration: s.duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Volume-reactive bars — only meaningful once an audio track exists */}
        <BarVisualizer
          state={state}
          trackRef={audioTrack}
          barCount={5}
          options={{ minHeight: 8, maxHeight: 70 }}
          className="alchemy-visualizer flex h-20 items-center gap-1.5"
        />
      </motion.div>
    </div>
  );
}