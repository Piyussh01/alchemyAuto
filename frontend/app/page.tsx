// app/page.tsx
"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import CallView from "@/components/CallView";
import { HeroCar, BodySilhouette, AlchemyMark } from "@/components/CarSvg";
import {
  VEHICLES,
  MODELS,
  ORDER,
  modelStats,
  usd,
  type BodyType,
  type Vehicle,
} from "@/lib/inventory";
import "@livekit/components-styles";

type Connection = { serverUrl: string; roomName: string; participantToken: string };

const NAV = [
  { label: "The Collection", href: "#collection" },
  { label: "The Vault", href: "#vault" },
  { label: "Compare", href: "#compare" },
];

export default function Home() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async () => {
    if (connection) return; // a call is already live in the floating widget
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Token request failed");
      setConnection(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [connection]);

  const endCall = useCallback(() => setConnection(null), []);

  return (
    <div className="min-h-screen bg-[#e7e5e0] text-zinc-900">
      {/* ===== NAV ===== */}
      <nav className="fixed inset-x-0 top-0 z-40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <a href="#top" className="flex items-center gap-2.5">
            <AlchemyMark className="h-7 w-7 text-zinc-900" />
            <span className="text-lg font-semibold tracking-tight">Alchemy Auto</span>
          </a>
          <div className="hidden items-center gap-8 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600 transition hover:text-[#9c7a2e]"
              >
                {n.label}
              </a>
            ))}
          </div>
          <button
            onClick={startCall}
            disabled={loading}
            className="rounded-full border border-zinc-900/70 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-900 transition hover:border-[#9c7a2e] hover:text-[#9c7a2e] disabled:opacity-50"
          >
            {loading ? "Summoning…" : "Talk to Magnus"}
          </button>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section id="top" className="relative flex min-h-screen flex-col items-center overflow-hidden">
        {/* studio gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_18%,#f3f1ec_0%,#e7e5e0_42%,#cbc8c2_100%)]" />
        <div className="pointer-events-none absolute -left-40 top-1/4 h-[36rem] w-[36rem] rounded-full bg-[#c8a24b]/10 blur-[150px]" />

        <p className="relative mt-32 font-mono text-[11px] uppercase tracking-[0.45em] text-zinc-500">
          Scroll to explore
        </p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex w-full flex-1 items-center justify-center px-6"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="w-full max-w-5xl"
          >
            <HeroCar className="w-full" />
          </motion.div>
        </motion.div>

        {/* headline bottom-left */}
        <div className="relative z-10 mb-16 w-full max-w-7xl px-6">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl"
          >
            Transmuted to perfection.
          </motion.h1>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            Alchemy Auto · Est. 2026 · Sedona, Arizona
          </p>
        </div>

        {/* floating "Talk to Magnus" launcher — hidden once the call widget is up */}
        {!connection && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          onClick={startCall}
          disabled={loading}
          className="group fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-2xl border border-zinc-900/10 bg-white/80 px-4 py-3 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:border-[#9c7a2e]/40"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#13245A] to-[#0A1A3F]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#c8a24b]/40" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-[#e9cf8e] shadow-[0_0_10px_2px_rgba(233,207,142,0.9)]" />
          </span>
          <span className="text-left">
            <span className="block text-sm font-medium text-zinc-900">Talk to Magnus</span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
              the Auto-Alchemist
            </span>
          </span>
        </motion.button>
        )}
      </section>

      {/* ===== THE COLLECTION ===== */}
      <section id="collection" className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader index="01" title="The Collection" sub="Five vehicles. One philosophy: bring the base elements, leave with gold." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODELS.map((m, i) => {
            const s = modelStats(m.name);
            return (
              <motion.article
                key={m.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: (i % 3) * 0.06 }}
                className="group flex flex-col rounded-3xl border border-zinc-900/8 bg-white/70 p-7 backdrop-blur transition hover:-translate-y-1 hover:border-[#9c7a2e]/30 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight">{m.name}</h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{m.kind}</p>
                  </div>
                  <span className="text-zinc-800/80 transition group-hover:text-[#9c7a2e]">
                    <BodySilhouette body={m.body} className="h-12 w-28" />
                  </span>
                </div>
                <p className="mt-5 text-[15px] italic text-zinc-600">“{m.tagline}”</p>
                <div className="mt-5 flex items-center gap-2 rounded-xl bg-[#c8a24b]/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#7a5e20]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9c7a2e]" /> {m.halo}
                </div>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {s.trims.map((t) => (
                    <span key={t} className="rounded-full border border-zinc-900/10 px-2.5 py-1 text-[11px] text-zinc-600">{t}</span>
                  ))}
                </div>
                <div className="mt-auto flex items-end justify-between pt-7">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">From</p>
                    <p className="text-xl font-semibold">{usd(s.fromPrice)}</p>
                  </div>
                  <p className="font-mono text-[11px] text-zinc-500">
                    {s.maxHp} hp{s.maxRange ? ` · ${s.maxRange} mi` : ""}
                  </p>
                </div>
              </motion.article>
            );
          })}

          {/* "ask instead" card */}
          <motion.button
            onClick={startCall}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-start justify-center gap-3 rounded-3xl border border-dashed border-[#9c7a2e]/40 bg-gradient-to-br from-[#0A1A3F] to-[#13245A] p-7 text-left text-zinc-100 transition hover:border-[#9c7a2e]"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e9cf8e]">Or skip the scrolling</span>
            <span className="text-2xl font-semibold leading-tight">“Magnus, which one is right for me?”</span>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#c8a24b] px-4 py-2 text-sm font-medium text-[#0A1A3F]">Start the call ▶</span>
          </motion.button>
        </div>
      </section>

      {/* ===== THE VAULT (traditional browsing) ===== */}
      <Vault onAsk={startCall} />

      {/* ===== COMPARE ===== */}
      <section id="compare" className="mx-auto max-w-7xl px-6 py-24">
        <SectionHeader index="03" title="Two ways to find your car" sub="This page is the old way. Magnus is the new one." />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-900/8 bg-white/60 p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Browse it yourself</p>
            <h3 className="mt-3 text-2xl font-semibold">Scroll. Filter. Compare.</h3>
            <ul className="mt-5 space-y-2.5 text-[15px] text-zinc-600">
              <li>· Page through {VEHICLES.length} listings</li>
              <li>· Cross-reference specs, trims and warranties yourself</li>
              <li>· Hope you didn’t miss the one</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-[#9c7a2e]/30 bg-gradient-to-br from-[#0A1A3F] to-[#13245A] p-8 text-zinc-100">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e9cf8e]">Just ask</p>
            <h3 className="mt-3 text-2xl font-semibold">“Find me an electric truck under 80k that tows my trailer.”</h3>
            <p className="mt-5 text-[15px] text-zinc-300">
              Magnus searches the same inventory, consults the Codex for specs and warranties, checks
              the live web for incentives, and books your test drive — by voice, in seconds.
            </p>
            <button onClick={startCall} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#c8a24b] px-6 py-3 text-sm font-medium text-[#0A1A3F] transition hover:bg-[#e9cf8e]">
              Talk to Magnus ▶
            </button>
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900/10 py-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500">
          Alchemy Auto · Solve et Coagula
        </p>
      </footer>

      {/* ===== FLOATING CALL WIDGET — page stays visible & scrollable behind it ===== */}
      {connection && (
        <CallView serverUrl={connection.serverUrl} token={connection.participantToken} onEnd={endCall} />
      )}
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function SectionHeader({ index, title, sub }: { index: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="font-mono text-[11px] tracking-[0.2em] text-[#9c7a2e]">{index}</span>
        <span className="h-px flex-1 bg-zinc-900/10" />
      </div>
      <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      <p className="max-w-2xl text-[15px] text-zinc-600">{sub}</p>
    </div>
  );
}

const FILTERS: ("All" | BodyType)[] = ["All", "Sedan", "Coupe", "Pickup", "SUV"];
const STATUS_STYLE: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-700",
  reserved: "bg-amber-500/15 text-amber-700",
  sold: "bg-zinc-500/15 text-zinc-500",
};

function Vault({ onAsk }: { onAsk: () => void }) {
  const [filter, setFilter] = useState<"All" | BodyType>("All");
  const rows = useMemo(
    () =>
      [...VEHICLES]
        .filter((v) => filter === "All" || v.body === filter)
        .sort((a, b) => ORDER.indexOf(a.model) - ORDER.indexOf(b.model) || a.price - b.price),
    [filter],
  );

  return (
    <section id="vault" className="bg-[#dedcd6] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeader index="02" title="The Vault" sub={`Every vehicle in stock right now — ${VEHICLES.length} listings across the collection.`} />
        <div className="mt-8 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] transition ${
                filter === f ? "bg-zinc-900 text-white" : "border border-zinc-900/15 text-zinc-600 hover:border-zinc-900/40"
              }`}
            >
              {f}
            </button>
          ))}
          <button onClick={onAsk} className="ml-auto font-mono text-[11px] uppercase tracking-[0.15em] text-[#9c7a2e] hover:underline">
            Too many? Ask Magnus →
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((v, i) => (
            <VehicleCard key={`${v.model}-${v.trim}-${v.year}-${i}`} v={v} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VehicleCard({ v }: { v: Vehicle }) {
  const sold = v.status === "sold";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      className={`flex flex-col rounded-2xl border border-zinc-900/8 bg-white/75 p-5 backdrop-blur ${sold ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">{v.year} · {v.condition}</p>
          <h4 className="mt-1 text-lg font-semibold leading-tight">
            {v.model} <span className="text-zinc-500">{v.trim}</span>
          </h4>
        </div>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] ${STATUS_STYLE[v.status]}`}>
          {v.status}
        </span>
      </div>

      <span className="mt-3 text-zinc-800/70">
        <BodySilhouette body={v.body} className="h-9 w-24" />
      </span>

      <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-600">
        <Spec>{v.powertrain}</Spec>
        <Spec>{v.hp} hp</Spec>
        {v.rangeMiles != null && <Spec>{v.rangeMiles} mi</Spec>}
        <Spec>{v.drivetrain}</Spec>
      </div>

      <p className="mt-3 text-[13px] text-zinc-500">
        {v.exterior} · {v.mileage === 0 ? "0 mi (new)" : `${v.mileage.toLocaleString()} mi`}
      </p>

      <div className="mt-auto pt-4">
        <p className="text-xl font-semibold">{usd(v.price)}</p>
      </div>
    </motion.div>
  );
}

function Spec({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md bg-zinc-900/5 px-2 py-1">{children}</span>;
}
