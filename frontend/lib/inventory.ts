// lib/inventory.ts
// Hardcoded Alchemy Auto catalogue — mirrors backend/src/db/seed_inventory.py so the
// "browse it yourself" page shows exactly what Magnus (the voice agent) can see.

export type BodyType = "Sedan" | "Coupe" | "Pickup" | "SUV";
export type Powertrain = "EV" | "Hybrid" | "Petrol";
export type Condition = "New" | "Certified Pre-Owned" | "Used";
export type Status = "available" | "reserved" | "sold";

export type Vehicle = {
  model: string;
  trim: string;
  year: number;
  body: BodyType;
  powertrain: Powertrain;
  price: number;
  mileage: number;
  condition: Condition;
  exterior: string;
  interior: string;
  rangeMiles: number | null;
  hp: number;
  drivetrain: "AWD" | "RWD" | "FWD";
  status: Status;
  location: string;
};

export const VEHICLES: Vehicle[] = [
  // Aurelius — EV luxury sedan
  v("Aurelius", "Base", 2026, "Sedan", "EV", 78900, 0, "New", "Quicksilver", "Obsidian", 412, 480, "AWD", "available", "Flagship Showroom"),
  v("Aurelius", "Base", 2025, "Sedan", "EV", 71500, 9200, "Certified Pre-Owned", "Midnight Blue", "Ivory", 405, 480, "AWD", "available", "Flagship Showroom"),
  v("Aurelius", "Long Range", 2026, "Sedan", "EV", 89400, 0, "New", "Pearl White", "Obsidian", 486, 510, "AWD", "available", "Flagship Showroom"),
  v("Aurelius", "Long Range", 2024, "Sedan", "EV", 68900, 21400, "Used", "Graphite", "Saddle Tan", 470, 510, "AWD", "available", "North Lot"),
  v("Aurelius", "Performance", 2026, "Sedan", "EV", 104900, 0, "New", "Crimson", "Obsidian", 440, 620, "AWD", "reserved", "Flagship Showroom"),
  v("Aurelius", "Performance", 2025, "Sedan", "EV", 97200, 6100, "Certified Pre-Owned", "Quicksilver", "Carbon", 438, 620, "AWD", "available", "Flagship Showroom"),
  v("Aurelius", "Long Range", 2023, "Sedan", "EV", 59900, 38700, "Used", "Midnight Blue", "Ivory", 455, 500, "RWD", "sold", "North Lot"),

  // Mercurial GT — petrol/hybrid sports coupe
  v("Mercurial GT", "Sport", 2026, "Coupe", "Petrol", 64900, 0, "New", "Mercury Silver", "Black", null, 495, "RWD", "available", "Flagship Showroom"),
  v("Mercurial GT", "Sport", 2025, "Coupe", "Petrol", 58400, 11200, "Certified Pre-Owned", "Racing Green", "Tan", null, 495, "RWD", "available", "South Lot"),
  v("Mercurial GT", "Hybrid", 2026, "Coupe", "Hybrid", 72500, 0, "New", "Solar Orange", "Black", 28, 540, "RWD", "available", "Flagship Showroom"),
  v("Mercurial GT", "Hybrid", 2025, "Coupe", "Hybrid", 66900, 8800, "Certified Pre-Owned", "Pearl White", "Red", 29, 540, "RWD", "reserved", "South Lot"),
  v("Mercurial GT", "Carbon", 2026, "Coupe", "Petrol", 88900, 0, "New", "Obsidian", "Carbon", null, 600, "RWD", "available", "Flagship Showroom"),
  v("Mercurial GT", "Sport", 2024, "Coupe", "Petrol", 49900, 24600, "Used", "Mercury Silver", "Black", null, 470, "RWD", "available", "South Lot"),
  v("Mercurial GT", "Hybrid", 2023, "Coupe", "Hybrid", 44900, 41200, "Used", "Racing Green", "Tan", 27, 520, "RWD", "sold", "South Lot"),

  // Vulcan — electric pickup
  v("Vulcan", "Work", 2026, "Pickup", "EV", 62900, 0, "New", "Anvil Gray", "Slate", 300, 600, "AWD", "available", "Truck Yard"),
  v("Vulcan", "Trail", 2026, "Pickup", "EV", 74900, 0, "New", "Forest Green", "Slate", 330, 760, "AWD", "available", "Truck Yard"),
  v("Vulcan", "Trail", 2025, "Pickup", "EV", 68200, 13400, "Certified Pre-Owned", "Anvil Gray", "Black", 325, 760, "AWD", "available", "Truck Yard"),
  v("Vulcan", "Forge", 2026, "Pickup", "EV", 89900, 0, "New", "Molten Copper", "Black", 310, 1000, "AWD", "reserved", "Truck Yard"),
  v("Vulcan", "Work", 2024, "Pickup", "EV", 52900, 29800, "Used", "Quicksilver", "Slate", 290, 580, "AWD", "available", "North Lot"),
  v("Vulcan", "Trail", 2025, "Pickup", "EV", 70100, 7600, "Certified Pre-Owned", "Forest Green", "Slate", 328, 760, "AWD", "sold", "Truck Yard"),

  // Nimbus — three-row hybrid SUV
  v("Nimbus", "Select", 2026, "SUV", "Hybrid", 54900, 0, "New", "Cloud White", "Gray", 33, 340, "AWD", "available", "Family Showroom"),
  v("Nimbus", "Select", 2025, "SUV", "Hybrid", 49500, 14900, "Certified Pre-Owned", "Storm Gray", "Black", 32, 340, "AWD", "available", "Family Showroom"),
  v("Nimbus", "Voyage", 2026, "SUV", "Hybrid", 63900, 0, "New", "Midnight Blue", "Saddle Tan", 35, 370, "AWD", "available", "Family Showroom"),
  v("Nimbus", "Voyage", 2024, "SUV", "Hybrid", 46900, 27300, "Used", "Cloud White", "Gray", 31, 360, "FWD", "available", "North Lot"),
  v("Nimbus", "Summit", 2026, "SUV", "Hybrid", 71900, 0, "New", "Obsidian", "Ivory", 36, 385, "AWD", "reserved", "Family Showroom"),
  v("Nimbus", "Select", 2023, "SUV", "Hybrid", 39900, 45100, "Used", "Storm Gray", "Black", 30, 330, "FWD", "sold", "North Lot"),
  v("Nimbus", "Voyage", 2025, "SUV", "Hybrid", 58200, 10100, "Certified Pre-Owned", "Midnight Blue", "Saddle Tan", 34, 370, "AWD", "available", "Family Showroom"),

  // Philosopher — flagship limited EV
  v("Philosopher", "Stone", 2026, "Sedan", "EV", 189000, 0, "New", "Aurum Gold", "Obsidian", 500, 1020, "AWD", "available", "Flagship Showroom"),
  v("Philosopher", "Stone", 2026, "Sedan", "EV", 189000, 0, "New", "Quicksilver", "Ivory", 500, 1020, "AWD", "reserved", "Flagship Showroom"),
  v("Philosopher", "Elixir", 2025, "Sedan", "EV", 172500, 3400, "Certified Pre-Owned", "Obsidian", "Carbon", 495, 1020, "AWD", "available", "Flagship Showroom"),
  v("Philosopher", "Stone", 2025, "Sedan", "EV", 168000, 5900, "Used", "Aurum Gold", "Obsidian", 490, 1000, "AWD", "sold", "Flagship Showroom"),
];

