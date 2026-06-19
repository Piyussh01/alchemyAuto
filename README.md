```markdown
# Alchemy Auto — Magnus, the Auto-Alchemist

> A RAG-enabled, real-time **voice agent** for a boutique car brand, built on **LiveKit Agents 1.6**.
> Talk to Magnus in the browser; he searches live inventory, consults a retrieval-augmented
> product corpus, checks the wider web, and books your test drive all by voice, sub-second.

**Live demo:** https://alchemy-auto.vercel.app

---

## The Story / Persona

**Alchemy Auto** is a boutique car brand built on one conceit: *choosing the right car is alchemy*.
You bring the base elements — your life, your budget, the roads you drive — and the dealership
transmutes them into the one vehicle that is *gold* for you.

**Magnus, the Auto-Alchemist** is the master concierge you speak with. He is warm, curious, a little
grand, never stuffy. He speaks in short spoken-style sentences (no bullet lists, no markdown — it's
a voice), asks one question at a time, drops a brief filler before he looks something up ("Let me
consult the Codex…") so there's never dead air, and confirms before he takes an action like booking
a test drive. The alchemy metaphor is seasoning, not every sentence.

The five-car line-up he transmutes between:

| Vehicle | Type |
|---|---|
| **Aurelius** | EV luxury sedan |
| **Mercurial GT** | petrol/hybrid sports coupe |
| **Vulcan** | electric pickup truck |
| **Nimbus** | three-row hybrid SUV |
| **Philosopher** | flagship halo EV (limited) |

---

## Architecture

```
                         ┌────────────────────────── AWS ──────────────────────────┐
  Browser (Next.js)      │                                                          │
  ┌───────────────┐      │   ┌──────────────────────────┐                           │
  │ Start Call ▶  │ 1.GET│   │ Token server (FastAPI)    │  inbound 443              │
  │ live transcript│─────┼──▶│ /token  → signs LiveKit   │  (App Runner or          │
  │ End Call ▢     │ JWT  │   │ JWT, dispatches "magnus"  │   Fargate + ALB)         │
  │ audio orb    │◀─────┼───│                           │                           │
  └───────┬───────┘      │   └──────────────────────────┘                           │
          │ 2. join room (WebRTC)                                                    │
          │              │   ┌──────────────────────────────────────────┐           │
          │              │   │ AGENT WORKER (ECS Fargate, NO inbound LB) │           │
          │              │   │  livekit-agents 1.6  AgentServer          │           │
          │              │   │  STT Deepgram · LLM Claude · TTS Cartesia │           │
          │              │   │  VAD Silero · turn-detector               │           │
          │              │   │  tools: inventory / RAG / tavily / booking│           │
          │              │   │  RAG index + codex.pdf baked into image   │           │
          │              │   │  inventory → Supabase Postgres (external) │           │
          │              │   └──────────────┬───────────────────────────┘           │
          │              │        outbound 443 (wss) │  NAT GW                       │
          │              └───────────────────────────┼──────────────────────────────┘
          │                                          │ wss:// (OUTBOUND only)
          │  2. WebRTC media                          ▼
          └────────────────────────────────▶ ┌──────────────────────┐
                                              │   LiveKit Cloud (SFU) │
                                              │ dispatches job ───────┼──▶ idle worker
                                              └──────────────────────┘
