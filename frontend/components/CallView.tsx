// components/CallView.tsx
"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  useVoiceAssistant,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { motion } from "framer-motion";
import AudioOrb from "@/components/AudioOrb";
import Transcript from "@/components/Transcript";

type Props = {
  serverUrl: string;
  token: string;
  onEnd: () => void;
};

export default function CallView({ serverUrl, token, onEnd }: Props) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video={false}
      onDisconnected={onEnd}
      className="min-h-screen"
    >
      {/* CRITICAL: renders the agent's audio. Without this you hear nothing. */}
      <RoomAudioRenderer />
      <CallStage onEnd={onEnd} />
    </LiveKitRoom>
  );
}

/** Inner component: lives *inside* LiveKitRoom so it can use room hooks. */
function CallStage({ onEnd }: { onEnd: () => void }) {
  const { state } = useVoiceAssistant();
  const room = useRoomContext();

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#C8A24B] shadow-[0_0_10px_2px_rgba(200,162,75,0.8)]" />
          <span className="text-sm uppercase tracking-[0.3em] text-[#E7CF92]">Alchemy Auto</span>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize text-zinc-300">
          {state}
        </span>
      </header>

      {/* Orb + transcript */}
      <div className="mt-8 grid flex-1 gap-8 lg:grid-cols-[1fr_minmax(0,420px)]">
        <div className="flex flex-col items-center justify-center">
          <AudioOrb />
          <p className="mt-8 text-center text-sm text-zinc-400">
            {state === "listening" && "Magnus is listening…"}
            {state === "thinking" && "Consulting the Codex…"}
            {state === "speaking" && "Magnus is speaking"}
            {(state === "connecting" || state === "initializing") && "Summoning Magnus…"}
            {state === "disconnected" && "Disconnected"}
          </p>
        </div>

        <Transcript />
      </div>

      {/* Glassmorphism control bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8 flex items-center justify-center gap-4 self-center rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-xl"
      >
        <TrackToggle
          source={Track.Source.Microphone}
          showIcon
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-zinc-100 transition hover:bg-white/10"
        >
          Mic
        </TrackToggle>

        <button
          onClick={() => room.disconnect()}
          className="flex items-center gap-2 rounded-full bg-red-500/90 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <span className="text-base">■</span> End Call
        </button>
      </motion.div>
    </div>
  );
}