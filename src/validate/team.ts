import type {
  GameCatalog,
  ResolvedTeam,
  Ruleset,
  Team,
  ValidationIssue,
  ValidationResult,
} from "../types/index.js";
import { resolveCharacter } from "../resolve/character.js";

function issue(
  code: string,
  severity: ValidationIssue["severity"],
  message: ValidationIssue["message"],
  field?: string,
): ValidationIssue {
  return { code, severity, message, field };
}

export function validateTeam(
  team: Team,
  ruleset: Ruleset,
  catalog: GameCatalog,
): ResolvedTeam {
  const characters = team.characters.map((character) =>
    resolveCharacter(character, ruleset, catalog),
  );

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const count = team.characters.length;
  if (count < ruleset.team.minimumCharacterCount) {
    errors.push(
      issue(
        "team_too_small",
        "error",
        {
          pl: `Drużyna musi mieć co najmniej ${ruleset.team.minimumCharacterCount} postaci.`,
          en: `Team must have at least ${ruleset.team.minimumCharacterCount} characters.`,
        },
        "characters",
      ),
    );
  }
  if (count > ruleset.team.maximumCharacterCount) {
    errors.push(
      issue(
        "team_too_large",
        "error",
        {
          pl: `Drużyna może mieć maksymalnie ${ruleset.team.maximumCharacterCount} postaci.`,
          en: `Team may have at most ${ruleset.team.maximumCharacterCount} characters.`,
        },
        "characters",
      ),
    );
  }

  const totalCost = characters.reduce(
    (sum, character) => sum + character.cost.total,
    0,
  );
  const budget = team.budget || ruleset.team.budget;
  if (totalCost > budget) {
    errors.push(
      issue(
        "team_over_budget",
        "error",
        {
          pl: `Koszt drużyny (${totalCost}) przekracza budżet (${budget}).`,
          en: `Team cost (${totalCost}) exceeds budget (${budget}).`,
        },
        "budget",
      ),
    );
  }

  for (const character of characters) {
    errors.push(...character.validation.errors);
    warnings.push(...character.validation.warnings);
  }

  const validation: ValidationResult = {
    valid: errors.length === 0,
    errors,
    warnings,
  };

  return {
    source: team,
    characters,
    totalCost,
    validation,
  };
}

export function calculateTeamCost(
  team: Team,
  ruleset: Ruleset,
  catalog: GameCatalog,
): number {
  return team.characters
    .map((character) => resolveCharacter(character, ruleset, catalog).cost.total)
    .reduce((sum, cost) => sum + cost, 0);
}
