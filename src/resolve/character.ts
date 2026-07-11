import type {
  ActionDefinition,
  CharacterBuild,
  EquipmentSlot,
  GameCatalog,
  ResolvedAction,
  ResolvedCharacter,
  ResolvedEquipmentSlot,
  Ruleset,
} from "../types/index.js";
import { EQUIPMENT_SLOTS } from "../types/index.js";
import { calculateCharacterCost } from "../cost/calculator.js";
import { validateCharacter } from "../validate/character.js";
import {
  applyStatModifiers,
  collectBlockedSlots,
  collectEffects,
  getEquippedItem,
  getMeleeDamageBonus,
  markInactiveEffects,
} from "../effects/engine.js";

const SLOT_LABELS: Record<EquipmentSlot, { pl: string; en: string }> = {
  mainWeapon: { pl: "Broń główna", en: "Main weapon" },
  offhand: { pl: "Offhand", en: "Offhand" },
  armor: { pl: "Pancerz", en: "Armor" },
  item1: { pl: "Przedmiot I", en: "Item I" },
  item2: { pl: "Przedmiot II", en: "Item II" },
};

function cloneAction(
  action: ActionDefinition,
  sourceId: string,
  sourceSlot: EquipmentSlot | undefined,
  slotIndex: 1 | 2 | 3 | 4 | 5,
  damageBonus = 0,
): ResolvedAction {
  const damage =
    action.damage !== undefined ? action.damage + damageBonus : action.damage;
  return {
    ...action,
    damage,
    sourceId,
    sourceSlot,
    slotIndex,
  };
}

function buildEquipmentActions(
  character: CharacterBuild,
  catalog: GameCatalog,
  meleeDamageBonus: number,
): ResolvedAction[] {
  const actions: ResolvedAction[] = [];

  const mainWeapon = getEquippedItem(character, catalog, "mainWeapon");
  if (mainWeapon) {
    const attack = mainWeapon.actions.find((action) => action.type === "attack");
    if (attack) {
      const bonus =
        attack.attackType === "melee" ? meleeDamageBonus : 0;
      actions.push(
        cloneAction(attack, mainWeapon.id, "mainWeapon", 1, bonus),
      );
    } else if (mainWeapon.actions[0]) {
      actions.push(
        cloneAction(mainWeapon.actions[0], mainWeapon.id, "mainWeapon", 1),
      );
    }
  }

  const offhand = getEquippedItem(character, catalog, "offhand");
  if (offhand) {
    const attack = offhand.actions.find((action) => action.type === "attack");
    if (attack) {
      const bonus = attack.attackType === "melee" ? meleeDamageBonus : 0;
      actions.push(cloneAction(attack, offhand.id, "offhand", 2, bonus));
    } else if (offhand.actions[0]) {
      actions.push(
        cloneAction(offhand.actions[0], offhand.id, "offhand", 2),
      );
    }
  }

  return actions;
}

function buildTalentActions(
  character: CharacterBuild,
  catalog: GameCatalog,
): ResolvedAction[] {
  const actions: ResolvedAction[] = [];
  const slotIndexes: Array<3 | 4 | 5> = [3, 4, 5];

  character.talentIds.slice(0, 3).forEach((talentId, index) => {
    const ability = catalog.abilities[talentId];
    if (!ability) {
      return;
    }
    const grant = ability.effects.find(
      (effect) => effect.type === "grantAction",
    );
    if (grant) {
      actions.push({
        id: grant.id,
        type: "utility",
        name: ability.name,
        sourceId: ability.id,
        slotIndex: slotIndexes[index]!,
      });
      return;
    }

    actions.push({
      id: `talent:${ability.id}`,
      type: "passive",
      name: ability.name,
      sourceId: ability.id,
      slotIndex: slotIndexes[index]!,
    });
  });

  return actions;
}

function padActions(actions: ResolvedAction[], ruleset: Ruleset): ResolvedAction[] {
  const result = [...actions];
  while (result.length < ruleset.cards.actionSlotCount) {
    const slotIndex = (result.length + 1) as 1 | 2 | 3 | 4 | 5;
    result.push({
      id: `empty:${slotIndex}`,
      type: "passive",
      name: { pl: "—", en: "—" },
      sourceId: "empty",
      slotIndex,
    });
  }
  return result.slice(0, ruleset.cards.actionSlotCount);
}

function buildResolvedEquipment(
  character: CharacterBuild,
  catalog: GameCatalog,
): ResolvedEquipmentSlot[] {
  return EQUIPMENT_SLOTS.map((slot) => {
    const instance = character.equipment[slot];
    const item = instance ? catalog.items[instance.itemId] : undefined;
    return {
      slot,
      item,
      label: SLOT_LABELS[slot],
    };
  });
}

export function resolveCharacter(
  character: CharacterBuild,
  ruleset: Ruleset,
  catalog: GameCatalog,
): ResolvedCharacter {
  const rawEffects = collectEffects(character, catalog);
  const preliminaryBlocked = collectBlockedSlots(rawEffects);
  const activeEffects = markInactiveEffects(
    rawEffects,
    character,
    catalog,
    preliminaryBlocked,
  );
  const blockedSlots = collectBlockedSlots(activeEffects);
  const derivedStats = applyStatModifiers(character.baseStats, activeEffects);
  const meleeDamageBonus = getMeleeDamageBonus(activeEffects);

  const equipmentActions = buildEquipmentActions(
    character,
    catalog,
    meleeDamageBonus,
  );
  const talentActions = buildTalentActions(character, catalog);
  const actions = padActions(
    [...equipmentActions, ...talentActions],
    ruleset,
  );

  const cost = calculateCharacterCost(character, ruleset, catalog);
  const validation = validateCharacter(
    character,
    ruleset,
    catalog,
    derivedStats,
    blockedSlots,
    activeEffects,
  );

  if (cost.total <= 0) {
    validation.warnings.push({
      code: "cost_zero_or_less",
      severity: "warning",
      message: {
        pl: "Koszt postaci jest równy lub mniejszy od 0.",
        en: "Character cost is zero or less.",
      },
      field: "cost",
    });
  }

  return {
    source: character,
    derivedStats,
    actions,
    equipment: buildResolvedEquipment(character, catalog),
    activeEffects,
    blockedSlots,
    cost,
    validation,
  };
}

export function getEquipmentSlotLabel(slot: EquipmentSlot): {
  pl: string;
  en: string;
} {
  return SLOT_LABELS[slot];
}
