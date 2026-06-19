// components/CallView.tsx
"use client";

import { useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  TrackToggle,
  useVoiceAssistant,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { AnimatePresence, motion } from "framer-motion";
import AudioOrb from "@/components/AudioOrb";
import Transcript from "@/components/Transcript";

type Props = {
  serverUrl: string;
  token: string;
  onEnd: () => void;
};

/**
 * Floating, non-blocking call widget. `display: contents` on the room means the
 * fixed-positioned widget anchors to the viewport, so the landing page stays fully
 * visible and scrollable behind it while the call is live.
 */
export default function CallView({ serverUrl, token, onEnd }: Props) {
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      audio
      video={false}
      onDisconnected={onEnd}
      className="contents"
    >
      {/* CRITICAL: renders the agent's audio. Without this you hear nothing. */}
      <RoomAudioRenderer />
      <FloatingCall onEnd={onEnd} />
    </LiveKitRoom>
  );
}

const STATE_LABEL: Record<string, string> = {
  disconnected: "Disconnected",
  connecting: "Summoning Magnus…",
  initializing: "Summoning Magnus…",
  listening: "Listening…",
  thinking: "Consulting the Codex…",
  speaking: "Speaking",
};

function FloatingCall({ onEnd }: { onEnd: () => void }) {
  const { state } = useVoiceAssistant();
  const room = useRoomContext();
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="fixed bottom-5 right-5 z-50 flex w-[min(92vw,380px)] flex-col overflow-hidden rounded-3xl border border-[#C8A24B]/25 bg-[#0A1A3F]/95 text-zinc-100 shadow-[0_24px_70px_-20px_rgba(0,0,0,0.75)] backdrop-blur-xl"
      style={{ maxHeight: "min(80vh, 660px)" }}
    >
      {/* header: compact orb + state + collapse */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="-my-1 shrink-0">
          <AudioOrb size={56} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Magnus</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-[#E7CF92]">
            {STATE_LABEL[state] ?? state}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Collapse transcript" : "Expand transcript"}
          className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
        >
          {open ? "–" : "+"}
        </button>
      </div>

      {/* transcript (scrolls; page scrolls behind the widget) */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 flex-1">
              <Transcript embedded />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* controls */}
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
        <TrackToggle
          source={Track.Source.Microphone}
          showIcon
          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-100 transition hover:bg-white/10"
        >
          Mic
        </TrackToggle>
        <button
          onClick={() => room.disconnect()}
          className="flex items-center gap-2 rounded-full bg-red-500/90 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <span className="text-base leading-none">■</span> End Call
        </button>
      </div>
    </motion.div>
  );
}
