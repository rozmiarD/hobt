import {
  buildCharacterCardSnapshot,
  DEFAULT_CATALOG,
  DEFAULT_RULESET,
  getItemsForSlot,
  listAbilities,
  localize,
  resolveCharacter,
  validateTeam,
} from "@hobt/lego-skirmish";
import type { CharacterBuild, PurchasableStat } from "@hobt/lego-skirmish/types/domain.js";
import { EQUIPMENT_SLOTS } from "@hobt/lego-skirmish/types/domain.js";
import type { AppState } from "./state.js";
import { renderEmptyStashSlot, renderTarotCard } from "./card-view.js";
import { CARD_THEMES, t, type Locale } from "./i18n.js";

const PURCHASABLE_STATS: PurchasableStat[] = [
  "MS",
  "RS",
  "LS",
  "KS",
  "HP",
  "MP",
];

const SLOT_LABEL_KEYS = {
  mainWeapon: "slotMainWeapon",
  offhand: "slotOffhand",
  armor: "slotArmor",
  item1: "slotItem1",
  item2: "slotItem2",
} as const;

function statLabel(locale: Locale, stat: PurchasableStat): string {
  const map = {
    MS: "statMS",
    RS: "statRS",
    LS: "statLS",
    KS: "statKS",
    HP: "statHP",
    MP: "statMP",
  } as const;
  return t(locale, map[stat]);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCostRows(
  locale: Locale,
  entries: { label: { pl: string; en: string }; amount: number }[],
): string {
  if (entries.length === 0) {
    return `<p class="muted">${escapeHtml(t(locale, "none"))}</p>`;
  }
  return entries
    .map(
      (entry) => `
      <div class="cost-row">
        <span>${escapeHtml(localize(entry.label, locale))}</span>
        <strong>${entry.amount > 0 ? "+" : ""}${entry.amount} ${t(locale, "points")}</strong>
      </div>`,
    )
    .join("");
}

function renderCardStash(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const themeId = state.team.cardTheme.templateId;
  const draftResolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);
  const draftCard = buildCharacterCardSnapshot(draftResolved);
  const inStash = state.team.characters.some(
    (character) => character.id === draft.id,
  );

  const teamCards = state.team.characters.map((character) => {
    const resolved = resolveCharacter(character, DEFAULT_RULESET, DEFAULT_CATALOG);
    const card = buildCharacterCardSnapshot(resolved);
    const isSelected = state.activeCharacterId === character.id;
    const isDraft = character.id === draft.id;
    return renderTarotCard(locale, card, themeId, {
      variant: "stash",
      characterId: character.id,
      selected: isSelected,
      draft: isDraft,
      interactive: true,
    });
  });

  const emptySlots = Math.max(
    0,
    DEFAULT_RULESET.team.recommendedCharacterCount - state.team.characters.length,
  );
  const emptySlotMarkup = Array.from({ length: emptySlots }, () =>
    renderEmptyStashSlot(locale),
  ).join("");

  return `
    <section class="panel stash-panel">
      <div class="panel-head">
        <div>
          <h2>${t(locale, "cardStash")}</h2>
          <p class="stash-intro">${t(locale, "liveDraftHint")}</p>
        </div>
        <label class="inline-field">
          <span>${t(locale, "theme")}</span>
          <select data-action="card-theme">
            ${CARD_THEMES.map(
              (theme) => `
              <option value="${theme.id}" ${themeId === theme.id ? "selected" : ""}>
                ${escapeHtml(localize(theme.label, locale))}
              </option>`,
            ).join("")}
          </select>
        </label>
      </div>

      <div class="stash-live">
        <div class="stash-section-head">
          <h3>${t(locale, "liveDraft")}</h3>
          ${
            inStash
              ? `<span class="stash-badge">${t(locale, "inStash")}</span>`
              : ""
          }
        </div>
        ${renderTarotCard(locale, draftCard, themeId, {
          variant: "full",
          draft: !inStash,
        })}
      </div>

      <div class="stash-collection">
        <div class="stash-section-head">
          <h3>${t(locale, "stashTeamCards")}</h3>
          <span class="stash-count">${state.team.characters.length} / ${DEFAULT_RULESET.team.maximumCharacterCount}</span>
        </div>
        ${
          state.team.characters.length === 0
            ? `<p class="stash-empty muted">${t(locale, "emptyStash")}</p>`
            : `<div class="stash-grid">${teamCards.join("")}${emptySlotMarkup}</div>`
        }
      </div>
    </section>`;
}

