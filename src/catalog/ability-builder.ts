import type {
  AbilityDefinition,
  AbilityLevel,
  AbilityPolarity,
  LocalizedText,
  PurchasableStat,
  ValidationIssue,
  ValidationResult,
} from "../types/index.js";
import { majorEffectCost } from "../rules/default-ruleset.js";
import {
  ABILITY_REQUIREMENT_TEMPLATES,
  ABILITY_TRAIT_TEMPLATES,
  forbiddenNegativeAbilityStat,
  type AbilityCategory,
} from "./ability-templates.js";

export interface AbilityDraft {
  id: string;
  name: LocalizedText;
  level: AbilityLevel;
  polarity: AbilityPolarity;
  category: AbilityCategory;
  selectedTraitIds: string[];
  selectedRequirementIds: string[];
  costOverride?: number;
}

export function createEmptyAbilityDraft(
  polarity: AbilityPolarity = "positive",
): AbilityDraft {
  return {
    id: "",
    name: { pl: "", en: "" },
    level: 1,
    polarity,
    category: polarity === "negative" ? "drawback" : "combat",
    selectedTraitIds: [],
    selectedRequirementIds: [],
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function collectTraits(traitIds: string[]) {
  const selected = new Set(traitIds);
  const traits = [];

  for (const traitId of traitIds) {
    const trait = ABILITY_TRAIT_TEMPLATES.find((entry) => entry.id === traitId);
    if (!trait) {
      continue;
    }
    const blocked = trait.incompatibleTraits?.some((other) => selected.has(other));
    if (blocked) {
      continue;
    }
    traits.push(trait);
  }

  return traits;
}

export function estimateAbilityPointCost(
  level: AbilityLevel,
  polarity: AbilityPolarity,
  override?: number,
): number {
  if (override !== undefined && !Number.isNaN(override)) {
    return override;
  }
  const base = majorEffectCost(level);
  if (polarity === "negative") {
    return -base;
  }
  if (polarity === "mixed") {
    return 0;
  }
  return base;
}

export function buildAbilityFromDraft(draft: AbilityDraft): AbilityDefinition {
  const id =
    draft.id.trim() ||
    slugify(draft.name.en || draft.name.pl) ||
    `ability-${Date.now()}`;

  const traits = collectTraits(draft.selectedTraitIds);
  const requirements = draft.selectedRequirementIds
    .map((reqId) => ABILITY_REQUIREMENT_TEMPLATES.find((entry) => entry.id === reqId))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .map((entry) => entry.requirement);

  const effects = traits.flatMap((trait) =>
    trait.effects.map((effect) => ({
      ...effect,
      id: `${id}:${effect.id}`,
    })),
  );

  const restrictions = traits.flatMap((trait) => trait.restrictions ?? []);

  const ability: AbilityDefinition = {
    id,
    name: {
      pl: draft.name.pl || id,
      en: draft.name.en || id,
    },
    level: draft.level,
    polarity: draft.polarity,
    requirements,
    effects,
    restrictions,
    cost: estimateAbilityPointCost(draft.level, draft.polarity, draft.costOverride),
  };

  return ability;
}

export function abilityDraftFromDefinition(ability: AbilityDefinition): AbilityDraft {
  const selectedTraitIds: string[] = [];
  const selectedRequirementIds: string[] = [];

  for (const trait of ABILITY_TRAIT_TEMPLATES) {
    const matches = trait.effects.every((effect) =>
      ability.effects.some(
        (abilityEffect) =>
          abilityEffect.type === effect.type &&
          abilityEffect.stat === effect.stat &&
          abilityEffect.value === effect.value &&
          abilityEffect.target === effect.target &&
          abilityEffect.trigger === effect.trigger &&
          abilityEffect.result === effect.result,
      ),
    );
    if (matches && trait.effects.length > 0) {
      selectedTraitIds.push(trait.id);
    }
  }

  for (const template of ABILITY_REQUIREMENT_TEMPLATES) {
    const matches = ability.requirements.some(
      (req) =>
        req.type === template.requirement.type &&
        req.value === template.requirement.value,
    );
    if (matches) {
      selectedRequirementIds.push(template.id);
    }
  }

  const inferredCategory =
    ability.polarity === "negative"
      ? "drawback"
      : selectedTraitIds.includes("ab-two-weapon-trigger")
        ? "conditional"
        : "combat";

  const expectedCost = estimateAbilityPointCost(ability.level, ability.polarity);
  const costOverride = ability.cost !== expectedCost ? ability.cost : undefined;

  return {
    id: ability.id,
    name: { ...ability.name },
    level: ability.level,
    polarity: ability.polarity,
    category: inferredCategory,
    selectedTraitIds,
    selectedRequirementIds,
    costOverride,
  };
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
  return (
    stat === "MS" ||
    stat === "RS" ||
    stat === "LS" ||
    stat === "KS" ||
    stat === "HP" ||
    stat === "MP"
  );
}

export function validateAbilityDefinition(ability: AbilityDefinition): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!ability.id.trim()) {
    errors.push(
      issue("ability.missingId", "error", {
        pl: "Brak identyfikatora talentu",
        en: "Ability id is required",
      }, "id"),
    );
  }

  if (!ability.name.pl.trim() || !ability.name.en.trim()) {
    errors.push(
      issue("ability.missingName", "error", {
        pl: "Nazwa PL i EN jest wymagana",
        en: "Both PL and EN names are required",
      }, "name"),
    );
  }

  if (ability.level < 1 || ability.level > 3) {
    errors.push(
      issue("ability.invalidLevel", "error", {
        pl: "Poziom talentu musi być 1–3",
        en: "Ability level must be 1–3",
      }, "level"),
    );
  }

  for (const effect of ability.effects) {
    if (
      effect.type === "modifyStat" &&
      effect.stat &&
      effect.value !== undefined &&
      effect.value < 0 &&
      isPurchasableStat(effect.stat) &&
      forbiddenNegativeAbilityStat(effect.stat)
    ) {
      errors.push(
        issue("ability.forbiddenNegativeStat", "error", {
          pl: `Ujemna modyfikacja ${effect.stat} jest zabroniona w baseline`,
          en: `Negative ${effect.stat} modifier is forbidden in baseline`,
        }, `effects.${effect.id}`),
      );
    }
  }

  const expectedCost = estimateAbilityPointCost(ability.level, ability.polarity);
  if (ability.cost !== expectedCost && ability.polarity !== "mixed") {
    warnings.push(
      issue("ability.costMismatch", "warning", {
        pl: `Koszt ${ability.cost} różni się od standardowego ${expectedCost} dla poziomu ${ability.level}`,
        en: `Cost ${ability.cost} differs from standard ${expectedCost} for level ${ability.level}`,
      }, "cost"),
    );
  }

  if (ability.polarity === "negative" && ability.effects.length === 0 && ability.restrictions.length === 0) {
    errors.push(
      issue("ability.emptyDrawback", "error", {
        pl: "Wada musi mieć efekt lub ograniczenie",
        en: "A drawback must have an effect or restriction",
      }),
    );
  }

  if (ability.polarity === "positive" && ability.effects.length === 0) {
    warnings.push(
      issue("ability.emptyPositive", "warning", {
        pl: "Talent dodatni bez efektów — sprawdź konfigurację",
        en: "Positive talent without effects — review configuration",
      }),
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function previewAbilityDraft(draft: AbilityDraft): {
  ability: AbilityDefinition;
  validation: ValidationResult;
  cost: number;
} {
  const ability = buildAbilityFromDraft(draft);
  const validation = validateAbilityDefinition(ability);
  return { ability, validation, cost: ability.cost };
}
