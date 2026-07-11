import {
  buildCharacterCard,
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
import type { AppState, EditorStep } from "./state.js";
import { renderEmptyStashSlot, renderCharacterCard } from "./card-view.js";
import { CARD_THEMES, t, type Locale } from "./i18n.js";
import {
  EQUIPMENT_ICONS,
  renderIcon,
  STAT_ICONS,
  type IconName,
} from "./icons.js";

function cardContext(state: AppState): {
  teamName?: string;
  templateId: string;
  decorationLevel?: "minimal" | "standard" | "ornate" | "worn";
  locale: Locale;
} {
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

const SLOT_LABEL_KEYS = {
  mainWeapon: "slotMainWeapon",
  offhand: "slotOffhand",
  armor: "slotArmor",
  item1: "slotItem1",
  item2: "slotItem2",
} as const;

const PURCHASABLE_STAT_ICONS: Record<PurchasableStat, IconName> = {
  HP: "heart",
  MP: "footprints",
  MS: "swords",
  RS: "crosshair",
  LS: "flag",
  KS: "brain",
};

const DERIVED_STAT_ORDER = ["HP", "MP", "AC", "MS", "RS", "LS", "KS"] as const;

function uiIcon(name: IconName, className = "ui-icon"): string {
  return renderIcon(name, className, 18);
}

function sectionHead(
  locale: Locale,
  titleKey: keyof (typeof import("./i18n.js"))["UI"]["pl"],
  icon: IconName,
  meta?: string,
): string {
  return `
    <div class="section-head">
      <span class="section-head-icon" aria-hidden="true">${uiIcon(icon)}</span>
      <div class="section-head-copy">
        <h3>${t(locale, titleKey)}</h3>
        ${meta ? `<p class="section-head-meta">${escapeHtml(meta)}</p>` : ""}
      </div>
    </div>`;
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

function editorStepVisual(
  step: EditorStep,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
): "complete" | "error" | "pending" {
  if (!draft.name.trim()) {
    return step === "identity" ? "pending" : "pending";
  }
  if (!resolved.validation.valid) {
    return "error";
  }
  return "complete";
}

function renderEditorStepper(
  locale: Locale,
  state: AppState,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  return `
    <nav class="editor-stepper" role="tablist" aria-label="${escapeHtml(t(locale, "character"))}">
      ${EDITOR_STEPS.map((step, index) => {
        const visual = editorStepVisual(step, draft, resolved);
        const isActive = state.activeEditorStep === step;
        const numContent =
          visual === "complete"
            ? uiIcon("circle-check", "ui-icon ui-icon--sm")
            : `${index + 1}`;
        return `
        <button
          type="button"
          role="tab"
          class="stepper-tab is-${visual}${isActive ? " is-active" : ""}"
          data-action="goto-step"
          data-step="${step}"
          aria-selected="${isActive}"
          aria-controls="step-${step}"
        >
          <span class="stepper-num" aria-hidden="true">${numContent}</span>
          <span class="stepper-label">${t(locale, STEP_LABEL[step])}</span>
          ${visual === "error" ? `<span class="stepper-error-dot" aria-hidden="true"></span>` : ""}
        </button>`;
      }).join("")}
    </nav>`;
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

function renderSidebar(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const context = cardContext(state);
  const draftResolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);
  const draftCard = buildCharacterCard(draftResolved, context);
  const inStash = state.team.characters.some(
    (character) => character.id === draft.id,
  );

  const teamCards = state.team.characters.map((character) => {
    const resolved = resolveCharacter(character, DEFAULT_RULESET, DEFAULT_CATALOG);
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
  const emptySlotMarkup = Array.from({ length: emptySlots }, () =>
    renderEmptyStashSlot(locale),
  ).join("");

  return `
    <aside class="panel sidebar-panel">
      <label class="inline-field sidebar-theme">
        <span>${t(locale, "theme")}</span>
        <select data-action="card-theme">
          ${CARD_THEMES.map(
            (theme) => `
            <option value="${theme.id}" ${context.templateId === theme.id ? "selected" : ""}>
              ${escapeHtml(localize(theme.label, locale))}
            </option>`,
          ).join("")}
        </select>
      </label>

      <div class="card-preview-wrap card-preview-main">
        <div class="card-preview-stage">
          ${
            inStash
              ? `<span class="card-overlay-badge">${escapeHtml(t(locale, "inStash"))}</span>`
              : ""
          }
          ${renderCharacterCard(locale, draftCard, {
            variant: "full",
            draft: !inStash,
          })}
        </div>
      </div>

      <div class="sidebar-divider" aria-hidden="true"></div>

      <div class="stash-collection">
        <div class="stash-section-head">
          <span class="stash-section-title">
            ${uiIcon("users", "ui-icon ui-icon--sm")}
            <h3>${t(locale, "stashTeamCards")}</h3>
          </span>
          <span class="stash-count">${state.team.characters.length} / ${DEFAULT_RULESET.team.maximumCharacterCount}</span>
        </div>
        ${
          state.team.characters.length === 0
            ? `<p class="stash-empty muted">${t(locale, "emptyStash")}</p>`
            : `<div class="stash-grid">${teamCards.join("")}${emptySlotMarkup}</div>`
        }
      </div>
    </aside>`;
}

function renderCharacterEditor(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const resolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);

  const statControls = PURCHASABLE_STATS.map((stat) => {
    const value = draft.baseStats[stat];
    const cost =
      resolved.cost.attributes.find((entry) => entry.id === `attr:${stat}`)?.amount ??
      0;
    return `
      <label class="stat-control tile">
        <div class="stat-control-main">
          <span class="stat-code">${stat}</span>
          <span class="stat-label-icon stat-icon-${stat.toLowerCase()}">${uiIcon(PURCHASABLE_STAT_ICONS[stat], "ui-icon ui-icon--stat-lg")}</span>
          <span class="stat-name">${escapeHtml(statLabel(locale, stat))}</span>
          <div class="stepper stat-stepper">
            <button type="button" data-action="stat-dec" data-stat="${stat}" ${value <= 0 ? "disabled" : ""}>−</button>
            <span class="stat-value">${value}</span>
            <button type="button" data-action="stat-inc" data-stat="${stat}" ${value >= 6 ? "disabled" : ""}>+</button>
          </div>
        </div>
        <span class="stat-cost">${cost} ${t(locale, "points")}</span>
      </label>`;
  }).join("");

  const equipmentControls = EQUIPMENT_SLOTS.map((slot) => {
    const items = getItemsForSlot(DEFAULT_CATALOG, slot);
    const current = draft.equipment[slot]?.itemId ?? "";
    const blocked = resolved.blockedSlots.includes(slot);
    return `
      <label class="field field-with-icon tile equipment-tile">
        <span class="field-label">
          <span class="eq-slot-icon">${uiIcon(EQUIPMENT_ICONS[slot], "ui-icon ui-icon--sm")}</span>
          <span>${t(locale, SLOT_LABEL_KEYS[slot])}${blocked ? ` <span class="slot-locked" title="Locked">🔒</span>` : ""}</span>
        </span>
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
      const talentIcon =
        ability.polarity === "negative" ? "triangle-alert" : "sparkles";
      return `
        <label class="talent-option tile ${ability.polarity}">
          <input
            type="checkbox"
            data-action="talent-toggle"
            data-talent="${ability.id}"
            ${checked ? "checked" : ""}
            ${disabled ? "disabled" : ""}
          />
          <span class="talent-icon">${uiIcon(talentIcon, "ui-icon ui-icon--sm")}</span>
          <span class="talent-name">${escapeHtml(localize(ability.name, locale))}</span>
          <span class="talent-cost">${ability.cost > 0 ? "+" : ""}${ability.cost}</span>
        </label>`;
    })
    .join("");

  const derivedStats = DERIVED_STAT_ORDER.map((stat) => {
    const iconKey = stat.toLowerCase();
    return `
      <div class="derived-stat-chip tile tile-compact stat-${iconKey}">
        <span class="derived-stat-icon">${renderIcon(STAT_ICONS[iconKey]!, "ui-icon ui-icon--sm", 16)}</span>
        <span class="derived-stat-copy">
          <span>${stat}</span>
          <strong>${resolved.derivedStats[stat]}</strong>
        </span>
      </div>`;
  }).join("");

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
      <div class="panel-head editor-head">
        <div class="panel-title-with-icon">
          <span class="panel-title-icon" aria-hidden="true">${uiIcon("user")}</span>
          <div>
            <h2>${t(locale, "character")}</h2>
            <p class="editor-head-meta">${escapeHtml(draft.name)} · ${resolved.cost.total} ${t(locale, "points")}</p>
          </div>
        </div>
        <button type="button" class="ghost" data-action="new-character">${t(locale, "newCharacter")}</button>
      </div>

      ${renderEditorStepper(locale, state, draft, resolved)}

      <section class="editor-step panel" id="step-identity" role="tabpanel">
        ${sectionHead(locale, "cardIdentity", "image")}
        <div class="identity-tile-grid">
          <div class="identity-col">
            <label class="field">
              <span>${t(locale, "name")}</span>
              <input type="text" data-action="name" value="${escapeHtml(draft.name)}" maxlength="48" />
            </label>
            <label class="field">
              <span>${t(locale, "cardSubtitle")}</span>
              <input type="text" data-action="subtitle" value="${escapeHtml(draft.subtitle ?? "")}" maxlength="64" placeholder="${locale === "pl" ? "np. Dowódca / Tank" : "e.g. Commander / Tank"}" />
            </label>
          </div>
          <label class="field">
            <span>${t(locale, "faction")}</span>
            <input type="text" data-action="faction" value="${escapeHtml(draft.faction ?? "")}" maxlength="48" placeholder="${locale === "pl" ? "np. Zakon Chromu" : "e.g. Chrome Order"}" />
          </label>
          <div class="portrait-preview-cell">
            ${
              draft.cosmetics.portraitDataUrl
                ? `<img class="portrait-thumb" src="${escapeHtml(draft.cosmetics.portraitDataUrl)}" alt="" />`
                : `<div class="portrait-thumb portrait-thumb-empty">${uiIcon("image", "ui-icon ui-icon--stat-lg")}</div>`
            }
          </div>
          <div class="portrait-controls-cell">
            <p class="muted portrait-hint">${t(locale, "portraitHint")}</p>
            <div class="portrait-controls">
              <label class="ghost portrait-upload-btn">
                ${uiIcon("image", "ui-icon ui-icon--sm")}
                ${t(locale, "portraitUpload")}
                <input type="file" accept="image/*" data-action="portrait-upload" hidden />
              </label>
              ${
                draft.cosmetics.portraitDataUrl
                  ? `<button type="button" class="ghost danger" data-action="portrait-remove">${t(locale, "portraitRemove")}</button>`
                  : ""
              }
            </div>
            <p class="portrait-error hidden" data-role="portrait-error"></p>
          </div>
        </div>
      </section>

      <section class="editor-step panel" id="step-stats" role="tabpanel">
        ${sectionHead(locale, "baseStats", "swords")}
        <div class="stat-grid">${statControls}</div>
        <div class="derived-block">
          <h4 class="derived-heading">${t(locale, "derivedStats")}</h4>
          <div class="derived-values">${derivedStats}</div>
        </div>
      </section>

      <section class="editor-step panel" id="step-equipment" role="tabpanel">
        ${sectionHead(locale, "equipment", "sword")}
        <div class="equipment-grid">${equipmentControls}</div>
      </section>

      <section class="editor-step panel" id="step-talents" role="tabpanel">
        ${sectionHead(
          locale,
          "talents",
          "sparkles",
          `${draft.talentIds.length}/${DEFAULT_RULESET.character.maxTalents}`,
        )}
        <div class="talent-grid">${talents}</div>
      </section>

      <section class="editor-summary-panel tile">
        <div class="summary-split">
          <div class="summary-cost">
            <div class="section-head">
              <span class="section-head-icon" aria-hidden="true">${uiIcon("calculator")}</span>
              <div class="section-head-copy">
                <h3>${t(locale, "costBreakdown")}</h3>
              </div>
            </div>
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
          <div class="summary-validation">
            <div class="section-head">
              <span class="section-head-icon" aria-hidden="true">${uiIcon("circle-check")}</span>
              <div class="section-head-copy">
                <h3>${t(locale, "validation")}</h3>
              </div>
            </div>
            ${
              issues.length === 0
                ? `<p class="ok validation-ok">${uiIcon("circle-check", "ui-icon ui-icon--sm")} ${t(locale, "noIssues")}</p>`
                : `<ul class="issue-list">
                    ${issues
                      .map(
                        (issue) => `
                      <li class="${issue.severity}">
                        ${uiIcon(issue.severity === "error" ? "triangle-alert" : "circle-check", "ui-icon ui-icon--sm")}
                        <span>${escapeHtml(issue.text)}</span>
                      </li>`,
                      )
                      .join("")}
                  </ul>`
            }
          </div>
        </div>
      </section>

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
    <section class="panel team-bar">
      <div class="team-bar-zone team-bar-name">
        <span class="panel-title-icon" aria-hidden="true">${uiIcon("users")}</span>
        <label class="field team-name-field team-name-inline">
          <span>${t(locale, "teamName")}</span>
          <input type="text" data-action="team-name" value="${escapeHtml(state.team.name)}" maxlength="48" />
        </label>
        <span class="ruleset-badge">${DEFAULT_RULESET.id} ${DEFAULT_RULESET.version}</span>
      </div>

      <div class="team-bar-zone team-bar-budget">
        <p class="budget-caption">
          <span class="budget-caption-label">${t(locale, "budgetCaption")}</span>
          <strong>${cost}</strong> / ${budget} ${t(locale, "points")}
        </p>
        <div class="budget-bar">
          <div class="budget-fill" style="width: ${ratio}%"></div>
        </div>
        <p class="team-count-line">
          ${t(locale, "teamCount")}: <strong>${state.team.characters.length} / ${DEFAULT_RULESET.team.maximumCharacterCount}</strong>
        </p>
      </div>

      <div class="team-status-tile ${resolvedTeam.validation.valid ? "ok" : "bad"}">
        ${uiIcon(resolvedTeam.validation.valid ? "circle-check" : "triangle-alert", "ui-icon ui-icon--stat")}
        <span>${resolvedTeam.validation.valid ? t(locale, "teamValid") : t(locale, "teamInvalid")}</span>
      </div>

      ${
        resolvedTeam.validation.errors.length > 0
          ? `<ul class="issue-list compact team-errors">
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
          <p class="eyebrow">${t(locale, "appSubtitle")}</p>
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
        ${renderSidebar(state, state.draft)}
      </div>
    </div>`;
}
