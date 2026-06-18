// components/Transcript.tsx
"use client";

import { useEffect, useRef } from "react";
import { useTranscriptions, useLocalParticipant } from "@livekit/components-react";
import { motion } from "framer-motion";

export default function Transcript() {
  const transcriptions = useTranscriptions();
  const { localParticipant } = useLocalParticipant();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest line whenever the transcript updates.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcriptions]);

  return (
    <div className="flex h-full max-h-[70vh] flex-col rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-3 text-xs uppercase tracking-[0.25em] text-[#E7CF92]">
        Transmutation Log
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {transcriptions.length === 0 && (
          <p className="text-sm text-zinc-500">Speak to begin the ritual…</p>
        )}

        {transcriptions.map((t) => {
          const fromLocal =
            t.participantInfo?.identity === localParticipant?.identity;
          return (
            <motion.div
              key={t.streamInfo?.id ?? `${t.participantInfo?.identity}-${t.text.slice(0, 12)}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${fromLocal ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  fromLocal
                    ? "bg-white/10 text-zinc-100"
                    : "bg-gradient-to-br from-[#C8A24B]/20 to-[#9C7A2E]/10 text-[#F4E7C2] ring-1 ring-[#C8A24B]/30"
                }`}
              >
                <span className="mb-0.5 block text-[10px] uppercase tracking-wider opacity-60">
                  {fromLocal ? "You" : "Magnus"}
                </span>
                {t.text}
              </div>
            </motion.div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}