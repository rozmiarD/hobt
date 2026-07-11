import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOG } from "../src/catalog/default-catalog.js";
import {
  getItemsForSlot,
  listAbilities,
  localize,
} from "../src/catalog/helpers.js";

describe("catalog helpers", () => {
  it("filters items by slot", () => {
    const offhandItems = getItemsForSlot(DEFAULT_CATALOG, "offhand");
    expect(offhandItems.some((item) => item.id === "melee-sword")).toBe(true);
    expect(offhandItems.some((item) => item.id === "ranged-bow")).toBe(false);
  });

  it("lists abilities and localizes text", () => {
    const abilities = listAbilities(DEFAULT_CATALOG);
    expect(abilities.length).toBeGreaterThan(0);
    expect(localize(abilities[0]!.name, "pl")).toBeTruthy();
    expect(localize(abilities[0]!.name, "en")).toBeTruthy();
  });
});
