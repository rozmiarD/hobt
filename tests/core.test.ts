import { describe, expect, it } from "vitest";
import {
  attributeCost,
  buildCharacterCardSnapshot,
  canPerformOffhandAttack,
  DEFAULT_CATALOG,
  DEFAULT_RULESET,
  majorEffectCost,
  resolveAttack,
  resolveCharacter,
  testD6,
  validateTeam,
} from "../src/index.js";
import type { CharacterBuild, Team } from "../src/types/index.js";

function makeCharacter(
  overrides: Partial<CharacterBuild> = {},
): CharacterBuild {
  return {
    id: "char-1",
    name: "Test Character",
    baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 0, MP: 0 },
    equipment: {},
    talentIds: [],
    cosmetics: {},
    ...overrides,
  };
}

describe("attribute cost", () => {
  it.each([
    [0, 0],
    [1, 10],
    [2, 30],
    [3, 60],
    [4, 100],
    [5, 150],
    [6, 210],
  ])("cost(%i) = %i", (level, expected) => {
    expect(attributeCost(level)).toBe(expected);
  });
});

describe("major effect cost", () => {
  it.each([
    [1, 100],
    [2, 300],
    [3, 600],
  ])("effectCost(%i) = %i", (level, expected) => {
    expect(majorEffectCost(level)).toBe(expected);
  });
});

describe("d6 test", () => {
  it("stat 0, roll 1 → success", () => {
    expect(testD6(0, 1)).toBe(true);
  });

  it("stat 5, roll 6 → failure", () => {
    expect(testD6(5, 6)).toBe(false);
  });

  it("stat 3, roll 3 → success", () => {
    expect(testD6(3, 3)).toBe(true);
  });

  it("stat 3, roll 4 → failure", () => {
    expect(testD6(3, 4)).toBe(false);
  });

  it("stat 6, roll 6 → failure (natural 6 rule)", () => {
    expect(testD6(6, 6)).toBe(false);
  });
});

describe("ranged attack", () => {
  it("no LoS → attack not allowed", () => {
    const result = resolveAttack({
      attackType: "ranged",
      attackerMS: 0,
      attackerRS: 3,
      defenderAC: 0,
      damage: 1,
      hasLineOfSight: false,
      attackRoll: 2,
      armorRoll: 1,
    });
    expect(result.allowed).toBe(false);
  });

  it("LoS exists → RS test can be made", () => {
    const result = resolveAttack({
      attackType: "ranged",
      attackerMS: 0,
      attackerRS: 3,
      defenderAC: 0,
      damage: 1,
      hasLineOfSight: true,
      attackRoll: 2,
      armorRoll: 1,
    });
    expect(result.allowed).toBe(true);
    expect(result.attackSuccess).toBe(true);
  });
});

describe("armor resolution", () => {
  it("missed attack → no AC test", () => {
    const result = resolveAttack({
      attackType: "melee",
      attackerMS: 2,
      attackerRS: 0,
      defenderAC: 3,
      damage: 1,
      hasLineOfSight: true,
      attackRoll: 5,
      armorRoll: 1,
    });
    expect(result.attackSuccess).toBe(false);
    expect(result.armorTested).toBe(false);
    expect(result.outcome).toBe("miss");
  });

  it("hit + successful AC → no damage", () => {
    const result = resolveAttack({
      attackType: "melee",
      attackerMS: 5,
      attackerRS: 0,
      defenderAC: 3,
      damage: 1,
      hasLineOfSight: true,
      attackRoll: 2,
      armorRoll: 2,
    });
    expect(result.attackSuccess).toBe(true);
    expect(result.armorTested).toBe(true);
    expect(result.armorSuccess).toBe(true);
    expect(result.outcome).toBe("blocked");
    expect(result.damageDealt).toBe(0);
  });

  it("hit + failed AC → HP loss", () => {
    const result = resolveAttack({
      attackType: "melee",
      attackerMS: 5,
      attackerRS: 0,
      defenderAC: 1,
      damage: 1,
      hasLineOfSight: true,
      attackRoll: 2,
      armorRoll: 5,
    });
    expect(result.outcome).toBe("damage");
    expect(result.damageDealt).toBe(1);
  });
});

