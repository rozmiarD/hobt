import type { CharacterCard, EquipmentSlot } from "@hobt/lego-skirmish/types/domain.js";
import { t, type Locale } from "./i18n.js";
import { sprite, type SpriteId } from "./sprites.js";

const PORTRAIT_STATS = ["hp", "mp", "ac"] as const;
const BANNER_STATS = ["ms", "rs", "ls", "ks"] as const;

const STAT_SPRITES: Record<string, SpriteId> = {
  hp: "i-heart",
  mp: "i-boot",
  ac: "i-shield",
  ms: "i-sword",
  rs: "i-target",
  ls: "i-flag",
  ks: "i-brain",
};

const EQUIPMENT_SPRITES: Record<EquipmentSlot, SpriteId> = {
  mainWeapon: "i-sword",
  offhand: "i-shield",
  armor: "i-shield",
  item1: "i-star-list",
  item2: "i-star-list",
};

const SLOT_SHORT: Record<EquipmentSlot, "slotShortMain" | "slotShortOff" | "slotShortArmor" | "slotShortItem1" | "slotShortItem2"> = {
  mainWeapon: "slotShortMain",
  offhand: "slotShortOff",
  armor: "slotShortArmor",
  item1: "slotShortItem1",
  item2: "slotShortItem2",
};

const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  "mainWeapon",
  "offhand",
  "armor",
  "item1",
  "item2",
];

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
    return renderStashTile(locale, card, options);
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

function renderPortrait(card: CharacterCard, locale: Locale): string {
  if (card.portrait?.url) {
    return `<img class="card-portrait-image" src="${escapeHtml(card.portrait.url)}" alt="" />`;
  }
  return `<div class="card-portrait-placeholder">${escapeHtml(t(locale, "portraitPlaceholder"))}</div>`;
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

  const portraitStats = PORTRAIT_STATS.map((key) => {
    const value = card.stats[key];
    return `
        <div class="cps-cell stat-${key}">
          ${sprite(STAT_SPRITES[key]!)}
          <span class="cps-key">${key.toUpperCase()}</span>
          <span class="cps-value">${value}</span>
        </div>`;
  }).join("");

  const bannerStats = BANNER_STATS.map((key) => {
    const value = card.stats[key];
    return `
        <div class="card-stat-cell stat-${key}">
          <span class="card-stat-key">${key.toUpperCase()}</span>
          <span class="card-stat-icon">${sprite(STAT_SPRITES[key]!)}</span>
          <span class="card-stat-value">${value}</span>
        </div>`;
  }).join("");

  const equipment = EQUIPMENT_SLOTS.map((slot) => {
    const entry = card.equipment[slot];
    const itemName = entry?.name ?? t(locale, "none");
    return `
        <div class="card-eq-row">
          ${sprite(EQUIPMENT_SPRITES[slot])}
          <span class="card-eq-slot">${escapeHtml(t(locale, SLOT_SHORT[slot]))}</span>
          <span>—</span>
          <span class="card-eq-item">${escapeHtml(itemName)}</span>
        </div>`;
  }).join("");

  const abilities = card.abilities
    .filter(Boolean)
    .map((ability) => {
      const negative = ability.type === "negative" ? " negative" : "";
      const icon = ability.type === "negative" ? "i-warn" : "i-sparkle";
      return `
        <div class="card-ability-row${negative}">
          ${sprite(icon)}
          <p><strong>${escapeHtml(ability.name)}</strong> — ${escapeHtml(ability.description)}</p>
        </div>`;
    })
    .join("");

  return `
    <article class="character-card theme-${escapeHtml(card.template.id)} state-${card.validationState}${draftClass}" id="preview-card">
      <div class="card-zone card-zone-header">
        <div class="card-header-main">
          <h3 class="card-name ${nameClass}">${escapeHtml(card.name)}</h3>
          ${subtitle ? `<p class="card-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          ${factionLine ? `<p class="card-faction">${factionLine}</p>` : ""}
        </div>
        <div class="card-points-badge">
          <span class="card-points-value">${card.points}</span>
          <span class="card-points-label">${t(locale, "pointsShort")}</span>
        </div>
      </div>

      <div class="card-zone card-zone-portrait">
        <div class="card-portrait-layout">
          <div class="card-portrait-wrap">
            ${renderPortrait(card, locale)}
            <div class="card-portrait-gradient"></div>
          </div>
          <div class="card-portrait-stats">${portraitStats}</div>
        </div>
      </div>

      <div class="card-zone card-zone-stats">
        <div class="card-stats-grid">${bannerStats}</div>
      </div>

      <div class="card-zone card-zone-equipment">
        <h4 class="card-section-title">${t(locale, "equipmentSection")}</h4>
        <div class="card-list">${equipment}</div>
      </div>

      <div class="card-zone card-zone-abilities">
        <h4 class="card-section-title">${t(locale, "abilitiesSection")}</h4>
        <div class="card-list">${abilities || `<div class="card-ability-row"><p>—</p></div>`}</div>
      </div>

      <div class="card-zone card-zone-footer card-footer">
        <span>LEGO Skirmish ${escapeHtml(card.metadata?.version ?? "")}</span>
        <span>${escapeHtml(card.metadata?.characterId ?? card.id)}</span>
      </div>
    </article>`;
}

function renderStashTile(
  locale: Locale,
  card: CharacterCard,
  options: CardViewOptions,
): string {
  const tag = options.interactive ? "button" : "div";
  const attrs = [
    `class="stash-tile${options.selected ? " is-selected" : ""}${options.draft ? " is-draft" : ""}"`,
    options.interactive && options.characterId
      ? `type="button" data-action="select-character" data-character="${escapeHtml(options.characterId)}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const portrait = card.portrait?.url
    ? `<img src="${escapeHtml(card.portrait.url)}" alt="" />`
    : escapeHtml(t(locale, "portraitPlaceholder"));

  const shortName =
    card.name.length > 14 ? `${card.name.slice(0, 12)}…` : card.name;

  return `
    <${tag} ${attrs}>
      <div class="stash-top">
        <strong>${escapeHtml(shortName)}</strong>
        <span>${card.points}</span>
      </div>
      <div class="stash-hero">${portrait}</div>
      <div class="stash-stats">
        <span>MS ${card.stats.ms}</span>
        <span>HP ${card.stats.hp}</span>
      </div>
    </${tag}>`;
}

export function renderEmptyStashSlot(locale: Locale): string {
  return `
    <div class="stash-empty-tile" aria-hidden="true">
      ${escapeHtml(t(locale, "emptyStashSlot"))}
    </div>`;
}

export const renderTarotCard = renderCharacterCard;
