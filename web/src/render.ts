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
import type {
  AbilityDefinition,
  CharacterBuild,
  EquipmentSlot,
  ItemDefinition,
  PurchasableStat,
} from "@hobt/lego-skirmish/types/domain.js";
import { EQUIPMENT_SLOTS } from "@hobt/lego-skirmish/types/domain.js";
import type { AppState, CatalogSort, EditorStep } from "./state.js";
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

const STEP_ICONS: Record<EditorStep, IconName> = {
  identity: "user",
  stats: "swords",
  equipment: "sword",
  talents: "sparkles",
};

function uiIcon(name: IconName, className = "ui-icon"): string {
  return renderIcon(name, className, 18);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function matchesSearch(text: string, query: string): boolean {
  if (!query.trim()) {
    return true;
  }
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

function sortByCatalog<T>(
  items: T[],
  sort: CatalogSort,
  nameOf: (item: T) => string,
  costOf: (item: T) => number,
): T[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sort === "name-asc") {
      return nameOf(a).localeCompare(nameOf(b));
    }
    const costA = costOf(a);
    const costB = costOf(b);
    return sort === "cost-desc" ? costB - costA : costA - costB;
  });
  return copy;
}

function itemCost(item: ItemDefinition): number {
  return item.cost.fixed + (item.cost.effectLevels?.positive ?? 0) * 50;
}

function abilityDescription(
  locale: Locale,
  ability: AbilityDefinition,
): string {
  const parts = ability.effects
    .map((effect) => (effect.display ? localize(effect.display, locale) : ""))
    .filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  return ability.polarity === "negative"
    ? t(locale, "negativeEffects")
    : t(locale, "positiveEffects");
}

function itemDescription(locale: Locale, item: ItemDefinition): string {
  const parts = item.effects
    .map((effect) => (effect.display ? localize(effect.display, locale) : ""))
    .filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" · ");
  }
  const action = item.actions[0];
  return action ? localize(action.name, locale) : "";
}

