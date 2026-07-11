import type {
  AbilityDefinition,
  CharacterBuild,
  CostBreakdown,
  CostEntry,
  GameCatalog,
  ItemDefinition,
  PurchasableStat,
  Ruleset,
} from "../types/index.js";
import { attributeCost } from "../rules/default-ruleset.js";

const STAT_LABELS: Record<PurchasableStat, { pl: string; en: string }> = {
  MS: { pl: "Walka Wręcz", en: "Melee Skill" },
  RS: { pl: "Walka Dystansowa", en: "Ranged Skill" },
  LS: { pl: "Dowodzenie", en: "Leadership Skill" },
  KS: { pl: "Wiedza", en: "Knowledge Skill" },
  HP: { pl: "Punkty Życia", en: "Hit Points" },
  MP: { pl: "Punkty Ruchu", en: "Move Points" },
};

function sumEntries(entries: CostEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

function itemEffectCost(item: ItemDefinition): {
  positive: CostEntry[];
  negative: CostEntry[];
} {
  const positive: CostEntry[] = [];
  const negative: CostEntry[] = [];

  const positiveLevel = item.cost.effectLevels?.positive ?? 0;
  const negativeLevel = item.cost.effectLevels?.negative ?? 0;

  if (positiveLevel > 0) {
    const amount = (100 * positiveLevel * (positiveLevel + 1)) / 2;
    positive.push({
      id: `${item.id}:positive-effects`,
      label: item.name,
      amount,
      source: "effect",
    });
  }

  if (negativeLevel > 0) {
    const amount = -((100 * negativeLevel * (negativeLevel + 1)) / 2);
    negative.push({
      id: `${item.id}:negative-restrictions`,
      label: item.name,
      amount,
      source: "restriction",
    });
  }

  if (item.cost.fixed) {
    positive.push({
      id: `${item.id}:fixed`,
      label: item.name,
      amount: item.cost.fixed,
      source: "equipment",
    });
  }

  return { positive, negative };
}

export function calculateCharacterCost(
  character: CharacterBuild,
  ruleset: Ruleset,
  catalog: GameCatalog,
): CostBreakdown {
  const attributes: CostEntry[] = ruleset.attributes.purchasable.map((stat) => {
    const level = character.baseStats[stat];
    return {
      id: `attr:${stat}`,
      label: { pl: STAT_LABELS[stat].pl, en: STAT_LABELS[stat].en },
      amount: attributeCost(level),
      source: "attribute",
    };
  });

  const equipment: CostEntry[] = [];
  const positiveEffects: CostEntry[] = [];
  const negativeEffects: CostEntry[] = [];
  const abilities: CostEntry[] = [];

  for (const slotItem of Object.values(character.equipment)) {
    if (!slotItem) {
      continue;
    }
    const item = catalog.items[slotItem.itemId];
    if (!item) {
      continue;
    }

    const effectCosts = itemEffectCost(item);
    equipment.push(...effectCosts.positive, ...effectCosts.negative);
    positiveEffects.push(...effectCosts.positive.filter((e) => e.source === "effect"));
    negativeEffects.push(...effectCosts.negative);
  }

  for (const talentId of character.talentIds) {
    const ability = catalog.abilities[talentId];
    if (!ability) {
      continue;
    }
    abilities.push({
      id: `ability:${ability.id}`,
      label: ability.name,
      amount: ability.cost,
      source: "ability",
    });
    if (ability.cost > 0) {
      positiveEffects.push({
        id: `ability-positive:${ability.id}`,
        label: ability.name,
        amount: ability.cost,
        source: "effect",
      });
    } else if (ability.cost < 0) {
      negativeEffects.push({
        id: `ability-negative:${ability.id}`,
        label: ability.name,
        amount: ability.cost,
        source: "restriction",
      });
    }
  }

  const attributeTotal = sumEntries(attributes);
  const equipmentTotal = sumEntries(equipment);
  const abilityTotal = sumEntries(abilities);
  const subtotal = attributeTotal + equipmentTotal + abilityTotal;

  return {
    attributes,
    equipment,
    abilities,
    positiveEffects,
    negativeEffects,
    subtotal,
    total: subtotal,
  };
}

export function calculateAbilityCost(ability: AbilityDefinition): number {
  return ability.cost;
}
