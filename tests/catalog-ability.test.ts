import { describe, expect, it } from "vitest";
import {
  abilityDraftFromDefinition,
  buildAbilityFromDraft,
  createEmptyAbilityDraft,
  getBaselineCatalogDocument,
  previewAbilityDraft,
  validateAbilityDefinition,
} from "../src/index.js";

describe("ability builder", () => {
  it("builds positive combat talent with standard cost", () => {
    const draft = {
      ...createEmptyAbilityDraft("positive"),
      id: "custom-strong-blow",
      name: { pl: "Mocny cios", en: "Strong blow" },
      selectedTraitIds: ["ab-melee-damage"],
    };
    const preview = previewAbilityDraft(draft);
    expect(preview.ability.cost).toBe(100);
    expect(preview.ability.effects).toHaveLength(1);
    expect(preview.validation.valid).toBe(true);
  });

  it("builds negative drawback with restrictions", () => {
    const draft = {
      ...createEmptyAbilityDraft("negative"),
      id: "custom-fragile",
      name: { pl: "Kruchy", en: "Fragile" },
      selectedTraitIds: ["ab-hp-penalty"],
    };
    const ability = buildAbilityFromDraft(draft);
    expect(ability.cost).toBe(-100);
    expect(ability.restrictions.length).toBeGreaterThan(0);
    expect(validateAbilityDefinition(ability).valid).toBe(true);
  });

  it("round-trips baseline two-weapon-fighting", () => {
    const doc = getBaselineCatalogDocument();
    const ability = doc.catalog.abilities["two-weapon-fighting"];
    expect(ability).toBeDefined();
    const draft = abilityDraftFromDefinition(ability!);
    const rebuilt = buildAbilityFromDraft(draft);
    expect(rebuilt.effects.some((e) => e.type === "conditionalModifier")).toBe(
      true,
    );
    expect(rebuilt.requirements.length).toBeGreaterThan(0);
  });

  it("round-trips the baseline armor-blocking drawback", () => {
    const doc = getBaselineCatalogDocument();
    const ability = doc.catalog.abilities["unarmoured"];
    expect(ability).toBeDefined();
    const draft = abilityDraftFromDefinition(ability!);
    expect(draft.selectedTraitIds).toEqual(["ab-block-armor"]);
    const rebuilt = buildAbilityFromDraft(draft);
    expect(
      rebuilt.effects.some(
        (effect) => effect.type === "blockSlot" && effect.slot === "armor",
      ),
    ).toBe(true);
  });
});