function v(
  model: string, trim: string, year: number, body: BodyType, powertrain: Powertrain,
  price: number, mileage: number, condition: Condition, exterior: string, interior: string,
  rangeMiles: number | null, hp: number, drivetrain: "AWD" | "RWD" | "FWD", status: Status, location: string,
): Vehicle {
  return { model, trim, year, body, powertrain, price, mileage, condition, exterior, interior, rangeMiles, hp, drivetrain, status, location };
}

// ── Model-level metadata (taglines + halo facts from the Codex) ──────────────
export type ModelInfo = {
  name: string;
  kind: string;        // "EV Luxury Sedan"
  body: BodyType;
  tagline: string;
  halo: string;        // a single headline fact
};

export const MODELS: ModelInfo[] = [
  { name: "Aurelius", kind: "EV Luxury Sedan", body: "Sedan", tagline: "The luminous grand tourer.", halo: "Up to 486 miles of range" },
  { name: "Mercurial GT", kind: "Sports Coupe · Petrol / Hybrid", body: "Coupe", tagline: "Quicksilver, given form.", halo: "0–60 in 2.9s · 600 hp" },
  { name: "Vulcan", kind: "Electric Pickup", body: "Pickup", tagline: "Forged for any load.", halo: "Tows up to 13,500 lb" },
  { name: "Nimbus", kind: "Three-Row Hybrid SUV", body: "SUV", tagline: "The family, aloft.", halo: "Seats 8 · 5-star safety" },
  { name: "Philosopher", kind: "Flagship Halo EV", body: "Sedan", tagline: "The magnum opus.", halo: "1,020 hp · limited to 109" },
];

// ── Derived helpers (kept in sync with the data, no hardcoded drift) ─────────
export const ORDER = ["Aurelius", "Mercurial GT", "Vulcan", "Nimbus", "Philosopher"];

export function modelStats(model: string) {
  const rows = VEHICLES.filter((x) => x.model === model);
  const available = rows.filter((x) => x.status === "available");
  const fromPrice = Math.min(...(available.length ? available : rows).map((x) => x.price));
  const maxHp = Math.max(...rows.map((x) => x.hp));
  const ranges = rows.map((x) => x.rangeMiles).filter((r): r is number => r != null);
  const maxRange = ranges.length ? Math.max(...ranges) : null;
  const trims = Array.from(new Set(rows.map((x) => x.trim)));
  return { fromPrice, maxHp, maxRange, trims, count: rows.length, availableCount: available.length };
}

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
