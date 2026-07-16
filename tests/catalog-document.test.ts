import { describe, expect, it } from "vitest";
import {
  buildItemFromDraft,
  createEmptyItemDraft,
  getBaselineCatalogDocument,
  loadCatalogFromJson,
  mergeCatalogDocuments,
  previewItemDraft,
  serializeCatalogDocument,
  validateItemDefinition,
} from "../src/index.js";

describe("catalog document", () => {
  it("loads baseline with weapon subtypes and items", () => {
    const doc = getBaselineCatalogDocument();
    expect(doc.version).toBe("1.1.0");
    expect(doc.weaponSubtypes.melee.length).toBeGreaterThanOrEqual(8);
    expect(doc.weaponSubtypes.ranged.length).toBeGreaterThanOrEqual(5);
    expect(doc.catalog.items["melee-sword"]).toBeDefined();
    expect(doc.catalog.items["leather-armor"]?.meta?.family).toBe("armor");
  });

  it("round-trips through JSON", () => {
    const doc = getBaselineCatalogDocument();
    const restored = loadCatalogFromJson(serializeCatalogDocument(doc));
    expect(restored.catalog.items["great-axe"]?.tags).toContain("two-handed");
  });

  it("merges overlay catalogs", () => {
    const base = getBaselineCatalogDocument();
    const overlay = loadCatalogFromJson(
      serializeCatalogDocument({
        ...base,
        catalog: {
          items: {
            "custom-sword": {
              id: "custom-sword",
              name: { pl: "Custom", en: "Custom" },
              allowedSlots: ["mainWeapon"],
              tags: ["weapon", "melee"],
              actions: [],
              effects: [],
              restrictions: [],
              cost: { fixed: 0 },
              meta: { family: "melee_weapon", subtypeId: "sword" },
            },
          },
          abilities: {},
        },
      }),
    );
    const merged = mergeCatalogDocuments(base, overlay);
    expect(merged.catalog.items["melee-sword"]).toBeDefined();
    expect(merged.catalog.items["custom-sword"]).toBeDefined();
  });
});

describe("item family validation", () => {
  it("rejects negative RS on melee weapon", () => {
    const doc = getBaselineCatalogDocument();
    const draft = {
      ...createEmptyItemDraft("melee_weapon"),
      id: "bad-melee",
      name: { pl: "Zła broń", en: "Bad weapon" },
      subtypeId: "sword",
      selectedTraitIds: [],
    };
    const item = buildItemFromDraft(draft, doc);
    item.effects.push({
      id: "bad-rs",
      type: "modifyStat",
      stat: "RS",
      value: -1,
    });
    item.cost.effectLevels = { negative: 1 };

    const result = validateItemDefinition(item);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "item.forbiddenNegativeStat")).toBe(
      true,
    );
  });

  it("builds ranged weapon with subtype cosmetic only", () => {
    const doc = getBaselineCatalogDocument();
    const draft = {
      ...createEmptyItemDraft("ranged_weapon"),
      id: "crossbow-custom",
      name: { pl: "Kusza rzemieślnika", en: "Craftsman crossbow" },
      subtypeId: "crossbow",
      selectedTraitIds: ["ranged-damage-plus1"],
    };
    const preview = previewItemDraft(draft, doc);
    expect(preview.item.meta?.subtypeId).toBe("crossbow");
    expect(preview.item.actions[0]?.attackType).toBe("ranged");
    expect(preview.cost).toBe(100);
    expect(preview.validation.valid).toBe(true);
  });
});
