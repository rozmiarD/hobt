import { describe, expect, it } from "vitest";
import { buildCharacterCard, DEFAULT_CATALOG, DEFAULT_RULESET, resolveCharacter } from "../src/index.js";
import type { CharacterBuild } from "../src/types/index.js";

const sample: CharacterBuild = {
  id: "chr-1",
  name: "KAPITAN AEGIS",
  subtitle: "Strażnik Północnej Bramy",
  faction: "Zakon Chromu",
  baseStats: { MS: 3, RS: 1, LS: 3, KS: 2, HP: 3, MP: 3 },
  equipment: {
    mainWeapon: { itemId: "melee-sword" },
    offhand: { itemId: "shield" },
  },
  talentIds: ["strong-blow"],
  cosmetics: {},
};

describe("buildCharacterCard", () => {
  it("follows spec field order and stat sequence", () => {
    const resolved = resolveCharacter(sample, DEFAULT_RULESET, DEFAULT_CATALOG);
    const card = buildCharacterCard(resolved, {
      teamName: "Team A",
      templateId: "fantasy",
      locale: "pl",
    });

    expect(card.name).toBe("KAPITAN AEGIS");
    expect(card.subtitle).toBe("Strażnik Północnej Bramy");
    expect(card.faction).toBe("Zakon Chromu");
    expect(card.team).toBe("Team A");
    expect(card.points).toBe(resolved.cost.total);
    expect(card.stats).toEqual({
      hp: 3,
      mp: 3,
      ac: 1,
      ms: 3,
      rs: 1,
      ls: 3,
      ks: 2,
    });
    expect(card.equipment.mainWeapon?.name).toBe("Miecz");
    expect(card.equipment.offhand?.name).toBe("Tarcza");
    expect(card.abilities.length).toBeGreaterThan(0);
    expect(card.abilities[0]?.name).toBe("Atak główny");
    expect(card.template.id).toBe("fantasy");
  });

  it("omits empty subtitle and faction", () => {
    const resolved = resolveCharacter(
      { ...sample, subtitle: "  ", faction: "" },
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    const card = buildCharacterCard(resolved, { locale: "en" });
    expect(card.subtitle).toBeUndefined();
    expect(card.faction).toBeUndefined();
  });
});
