import {
  FAMILY_PROFILES,
  getTraitsForFamily,
  inferItemFamily,
  listItems,
  localize,
  previewItemDraft,
  type ItemFamily,
} from "@hobt/lego-skirmish";
import type { AppState } from "./state.js";
import { t, type Locale } from "./i18n.js";
import { sprite } from "./sprites.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const FAMILY_ORDER: ItemFamily[] = [
  "melee_weapon",
  "ranged_weapon",
  "armor",
  "offhand",
  "utility_item",
];

function familyLabel(locale: Locale, family: ItemFamily): string {
  return localize(FAMILY_PROFILES[family].label, locale);
}

function renderItemList(state: AppState): string {
  const locale = state.locale;
  const items = listItems(state.catalogDocument.catalog);
  const grouped = new Map<ItemFamily, typeof items>();

  for (const family of FAMILY_ORDER) {
    grouped.set(family, []);
  }

  for (const item of items) {
    const family = inferItemFamily(item);
    grouped.get(family)?.push(item);
  }

  return FAMILY_ORDER.map((family) => {
    const entries = grouped.get(family) ?? [];
    if (entries.length === 0) {
      return "";
    }
    return `
      <section class="catalog-group">
        <h3>${escapeHtml(familyLabel(locale, family))}</h3>
        <ul class="catalog-item-list">
          ${entries
            .map(
              (item) => `
            <li>
              <button
                type="button"
                class="catalog-item-btn${state.catalogSelectionId === item.id ? " is-active" : ""}"
                data-action="select-catalog-item"
                data-item="${escapeHtml(item.id)}"
              >
                <span>${escapeHtml(localize(item.name, locale))}</span>
                <small>${escapeHtml(item.id)}</small>
              </button>
            </li>`,
            )
            .join("")}
        </ul>
      </section>`;
  }).join("");
}

function renderTraitOptions(state: AppState): string {
  const locale = state.locale;
  const traits = getTraitsForFamily(state.itemDraft.family);
  const selected = new Set(state.itemDraft.selectedTraitIds);

  return traits
    .map((trait) => {
      const checked = selected.has(trait.id);
      return `
        <label class="trait-option${trait.polarity === "negative" ? " is-negative" : ""}">
          <input
            type="checkbox"
            data-action="toggle-item-trait"
            data-trait="${escapeHtml(trait.id)}"
            ${checked ? "checked" : ""}
          />
          <span>${escapeHtml(localize(trait.label, locale))}</span>
        </label>`;
    })
    .join("");
}

function renderSubtypeSelect(state: AppState): string {
  const locale = state.locale;
  const family = state.itemDraft.family;
  if (family !== "melee_weapon" && family !== "ranged_weapon") {
    return "";
  }

  const subtypes =
    family === "melee_weapon"
      ? state.catalogDocument.weaponSubtypes.melee
      : state.catalogDocument.weaponSubtypes.ranged;

  return `
    <label class="field">
      <span>${t(locale, "itemSubtype")}</span>
      <select data-action="item-subtype">
        <option value="">${t(locale, "subtypeCosmetic")}</option>
        ${subtypes
          .map(
            (subtype) => `
          <option value="${escapeHtml(subtype.id)}" ${
            state.itemDraft.subtypeId === subtype.id ? "selected" : ""
          }>
            ${escapeHtml(localize(subtype.name, locale))}
          </option>`,
          )
          .join("")}
      </select>
      <small class="field-hint">${t(locale, "subtypeHint")}</small>
    </label>`;
}

function renderValidation(locale: Locale, preview: ReturnType<typeof previewItemDraft>): string {
  const issues = [...preview.validation.errors, ...preview.validation.warnings];
  if (issues.length === 0) {
    return `<p class="validation-ok">${sprite("i-check")} ${t(locale, "noIssues")}</p>`;
  }

  return `
    <ul class="validation-list">
      ${issues
        .map(
          (issue) => `
        <li class="${issue.severity}">
          ${escapeHtml(localize(issue.message, locale))}
        </li>`,
        )
        .join("")}
    </ul>`;
}

