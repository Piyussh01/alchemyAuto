import logging

from dotenv import load_dotenv
from livekit.agents import (
    AgentServer,
    AgentSession,
    Agent,
    JobContext,
    RunContext,
    cli,
)
from livekit.agents.llm import function_tool
from livekit.plugins import anthropic, cartesia, deepgram, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

from prompts import MAGNUS_INSTRUCTIONS

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

    @function_tool
    async def search_inventory(
        self,
        context: RunContext,
        model: str | None = None,
        max_price: int | None = None,
        body_style: str | None = None,
    ) -> str:
        """Search Alchemy Auto's live inventory for cars currently in stock.

        Use this for anything about what we actually have right now: trims, colors,
        prices, stock numbers, availability. Filter by model name, a maximum price,
        or a body style (sedan, coupe, truck, SUV) when the caller gives you one.
        """
        return "Inventory lookup not yet implemented."

    @function_tool
    async def query_compendium(self, context: RunContext, question: str) -> str:
        """Consult the Codex — Alchemy Auto's book of deep vehicle specifications.

        Use this for detailed facts written down in the Codex: battery warranties,
        range, charging, drivetrain details, materials, anything spec-level about
        the five cars. Pass the caller's question in natural language.
        """
        return "Codex lookup not yet implemented."

    @function_tool
    async def web_search(self, context: RunContext, query: str) -> str:
        """Search the wider world for current, real-time information.

        Use this for things that change and aren't in our own data: EV tax credits,
        recalls, news, or comparisons to other manufacturers' vehicles.
        """
        return "Web search not yet implemented."

    @function_tool
    async def book_test_drive(
        self,
        context: RunContext,
        model: str,
        customer_name: str,
        preferred_day: str,
    ) -> str:
        """Reserve a test drive. Only call this AFTER the caller has confirmed the
        car, the day, and their name out loud.

        Books the given model for the named customer on the preferred day and
        returns a confirmation.
        """
        return "Booking not yet implemented."


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