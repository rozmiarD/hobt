import type { CharacterCard, EquipmentSlot } from "@hobt/lego-skirmish/types/domain.js";
import { t, type Locale } from "./i18n.js";
import {
  BANNER_STAT_ICONS,
  EQUIPMENT_ICONS,
  icon,
} from "./icons.js";

const BANNER_STATS = ["ms", "rs", "ls", "ks"] as const;

const SLOT_LABEL_KEYS = {
  mainWeapon: "slotMainWeapon",
  offhand: "slotOffhand",
  armor: "slotArmor",
  item1: "slotItem1",
  item2: "slotItem2",
} as const;

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

export interface CardViewOptions {
  variant: "full" | "stash";
  characterId?: string;
  selected?: boolean;
  draft?: boolean;
  interactive?: boolean;
}

export function renderPreviewCard(locale: Locale, card: CharacterCard): string {
  const subtitle = card.subtitle?.trim();
  const faction = card.faction?.trim() ?? card.team?.trim() ?? "";
  const portrait = card.portrait?.url;

  const equipmentItems = EQUIPMENT_SLOTS.map((slot) => {
    const entry = card.equipment[slot];
    if (!entry?.name) {
      return "";
    }
    return `
      <div class="card-list-item equipment-item">
        ${icon(EQUIPMENT_ICONS[slot])}
        <div>
          <strong>${escapeHtml(entry.name)}</strong>
          <p>${escapeHtml(t(locale, SLOT_LABEL_KEYS[slot]))}</p>
        </div>
      </div>`;
  })
    .filter(Boolean)
    .join("");

  const abilities = card.abilities
    .filter(Boolean)
    .map((ability) => {
      const negative = ability.type === "negative";
      return `
        <div class="card-list-item card-ability ${negative ? "negative" : "positive"}">
          ${icon(negative ? "warn" : "sparkle")}
          <div>
            <strong>${escapeHtml(ability.name)}</strong>
            <p>${escapeHtml(ability.description)}</p>
          </div>
        </div>`;
    })
    .join("");

  return `
    <article class="preview-character-card state-${card.validationState}">
      <header class="card-header">
        <div class="card-crest">${icon("shield")}</div>
        <div class="card-title">
          <h1>${escapeHtml(card.name)}</h1>
          ${faction ? `<h3>${escapeHtml(faction)}</h3>` : ""}
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
      </header>

      <section class="card-portrait-block">
        <div class="hero-placeholder${portrait ? " has-image" : ""}">
          ${
            portrait
              ? `<img src="${escapeHtml(portrait)}" alt="" class="hero-image" />`
              : `<span class="hero-empty-label">${escapeHtml(t(locale, "portraitPlaceholder"))}</span>`
          }
        </div>
        <aside class="card-vitals" aria-label="HP / MP / AC">
          <div class="vital hp-vital">
            <strong class="card-mini-value">${card.stats.hp}</strong>
            ${icon("heart")}
            <span class="card-mini-code">HP</span>
          </div>
          <div class="vital mp-vital">
            <strong class="card-mini-value">${card.stats.mp}</strong>
            ${icon("shoe-prints")}
            <span class="card-mini-code">MP</span>
          </div>
          <div class="vital ac-vital">
            <strong class="card-mini-value">${card.stats.ac}</strong>
            ${icon("shield")}
            <span class="card-mini-code">AC</span>
          </div>
        </aside>
      </section>

      <section class="card-stats">
        ${BANNER_STATS.map(
          (key) => `
        <div class="tile card-stat-tile">
          <strong class="tile-value">${card.stats[key]}</strong>
          <span class="tile-icon">${icon(BANNER_STAT_ICONS[key])}</span>
          <span class="tile-code">${key.toUpperCase()}</span>
        </div>`,
        ).join("")}
      </section>

      <section class="card-section equipment-on-card">
        <h4>${t(locale, "equipmentOnCard")}</h4>
        <div class="card-list equipment-list">
          ${equipmentItems || `<p class="card-empty">${t(locale, "none")}</p>`}
        </div>
      </section>

      <section class="card-section talents-on-card">
        <h4>${t(locale, "talentsOnCard")}</h4>
        <div class="card-list talents-list">
          ${abilities || `<p class="card-empty">${t(locale, "none")}</p>`}
        </div>
      </section>
    </article>`;
}

export function renderCharacterCard(
  locale: Locale,
  card: CharacterCard,
  options: CardViewOptions,
): string {
  if (options.variant === "stash") {
    return renderStashTile(locale, card, options);
  }
  return renderPreviewCard(locale, card);
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
