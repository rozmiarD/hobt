import type {
  ResolvedCharacter,
  ResolvedCharacterCardData,
} from "../types/index.js";

function validationState(
  resolved: ResolvedCharacter,
): ResolvedCharacterCardData["validationState"] {
  if (!resolved.validation.valid) {
    return "invalid";
  }
  if (resolved.validation.warnings.length > 0) {
    return "warning";
  }
  return "valid";
}

export function buildCharacterCardSnapshot(
  resolved: ResolvedCharacter,
): ResolvedCharacterCardData {
  return {
    name: resolved.source.name,
    image: {
      assetId: resolved.source.cosmetics.imageRef,
    },
    stats: {
      HP: resolved.derivedStats.HP,
      MP: resolved.derivedStats.MP,
      AC: resolved.derivedStats.AC,
      MS: resolved.derivedStats.MS,
      RS: resolved.derivedStats.RS,
      LS: resolved.derivedStats.LS,
      KS: resolved.derivedStats.KS,
    },
    actions: resolved.actions,
    equipment: resolved.equipment,
    totalCost: resolved.cost.total,
    validationState: validationState(resolved),
  };
}
