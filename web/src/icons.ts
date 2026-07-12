import type { EquipmentSlot, PurchasableStat } from "@hobt/lego-skirmish/types/domain.js";

export type IconId =
  | "heart"
  | "shoe-prints"
  | "hand-fist"
  | "crosshairs"
  | "flag"
  | "brain"
  | "shield"
  | "khanda"
  | "vest"
  | "box-open"
  | "check"
  | "warn"
  | "user"
  | "users"
  | "sparkle"
  | "list";

const ICON_CLASS: Record<IconId, string> = {
  heart: "fa-heart",
  "shoe-prints": "fa-shoe-prints",
  "hand-fist": "fa-hand-fist",
  crosshairs: "fa-crosshairs",
  flag: "fa-flag",
  brain: "fa-brain",
  shield: "fa-shield-halved",
  khanda: "fa-khanda",
  vest: "fa-vest",
  "box-open": "fa-box-open",
  check: "fa-circle-check",
  warn: "fa-triangle-exclamation",
  user: "fa-user",
  users: "fa-users",
  sparkle: "fa-wand-magic-sparkles",
  list: "fa-list",
};

export function icon(id: IconId, className = ""): string {
  const classes = ["fa-solid", ICON_CLASS[id], className].filter(Boolean).join(" ");
  return `<i class="${classes}" aria-hidden="true"></i>`;
}

export const STAT_ICONS: Record<PurchasableStat, IconId> = {
  MS: "hand-fist",
  RS: "crosshairs",
  LS: "flag",
  KS: "brain",
  HP: "heart",
  MP: "shoe-prints",
};

export const EQUIPMENT_ICONS: Record<EquipmentSlot, IconId> = {
  mainWeapon: "khanda",
  offhand: "shield",
  armor: "vest",
  item1: "box-open",
  item2: "box-open",
};

export const BANNER_STAT_ICONS: Record<"ms" | "rs" | "ls" | "ks", IconId> = {
  ms: "hand-fist",
  rs: "crosshairs",
  ls: "flag",
  ks: "brain",
};