```

The **agent worker is outbound-only** — it dials *out* to LiveKit Cloud over a persistent WebSocket
and waits for jobs, so it needs no inbound load balancer. The **token server is the only public
surface.** The **RAG index and the source PDF are static artifacts baked into the worker image** —
RAG retrieval is in-process and lowest-latency. The **inventory lives in Supabase (hosted Postgres)**,
reached over HTTPS via the `supabase` client — off the voice-critical RAG path, so the network hop is
a fair trade for a real SQL database with a dashboard and no `.db` file to bake or keep in sync.

---

## How it works, end-to-end

1. **Token + dispatch.** The browser calls the token server's `/token` endpoint. The server mints a
   short-lived LiveKit JWT for a fresh `alchemy-<id>` room and attaches a `RoomConfiguration` that
   **explicitly dispatches the agent named `magnus`** into that room. (We use explicit dispatch
   rather than automatic dispatch so a Magnus worker is summoned only for rooms that ask for one.)
2. **Join.** The browser joins the room over **WebRTC** with that JWT and publishes its microphone.
3. **Dispatch lands.** LiveKit Cloud sees the room config, picks an idle Magnus worker (which is
   already connected outbound), and hands it the job. The worker joins the room as a participant.
4. **The voice loop.** Inside the worker an `AgentSession` runs the realtime pipeline:
   - **VAD** — Silero detects speech start/stop.
   - **Turn detection** — the LiveKit turn-detector model decides when the user is *actually* done,
     so Magnus doesn't interrupt.
   - **STT** — Deepgram `nova-3` (`language="multi"`) transcribes the user's speech.
   - **LLM** — Claude `claude-haiku-4-5` generates Magnus's reply and decides when to call a tool.
   - **TTS** — Cartesia Sonic speaks the reply back.
5. **Live transcription.** Both sides' transcripts are published over LiveKit's `lk.transcription`
   stream; the frontend renders them live via `useTranscriptions`.
6. **Tools.** When Magnus needs data he calls a function tool (below), speaks a one-line filler while
   it runs, then narrates the result.

---

## Tools

Magnus has four `@function_tool`s. Each one maps a dealership capability to the narrative:

| Tool | Backed by | What it does |
|---|---|---|
| `search_inventory` | **Supabase** (Postgres) inventory DB | "Let me see what's in the vault." Filters stock by type, budget, powertrain, etc. |
| `query_compendium` | **RAG** over `alchemy_codex.pdf` (LlamaIndex) | "Let me consult the Codex." Answers specific facts from specific chapters (specs, warranties, lore). |
| `web_search` | **Tavily** API | "Let me check the wider world." Pulls real-time external facts: EV tax credits, recalls, competitor comparisons. |
| `book_test_drive` | writes to the Supabase `test_drives` table | "Let's reserve your transmutation." Records a test-drive booking — confirmed by voice first. |

---

## How RAG was integrated

The product Codex (`alchemy_codex.pdf`) is the dealership's deep knowledge: per-vehicle chapters with
specs, battery warranties, options, and a little lore. Magnus answers questions about it through real
**vector retrieval**, not keyword search.

- **Framework:** **LlamaIndex** with a **local persisted vector index** (`VectorStoreIndex` →
  `StorageContext` persisted to `data/index_storage/`).
- **Source → chunks:** the PDF is loaded and split with a **`SentenceSplitter`**, `chunk_size=512`,
  `chunk_overlap=64`. 512 tokens is large enough to keep a spec paragraph intact, small enough that a
  retrieved chunk is tight context for a low-latency voice reply; the 64-token overlap keeps facts
  that straddle a boundary retrievable. Each node carries its **chapter/vehicle as metadata** so
  retrieval can be scoped.
- **Embeddings:** OpenAI **`text-embedding-3-small`** — cheap, fast, and more than accurate enough for
  a small single-document corpus, with a small vector dimension that keeps query embedding latency low.
- **Exposure:** retrieval is wrapped in `query_compendium` and registered as a **`@function_tool`**, so
  the LLM *decides* when to retrieve and with what query — the Codex is not stuffed into every prompt.
- **Where it runs:** the index is **built offline** (`build_index.py`) and **baked into the worker
  image**. At call time retrieval is an **in-process** vector lookup — no network hop to a managed
  vector DB — which matters a lot inside a sub-second voice turn.

---

## Tools / frameworks used

| Layer | Choice |
|---|---|
| Agent framework | **LiveKit Agents 1.6** (`AgentServer` + `@server.rtc_session()`) |
| STT | **Deepgram** `nova-3` (`language="multi"`) |
| LLM | **Anthropic Claude** `claude-haiku-4-5` |
| TTS | **Cartesia** Sonic |
| VAD | **Silero** |
| Turn detection | LiveKit **turn-detector** model |
| RAG framework | **LlamaIndex** (local persisted `VectorStoreIndex`) |
| Embeddings | **OpenAI** `text-embedding-3-small` (chunk 512 / overlap 64) |
| Web search | **Tavily** |
| Inventory DB | **Supabase** (hosted Postgres, `supabase` client) |
| Token server | **FastAPI** + Uvicorn + `livekit-api` |
| Frontend | **Next.js 15** (App Router, TS) + **`@livekit/components-react`** |
| Hosting — worker | **AWS ECS Fargate** (outbound-only, autoscale on CPU) |
| Hosting — token server | **AWS App Runner** |
| Hosting — frontend | **Vercel** |
| Realtime infra | **LiveKit Cloud** (SFU) |

---

## Setup — run locally

**Prerequisites:** Python 3.12, Node 18+, a Supabase project, and API keys for LiveKit Cloud,
Deepgram, Anthropic, Cartesia, OpenAI (embeddings), and Tavily.

```bash
# 1. Backend deps + env
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # fill in the keys below

# 2. One-time RAG artifact build (these get baked into the Docker image for prod)
python src/rag/build_codex_pdf.py   # generate alchemy_codex.pdf
python src/rag/build_index.py       # build + persist the LlamaIndex vector index

# 3. One-time inventory setup in Supabase (not baked into the image)
python src/db/seed_inventory.py     # seed the Supabase `vehicles` table

# 4. Run the agent worker (hot reload) — terminal 1
python src/agent.py dev

