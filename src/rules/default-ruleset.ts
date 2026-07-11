import type { Ruleset } from "../types/index.js";

export function attributeCost(level: number): number {
  if (level <= 0) {
    return 0;
  }
  return (10 * level * (level + 1)) / 2;
}

export function majorEffectCost(level: number): number {
  if (level <= 0) {
    return 0;
  }
  return (100 * level * (level + 1)) / 2;
}

export function negativeEffectValue(severity: 1 | 2 | 3): number {
  return -majorEffectCost(severity);
}

export const DEFAULT_RULESET: Ruleset = {
  id: "lego-skirmish-core",
  version: "0.2.0-draft",
  team: {
    budget: 1000,
    minimumCharacterCount: 3,
    maximumCharacterCount: 7,
    recommendedCharacterCount: 5,
  },
  attributes: {
    purchasable: ["MS", "RS", "LS", "KS", "HP", "MP"],
    minLevel: 0,
    maxLevel: 6,
    costPerLevelFormula: "triangular_x10",
  },
  effects: {
    majorEffectCostFormula: "triangular_x100",
    negativeEffectValues: {
      1: -100,
      2: -300,
      3: -600,
    },
    positiveEffectValues: {
      1: 100,
      2: 300,
      3: 600,
    },
  },
  equipment: {
    slots: ["mainWeapon", "offhand", "armor", "item1", "item2"],
    maxTalents: 3,
    maxActionSlots: 5,
  },
  character: {
    maxTalents: 3,
  },
  cards: {
    actionSlotCount: 5,
    equipmentSlotCount: 5,
    talentSlotCount: 3,
  },
  movement: {
    unit: "cm",
    distancePerMP: 1,
  },
};