export function renderCatalogMode(state: AppState): string {
  const locale = state.locale;
  const preview = previewItemDraft(state.itemDraft, state.catalogDocument);
  const profile = FAMILY_PROFILES[state.itemDraft.family];

  return `
    <div class="catalog-workspace">
      <aside class="catalog-sidebar">
        <div class="catalog-sidebar-head">
          <h2>${t(locale, "catalogItemsTitle")}</h2>
          <button type="button" class="btn-ghost" data-action="new-catalog-item">
            ${t(locale, "newCatalogItem")}
          </button>
        </div>
        <div class="catalog-list-scroll">${renderItemList(state)}</div>
      </aside>

      <section class="catalog-editor">
        <header class="catalog-editor-head">
          <div>
            <h2>${t(locale, "itemEditorTitle")}</h2>
            <p>${t(locale, "itemEditorHint")}</p>
          </div>
        </header>

        <div class="catalog-form-grid">
          <label class="field">
            <span>${t(locale, "itemFamily")}</span>
            <select data-action="item-family">
              ${FAMILY_ORDER.map(
                (family) => `
                <option value="${family}" ${
                  state.itemDraft.family === family ? "selected" : ""
                }>
                  ${escapeHtml(familyLabel(locale, family))}
                </option>`,
              ).join("")}
            </select>
          </label>

          ${renderSubtypeSelect(state)}

          <label class="field">
            <span>${t(locale, "itemId")}</span>
            <input
              type="text"
              data-action="item-id"
              value="${escapeHtml(state.itemDraft.id)}"
              placeholder="melee-sword"
            />
          </label>

          <label class="field">
            <span>${t(locale, "name")} (PL)</span>
            <input
              type="text"
              data-action="item-name-pl"
              value="${escapeHtml(state.itemDraft.name.pl)}"
            />
          </label>

          <label class="field">
            <span>${t(locale, "name")} (EN)</span>
            <input
              type="text"
              data-action="item-name-en"
              value="${escapeHtml(state.itemDraft.name.en)}"
            />
          </label>

          <label class="field">
            <span>${t(locale, "itemFixedCost")}</span>
            <input
              type="number"
              data-action="item-fixed-cost"
              value="${state.itemDraft.fixedCost}"
              min="${profile.minFixedCost}"
              max="${profile.maxFixedCost}"
            />
          </label>

          ${
            state.itemDraft.family === "melee_weapon"
              ? `
          <label class="field field-check">
            <input
              type="checkbox"
              data-action="item-two-handed"
              ${state.itemDraft.twoHanded ? "checked" : ""}
            />
            <span>${t(locale, "itemTwoHanded")}</span>
          </label>`
              : ""
          }
        </div>

        <section class="catalog-traits">
          <h3>${t(locale, "itemTraits")}</h3>
          <p class="field-hint">${t(locale, "itemTraitsHint")}</p>
          <div class="trait-grid">${renderTraitOptions(state)}</div>
        </section>

        <div class="catalog-editor-actions">
          <button type="button" class="btn-primary" data-action="save-catalog-item">
            ${t(locale, "saveCatalogItem")}
          </button>
          ${
            state.catalogSelectionId
              ? `<button type="button" class="btn-ghost danger" data-action="delete-catalog-item" data-item="${escapeHtml(state.catalogSelectionId)}">
                  ${t(locale, "deleteCatalogItem")}
                </button>`
              : ""
          }
        </div>
      </section>

      <aside class="catalog-preview">
        <h3>${t(locale, "itemPreview")}</h3>
        <div class="preview-card">
          <p><strong>${escapeHtml(localize(preview.item.name, locale))}</strong></p>
          <p class="preview-meta">${escapeHtml(preview.item.id)} · ${escapeHtml(familyLabel(locale, preview.item.meta?.family ?? state.itemDraft.family))}</p>
          <p>${t(locale, "characterCost")}: <strong>${preview.cost} ${t(locale, "points")}</strong></p>
          <p>${t(locale, "equipmentSlots")}: ${preview.item.allowedSlots.join(", ")}</p>
          ${renderValidation(locale, preview)}
        </div>
        <details class="json-preview">
          <summary>${t(locale, "jsonPreview")}</summary>
          <pre>${escapeHtml(JSON.stringify(preview.item, null, 2))}</pre>
        </details>
      </aside>
    </div>`;
}
