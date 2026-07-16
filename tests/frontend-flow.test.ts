import { describe, expect, it } from "vitest";
import { renderApp } from "../web/src/render.js";
import {
  addDraftToTeam,
  createInitialState,
  duplicateCharacter,
  selectTeamCharacter,
  selectAllForPrint,
  setAppMode,
  setDraftEquipment,
  setDraftName,
  setDraftPortraitCrop,
  setDraftStat,
  setDraftSubtitle,
  setPrintCopies,
  toggleDraftTalent,
} from "../web/src/state.js";

function buildReadyHero() {
  let state = createInitialState();
  state = setDraftName(state, "Mira Żelazna");
  state = setDraftStat(state, "MS", 3);
  state = setDraftStat(state, "HP", 3);
  state = setDraftStat(state, "MP", 3);
  state = setDraftEquipment(state, "mainWeapon", "melee-sword");
  state = toggleDraftTalent(state, "strong-blow");
  return state;
}

describe("frontend character flow", () => {
  it("renders a live card and saves the ready hero to the collection", () => {
    let state = buildReadyHero();
    const builder = renderApp(state);

    expect(builder).toContain("Mira Żelazna");
    expect(builder).toContain("hero-card-preview");
    expect(builder).not.toContain('data-action="add-to-team" disabled');

    state = addDraftToTeam(state);
    expect(state.team.characters).toHaveLength(1);
    expect(state.selectedForPrint).toEqual([state.draft.id]);
    expect(state.printCopies[state.draft.id]).toBe(1);

    const collection = renderApp(setAppMode(state, "collection"));
    expect(collection).toContain("collection-card-stage");
    expect(collection).toContain('data-action="duplicate-character"');

    state = selectTeamCharacter(state, state.draft.id);
    state = setDraftSubtitle(state, "Strażniczka Bramy");
    state = addDraftToTeam(state);
    expect(state.team.characters).toHaveLength(1);
    expect(state.team.characters[0]?.subtitle).toBe("Strażniczka Bramy");
  });

  it("duplicates cards and prepares repeated copies for A4 print sheets", () => {
    let state = addDraftToTeam(buildReadyHero());
    const originalId = state.draft.id;
    state = duplicateCharacter(state, originalId);
    state = selectAllForPrint(state, true);
    state = setPrintCopies(state, originalId, 2);
    state = setAppMode(state, "print");

    expect(state.team.characters).toHaveLength(2);
    expect(state.team.characters[1]?.id).not.toBe(originalId);

    const printView = renderApp(state);
    expect(printView).toContain("print-sheet");
    expect(printView.match(/hero-card-print/g)).toHaveLength(3);
  });

  it("clamps persisted portrait crop controls to safe bounds", () => {
    let state = createInitialState();
    state = setDraftPortraitCrop(state, "portraitPositionX", -40);
    state = setDraftPortraitCrop(state, "portraitPositionY", 160);
    state = setDraftPortraitCrop(state, "portraitZoom", 4);

    expect(state.draft.cosmetics.portraitPositionX).toBe(0);
    expect(state.draft.cosmetics.portraitPositionY).toBe(100);
    expect(state.draft.cosmetics.portraitZoom).toBe(2);
  });

  it("keeps both catalog editors and local import/export controls reachable", () => {
    const catalog = renderApp(setAppMode(createInitialState(), "catalog"));

    expect(catalog.match(/data-action="catalog-tab"/g)).toHaveLength(2);
    expect(catalog).toContain('data-action="import-catalog"');
    expect(catalog).toContain('data-action="export-catalog"');
    expect(catalog).toContain('data-action="reset-catalog"');
  });
});
