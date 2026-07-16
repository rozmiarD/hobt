import type {
  CharacterCard,
  EquipmentSlot,
} from "@hobt/lego-skirmish/types/domain.js";
import { t, type Locale } from "./i18n.js";
import { EQUIPMENT_ICONS, icon } from "./icons.js";

const EQUIPMENT_SLOTS: EquipmentSlot[] = [
  "mainWeapon",
  "offhand",
  "armor",
  "item1",
  "item2",
];

const SLOT_KEYS: Record<
  EquipmentSlot,
  "slotShortMain" | "slotShortOff" | "slotShortArmor" | "slotShortItem1" | "slotShortItem2"
> = {
  mainWeapon: "slotShortMain",
  offhand: "slotShortOff",
  armor: "slotShortArmor",
  item1: "slotShortItem1",
  item2: "slotShortItem2",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function portraitStyle(card: CharacterCard): string {
  const source = card as CharacterCard & {
    portrait?: CharacterCard["portrait"] & {
      positionX?: number;
      positionY?: number;
      zoom?: number;
    };
  };
  const x = source.portrait?.positionX ?? 50;
  const y = source.portrait?.positionY ?? 50;
  const zoom = source.portrait?.zoom ?? 1;
  return `object-position:${x}% ${y}%;transform:scale(${zoom});transform-origin:${x}% ${y}%`;
}

function renderEquipment(locale: Locale, card: CharacterCard): string {
  const entries = EQUIPMENT_SLOTS.flatMap((slot) => {
    const entry = card.equipment[slot];
    if (!entry?.name) {
      return [];
    }
    return `
      <li class="hero-card-equipment-row">
        <span class="hero-card-row-icon">${icon(EQUIPMENT_ICONS[slot])}</span>
        <span class="hero-card-row-label">${escapeHtml(t(locale, SLOT_KEYS[slot]))}</span>
        <strong>${escapeHtml(entry.name)}</strong>
        ${entry.description ? `<small>${escapeHtml(entry.description)}</small>` : ""}
      </li>`;
  });

  return entries.length > 0
    ? entries.join("")
    : `<li class="hero-card-empty">${escapeHtml(t(locale, "none"))}</li>`;
}

function renderAbilities(locale: Locale, card: CharacterCard): string {
  const entries = card.abilities.slice(0, 5);
  if (entries.length === 0) {
    return `<li class="hero-card-empty">${escapeHtml(t(locale, "none"))}</li>`;
  }
  return entries
    .map(
      (ability) => `
      <li class="hero-card-ability-row ${ability.type === "negative" ? "is-negative" : ""}">
        <span class="hero-card-ability-mark" aria-hidden="true"></span>
        <p><strong>${escapeHtml(ability.name)}</strong><span>${escapeHtml(ability.description)}</span></p>
      </li>`,
    )
    .join("");
}

export type CardRenderVariant = "preview" | "library" | "print";

export function renderHeroCard(
  locale: Locale,
  card: CharacterCard,
  variant: CardRenderVariant = "preview",
): string {
  const subtitle = card.subtitle?.trim();
  const affiliation = card.faction?.trim() || card.team?.trim();
  const portrait = card.portrait?.url;
  const themeId = card.template.id || "field-kit";
  const nameClass =
    card.name.length > 22
      ? "is-very-long"
      : card.name.length > 11
        ? "is-long"
        : "";
  const abilityCount = Math.min(3, card.abilities.length);

  return `
    <article
      class="hero-card hero-card-${escapeHtml(variant)} theme-${escapeHtml(themeId)} state-${card.validationState} ability-count-${abilityCount}"
      aria-label="${escapeHtml(card.name)}"
    >
      <div class="hero-card-frame" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>

      <header class="hero-card-header">
        <div class="hero-card-title">
          <p class="hero-card-kicker">${escapeHtml(affiliation || t(locale, "independentHero"))}</p>
          <h3 class="${nameClass}">${escapeHtml(card.name || t(locale, "newCharacter"))}</h3>
          ${subtitle ? `<p class="hero-card-subtitle">${escapeHtml(subtitle)}</p>` : ""}
        </div>
        <div class="hero-card-cost" aria-label="${card.points} ${escapeHtml(t(locale, "points"))}">
          <strong>${card.points}</strong>
          <span>${escapeHtml(t(locale, "pointsShort"))}</span>
        </div>
      </header>

      <section class="hero-card-portrait-zone">
        <div class="hero-card-portrait">
          ${
            portrait
              ? `<img src="${escapeHtml(portrait)}" alt="${escapeHtml(card.name)}" style="${portraitStyle(card)}" />`
              : `<div class="hero-card-portrait-empty">${icon("user")}<span>${escapeHtml(t(locale, "portraitPlaceholder"))}</span></div>`
          }
          <span class="hero-card-portrait-grid" aria-hidden="true"></span>
        </div>
        <div class="hero-card-vitals" aria-label="${escapeHtml(t(locale, "vitals"))}">
          <div class="hero-card-vital hp"><span>HP</span><strong>${card.stats.hp}</strong></div>
          <div class="hero-card-vital mp"><span>MP</span><strong>${card.stats.mp}</strong></div>
          <div class="hero-card-vital ac"><span>AC</span><strong>${card.stats.ac}</strong></div>
        </div>
      </section>

      <section class="hero-card-stats" aria-label="${escapeHtml(t(locale, "baseStats"))}">
        ${(["ms", "rs", "ls", "ks"] as const)
          .map(
            (stat) => `
            <div class="hero-card-stat">
              <span>${stat.toUpperCase()}</span>
              <strong>${card.stats[stat]}</strong>
            </div>`,
          )
          .join("")}
      </section>

      <section class="hero-card-loadout">
        <div class="hero-card-section hero-card-equipment">
          <h4><span></span>${escapeHtml(t(locale, "equipmentOnCard"))}</h4>
          <ul>${renderEquipment(locale, card)}</ul>
        </div>
        <div class="hero-card-section hero-card-abilities">
          <h4><span></span>${escapeHtml(t(locale, "abilitiesOnCard"))}</h4>
          <ul>${renderAbilities(locale, card)}</ul>
        </div>
      </section>

      <footer class="hero-card-footer">
        <span>HOBT · ${escapeHtml(card.metadata?.version ?? "")}</span>
        <span>${escapeHtml(card.team || t(locale, "adventureAwaits"))}</span>
      </footer>
    </article>`;
}

export function renderPreviewCard(locale: Locale, card: CharacterCard): string {
  return renderHeroCard(locale, card, "preview");
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
  const variant = options.variant === "stash" ? "library" : "preview";
  return renderHeroCard(locale, card, variant);
}

export const renderTarotCard = renderCharacterCard;
