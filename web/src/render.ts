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
import type {
  CharacterBuild,
  PurchasableStat,
  ResolvedCharacterCardData,
} from "@hobt/lego-skirmish/types/domain.js";
import { EQUIPMENT_SLOTS } from "@hobt/lego-skirmish/types/domain.js";
import type { AppState } from "./state.js";
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

function statLabel(locale: Locale, stat: PurchasableStat | "AC"): string {
  const map = {
    MS: "statMS",
    RS: "statRS",
    LS: "statLS",
    KS: "statKS",
    HP: "statHP",
    MP: "statMP",
    AC: "statAC",
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

function renderCardPreview(
  locale: Locale,
  card: ResolvedCharacterCardData,
  themeId: string,
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

  return `
    <article class="tarot-card theme-${escapeHtml(themeId)} state-${card.validationState}">
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
      <section class="card-section">
        <h4>${t(locale, "actionSlots")}</h4>
        <ol class="card-list">
          ${card.actions
            .map(
              (action) => `
            <li>
              <span class="slot-index">${action.slotIndex}</span>
              <span>${escapeHtml(localize(action.name, locale))}</span>
            </li>`,
            )
            .join("")}
        </ol>
      </section>
      <section class="card-section">
        <h4>${t(locale, "equipmentSlots")}</h4>
        <ol class="card-list equipment-list">
          ${card.equipment
            .map((slot) => {
              const label = t(locale, SLOT_LABEL_KEYS[slot.slot]);
              const itemName = slot.item
                ? localize(slot.item.name, locale)
                : t(locale, "none");
              return `
              <li>
                <span class="eq-icon" data-slot="${slot.slot}"></span>
                <span class="eq-label">${escapeHtml(label)}</span>
                <span class="eq-name">${escapeHtml(itemName)}</span>
              </li>`;
            })
            .join("")}
        </ol>
      </section>
    </article>`;
}

function renderCharacterEditor(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const resolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);
  const card = buildCharacterCardSnapshot(resolved);

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

  const inTeam = state.team.characters.some(
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
          ${inTeam ? t(locale, "updateInTeam") : t(locale, "addToTeam")}
        </button>
        ${
          inTeam
            ? `<button type="button" class="danger ghost" data-action="remove-active">${t(locale, "removeFromTeam")}</button>`
            : ""
        }
      </div>
    </section>

    <section class="panel preview-panel">
      <div class="panel-head">
        <h2>${t(locale, "cardPreview")}</h2>
        <label class="inline-field">
          <span>${t(locale, "theme")}</span>
          <select data-action="card-theme">
            ${CARD_THEMES.map(
              (theme) => `
              <option value="${theme.id}" ${state.team.cardTheme.templateId === theme.id ? "selected" : ""}>
                ${escapeHtml(localize(theme.label, locale))}
              </option>`,
            ).join("")}
          </select>
        </label>
      </div>
      ${renderCardPreview(locale, card, state.team.cardTheme.templateId)}
    </section>`;
}

function renderTeamPanel(state: AppState): string {
  const locale = state.locale;
  const resolvedTeam = validateTeam(state.team, DEFAULT_RULESET, DEFAULT_CATALOG);
  const budget = state.team.budget;
  const cost = resolvedTeam.totalCost;
  const ratio = Math.min(100, Math.round((cost / budget) * 100));

  return `
    <section class="panel team-panel">
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
        state.team.characters.length === 0
          ? `<p class="muted">${t(locale, "emptyTeam")}</p>`
          : `<ul class="team-list">
              ${state.team.characters
                .map((character) => {
                  const resolved = resolveCharacter(
                    character,
                    DEFAULT_RULESET,
                    DEFAULT_CATALOG,
                  );
                  const active = state.activeCharacterId === character.id;
                  return `
                  <li class="${active ? "active" : ""} ${resolved.validation.valid ? "" : "invalid"}">
                    <button type="button" data-action="select-character" data-character="${character.id}">
                      <strong>${escapeHtml(character.name)}</strong>
                      <span>${resolved.cost.total} ${t(locale, "points")}</span>
                    </button>
                  </li>`;
                })
                .join("")}
            </ul>`
      }

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

      <div class="workspace">
        ${renderCharacterEditor(state, state.draft)}
      </div>
    </div>`;
}
