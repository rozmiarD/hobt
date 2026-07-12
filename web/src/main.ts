import type { EquipmentSlot, PurchasableStat } from "@hobt/lego-skirmish/types/domain.js";
import type { ItemFamily } from "@hobt/lego-skirmish";
import { loadCatalogFromJson, serializeCatalogDocument } from "@hobt/lego-skirmish";
import { renderApp } from "./render.js";
import { PortraitError, processPortraitFile } from "./portrait.js";
import {
  addDraftToTeam,
  deleteCatalogItem,
  loadState,
  removeFromTeam,
  resetCatalogToBaseline,
  saveItemDraftToCatalog,
  saveState,
  selectCatalogItem,
  selectTeamCharacter,
  setActiveEditorStep,
  setAppMode,
  setCardTheme,
  setCatalogDocument,
  setDraftEquipment,
  setDraftFaction,
  setDraftName,
  setDraftPortrait,
  setDraftStat,
  setDraftSubtitle,
  setItemDraftFamily,
  setItemDraftFixedCost,
  setItemDraftId,
  setItemDraftName,
  setItemDraftSubtype,
  setItemDraftTwoHanded,
  setLocale,
  setTeamName,
  startNewCatalogItem,
  startNewCharacter,
  toggleDraftTalent,
  toggleItemDraftTrait,
  type AppMode,
  type AppState,
  type EditorStep,
} from "./state.js";
import { t, type Locale } from "./i18n.js";

let state = loadState();
const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app root element");
}

interface FocusSnapshot {
  action: string;
  slot?: string;
  talent?: string;
  character?: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}

function captureFocus(): FocusSnapshot | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) {
    return null;
  }

  const action = active.dataset.action;
  if (!action) {
    return null;
  }

  const hasSelection =
    active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

  return {
    action,
    slot: active.dataset.slot,
    talent: active.dataset.talent,
    character: active.dataset.character,
    selectionStart: hasSelection ? active.selectionStart : null,
    selectionEnd: hasSelection ? active.selectionEnd : null,
  };
}

function restoreFocus(snapshot: FocusSnapshot | null): void {
  if (!snapshot) {
    return;
  }

  const candidates = root.querySelectorAll<HTMLElement>(
    `[data-action="${snapshot.action}"]`,
  );
  let target: HTMLElement | null = null;

  for (const candidate of candidates) {
    if (snapshot.slot && candidate.dataset.slot !== snapshot.slot) {
      continue;
    }
    if (snapshot.talent && candidate.dataset.talent !== snapshot.talent) {
      continue;
    }
    if (snapshot.character && candidate.dataset.character !== snapshot.character) {
      continue;
    }
    target = candidate;
    break;
  }

  if (!target) {
    return;
  }

  target.focus();

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  ) {
    const start = snapshot.selectionStart ?? target.value.length;
    const end = snapshot.selectionEnd ?? start;
    target.setSelectionRange(start, end);
  }
}

function commit(next: AppState): void {
  state = next;
  saveState(state);
  paint();
}

function update(updater: (current: AppState) => AppState): void {
  commit(updater(state));
}

function paint(): void {
  const focus = captureFocus();
  root.innerHTML = renderApp(state);
  restoreFocus(focus);
}

function showPortraitError(message: string): void {
  const node = root.querySelector<HTMLElement>('[data-role="portrait-error"]');
  if (!node) {
    return;
  }
  node.textContent = message;
  node.classList.remove("hidden");
}

function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function showCatalogToast(message: string): void {
  const node = root.querySelector<HTMLElement>('[data-role="catalog-toast"]');
  if (!node) {
    return;
  }
  node.textContent = message;
  node.classList.remove("hidden");
  window.setTimeout(() => node.classList.add("hidden"), 3200);
}

root.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest<HTMLElement>("[data-action]");
  if (!button) {
    return;
  }

  const action = button.dataset.action;

  if (action === "locale" && button.dataset.locale) {
    update((current) => setLocale(current, button.dataset.locale as Locale));
    return;
  }

  if (action === "app-mode" && button.dataset.mode) {
    update((current) => setAppMode(current, button.dataset.mode as AppMode));
    return;
  }

  if (action === "export-catalog") {
    downloadJson(
      `hobt-catalog-${state.catalogDocument.version}.json`,
      serializeCatalogDocument(state.catalogDocument),
    );
    return;
  }

  if (action === "import-catalog") {
    root.querySelector<HTMLInputElement>('[data-action="catalog-file"]')?.click();
    return;
  }

  if (action === "reset-catalog") {
    if (window.confirm(t(state.locale, "resetCatalog") + "?")) {
      update(resetCatalogToBaseline);
    }
    return;
  }

  if (action === "new-catalog-item") {
    update(startNewCatalogItem);
    return;
  }

  if (action === "select-catalog-item" && button.dataset.item) {
    update((current) => selectCatalogItem(current, button.dataset.item!));
    return;
  }

  if (action === "save-catalog-item") {
    update(saveItemDraftToCatalog);
    return;
  }

  if (action === "delete-catalog-item" && button.dataset.item) {
    if (window.confirm(t(state.locale, "deleteCatalogItem") + "?")) {
      update((current) => deleteCatalogItem(current, button.dataset.item!));
    }
    return;
  }

  if (action === "stat-inc" && button.dataset.stat) {
    const stat = button.dataset.stat as PurchasableStat;
    update((current) =>
      setDraftStat(current, stat, current.draft.baseStats[stat] + 1),
    );
    return;
  }

  if (action === "stat-dec" && button.dataset.stat) {
    const stat = button.dataset.stat as PurchasableStat;
    update((current) =>
      setDraftStat(current, stat, current.draft.baseStats[stat] - 1),
    );
    return;
  }

  if (action === "new-character") {
    update(startNewCharacter);
    return;
  }

  if (action === "goto-step" && button.dataset.step) {
    update((current) =>
      setActiveEditorStep(current, button.dataset.step as EditorStep),
    );
    return;
  }

  if (action === "add-to-team") {
    update(addDraftToTeam);
    return;
  }

  if (action === "remove-active" && state.draft.id) {
    update((current) => removeFromTeam(current, current.draft.id));
    return;
  }

  if (action === "portrait-remove") {
    update((current) => setDraftPortrait(current, undefined));
    return;
  }

  if (action === "select-character" && button.dataset.character) {
    update((current) => selectTeamCharacter(current, button.dataset.character!));
  }
});

