import {
  attributeCost,
  buildCharacterCard,
  DEFAULT_RULESET,
  getItemsForSlot,
  listAbilities,
  localize,
  resolveCharacter,
  validateTeam,
} from "@hobt/lego-skirmish";
import type {
  AbilityDefinition,
  CharacterBuild,
  EquipmentSlot,
  GameCatalog,
  ItemDefinition,
  PurchasableStat,
  ValidationIssue,
} from "@hobt/lego-skirmish/types/domain.js";
import { EQUIPMENT_SLOTS } from "@hobt/lego-skirmish/types/domain.js";
import { renderHeroCard } from "./card-view.js";
import { renderCatalogMode } from "./catalog-render.js";
import { CARD_THEMES, t, type Locale } from "./i18n.js";
import { EQUIPMENT_ICONS, STAT_ICONS, icon, type IconId } from "./icons.js";
import type { AppMode, AppState, EditorStep } from "./state.js";

const PURCHASABLE_STATS: PurchasableStat[] = [
  "MS",
  "RS",
  "LS",
  "KS",
  "HP",
  "MP",
];

const SLOT_LABEL_KEYS: Record<
  EquipmentSlot,
  "slotMainWeapon" | "slotOffhand" | "slotArmor" | "slotItem1" | "slotItem2"
> = {
  mainWeapon: "slotMainWeapon",
  offhand: "slotOffhand",
  armor: "slotArmor",
  item1: "slotItem1",
  item2: "slotItem2",
};

const STAT_LABEL_KEYS: Record<
  PurchasableStat,
  "statMS" | "statRS" | "statLS" | "statKS" | "statHP" | "statMP"
> = {
  MS: "statMS",
  RS: "statRS",
  LS: "statLS",
  KS: "statKS",
  HP: "statHP",
  MP: "statMP",
};

interface StepDefinition {
  id: EditorStep;
  icon: IconId;
  number: string;
  titleKey:
    | "stepIdentity"
    | "stepStats"
    | "stepEquipment"
    | "stepTalents"
    | "stepSummary";
  hintKey:
    | "stepIdentityHint"
    | "stepStatsHint"
    | "stepEquipmentHint"
    | "stepTalentsHint"
    | "stepSummaryHint";
}

const STEPS: StepDefinition[] = [
  {
    id: "identity",
    icon: "user",
    number: "01",
    titleKey: "stepIdentity",
    hintKey: "stepIdentityHint",
  },
  {
    id: "stats",
    icon: "hand-fist",
    number: "02",
    titleKey: "stepStats",
    hintKey: "stepStatsHint",
  },
  {
    id: "equipment",
    icon: "shield",
    number: "03",
    titleKey: "stepEquipment",
    hintKey: "stepEquipmentHint",
  },
  {
    id: "talents",
    icon: "sparkle",
    number: "04",
    titleKey: "stepTalents",
    hintKey: "stepTalentsHint",
  },
  {
    id: "summary",
    icon: "check",
    number: "05",
    titleKey: "stepSummary",
    hintKey: "stepSummaryHint",
  },
];

function catalogFor(state: AppState): GameCatalog {
  return state.catalogDocument.catalog;
}

