"""
Inventory read/write helpers backed by Supabase Postgres.

Guide 05 wraps search_vehicles + insert_test_drive in @function_tools.
These functions are framework-agnostic so they're easy to unit test.

NOTE: supabase-py is SYNCHRONOUS. Guide 05 calls these via asyncio.to_thread(...)
so the blocking network call never stalls the agent's event loop.
"""
from __future__ import annotations

import random

from src.db.supabase_client import get_supabase


def search_vehicles(
    model: str | None = None,
    max_price: int | None = None,
    body_type: str | None = None,
    powertrain: str | None = None,
    condition: str | None = None,
    min_range: int | None = None,
    limit: int = 8,
) -> list[dict]:
    """
    Search available inventory. Every argument is optional; supplied ones are
    AND-ed together. Only returns vehicles with status 'available'.
    Returns a list of plain dicts (JSON-serializable for the LLM).
    """
    sb = get_supabase()

    # Always start from available stock; the query builder escapes values for
    # us, so LLM/caller-derived inputs never get string-interpolated into SQL.
    query = sb.table("vehicles").select("*").eq("status", "available")

    if model:
        query = query.eq("model", model)
    if max_price is not None:
        query = query.lte("price", max_price)
    if body_type:
        query = query.eq("body_type", body_type)
    if powertrain:
        query = query.eq("powertrain", powertrain)
    if condition:
        query = query.eq("condition", condition)
    if min_range is not None:
        query = query.gte("range_miles", min_range)

    query = query.order("price", desc=False).limit(int(limit))
    return query.execute().data


def format_results_for_voice(rows: list[dict]) -> str:
    """
    Turn rows into short, spoken-friendly sentences for the TTS layer.
    No markdown, no tables, no bullet points, no symbols the engine can't say.
    Prices are spoken in plain dollars; range only mentioned for EV/Hybrid.
    """
    if not rows:
        return "I couldn't find anything in the vault matching that. Want to widen the search?"

    n = len(rows)
    lead = (
        "Here's what I found in the vault. "
        if n > 1
        else "I found one match in the vault. "
    )
    sentences = [lead]
    for r in rows:
        price = f"{r['price']:,} dollars"
        cond = "brand new" if r["condition"] == "New" else r["condition"].lower()
        line = (
            f"A {r['year']} {r['model']} {r['trim']}, {cond}, "
            f"{r['powertrain']} {r['drivetrain']}, in {r['exterior_color']}, "
            f"for {price}."
        )
        if r.get("range_miles"):
            line = line[:-1] + f", with about {r['range_miles']} miles of range."
        sentences.append(line)
    return " ".join(sentences)


def insert_test_drive(
    vehicle_id: int,
    customer_name: str,
    scheduled_for: str,
) -> str:
    """
    Record a test-drive request and return a friendly confirmation id.
    `scheduled_for` is an ISO 8601 string, e.g. '2026-06-20T15:00:00'.
    """
    sb = get_supabase()
    sb.table("test_drives").insert(
        {
            "vehicle_id": vehicle_id,
            "customer_name": customer_name,
            "scheduled_for": scheduled_for,
            "status": "requested",
        }
    ).execute()

    # A short, human-speakable confirmation code for the caller to remember.
    return f"ALC-{random.randint(1000, 9999)}"