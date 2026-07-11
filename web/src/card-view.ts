import type { ResolvedCharacterCardData } from "@hobt/lego-skirmish/types/domain.js";
import { t, type Locale } from "./i18n.js";

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

export function renderTarotCard(
  locale: Locale,
  card: ResolvedCharacterCardData,
  themeId: string,
  options: CardViewOptions,
): string {
  const {
    variant,
    characterId,
    selected = false,
    draft = false,
    interactive = false,
  } = options;

  if (variant === "stash") {
    return renderStashCard(locale, card, themeId, {
      characterId,
      selected,
      draft,
      interactive,
    });
  }

  return renderFullCard(locale, card, themeId, { draft });
}

function renderFullCard(
  locale: Locale,
  card: ResolvedCharacterCardData,
  themeId: string,
  options: { draft?: boolean },
): string {
  const statBlock = (value: number, short: string, label: string) => `
    <div class="card-stat">
      <div class="card-stat-value">${value}</div>
      <div class="card-stat-short">${short}</div>
      <div class="card-stat-label">${escapeHtml(label)}</div>
    </div>`;

  const derivedRail = `
    <div class="card-derived-rail">
      <div class="derived-pill hp"><span>HP</span><strong>${card.stats.HP}</strong></div>
      <div class="derived-pill mp"><span>MP</span><strong>${card.stats.MP}</strong></div>
      <div class="derived-pill ac"><span>AC</span><strong>${card.stats.AC}</strong></div>
    </div>`;

  const draftClass = options.draft ? " is-draft" : "";

  return `
    <article class="tarot-card theme-${escapeHtml(themeId)} state-${card.validationState}${draftClass}">
      <header class="card-header">
        <h3>${escapeHtml(card.name)}</h3>
        <span class="card-cost">${card.totalCost} ${t(locale, "points")}</span>
      </header>
      <div class="card-hero">
        <div class="card-portrait">
          <div class="portrait-placeholder">LEGO</div>
          ${derivedRail}
        </div>
      </div>
      <section class="card-stats-row">
        ${statBlock(card.stats.MS, "MS", t(locale, "statMS"))}
        ${statBlock(card.stats.RS, "RS", t(locale, "statRS"))}
        ${statBlock(card.stats.LS, "LS", t(locale, "statLS"))}
        ${statBlock(card.stats.KS, "KS", t(locale, "statKS"))}
      </section>
      <section class="card-section card-section-compact">
        <h4>${t(locale, "actionSlots")}</h4>
        <ol class="card-list">
          ${card.actions
            .map(
              (action) => `
            <li>
              <span class="slot-index">${action.slotIndex}</span>
              <span>${escapeHtml(action.name[locale])}</span>
            </li>`,
            )
            .join("")}
        </ol>
      </section>
    </article>`;
}

function renderStashCard(
  locale: Locale,
  card: ResolvedCharacterCardData,
  themeId: string,
  options: {
    characterId?: string;
    selected?: boolean;
    draft?: boolean;
    interactive?: boolean;
  },
): string {
  const tag = options.interactive ? "button" : "div";
  const attrs = [
    `class="stash-card theme-${escapeHtml(themeId)} state-${card.validationState}${options.selected ? " is-selected" : ""}${options.draft ? " is-draft" : ""}"`,
    options.interactive && options.characterId
      ? `type="button" data-action="select-character" data-character="${escapeHtml(options.characterId)}"`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <${tag} ${attrs}>
      <div class="stash-card-frame">
        <div class="stash-card-header">
          <strong>${escapeHtml(card.name)}</strong>
          <span>${card.totalCost}</span>
        </div>
        <div class="stash-card-hero">
          <div class="stash-portrait">LEGO</div>
          <div class="stash-rail">
            <span class="stash-pill hp">HP ${card.stats.HP}</span>
            <span class="stash-pill mp">MP ${card.stats.MP}</span>
            <span class="stash-pill ac">AC ${card.stats.AC}</span>
          </div>
        </div>
        <div class="stash-stats">
          <span>MS ${card.stats.MS}</span>
          <span>RS ${card.stats.RS}</span>
          <span>LS ${card.stats.LS}</span>
          <span>KS ${card.stats.KS}</span>
        </div>
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
