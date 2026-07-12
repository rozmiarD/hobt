import type {
  EffectDefinition,
  EquipmentSlot,
  ItemFamily,
  LocalizedText,
  PurchasableStat,
  RestrictionDefinition,
  Stat,
} from "../types/index.js";

export interface FamilyProfile {
  id: ItemFamily;
  label: LocalizedText;
  defaultSlots: EquipmentSlot[];
  defaultTags: string[];
  allowedStats: Stat[];
  forbiddenNegativeStats: PurchasableStat[];
  maxPositiveEffectLevels: number;
  maxNegativeEffectLevels: number;
  maxFixedCost: number;
  minFixedCost: number;
}

export const FAMILY_PROFILES: Record<ItemFamily, FamilyProfile> = {
  melee_weapon: {
    id: "melee_weapon",
    label: { pl: "Broń do walki wręcz", en: "Melee weapon" },
    defaultSlots: ["mainWeapon", "offhand"],
    defaultTags: ["weapon", "melee"],
    allowedStats: ["MS", "HP", "MP", "AC"],
    forbiddenNegativeStats: ["RS", "LS", "KS"],
    maxPositiveEffectLevels: 2,
    maxNegativeEffectLevels: 1,
    maxFixedCost: 300,
    minFixedCost: 0,
  },
  ranged_weapon: {
    id: "ranged_weapon",
    label: { pl: "Broń dystansowa", en: "Ranged weapon" },
    defaultSlots: ["mainWeapon"],
    defaultTags: ["weapon", "ranged"],
    allowedStats: ["RS", "HP", "MP"],
    forbiddenNegativeStats: ["RS", "MS", "LS", "KS"],
    maxPositiveEffectLevels: 2,
    maxNegativeEffectLevels: 1,
    maxFixedCost: 300,
    minFixedCost: 0,
  },
  armor: {
    id: "armor",
    label: { pl: "Pancerz", en: "Armor" },
    defaultSlots: ["armor"],
    defaultTags: ["armor", "defensive"],
    allowedStats: ["AC", "HP", "MP"],
    forbiddenNegativeStats: ["MS", "RS", "LS", "KS"],
    maxPositiveEffectLevels: 2,
    maxNegativeEffectLevels: 1,
    maxFixedCost: 400,
    minFixedCost: 0,
  },
  offhand: {
    id: "offhand",
    label: { pl: "Offhand / tarcza", en: "Offhand / shield" },
    defaultSlots: ["offhand"],
    defaultTags: ["offhand", "defensive"],
    allowedStats: ["AC", "HP", "MP", "MS"],
    forbiddenNegativeStats: ["RS", "LS", "KS"],
    maxPositiveEffectLevels: 2,
    maxNegativeEffectLevels: 1,
    maxFixedCost: 250,
    minFixedCost: 0,
  },
  utility_item: {
    id: "utility_item",
    label: { pl: "Przedmiot", en: "Utility item" },
    defaultSlots: ["item1", "item2"],
    defaultTags: ["item", "utility"],
    allowedStats: ["HP", "MP", "AC", "LS", "KS"],
    forbiddenNegativeStats: ["MS", "RS"],
    maxPositiveEffectLevels: 1,
    maxNegativeEffectLevels: 1,
    maxFixedCost: 200,
    minFixedCost: -100,
  },
};

export interface TraitTemplate {
  id: string;
  family: ItemFamily;
  label: LocalizedText;
  polarity: "positive" | "negative";
  effects: EffectDefinition[];
  restrictions?: RestrictionDefinition[];
  effectLevelContribution: { positive?: number; negative?: number };
  incompatibleTraits?: string[];
}

