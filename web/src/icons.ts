import type { AbilityCardType } from "@hobt/lego-skirmish/types/domain.js";

export type IconName =
  | "heart"
  | "footprints"
  | "shield"
  | "swords"
  | "crosshair"
  | "flag"
  | "brain"
  | "sword"
  | "hand"
  | "armor"
  | "pouch"
  | "module"
  | "sparkles"
  | "cross"
  | "triangle-alert"
  | "radius"
  | "circle-dot"
  | "minus";

const ICON_PATHS: Record<IconName, string> = {
  heart:
    '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  footprints:
    '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-4 4-4 2.21 0 4 1.25 4 4 0 2.5-1 3.5-1 5.62V16"/><path d="M12.5 17.5c1.38 0 2.5-1.12 2.5-2.5V13c0-3.5 1.5-5.5 4-5.5 2.5 0 4 2 4 5.5v2c0 1.38-1.12 2.5-2.5 2.5"/><path d="M8 16v-2.38C8 11.5 6.97 10.5 7 8c.03-2.72 1.49-4 4-4"/><path d="M16.5 17.5c1.38 0 2.5-1.12 2.5-2.5V13"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  swords:
    '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="7" x2="4" y1="17" y2="20"/><line x1="3" x2="5" y1="19" y2="21"/>',
  crosshair:
    '<circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/>',
  flag:
    '<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>',
  brain:
    '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>',
  sword:
    '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/>',
  hand:
    '<path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-1.42-1.5A2 2 0 0 1 5 15.5"/>',
  armor:
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  pouch:
    '<path d="M6 3h12l2 7H4l2-7Z"/><path d="M8 10v9"/><path d="M16 10v9"/><path d="M6 19h12"/><path d="M10 6h4"/>',
  module:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h6v6H9z"/><path d="M9 1v2"/><path d="M15 1v2"/><path d="M9 21v2"/><path d="M15 21v2"/><path d="M1 9h2"/><path d="M1 15h2"/><path d="M21 9h2"/><path d="M21 15h2"/>',
  sparkles:
    '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  cross:
    '<path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2Z"/>',
  "triangle-alert":
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  radius:
    '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  "circle-dot":
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
  minus:
    '<path d="M5 12h14"/>',
};

export const STAT_ICONS: Record<string, IconName> = {
  hp: "heart",
  mp: "footprints",
  ac: "shield",
  ms: "swords",
  rs: "crosshair",
  ls: "flag",
  ks: "brain",
};

export const EQUIPMENT_ICONS: Record<string, IconName> = {
  mainWeapon: "sword",
  offhand: "hand",
  armor: "armor",
  item1: "pouch",
  item2: "module",
};

export const ABILITY_ICONS: Record<string, IconName> = {
  main_attack: "swords",
  offhand: "hand",
  defense: "shield",
  movement: "footprints",
  ranged: "crosshair",
  leadership: "flag",
  knowledge: "brain",
  healing: "cross",
  magic: "sparkles",
  trap: "triangle-alert",
  area: "radius",
  negative: "triangle-alert",
  passive: "circle-dot",
};

export function abilityIcon(type?: AbilityCardType): IconName {
  if (!type) {
    return "circle-dot";
  }
  return ABILITY_ICONS[type] ?? "circle-dot";
}

export function renderIcon(
  name: IconName,
  className = "",
  size = 16,
): string {
  const path = ICON_PATHS[name];
  const classes = ["hobt-icon", `hobt-icon--${name}`, className]
    .filter(Boolean)
    .join(" ");
  return `<svg class="${classes}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
