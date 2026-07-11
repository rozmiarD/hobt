import type { CharacterCard, EquipmentSlot } from "@hobt/lego-skirmish/types/domain.js";
import {
  abilityIcon,
  EQUIPMENT_ICONS,
  renderIcon,
  STAT_ICONS,
} from "./icons.js";
import { t, type Locale } from "./i18n.js";

const STAT_ORDER = ["hp", "mp", "ac", "ms", "rs", "ls", "ks"] as const;
const PORTRAIT_STATS = ["hp", "mp", "ac"] as const;
const BANNER_STATS = ["ms", "rs", "ls", "ks"] as const;
const CARD_ICON_SCALE = 1.5;

function statLabel(locale: Locale, key: (typeof STAT_ORDER)[number]): string {
  const map = {
    hp: "statHP",
    mp: "statMP",
    ac: "statAC",
    ms: "statMS",
    rs: "statRS",
    ls: "statLS",
    ks: "statKS",
  } as const;
  return t(locale, map[key]);
}

const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  "mainWeapon",
  "offhand",
  "armor",
  "item1",
  "item2",
];

const EQUIPMENT_LABEL: Record<EquipmentSlot, "slotMainWeapon" | "slotOffhand" | "slotArmor" | "slotItem1" | "slotItem2"> = {
  mainWeapon: "slotMainWeapon",
  offhand: "slotOffhand",
  armor: "slotArmor",
  item1: "slotItem1",
  item2: "slotItem2",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fitTextClass(text: string, thresholds: [number, string][]): string {
  for (const [length, className] of thresholds) {
    if (text.length > length) {
      return className;
    }
  }
  return "";
}

export interface CardViewOptions {
  variant: "full" | "stash";
  characterId?: string;
  selected?: boolean;
  draft?: boolean;
  interactive?: boolean;
}

export function renderCharacterCard(
  locale: Locale,
  card: CharacterCard,
  options: CardViewOptions,
): string {
  if (options.variant === "stash") {
    return renderStashCard(locale, card, options);
  }
  return renderFullCard(locale, card, options);
}

function renderFactionLine(card: CharacterCard): string {
  if (card.faction && card.team) {
    return `${escapeHtml(card.faction)} — ${escapeHtml(card.team)}`;
  }
  if (card.faction) {
    return escapeHtml(card.faction);
  }
  if (card.team) {
    return escapeHtml(card.team);
  }
  return "";
}

function renderPortrait(card: CharacterCard): string {
  if (card.portrait?.url) {
    return `<img class="card-portrait-image" src="${escapeHtml(card.portrait.url)}" alt="" />`;
  }
  return `<div class="card-portrait-placeholder">LEGO</div>`;
}

function renderStatCell(
  locale: Locale,
  card: CharacterCard,
  key: (typeof STAT_ORDER)[number],
  variant: "portrait" | "banner",
): string {
  const value = card.stats[key];
  const label = statLabel(locale, key);
  const iconSize = (variant === "portrait" ? 16 : 14) * CARD_ICON_SCALE;
  const cellClass =
    variant === "portrait" ? "card-portrait-stat-cell" : "card-stat-cell";

  return `
      <div class="${cellClass} stat-${key}">
        <span class="card-stat-key">${key.toUpperCase()}</span>
        <span class="card-stat-icon">${renderIcon(STAT_ICONS[key]!, variant === "portrait" ? "card-portrait-stat-svg" : "card-stat-svg", iconSize)}</span>
        <strong class="card-stat-value">${value}</strong>
        <span class="card-stat-name">${escapeHtml(label)}</span>
      </div>`;
}

function renderPortraitStats(locale: Locale, card: CharacterCard): string {
  return PORTRAIT_STATS.map((key) =>
    renderStatCell(locale, card, key, "portrait"),
  ).join("");
}

function renderBannerStats(locale: Locale, card: CharacterCard): string {
  return BANNER_STATS.map((key) =>
    renderStatCell(locale, card, key, "banner"),
  ).join("");
}

function renderEquipment(locale: Locale, card: CharacterCard): string {
  return EQUIPMENT_SLOTS.map((slot) => {
    const entry = card.equipment[slot];
    const slotLabel = t(locale, EQUIPMENT_LABEL[slot]);
    const itemName = entry?.name ?? t(locale, "none");
    return `
      <div class="card-equipment-row">
        <span class="card-eq-icon eq-${slot}">${renderIcon(EQUIPMENT_ICONS[slot], "card-eq-svg", 11 * CARD_ICON_SCALE)}</span>
        <span class="card-eq-slot">${escapeHtml(slotLabel)}</span>
        <span class="card-eq-sep">—</span>
        <span class="card-eq-item">${escapeHtml(itemName)}</span>
      </div>`;
  }).join("");
}

function renderAbilities(card: CharacterCard): string {
  const rows = Array.from({ length: 5 }, (_, index) => {
    const ability = card.abilities[index];
    if (!ability) {
      return `<div class="card-ability-row is-empty"><span class="card-ability-dash">—</span></div>`;
    }
    const typeClass = ability.type ? ` type-${ability.type}` : "";
    const descClass = fitTextClass(ability.description, [
      [48, "text-compact"],
      [72, "text-tiny"],
    ]);
    return `
      <div class="card-ability-row${typeClass}">
        <span class="card-ability-icon">${renderIcon(abilityIcon(ability.type), "card-ability-svg", 10 * CARD_ICON_SCALE)}</span>
        <p class="card-ability-text ${descClass}">
          <strong>${escapeHtml(ability.name)}</strong>
          <span> — ${escapeHtml(ability.description)}</span>
        </p>
      </div>`;
  });
  return rows.join("");
}

function renderFullCard(
  locale: Locale,
  card: CharacterCard,
  options: CardViewOptions,
): string {
  const nameClass = fitTextClass(card.name, [
    [24, "name-compact"],
    [32, "name-tiny"],
  ]);
  const subtitle = card.subtitle?.trim();
  const factionLine = renderFactionLine(card);
  const draftClass = options.draft ? " is-draft" : "";

  return `
    <article class="character-card theme-${escapeHtml(card.template.id)} state-${card.validationState}${draftClass}" data-aspect="7x12">
      <header class="card-zone card-zone-header">
        <div class="card-header-main">
          <h3 class="card-name ${nameClass}">${escapeHtml(card.name)}</h3>
          ${subtitle ? `<p class="card-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          ${factionLine ? `<p class="card-faction-line">${factionLine}</p>` : ""}
        </div>
        <div class="card-points-badge">
          <span class="card-points-value">${card.points}</span>
          <span class="card-points-label">${t(locale, "points")}</span>
        </div>
      </header>

      <section class="card-zone card-zone-portrait" aria-label="Portrait">
        <div class="card-portrait-layout">
          <div class="card-portrait-wrap">
            ${renderPortrait(card)}
            <div class="card-portrait-gradient"></div>
          </div>
          <div class="card-portrait-stats" aria-label="Core stats">
            ${renderPortraitStats(locale, card)}
          </div>
        </div>
      </section>

      <section class="card-zone card-zone-stats" aria-label="Stats">
        <div class="card-stats-grid">${renderBannerStats(locale, card)}</div>
      </section>

      <section class="card-zone card-zone-equipment" aria-label="Equipment">
        <h4 class="card-section-title">${t(locale, "equipmentSection")}</h4>
        <div class="card-equipment-list">${renderEquipment(locale, card)}</div>
      </section>

      <section class="card-zone card-zone-abilities" aria-label="Abilities">
        <h4 class="card-section-title">${t(locale, "abilitiesSection")}</h4>
        <div class="card-abilities-list">${renderAbilities(card)}</div>
      </section>

      <footer class="card-zone card-zone-footer">
        <span>LEGO Skirmish ${escapeHtml(card.metadata?.version ?? "")}</span>
        <span>${escapeHtml(card.metadata?.characterId ?? card.id)}</span>
      </footer>
    </article>`;
}

function renderStashCard(
  locale: Locale,
  card: CharacterCard,
  options: CardViewOptions,
): string {
  const tag = options.interactive ? "button" : "div";
  const attrs = [
    `class="stash-card state-${card.validationState}${options.selected ? " is-selected" : ""}${options.draft ? " is-draft" : ""} theme-${escapeHtml(card.template.id)}"`,
    options.interactive && options.characterId
      ? `type="button" data-action="select-character" data-character="${escapeHtml(options.characterId)}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const portrait = card.portrait?.url
    ? `<img src="${escapeHtml(card.portrait.url)}" alt="" />`
    : `<span>LEGO</span>`;

  const stashStats = [
    ["hp", card.stats.hp],
    ["mp", card.stats.mp],
    ["ac", card.stats.ac],
    ["ms", card.stats.ms],
  ] as const;

  const statsMarkup = stashStats
    .map(
      ([key, value]) => `
      <span class="stash-stat-pill stat-${key}">
        ${renderIcon(STAT_ICONS[key]!, "stash-stat-svg", 10)}
        <span>${value}</span>
      </span>`,
    )
    .join("");

  return `
    <${tag} ${attrs}>
      <div class="stash-card-frame">
        <div class="stash-card-top">
          <strong class="stash-card-name">${escapeHtml(card.name)}</strong>
          <span class="stash-card-points">${card.points}</span>
        </div>
        <div class="stash-card-portrait">${portrait}</div>
        <div class="stash-card-stats">${statsMarkup}</div>
      </div>
    </${tag}>`;
}

export function renderEmptyStashSlot(locale: Locale): string {
  return `
    <div class="stash-card stash-card-empty" aria-hidden="true">
      <div class="stash-card-frame">
        <span class="stash-empty-label">${escapeHtml(t(locale, "emptyStashSlot"))}</span>
      </div>
    </div>`;
}

// Keep alias for older imports during transition.
export const renderTarotCard = renderCharacterCard;
