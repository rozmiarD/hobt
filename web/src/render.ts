import {
  buildCharacterCard,
  DEFAULT_RULESET,
  getItemsForSlot,
  listAbilities,
  localize,
  resolveCharacter,
  validateTeam,
} from "@hobt/lego-skirmish";
import type { CharacterBuild, EquipmentSlot, GameCatalog, PurchasableStat } from "@hobt/lego-skirmish/types/domain.js";
import { EQUIPMENT_SLOTS } from "@hobt/lego-skirmish/types/domain.js";
import type { AppState, EditorStep } from "./state.js";
import { renderCatalogMode } from "./catalog-render.js";
import { renderEmptyStashSlot, renderCharacterCard } from "./card-view.js";
import { CARD_THEMES, t, type Locale } from "./i18n.js";
import { SPRITE_DEFS, sprite, type SpriteId } from "./sprites.js";

function catalogFor(state: AppState): GameCatalog {
  return state.catalogDocument.catalog;
}

function cardContext(state: AppState) {
  return {
    teamName: state.team.name,
    templateId: state.team.cardTheme.templateId,
    decorationLevel: state.team.cardTheme.decorLevel,
    locale: state.locale,
  };
}

const PURCHASABLE_STATS: PurchasableStat[] = [
  "MS",
  "RS",
  "LS",
  "KS",
  "HP",
  "MP",
];

const STAT_SPRITES: Record<PurchasableStat, SpriteId> = {
  HP: "i-heart",
  MP: "i-boot",
  MS: "i-sword",
  RS: "i-target",
  LS: "i-flag",
  KS: "i-brain",
};

const EQ_SPRITES: Record<EquipmentSlot, SpriteId> = {
  mainWeapon: "i-sword",
  offhand: "i-shield",
  armor: "i-shield",
  item1: "i-star-list",
  item2: "i-star-list",
};

const SLOT_LABEL_KEYS = {
  mainWeapon: "slotMainWeapon",
  offhand: "slotOffhand",
  armor: "slotArmor",
  item1: "slotItem1",
  item2: "slotItem2",
} as const;

const EDITOR_STEPS: EditorStep[] = [
  "identity",
  "stats",
  "equipment",
  "talents",
];

const STEP_LABEL: Record<
  EditorStep,
  "stepIdentity" | "stepStats" | "stepEquipment" | "stepTalents"
> = {
  identity: "stepIdentity",
  stats: "stepStats",
  equipment: "stepEquipment",
  talents: "stepTalents",
};

const STEP_HINT: Record<
  EditorStep,
  "stepIdentityHint" | "stepStatsHint" | "stepEquipmentHint" | "stepTalentsHint"
> = {
  identity: "stepIdentityHint",
  stats: "stepStatsHint",
  equipment: "stepEquipmentHint",
  talents: "stepTalentsHint",
};

const STEP_ICON: Record<EditorStep, SpriteId> = {
  identity: "i-user",
  stats: "i-sword",
  equipment: "i-shield",
  talents: "i-sparkle",
};

const STEP_SECTION: Record<
  EditorStep,
  "identityTitle" | "baseStats" | "equipment" | "talents"
> = {
  identity: "identityTitle",
  stats: "baseStats",
  equipment: "equipment",
  talents: "talents",
};

const STEP_SECTION_HINT: Record<
  EditorStep,
  "identityMeta" | "statsMeta" | "equipmentMeta" | "talentsMeta"