describe("great weapon fighting", () => {
  it("empty offhand → legal", () => {
    const character = makeCharacter({
      baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 3, MP: 2 },
      talentIds: ["great-weapon-fighting"],
      equipment: {
        mainWeapon: { itemId: "melee-sword" },
      },
    });
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(true);
  });

  it("occupied offhand → illegal", () => {
    const character = makeCharacter({
      talentIds: ["great-weapon-fighting"],
      equipment: {
        mainWeapon: { itemId: "melee-sword" },
        offhand: { itemId: "shield" },
      },
    });
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(false);
    expect(
      resolved.validation.errors.some(
        (error) => error.code === "great_weapon_offhand_occupied",
      ),
    ).toBe(true);
  });
});

describe("two-weapon fighting", () => {
  const base = () =>
    makeCharacter({
      baseStats: { MS: 3, RS: 0, LS: 0, KS: 0, HP: 3, MP: 3 },
      equipment: {
        mainWeapon: { itemId: "melee-sword" },
      },
      talentIds: ["two-weapon-fighting"],
    });

  it("missing offhand → illegal", () => {
    const resolved = resolveCharacter(base(), DEFAULT_RULESET, DEFAULT_CATALOG);
    expect(resolved.validation.valid).toBe(false);
  });

  it("offhand not melee weapon → illegal", () => {
    const character = {
      ...base(),
      equipment: {
        mainWeapon: { itemId: "melee-sword" },
        offhand: { itemId: "shield" },
      },
    };
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(false);
  });

  it("primary hit → no offhand attack", () => {
    expect(
      canPerformOffhandAttack({
        primaryMeleeHit: true,
        hasTwoWeaponFighting: true,
        offhandIsMeleeWeapon: true,
        offhandBlocked: false,
      }),
    ).toBe(false);
  });

  it("primary miss → offhand attack available", () => {
    expect(
      canPerformOffhandAttack({
        primaryMeleeHit: false,
        hasTwoWeaponFighting: true,
        offhandIsMeleeWeapon: true,
        offhandBlocked: false,
      }),
    ).toBe(true);
  });
});

describe("iron berserker example", () => {
  it("matches contract cost breakdown", () => {
    const character = makeCharacter({
      name: "Żelazny Berserker",
      baseStats: { MS: 3, RS: 0, LS: 0, KS: 0, HP: 4, MP: 3 },
      talentIds: ["strong-blow", "great-weapon-fighting"],
    });
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.cost.attributes.reduce((s, e) => s + e.amount, 0)).toBe(220);
    expect(resolved.cost.abilities.reduce((s, e) => s + e.amount, 0)).toBe(0);
    expect(resolved.cost.total).toBe(220);
    expect(resolved.derivedStats.HP).toBe(4);
    expect(resolved.derivedStats.MP).toBe(3);
  });
});

