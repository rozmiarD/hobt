import type {
  CharacterBuild,
  DerivedStats,
  EquipmentSlot,
  GameCatalog,
  ResolvedEffect,
  Ruleset,
  ValidationIssue,
  ValidationResult,
} from "../types/index.js";
import { EQUIPMENT_SLOTS } from "../types/index.js";
import {
  checkRequirement,
  getEquippedItem,
  isNegativeEffectRelevant,
  restrictionAffectsCapability,
} from "../effects/engine.js";

function issue(
  code: string,
  severity: ValidationIssue["severity"],
  message: ValidationIssue["message"],
  field?: string,
): ValidationIssue {
  return { code, severity, message, field };
}

export function validateCharacter(
  character: CharacterBuild,
  ruleset: Ruleset,
  catalog: GameCatalog,
  derivedStats: DerivedStats,
  blockedSlots: EquipmentSlot[],
  activeEffects: ResolvedEffect[],
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (character.talentIds.length > ruleset.character.maxTalents) {
    errors.push(
      issue(
        "too_many_talents",
        "error",
        {
          pl: `Postać może mieć maksymalnie ${ruleset.character.maxTalents} talenty.`,
          en: `A character may have at most ${ruleset.character.maxTalents} talents.`,
        },
        "talentIds",
      ),
    );
  }

  for (const slot of EQUIPMENT_SLOTS) {
    const instance = character.equipment[slot];
    if (!instance) {
      continue;
    }
    const item = catalog.items[instance.itemId];
    if (!item) {
      errors.push(
        issue(
          "unknown_item",
          "error",
          {
            pl: `Nieznany przedmiot w slocie ${slot}.`,
            en: `Unknown item in slot ${slot}.`,
          },
          slot,
        ),
      );
      continue;
    }
    if (!item.allowedSlots.includes(slot)) {
      errors.push(
        issue(
          "invalid_item_slot",
          "error",
          {
            pl: `Przedmiot ${item.name.pl} nie może być w slocie ${slot}.`,
            en: `Item ${item.name.en} cannot be placed in slot ${slot}.`,
          },
          slot,
        ),
      );
    }
    if (blockedSlots.includes(slot)) {
      errors.push(
        issue(
          "blocked_slot_occupied",
          "error",
          {
            pl: `Slot ${slot} jest zablokowany, ale zawiera przedmiot.`,
            en: `Slot ${slot} is blocked but contains an item.`,
          },
          slot,
        ),
      );
    }
  }

  for (const talentId of character.talentIds) {
    const ability = catalog.abilities[talentId];
    if (!ability) {
      errors.push(
        issue(
          "unknown_ability",
          "error",
          {
            pl: `Nieznany talent: ${talentId}.`,
            en: `Unknown talent: ${talentId}.`,
          },
          "talentIds",
        ),
      );
      continue;
    }

    for (const requirement of ability.requirements) {
      if (!checkRequirement(requirement, character, catalog, blockedSlots)) {
        errors.push(
          issue(
            "ability_requirement_unmet",
            "error",
            {
              pl: `Talent ${ability.name.pl} ma niespełnione wymaganie.`,
              en: `Talent ${ability.name.en} has an unmet requirement.`,
            },
            talentId,
          ),
        );
      }
    }

    if (ability.id === "great-weapon-fighting" && character.equipment.offhand) {
      errors.push(
        issue(
          "great_weapon_offhand_occupied",
          "error",
          {
            pl: "Walka wielką bronią wymaga pustego offhandu.",
            en: "Great weapon fighting requires an empty offhand.",
          },
          "offhand",
        ),
      );
    }

    if (ability.id === "two-weapon-fighting") {
      const offhand = getEquippedItem(character, catalog, "offhand");
      if (!offhand) {
        errors.push(
          issue(
            "two_weapon_missing_offhand",
            "error",
            {
              pl: "Walka dwiema broniami wymaga broni w offhandzie.",
              en: "Two-weapon fighting requires an offhand weapon.",
            },
            "offhand",
          ),
        );
      } else if (!offhand.tags.includes("melee") && !offhand.tags.includes("weapon")) {
        errors.push(
          issue(
            "two_weapon_invalid_offhand",
            "error",
            {
              pl: "Offhand musi zawierać broń melee.",
              en: "Offhand must contain a melee weapon.",
            },
            "offhand",
          ),
        );
      } else if (
        !offhand.actions.some(
          (action) => action.type === "attack" && action.attackType === "melee",
        )
      ) {
        errors.push(
          issue(
            "two_weapon_invalid_offhand",
            "error",
            {
              pl: "Offhand musi zawierać broń melee.",
              en: "Offhand must contain a melee weapon.",
            },
            "offhand",
          ),
        );
      }
    }

    if (ability.cost < 0) {
      const relevant = ability.restrictions.every((restriction) =>
        restrictionAffectsCapability(restriction, character, catalog),
      );
      const effectRelevant = ability.effects
        .filter((effect) => (effect.value ?? 0) < 0 || effect.type === "blockSlot")
        .every((effect) =>
          isNegativeEffectRelevant(effect, character, catalog),
        );
      if (!relevant || !effectRelevant) {
        errors.push(
          issue(
            "irrelevant_negative_effect",
            "error",
            {
              pl: `Wada ${ability.name.pl} nie ogranicza realnych możliwości postaci.`,
              en: `Drawback ${ability.name.en} does not limit actual character capabilities.`,
            },
            talentId,
          ),
        );
      }
    }
  }

  const seenNegative = new Map<string, number>();
  for (const resolved of activeEffects) {
    if (!resolved.active) {
      continue;
    }
    const effect = resolved.effect;
    if (effect.type === "blockSlot" && effect.slot) {
      const key = `blockSlot:${effect.slot}`;
      const count = (seenNegative.get(key) ?? 0) + 1;
      seenNegative.set(key, count);
      if (count > 1 && !effect.stackable) {
        errors.push(
          issue(
            "duplicate_negative_effect",
            "error",
            {
              pl: "Ten sam efekt ujemny nie może kumulować się bez flagi stackable.",
              en: "The same negative effect cannot stack without stackable=true.",
            },
          ),
        );
      }
    }
  }

  for (const stat of ["MS", "RS", "LS", "KS", "HP", "MP"] as const) {
    if (character.baseStats[stat] > ruleset.attributes.maxLevel) {
      warnings.push(
        issue(
          "stat_level_high",
          "warning",
          {
            pl: `Cecha ${stat} ma poziom ${character.baseStats[stat]}.`,
            en: `Stat ${stat} is at level ${character.baseStats[stat]}.`,
          },
          stat,
        ),
      );
    }
  }

  if (derivedStats.HP <= 0) {
    warnings.push(
      issue(
        "hp_zero_or_less",
        "warning",
        {
          pl: "Końcowe HP spadło do 0 lub poniżej.",
          en: "Derived HP dropped to 0 or below.",
        },
        "HP",
      ),
    );
  }

  const acSources = activeEffects.filter(
    (resolved) =>
      resolved.active &&
      resolved.effect.type === "modifyStat" &&
      resolved.effect.stat === "AC",
  );
  if (acSources.length > 1) {
    warnings.push(
      issue(
        "multiple_ac_sources",
        "warning",
        {
          pl: "Kilka źródeł modyfikuje AC.",
          en: "Multiple sources modify AC.",
        },
        "AC",
      ),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