function renderCharacterEditor(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const resolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);

  const statControls = PURCHASABLE_STATS.map((stat) => {
    const value = draft.baseStats[stat];
    return `
      <label class="stat-control">
        <span class="stat-label">
          <strong>${stat}</strong>
          <small>${escapeHtml(statLabel(locale, stat))}</small>
        </span>
        <div class="stepper">
          <button type="button" data-action="stat-dec" data-stat="${stat}" ${value <= 0 ? "disabled" : ""}>−</button>
          <span class="stat-value">${value}</span>
          <button type="button" data-action="stat-inc" data-stat="${stat}" ${value >= 6 ? "disabled" : ""}>+</button>
        </div>
        <span class="stat-cost">${resolved.cost.attributes.find((entry) => entry.id === `attr:${stat}`)?.amount ?? 0} ${t(locale, "points")}</span>
      </label>`;
  }).join("");

  const equipmentControls = EQUIPMENT_SLOTS.map((slot) => {
    const items = getItemsForSlot(DEFAULT_CATALOG, slot);
    const current = draft.equipment[slot]?.itemId ?? "";
    const blocked = resolved.blockedSlots.includes(slot);
    return `
      <label class="field">
        <span>${t(locale, SLOT_LABEL_KEYS[slot])}${blocked ? " 🔒" : ""}</span>
        <select data-action="equipment" data-slot="${slot}" ${blocked ? "disabled" : ""}>
          <option value="">${t(locale, "selectItem")}</option>
          ${items
            .map(
              (item) => `
            <option value="${item.id}" ${current === item.id ? "selected" : ""}>
              ${escapeHtml(localize(item.name, locale))}
            </option>`,
            )
            .join("")}
        </select>
      </label>`;
  }).join("");

  const talents = listAbilities(DEFAULT_CATALOG)
    .map((ability) => {
      const checked = draft.talentIds.includes(ability.id);
      const disabled =
        !checked && draft.talentIds.length >= DEFAULT_RULESET.character.maxTalents;
      return `
        <label class="talent-option ${ability.polarity}">
          <input
            type="checkbox"
            data-action="talent-toggle"
            data-talent="${ability.id}"
            ${checked ? "checked" : ""}
            ${disabled ? "disabled" : ""}
          />
          <span class="talent-name">${escapeHtml(localize(ability.name, locale))}</span>
          <span class="talent-cost">${ability.cost > 0 ? "+" : ""}${ability.cost}</span>
        </label>`;
    })
    .join("");

  const issues = [
    ...resolved.validation.errors.map((issue) => ({
      severity: "error" as const,
      text: localize(issue.message, locale),
    })),
    ...resolved.validation.warnings.map((issue) => ({
      severity: "warning" as const,
      text: localize(issue.message, locale),
    })),
  ];

  const inStash = state.team.characters.some(
    (character) => character.id === draft.id,
  );

  return `
    <section class="panel editor-panel">
      <div class="panel-head">
        <h2>${t(locale, "character")}</h2>
        <button type="button" class="ghost" data-action="new-character">${t(locale, "newCharacter")}</button>
      </div>

      <label class="field">
        <span>${t(locale, "name")}</span>
        <input type="text" data-action="name" value="${escapeHtml(draft.name)}" />
      </label>

      <div class="subsection">
        <h3>${t(locale, "baseStats")}</h3>
        <div class="stat-grid">${statControls}</div>
      </div>

      <div class="subsection">
        <h3>${t(locale, "equipment")}</h3>
        <div class="equipment-grid">${equipmentControls}</div>
      </div>

      <div class="subsection">
        <h3>${t(locale, "talents")} (${draft.talentIds.length}/${DEFAULT_RULESET.character.maxTalents})</h3>
        <div class="talent-grid">${talents}</div>
      </div>

      <div class="derived-grid">
        <h3>${t(locale, "derivedStats")}</h3>
        <div class="derived-values">
          <div><span>HP</span><strong>${resolved.derivedStats.HP}</strong></div>
          <div><span>MP</span><strong>${resolved.derivedStats.MP}</strong></div>
          <div><span>AC</span><strong>${resolved.derivedStats.AC}</strong></div>
          <div><span>MS</span><strong>${resolved.derivedStats.MS}</strong></div>
          <div><span>RS</span><strong>${resolved.derivedStats.RS}</strong></div>
          <div><span>LS</span><strong>${resolved.derivedStats.LS}</strong></div>
          <div><span>KS</span><strong>${resolved.derivedStats.KS}</strong></div>
        </div>
      </div>

      <div class="subsection">
        <h3>${t(locale, "costBreakdown")}</h3>
        <div class="cost-section">
          <h4>${t(locale, "attributes")}</h4>
          ${renderCostRows(locale, resolved.cost.attributes)}
          <h4>${t(locale, "abilities")}</h4>
          ${renderCostRows(locale, resolved.cost.abilities)}
          <h4>${t(locale, "equipment")}</h4>
          ${renderCostRows(locale, resolved.cost.equipment)}
          <div class="cost-total">
            <span>${t(locale, "total")}</span>
            <strong>${resolved.cost.total} ${t(locale, "points")}</strong>
          </div>
        </div>
      </div>

      <div class="subsection">
        <h3>${t(locale, "validation")}</h3>
        ${
          issues.length === 0
            ? `<p class="ok">${t(locale, "noIssues")}</p>`
            : `<ul class="issue-list">
                ${issues
                  .map(
                    (issue) =>
                      `<li class="${issue.severity}">${escapeHtml(issue.text)}</li>`,
                  )
                  .join("")}
              </ul>`
        }
      </div>

      <div class="editor-actions">
        <button type="button" class="primary" data-action="add-to-team">
          ${inStash ? t(locale, "updateInStash") : t(locale, "addToStash")}
        </button>
        ${
          inStash
            ? `<button type="button" class="danger ghost" data-action="remove-active">${t(locale, "removeFromTeam")}</button>`
            : ""
        }
      </div>
    </section>`;
}

