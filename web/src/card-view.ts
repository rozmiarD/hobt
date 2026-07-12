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

  const equipmentIcons = EQUIPMENT_SLOTS.map((slot) => {
    const entry = card.equipment[slot];
    const filled = Boolean(entry?.name);
    return `<span class="${filled ? "is-filled" : ""}" title="${escapeHtml(entry?.name ?? "")}">${sprite(EQUIPMENT_SPRITES[slot])}</span>`;
  }).join("");

  const abilities = card.abilities
    .filter(Boolean)
    .map((ability) => {
      const negative = ability.type === "negative";
      return `
        <div class="card-ability ${negative ? "negative" : "positive"}">
          ${sprite(negative ? "i-warn" : "i-sparkle")}
          <div>
            <strong>${escapeHtml(ability.name)}</strong>
            <p>${escapeHtml(ability.description)}</p>
          </div>
        </div>`;
    })
    .join("");

  return `
    <article class="character-card preview-character-card state-${card.validationState}">
      <header class="card-header">
        <div class="card-crest">${sprite("i-shield")}</div>
        <div class="card-title">
          <h1>${escapeHtml(card.name)}</h1>
          ${faction ? `<h3>${escapeHtml(faction)}</h3>` : ""}
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <div class="vital hp-vital">
          ${sprite("i-heart")}
          <span><small>HP</small><strong>${card.stats.hp}</strong></span>
        </div>
      </header>

      <section class="card-portrait">
        <div class="hero-placeholder${portrait ? " has-image" : ""}">
          ${
            portrait
              ? `<img src="${escapeHtml(portrait)}" alt="" class="hero-image" />`
              : `<span class="hero-head"></span><span class="hero-body"></span>
                 <span class="hero-weapon">${sprite("i-sword")}</span>
                 <span class="hero-shield">${sprite("i-shield")}</span>`
          }
        </div>
        <div class="vital-stack">
          <div class="vital mp-vital">
            ${sprite("i-boot")}
            <span><small>MP</small><strong>${card.stats.mp}</strong></span>
          </div>
          <div class="vital ac-vital">
            ${sprite("i-shield")}
            <span><small>AC</small><strong>${card.stats.ac}</strong></span>
          </div>
        </div>
      </section>

      <section class="card-stats">
        ${BANNER_STATS.map(
          (key) => `
        <div>
          ${sprite(STAT_SPRITES[key]!)}
          <span><small>${key.toUpperCase()}</small><strong>${card.stats[key]}</strong></span>
        </div>`,
        ).join("")}
      </section>

      <section class="card-section">
        <h4>${t(locale, "equipmentOnCard")}</h4>
        <div class="card-equipment">${equipmentIcons}</div>
      </section>

      <section class="card-section abilities-on-card">
        <h4>${t(locale, "abilitiesOnCard")}</h4>
        ${abilities || `<p class="card-empty">${t(locale, "none")}</p>`}
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
