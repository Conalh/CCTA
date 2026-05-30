import { LOADOUT_PROFILE_ID, type LoadoutProfileId } from "./protocol.js";

// Buyable armor: a full set absorbs part of incoming damage until it depletes. Balance
// knobs, not copied content.
export const DEFAULT_ARMOR_VALUE = 100 as const;
export const ARMOR_PRICE = 650 as const;

export type WeaponDefinition = Readonly<{
  profileId: LoadoutProfileId;
  name: string;
  role: string;
  damagePerHit: number;
  fireIntervalTicks: number;
  magazineSize: number;
  reloadTicks: number;
  // Buy-menu cost. The starter pistol is free; everything else is purchased with the
  // round economy. Optional in input so existing test weapon definitions stay valid;
  // the validated catalog always carries a number.
  price?: number;
}>;

export const DEFAULT_WEAPON_PROFILE_ID: LoadoutProfileId = LOADOUT_PROFILE_ID.halcyon;

const WEAPON_DEFINITIONS: readonly WeaponDefinition[] = [
  {
    // Sniper: a one-shot-to-the-body bolt rifle. Very high damage, a tiny magazine,
    // and a punishing cadence.
    profileId: LOADOUT_PROFILE_ID.ridgeline,
    name: "Ridgeline",
    role: "sniper",
    damagePerHit: 100,
    fireIntervalTicks: 50,
    magazineSize: 5,
    reloadTicks: 180,
    price: 4750
  },
  {
    // Starter sidearm: a hard-hitting six-shot revolver. Low capacity and a slow,
    // deliberate cadence trade against high per-hit damage.
    profileId: LOADOUT_PROFILE_ID.halcyon,
    name: "Halcyon",
    role: "revolver",
    damagePerHit: 50,
    fireIntervalTicks: 20,
    magazineSize: 6,
    reloadTicks: 165,
    price: 0
  },
  {
    // SMG: fast, low per-hit damage, a deep magazine. Run-and-gun close pressure.
    profileId: LOADOUT_PROFILE_ID.cinder,
    name: "Cinder",
    role: "smg",
    damagePerHit: 20,
    fireIntervalTicks: 5,
    magazineSize: 25,
    reloadTicks: 120,
    price: 1050
  },
  {
    // Shotgun: a brutal close-range hit, slow pump, small magazine. (Pellet spread
    // and range falloff land with the hitscan-range milestone; for now it is a
    // single high-damage ray.)
    profileId: LOADOUT_PROFILE_ID.maul,
    name: "Maul",
    role: "shotgun",
    damagePerHit: 85,
    fireIntervalTicks: 40,
    magazineSize: 8,
    reloadTicks: 180,
    price: 1800
  },
  {
    // Rifle: the versatile mainstay. Medium damage, medium cadence, a full magazine.
    profileId: LOADOUT_PROFILE_ID.vantage,
    name: "Vantage",
    role: "rifle",
    damagePerHit: 30,
    fireIntervalTicks: 8,
    magazineSize: 30,
    reloadTicks: 135,
    price: 2700
  }
].map(validateWeaponDefinition);

const WEAPON_BY_PROFILE_ID = new Map<LoadoutProfileId, WeaponDefinition>(
  WEAPON_DEFINITIONS.map((weapon) => [weapon.profileId, weapon])
);

export const WEAPON_CATALOG: readonly WeaponDefinition[] = WEAPON_DEFINITIONS;

export function getWeaponDefinition(profileId: number): WeaponDefinition | undefined {
  return WEAPON_BY_PROFILE_ID.get(profileId as LoadoutProfileId);
}

export function isKnownWeaponProfileId(value: number): value is LoadoutProfileId {
  return WEAPON_BY_PROFILE_ID.has(value as LoadoutProfileId);
}

export function listWeaponProfileIds(): readonly LoadoutProfileId[] {
  return WEAPON_DEFINITIONS.map((weapon) => weapon.profileId);
}

function validateWeaponDefinition(weapon: WeaponDefinition): WeaponDefinition {
  const knownProfileIds = Object.values(LOADOUT_PROFILE_ID) as number[];
  if (!knownProfileIds.includes(weapon.profileId)) {
    throw new Error(`weapon profile id must be a known loadout profile, got ${weapon.profileId}.`);
  }
  return {
    profileId: weapon.profileId,
    name: readNonEmpty(weapon.name, "name"),
    role: readNonEmpty(weapon.role, "role"),
    damagePerHit: readPositiveUint16(weapon.damagePerHit, "damagePerHit"),
    fireIntervalTicks: readPositiveUint16(weapon.fireIntervalTicks, "fireIntervalTicks"),
    magazineSize: readPositiveUint16(weapon.magazineSize, "magazineSize"),
    reloadTicks: readPositiveUint16(weapon.reloadTicks, "reloadTicks"),
    price: readNonNegativeUint16(weapon.price ?? 0, "price")
  };
}

function readNonNegativeUint16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new Error(`weapon ${field} must be a non-negative unsigned 16-bit integer, got ${value}.`);
  }
  return value;
}

function readNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`weapon ${field} must be a non-empty string.`);
  }
  return value;
}

function readPositiveUint16(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 0xffff) {
    throw new Error(`weapon ${field} must be a positive unsigned 16-bit integer, got ${value}.`);
  }
  return value;
}