function renderTeamPanel(state: AppState): string {
  const locale = state.locale;
  const resolvedTeam = validateTeam(state.team, DEFAULT_RULESET, DEFAULT_CATALOG);
  const budget = state.team.budget;
  const cost = resolvedTeam.totalCost;
  const ratio = Math.min(100, Math.round((cost / budget) * 100));

  return `
    <section class="panel team-panel team-panel-compact">
      <div class="panel-head">
        <h2>${t(locale, "team")}</h2>
        <span class="ruleset-badge">${t(locale, "ruleset")}: ${DEFAULT_RULESET.id} ${DEFAULT_RULESET.version}</span>
      </div>

      <div class="team-summary ${resolvedTeam.validation.valid ? "ok" : "bad"}">
        <div class="budget-bar">
          <div class="budget-fill" style="width: ${ratio}%"></div>
        </div>
        <div class="team-metrics">
          <div><span>${t(locale, "teamBudget")}</span><strong>${budget}</strong></div>
          <div><span>${t(locale, "teamCost")}</span><strong>${cost}</strong></div>
          <div><span>${t(locale, "teamCount")}</span><strong>${state.team.characters.length} / ${DEFAULT_RULESET.team.maximumCharacterCount}</strong></div>
        </div>
        <p class="team-status">${resolvedTeam.validation.valid ? t(locale, "teamValid") : t(locale, "teamInvalid")}</p>
      </div>

      ${
        resolvedTeam.validation.errors.length > 0
          ? `<ul class="issue-list compact">
              ${resolvedTeam.validation.errors
                .map(
                  (issue) =>
                    `<li class="error">${escapeHtml(localize(issue.message, locale))}</li>`,
                )
                .join("")}
            </ul>`
          : ""
      }
    </section>`;
}

export function renderApp(state: AppState): string {
  const locale = state.locale;
  return `
    <div class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">${t(locale, "subtitle")}</p>
          <h1>${t(locale, "title")}</h1>
        </div>
        <div class="locale-switch">
          <button type="button" data-action="locale" data-locale="pl" class="${locale === "pl" ? "active" : ""}">PL</button>
          <button type="button" data-action="locale" data-locale="en" class="${locale === "en" ? "active" : ""}">EN</button>
        </div>
      </header>

      ${renderTeamPanel(state)}

      <div class="workspace workspace-stash">
        ${renderCharacterEditor(state, state.draft)}
        ${renderCardStash(state, state.draft)}
      </div>
    </div>`;
}
