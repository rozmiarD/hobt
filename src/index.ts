export * from "./types/index.js";
export {
  DEFAULT_RULESET,
  attributeCost,
  majorEffectCost,
  negativeEffectValue,
} from "./rules/default-ruleset.js";
export { DEFAULT_CATALOG } from "./catalog/default-catalog.js";
export {
  getBaselineCatalogDocument,
  loadCatalogFromJson,
  mergeCatalogDocuments,
  normalizeCatalogDocument,
  serializeCatalogDocument,
  toGameCatalog,
} from "./catalog/load-catalog.js";
export type { CatalogDocument, WeaponSubtype } from "./catalog/catalog-document.js";
export {
  FAMILY_PROFILES,
  FAMILY_TRAIT_TEMPLATES,
  getFamilyProfile,
  getTraitsForFamily,
} from "./catalog/families.js";
export type { FamilyProfile, TraitTemplate } from "./catalog/families.js";
export {
  buildItemFromDraft,
  createEmptyItemDraft,
  estimateItemPointCost,
  itemDraftFromDefinition,
  previewItemDraft,
} from "./catalog/item-builder.js";
export type { ItemDraft } from "./catalog/item-builder.js";
export {
  buildAbilityFromDraft,
  abilityDraftFromDefinition,
  createEmptyAbilityDraft,
  estimateAbilityPointCost,
  previewAbilityDraft,
  validateAbilityDefinition,
} from "./catalog/ability-builder.js";
export type { AbilityDraft } from "./catalog/ability-builder.js";
export {
  ABILITY_CATEGORIES,
  ABILITY_CATEGORY_LABELS,
  ABILITY_REQUIREMENT_TEMPLATES,
  ABILITY_TRAIT_TEMPLATES,
  getTraitsForAbility,
  inferAbilityCategory,
} from "./catalog/ability-templates.js";
export type {
  AbilityCategory,
  AbilityRequirementTemplate,
  AbilityTraitTemplate,
} from "./catalog/ability-templates.js";
export {
  inferItemFamily,
  listItemFamilies,
  validateItemDefinition,
} from "./catalog/validate-item.js";
export {
  getItemsForSlot,
  listAbilities,
  listItems,
  localize,
} from "./catalog/helpers.js";
export { calculateCharacterCost } from "./cost/calculator.js";
export {
  testD6,
  resolveAttack,
  canPerformOffhandAttack,
} from "./combat/d6.js";
export { resolveCharacter, getEquipmentSlotLabel } from "./resolve/character.js";
export { validateCharacter } from "./validate/character.js";
export { validateTeam, calculateTeamCost } from "./validate/team.js";
export { buildCharacterCardSnapshot, buildCharacterCard } from "./cards/snapshot.js";
export { UNRESOLVED_TOPICS } from "./types/domain.js";
