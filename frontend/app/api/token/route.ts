// app/api/token/route.ts
import { NextResponse } from "next/server";
import { AccessToken, type VideoGrant } from "livekit-server-sdk";
import { RoomConfiguration, RoomAgentDispatch } from "@livekit/protocol";

// Always run on the Node.js runtime (server SDK needs Node crypto), never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGENT_NAME = "magnus"; // must match the backend agent_name

export async function POST() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Server missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET" },
      { status: 500 },
    );
  }

  // Unique room + identity per call. Room prefix `alchemy-` per the canonical spec.
  const roomName = `alchemy-${crypto.randomUUID().slice(0, 8)}`;
  const identity = `seeker-${crypto.randomUUID().slice(0, 8)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: "Seeker",
    ttl: "15m", // short-lived: long enough to start a call, not a standing credential
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };
  at.addGrant(grant);

  // EXPLICIT DISPATCH — tell LiveKit Cloud to dispatch the `magnus` agent into this room.
  at.roomConfig = new RoomConfiguration({
    agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
  });

  const participantToken = await at.toJwt();

  return NextResponse.json(
    { serverUrl: url, roomName, participantToken },
    { headers: { "Cache-Control": "no-store" } },
  );
}