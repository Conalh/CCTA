// Pure view model for the buy menu ("gun menu"). DOM-free and testable: it turns the
// server-owned weapon catalog plus the player's mirrored money and current weapon into
// rows flagged affordable/owned. The client owns no truth here — it only presents what
// the server reports and sends a buy intent the server validates.

import { WEAPON_CATALOG, type LoadoutProfileId, type WeaponDefinition } from "@breachline/shared";

export type BuyMenuRow = Readonly<{
  profileId: LoadoutProfileId;
  name: string;
  role: string;
  price: number;
  affordable: boolean;
  owned: boolean;
}>;

export type BuyMenuView = Readonly<{
  money: number | undefined;
  rows: readonly BuyMenuRow[];
}>;

export type BuyMenuInput = Readonly<{
  money?: number;
  currentWeaponProfileId?: number;
  weapons?: readonly WeaponDefinition[];
}>;

export function createBuyMenuView(input: BuyMenuInput): BuyMenuView {
  const weapons = Array.isArray(input.weapons) ? input.weapons : WEAPON_CATALOG;
  const money = typeof input.money === "number" && Number.isFinite(input.money) && input.money >= 0 ? input.money : undefined;

  const rows = weapons.map((weapon): BuyMenuRow => {
    const price = typeof weapon.price === "number" ? weapon.price : 0;
    const owned = weapon.profileId === input.currentWeaponProfileId;
    // The free starter and the weapon you already hold are not re-buyable; everything
    // else needs enough money.
    const affordable = !owned && price > 0 && money !== undefined && money >= price;
    return { profileId: weapon.profileId, name: weapon.name, role: weapon.role, price, affordable, owned };
  });

  return { money, rows };
}

export function formatBuyMenuPrice(price: number): string {
  return price > 0 ? `$${Math.trunc(price)}` : "Free";
}