# 5. Run the token server — terminal 2
python src/token_server.py
```

```bash
# 6. Frontend — terminal 3
cd frontend
npm install
cp .env.local.example .env.local    # fill in LiveKit values
npm run dev                          # http://localhost:3000
```

Open <http://localhost:3000>, click **Start Call**, and talk to Magnus.

**Backend `.env`:**

```
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
DEEPGRAM_API_KEY=
CARTESIA_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=          # embeddings for RAG only
TAVILY_API_KEY=
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   # service_role key — backend only, bypasses RLS
```

**Frontend `.env.local`:**

```
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```
---

## Design decisions & assumptions

**RAG: local LlamaIndex vs. a managed vector DB.** The pdf is one small, static document. A managed
vector DB (Pinecone, Weaviate, pgvector) would add a network hop on every retrieval, an extra service
to run, and a key to rotate — all to query a corpus that fits comfortably in memory. So the index is
built offline and **baked into the worker image**, queried **in-process**. This trades away
horizontal-scale / live-reindexing (you rebuild + redeploy to update the Codex) for the thing a voice
agent needs most: the lowest possible retrieval latency. If the corpus grew to many large/changing
documents, the right move would be a managed store; the `query_compendium` interface is unchanged, so
that swap is localized.

**Chunking strategy.** `SentenceSplitter` at `chunk_size=512` / `chunk_overlap=64`. Big enough to keep
a full spec/warranty paragraph in one chunk (so the answer isn't fragmented), small enough that the
retrieved context stays tight and the LLM's voice reply stays fast. Overlap preserves facts that span a
chunk boundary. Chapter metadata is attached to each node so retrieval can be filtered to a single
vehicle when the user names one.

**Why `text-embedding-3-small`.** For a single-document corpus, the larger/`3-large` embedding buys
little accuracy but costs more and embeds slower. `3-small` is the right point on the
latency/cost/quality curve here.

**Function-tool vs. context-injection.** We expose RAG as a **tool the LLM calls on demand** rather than
prepending Codex text to every system prompt. This keeps the prompt small (cheaper, faster, less
distraction), lets Magnus retrieve only when a question actually needs the Codex, and lets him form a
targeted query. The cost is one extra LLM turn to issue the tool call — covered by Magnus's spoken
filler ("Let me consult the Codex…") so the user never hears dead air.

**Inventory store: Supabase vs. a baked-in file.** The RAG index is baked into the image because it's
static and on the voice-critical path. The inventory is different: it's mutable (bookings get written,
stock changes) and benefits from being a real, inspectable SQL database. So it lives in **Supabase**
(hosted Postgres) and the worker talks to it over HTTPS via the `supabase` client. The trade-off is a
network round-trip per inventory lookup instead of an in-process read — acceptable because inventory
queries aren't on the sub-second RAG path, and in return we get a dashboard, real SQL, durable
bookings, and no `.db` file to bake or keep in sync across worker instances. The service-role key
stays server-side only (it bypasses RLS), injected via Secrets Manager.

**LiveKit agent design.**
- **Explicit dispatch (`agent_name="magnus"`).** The token server attaches a `RoomConfiguration` that
  names `magnus`, so workers are summoned only into rooms that request one — clean separation between
  "a room exists" and "an agent should join it," and it makes multi-agent routing trivial later.
- **STT→LLM→TTS pipeline vs. a realtime speech model.** The pipeline gives independent control of each
  stage (best-in-class STT, a text LLM with strong tool-calling, a chosen TTS voice) and makes tool
  calls / RAG first-class. A single realtime speech model would simplify the loop but weaken
  tool-calling control and provider flexibility.
- **Why Claude `claude-haiku-4-5`.** Voice is latency-bound: every extra hundred milliseconds is heard.
  Haiku is fast with strong tool-calling, which is exactly what this loop needs. Thinking is kept
  off/minimal for the same reason. Swapping to `claude-sonnet-4-6` for richer persona is a one-line
  change if latency budget allows.

**Hosting assumptions.** LiveKit Cloud is the SFU. The worker runs on ECS Fargate (4 vCPU / 8 GB,
autoscaling on CPU) with **no inbound load balancer** because it only ever connects *out*; egress is via
a NAT gateway. The token server is the only public surface (App Runner). The frontend is on Vercel. All
secrets are environment variables / secrets-manager entries, never committed.

**Trade-offs & limitations.**
- Inventory and bookings are **synthetic**, stored in **Supabase** (Postgres) — there's no real
  DMS/CRM integration, and the table is seeded once from a script.
- Updating the Codex requires a **rebuild + redeploy** of the worker image (the cost of baking the
  index in).
- **Fargate drain caveat:** because the worker holds long-lived WebRTC sessions, set a generous task
  `stopTimeout` and let LiveKit drain jobs gracefully on deploy/scale-in — otherwise an in-progress
  call can be cut off mid-sentence when a task is replaced. (See Guide 08.)

---
```

