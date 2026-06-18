"""Alchemy Auto — LiveKit token server.

Mints short-lived LiveKit access tokens and requests explicit dispatch of the
"magnus" agent worker into the room. This is the only public inbound surface in
the AWS deployment. 
"""

import os
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from livekit.api import (
    AccessToken,
    VideoGrants,
    RoomConfiguration,
    RoomAgentDispatch,
)

load_dotenv()  # reads backend/.env (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)

AGENT_NAME = "magnus"        # worker registers with this exact agent_name
ROOM_PREFIX = "alchemy-"     # every room is alchemy-<random>
TOKEN_TTL_SECONDS = 15 * 60  # short-lived: 15 minutes

# ── Config from environment ────────────────────────────────────────────────────
LIVEKIT_URL = os.environ.get("LIVEKIT_URL")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.environ.get("LIVEKIT_API_SECRET")

# Allowed browser origins for CORS. In prod set ALLOWED_ORIGINS to your real
# frontend origin (comma-separated). For local dev we allow the Next.js port.
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:3000"
).split(",")

app = FastAPI(title="Alchemy Auto Token Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class TokenResponse(BaseModel):
    serverUrl: str
    roomName: str
    participantToken: str


def _create_token() -> TokenResponse:
    """Build one room + identity and sign a JWT that dispatches Magnus."""
    if not (LIVEKIT_URL and LIVEKIT_API_KEY and LIVEKIT_API_SECRET):
        # Misconfiguration → fail loudly rather than minting a broken token.
        raise HTTPException(
            status_code=500,
            detail="LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set",
        )

    room_name = f"{ROOM_PREFIX}{uuid.uuid4().hex[:8]}"
    identity = f"user-{uuid.uuid4().hex[:8]}"

    token = (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(identity)
        .with_ttl(TOKEN_TTL_SECONDS)  # short-lived token
        .with_grants(
            VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,       # the browser publishes mic audio
                can_subscribe=True,     # and subscribes to Magnus's audio
            )
        )
        # Explicit dispatch: ask LiveKit to bring "magnus" into this room.
        .with_room_config(
            RoomConfiguration(
                agents=[RoomAgentDispatch(agent_name=AGENT_NAME)],
            )
        )
    )

    return TokenResponse(
        serverUrl=LIVEKIT_URL,
        roomName=room_name,
        participantToken=token.to_jwt(),
    )


@app.get("/healthz")
def healthz() -> dict:
    """Liveness probe for ECS / App Runner health checks."""
    return {"status": "ok"}


@app.post("/token", response_model=TokenResponse)
def post_token() -> TokenResponse:
    """Primary endpoint: POST /token → JSON { serverUrl, roomName, participantToken }."""
    return _create_token()


@app.get("/token", response_model=TokenResponse)
def get_token() -> TokenResponse:
    """Convenience GET (some clients prefer it); identical behavior to POST."""
    return _create_token()
    # left this unsigned for take home 

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)