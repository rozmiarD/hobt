import type {
  AbilityLevel,
  AbilityPolarity,
  EffectDefinition,
  EquipmentSlot,
  LocalizedText,
  PurchasableStat,
  RequirementDefinition,
  RestrictionDefinition,
} from "../types/index.js";

export type AbilityCategory =
  | "combat"
  | "movement"
  | "defense"
  | "conditional"
  | "drawback";

export const ABILITY_CATEGORIES: readonly AbilityCategory[] = [
  "combat",
  "movement",
  "defense",
  "conditional",
  "drawback",
] as const;

export const ABILITY_CATEGORY_LABELS: Record<AbilityCategory, LocalizedText> = {
  combat: { pl: "Walka", en: "Combat" },
  movement: { pl: "Ruch", en: "Movement" },
  defense: { pl: "Obrona", en: "Defense" },
  conditional: { pl: "Warunkowe", en: "Conditional" },
  drawback: { pl: "Wady", en: "Drawbacks" },
};

export interface AbilityTraitTemplate {
  id: string;
  category: AbilityCategory;
  label: LocalizedText;
  polarity: AbilityPolarity;
  minLevel: AbilityLevel;
  effects: EffectDefinition[];
  restrictions?: RestrictionDefinition[];
  incompatibleTraits?: string[];
}

export interface AbilityRequirementTemplate {
  id: string;
  label: LocalizedText;
  requirement: RequirementDefinition;
}

export const ABILITY_REQUIREMENT_TEMPLATES: AbilityRequirementTemplate[] = [
  {
    id: "req-main-melee",
    label: { pl: "Broń główna: melee", en: "Main weapon: melee" },
    requirement: { type: "mainWeaponAttackType", value: "melee" },
  },
  {
    id: "req-offhand-melee",
    label: { pl: "Offhand: melee", en: "Offhand: melee" },
    requirement: { type: "offhandAttackType", value: "melee" },
  },
  {
    id: "req-offhand-free",
    label: { pl: "Slot offhand wolny", en: "Offhand slot not blocked" },
    requirement: { type: "slotNotBlocked", value: "offhand" },
  },
  {
    id: "req-offhand-occupied",
    label: { pl: "Offhand zajęty", en: "Offhand slot occupied" },
    requirement: { type: "slotOccupied", value: "offhand" },
  },
  {
    id: "req-has-ranged",
    label: { pl: "Posiada akcję dystansową", en: "Has ranged action" },
    requirement: { type: "hasRangedAction" },
  },
];

