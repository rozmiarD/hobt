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

  // Limit to 5 items total (prioritize mainWeapon + offhand)
  const equipmentEntries = EQUIPMENT_SLOTS
    .map((slot) => {
      const entry = card.equipment[slot];
      if (!entry?.name) return null;
      return { slot, entry };
    })
    .filter(Boolean) as { slot: EquipmentSlot; entry: any }[];

  const limitedEquipment = [
    ...equipmentEntries.filter(e => e.slot === "mainWeapon" || e.slot === "offhand"),
    ...equipmentEntries.filter(e => e.slot !== "mainWeapon" && e.slot !== "offhand"),
  ].slice(0, 5);

  const equipmentItems = limitedEquipment.length > 0
    ? limitedEquipment.map(({ slot, entry }) => `
        <div class="card-list-item equipment-item">
          ${icon(EQUIPMENT_ICONS[slot])}
          <div>
            <strong>${escapeHtml(entry.name)}</strong>
            <p>${escapeHtml(t(locale, SLOT_LABEL_KEYS[slot]))}</p>
          </div>
        </div>`).join("")
    : `<p class="card-empty">${t(locale, "none")}</p>`;

  // Limit to 5 abilities (1 weapon-related, 1 offhand-related, 3 talents as priority)
  const allAbilities = card.abilities.filter(Boolean);
  const weaponAb = allAbilities.find(a => (a.name || "").toLowerCase().includes("weapon") || (a.name || "").toLowerCase().includes("strike") || (a.name || "").toLowerCase().includes("blow")) || allAbilities[0];
  const offhandAb = allAbilities.find(a => (a.name || "").toLowerCase().includes("off") || (a.name || "").toLowerCase().includes("shield") || (a.name || "").toLowerCase().includes("parry")) || allAbilities[1];
  
  let selectedAbilities = allAbilities.slice(0, 5);
  // Try to construct preferred 5 if possible
  const preferred: any[] = [];
  if (weaponAb) preferred.push(weaponAb);
  if (offhandAb && offhandAb !== weaponAb) preferred.push(offhandAb);
  const remainingTalents = allAbilities.filter(a => !preferred.includes(a)).slice(0, 3);
  preferred.push(...remainingTalents);
  if (preferred.length > 0) {
    selectedAbilities = preferred.slice(0, 5);
  }

  const abilitiesHtml = selectedAbilities.map((ability) => {
    const negative = ability.type === "negative";
    return `
      <div class="card-list-item card-ability ${negative ? "negative" : "positive"}">
        ${icon(negative ? "warn" : "sparkle")}
        <div>
          <strong>${escapeHtml(ability.name)}</strong>
          <p>${escapeHtml(ability.description)}</p>
        </div>
      </div>`;
  }).join("");

  return `
    <article class="preview-character-card tarot-card state-${card.validationState}">
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
          ${portrait
            ? `<img src="${escapeHtml(portrait)}" alt="" class="hero-image" />`
            : `<span class="hero-empty-label">${escapeHtml(t(locale, "portraitPlaceholder"))}</span>`
          }
        </div>
        <aside class="card-vitals">
          <div class="vital hp-vital">
            <strong>${card.stats.hp}</strong>
            <span>HP</span>
          </div>
          <div class="vital mp-vital">
            <strong>${card.stats.mp}</strong>
            <span>MP</span>
          </div>
          <div class="vital ac-vital">
            <strong>${card.stats.ac}</strong>
            <span>AC</span>
          </div>
        </aside>
      </section>

      <section class="card-stats">
        ${BANNER_STATS.map((key) => `
          <div class="card-stat">
            <span class="stat-val">${card.stats[key]}</span>
            <span class="stat-key">${key.toUpperCase()}</span>
          </div>`).join("")}
      </section>

      <section class="card-equipment">
        <div class="card-list equipment-list">
          ${equipmentItems}
        </div>
      </section>

      <section class="card-abilities">
        <div class="card-list abilities-list">
          ${abilitiesHtml || `<p class="card-empty">${t(locale, "none")}</p>`}
        </div>
      </section>

      <footer class="card-footer">
        <span class="card-points">${card.points} pts</span>
      </footer>
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