function cardContext(state: AppState, cardNumber?: string) {
  return {
    teamName: state.team.name,
    templateId: state.team.cardTheme.templateId,
    decorationLevel: state.team.cardTheme.decorLevel,
    locale: state.locale,
    cardNumber,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function itemCost(item: ItemDefinition | undefined): number {
  if (!item) {
    return 0;
  }
  const positive = item.cost.effectLevels?.positive ?? 0;
  const negative = item.cost.effectLevels?.negative ?? 0;
  const positiveCost =
    positive > 0 ? (100 * positive * (positive + 1)) / 2 : 0;
  const negativeCost =
    negative > 0 ? -((100 * negative * (negative + 1)) / 2) : 0;
  return (item.cost.fixed ?? 0) + positiveCost + negativeCost;
}

function itemDescription(item: ItemDefinition, locale: Locale): string {
  const descriptions = [
    ...item.actions.map((action) => {
      const details = [
        action.testStat ? `${action.testStat}` : "",
        action.damage !== undefined ? `DMG ${action.damage}` : "",
        action.requiresLineOfSight ? "LoS" : "",
      ].filter(Boolean);
      return `${localize(action.name, locale)}${details.length ? ` · ${details.join(" · ")}` : ""}`;
    }),
    ...item.effects.flatMap((effect) =>
      effect.display ? [localize(effect.display, locale)] : [],
    ),
    ...item.restrictions.flatMap((restriction) =>
      restriction.display ? [localize(restriction.display, locale)] : [],
    ),
  ];
  return descriptions.join(" · ") || localize(item.name, locale);
}

function abilityDescription(
  ability: AbilityDefinition,
  locale: Locale,
): string {
  const effects = ability.effects.flatMap((effect) =>
    effect.display ? [localize(effect.display, locale)] : [],
  );
  const restrictions = ability.restrictions.flatMap((restriction) =>
    restriction.display ? [localize(restriction.display, locale)] : [],
  );
  return [...effects, ...restrictions].join(" · ") || localize(ability.name, locale);
}

function portraitStyle(character: CharacterBuild): string {
  const x = character.cosmetics.portraitPositionX ?? 50;
  const y = character.cosmetics.portraitPositionY ?? 50;
  const zoom = character.cosmetics.portraitZoom ?? 1;
  return `object-position:${x}% ${y}%;transform:scale(${zoom});transform-origin:${x}% ${y}%`;
}

function renderBrand(locale: Locale): string {
  return `
    <button type="button" class="brand" data-action="app-mode" data-mode="builder">
      <span class="brand-emblem" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </span>
      <span class="brand-copy">
        <strong>HOBT</strong>
        <small>${escapeHtml(t(locale, "brandTitle"))}</small>
      </span>
    </button>`;
}

function renderHeader(state: AppState, teamCost: number): string {
  const locale = state.locale;
  const remaining = state.team.budget - teamCost;
  const ratio = Math.min(100, Math.max(0, (teamCost / state.team.budget) * 100));

  return `
    <header class="site-header no-print">
      ${renderBrand(locale)}
      <div class="header-team">
        <label>
          <span>${escapeHtml(t(locale, "teamName"))}</span>
          <input
            type="text"
            value="${escapeHtml(state.team.name)}"
            maxlength="48"
            data-action="team-name"
          />
        </label>
      </div>
      <div class="header-budget">
        <div>
          <span>${escapeHtml(t(locale, "teamBudget"))}</span>
          <strong>${teamCost} / ${state.team.budget}</strong>
        </div>
        <div class="budget-track" aria-hidden="true"><span style="width:${ratio}%"></span></div>
        <small class="${remaining < 0 ? "is-over" : ""}">
          ${remaining >= 0 ? `${remaining} ${t(locale, "pointsReserve").toLowerCase()}` : `${Math.abs(remaining)} ${t(locale, "pointsOverBudget")}`}
        </small>
      </div>
      <div class="header-actions">
        <label class="theme-select">
          <span>${icon("sparkle")}</span>
          <select data-action="card-theme" aria-label="${escapeHtml(t(locale, "teamTheme"))}">
            ${CARD_THEMES.map(
              (theme) => `
              <option value="${theme.id}" ${state.team.cardTheme.templateId === theme.id ? "selected" : ""}>
                ${escapeHtml(localize(theme.label, locale))}
              </option>`,
            ).join("")}
          </select>
        </label>
        <div class="language" aria-label="Language">
          <button type="button" data-action="locale" data-locale="pl" class="${locale === "pl" ? "active" : ""}">PL</button>
          <button type="button" data-action="locale" data-locale="en" class="${locale === "en" ? "active" : ""}">EN</button>
        </div>
      </div>
    </header>`;
}

function renderNavigation(state: AppState): string {
  const locale = state.locale;
  const nav: Array<{
    mode: AppMode;
    label: string;
    iconId: IconId;
    count?: number;
  }> = [
    {
      mode: "builder",
      label: t(locale, "navBuilder"),
      iconId: "sparkle",
    },
    {
      mode: "collection",
      label: t(locale, "navCollection"),
      iconId: "users",
      count: state.team.characters.length,
    },
    {
      mode: "print",
      label: t(locale, "navPrint"),
      iconId: "list",
      count: state.selectedForPrint.length,
    },
    {
      mode: "catalog",
      label: t(locale, "navCatalog"),
      iconId: "shield",
    },
  ];

  return `
    <nav class="product-nav no-print" aria-label="${escapeHtml(t(locale, "appModeLabel"))}">
      ${nav
        .map(
          (entry) => `
          <button
            type="button"
            class="${state.appMode === entry.mode ? "active" : ""}"
            data-action="app-mode"
            data-mode="${entry.mode}"
          >
            ${icon(entry.iconId)}
            <span>${escapeHtml(entry.label)}</span>
            ${entry.count !== undefined ? `<b>${entry.count}</b>` : ""}
          </button>`,
        )
        .join("")}
    </nav>`;
}

function isStepComplete(
  step: EditorStep,
  state: AppState,
  resolved: ReturnType<typeof resolveCharacter>,
): boolean {
  if (step === "identity") {
    return Boolean(state.draft.name.trim());
  }
  if (step === "stats") {
    return resolved.derivedStats.HP > 0 && resolved.derivedStats.MP > 0;
  }
  if (step === "equipment") {
    return Object.keys(state.draft.equipment).length > 0;
  }
  if (step === "talents") {
    return state.draft.talentIds.length > 0;
  }
  return Boolean(state.draft.name.trim()) && resolved.validation.valid;
}

function renderStepRail(
  state: AppState,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  return `
    <nav class="step-rail no-print" aria-label="${escapeHtml(t(state.locale, "builderSteps"))}">
      ${STEPS.map((step) => {
        const active = state.activeEditorStep === step.id;
        const complete = isStepComplete(step.id, state, resolved);
        return `
          <button
            type="button"
            data-action="goto-step"
            data-step="${step.id}"
            class="${active ? "active" : ""} ${complete ? "complete" : ""}"
            aria-current="${active ? "step" : "false"}"
          >
            <span class="step-number">${complete ? icon("check") : step.number}</span>
            <span class="step-copy">
              <strong>${escapeHtml(t(state.locale, step.titleKey))}</strong>
              <small>${escapeHtml(t(state.locale, step.hintKey))}</small>
            </span>
          </button>`;
      }).join("")}
    </nav>`;
}

function renderPortraitEditor(state: AppState): string {
  const locale = state.locale;
  const portrait = state.draft.cosmetics.portraitDataUrl;
  const x = state.draft.cosmetics.portraitPositionX ?? 50;
  const y = state.draft.cosmetics.portraitPositionY ?? 50;
  const zoom = state.draft.cosmetics.portraitZoom ?? 1;

  return `
    <div class="portrait-editor">
      <div class="portrait-workbench ${portrait ? "has-image" : ""}">
        ${
          portrait
            ? `<img src="${escapeHtml(portrait)}" alt="${escapeHtml(state.draft.name)}" style="${portraitStyle(state.draft)}" />`
            : `<div class="portrait-empty">${icon("user")}<strong>${escapeHtml(t(locale, "addPortraitTitle"))}</strong><span>${escapeHtml(t(locale, "portraitHint"))}</span></div>`
        }
        <label class="portrait-upload">
          ${icon("sparkle")}
          <span>${escapeHtml(portrait ? t(locale, "portraitReplace") : t(locale, "portraitUpload"))}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" data-action="portrait-upload" hidden />
        </label>
      </div>
      <div class="portrait-controls ${portrait ? "" : "is-disabled"}">
        <div class="control-heading">
          <div>
            <span class="eyebrow">${escapeHtml(t(locale, "portraitCrop"))}</span>
            <strong>${escapeHtml(t(locale, "portraitCropHint"))}</strong>
          </div>
          ${
            portrait
              ? `<button type="button" class="text-button danger" data-action="portrait-remove">${escapeHtml(t(locale, "portraitRemove"))}</button>`
              : ""
          }
        </div>
        <label class="range-field">
          <span>${escapeHtml(t(locale, "portraitHorizontal"))}<output>${Math.round(x)}%</output></span>
          <input type="range" min="0" max="100" step="1" value="${x}" data-action="portrait-x" ${portrait ? "" : "disabled"} />
        </label>
        <label class="range-field">
          <span>${escapeHtml(t(locale, "portraitVertical"))}<output>${Math.round(y)}%</output></span>
          <input type="range" min="0" max="100" step="1" value="${y}" data-action="portrait-y" ${portrait ? "" : "disabled"} />
        </label>
        <label class="range-field">
          <span>${escapeHtml(t(locale, "portraitZoom"))}<output>${zoom.toFixed(2)}×</output></span>
          <input type="range" min="1" max="2" step="0.02" value="${zoom}" data-action="portrait-zoom" ${portrait ? "" : "disabled"} />
        </label>
        <p class="field-error hidden" data-role="portrait-error" aria-live="polite"></p>
      </div>
    </div>`;
}

function renderIdentityStep(state: AppState): string {
  const locale = state.locale;
  return `
    <div class="step-intro">
      <span class="eyebrow">${escapeHtml(t(locale, "identityEyebrow"))}</span>
      <h2>${escapeHtml(t(locale, "identityTitleNew"))}</h2>
      <p>${escapeHtml(t(locale, "identityDescription"))}</p>
    </div>
    <div class="identity-fields">
      <label class="form-field form-field-wide">
        <span>${escapeHtml(t(locale, "characterName"))}<b aria-hidden="true">*</b></span>
        <input
          type="text"
          data-action="name"
          value="${escapeHtml(state.draft.name)}"
          maxlength="48"
          placeholder="${escapeHtml(t(locale, "characterNamePlaceholder"))}"
          autocomplete="off"
        />
        ${state.draft.name.trim() ? "" : `<small class="field-error">${escapeHtml(t(locale, "nameRequired"))}</small>`}
      </label>
      <label class="form-field">
        <span>${escapeHtml(t(locale, "cardSubtitle"))}</span>
        <input
          type="text"
          data-action="subtitle"
          value="${escapeHtml(state.draft.subtitle ?? "")}"
          maxlength="64"
          placeholder="${escapeHtml(t(locale, "subtitlePlaceholder"))}"
          autocomplete="off"
        />
      </label>
      <label class="form-field">
        <span>${escapeHtml(t(locale, "faction"))}</span>
        <input
          type="text"
          data-action="faction"
          value="${escapeHtml(state.draft.faction ?? "")}"
          maxlength="48"
          placeholder="${escapeHtml(t(locale, "factionPlaceholder"))}"
          autocomplete="off"
        />
      </label>
    </div>
    ${renderPortraitEditor(state)}`;
}

function renderStatsStep(
  state: AppState,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  const locale = state.locale;
  return `
    <div class="step-intro">
      <span class="eyebrow">${escapeHtml(t(locale, "statsEyebrow"))}</span>
      <h2>${escapeHtml(t(locale, "statsTitleNew"))}</h2>
      <p>${escapeHtml(t(locale, "statsDescription"))}</p>
    </div>
    <div class="stats-builder">
      ${PURCHASABLE_STATS.map((stat) => {
        const value = state.draft.baseStats[stat];
        const derived = resolved.derivedStats[stat];
        const modified = derived !== value;
        return `
          <article class="stat-builder-card ${stat === "HP" ? "is-hp" : ""} ${stat === "MP" ? "is-mp" : ""}">
            <div class="stat-builder-icon">${icon(STAT_ICONS[stat])}</div>
            <div class="stat-builder-copy">
              <span>${stat}</span>
              <strong>${escapeHtml(t(locale, STAT_LABEL_KEYS[stat]))}</strong>
              <small>${attributeCost(value)} ${escapeHtml(t(locale, "points").toLowerCase())}${modified ? ` · ${t(locale, "finalValue")} ${derived}` : ""}</small>
            </div>
            <div class="counter" role="group" aria-label="${escapeHtml(t(locale, STAT_LABEL_KEYS[stat]))}">
              <button type="button" data-action="stat-dec" data-stat="${stat}" ${value <= DEFAULT_RULESET.attributes.minLevel ? "disabled" : ""} aria-label="${escapeHtml(t(locale, "decrease"))} ${stat}">−</button>
              <output>${value}</output>
              <button type="button" data-action="stat-inc" data-stat="${stat}" ${value >= DEFAULT_RULESET.attributes.maxLevel ? "disabled" : ""} aria-label="${escapeHtml(t(locale, "increase"))} ${stat}">+</button>
            </div>
          </article>`;
      }).join("")}
    </div>
    <div class="inline-note">${icon("warn")}<span>${escapeHtml(t(locale, "statCostNote"))}</span></div>`;
}

function renderEquipmentStep(
  state: AppState,
  resolved: ReturnType<typeof resolveCharacter>,
  catalog: GameCatalog,
): string {
  const locale = state.locale;
  return `
    <div class="step-intro step-intro-with-action">
      <div>
        <span class="eyebrow">${escapeHtml(t(locale, "equipmentEyebrow"))}</span>
        <h2>${escapeHtml(t(locale, "equipmentTitleNew"))}</h2>
        <p>${escapeHtml(t(locale, "equipmentDescription"))}</p>
      </div>
      <button type="button" class="button button-secondary" data-action="open-catalog" data-tab="items">
        ${icon("list")}<span>${escapeHtml(t(locale, "openItemCatalog"))}</span>
      </button>
    </div>
    <div class="equipment-builder">
      ${EQUIPMENT_SLOTS.map((slot) => {
        const items = getItemsForSlot(catalog, slot);
        const selectedId = state.draft.equipment[slot]?.itemId ?? "";
        const selectedItem = selectedId ? catalog.items[selectedId] : undefined;
        const blocked = resolved.blockedSlots.includes(slot);
        return `
          <article class="equipment-slot-card ${selectedItem ? "is-filled" : ""} ${blocked ? "is-blocked" : ""}">
            <div class="equipment-slot-heading">
              <span class="equipment-slot-icon">${icon(EQUIPMENT_ICONS[slot])}</span>
              <div>
                <span>${escapeHtml(t(locale, SLOT_LABEL_KEYS[slot]))}</span>
                <strong>${escapeHtml(selectedItem ? localize(selectedItem.name, locale) : t(locale, "emptySlot"))}</strong>
              </div>
              ${
                selectedItem
                  ? `<b class="${itemCost(selectedItem) < 0 ? "negative-cost" : ""}">${itemCost(selectedItem) > 0 ? "+" : ""}${itemCost(selectedItem)} ${escapeHtml(t(locale, "pointsShort"))}</b>`
                  : ""
              }
            </div>
            <p>${escapeHtml(selectedItem ? itemDescription(selectedItem, locale) : t(locale, "slotEmptyHint"))}</p>
            <label>
              <span class="sr-only">${escapeHtml(t(locale, SLOT_LABEL_KEYS[slot]))}</span>
              <select data-action="equipment" data-slot="${slot}" ${blocked ? "disabled" : ""}>
                <option value="">${escapeHtml(t(locale, "selectItem"))}</option>
                ${items
                  .map(
                    (item) => `
                    <option value="${escapeHtml(item.id)}" ${selectedId === item.id ? "selected" : ""}>
                      ${escapeHtml(localize(item.name, locale))} · ${itemCost(item) >= 0 ? "+" : ""}${itemCost(item)} ${escapeHtml(t(locale, "pointsShort"))}
                    </option>`,
                  )
                  .join("")}
              </select>
            </label>
            ${blocked ? `<span class="blocked-message">${icon("warn")}${escapeHtml(t(locale, "slotBlocked"))}</span>` : ""}
          </article>`;
      }).join("")}
    </div>`;
}

function renderTalentsStep(state: AppState, catalog: GameCatalog): string {
  const locale = state.locale;
  const abilities = listAbilities(catalog);
  const selectedCount = state.draft.talentIds.length;

  return `
    <div class="step-intro step-intro-with-action">
      <div>
        <span class="eyebrow">${escapeHtml(t(locale, "talentsEyebrow"))}</span>
        <h2>${escapeHtml(t(locale, "talentsTitleNew"))}</h2>
        <p>${escapeHtml(t(locale, "talentsDescription"))}</p>
      </div>
      <div class="selection-counter">
        <strong>${selectedCount} / ${DEFAULT_RULESET.character.maxTalents}</strong>
        <span>${escapeHtml(t(locale, "selectedTalents"))}</span>
      </div>
    </div>
    <div class="talent-builder">
      ${abilities
        .map((ability) => {
          const selected = state.draft.talentIds.includes(ability.id);
          const disabled =
            !selected && selectedCount >= DEFAULT_RULESET.character.maxTalents;
          const negative = ability.polarity === "negative";
          return `
            <label class="talent-option ${selected ? "is-selected" : ""} ${negative ? "is-negative" : ""} ${disabled ? "is-disabled" : ""}">
              <input
                type="checkbox"
                data-action="talent-toggle"
                data-talent="${escapeHtml(ability.id)}"
                ${selected ? "checked" : ""}
                ${disabled ? "disabled" : ""}
              />
              <span class="talent-check">${selected ? icon("check") : ""}</span>
              <span class="talent-symbol">${icon(negative ? "warn" : "sparkle")}</span>
              <span class="talent-copy">
                <strong>${escapeHtml(localize(ability.name, locale))}</strong>
                <small>${escapeHtml(abilityDescription(ability, locale))}</small>
              </span>
              <b class="${negative ? "negative-cost" : ""}">${ability.cost > 0 ? "+" : ""}${ability.cost} ${escapeHtml(t(locale, "pointsShort"))}</b>
            </label>`;
        })
        .join("")}
    </div>
    <button type="button" class="button button-secondary catalog-inline-button" data-action="open-catalog" data-tab="abilities">
      ${icon("list")}<span>${escapeHtml(t(locale, "openAbilityCatalog"))}</span>
    </button>`;
}

function renderIssue(locale: Locale, issue: ValidationIssue): string {
  return `
    <li class="${issue.severity}">
      ${icon(issue.severity === "error" ? "warn" : "sparkle")}
      <span>${escapeHtml(localize(issue.message, locale))}</span>
    </li>`;
}

function renderSummaryStep(
  state: AppState,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  const locale = state.locale;
  const identityIssues = state.draft.name.trim()
    ? []
    : [
        {
          code: "name_required",
          severity: "error" as const,
          message: { pl: t("pl", "nameRequired"), en: t("en", "nameRequired") },
          field: "name",
        },
      ];
  const issues = [
    ...identityIssues,
    ...resolved.validation.errors,
    ...resolved.validation.warnings,
  ];
  const costs = [
    {
      label: t(locale, "attributes"),
      amount: resolved.cost.attributes.reduce((sum, entry) => sum + entry.amount, 0),
    },
    {
      label: t(locale, "equipment"),
      amount: resolved.cost.equipment.reduce((sum, entry) => sum + entry.amount, 0),
    },
    {
      label: t(locale, "talents"),
      amount: resolved.cost.abilities.reduce((sum, entry) => sum + entry.amount, 0),
    },
  ];

  return `
    <div class="step-intro">
      <span class="eyebrow">${escapeHtml(t(locale, "summaryEyebrow"))}</span>
      <h2>${escapeHtml(t(locale, "summaryTitle"))}</h2>
      <p>${escapeHtml(t(locale, "summaryDescription"))}</p>
    </div>
    <div class="summary-grid">
      <section class="summary-card cost-summary">
        <span class="eyebrow">${escapeHtml(t(locale, "costBreakdown"))}</span>
        ${costs
          .map(
            (entry) => `
            <div><span>${escapeHtml(entry.label)}</span><strong>${entry.amount >= 0 ? "+" : ""}${entry.amount}</strong></div>`,
          )
          .join("")}
        <div class="summary-total"><span>${escapeHtml(t(locale, "characterCost"))}</span><strong>${resolved.cost.total} ${escapeHtml(t(locale, "pointsShort"))}</strong></div>
      </section>
      <section class="summary-card validation-summary">
        <span class="eyebrow">${escapeHtml(t(locale, "validation"))}</span>
        ${
          issues.length === 0
            ? `<div class="success-message">${icon("check")}<div><strong>${escapeHtml(t(locale, "characterRulesOk"))}</strong><span>${escapeHtml(t(locale, "readyToSave"))}</span></div></div>`
            : `<ul class="issue-list">${issues.map((issue) => renderIssue(locale, issue)).join("")}</ul>`
        }
      </section>
    </div>`;
}

function renderActiveStep(
  state: AppState,
  resolved: ReturnType<typeof resolveCharacter>,
  catalog: GameCatalog,
): string {
  switch (state.activeEditorStep) {
    case "identity":
      return renderIdentityStep(state);
    case "stats":
      return renderStatsStep(state, resolved);
    case "equipment":
      return renderEquipmentStep(state, resolved, catalog);
    case "talents":
      return renderTalentsStep(state, catalog);
    case "summary":
      return renderSummaryStep(state, resolved);
  }
}

function nextStep(step: EditorStep): EditorStep | null {
  const index = STEPS.findIndex((entry) => entry.id === step);
  return STEPS[index + 1]?.id ?? null;
}

function previousStep(step: EditorStep): EditorStep | null {
  const index = STEPS.findIndex((entry) => entry.id === step);
  return STEPS[index - 1]?.id ?? null;
}

function renderBuilder(state: AppState): string {
  const locale = state.locale;
  const catalog = catalogFor(state);
  const resolved = resolveCharacter(state.draft, DEFAULT_RULESET, catalog);
  const card = buildCharacterCard(resolved, cardContext(state));
  const existing = state.team.characters.some(
    (character) => character.id === state.draft.id,
  );
  const canSave = Boolean(state.draft.name.trim()) && resolved.validation.valid;
  const next = nextStep(state.activeEditorStep);
  const previous = previousStep(state.activeEditorStep);

  return `
    <section class="builder-page">
      <div class="builder-toolbar no-print">
        <div>
          <span class="eyebrow">${escapeHtml(existing ? t(locale, "editingHero") : t(locale, "creatingHero"))}</span>
          <strong>${escapeHtml(state.draft.name || t(locale, "newCharacter"))}</strong>
        </div>
        <div class="builder-toolbar-cost">
          <span>${escapeHtml(t(locale, "characterCost"))}</span>
          <strong>${resolved.cost.total} ${escapeHtml(t(locale, "pointsShort"))}</strong>
        </div>
        <button type="button" class="button button-ghost" data-action="new-character">${icon("sparkle")}<span>${escapeHtml(t(locale, "newCharacter"))}</span></button>
        <button type="button" class="button button-primary" data-action="add-to-team" ${canSave ? "" : "disabled"}>
          ${icon("check")}<span>${escapeHtml(existing ? t(locale, "updateInStash") : t(locale, "saveToTeam"))}</span>
        </button>
      </div>

      <div class="mobile-view-switch no-print" role="tablist" aria-label="${escapeHtml(t(locale, "mobileView"))}">
        <button type="button" data-action="mobile-view" data-view="editor" class="${state.mobileBuilderView === "editor" ? "active" : ""}">${icon("list")}${escapeHtml(t(locale, "editorView"))}</button>
        <button type="button" data-action="mobile-view" data-view="preview" class="${state.mobileBuilderView === "preview" ? "active" : ""}">${icon("sparkle")}${escapeHtml(t(locale, "previewView"))}</button>
      </div>

      <div class="builder-layout mobile-${state.mobileBuilderView}">
        ${renderStepRail(state, resolved)}
        <section class="builder-editor no-print">
          <div class="builder-editor-body">
            ${renderActiveStep(state, resolved, catalog)}
          </div>
          <div class="step-actions">
            ${
              previous
                ? `<button type="button" class="button button-ghost" data-action="goto-step" data-step="${previous}">← ${escapeHtml(t(locale, "previousStep"))}</button>`
                : `<span></span>`
            }
            ${
              next
                ? `<button type="button" class="button button-secondary" data-action="goto-step" data-step="${next}">${escapeHtml(t(locale, "nextStep"))} →</button>`
                : `<button type="button" class="button button-primary" data-action="add-to-team" ${canSave ? "" : "disabled"}>${icon("check")}<span>${escapeHtml(existing ? t(locale, "updateInStash") : t(locale, "saveToTeam"))}</span></button>`
            }
          </div>
        </section>
        <aside class="card-preview-panel">
          <div class="preview-panel-heading no-print">
            <div>
              <span class="eyebrow">${escapeHtml(t(locale, "cardPreviewLabel"))}</span>
              <strong>${escapeHtml(t(locale, "livePreview"))}</strong>
            </div>
            <span class="live-indicator"><i></i>${escapeHtml(t(locale, "live"))}</span>
          </div>
          <div class="preview-stage">${renderHeroCard(locale, card, "preview")}</div>
          <p class="preview-note no-print">${icon("warn")}<span>${escapeHtml(t(locale, "printScaleHint"))}</span></p>
        </aside>
      </div>
    </section>`;
}

function renderEmptyCollection(state: AppState): string {
  return `
    <div class="empty-state">
      <span class="empty-emblem">${icon("users")}</span>
      <span class="eyebrow">${escapeHtml(t(state.locale, "collectionEyebrow"))}</span>
      <h2>${escapeHtml(t(state.locale, "emptyCollectionTitle"))}</h2>
      <p>${escapeHtml(t(state.locale, "emptyCollectionDescription"))}</p>
      <button type="button" class="button button-primary" data-action="new-character">${icon("sparkle")}<span>${escapeHtml(t(state.locale, "createFirstHero"))}</span></button>
    </div>`;
}

function renderCollection(state: AppState): string {
  const locale = state.locale;
  const catalog = catalogFor(state);
  const teamResult = validateTeam(state.team, DEFAULT_RULESET, catalog);

  if (state.team.characters.length === 0) {
    return `<section class="collection-page">${renderEmptyCollection(state)}</section>`;
  }

  return `
    <section class="collection-page">
      <header class="page-heading no-print">
        <div>
          <span class="eyebrow">${escapeHtml(t(locale, "collectionEyebrow"))}</span>
          <h1>${escapeHtml(t(locale, "collectionTitle"))}</h1>
          <p>${escapeHtml(t(locale, "collectionDescription"))}</p>
        </div>
        <div class="page-heading-actions">
          <button type="button" class="button button-ghost" data-action="new-character">${icon("sparkle")}<span>${escapeHtml(t(locale, "newCharacter"))}</span></button>
          <button type="button" class="button button-primary" data-action="app-mode" data-mode="print">${icon("list")}<span>${escapeHtml(t(locale, "preparePrint"))}</span></button>
        </div>
      </header>
      <div class="collection-summary no-print">
        <div><span>${escapeHtml(t(locale, "charactersLabel"))}</span><strong>${state.team.characters.length}</strong></div>
        <div><span>${escapeHtml(t(locale, "teamCost"))}</span><strong>${teamResult.totalCost} / ${state.team.budget}</strong></div>
        <div><span>${escapeHtml(t(locale, "selectedForPrint"))}</span><strong>${state.selectedForPrint.length}</strong></div>
        <div class="${teamResult.validation.valid ? "is-valid" : "is-warning"}">${icon(teamResult.validation.valid ? "check" : "warn")}<strong>${escapeHtml(teamResult.validation.valid ? t(locale, "teamValid") : t(locale, "teamNeedsWork"))}</strong></div>
      </div>
      <div class="collection-grid">
        ${state.team.characters
          .map((character, index) => {
            const resolved = resolveCharacter(character, DEFAULT_RULESET, catalog);
            const card = buildCharacterCard(
              resolved,
              cardContext(state, String(index + 1).padStart(2, "0")),
            );
            const selected = state.selectedForPrint.includes(character.id);
            return `
              <article class="collection-item ${selected ? "is-print-selected" : ""}">
                <label class="print-selector no-print">
                  <input type="checkbox" data-action="print-select" data-character="${escapeHtml(character.id)}" ${selected ? "checked" : ""} />
                  <span>${icon("check")}</span>
                  <b>${escapeHtml(t(locale, "toPrint"))}</b>
                </label>
                <div class="collection-card-stage">${renderHeroCard(locale, card, "library")}</div>
                <div class="collection-item-meta no-print">
                  <div>
                    <strong>${escapeHtml(character.name)}</strong>
                    <span>${resolved.cost.total} ${escapeHtml(t(locale, "pointsShort"))} · ${resolved.validation.valid ? t(locale, "ready") : t(locale, "needsFix")}</span>
                  </div>
                  <div class="collection-actions">
                    <button type="button" data-action="select-character" data-character="${escapeHtml(character.id)}" title="${escapeHtml(t(locale, "edit"))}">${icon("sparkle")}<span>${escapeHtml(t(locale, "edit"))}</span></button>
                    <button type="button" data-action="duplicate-character" data-character="${escapeHtml(character.id)}" title="${escapeHtml(t(locale, "duplicate"))}">${icon("list")}<span>${escapeHtml(t(locale, "duplicate"))}</span></button>
                    <button type="button" class="danger" data-action="remove-character" data-character="${escapeHtml(character.id)}" title="${escapeHtml(t(locale, "delete"))}">${icon("warn")}<span>${escapeHtml(t(locale, "delete"))}</span></button>
                  </div>
                </div>
              </article>`;
          })
          .join("")}
      </div>
    </section>`;
}

interface PrintCardEntry {
  id: string;
  name: string;
  card: ReturnType<typeof buildCharacterCard>;
}

function buildPrintEntries(state: AppState): PrintCardEntry[] {
  const catalog = catalogFor(state);
  const entries: PrintCardEntry[] = [];
  for (const character of state.team.characters) {
    if (!state.selectedForPrint.includes(character.id)) {
      continue;
    }
    const copies = state.printCopies[character.id] ?? 1;
    const resolved = resolveCharacter(character, DEFAULT_RULESET, catalog);
    const card = buildCharacterCard(resolved, cardContext(state));
    for (let index = 0; index < copies; index += 1) {
      entries.push({ id: `${character.id}-${index}`, name: character.name, card });
    }
  }
  return entries;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function renderPrintPage(
  state: AppState,
  entries: PrintCardEntry[],
  pageIndex: number,
  pageCount: number,
): string {
  return `
    <section class="print-sheet ${state.showCutLines ? "show-cut-lines" : ""}">
      <div class="print-sheet-meta no-print">
        <span>A4</span>
        <strong>${escapeHtml(t(state.locale, "sheet"))} ${pageIndex + 1} / ${pageCount}</strong>
      </div>
      <div class="print-grid">
        ${entries
          .map(
            (entry) => `
            <div class="print-card-cell" data-print-name="${escapeHtml(entry.name)}">
              ${renderHeroCard(state.locale, entry.card, "print")}
            </div>`,
          )
          .join("")}
      </div>
    </section>`;
}

function renderPrintMode(state: AppState): string {
  const locale = state.locale;
  const entries = buildPrintEntries(state);
  const pages = chunk(entries, 4);
  const allSelected =
    state.team.characters.length > 0 &&
    state.selectedForPrint.length === state.team.characters.length;

  return `
    <section class="print-page">
      <header class="page-heading no-print">
        <div>
          <span class="eyebrow">${escapeHtml(t(locale, "printEyebrow"))}</span>
          <h1>${escapeHtml(t(locale, "printTitle"))}</h1>
          <p>${escapeHtml(t(locale, "printDescription"))}</p>
        </div>
        <button type="button" class="button button-primary" data-action="print-now" ${entries.length ? "" : "disabled"}>
          ${icon("list")}<span>${escapeHtml(t(locale, "printNow"))}</span>
        </button>
      </header>

      <div class="print-layout">
        <aside class="print-controls no-print">
          <div class="print-controls-heading">
            <div>
              <span class="eyebrow">${escapeHtml(t(locale, "cardsForPrint"))}</span>
              <strong>${entries.length} ${escapeHtml(t(locale, "copiesTotal"))}</strong>
            </div>
            <button type="button" class="text-button" data-action="print-select-all" data-selected="${allSelected ? "true" : "false"}">${escapeHtml(allSelected ? t(locale, "clearSelection") : t(locale, "selectAll"))}</button>
          </div>
          <div class="print-character-list">
            ${
              state.team.characters.length
                ? state.team.characters
                    .map((character) => {
                      const selected = state.selectedForPrint.includes(character.id);
                      const copies = state.printCopies[character.id] ?? 1;
                      const portrait = character.cosmetics.portraitDataUrl;
                      return `
                        <article class="${selected ? "is-selected" : ""}">
                          <label class="print-character-select">
                            <input type="checkbox" data-action="print-select" data-character="${escapeHtml(character.id)}" ${selected ? "checked" : ""} />
                            <span class="mini-avatar">${portrait ? `<img src="${escapeHtml(portrait)}" alt="" />` : icon("user")}</span>
                            <span><strong>${escapeHtml(character.name)}</strong><small>${selected ? t(locale, "included") : t(locale, "notIncluded")}</small></span>
                          </label>
                          <label class="copies-field">
                            <span>${escapeHtml(t(locale, "copies"))}</span>
                            <input type="number" min="1" max="9" value="${copies}" data-action="print-copies" data-character="${escapeHtml(character.id)}" ${selected ? "" : "disabled"} />
                          </label>
                        </article>`;
                    })
                    .join("")
                : `<p class="print-empty-list">${escapeHtml(t(locale, "emptyTeam"))}</p>`
            }
          </div>
          <label class="cut-lines-toggle">
            <input type="checkbox" data-action="cut-lines" ${state.showCutLines ? "checked" : ""} />
            <span>${icon("check")}</span>
            <div><strong>${escapeHtml(t(locale, "cutLines"))}</strong><small>${escapeHtml(t(locale, "cutLinesHint"))}</small></div>
          </label>
          <div class="print-tip">${icon("warn")}<p>${escapeHtml(t(locale, "printTip"))}</p></div>
        </aside>

        <div class="print-preview">
          ${
            pages.length
              ? pages
                  .map((page, index) =>
                    renderPrintPage(state, page, index, pages.length),
                  )
                  .join("")
              : `<div class="empty-print-preview no-print">${icon("list")}<h2>${escapeHtml(t(locale, "nothingToPrint"))}</h2><p>${escapeHtml(t(locale, "nothingToPrintDescription"))}</p><button type="button" class="button button-secondary" data-action="app-mode" data-mode="collection">${escapeHtml(t(locale, "goToCollection"))}</button></div>`
          }
        </div>
      </div>
    </section>`;
}

function renderCatalogPage(state: AppState): string {
  const locale = state.locale;
  return `
    <section class="catalog-page">
      <header class="page-heading no-print">
        <div>
          <span class="eyebrow">${escapeHtml(t(locale, "catalogEyebrow"))}</span>
          <h1>${escapeHtml(t(locale, "catalogPageTitle"))}</h1>
          <p>${escapeHtml(t(locale, "catalogPageDescription"))}</p>
        </div>
        <div class="page-heading-actions catalog-header-actions">
          <button type="button" class="button button-ghost" data-action="import-catalog">${escapeHtml(t(locale, "importCatalog"))}</button>
          <button type="button" class="button button-secondary" data-action="export-catalog">${escapeHtml(t(locale, "exportCatalog"))}</button>
          <button type="button" class="button button-ghost" data-action="reset-catalog">${escapeHtml(t(locale, "resetCatalog"))}</button>
          <input type="file" accept="application/json,.json" data-action="catalog-file" hidden />
        </div>
      </header>
      ${renderCatalogMode(state)}
    </section>`;
}

function renderContent(state: AppState): string {
  switch (state.appMode) {
    case "builder":
      return renderBuilder(state);
    case "collection":
      return renderCollection(state);
    case "print":
      return renderPrintMode(state);
    case "catalog":
      return renderCatalogPage(state);
  }
}

export function renderApp(state: AppState): string {
  const teamResult = validateTeam(
    state.team,
    DEFAULT_RULESET,
    catalogFor(state),
  );

  return `
    <main class="app-shell mode-${state.appMode}">
      ${renderHeader(state, teamResult.totalCost)}
      ${renderNavigation(state)}
      <div class="app-content">${renderContent(state)}</div>
      <p class="app-toast hidden no-print" data-role="app-toast" aria-live="polite"></p>
    </main>`;
}
