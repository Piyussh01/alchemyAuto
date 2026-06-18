import logging

import asyncio
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    JobContext,
    RunContext,
    cli,
    ToolError
)
from livekit.agents.llm import function_tool
from livekit.plugins import anthropic, cartesia, deepgram, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from .rag.rag import query_compendium

from prompts import MAGNUS_INSTRUCTIONS
from .tools.inventory import (                                          
    search_vehicles,
    format_results_for_voice,
    insert_test_drive,
)
load_dotenv()
logger = logging.getLogger("magnus")

server = AgentServer()


# ── Prewarm ──────────────────────────────────────────────────────────────────
# Runs once per worker process before any call is dispatched. Loading the Silero
# VAD weights here (and caching them on proc.userdata) means the first caller
# doesn't pay the model-load latency.
def prewarm(proc):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


# ── The agent ────────────────────────────────────────────────────────────────
class Assistant(Agent):
    def __init__(self) -> None:
        # The persona lives here as the system prompt.
        super().__init__(instructions=MAGNUS_INSTRUCTIONS)

    # The four tools. 

    @function_tool()
    async def search_inventory(
        self,
        context: RunContext,
        model: str | None = None,
        max_price: int | None = None,
        body_type: str | None = None,
        powertrain: str | None = None,
        condition: str | None = None,
    ) -> str:
        """Search Alchemy Auto's live inventory ("the vault") for vehicles matching the
        caller's needs. Use this whenever the caller asks what cars are available, or to
        filter by model, price, style, or powertrain.

        Args:
            model: One of Aurelius, Mercurial GT, Vulcan, Nimbus, Philosopher. Omit if unsure.
            max_price: Maximum price in whole US dollars (e.g. 80000 for "under 80 thousand").
            body_type: Sedan, Coupe, Pickup, or SUV.
            powertrain: EV, Hybrid, or Petrol.
            condition: New, Certified Pre-Owned, or Used.

        Returns a short spoken summary of up to a handful of matching vehicles, or a note
        that nothing in the vault matches.
        """
        # search_vehicles calls Supabase over the network. The supabase-py client is
        # synchronous, so we run it in a thread to keep the agent's event loop free for audio.
        rows = await asyncio.to_thread(
            search_vehicles,
            model=model,
            max_price=max_price,
            body_type=body_type,
            powertrain=powertrain,
            condition=condition,
        )
        if not rows:
            return (
                "Nothing in the vault matches that exactly right now. "
                "Want me to loosen the budget or try a different model?"
            )
        return format_results_for_voice(rows)

    @function_tool()
    async def query_compendium(self, context: RunContext, query: str) -> str:
        """Consult the Alchemy Codex — the owner's compendium — for specific facts about
        our vehicles: battery and powertrain warranties, range and tow ratings, charging
        specs, maintenance intervals, the Philosopher's production cap, and similar
        owner/spec details. Use this for any factual question about an Alchemy Auto model.

        Args:
            query: The caller's question, phrased for retrieval (e.g.
                "Aurelius battery warranty term").

        Returns the answer drawn from the Codex as a short spoken paragraph.
        """

        async def _still_consulting() -> None:
            # Only fires if retrieval is slow; cancelled on a fast result.
            await asyncio.sleep(0.5)
            await context.session.generate_reply(
                instructions="Briefly tell the user you're still consulting the Codex."
            )

        status_task = asyncio.create_task(_still_consulting())
        try:
            answer = await query_compendium(query)  # the async helper 
        except Exception as exc:  # retrieval / embedding / LLM failure
            raise ToolError("I couldn't reach the Codex just then.") from exc
        finally:
            status_task.cancel()  # fast result → the reassurance never speaks
        return answer

    @function_tool()
    async def web_search(self, context: RunContext, query: str) -> str:
        """Search the wider world (the live web) for up-to-date, real-world information
        that is NOT about Alchemy Auto's own cars or specs. Use this for current EV tax
        credits and incentives, comparisons to competitor vehicles, recall notices, and
        other time-sensitive facts. Do NOT use this for Alchemy Codex facts — use the
        compendium tool for those.

        Args:
            query: A concise web search query (e.g. "2026 federal EV tax credit eligibility").

        Returns a short spoken summary of the top results with a brief mention of sources.
        """
        api_key = os.environ.get("TAVILY_API_KEY")
        if not api_key:
            raise ToolError("Web search isn't configured right now.")

        def _search() -> dict:
            from tavily import TavilyClient  # imported here so it's optional at module load

            client = TavilyClient(api_key=api_key)
            return client.search(query, max_results=3, search_depth="basic")

        try:
            res = await asyncio.to_thread(_search)  # sync client → run off the event loop
        except Exception as exc:
            raise ToolError("I couldn't check the wider world just now.") from exc

        results = res.get("results", [])
        if not results:
            return "I checked the wider world but turned up nothing solid on that."

        # Stitch the top hits into a few spoken sentences. Trim content so TTS isn't
        # reading paragraphs, and name one source so the answer feels grounded.
        parts = []
        for r in results[:3]:
            snippet = (r.get("content") or "").strip().replace("\n", " ")
            if len(snippet) > 220:
                snippet = snippet[:220].rsplit(" ", 1)[0] + "…"
            parts.append(snippet)

        top_source = results[0].get("title") or results[0].get("url", "the web")
        summary = " ".join(parts)
        return f"Here's what the wider world says. {summary} That's per {top_source}."

    @function_tool()
    async def book_test_drive(
        self,
        context: RunContext,
        vehicle_id: int,
        customer_name: str,
        preferred_datetime: str,
    ) -> str:
        """Reserve a test drive for a specific vehicle. ONLY call this AFTER you have
        confirmed the vehicle, the caller's name, and the date and time with the caller
        out loud — this writes a real booking.

        Args:
            vehicle_id: The numeric id of the vehicle from a previous inventory search.
            customer_name: The caller's name for the reservation.
            preferred_datetime: When they want to come in, in natural language or ISO
                form (e.g. "Saturday at 2pm" or "2026-06-20T14:00").

        Returns a spoken confirmation including a confirmation id.
        """
        try:
            # insert_test_drive (Guide 03) writes the row to Supabase and returns an
            # "ALC-####" confirmation id. It's a sync supabase-py call, so off-thread it.
            confirmation_id = await asyncio.to_thread(
                insert_test_drive,
                vehicle_id=int(vehicle_id),
                customer_name=customer_name,
                scheduled_for=preferred_datetime,
            )
        except Exception as exc:
            raise ToolError("I couldn't record that booking just now.") from exc

        return (
            f"Wonderful, {customer_name}. Your test drive is reserved for "
            f"{preferred_datetime}. Your confirmation is {confirmation_id}. "
            "We'll have the car warmed up and waiting."
        )


# ── Entrypoint ───────────────────────────────────────────────────────────────
# Explicit dispatch: the agent_name MUST be "magnus" — the token server
# dispatches jobs to this exact name
@server.rtc_session(agent_name="magnus")
async def entrypoint(ctx: JobContext):
    await ctx.connect()

    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=anthropic.LLM(model="claude-haiku-4-5"),
        tts=cartesia.TTS(),  # Cartesia Sonic
        vad=ctx.proc.userdata["vad"],  # cached in prewarm()
        turn_detection=MultilingualModel(),
    )

    await session.start(agent=Assistant(), room=ctx.room)

    # Greet the caller in Magnus's voice. We hand the model an instruction rather
    # than a fixed line so the greeting follows the persona and stays fresh.
    await session.generate_reply(
        instructions=(
            "Greet the caller as Magnus, the Auto-Alchemist. Warmly introduce "
            "yourself in one sentence, offer to help them find their car, and ask "
            "one opening question. Keep it to a few short spoken sentences."
        )
    )


if __name__ == "__main__":
    cli.run_app(server)