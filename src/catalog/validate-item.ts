import type {
  ItemDefinition,
  ItemFamily,
  PurchasableStat,
  ValidationIssue,
  ValidationResult,
} from "../types/index.js";
import { FAMILY_PROFILES, getFamilyProfile } from "./families.js";

export function inferItemFamily(item: ItemDefinition): ItemFamily {
  if (item.meta?.family) {
    return item.meta.family;
  }
  if (item.tags.includes("ranged")) {
    return "ranged_weapon";
  }
  if (item.tags.includes("shield") || item.tags.includes("offhand")) {
    return "offhand";
  }
  if (item.tags.includes("armor")) {
    return "armor";
  }
  if (item.allowedSlots.includes("item1") || item.allowedSlots.includes("item2")) {
    return "utility_item";
  }
  if (item.tags.includes("melee") || item.tags.includes("weapon")) {
    return "melee_weapon";
  }
  return "utility_item";
}

function issue(
  code: string,
  severity: "error" | "warning",
  message: { pl: string; en: string },
  field?: string,
): ValidationIssue {
  return { code, severity, message, field };
}

function isPurchasableStat(stat: string): stat is PurchasableStat {
  return stat === "MS" || stat === "RS" || stat === "LS" || stat === "KS" || stat === "HP" || stat === "MP";
}

export function validateItemDefinition(item: ItemDefinition): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const family = inferItemFamily(item);
  const profile = getFamilyProfile(family);

  if (!item.id.trim()) {
    errors.push(
      issue("item.missingId", "error", {
        pl: "Brak identyfikatora przedmiotu",
        en: "Item id is required",
      }, "id"),
    );
  }

  if (!item.name.pl.trim() || !item.name.en.trim()) {
    errors.push(
      issue("item.missingName", "error", {
        pl: "Nazwa PL i EN jest wymagana",
        en: "Both PL and EN names are required",
      }, "name"),
    );
  }

  for (const slot of item.allowedSlots) {
    if (!profile.defaultSlots.includes(slot) && family !== "melee_weapon") {
      warnings.push(
        issue("item.unusualSlot", "warning", {
          pl: `Slot ${slot} jest nietypowy dla rodziny ${family}`,
          en: `Slot ${slot} is unusual for family ${family}`,
        }, "allowedSlots"),
      );
    }
  }

  for (const effect of item.effects) {
    if (effect.type === "modifyStat" && effect.stat && effect.value !== undefined) {
      if (!profile.allowedStats.includes(effect.stat)) {
        errors.push(
          issue("item.forbiddenStat", "error", {
            pl: `Cecha ${effect.stat} nie pasuje do rodziny ${family}`,
            en: `Stat ${effect.stat} is not allowed for family ${family}`,
          }, `effects.${effect.id}`),
        );
      }
      if (
        effect.value < 0 &&
        isPurchasableStat(effect.stat) &&
        profile.forbiddenNegativeStats.includes(effect.stat)
      ) {
        errors.push(
          issue("item.forbiddenNegativeStat", "error", {
            pl: `Ujemna modyfikacja ${effect.stat} jest zabroniona dla tej rodziny`,
            en: `Negative ${effect.stat} modifier is forbidden for this family`,
          }, `effects.${effect.id}`),
        );
      }
    }
  }

  for (const restriction of item.restrictions) {
    for (const affect of restriction.affects) {
      if (
        isPurchasableStat(affect) &&
        profile.forbiddenNegativeStats.includes(affect)
      ) {
        errors.push(
          issue("item.forbiddenNegativeRestriction", "error", {
            pl: `Restrykcja na ${affect} jest zabroniona dla rodziny ${family}`,
            en: `Restriction on ${affect} is forbidden for family ${family}`,
          }, `restrictions.${restriction.type}`),
        );
      }
    }
  }

  const positiveLevels = item.cost.effectLevels?.positive ?? 0;
  const negativeLevels = item.cost.effectLevels?.negative ?? 0;

  if (positiveLevels > profile.maxPositiveEffectLevels) {
    errors.push(
      issue("item.tooManyPositiveEffects", "error", {
        pl: `Za dużo pozytywnych efektów (max ${profile.maxPositiveEffectLevels})`,
        en: `Too many positive effects (max ${profile.maxPositiveEffectLevels})`,
      }, "cost.effectLevels.positive"),
    );
  }

  if (negativeLevels > profile.maxNegativeEffectLevels) {
    errors.push(
      issue("item.tooManyNegativeEffects", "error", {
        pl: `Za dużo negatywnych efektów (max ${profile.maxNegativeEffectLevels})`,
        en: `Too many negative effects (max ${profile.maxNegativeEffectLevels})`,
      }, "cost.effectLevels.negative"),
    );
  }

  const fixed = item.cost.fixed ?? 0;
  if (fixed > profile.maxFixedCost || fixed < profile.minFixedCost) {
    warnings.push(
      issue("item.fixedCostOutOfRange", "warning", {
        pl: `Koszt stały ${fixed} poza typowym zakresem ${profile.minFixedCost}–${profile.maxFixedCost}`,
        en: `Fixed cost ${fixed} outside typical range ${profile.minFixedCost}–${profile.maxFixedCost}`,
      }, "cost.fixed"),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function listItemFamilies(): ItemFamily[] {
  return Object.keys(FAMILY_PROFILES) as ItemFamily[];
}