> = {
  identity: "identityMeta",
  stats: "statsMeta",
  equipment: "equipmentMeta",
  talents: "talentsMeta",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

function stepVisual(
  step: EditorStep,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
): "complete" | "error" | "pending" {
  if (!draft.name.trim()) {
    return step === "identity" ? "pending" : "pending";
  }
  if (!resolved.validation.valid) {
    return step === "talents" ? "error" : "pending";
  }
  return "complete";
}

function renderStepper(
  locale: Locale,
  state: AppState,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  return `
    <nav class="stepper-nav" role="tablist" aria-label="${escapeHtml(t(locale, "character"))}">
      ${EDITOR_STEPS.map((step, index) => {
        const visual = stepVisual(step, draft, resolved);
        const isActive = state.activeEditorStep === step;
        const numContent =
          visual === "complete"
            ? sprite("i-check")
            : `${index + 1}`;
        return `
        <button
          type="button"
          class="step-tab${isActive ? " active" : ""}${visual === "complete" ? " is-complete" : ""}${visual === "error" ? " is-error" : ""}"
          data-action="goto-step"
          data-step="${step}"
          role="tab"
          aria-selected="${isActive}"
        >
          <span class="step-num">${numContent}</span>
          <span class="step-label">
            <strong>${t(locale, STEP_LABEL[step])}</strong>
            <span>${t(locale, STEP_HINT[step])}</span>
          </span>
        </button>`;
      }).join("")}
    </nav>`;
}

function renderIdentityStep(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const portrait = draft.cosmetics.portraitDataUrl
    ? `<img src="${escapeHtml(draft.cosmetics.portraitDataUrl)}" alt="" />`
    : escapeHtml(t(locale, "portraitPlaceholder"));

  return `
    <div class="identity-grid">
      <div class="field">
        <label>${t(locale, "characterName")}</label>
        <input type="text" data-action="name" value="${escapeHtml(draft.name)}" maxlength="48" />
      </div>
      <div class="field">
        <label>${t(locale, "faction")}</label>
        <input type="text" data-action="faction" value="${escapeHtml(draft.faction ?? "")}" maxlength="48" />
      </div>
      <div class="field">
        <label>${t(locale, "cardSubtitle")}</label>
        <input type="text" data-action="subtitle" value="${escapeHtml(draft.subtitle ?? "")}" maxlength="64" />
      </div>
    </div>
    <div class="portrait-row">
      <div class="portrait-thumb">${portrait}</div>
      <div>
        <p class="portrait-hint">${t(locale, "portraitHint")}</p>
        <label class="upload-btn">
          ${sprite("i-sparkle", "")} ${t(locale, "portraitUpload")}
          <input type="file" accept="image/*" data-action="portrait-upload" hidden />
        </label>
        ${
          draft.cosmetics.portraitDataUrl
            ? `<button type="button" class="btn-ghost danger" data-action="portrait-remove" style="margin-left:8px">${t(locale, "portraitRemove")}</button>`
            : ""
        }
        <p class="portrait-error hidden" data-role="portrait-error"></p>
      </div>
    </div>`;
}

function renderStatsStep(locale: Locale, draft: CharacterBuild, resolved: ReturnType<typeof resolveCharacter>): string {
  return PURCHASABLE_STATS.map((stat) => {
    const value = draft.baseStats[stat];
    const cost =
      resolved.cost.attributes.find((entry) => entry.id === `attr:${stat}`)?.amount ?? 0;
    return `
      <div class="tile stat-tile">
        <div class="stat-tile-main">
          <span class="stat-code">${stat}</span>
          <span class="stat-icon-box">${sprite(STAT_SPRITES[stat])}</span>
          <span class="stat-name">${escapeHtml(statLabel(locale, stat))}</span>
          <div class="stepper">
            <button type="button" data-action="stat-dec" data-stat="${stat}" ${value <= 0 ? "disabled" : ""}>−</button>
            <span class="stat-value">${value}</span>
            <button type="button" data-action="stat-inc" data-stat="${stat}" ${value >= 6 ? "disabled" : ""}>+</button>
          </div>
        </div>
        <div class="stat-cost">${t(locale, "costPrefix")} <strong>${cost}</strong> ${t(locale, "points")}</div>
      </div>`;
  }).join("");
}

function renderEquipmentStep(
  locale: Locale,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
  catalog: GameCatalog,
): string {
  return EQUIPMENT_SLOTS.map((slot) => {
    const items = getItemsForSlot(catalog, slot);
    const current = draft.equipment[slot]?.itemId ?? "";
    const blocked = resolved.blockedSlots.includes(slot);
    return `
      <div class="tile eq-tile">
        <label>
          <span class="eq-icon-box">${sprite(EQ_SPRITES[slot])}</span>
          ${t(locale, SLOT_LABEL_KEYS[slot])}${blocked ? " 🔒" : ""}
        </label>
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
      </div>`;
  }).join("");
}

function renderTalentsStep(locale: Locale, draft: CharacterBuild, catalog: GameCatalog): string {
  return listAbilities(catalog)
    .map((ability) => {
      const checked = draft.talentIds.includes(ability.id);
      const disabled =
        !checked && draft.talentIds.length >= DEFAULT_RULESET.character.maxTalents;
      const polarity = ability.polarity === "negative" ? " negative" : "";
      const desc = ability.effects
        .map((e) => (e.display ? localize(e.display, locale) : ""))
        .filter(Boolean)
        .join(" · ");
      return `
        <label class="tile talent-tile${polarity}">
          <input
            type="checkbox"
            data-action="talent-toggle"
            data-talent="${ability.id}"
            ${checked ? "checked" : ""}
            ${disabled ? "disabled" : ""}
          />
          <span class="talent-copy">
            <strong>${escapeHtml(localize(ability.name, locale))}</strong>
            <span>${escapeHtml(desc || localize(ability.name, locale))}</span>
          </span>
          <span class="talent-cost">${ability.cost > 0 ? "+" : ""}${ability.cost}</span>
        </label>`;
    })
    .join("");
}

function renderSummary(
  locale: Locale,
  state: AppState,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  const inStash = state.team.characters.some((c) => c.id === state.draft.id);
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

  const validationRows =
    issues.length === 0
      ? `<div class="issue ok">${sprite("i-check")}<span>${t(locale, "noIssues")}</span></div>`
      : issues
          .map((issue) => {
            const icon = issue.severity === "error" ? "i-warn" : "i-check";
            const cls = issue.severity === "error" ? "error" : "warn";
            return `<div class="issue ${cls}">${sprite(icon)}<span>${escapeHtml(issue.text)}</span></div>`;
          })
          .join("") +
        (!inStash
          ? `<div class="issue warn">${sprite("i-warn")}<span>${t(locale, "notSavedWarning")}</span></div>`
          : "");

  return `
    <div class="summary-tile">
      <div class="summary-col">
        <h4>${t(locale, "costBreakdown")}</h4>
        <div class="cost-row"><span>${t(locale, "attributes")}</span><strong>${renderCostTotal(resolved.cost.attributes)} ${t(locale, "points")}</strong></div>
        <div class="cost-row"><span>${t(locale, "equipment")}</span><strong>${renderCostTotal(resolved.cost.equipment)} ${t(locale, "points")}</strong></div>
        <div class="cost-row"><span>${t(locale, "abilities")}</span><strong>${renderCostTotal(resolved.cost.abilities)} ${t(locale, "points")}</strong></div>
        <div class="cost-total"><span>${t(locale, "total")}</span><strong>${resolved.cost.total} ${t(locale, "points")}</strong></div>
      </div>
      <div class="summary-col">
        <h4>${t(locale, "validation")}</h4>
        ${validationRows}
      </div>
    </div>`;
}

function renderCostTotal(
  entries: { amount: number }[],
): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

function renderStepPanel(
  step: EditorStep,
  state: AppState,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  const locale = state.locale;
  const isActive = state.activeEditorStep === step;
  let body = "";

  if (step === "identity") {
    body = renderIdentityStep(state, draft);
  } else if (step === "stats") {
    body = `<div class="tile-grid stat-grid">${renderStatsStep(locale, draft, resolved)}</div>`;
  } else if (step === "equipment") {
    body = `<div class="tile-grid equipment-grid">${renderEquipmentStep(locale, draft, resolved, catalogFor(state))}</div>`;
  } else {
    body = `<div class="tile-grid talent-grid">${renderTalentsStep(locale, draft, catalogFor(state))}</div>${renderSummary(locale, state, resolved)}`;
  }

  return `
    <div class="panel step-panel${isActive ? " active" : ""}" data-panel="${step}" role="tabpanel">
      <div class="section-head">
        <span class="section-head-icon">${sprite(STEP_ICON[step])}</span>
        <div>
          <h2>${t(locale, STEP_SECTION[step])}</h2>
          <p class="section-head-meta">${t(locale, STEP_SECTION_HINT[step])}</p>
        </div>
      </div>
      ${body}
    </div>`;
}

function renderTeamBar(state: AppState): string {
  const locale = state.locale;
  const resolvedTeam = validateTeam(state.team, DEFAULT_RULESET, catalogFor(state));
  const budget = state.team.budget;
  const cost = resolvedTeam.totalCost;
  const reserve = Math.max(0, budget - cost);
  const ratio = Math.min(100, Math.round((cost / budget) * 100));
  const valid = resolvedTeam.validation.valid;

  return `
    <section class="team-bar">
      <div class="tb-identity">
        <div class="tb-name-row">
          <input type="text" data-action="team-name" value="${escapeHtml(state.team.name)}" maxlength="48" aria-label="${escapeHtml(t(locale, "teamName"))}" />
        </div>
        <div class="tb-theme-row">
          <label for="team-theme">${t(locale, "teamTheme")}</label>
          <select id="team-theme" data-action="card-theme">
            ${CARD_THEMES.map(
              (theme) => `
              <option value="${theme.id}" ${state.team.cardTheme.templateId === theme.id ? "selected" : ""}>
                ${escapeHtml(localize(theme.label, locale))}
              </option>`,
            ).join("")}
          </select>
        </div>
      </div>
      <div class="tb-budget">
        <div class="tb-budget-label">
          <span>${t(locale, "teamBudget")}</span>
          <strong>${cost} / ${budget} ${t(locale, "points")}</strong>
        </div>
        <div class="budget-bar"><div class="budget-fill" style="width:${ratio}%"></div></div>
        <div class="tb-metrics">
          <span>${t(locale, "charactersLabel")}<strong>${state.team.characters.length} / ${DEFAULT_RULESET.team.maximumCharacterCount}</strong></span>
          <span>${t(locale, "pointsReserve")}<strong>${reserve} ${t(locale, "points")}</strong></span>
          <span>${t(locale, "validityLabel")}<strong>${valid ? t(locale, "rulesCompliant") : t(locale, "teamInvalid")}</strong></span>
        </div>
      </div>
      <div class="tb-status${valid ? "" : " is-bad"}">
        ${sprite("i-check", "tb-status-icon")}
        <span class="tb-status-text">${valid ? t(locale, "teamReady") : t(locale, "teamInvalid")}</span>
      </div>
    </section>`;
}

function renderSidebar(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const catalog = catalogFor(state);
  const context = cardContext(state);
  const draftResolved = resolveCharacter(draft, DEFAULT_RULESET, catalog);
  const draftCard = buildCharacterCard(draftResolved, context);

  const teamTiles = state.team.characters.map((character) => {
    const resolved = resolveCharacter(character, DEFAULT_RULESET, catalog);
    const card = buildCharacterCard(resolved, context);
    return renderCharacterCard(locale, card, {
      variant: "stash",
      characterId: character.id,
      selected: state.activeCharacterId === character.id,
      draft: character.id === draft.id,
      interactive: true,
    });
  });

  const emptySlots = Math.max(
    0,
    DEFAULT_RULESET.team.recommendedCharacterCount - state.team.characters.length,
  );
  const emptyMarkup = Array.from({ length: emptySlots }, () =>
    renderEmptyStashSlot(locale),
  ).join("");

  return `
    <aside class="sidebar">
      <div class="theme-picker">
        <label for="card-theme">${t(locale, "cardThemeSidebar")}</label>
        <select id="card-theme" data-action="card-theme">
          ${CARD_THEMES.map(
            (theme) => `
            <option value="${theme.id}" ${context.templateId === theme.id ? "selected" : ""}>
              ${escapeHtml(localize(theme.label, locale))}
            </option>`,
          ).join("")}
        </select>
      </div>
      <div class="preview-wrap">
        ${renderCharacterCard(locale, draftCard, { variant: "full", draft: true })}
      </div>
      <div class="stash-wrap">
        <div class="stash-head">
          <h3>${sprite("i-users")} ${t(locale, "stashRoster")}</h3>
          <span class="stash-count">${state.team.characters.length} / ${DEFAULT_RULESET.team.maximumCharacterCount}</span>
        </div>
        <div class="stash-grid">${teamTiles.join("")}${emptyMarkup}</div>
      </div>
    </aside>`;
}

function renderEditorActions(state: AppState): string {
  const locale = state.locale;
  const inStash = state.team.characters.some((c) => c.id === state.draft.id);
  return `
    <div class="editor-actions">
      <button type="button" class="btn-primary" data-action="add-to-team">
        ${inStash ? t(locale, "updateInStash") : t(locale, "addToStash")}
      </button>
      <button type="button" class="btn-ghost" data-action="new-character">${t(locale, "newCharacter")}</button>
      ${
        inStash
          ? `<button type="button" class="btn-ghost danger" data-action="remove-active">${t(locale, "removeFromTeam")}</button>`
          : ""
      }
    </div>`;
}

export function renderApp(state: AppState): string {
  const locale = state.locale;
  const draft = state.draft;
  const catalog = catalogFor(state);
  const resolved = resolveCharacter(draft, DEFAULT_RULESET, catalog);

  return `
    ${SPRITE_DEFS}
    <div class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">${t(locale, state.appMode === "team" ? "pageEyebrow" : "catalogEyebrow")}</p>
          <h1>${t(locale, state.appMode === "team" ? "pageTitle" : "catalogPageTitle")}</h1>
        </div>
        <div class="header-actions">
          <nav class="mode-switch" aria-label="${t(locale, "appModeLabel")}">
            <button type="button" data-action="app-mode" data-mode="team" class="${state.appMode === "team" ? "active" : ""}">
              ${t(locale, "modeTeam")}
            </button>
            <button type="button" data-action="app-mode" data-mode="catalog" class="${state.appMode === "catalog" ? "active" : ""}">
              ${t(locale, "modeCatalog")}
            </button>
          </nav>
          ${
            state.appMode === "catalog"
              ? `
          <div class="catalog-header-actions">
            <button type="button" class="btn-ghost" data-action="import-catalog">${t(locale, "importCatalog")}</button>
            <button type="button" class="btn-ghost" data-action="export-catalog">${t(locale, "exportCatalog")}</button>
            <button type="button" class="btn-ghost" data-action="reset-catalog">${t(locale, "resetCatalog")}</button>
            <input type="file" accept="application/json,.json" data-action="catalog-file" hidden />
          </div>`
              : ""
          }
          <div class="locale-switch">
            <button type="button" data-action="locale" data-locale="pl" class="${locale === "pl" ? "active" : ""}">PL</button>
            <button type="button" data-action="locale" data-locale="en" class="${locale === "en" ? "active" : ""}">EN</button>
          </div>
        </div>
      </header>

      ${
        state.appMode === "catalog"
          ? renderCatalogMode(state)
          : `
      ${renderTeamBar(state)}

      <div class="workspace">
        <div class="configurator">
          ${renderStepper(locale, state, draft, resolved)}
          ${EDITOR_STEPS.map((step) => renderStepPanel(step, state, draft, resolved)).join("")}
          ${renderEditorActions(state)}
        </div>
        ${renderSidebar(state, draft)}
      </div>`
      }
      <p class="catalog-toast hidden" data-role="catalog-toast" aria-live="polite"></p>
    </div>`;
}
