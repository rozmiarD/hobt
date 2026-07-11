import type { EquipmentSlot, PurchasableStat } from "@hobt/lego-skirmish/types/domain.js";
import { renderApp } from "./render.js";
import { PortraitError, processPortraitFile } from "./portrait.js";
import {
  addDraftToTeam,
  loadState,
  removeFromTeam,
  saveState,
  selectTeamCharacter,
  setCardTheme,
  setDraftEquipment,
  setDraftFaction,
  setDraftName,
  setDraftPortrait,
  setDraftStat,
  setDraftSubtitle,
  setLocale,
  setTeamName,
  startNewCharacter,
  toggleDraftTalent,
  type AppState,
} from "./state.js";
import { t, type Locale } from "./i18n.js";

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

function showPortraitError(message: string): void {
  const node = root.querySelector<HTMLElement>('[data-role="portrait-error"]');
  if (!node) {
    return;
  }
  node.textContent = message;
  node.classList.remove("hidden");
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

root.addEventListener("change", async (event) => {
  const target = event.target as HTMLElement;

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
  }
});

paint();