function brickLogo(): string {
  return `<svg class="brand-icon" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <rect x="2" y="10" width="24" height="12" rx="2" fill="currentColor"/>
    <circle cx="8" cy="14" r="2" fill="#fff"/>
    <circle cx="14" cy="14" r="2" fill="#fff"/>
    <circle cx="20" cy="14" r="2" fill="#fff"/>
    <rect x="6" y="6" width="6" height="4" rx="1" fill="currentColor"/>
    <rect x="16" y="6" width="6" height="4" rx="1" fill="currentColor"/>
  </svg>`;
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

function renderHeader(state: AppState): string {
  const locale = state.locale;
  return `
    <header class="app-header">
      <div class="brand">
        ${brickLogo()}
        <div class="brand-copy">
          <span class="brand-mark">HOBT</span>
          <span class="brand-title">${t(locale, "headerTitle")}</span>
        </div>
      </div>
      <div class="header-actions">
        <div class="locale-switch">
          <button type="button" data-action="locale" data-locale="pl" class="btn btn-ghost btn-sm ${locale === "pl" ? "is-active" : ""}">PL</button>
          <button type="button" data-action="locale" data-locale="en" class="btn btn-ghost btn-sm ${locale === "en" ? "is-active" : ""}">EN</button>
        </div>
        <button type="button" class="btn btn-outline" data-action="clear-all">${t(locale, "clearAll")}</button>
        <button type="button" class="btn btn-outline" data-action="save-config">${t(locale, "saveConfig")}</button>
        <button type="button" class="btn btn-primary" data-action="export-json">${t(locale, "exportJson")}</button>
      </div>
    </header>`;
}

function renderLeftSidebar(
  state: AppState,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
): string {
  const locale = state.locale;
  const stepPills = EDITOR_STEPS.map((step) => {
    const isActive = state.activeEditorStep === step;
    return `
      <button
        type="button"
        class="pill ${isActive ? "is-active" : ""}"
        data-action="goto-step"
        data-step="${step}"
      >
        ${uiIcon(STEP_ICONS[step], "ui-icon ui-icon--sm")}
        ${t(locale, STEP_LABEL[step])}
      </button>`;
  }).join("");

  let contextualFilters = "";
  if (state.activeEditorStep === "equipment") {
    contextualFilters = `
      <div class="filter-group">
        <h3 class="filter-heading">${t(locale, "equipment")}</h3>
        <div class="pill-group">
          ${EQUIPMENT_SLOTS.map((slot) => {
            const active = state.equipmentSlotFilter === slot;
            return `
              <button
                type="button"
                class="pill pill-sm ${active ? "is-active" : ""}"
                data-action="slot-filter"
                data-slot="${slot}"
              >
                ${uiIcon(EQUIPMENT_ICONS[slot], "ui-icon ui-icon--sm")}
                ${t(locale, SLOT_LABEL_KEYS[slot])}
              </button>`;
          }).join("")}
        </div>
      </div>`;
  }

  if (state.activeEditorStep === "talents") {
    const filters: { id: typeof state.talentFilter; key: "filterAll" | "filterPositive" | "filterNegative" }[] = [
      { id: "all", key: "filterAll" },
      { id: "positive", key: "filterPositive" },
      { id: "negative", key: "filterNegative" },
    ];
    contextualFilters = `
      <div class="filter-group">
        <h3 class="filter-heading">${t(locale, "talents")}</h3>
        <div class="pill-group">
          ${filters
            .map(
              ({ id, key }) => `
            <button
              type="button"
              class="pill pill-sm ${state.talentFilter === id ? "is-active" : ""}"
              data-action="talent-filter"
              data-filter="${id}"
            >${t(locale, key)}</button>`,
            )
            .join("")}
        </div>
      </div>`;
  }

  return `
    <aside class="sidebar-left ${state.mobilePanel === "filters" ? "is-open" : ""}">
      <div class="sidebar-left-inner">
        <button type="button" class="mobile-close btn btn-ghost btn-sm" data-action="close-panel">${t(locale, "closePanel")}</button>

        <div class="search-field">
          <span class="search-icon" aria-hidden="true">${uiIcon("search", "ui-icon ui-icon--sm")}</span>
          <input
            type="search"
            class="search-input"
            data-action="search"
            value="${escapeHtml(state.searchQuery)}"
            placeholder="${escapeHtml(t(locale, "searchPlaceholder"))}"
          />
        </div>

        <div class="filter-group">
          <h3 class="filter-heading">${t(locale, "categories")}</h3>
          <div class="pill-group pill-group-vertical">${stepPills}</div>
        </div>

        ${contextualFilters}

        <div class="filter-group">
          <h3 class="filter-heading">${t(locale, "filterCost")}</h3>
          <div class="cost-filter">
            <input
              type="range"
              min="0"
              max="${DEFAULT_RULESET.team.budget}"
              value="${state.maxCostFilter}"
              data-action="cost-filter"
            />
            <div class="cost-filter-inputs">
              <input
                type="number"
                min="0"
                max="${DEFAULT_RULESET.team.budget}"
                value="${state.maxCostFilter}"
                data-action="cost-filter-input"
              />
              <span class="muted">${t(locale, "points")}</span>
            </div>
          </div>
        </div>

        <label class="filter-group">
          <span class="filter-heading">${t(locale, "sortBy")}</span>
          <select class="select-input" data-action="catalog-sort">
            <option value="cost-asc" ${state.catalogSort === "cost-asc" ? "selected" : ""}>${t(locale, "sortCostAsc")}</option>
            <option value="cost-desc" ${state.catalogSort === "cost-desc" ? "selected" : ""}>${t(locale, "sortCostDesc")}</option>
            <option value="name-asc" ${state.catalogSort === "name-asc" ? "selected" : ""}>${t(locale, "sortNameAsc")}</option>
          </select>
        </label>

        <div class="filter-group editor-quick">
          <p class="muted">${escapeHtml(draft.name || t(locale, "character"))}</p>
          <p><strong>${resolved.cost.total}</strong> ${t(locale, "points")}</p>
          <button type="button" class="btn btn-outline btn-block" data-action="new-character">${t(locale, "newCharacter")}</button>
        </div>
      </div>
    </aside>`;
}

function renderOptionCard(
  locale: Locale,
  params: {
  title: string;
  badge?: string;
  badgeClass?: string;
  description: string;
  imageHtml: string;
  stats: { icon: IconName; label: string; value: string }[];
  actionLabel: string;
  actionAction: string;
  actionAttrs?: string;
  selected?: boolean;
  disabled?: boolean;
  },
): string {
  const statsMarkup = params.stats
    .map(
      (stat) => `
      <span class="option-stat" title="${escapeHtml(stat.label)}">
        ${uiIcon(stat.icon, "ui-icon ui-icon--sm")}
        <span>${escapeHtml(stat.value)}</span>
      </span>`,
    )
    .join("");

  return `
    <article class="option-card ${params.selected ? "is-selected" : ""} ${params.disabled ? "is-disabled" : ""}">
      <div class="option-card-media">${params.imageHtml}</div>
      ${params.badge ? `<span class="option-badge ${params.badgeClass ?? ""}">${escapeHtml(params.badge)}</span>` : ""}
      <h3 class="option-card-title">${escapeHtml(params.title)}</h3>
      <p class="option-card-desc">${escapeHtml(params.description)}</p>
      <div class="option-card-stats">${statsMarkup}</div>
      ${
        params.selected
          ? `<div class="option-added">${uiIcon("circle-check", "ui-icon ui-icon--sm")} ${escapeHtml(t(locale, "added"))}</div>`
          : `<button
              type="button"
              class="btn btn-primary btn-block option-action"
              data-action="${params.actionAction}"
              ${params.actionAttrs ?? ""}
              ${params.disabled ? "disabled" : ""}
            >${escapeHtml(params.actionLabel)}</button>`
      }
    </article>`;
}

function renderIdentityStep(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const portrait = draft.cosmetics.portraitDataUrl
    ? `<img src="${escapeHtml(draft.cosmetics.portraitDataUrl)}" alt="" />`
    : `<div class="option-placeholder">${uiIcon("image", "ui-icon")}</div>`;

  return `
    <div class="identity-panel panel-card">
      <div class="identity-grid">
        <div class="identity-media">${portrait}</div>
        <div class="identity-fields">
          <label class="field">
            <span>${t(locale, "name")}</span>
            <input type="text" data-action="name" value="${escapeHtml(draft.name)}" maxlength="48" />
          </label>
          <label class="field">
            <span>${t(locale, "cardSubtitle")}</span>
            <input type="text" data-action="subtitle" value="${escapeHtml(draft.subtitle ?? "")}" maxlength="64" />
          </label>
          <label class="field">
            <span>${t(locale, "faction")}</span>
            <input type="text" data-action="faction" value="${escapeHtml(draft.faction ?? "")}" maxlength="48" />
          </label>
          <label class="field">
            <span>${t(locale, "teamName")}</span>
            <input type="text" data-action="team-name" value="${escapeHtml(state.team.name)}" maxlength="48" />
          </label>
          <div class="portrait-controls">
            <label class="btn btn-outline portrait-upload-btn">
              ${uiIcon("image", "ui-icon ui-icon--sm")}
              ${t(locale, "portraitUpload")}
              <input type="file" accept="image/*" data-action="portrait-upload" hidden />
            </label>
            ${
              draft.cosmetics.portraitDataUrl
                ? `<button type="button" class="btn btn-ghost danger" data-action="portrait-remove">${t(locale, "portraitRemove")}</button>`
                : ""
            }
          </div>
          <p class="portrait-error hidden" data-role="portrait-error"></p>
          <p class="muted portrait-hint">${t(locale, "portraitHint")}</p>
        </div>
      </div>
    </div>`;
}

function renderStatsStep(locale: Locale, draft: CharacterBuild, resolved: ReturnType<typeof resolveCharacter>): string {
  const cards = PURCHASABLE_STATS.map((stat) => {
    const value = draft.baseStats[stat];
    const cost =
      resolved.cost.attributes.find((entry) => entry.id === `attr:${stat}`)?.amount ?? 0;
    const label = {
      MS: "statMS",
      RS: "statRS",
      LS: "statLS",
      KS: "statKS",
      HP: "statHP",
      MP: "statMP",
    }[stat] as const;

    return `
      <article class="option-card stat-option-card">
        <div class="option-card-media stat-option-media">
          ${uiIcon(PURCHASABLE_STAT_ICONS[stat], "ui-icon ui-icon--xl")}
        </div>
        <span class="option-badge">${stat}</span>
        <h3 class="option-card-title">${escapeHtml(t(locale, label))}</h3>
        <p class="option-card-desc">${cost} ${t(locale, "points")}</p>
        <div class="stat-stepper-large">
          <button type="button" class="btn btn-outline btn-icon" data-action="stat-dec" data-stat="${stat}" ${value <= 0 ? "disabled" : ""}>−</button>
          <span class="stat-value-large">${value}</span>
          <button type="button" class="btn btn-outline btn-icon" data-action="stat-inc" data-stat="${stat}" ${value >= 6 ? "disabled" : ""}>+</button>
        </div>
      </article>`;
  }).join("");

  const derived = DERIVED_STAT_ORDER.map((stat) => {
    const iconKey = stat.toLowerCase();
    return `
      <span class="derived-chip" title="${stat}">
        ${renderIcon(STAT_ICONS[iconKey]!, "ui-icon ui-icon--sm", 16)}
        <strong>${resolved.derivedStats[stat]}</strong>
        <span>${stat}</span>
      </span>`;
  }).join("");

  return `
    <div class="derived-bar">${derived}</div>
    <div class="option-grid">${cards}</div>`;
}

function renderEquipmentStep(state: AppState, draft: CharacterBuild, resolved: ReturnType<typeof resolveCharacter>): string {
  const locale = state.locale;
  const slot = state.equipmentSlotFilter;
  const blocked = resolved.blockedSlots.includes(slot);
  const currentId = draft.equipment[slot]?.itemId ?? "";

  let items = getItemsForSlot(DEFAULT_CATALOG, slot);
  items = items.filter((item) => {
    const name = localize(item.name, locale);
    const cost = itemCost(item);
    return matchesSearch(name, state.searchQuery) && cost <= state.maxCostFilter;
  });
  items = sortByCatalog(
    items,
    state.catalogSort,
    (item) => localize(item.name, locale),
    itemCost,
  );

  const cards = items.map((item) => {
    const name = localize(item.name, locale);
    const cost = itemCost(item);
    const selected = currentId === item.id;
    const image = `<div class="option-placeholder">${uiIcon(EQUIPMENT_ICONS[slot], "ui-icon ui-icon--xl")}</div>`;
    return renderOptionCard(locale, {
      title: name,
      badge: t(locale, SLOT_LABEL_KEYS[slot]),
      description: itemDescription(locale, item) || name,
      imageHtml: image,
      stats: [
        { icon: "calculator", label: t(locale, "points"), value: `${cost} ${t(locale, "points")}` },
      ],
      actionLabel: t(locale, "equipItem"),
      actionAction: "equip-item",
      actionAttrs: `data-item="${item.id}" data-slot="${slot}"`,
      selected,
      disabled: blocked && !selected,
    });
  });

  if (cards.length === 0) {
    return `<div class="empty-state">${uiIcon("triangle-alert", "ui-icon")}<p>${t(locale, "noResults")}</p></div>`;
  }

  return `<div class="option-grid">${cards.join("")}</div>`;
}

function renderTalentsStep(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  let abilities = listAbilities(DEFAULT_CATALOG);
  if (state.talentFilter !== "all") {
    abilities = abilities.filter((a) => a.polarity === state.talentFilter);
  }
  abilities = abilities.filter((ability) => {
    const name = localize(ability.name, locale);
    return matchesSearch(name, state.searchQuery) && ability.cost <= state.maxCostFilter;
  });
  abilities = sortByCatalog(
    abilities,
    state.catalogSort,
    (a) => localize(a.name, locale),
    (a) => a.cost,
  );

  const atMax = draft.talentIds.length >= DEFAULT_RULESET.character.maxTalents;
  const cards = abilities.map((ability) => {
    const name = localize(ability.name, locale);
    const selected = draft.talentIds.includes(ability.id);
    const icon = ability.polarity === "negative" ? "triangle-alert" : "sparkles";
    return renderOptionCard(locale, {
      title: name,
      badge: ability.polarity === "negative" ? t(locale, "filterNegative") : t(locale, "filterPositive"),
      badgeClass: ability.polarity,
      description: abilityDescription(locale, ability),
      imageHtml: `<div class="option-placeholder">${uiIcon(icon, "ui-icon ui-icon--xl")}</div>`,
      stats: [
        { icon: "calculator", label: t(locale, "points"), value: `${ability.cost > 0 ? "+" : ""}${ability.cost}` },
      ],
      actionLabel: selected ? t(locale, "removeTalent") : t(locale, "addTalent"),
      actionAction: "talent-card",
      actionAttrs: `data-talent="${ability.id}"`,
      selected,
      disabled: !selected && atMax,
    });
  });

  if (cards.length === 0) {
    return `<div class="empty-state">${uiIcon("triangle-alert", "ui-icon")}<p>${t(locale, "noResults")}</p></div>`;
  }

  return `<div class="option-grid">${cards.join("")}</div>`;
}

function renderMainColumn(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const resolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);
  const step = state.activeEditorStep;

  let content = "";
  let count = 0;

  if (step === "identity") {
    content = renderIdentityStep(state, draft);
    count = 1;
  } else if (step === "stats") {
    content = renderStatsStep(locale, draft, resolved);
    count = PURCHASABLE_STATS.length;
  } else if (step === "equipment") {
    content = renderEquipmentStep(state, draft, resolved);
    count = getItemsForSlot(DEFAULT_CATALOG, state.equipmentSlotFilter).length;
  } else {
    content = renderTalentsStep(state, draft);
    count = listAbilities(DEFAULT_CATALOG).length;
  }

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

  const inStash = state.team.characters.some((c) => c.id === draft.id);

  return `
    <main class="main-column">
      <div class="main-head">
        <div>
          <h2>${t(locale, "availableOptions")}</h2>
          <p class="main-meta">${count} ${t(locale, "optionsCount")} · ${t(locale, STEP_LABEL[step])}</p>
        </div>
        <div class="main-head-actions">
          <button type="button" class="btn btn-primary" data-action="add-to-team">
            ${inStash ? t(locale, "updateInStash") : t(locale, "addToStash")}
          </button>
        </div>
      </div>

      ${content}

      <details class="stats-legend">
        <summary>${t(locale, "statsLegend")}</summary>
        <div class="legend-grid">
          ${PURCHASABLE_STATS.map((stat) => {
            const key = {
              MS: "statMS",
              RS: "statRS",
              LS: "statLS",
              KS: "statKS",
              HP: "statHP",
              MP: "statMP",
            }[stat] as const;
            return `<span>${stat}: ${t(locale, key)}</span>`;
          }).join("")}
        </div>
      </details>

      <section class="summary-panel panel-card">
        <div class="summary-split">
          <div>
            <h3>${t(locale, "costBreakdown")}</h3>
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
          <div>
            <h3>${t(locale, "validation")}</h3>
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
    </main>`;
}

