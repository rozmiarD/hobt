import {
  buildCharacterCard,
  calculateCharacterCost,
  DEFAULT_RULESET,
  getItemsForSlot,
  listAbilities,
  localize,
  resolveCharacter,
  validateTeam,
} from "@hobt/lego-skirmish";
import type {
  CharacterBuild,
  EquipmentSlot,
  GameCatalog,
  ItemDefinition,
  PurchasableStat,
} from "@hobt/lego-skirmish/types/domain.js";
import { EQUIPMENT_SLOTS } from "@hobt/lego-skirmish/types/domain.js";
import type { AppState } from "./state.js";
import { renderCatalogMode } from "./catalog-render.js";
import { renderPreviewCard } from "./card-view.js";
import { CARD_THEMES, t, type Locale } from "./i18n.js";
import { icon, EQUIPMENT_ICONS, STAT_ICONS, type IconId } from "./icons.js";

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

const SLOT_LABEL_KEYS = {
  mainWeapon: "slotMainWeapon",
  offhand: "slotOffhand",
  armor: "slotArmor",
  item1: "slotItem1",
  item2: "slotItem2",
} as const;

const STAT_SHORT: Record<PurchasableStat, "statMS" | "statRS" | "statLS" | "statKS" | "statHP" | "statMP"> = {
  MS: "statMS",
  RS: "statRS",
  LS: "statLS",
  KS: "statKS",
  HP: "statHP",
  MP: "statMP",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const BRAND_MARK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>`;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
}

function renderStudTab(activeDots: number): string {
  return `<div class="stud-tab"><span class="stud${activeDots >= 1 ? " on" : ""}"></span><span class="stud${activeDots >= 2 ? " on" : ""}"></span></div>`;
}

function renderPanel(
  activeDots: number,
  iconId: IconId,
  title: string,
  body: string,
  link?: { label: string; action: string; tab?: string },
): string {
  const linkHtml = link
    ? `<button type="button" class="btn secondary panel-link" data-action="${escapeHtml(link.action)}"${link.tab ? ` data-tab="${escapeHtml(link.tab)}"` : ""}>${escapeHtml(link.label)}</button>`
    : "";
  return `
    <div class="panel-wrap">
      ${renderStudTab(activeDots)}
      <section class="panel">
        <div class="panel-head">
          <h2>${icon(iconId)}<span>${escapeHtml(title)}</span></h2>
          ${linkHtml}
        </div>
        <div class="panel-body">${body}</div>
      </section>
    </div>`;
}

function itemDescription(item: ItemDefinition | undefined, locale: Locale): string {
  if (!item) {
    return "";
  }
  const parts = item.actions
    .map((action) => localize(action.name, locale))
    .concat(
      item.effects
        .map((effect) => (effect.display ? localize(effect.display, locale) : ""))
        .filter(Boolean),
    );
  return parts.slice(0, 2).join(" · ") || localize(item.name, locale);
}

function itemCost(item: ItemDefinition | undefined): number {
  if (!item) {
    return 0;
  }
  const positive = item.cost.effectLevels?.positive ?? 0;
  const negative = item.cost.effectLevels?.negative ?? 0;
  const posCost = positive > 0 ? (100 * positive * (positive + 1)) / 2 : 0;
  const negCost = negative > 0 ? -((100 * negative * (negative + 1)) / 2) : 0;
  return (item.cost.fixed ?? 0) + posCost + negCost;
}

function renderTopbar(
  state: AppState,
  teamCost: number,
  budget: number,
  ratio: number,
): string {
  const locale = state.locale;

  return `
    <header class="topbar">
      <a class="brand" href="#" aria-label="${escapeHtml(t(locale, "brandTitle"))}" onclick="return false">
        <span class="brand-mark">${BRAND_MARK}</span>
        <span>${escapeHtml(t(locale, "brandTitle"))}<small>${escapeHtml(t(locale, "brandSubtitle"))}</small></span>
      </a>

      <label class="top-control team-control">
        ${icon("users")}
        <input
          type="text"
          data-action="team-name"
          value="${escapeHtml(state.team.name)}"
          maxlength="48"
          aria-label="${escapeHtml(t(locale, "teamName"))}"
        />
      </label>

      <label class="top-control theme-control">
        ${icon("sparkle")}
        <select data-action="card-theme" aria-label="${escapeHtml(t(locale, "teamTheme"))}">
          ${CARD_THEMES.map(
            (theme) => `
            <option value="${theme.id}" ${state.team.cardTheme.templateId === theme.id ? "selected" : ""}>
              ${escapeHtml(localize(theme.label, locale))}
            </option>`,
          ).join("")}
        </select>
      </label>

      <div class="budget-block">
        <div class="budget-row">
          <span>${t(locale, "teamBudget")}</span>
          <b>${teamCost} / ${budget} ${t(locale, "pointsShort")}</b>
        </div>
        <div class="gauge"><span style="width:${ratio}%"></span></div>
      </div>

      <nav class="language" aria-label="PL / EN">
        <button type="button" data-action="locale" data-locale="pl" class="${locale === "pl" ? "active" : ""}">PL</button>
        <span>/</span>
        <button type="button" data-action="locale" data-locale="en" class="${locale === "en" ? "active" : ""}">EN</button>
      </nav>
    </header>`;
}

function renderCatalogTopbar(state: AppState): string {
  const locale = state.locale;
  return `
    <header class="topbar topbar-catalog">
      <a class="brand" href="#" aria-label="${escapeHtml(t(locale, "brandTitle"))}" onclick="return false">
        <span class="brand-mark">${icon("shield")}</span>
        <span>${escapeHtml(t(locale, "catalogPageTitle"))}</span>
      </a>
      <div class="catalog-header-actions">
        <button type="button" class="btn secondary compact" data-action="import-catalog">${t(locale, "importCatalog")}</button>
        <button type="button" class="btn secondary compact" data-action="export-catalog">${t(locale, "exportCatalog")}</button>
        <button type="button" class="btn secondary compact" data-action="reset-catalog">${t(locale, "resetCatalog")}</button>
        <input type="file" accept="application/json,.json" data-action="catalog-file" hidden />
      </div>
      <nav class="topbar-end">
        <div class="language">
          <button type="button" data-action="locale" data-locale="pl" class="${locale === "pl" ? "active" : ""}">PL</button>
          <span>/</span>
          <button type="button" data-action="locale" data-locale="en" class="${locale === "en" ? "active" : ""}">EN</button>
        </div>
      </nav>
    </header>`;
}

function renderAppNav(state: AppState): string {
  const locale = state.locale;
  const inTeam = state.appMode === "team";
  const inItems = state.appMode === "catalog" && state.catalogEditorTab === "items";
  const inAbilities =
    state.appMode === "catalog" && state.catalogEditorTab === "abilities";

  return `
    <nav class="app-nav" aria-label="${escapeHtml(t(locale, "appModeLabel"))}">
      <button type="button" data-action="app-mode" data-mode="team" class="app-nav-btn${inTeam ? " active" : ""}">
        ${icon("users")}
        <span>${t(locale, "navTeam")}</span>
      </button>
      <button type="button" data-action="open-catalog" data-tab="items" class="app-nav-btn${inItems ? " active" : ""}">
        ${icon("shield")}
        <span>${t(locale, "navItemCatalog")}</span>
      </button>
      <button type="button" data-action="open-catalog" data-tab="abilities" class="app-nav-btn${inAbilities ? " active" : ""}">
        ${icon("sparkle")}
        <span>${t(locale, "navAbilityCatalog")}</span>
      </button>
    </nav>`;
}

function rosterStatus(resolved: ReturnType<typeof resolveCharacter>): "success" | "warning" {
  if (!resolved.validation.valid) {
    return "warning";
  }
  if (resolved.validation.warnings.length > 0) {
    return "warning";
  }
  return "success";
}

function renderRoster(state: AppState): string {
  const locale = state.locale;
  const catalog = catalogFor(state);

  const cards = state.team.characters.map((character) => {
    const resolved = resolveCharacter(character, DEFAULT_RULESET, catalog);
    const cost = calculateCharacterCost(character, DEFAULT_RULESET, catalog).total;
    const active = state.draft.id === character.id;
    const status = rosterStatus(resolved);
    const portrait = character.cosmetics.portraitDataUrl;
    const displayName = character.name || t(locale, "newCharacter");
    const avatarContent = portrait
      ? `<img src="${escapeHtml(portrait)}" alt="" />`
      : escapeHtml(initials(displayName));

    return `
      <button
        type="button"
        class="roster-card${active ? " active" : ""}"
        data-action="select-character"
        data-character="${escapeHtml(character.id)}"
      >
        <span class="avatar${portrait ? " has-photo" : ""}">${avatarContent}</span>
        <span class="roster-copy">
          <strong>${escapeHtml(displayName)}</strong>
          <small>${cost} ${t(locale, "pointsShort")}</small>
        </span>
        <span class="r-status ${status === "success" ? "ok" : "warn"}">
          ${icon(status === "success" ? "check" : "warn")}
        </span>
      </button>`;
  });

  return `
    <nav class="roster" aria-label="${escapeHtml(t(locale, "stashRoster"))}">
      ${cards.join("")}
      <button type="button" class="roster-card add" data-action="new-character">
        ${icon("list")}
        <span>${t(locale, "newCharacter")}</span>
      </button>
    </nav>`;
}

function renderIdentitySection(state: AppState, draft: CharacterBuild): string {
  const locale = state.locale;
  const portrait = draft.cosmetics.portraitDataUrl;

  const body = `
    <div class="identity-grid">
      <div class="portrait-slot${portrait ? " has-image" : ""}">
        ${
          portrait
            ? `<img src="${escapeHtml(portrait)}" alt="" class="portrait-image" />`
            : icon("user")
        }
        <label class="portrait-upload-btn" aria-label="${escapeHtml(t(locale, "portraitUpload"))}">
          ${icon("sparkle")}
          <input type="file" accept="image/*" data-action="portrait-upload" hidden />
        </label>
      </div>
      <div class="field-stack">
        <label class="field">
          <span>${t(locale, "characterName")}</span>
          <input type="text" data-action="name" value="${escapeHtml(draft.name)}" maxlength="48" />
        </label>
        <label class="field">
          <span>${t(locale, "faction")}</span>
          <input type="text" data-action="faction" value="${escapeHtml(draft.faction ?? "")}" maxlength="48" />
        </label>
        <label class="field">
          <span>${t(locale, "cardSubtitle")}</span>
          <input type="text" data-action="subtitle" value="${escapeHtml(draft.subtitle ?? "")}" maxlength="64" />
        </label>
        ${
          portrait
            ? `<button type="button" class="btn secondary portrait-remove-btn" data-action="portrait-remove">${t(locale, "portraitRemove")}</button>`
            : ""
        }
        <p class="portrait-error hidden" data-role="portrait-error"></p>
      </div>
    </div>`;

  return renderPanel(1, "user", t(locale, "sectionIdentity"), body);
}

function renderStatsSection(
  locale: Locale,
  draft: CharacterBuild,
): string {
  const body = `
    <div class="grid-6">
      ${PURCHASABLE_STATS.map((stat) => {
        const value = draft.baseStats[stat];
        const hpMp = stat === "HP" || stat === "MP";
        return `
        <article class="tile stat-tile${hpMp ? ` ${stat.toLowerCase()}` : ""}">
          <span class="tile-icon">${icon(STAT_ICONS[stat])}</span>
          <span class="tile-code">${stat}</span>
          <div class="tile-value">${value}</div>
          <span class="tile-label">${escapeHtml(t(locale, STAT_SHORT[stat]))}</span>
          <div class="stat-controls">
            <button type="button" data-action="stat-dec" data-stat="${stat}" ${value <= 0 ? "disabled" : ""} aria-label="−">−</button>
            <button type="button" data-action="stat-inc" data-stat="${stat}" ${value >= 6 ? "disabled" : ""} aria-label="+">+</button>
          </div>
        </article>`;
      }).join("")}
    </div>`;

  return renderPanel(2, "hand-fist", t(locale, "sectionStats"), body);
}

function renderEquipmentSection(
  locale: Locale,
  draft: CharacterBuild,
  resolved: ReturnType<typeof resolveCharacter>,
  catalog: GameCatalog,
): string {
  const body = `
    <div class="grid-5">
      ${EQUIPMENT_SLOTS.map((slot) => {
        const items = getItemsForSlot(catalog, slot);
        const currentId = draft.equipment[slot]?.itemId ?? "";
        const currentItem = currentId ? catalog.items[currentId] : undefined;
        const blocked = resolved.blockedSlots.includes(slot);
        const name = currentItem
          ? localize(currentItem.name, locale)
          : t(locale, "selectItem");
        const desc = blocked
          ? `🔒 ${t(locale, "changeEquipment")}`
          : itemDescription(currentItem, locale) || t(locale, "changeEquipment");
        const cost = itemCost(currentItem);

        return `
        <article class="tile equipment-card${blocked ? " blocked" : ""}">
          <div class="row-top">
            <span class="slot-icon">${icon(EQUIPMENT_ICONS[slot])}</span>
            <span class="slot-label">${escapeHtml(t(locale, SLOT_LABEL_KEYS[slot]))}</span>
          </div>
          <span class="item-name">${escapeHtml(name)}</span>
          <p class="item-desc">${escapeHtml(desc)}</p>
          <span class="item-cost">${cost > 0 ? `${t(locale, "costPrefix")} ${cost} ${t(locale, "pointsShort")}` : "&nbsp;"}</span>
          <select data-action="equipment" data-slot="${slot}" ${blocked ? "disabled" : ""} aria-label="${escapeHtml(t(locale, SLOT_LABEL_KEYS[slot]))}">
            <option value="">${t(locale, "selectItem")}</option>
            ${items
              .map(
                (item) => `
              <option value="${item.id}" ${currentId === item.id ? "selected" : ""}>
                ${escapeHtml(localize(item.name, locale))}
              </option>`,
              )
              .join("")}
          </select>
        </article>`;
      }).join("")}
    </div>`;

  return renderPanel(2, "shield", t(locale, "sectionEquipment"), body, {
    label: t(locale, "openItemCatalog"),
    action: "open-catalog",
    tab: "items",
  });
}

function renderAbilitiesSection(
  locale: Locale,
  draft: CharacterBuild,
  catalog: GameCatalog,
): string {
  const abilities = listAbilities(catalog);
  const selected = abilities.filter((ability) => draft.talentIds.includes(ability.id));
  const available = abilities.filter((ability) => !draft.talentIds.includes(ability.id));

  const renderAbilityCard = (
    ability: (typeof abilities)[number],
    checked: boolean,
    disabled: boolean,
  ) => {
    const polarity = ability.polarity === "negative" ? "negative" : "positive";
    const desc = ability.effects
      .map((e) => (e.display ? localize(e.display, locale) : ""))
      .filter(Boolean)
      .join(" · ");
    return `
      <label class="tile ability-card ${polarity}${checked ? " is-selected" : ""}${disabled ? " is-disabled" : ""}">
        <input
          type="checkbox"
          data-action="talent-toggle"
          data-talent="${ability.id}"
          ${checked ? "checked" : ""}
          ${disabled ? "disabled" : ""}
          hidden
        />
        <div class="row-top">
          <span class="ability-icon">${icon(polarity === "negative" ? "warn" : "sparkle")}</span>
          <span class="cost-chip">${ability.cost > 0 ? "+" : ""}${ability.cost} ${t(locale, "pointsShort")}</span>
        </div>
        <span class="item-name">${escapeHtml(localize(ability.name, locale))}</span>
        <p class="item-desc">${escapeHtml(desc || localize(ability.name, locale))}</p>
      </label>`;
  };

  const cards = [
    ...selected.map((ability) => renderAbilityCard(ability, true, false)),
    ...available.slice(0, Math.max(0, 2 - selected.length)).map((ability) => {
      const disabled =
        draft.talentIds.length >= DEFAULT_RULESET.character.maxTalents;
      return renderAbilityCard(ability, false, disabled);
    }),
  ];

  const overflow =
    available.length > Math.max(0, 2 - selected.length)
      ? `
      <details class="ability-overflow">
        <summary>${t(locale, "addAbility")}</summary>
        <div class="grid-4 abilities-overflow-grid">
          ${available
            .slice(Math.max(0, 2 - selected.length))
            .map((ability) => {
              const disabled =
                draft.talentIds.length >= DEFAULT_RULESET.character.maxTalents;
              return renderAbilityCard(ability, false, disabled);
            })
            .join("")}
        </div>
      </details>`
      : "";

  const body = `
    <div class="grid-4">
      ${cards.join("")}
      <button type="button" class="ability-add" data-action="open-catalog" data-tab="abilities">
        ${icon("sparkle")}
        <span>${t(locale, "addAbility")}</span>
      </button>
    </div>
    ${overflow}`;

  return renderPanel(1, "sparkle", t(locale, "sectionTalents"), body, {
    label: t(locale, "openAbilityCatalog"),
    action: "open-catalog",
    tab: "abilities",
  });
}

function renderActionbar(
  locale: Locale,
  resolved: ReturnType<typeof resolveCharacter>,
  inTeam: boolean,
): string {
  const valid = resolved.validation.valid;
  const statusIcon = valid ? "check" : "warn";
  const statusText = valid
    ? t(locale, "characterRulesOk")
    : t(locale, "characterRulesBad");

  return `
    <div class="actionbar">
      <span class="valid-state${valid ? "" : " is-bad"}">
        ${icon(statusIcon)}
        <span>${statusText}</span>
      </span>
      <span class="total-cost">${t(locale, "totalCostLabel")}: <strong>${resolved.cost.total} ${t(locale, "pointsShort")}</strong></span>
      <button type="button" class="btn primary" data-action="add-to-team">
        ${icon("check")}
        <span>${inTeam ? t(locale, "updateInStash") : t(locale, "saveToTeam")}</span>
      </button>
      <button type="button" class="btn secondary" data-action="new-character">
        ${icon("sparkle")}
        <span>${t(locale, "newCharacter")}</span>
      </button>
      ${
        inTeam
          ? `<button type="button" class="btn secondary danger" data-action="remove-active">${t(locale, "removeFromTeam")}</button>`
          : ""
      }
    </div>`;
}

function renderTeamWorkspace(state: AppState): string {
  const locale = state.locale;
  const draft = state.draft;
  const catalog = catalogFor(state);
  const resolved = resolveCharacter(draft, DEFAULT_RULESET, catalog);
  const draftCard = buildCharacterCard(resolved, cardContext(state));
  const inTeam = state.team.characters.some((c) => c.id === draft.id);

  return `
    ${renderRoster(state)}
    <section class="workspace">
      <div class="editor-column">
        ${renderActionbar(locale, resolved, inTeam)}
        ${renderIdentitySection(state, draft)}
        ${renderStatsSection(locale, draft)}
        ${renderEquipmentSection(locale, draft, resolved, catalog)}
        ${renderAbilitiesSection(locale, draft, catalog)}
      </div>
      <aside class="preview-panel">
        <p class="preview-eyebrow">${t(locale, "cardPreviewLabel")}</p>
        ${renderPreviewCard(locale, draftCard)}
        <p class="preview-hint">
          ${icon("warn")}
          ${t(locale, "liveDraftHint")}
        </p>
      </aside>
    </section>`;
}

export function renderApp(state: AppState): string {
  const locale = state.locale;
  const resolvedTeam = validateTeam(state.team, DEFAULT_RULESET, catalogFor(state));
  const budget = state.team.budget;
  const cost = resolvedTeam.totalCost;
  const ratio = Math.min(100, Math.round((cost / budget) * 100));

  return `
    <main class="app-shell">
      ${
        state.appMode === "catalog"
          ? renderCatalogTopbar(state)
          : renderTopbar(state, cost, budget, ratio)
      }
      ${renderAppNav(state)}
      ${
        state.appMode === "catalog"
          ? renderCatalogMode(state)
          : renderTeamWorkspace(state)
      }
      <p class="catalog-toast hidden" data-role="catalog-toast" aria-live="polite"></p>
    </main>`;
}