export const FAMILY_TRAIT_TEMPLATES: TraitTemplate[] = [
  {
    id: "melee-damage-plus1",
    family: "melee_weapon",
    label: { pl: "+1 obrażenia melee", en: "+1 melee damage" },
    polarity: "positive",
    effects: [
      {
        id: "trait-melee-dmg",
        type: "modifyDamage",
        target: "meleeAttack",
        value: 1,
        display: { pl: "+1 DMG", en: "+1 DMG" },
      },
    ],
    effectLevelContribution: { positive: 1 },
  },
  {
    id: "melee-two-handed",
    family: "melee_weapon",
    label: { pl: "Dwuręczna (blokuje offhand)", en: "Two-handed (blocks offhand)" },
    polarity: "negative",
    effects: [
      {
        id: "trait-2h-block",
        type: "blockSlot",
        slot: "offhand",
        display: { pl: "Blokuje offhand", en: "Blocks offhand" },
      },
    ],
    restrictions: [
      {
        type: "blockSlot",
        affects: ["offhand"],
        severity: 1,
        display: { pl: "Brak offhandu", en: "No offhand" },
      },
    ],
    effectLevelContribution: { negative: 1 },
    incompatibleTraits: ["melee-offhand-ok"],
  },
  {
    id: "melee-mp-penalty",
    family: "melee_weapon",
    label: { pl: "-1 MP (ciężka broń)", en: "-1 MP (heavy weapon)" },
    polarity: "negative",
    effects: [
      {
        id: "trait-melee-mp",
        type: "modifyStat",
        stat: "MP",
        value: -1,
        display: { pl: "-1 MP", en: "-1 MP" },
      },
    ],
    restrictions: [
      {
        type: "modifyStat",
        affects: ["MP"],
        severity: 1,
        display: { pl: "-1 MP", en: "-1 MP" },
      },
    ],
    effectLevelContribution: { negative: 1 },
  },
  {
    id: "ranged-damage-plus1",
    family: "ranged_weapon",
    label: { pl: "+1 obrażenia dystans", en: "+1 ranged damage" },
    polarity: "positive",
    effects: [
      {
        id: "trait-ranged-dmg",
        type: "modifyDamage",
        target: "rangedAttack",
        value: 1,
        display: { pl: "+1 DMG", en: "+1 DMG" },
      },
    ],
    effectLevelContribution: { positive: 1 },
  },
  {
    id: "ranged-mp-penalty",
    family: "ranged_weapon",
    label: { pl: "-1 MP (niezgrabna broń)", en: "-1 MP (cumbersome weapon)" },
    polarity: "negative",
    effects: [
      {
        id: "trait-ranged-mp",
        type: "modifyStat",
        stat: "MP",
        value: -1,
        display: { pl: "-1 MP", en: "-1 MP" },
      },
    ],
    restrictions: [
      {
        type: "modifyStat",
        affects: ["MP"],
        severity: 1,
        display: { pl: "-1 MP", en: "-1 MP" },
      },
    ],
    effectLevelContribution: { negative: 1 },
  },
  {
    id: "armor-ac-plus1",
    family: "armor",
    label: { pl: "+1 AC", en: "+1 AC" },
    polarity: "positive",
    effects: [
      {
        id: "trait-armor-ac",
        type: "modifyStat",
        stat: "AC",
        value: 1,
        display: { pl: "+1 AC", en: "+1 AC" },
      },
    ],
    effectLevelContribution: { positive: 1 },
  },
  {
    id: "armor-hp-plus1",
    family: "armor",
    label: { pl: "+1 HP", en: "+1 HP" },
    polarity: "positive",
    effects: [
      {
        id: "trait-armor-hp",
        type: "modifyStat",
        stat: "HP",
        value: 1,
        display: { pl: "+1 HP", en: "+1 HP" },
      },
    ],
    effectLevelContribution: { positive: 1 },
  },
  {
    id: "armor-mp-penalty",
    family: "armor",
    label: { pl: "-1 MP (ciężki pancerz)", en: "-1 MP (heavy armor)" },
    polarity: "negative",
    effects: [
      {
        id: "trait-armor-mp",
        type: "modifyStat",
        stat: "MP",
        value: -1,
        display: { pl: "-1 MP", en: "-1 MP" },
      },
    ],
    restrictions: [
      {
        type: "modifyStat",
        affects: ["MP"],
        severity: 1,
        display: { pl: "-1 MP", en: "-1 MP" },
      },
    ],
    effectLevelContribution: { negative: 1 },
  },
  {
    id: "offhand-ac-plus1",
    family: "offhand",
    label: { pl: "+1 AC (tarcza)", en: "+1 AC (shield)" },
    polarity: "positive",
    effects: [
      {
        id: "trait-offhand-ac",
        type: "modifyStat",
        stat: "AC",
        value: 1,
        display: { pl: "+1 AC", en: "+1 AC" },
      },
    ],
    effectLevelContribution: { positive: 1 },
  },
  {
    id: "offhand-melee-attack",
    family: "offhand",
    label: { pl: "Atak pomocniczy melee", en: "Offhand melee attack" },
    polarity: "positive",
    effects: [],
    effectLevelContribution: { positive: 1 },
  },
  {
    id: "utility-hp-plus1",
    family: "utility_item",
    label: { pl: "+1 HP", en: "+1 HP" },
    polarity: "positive",
    effects: [
      {
        id: "trait-utility-hp",
        type: "modifyStat",
        stat: "HP",
        value: 1,
        display: { pl: "+1 HP", en: "+1 HP" },
      },
    ],
    effectLevelContribution: { positive: 1 },
  },
  {
    id: "utility-mp-plus1",
    family: "utility_item",
    label: { pl: "+1 MP", en: "+1 MP" },
    polarity: "positive",
    effects: [
      {
        id: "trait-utility-mp",
        type: "modifyStat",
        stat: "MP",
        value: 1,
        display: { pl: "+1 MP", en: "+1 MP" },
      },
    ],
    effectLevelContribution: { positive: 1 },
  },
];

export function getTraitsForFamily(family: ItemFamily): TraitTemplate[] {
  return FAMILY_TRAIT_TEMPLATES.filter((trait) => trait.family === family);
}

export function getFamilyProfile(family: ItemFamily): FamilyProfile {
  return FAMILY_PROFILES[family];
}
