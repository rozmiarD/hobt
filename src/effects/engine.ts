import type {
  AbilityDefinition,
  CharacterBuild,
  EffectDefinition,
  EquipmentSlot,
  GameCatalog,
  ItemDefinition,
  PurchasableStat,
  RequirementDefinition,
  ResolvedEffect,
} from "../types/index.js";
import { EQUIPMENT_SLOTS } from "../types/index.js";

export function getEquippedItem(
  character: CharacterBuild,
  catalog: GameCatalog,
  slot: EquipmentSlot,
): ItemDefinition | undefined {
  const instance = character.equipment[slot];
  if (!instance) {
    return undefined;
  }
  return catalog.items[instance.itemId];
}

export function collectEffects(
  character: CharacterBuild,
  catalog: GameCatalog,
): ResolvedEffect[] {
  const effects: ResolvedEffect[] = [];

  for (const slot of EQUIPMENT_SLOTS) {
    const item = getEquippedItem(character, catalog, slot);
    if (!item) {
      continue;
    }
    for (const effect of item.effects) {
      effects.push({
        effect,
        sourceId: item.id,
        sourceType: "item",
        active: true,
      });
    }
  }

  for (const talentId of character.talentIds) {
    const ability = catalog.abilities[talentId];
    if (!ability) {
      continue;
    }
    for (const effect of ability.effects) {
      effects.push({
        effect,
        sourceId: ability.id,
        sourceType: "ability",
        active: true,
      });
    }
  }

  return effects;
}

export function applyStatModifiers(
  baseStats: CharacterBuild["baseStats"],
  effects: ResolvedEffect[],
): CharacterBuild["baseStats"] & { AC: number } {
  const derived = {
    ...baseStats,
    AC: 0,
  };

  for (const resolved of effects) {
    if (!resolved.active || resolved.effect.type !== "modifyStat") {
      continue;
    }
    const stat = resolved.effect.stat;
    const value = resolved.effect.value ?? 0;
    if (!stat || stat === "AC") {
      derived.AC += value;
      continue;
    }
    derived[stat as PurchasableStat] += value;
  }

  return derived;
}

export function collectBlockedSlots(effects: ResolvedEffect[]): EquipmentSlot[] {
  const blocked = new Set<EquipmentSlot>();
  for (const resolved of effects) {
    if (!resolved.active || resolved.effect.type !== "blockSlot") {
      continue;
    }
    if (resolved.effect.slot) {
      blocked.add(resolved.effect.slot);
    }
  }
  return [...blocked];
}

function itemHasAttackType(
  item: ItemDefinition | undefined,
  attackType: "melee" | "ranged",
): boolean {
  if (!item) {
    return false;
  }
  return item.actions.some(
    (action) => action.type === "attack" && action.attackType === attackType,
  );
}

export function checkRequirement(
  requirement: RequirementDefinition,
  character: CharacterBuild,
  catalog: GameCatalog,
  blockedSlots: EquipmentSlot[],
): boolean {
  switch (requirement.type) {
    case "mainWeaponAttackType":
      return itemHasAttackType(
        getEquippedItem(character, catalog, "mainWeapon"),
        requirement.value as "melee" | "ranged",
      );
    case "offhandAttackType":
      return itemHasAttackType(
        getEquippedItem(character, catalog, "offhand"),
        requirement.value as "melee" | "ranged",
      );
    case "offhandItemTag": {
      const offhand = getEquippedItem(character, catalog, "offhand");
      return offhand?.tags.includes(String(requirement.value)) ?? false;
    }
    case "slotNotBlocked":
      return !blockedSlots.includes(requirement.value as EquipmentSlot);
    case "slotOccupied":
      return Boolean(character.equipment[requirement.value as EquipmentSlot]);
    case "slotEmpty":
      return !character.equipment[requirement.value as EquipmentSlot];
    case "hasRangedAction": {
      for (const slot of EQUIPMENT_SLOTS) {
        const item = getEquippedItem(character, catalog, slot);
        if (itemHasAttackType(item, "ranged")) {
          return true;
        }
      }
      for (const talentId of character.talentIds) {
        const ability = catalog.abilities[talentId];
        if (!ability) {
          continue;
        }
        if (
          ability.effects.some(
            (effect) =>
              effect.type === "grantAction" && effect.target === "ranged",
          )
        ) {
          return true;
        }
      }
      return false;
    }
    default:
      return false;
  }
}

export function markInactiveEffects(
  effects: ResolvedEffect[],
  character: CharacterBuild,
  catalog: GameCatalog,
  blockedSlots: EquipmentSlot[],
): ResolvedEffect[] {
  return effects.map((resolved) => {
    if (resolved.sourceType !== "ability") {
      return resolved;
    }
    const ability = catalog.abilities[resolved.sourceId];
    if (!ability) {
      return { ...resolved, active: false };
    }
    const requirementsMet = ability.requirements.every((req) =>
      checkRequirement(req, character, catalog, blockedSlots),
    );
    return { ...resolved, active: requirementsMet };
  });
}

export function getAttackDamageBonus(
  effects: ResolvedEffect[],
  attackType: "melee" | "ranged",
): number {
  const target = attackType === "melee" ? "meleeAttack" : "rangedAttack";
  return effects
    .filter(
      (resolved) =>
        resolved.active &&
        resolved.effect.type === "modifyDamage" &&
        resolved.effect.target === target,
    )
    .reduce((sum, resolved) => sum + (resolved.effect.value ?? 0), 0);
}

export function getMeleeDamageBonus(effects: ResolvedEffect[]): number {
  return getAttackDamageBonus(effects, "melee");
}

export function restrictionAffectsCapability(
  restriction: AbilityDefinition["restrictions"][number],
  character: CharacterBuild,
  catalog: GameCatalog,
): boolean {
  if (restriction.type === "blockSlot") {
    return true;
  }

  if (restriction.affects.includes("ranged") || restriction.affects.includes("RS")) {
    return checkRequirement(
      { type: "hasRangedAction" },
      character,
      catalog,
      [],
    );
  }

  for (const affect of restriction.affects) {
    if (["MS", "RS", "LS", "KS", "HP", "MP", "AC"].includes(affect)) {
      const stat = affect as PurchasableStat | "AC";
      if (stat === "AC") {
        continue;
      }
      if (character.baseStats[stat] > 0) {
        return true;
      }
    }
  }

  return false;
}

export function isNegativeEffectRelevant(
  effect: EffectDefinition,
  character: CharacterBuild,
  catalog: GameCatalog,
): boolean {
  if (effect.type === "blockSlot") {
    return true;
  }
  if (effect.type === "modifyStat" && effect.stat) {
    if (effect.stat === "AC") {
      return false;
    }
    if (effect.stat === "MP" || effect.stat === "HP") {
      return true;
    }
    if (character.baseStats[effect.stat] > 0) {
      return true;
    }
    for (const slot of EQUIPMENT_SLOTS) {
      const item = getEquippedItem(character, catalog, slot);
      if (!item) {
        continue;
      }
      if (
        item.actions.some(
          (action) =>
            action.testStat === effect.stat ||
            (effect.stat === "RS" && action.attackType === "ranged") ||
            (effect.stat === "MS" && action.attackType === "melee"),
        )
      ) {
        return true;
      }
    }
    return false;
  }
  return true;
}