describe("vital stats validation", () => {
  it("default draft with HP=0 and MP=0 is not rules-compliant", () => {
    const resolved = resolveCharacter(
      makeCharacter(),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(false);
    expect(
      resolved.validation.errors.some((error) => error.code === "hp_zero_or_less"),
    ).toBe(true);
    expect(
      resolved.validation.errors.some((error) => error.code === "mp_zero_or_less"),
    ).toBe(true);
  });

  it("derived HP <= 0 is not rules-compliant", () => {
    const resolved = resolveCharacter(
      makeCharacter({
        baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 1, MP: 2 },
        talentIds: ["fragile"],
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.derivedStats.HP).toBe(0);
    expect(resolved.validation.valid).toBe(false);
    expect(
      resolved.validation.errors.some((error) => error.code === "hp_zero_or_less"),
    ).toBe(true);
  });

  it("derived MP <= 0 is not rules-compliant", () => {
    const resolved = resolveCharacter(
      makeCharacter({
        baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 3, MP: 0 },
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(false);
    expect(
      resolved.validation.errors.some((error) => error.code === "mp_zero_or_less"),
    ).toBe(true);
  });

  it("positive derived HP and MP is rules-compliant", () => {
    const resolved = resolveCharacter(
      makeCharacter({
        baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 3, MP: 2 },
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(true);
  });
});

describe("derived stats separation", () => {
  it("applies fragile to derived HP, not base", () => {
    const character = makeCharacter({
      baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 4, MP: 0 },
      talentIds: ["fragile"],
    });
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(character.baseStats.HP).toBe(4);
    expect(resolved.derivedStats.HP).toBe(3);
  });

  it("AC comes only from derived sources", () => {
    const character = makeCharacter({
      equipment: { offhand: { itemId: "shield" } },
    });
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(character.baseStats).not.toHaveProperty("AC");
    expect(resolved.derivedStats.AC).toBe(1);
  });
});

describe("bootstrap talents", () => {
  const validStats = { MS: 2, RS: 2, LS: 0, KS: 0, HP: 3, MP: 3 };

  it("ships ten level-one talents with standard signed costs", () => {
    const talents = Object.values(DEFAULT_CATALOG.abilities);
    expect(talents).toHaveLength(10);
    expect(talents.every((talent) => talent.level === 1)).toBe(true);
    expect(
      talents.every((talent) =>
        talent.polarity === "negative"
          ? talent.cost === -100
          : talent.cost === 100,
      ),
    ).toBe(true);
  });

  it("applies the ranged damage talent to a ranged weapon", () => {
    const resolved = resolveCharacter(
      makeCharacter({
        baseStats: validStats,
        equipment: { mainWeapon: { itemId: "ranged-bow" } },
        talentIds: ["eagle-eye"],
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    const rangedAttack = resolved.actions.find(
      (action) => action.attackType === "ranged",
    );
    expect(resolved.validation.valid).toBe(true);
    expect(rangedAttack?.damage).toBe(2);
  });

  it("requires a ranged action for the ranged damage talent", () => {
    const resolved = resolveCharacter(
      makeCharacter({
        baseStats: validStats,
        equipment: { mainWeapon: { itemId: "melee-sword" } },
        talentIds: ["eagle-eye"],
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(false);
    expect(
      resolved.validation.errors.some(
        (error) => error.code === "ability_requirement_unmet",
      ),
    ).toBe(true);
  });

  it("applies the defensive, health, and movement talents", () => {
    const resolved = resolveCharacter(
      makeCharacter({
        baseStats: validStats,
        talentIds: ["watchful-guard", "tough", "quick-step"],
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(resolved.validation.valid).toBe(true);
    expect(resolved.derivedStats.AC).toBe(1);
    expect(resolved.derivedStats.HP).toBe(4);
    expect(resolved.derivedStats.MP).toBe(4);
  });

  it("blocks armor when the unarmoured drawback is selected", () => {
    const legal = resolveCharacter(
      makeCharacter({
        baseStats: validStats,
        talentIds: ["unarmoured"],
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(legal.validation.valid).toBe(true);
    expect(legal.blockedSlots).toContain("armor");

    const illegal = resolveCharacter(
      makeCharacter({
        baseStats: validStats,
        equipment: { armor: { itemId: "leather-armor" } },
        talentIds: ["unarmoured"],
      }),
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    expect(illegal.validation.valid).toBe(false);
    expect(
      illegal.validation.errors.some(
        (error) => error.code === "blocked_slot_occupied",
      ),
    ).toBe(true);
  });
});

describe("bootstrap equipment", () => {
  it("keeps every baseline item at zero points", () => {
    for (const item of Object.values(DEFAULT_CATALOG.items)) {
      const slot = item.allowedSlots[0]!;
      const resolved = resolveCharacter(
        makeCharacter({
          baseStats: { MS: 2, RS: 2, LS: 2, KS: 2, HP: 3, MP: 3 },
          equipment: { [slot]: { itemId: item.id } },
        }),
        DEFAULT_RULESET,
        DEFAULT_CATALOG,
      );
      expect(
        resolved.cost.equipment.reduce((sum, entry) => sum + entry.amount, 0),
        item.id,
      ).toBe(0);
    }
  });

  it("provides free physical items for every character coefficient", () => {
    const stats = new Set(
      Object.values(DEFAULT_CATALOG.items).flatMap((item) =>
        item.effects.flatMap((effect) =>
          effect.type === "modifyStat" && effect.stat ? [effect.stat] : [],
        ),
      ),
    );
    expect(stats).toEqual(new Set(["MS", "RS", "LS", "KS", "HP", "MP", "AC"]));
  });
});

describe("team validation", () => {
  const characterAt200 = (): CharacterBuild =>
    makeCharacter({
      baseStats: { MS: 4, RS: 0, LS: 0, KS: 1, HP: 3, MP: 2 },
    });

  function makeTeam(characters: CharacterBuild[]): Team {
    return {
      id: "team-1",
      name: "Test Team",
      rulesetId: DEFAULT_RULESET.id,
      budget: 1000,
      characters,
      cardTheme: { templateId: "universal-clean" },
    };
  }

  it("5 characters at 200 pts each → legal 1000 budget", () => {
    const team = makeTeam(Array.from({ length: 5 }, (_, i) => ({
      ...characterAt200(),
      id: `char-${i}`,
      name: `Fighter ${i + 1}`,
    })));
    const resolved = validateTeam(team, DEFAULT_RULESET, DEFAULT_CATALOG);
    expect(resolved.totalCost).toBe(1000);
    expect(resolved.validation.valid).toBe(true);
  });

  it("5 characters totaling 1001 → illegal", () => {
    const team = makeTeam([
      ...Array.from({ length: 4 }, (_, i) => ({
        ...characterAt200(),
        id: `char-${i}`,
        name: `Fighter ${i + 1}`,
      })),
      makeCharacter({
        id: "char-extra",
        baseStats: { MS: 4, RS: 0, LS: 0, KS: 0, HP: 4, MP: 1 },
      }),
    ]);
    const resolved = validateTeam(team, DEFAULT_RULESET, DEFAULT_CATALOG);
    expect(resolved.totalCost).toBe(1010);
    expect(resolved.validation.valid).toBe(false);
  });

  it("2 characters → illegal", () => {
    const team = makeTeam([characterAt200(), characterAt200()]);
    const resolved = validateTeam(team, DEFAULT_RULESET, DEFAULT_CATALOG);
    expect(resolved.validation.valid).toBe(false);
  });

  it("8 characters → illegal", () => {
    const team = makeTeam(
      Array.from({ length: 8 }, (_, i) => ({
        ...makeCharacter({
          baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 4, MP: 0 },
        }),
        id: `char-${i}`,
      })),
    );
    const resolved = validateTeam(team, DEFAULT_RULESET, DEFAULT_CATALOG);
    expect(resolved.validation.valid).toBe(false);
  });
});

describe("character card snapshot", () => {
  it("has at most 5 equipment slots and 5 action slots", () => {
    const character = makeCharacter({
      baseStats: { MS: 2, RS: 0, LS: 0, KS: 0, HP: 3, MP: 2 },
      equipment: {
        mainWeapon: { itemId: "melee-sword" },
        offhand: { itemId: "shield" },
      },
      talentIds: ["strong-blow", "fragile", "heavy-gear"],
    });
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    const card = buildCharacterCardSnapshot(resolved);
    expect(card.equipment).toHaveLength(5);
    expect(card.actions).toHaveLength(5);
    expect(character.talentIds).toHaveLength(3);
    expect(card.equipment.some((slot) => slot.slot === "item2")).toBe(true);
    expect(
      card.equipment.some((slot) => (slot.slot as string) === "special"),
    ).toBe(false);
  });

  it("does not compute mechanics beyond resolved snapshot", () => {
    const character = makeCharacter({
      baseStats: { MS: 3, RS: 0, LS: 0, KS: 0, HP: 4, MP: 3 },
    });
    const resolved = resolveCharacter(
      character,
      DEFAULT_RULESET,
      DEFAULT_CATALOG,
    );
    const card = buildCharacterCardSnapshot(resolved);
    expect(card.totalCost).toBe(resolved.cost.total);
    expect(card.stats.HP).toBe(resolved.derivedStats.HP);
    expect(card.validationState).toBe("valid");
  });
});

describe("ruleset identity", () => {
  it("uses lego-skirmish-core draft version", () => {
    expect(DEFAULT_RULESET.id).toBe("lego-skirmish-core");
    expect(DEFAULT_RULESET.version).toBe("0.2.0-draft");
  });
});
