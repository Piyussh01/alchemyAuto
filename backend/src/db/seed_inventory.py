"""
Seed the synthetic Alchemy Auto inventory into Supabase.

Run from the backend dir:  python src/db/seed_inventory.py
Idempotent: clears the vehicles table, then re-inserts the fixed line-up.
Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
"""
from __future__ import annotations

from src.db.supabase_client import get_supabase


# A plausible-looking 17-char VIN. Not checksum-valid — synthetic data only.
def _vin(model: str, n: int) -> str:
    prefix = {
        "Aurelius": "AUR", "Mercurial GT": "MGT", "Vulcan": "VLC",
        "Nimbus": "NMB", "Philosopher": "PHL",
    }[model]
    # 17 chars: 3-char model prefix + "ALC" + 11-char zero-padded serial.
    return f"{prefix}ALC{n:011d}"


# (model, trim, year, body, powertrain, price, mileage, condition,
#  ext_color, int_color, range_miles, hp, drivetrain, status, location)
VEHICLES = [
    # --- Aurelius: EV luxury sedan ---
    ("Aurelius", "Base",        2026, "Sedan", "EV", 78900,     0, "New",                 "Quicksilver",   "Obsidian",   412, 480, "AWD", "available", "Flagship Showroom"),
    ("Aurelius", "Base",        2025, "Sedan", "EV", 71500,  9200, "Certified Pre-Owned", "Midnight Blue", "Ivory",      405, 480, "AWD", "available", "Flagship Showroom"),
    ("Aurelius", "Long Range",  2026, "Sedan", "EV", 89400,     0, "New",                 "Pearl White",   "Obsidian",   486, 510, "AWD", "available", "Flagship Showroom"),
    ("Aurelius", "Long Range",  2024, "Sedan", "EV", 68900, 21400, "Used",                "Graphite",      "Saddle Tan", 470, 510, "AWD", "available", "North Lot"),
    ("Aurelius", "Performance", 2026, "Sedan", "EV", 104900,    0, "New",                 "Crimson",       "Obsidian",   440, 620, "AWD", "reserved",  "Flagship Showroom"),
    ("Aurelius", "Performance", 2025, "Sedan", "EV", 97200,  6100, "Certified Pre-Owned", "Quicksilver",   "Carbon",     438, 620, "AWD", "available", "Flagship Showroom"),
    ("Aurelius", "Long Range",  2023, "Sedan", "EV", 59900, 38700, "Used",                "Midnight Blue", "Ivory",      455, 500, "RWD", "sold",      "North Lot"),

    # --- Mercurial GT: petrol/hybrid sports coupe ---
    ("Mercurial GT", "Sport",  2026, "Coupe", "Petrol", 64900,     0, "New",                 "Mercury Silver", "Black", None, 495, "RWD", "available", "Flagship Showroom"),
    ("Mercurial GT", "Sport",  2025, "Coupe", "Petrol", 58400, 11200, "Certified Pre-Owned", "Racing Green",   "Tan",   None, 495, "RWD", "available", "South Lot"),
    ("Mercurial GT", "Hybrid", 2026, "Coupe", "Hybrid", 72500,     0, "New",                 "Solar Orange",   "Black", 28,   540, "RWD", "available", "Flagship Showroom"),
    ("Mercurial GT", "Hybrid", 2025, "Coupe", "Hybrid", 66900,  8800, "Certified Pre-Owned", "Pearl White",    "Red",   29,   540, "RWD", "reserved",  "South Lot"),
    ("Mercurial GT", "Carbon", 2026, "Coupe", "Petrol", 88900,     0, "New",                 "Obsidian",       "Carbon",None, 600, "RWD", "available", "Flagship Showroom"),
    ("Mercurial GT", "Sport",  2024, "Coupe", "Petrol", 49900, 24600, "Used",                "Mercury Silver", "Black", None, 470, "RWD", "available", "South Lot"),
    ("Mercurial GT", "Hybrid", 2023, "Coupe", "Hybrid", 44900, 41200, "Used",                "Racing Green",   "Tan",   27,   520, "RWD", "sold",      "South Lot"),

    # --- Vulcan: electric pickup ---
    ("Vulcan", "Work",  2026, "Pickup", "EV", 62900,     0, "New",                 "Anvil Gray",    "Slate", 300, 600,  "AWD", "available", "Truck Yard"),
    ("Vulcan", "Trail", 2026, "Pickup", "EV", 74900,     0, "New",                 "Forest Green",  "Slate", 330, 760,  "AWD", "available", "Truck Yard"),
    ("Vulcan", "Trail", 2025, "Pickup", "EV", 68200, 13400, "Certified Pre-Owned", "Anvil Gray",    "Black", 325, 760,  "AWD", "available", "Truck Yard"),
    ("Vulcan", "Forge", 2026, "Pickup", "EV", 89900,     0, "New",                 "Molten Copper", "Black", 310, 1000, "AWD", "reserved",  "Truck Yard"),
    ("Vulcan", "Work",  2024, "Pickup", "EV", 52900, 29800, "Used",                "Quicksilver",   "Slate", 290, 580,  "AWD", "available", "North Lot"),
    ("Vulcan", "Trail", 2025, "Pickup", "EV", 70100,  7600, "Certified Pre-Owned", "Forest Green",  "Slate", 328, 760,  "AWD", "sold",      "Truck Yard"),

    # --- Nimbus: three-row hybrid SUV ---
    ("Nimbus", "Select", 2026, "SUV", "Hybrid", 54900,     0, "New",                 "Cloud White",   "Gray",       33, 340, "AWD", "available", "Family Showroom"),
    ("Nimbus", "Select", 2025, "SUV", "Hybrid", 49500, 14900, "Certified Pre-Owned", "Storm Gray",    "Black",      32, 340, "AWD", "available", "Family Showroom"),
    ("Nimbus", "Voyage", 2026, "SUV", "Hybrid", 63900,     0, "New",                 "Midnight Blue", "Saddle Tan", 35, 370, "AWD", "available", "Family Showroom"),
    ("Nimbus", "Voyage", 2024, "SUV", "Hybrid", 46900, 27300, "Used",                "Cloud White",   "Gray",       31, 360, "FWD", "available", "North Lot"),
    ("Nimbus", "Summit", 2026, "SUV", "Hybrid", 71900,     0, "New",                 "Obsidian",      "Ivory",      36, 385, "AWD", "reserved",  "Family Showroom"),
    ("Nimbus", "Select", 2023, "SUV", "Hybrid", 39900, 45100, "Used",                "Storm Gray",    "Black",      30, 330, "FWD", "sold",      "North Lot"),
    ("Nimbus", "Voyage", 2025, "SUV", "Hybrid", 58200, 10100, "Certified Pre-Owned", "Midnight Blue", "Saddle Tan", 34, 370, "AWD", "available", "Family Showroom"),

    # --- Philosopher: flagship limited EV ---
    ("Philosopher", "Stone",  2026, "Sedan", "EV", 189000,    0, "New",                 "Aurum Gold",  "Obsidian", 500, 1020, "AWD", "available", "Flagship Showroom"),
    ("Philosopher", "Stone",  2026, "Sedan", "EV", 189000,    0, "New",                 "Quicksilver", "Ivory",    500, 1020, "AWD", "reserved",  "Flagship Showroom"),
    ("Philosopher", "Elixir", 2025, "Sedan", "EV", 172500, 3400, "Certified Pre-Owned", "Obsidian",    "Carbon",   495, 1020, "AWD", "available", "Flagship Showroom"),
    ("Philosopher", "Stone",  2025, "Sedan", "EV", 168000, 5900, "Used",                "Aurum Gold",  "Obsidian", 490, 1000, "AWD", "sold",      "Flagship Showroom"),
]

