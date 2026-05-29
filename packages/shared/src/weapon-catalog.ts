import { LOADOUT_PROFILE_ID, type LoadoutProfileId } from "./protocol.js";

export type WeaponDefinition = Readonly<{
  profileId: LoadoutProfileId;
  name: string;
  role: string;
  damagePerHit: number;
  fireIntervalTicks: number;
  magazineSize: number;
  reloadTicks: number;
}>;

export const DEFAULT_WEAPON_PROFILE_ID: LoadoutProfileId = LOADOUT_PROFILE_ID.halcyon;

const WEAPON_DEFINITIONS: readonly WeaponDefinition[] = [
  {
    profileId: LOADOUT_PROFILE_ID.ridgeline,
    name: "Ridgeline",
    role: "precision",
    damagePerHit: 60,
    fireIntervalTicks: 36,
    magazineSize: 5,
    reloadTicks: 150
  },
  {
    profileId: LOADOUT_PROFILE_ID.halcyon,
    name: "Halcyon",
    role: "balanced",
    damagePerHit: 28,
    fireIntervalTicks: 9,
    magazineSize: 24,
    reloadTicks: 120
  },
  {
    profileId: LOADOUT_PROFILE_ID.cinder,
    name: "Cinder",
    role: "close",
    damagePerHit: 16,
    fireIntervalTicks: 5,
    magazineSize: 30,
    reloadTicks: 90
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
    reloadTicks: readPositiveUint16(weapon.reloadTicks, "reloadTicks")
  };
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