function renderTeamRow(
  locale: Locale,
  state: AppState,
  character: CharacterBuild,
): string {
  const resolved = resolveCharacter(character, DEFAULT_RULESET, DEFAULT_CATALOG);
  const selected = state.activeCharacterId === character.id;
  const thumb = character.cosmetics.portraitDataUrl
    ? `<img src="${escapeHtml(character.cosmetics.portraitDataUrl)}" alt="" />`
    : `<span>${uiIcon("user", "ui-icon ui-icon--sm")}</span>`;

  return `
    <div class="team-row ${selected ? "is-selected" : ""}">
      <button type="button" class="team-row-main" data-action="select-character" data-character="${escapeHtml(character.id)}">
        <div class="team-row-thumb">${thumb}</div>
        <div class="team-row-copy">
          <strong>${escapeHtml(character.name)}</strong>
          <span class="muted">${resolved.cost.total} ${t(locale, "points")}</span>
        </div>
      </button>
      <button type="button" class="btn btn-ghost btn-icon danger" data-action="remove-character" data-character="${escapeHtml(character.id)}" aria-label="${t(locale, "removeFromTeam")}">×</button>
    </div>`;
}

function renderRightSidebar(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const resolvedTeam = validateTeam(state.team, DEFAULT_RULESET, DEFAULT_CATALOG);
  const budget = state.team.budget;
  const cost = resolvedTeam.totalCost;
  const context = cardContext(state);
  const draftResolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);
  const draftCard = buildCharacterCard(draftResolved, context);
  const inStash = state.team.characters.some((c) => c.id === draft.id);

  const roster =
    state.team.characters.length === 0
      ? `<p class="empty-team muted">${t(locale, "emptyTeam")}</p>`
      : state.team.characters.map((c) => renderTeamRow(locale, state, c)).join("");

  return `
    <aside class="sidebar-right ${state.mobilePanel === "team" ? "is-open" : ""}">
      <div class="sidebar-right-inner">
        <button type="button" class="mobile-close btn btn-ghost btn-sm" data-action="close-panel">${t(locale, "closePanel")}</button>

        <div class="team-header">
          <h2>${t(locale, "yourTeam")}</h2>
          <p class="team-points">
            <span class="team-points-value">${cost}</span>
            <span class="team-points-sep">/</span>
            <span>${budget} ${t(locale, "points")}</span>
          </p>
          <p class="muted">${t(locale, "teamUnits")}: ${state.team.characters.length} / ${DEFAULT_RULESET.team.maximumCharacterCount}</p>
          <div class="budget-bar"><div class="budget-fill" style="width: ${Math.min(100, Math.round((cost / budget) * 100))}%"></div></div>
          <p class="team-status ${resolvedTeam.validation.valid ? "ok" : "bad"}">
            ${uiIcon(resolvedTeam.validation.valid ? "circle-check" : "triangle-alert", "ui-icon ui-icon--sm")}
            ${resolvedTeam.validation.valid ? t(locale, "teamValid") : t(locale, "teamInvalid")}
          </p>
        </div>

        <label class="field sidebar-theme">
          <span>${t(locale, "theme")}</span>
          <select class="select-input" data-action="card-theme">
            ${CARD_THEMES.map(
              (theme) => `
              <option value="${theme.id}" ${context.templateId === theme.id ? "selected" : ""}>
                ${escapeHtml(localize(theme.label, locale))}
              </option>`,
            ).join("")}
          </select>
        </label>

        <div class="card-preview-block">
          <h3>${t(locale, "cardPreviewLabel")}</h3>
          <div class="card-preview-stage">
            ${inStash ? `<span class="card-overlay-badge">${escapeHtml(t(locale, "inStash"))}</span>` : ""}
            ${renderCharacterCard(locale, draftCard, { variant: "full", draft: !inStash })}
          </div>
        </div>

        <div class="team-roster">${roster}</div>

        <div class="team-footer-actions">
          <button type="button" class="btn btn-outline btn-block" data-action="clear-team">${t(locale, "clearTeam")}</button>
          <button type="button" class="btn btn-outline btn-block" data-action="save-config">${t(locale, "savePreset")}</button>
          <button type="button" class="btn btn-primary btn-block" data-action="export-json">${t(locale, "exportTeam")}</button>
        </div>
      </div>
    </aside>`;
}

function renderMobileBar(state: AppState): string {
  const locale = state.locale;
  return `
    <div class="mobile-bar">
      <button type="button" class="btn btn-outline" data-action="open-filters">${t(locale, "openFilters")}</button>
      <button type="button" class="btn btn-primary" data-action="open-team">${t(locale, "openTeam")}</button>
    </div>`;
}

export function renderApp(state: AppState): string {
  const draft = state.draft;
  const resolved = resolveCharacter(draft, DEFAULT_RULESET, DEFAULT_CATALOG);

  return `
    <div class="app-layout">
      ${renderHeader(state)}
      <div class="app-body">
        ${renderLeftSidebar(state, draft, resolved)}
        ${renderMainColumn(state, draft)}
        ${renderRightSidebar(state, draft)}
      </div>
      ${renderMobileBar(state)}
      ${state.mobilePanel !== "none" ? `<div class="sidebar-backdrop" data-action="close-panel"></div>` : ""}
    </div>`;
}
