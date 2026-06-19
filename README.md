# Alchemy Auto — Magnus, the Auto-Alchemist

> A RAG-enabled, real-time **voice agent** for a boutique car brand, built on **LiveKit Agents 1.6**.
> Talk to Magnus in the browser; he searches live inventory, consults a retrieval-augmented
> product corpus, checks the wider web, and books your test drive all by voice, sub-second.

**Live demo:** [https://alchemy-auto.vercel.app](https://alchemy-auto.vercel.app)

---

## The Story / Persona

**Alchemy Auto** is a boutique car brand built on one conceit: *choosing the right car is alchemy*.  
You bring the base elements your life, your budget, the roads you drive and the dealership  
transmutes them into the one vehicle that is *gold* for you.

**Magnus, the Auto-Alchemist** is the master concierge you speak with. He is warm, curious, a little  
grand, never stuffy. He speaks in short spoken-style sentences (no bullet lists, no markdow).

The five-car line-up he transmutes between:


| Vehicle          | Type                       |
| ---------------- | -------------------------- |
| **Aurelius**     | EV luxury sedan            |
| **Mercurial GT** | petrol/hybrid sports coupe |
| **Vulcan**       | electric pickup truck      |
| **Nimbus**       | three-row hybrid SUV       |
| **Philosopher**  | flagship halo EV (limited) |


---

## Architecture

```
  ┌──────────────────── Vercel ────────────────────┐     ┌─────────────── AWS ───────────────┐
  │  Browser (Next.js App Router)                   │     │                                    │
  │  ┌───────────────┐    ┌───────────────────────┐ │     │  ┌──────────────────────────────┐  │
  │  │ Start Call ▶  │ 1. │ /api/token            │ │     │  │ AGENT WORKER                 │  │
  │  │ live transcript│──▶│ (Next.js route)       │ │     │  │ (ECS Fargate, NO inbound LB) │  │
  │  │ End Call ▢     │JWT│ signs LiveKit JWT,     │ │     │  │  livekit-agents 1.6          │  │
  │  │ audio orb     │◀──│ dispatches "magnus"    │ │     │  │  STT Deepgram · LLM Claude   │  │
  │  └───────┬───────┘    └───────────────────────┘ │     │  │  TTS Cartesia · VAD Silero   │  │
  │          │                                       │     │  │  tools: inventory/RAG/tavily │  │
  └──────────┼───────────────────────────────────────┘     │  │  RAG index + codex.pdf baked │  │
             │ 2. join room (WebRTC)                        │  │  inventory → Supabase (ext)  │  │
             │                                              │  └──────────────┬───────────────┘  │
             │                                              │      outbound 443 (wss) │ NAT GW    │
             │                                              └─────────────────────────┼──────────┘
             │                                                        wss:// (OUTBOUND only)
             │  2. WebRTC media                                        ▼
             └──────────────────────────────────────▶ ┌──────────────────────┐
                                                       │   LiveKit Cloud (SFU) │
                                                       │ dispatches job ───────┼──▶ idle worker
                                                       └──────────────────────┘
```

The **agent worker is outbound-only** it dials *out* to LiveKit Cloud over a persistent WebSocket
and waits for jobs, so it needs no inbound load balancer; **AWS hosts nothing public.** Tokens are
minted by a **Next.js API route (`/api/token`)** that runs server-side on Vercel, so the LiveKit API
secret never reaches the browser and there's no separate token service to deploy. The **RAG index and**  
**the source PDF are static artifacts baked into the worker image and** RAG retrieval is in-process and lowest-latency. The **inventory lives in Supabase (hosted Postgres)**, reached over HTTPS via the `supabase` client off the voice-critical RAG path, so the network hop is a fair trade for a real SQL database with a dashboard and no `.db` file to bake or keep in sync.

---

## How it works, end-to-end

1. **Token + dispatch.** The browser calls the Next.js `/api/token` route. The route mints a
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

## Tools given to LLM

Magnus has four `@function_tool`s. Each one maps a dealership capability to the narrative:


| Tool               | Backed by                                     | What it does                                                                                                     |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `search_inventory` | **Supabase** (Postgres) inventory DB          | "Let me see what's in the vault." Filters stock by type, budget, powertrain, etc.                                |
| `query_compendium` | **RAG** over `alchemy_codex.pdf` (LlamaIndex) | "Let me consult the Codex." Answers specific facts from specific chapters (specs, warranties, lore).             |
| `web_search`       | **Tavily** API                                | "Let me check the wider world." Pulls real-time external facts: EV tax credits, recalls, competitor comparisons. |
| `book_test_drive`  | writes to the Supabase `test_drives` table    | "Let's reserve your transmutation." Records a test-drive booking confirmed by voice first.                       |


---

## How RAG was integrated

The product Codex (`alchemy_codex.pdf`) is the dealership's deep knowledge: per-vehicle chapters with
specs, battery warranties, options, and a little lore. Magnus answers questions about it through real
**vector retrieval**, not keyword search.

- **Framework:** **LlamaIndex** with a **local persisted vector index** (`VectorStoreIndex` →
`StorageContext` persisted to `data/index_storage/`).
- **Source → chunks:** the PDF is loaded and split with a `**SentenceSplitter`**, `chunk_size=512`,
`chunk_overlap=64`. 512 tokens is large enough to keep a spec paragraph intact, small enough that a
retrieved chunk is tight context for a low-latency voice reply; the 64-token overlap keeps facts
that straddle a boundary retrievable. Each node carries its **chapter/vehicle as metadata** so
retrieval can be scoped.
- **Embeddings:** OpenAI `**text-embedding-3-small`** — cheap, fast, and more than accurate enough for
a small single-document corpus, with a small vector dimension that keeps query embedding latency low.
- **Exposure:** retrieval is wrapped in `query_compendium` and registered as a `**@function_tool`**, so
the LLM *decides* when to retrieve and with what query — the Codex is not stuffed into every prompt.
- **Where it runs:** the index is **built offline** (`build_index.py`) and **baked into the worker
image**. At call time retrieval is an **in-process** vector lookup — no network hop to a managed
vector DB — which matters a lot inside a sub-second voice turn.

---

## Frameworks used


| Layer                            | Choice                                                            |
| -------------------------------- | ----------------------------------------------------------------- |
| Agent framework                  | **LiveKit Agents 1.6** (`AgentServer` + `@server.rtc_session()`)  |
| STT                              | **Deepgram** `nova-3` (`language="multi"`)                        |
| LLM                              | **Anthropic Claude** `claude-haiku-4-5`                           |
| TTS                              | **Cartesia** Sonic                                                |
| VAD                              | **Silero**                                                        |
| Turn detection                   | LiveKit **turn-detector** model                                   |
| RAG framework                    | **LlamaIndex** (local persisted `VectorStoreIndex`)               |
| Embeddings                       | **OpenAI** `text-embedding-3-small` (chunk 512 / overlap 64)      |
| Web search                       | **Tavily**                                                        |
| Inventory DB                     | **Supabase** (hosted Postgres, `supabase` client)                 |
| Token minting                    | **Next.js API route** (`/api/token`) + `livekit-server-sdk`       |
| Frontend                         | **Next.js 15** (App Router, TS) + `**@livekit/components-react`** |
| Hosting — worker                 | **AWS ECS Fargate** (outbound-only, autoscale on CPU)             |
| Hosting — frontend + token route | **Vercel**                                                        |
| Realtime infra                   | **LiveKit Cloud** (SFU)                                           |


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
```

```bash
# 5. Frontend + token route — terminal 2
cd frontend
npm install
cp .env.local.example .env.local    # fill in LiveKit values (the /api/token route signs JWTs)
npm run dev                          # http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000), click **Start Call**, and talk to Magnus.

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