export const ABILITY_TRAIT_TEMPLATES: AbilityTraitTemplate[] = [
  {
    id: "ab-melee-damage",
    category: "combat",
    label: { pl: "+1 obrażenia melee", en: "+1 melee damage" },
    polarity: "positive",
    minLevel: 1,
    effects: [
      {
        id: "ab-melee-dmg",
        type: "modifyDamage",
        target: "meleeAttack",
        value: 1,
        display: { pl: "+1 DMG melee", en: "+1 melee DMG" },
      },
    ],
  },
  {
    id: "ab-ranged-damage",
    category: "combat",
    label: { pl: "+1 obrażenia dystans", en: "+1 ranged damage" },
    polarity: "positive",
    minLevel: 1,
    effects: [
      {
        id: "ab-ranged-dmg",
        type: "modifyDamage",
        target: "rangedAttack",
        value: 1,
        display: { pl: "+1 DMG dystans", en: "+1 ranged DMG" },
      },
    ],
  },
  {
    id: "ab-two-weapon-trigger",
    category: "conditional",
    label: {
      pl: "Po chybionym ataku głównej — atak offhandem",
      en: "After primary miss — offhand attack",
    },
    polarity: "positive",
    minLevel: 1,
    effects: [
      {
        id: "ab-twf",
        type: "conditionalModifier",
        trigger: "primaryMeleeAttackMissed",
        result: "grantOffhandAttack",
        display: {
          pl: "Po chybionym ataku głównej broni — atak offhandem",
          en: "After primary melee miss — offhand attack",
        },
      },
    ],
  },
  {
    id: "ab-block-offhand",
    category: "drawback",
    label: { pl: "Blokuje slot offhand", en: "Blocks offhand slot" },
    polarity: "negative",
    minLevel: 1,
    effects: [
      {
        id: "ab-block-offhand-effect",
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
        display: { pl: "Blokuje offhand", en: "Blocks offhand" },
      },
    ],
  },
  {
    id: "ab-block-armor",
    category: "drawback",
    label: { pl: "Blokuje slot pancerza", en: "Blocks armor slot" },
    polarity: "negative",
    minLevel: 1,
    effects: [
      {
        id: "ab-block-armor-effect",
        type: "blockSlot",
        slot: "armor",
        display: { pl: "Blokuje pancerz", en: "Blocks armor" },
      },
    ],
    restrictions: [
      {
        type: "blockSlot",
        affects: ["armor"],
        severity: 1,
        display: { pl: "Blokuje pancerz", en: "Blocks armor" },
      },
    ],
  },
  {
    id: "ab-mp-penalty",
    category: "movement",
    label: { pl: "-1 MP", en: "-1 MP" },
    polarity: "negative",
    minLevel: 1,
    effects: [
      {
        id: "ab-mp",
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
  },
  {
    id: "ab-hp-penalty",
    category: "drawback",
    label: { pl: "-1 HP", en: "-1 HP" },
    polarity: "negative",
    minLevel: 1,
    effects: [
      {
        id: "ab-hp",
        type: "modifyStat",
        stat: "HP",
        value: -1,
        display: { pl: "-1 HP", en: "-1 HP" },
      },
    ],
    restrictions: [
      {
        type: "modifyStat",
        affects: ["HP"],
        severity: 1,
        display: { pl: "-1 HP", en: "-1 HP" },
      },
    ],
  },
  {
    id: "ab-ac-bonus",
    category: "defense",
    label: { pl: "+1 AC (pasywnie)", en: "+1 AC (passive)" },
    polarity: "positive",
    minLevel: 1,
    effects: [
      {
        id: "ab-ac",
        type: "modifyStat",
        stat: "AC",
        value: 1,
        display: { pl: "+1 AC", en: "+1 AC" },
      },
    ],
  },
];

const FORBIDDEN_NEGATIVE_STATS: PurchasableStat[] = ["RS", "LS", "KS"];

export function getTraitsForAbility(
  polarity: AbilityPolarity,
  level: AbilityLevel,
): AbilityTraitTemplate[] {
  return ABILITY_TRAIT_TEMPLATES.filter((trait) => {
    if (trait.minLevel > level) {
      return false;
    }
    if (polarity === "mixed") {
      return true;
    }
    if (polarity === "positive") {
      return trait.polarity === "positive";
    }
    return trait.polarity === "negative";
  });
}

export function getAbilityCategoryLabel(category: AbilityCategory): LocalizedText {
  return ABILITY_CATEGORY_LABELS[category];
}

export function forbiddenNegativeAbilityStat(stat: PurchasableStat): boolean {
  return FORBIDDEN_NEGATIVE_STATS.includes(stat);
}

export function slotFromRequirement(
  requirement: RequirementDefinition,
): EquipmentSlot | undefined {
  if (
    requirement.type === "slotNotBlocked" ||
    requirement.type === "slotOccupied" ||
    requirement.type === "slotEmpty"
  ) {
    return requirement.value as EquipmentSlot;
  }
  return undefined;
}

export function inferAbilityCategory(ability: {
  polarity: AbilityPolarity;
  effects: { type: string; stat?: string }[];
}): AbilityCategory {
  if (ability.polarity === "negative") {
    return "drawback";
  }
  if (ability.effects.some((effect) => effect.type === "conditionalModifier")) {
    return "conditional";
  }
  if (
    ability.effects.some(
      (effect) => effect.type === "blockSlot" || effect.stat === "AC",
    )
  ) {
    return "defense";
  }
  if (ability.effects.some((effect) => effect.stat === "MP")) {
    return "movement";
  }
  return "combat";
}