COLUMNS = (
    "model", "trim", "year", "body_type", "powertrain", "price", "mileage",
    "condition", "exterior_color", "interior_color", "range_miles",
    "horsepower", "drivetrain", "status", "location",
)


def _build_rows() -> list[dict]:
    rows: list[dict] = []
    serials: dict[str, int] = {}
    for v in VEHICLES:
        model = v[0]
        serials[model] = serials.get(model, 0) + 1
        row = dict(zip(COLUMNS, v))
        row["make"] = "Alchemy Auto"
        row["vin"] = _vin(model, serials[model])
        rows.append(row)
    return rows


def seed() -> None:
    sb = get_supabase()
    rows = _build_rows()

    # Idempotent: clear the catalog first. neq('id', 0) matches every row
    # (ids are always > 0) — Supabase requires a filter on delete.
    sb.table("vehicles").delete().neq("id", 0).execute()

    # Insert in one call; Postgres assigns ids and created_at defaults.
    sb.table("vehicles").insert(rows).execute()

    # Per-model summary (read back what we just wrote).
    data = sb.table("vehicles").select("model, status").execute().data
    by_model: dict[str, int] = {}
    for r in data:
        by_model[r["model"]] = by_model.get(r["model"], 0) + 1

    print("Seeded Supabase `vehicles` table")
    for model in sorted(by_model):
        print(f"  {model:<14} {by_model[model]}")
    total = len(data)
    avail = sum(1 for r in data if r["status"] == "available")
    print(f"  {'TOTAL':<14} {total}  ({avail} available)")


if __name__ == "__main__":
    seed()