import type { CharacterCard, EquipmentSlot } from "@hobt/lego-skirmish/types/domain.js";
import { t, type Locale } from "./i18n.js";
import { icon } from "./icons.js";

const BANNER_STATS = ["ms", "rs", "ls", "ks"] as const;

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

function limitedEquipment(card: CharacterCard) {
  const entries = EQUIPMENT_SLOTS.map((slot) => {
    const entry = card.equipment[slot];
    if (!entry?.name) {
      return null;
    }
    return { slot, entry };
  }).filter(Boolean) as { slot: EquipmentSlot; entry: { name: string } }[];

  return [
    ...entries.filter((e) => e.slot === "mainWeapon" || e.slot === "offhand"),
    ...entries.filter((e) => e.slot !== "mainWeapon" && e.slot !== "offhand"),
  ].slice(0, 5);
}

function limitedAbilities(card: CharacterCard) {
  const all = card.abilities.filter(Boolean);
  if (all.length <= 5) {
    return all;
  }

  const weaponAb =
    all.find((a) => /weapon|strike|blow|cios/i.test(a.name)) ?? all[0];
  const offhandAb =
    all.find(
      (a) =>
        a !== weaponAb && /off|shield|parry|tarcz/i.test(a.name),
    ) ?? all.find((a) => a !== weaponAb);

  const preferred = [weaponAb, offhandAb].filter(Boolean) as typeof all;
  const remaining = all.filter((a) => !preferred.includes(a)).slice(0, 3);
  return [...preferred, ...remaining].slice(0, 5);
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

  const equipmentItems = limitedEquipment(card)
    .map((entry) => `<li><span>${escapeHtml(entry.entry.name)}</span></li>`)
    .join("");

  const abilities = limitedAbilities(card);
  const abilitiesText =
    abilities.length > 0
      ? abilities
          .map((ability) => {
            const desc = ability.description?.trim();
            return `<b>${escapeHtml(ability.name)}</b>${desc ? ` — ${escapeHtml(desc)}` : ""}`;
          })
          .join("<br>")
      : escapeHtml(t(locale, "none"));

  const portraitContent = portrait
    ? `<img src="${escapeHtml(portrait)}" alt="" class="card-hero-img" />`
    : `<span class="card-hero-empty">${escapeHtml(t(locale, "portraitPlaceholder"))}</span>`;

  return `
    <div class="dossier-card dossier-theme-${escapeHtml(card.template.id)} state-${card.validationState}">
      <span class="rivet tl"></span><span class="rivet tr"></span>
      <span class="rivet bl"></span><span class="rivet br"></span>

      <div class="card-head">
        <div class="card-titles">
          <h3>${escapeHtml(card.name)}</h3>
          ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
          ${faction ? `<span class="faction-chip">${escapeHtml(faction)}</span>` : ""}
        </div>
      </div>

      <div class="card-portrait-block">
        <div class="card-hero${portrait ? " has-image" : ""}">${portraitContent}</div>
        <div class="card-vitals">
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
        </div>
      </div>

      <div class="card-stats">
        ${BANNER_STATS.map(
          (key) =>
            `<div><span class="code">${key.toUpperCase()}</span><span class="val">${card.stats[key]}</span></div>`,
        ).join("")}
      </div>

      <div class="card-content">
        <p class="card-section-label">${t(locale, "equipmentOnCard")}</p>
        <ul class="card-equip-list">
          ${
            equipmentItems ||
            `<li><span>${escapeHtml(t(locale, "none"))}</span></li>`
          }
        </ul>

        <p class="card-section-label">${t(locale, "talentsOnCard")}</p>
        <p class="card-abilities">${abilitiesText}</p>
      </div>

      <div class="stamp">
        <span class="n">${card.points}</span>
        <span class="l">${t(locale, "pointsStampLabel")}</span>
      </div>
    </div>`;
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
    : icon("user");

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