root.addEventListener("input", (event) => {
  const target = event.target as HTMLElement;
  const control = target.closest<HTMLElement>("[data-action]");
  if (!control) {
    return;
  }

  const action = control.dataset.action;

  if (action === "name" && target instanceof HTMLInputElement) {
    update((current) => setDraftName(current, target.value));
    return;
  }

  if (action === "subtitle" && target instanceof HTMLInputElement) {
    update((current) => setDraftSubtitle(current, target.value));
    return;
  }

  if (action === "faction" && target instanceof HTMLInputElement) {
    update((current) => setDraftFaction(current, target.value));
    return;
  }

  if (action === "team-name" && target instanceof HTMLInputElement) {
    update((current) => setTeamName(current, target.value));
    return;
  }

  if (action === "item-id" && target instanceof HTMLInputElement) {
    update((current) => setItemDraftId(current, target.value));
    return;
  }

  if (action === "item-name-pl" && target instanceof HTMLInputElement) {
    update((current) => setItemDraftName(current, "pl", target.value));
    return;
  }

  if (action === "item-name-en" && target instanceof HTMLInputElement) {
    update((current) => setItemDraftName(current, "en", target.value));
  }
});

root.addEventListener("change", async (event) => {
  const target = event.target as HTMLElement;

  if (
    target instanceof HTMLInputElement &&
    target.dataset.action === "toggle-item-trait" &&
    target.dataset.trait
  ) {
    update((current) => toggleItemDraftTrait(current, target.dataset.trait!));
    return;
  }

  if (
    target instanceof HTMLInputElement &&
    target.dataset.action === "item-two-handed"
  ) {
    update((current) => setItemDraftTwoHanded(current, target.checked));
    return;
  }

  if (
    target instanceof HTMLInputElement &&
    target.dataset.action === "item-fixed-cost"
  ) {
    update((current) =>
      setItemDraftFixedCost(current, Number.parseInt(target.value, 10) || 0),
    );
    return;
  }

  if (
    target instanceof HTMLInputElement &&
    target.dataset.action === "catalog-file" &&
    target.files?.[0]
  ) {
    const file = target.files[0];
    try {
      const text = await file.text();
      const document = loadCatalogFromJson(text);
      update((current) => setCatalogDocument(current, document));
      showCatalogToast(t(state.locale, "catalogImportSuccess"));
    } catch {
      showCatalogToast(t(state.locale, "catalogImportError"));
    } finally {
      target.value = "";
    }
    return;
  }

  if (target instanceof HTMLSelectElement && target.dataset.action === "item-family") {
    update((current) => setItemDraftFamily(current, target.value as ItemFamily));
    return;
  }

  if (target instanceof HTMLSelectElement && target.dataset.action === "item-subtype") {
    update((current) => setItemDraftSubtype(current, target.value));
    return;
  }

  if (
    target instanceof HTMLInputElement &&
    target.dataset.action === "talent-toggle" &&
    target.dataset.talent
  ) {
    update((current) => toggleDraftTalent(current, target.dataset.talent!));
    return;
  }

  if (
    target instanceof HTMLInputElement &&
    target.dataset.action === "portrait-upload" &&
    target.files?.[0]
  ) {
    const file = target.files[0];
    try {
      const dataUrl = await processPortraitFile(file);
      update((current) => setDraftPortrait(current, dataUrl));
    } catch (error) {
      if (error instanceof PortraitError) {
        const key =
          error.code === "too_large"
            ? "portraitErrorTooLarge"
            : "portraitErrorType";
        showPortraitError(t(state.locale, key));
      }
    } finally {
      target.value = "";
    }
    return;
  }

  if (target instanceof HTMLSelectElement && target.dataset.action === "equipment") {
    const slot = target.dataset.slot as EquipmentSlot;
    update((current) => setDraftEquipment(current, slot, target.value || null));
    return;
  }

  if (target instanceof HTMLSelectElement && target.dataset.action === "card-theme") {
    update((current) => setCardTheme(current, target.value));
  }
});

paint();
