// app/page.tsx
"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import CallView from "@/components/CallView";
import "@livekit/components-styles";

type Connection = {
  serverUrl: string;
  roomName: string;
  participantToken: string;
};

export default function Home() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Token request failed");
      const data: Connection = await res.json();
      setConnection(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const endCall = useCallback(() => setConnection(null), []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0A1A3F] text-zinc-100">
      {/* Gradient mesh background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-[#C8A24B]/20 blur-[140px]" />
        <div className="absolute -bottom-52 -right-32 h-[44rem] w-[44rem] rounded-full bg-[#1E3A8A]/40 blur-[160px]" />
        <div className="absolute left-1/2 top-1/3 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[#7C5CFF]/10 blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {connection ? (
          <motion.div
            key="call"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative z-10"
          >
            <CallView
              serverUrl={connection.serverUrl}
              token={connection.participantToken}
              onEnd={endCall}
            />
          </motion.div>
        ) : (
          <motion.section
            key="welcome"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center"
          >
            <span className="mb-4 rounded-full border border-[#C8A24B]/40 bg-[#C8A24B]/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-[#E7CF92]">
              Alchemy Auto
            </span>

            <h1 className="bg-gradient-to-b from-white via-[#F4E7C2] to-[#C8A24B] bg-clip-text text-5xl font-semibold leading-tight text-transparent sm:text-6xl">
              Magnus,
              <br />
              the Auto-Alchemist
            </h1>

            <p className="mt-6 max-w-xl text-balance text-lg text-zinc-300">
              Bring the base elements — your life, your budget, the roads you drive — and let Magnus
              transmute them into the one vehicle that is <em className="text-[#E7CF92]">gold</em> for
              you.
            </p>

            <motion.button
              onClick={startCall}
              disabled={loading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative mt-10 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#C8A24B] to-[#9C7A2E] px-9 py-4 text-base font-medium text-[#0A1A3F] shadow-[0_0_40px_-8px_rgba(200,162,75,0.7)] transition disabled:opacity-60"
            >
              <span className="absolute inset-0 rounded-full bg-[#C8A24B] opacity-0 blur-md transition group-hover:opacity-40" />
              <span className="relative">
                {loading ? "Opening the vault…" : "Start Call"}
              </span>
              {!loading && <span className="relative text-lg">▶</span>}
            </motion.button>

            {error && <p className="mt-5 text-sm text-red-300">{error}</p>}

            <p className="mt-12 text-xs uppercase tracking-[0.25em] text-zinc-500">
              Choosing the right car is alchemy
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}