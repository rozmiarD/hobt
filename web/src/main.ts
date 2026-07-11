import type { EquipmentSlot, PurchasableStat } from "@hobt/lego-skirmish/types/domain.js";
import { renderApp } from "./render.js";
import { PortraitError, processPortraitFile } from "./portrait.js";
import {
  addDraftToTeam,
  clearAll,
  loadState,
  removeFromTeam,
  saveState,
  selectTeamCharacter,
  setActiveEditorStep,
  setCardTheme,
  setCatalogSort,
  setDraftEquipment,
  setDraftFaction,
  setDraftName,
  setDraftPortrait,
  setDraftStat,
  setDraftSubtitle,
  setEquipmentSlotFilter,
  setLocale,
  setMaxCostFilter,
  setMobilePanel,
  setSearchQuery,
  setTalentFilter,
  setTeamName,
  startNewCharacter,
  toggleDraftTalent,
  type AppState,
  type CatalogSort,
  type EditorStep,
  type TalentFilter,
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
  item?: string;
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
    item: active.dataset.item,
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
    if (snapshot.item && candidate.dataset.item !== snapshot.item) {
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

function exportConfiguration(): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hobt-team-${state.team.name || "export"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearTeam(state: AppState): AppState {
  return {
    ...state,
    team: { ...state.team, characters: [] },
    activeCharacterId: null,
  };
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
    const step = button.dataset.step as EditorStep;
    update((current) => setActiveEditorStep(current, step));
    return;
  }

  if (action === "slot-filter" && button.dataset.slot) {
    update((current) =>
      setEquipmentSlotFilter(current, button.dataset.slot as EquipmentSlot),
    );
    return;
  }

  if (action === "talent-filter" && button.dataset.filter) {
    update((current) =>
      setTalentFilter(current, button.dataset.filter as TalentFilter),
    );
    return;
  }

  if (action === "equip-item" && button.dataset.item && button.dataset.slot) {
    const slot = button.dataset.slot as EquipmentSlot;
    const itemId = button.dataset.item;
    update((current) => {
      const currentId = current.draft.equipment[slot]?.itemId;
      return setDraftEquipment(
        current,
        slot,
        currentId === itemId ? null : itemId,
      );
    });
    return;
  }

  if (action === "talent-card" && button.dataset.talent) {
    update((current) => toggleDraftTalent(current, button.dataset.talent!));
    return;
  }

  if (action === "add-to-team") {
    update(addDraftToTeam);
    return;
  }

  if (action === "remove-character" && button.dataset.character) {
    update((current) => removeFromTeam(current, button.dataset.character!));
    return;
  }

  if (action === "portrait-remove") {
    update((current) => setDraftPortrait(current, undefined));
    return;
  }

  if (action === "select-character" && button.dataset.character) {
    update((current) => selectTeamCharacter(current, button.dataset.character!));
    return;
  }

  if (action === "clear-all") {
    if (window.confirm(t(state.locale, "clearAll") + "?")) {
      update(clearAll);
    }
    return;
  }

  if (action === "clear-team") {
    if (window.confirm(t(state.locale, "clearTeam") + "?")) {
      update(clearTeam);
    }
    return;
  }

  if (action === "save-config") {
    saveState(state);
    return;
  }

  if (action === "export-json") {
    exportConfiguration();
    return;
  }

  if (action === "open-filters") {
    update((current) => setMobilePanel(current, "filters"));
    return;
  }

  if (action === "open-team") {
    update((current) => setMobilePanel(current, "team"));
    return;
  }

  if (action === "close-panel") {
    update((current) => setMobilePanel(current, "none"));
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

  if (action === "search" && target instanceof HTMLInputElement) {
    update((current) => setSearchQuery(current, target.value));
    return;
  }

  if (action === "cost-filter" && target instanceof HTMLInputElement) {
    update((current) => setMaxCostFilter(current, Number(target.value)));
    return;
  }

  if (action === "cost-filter-input" && target instanceof HTMLInputElement) {
    update((current) => setMaxCostFilter(current, Number(target.value)));
  }
});

root.addEventListener("change", async (event) => {
  const target = event.target as HTMLElement;

  if (target instanceof HTMLSelectElement && target.dataset.action === "catalog-sort") {
    update((current) => setCatalogSort(current, target.value as CatalogSort));
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

  if (target instanceof HTMLSelectElement && target.dataset.action === "card-theme") {
    update((current) => setCardTheme(current, target.value));
  }
});

paint();
