import type { EquipmentSlot, PurchasableStat } from "@hobt/lego-skirmish/types/domain.js";
import { renderApp } from "./render.js";
import {
  addDraftToTeam,
  loadState,
  removeFromTeam,
  saveState,
  selectTeamCharacter,
  setCardTheme,
  setDraftEquipment,
  setDraftName,
  setDraftStat,
  setLocale,
  startNewCharacter,
  toggleDraftTalent,
  type AppState,
} from "./state.js";
import type { Locale } from "./i18n.js";

let state = loadState();
const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Missing #app root element");
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
  root.innerHTML = renderApp(state);
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

  if (action === "add-to-team") {
    update(addDraftToTeam);
    return;
  }

  if (action === "remove-active" && state.draft.id) {
    update((current) => removeFromTeam(current, current.draft.id));
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

  if (action === "equipment" && target instanceof HTMLSelectElement) {
    const slot = control.dataset.slot as EquipmentSlot;
    update((current) =>
      setDraftEquipment(current, slot, target.value || null),
    );
    return;
  }

  if (action === "card-theme" && target instanceof HTMLSelectElement) {
    update((current) => setCardTheme(current, target.value));
  }
});

root.addEventListener("change", (event) => {
  const target = event.target as HTMLElement;
  if (
    target instanceof HTMLInputElement &&
    target.dataset.action === "talent-toggle" &&
    target.dataset.talent
  ) {
    update((current) => toggleDraftTalent(current, target.dataset.talent!));
  }
});

paint();
