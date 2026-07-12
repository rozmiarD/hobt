export interface LocalizedText {
  pl: string;
  en: string;
}

export type PurchasableStat = "MS" | "RS" | "LS" | "KS" | "HP" | "MP";
export type DerivedStat = "AC";
export type Stat = PurchasableStat | DerivedStat;

export type EquipmentSlot =
  | "mainWeapon"
  | "offhand"
  | "armor"
  | "item1"
  | "item2";

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  "mainWeapon",
  "offhand",
  "armor",
  "item1",
  "item2",
] as const;

export type AttackType = "melee" | "ranged";

export type EffectType =
  | "modifyStat"
  | "modifyDamage"
  | "grantAction"
  | "replaceAction"
  | "blockSlot"
  | "requireSlot"
  | "requireItemTag"
  | "reroll"
  | "conditionalModifier"
  | "applyStatus"
  | "restriction";

export type AbilityLevel = 1 | 2 | 3;
export type AbilityPolarity = "positive" | "negative" | "mixed";
export type RestrictionSeverity = 1 | 2 | 3;

export interface PurchasableStats {
  MS: number;
  RS: number;
  LS: number;
  KS: number;
  HP: number;
  MP: number;
}

export interface DerivedStats extends PurchasableStats {
  AC: number;
}

export interface ItemInstance {
  itemId: string;
}

export interface CharacterCosmetics {
  cardStyle?: string;
  imageRef?: string;
  portraitDataUrl?: string;
}

export interface CharacterBuild {
  id: string;
  name: string;
  subtitle?: string;
  faction?: string;
  baseStats: PurchasableStats;
  equipment: Partial<Record<EquipmentSlot, ItemInstance>>;
  talentIds: string[];
  cosmetics: CharacterCosmetics;
}

export interface CostEntry {
  id: string;
  label: LocalizedText;
  amount: number;
  source: "attribute" | "equipment" | "ability" | "effect" | "restriction";
}

export interface CostBreakdown {
  attributes: CostEntry[];
  equipment: CostEntry[];
  abilities: CostEntry[];
  positiveEffects: CostEntry[];
  negativeEffects: CostEntry[];
  subtotal: number;
  total: number;
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: LocalizedText;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ActionDefinition {
  id: string;
  type: "attack" | "utility" | "passive";
  name: LocalizedText;
  attackType?: AttackType;
  testStat?: PurchasableStat;
  damage?: number;
  requiresLineOfSight?: boolean;
  trigger?: string;
}

export interface ResolvedAction extends ActionDefinition {
  sourceId: string;
  sourceSlot?: EquipmentSlot;
  slotIndex: 1 | 2 | 3 | 4 | 5;
}

export interface EffectDefinition {
  id: string;
  type: EffectType;
  stackable?: boolean;
  display?: LocalizedText;
  stat?: Stat;
  value?: number;
  target?: string;
  slot?: EquipmentSlot;
  tag?: string;
  actionId?: string;
  trigger?: string;
  result?: string;
  severity?: RestrictionSeverity;
  affects?: string[];
  statusId?: string;
  condition?: string;
}

export interface RestrictionDefinition {
  type: string;
  affects: string[];
  severity: RestrictionSeverity;
  display?: LocalizedText;
  stackable?: boolean;
}

export interface RequirementDefinition {
  type:
    | "mainWeaponAttackType"
    | "offhandAttackType"
    | "offhandItemTag"
    | "slotNotBlocked"
    | "slotOccupied"
    | "slotEmpty"
    | "hasRangedAction";
  value?: string | EquipmentSlot;
}

export interface CostDefinition {
  fixed?: number;
  effectLevels?: { positive?: number; negative?: number };
}

export type ItemFamily =
  | "melee_weapon"
  | "ranged_weapon"
  | "armor"
  | "offhand"
  | "utility_item";

export const ITEM_FAMILIES: readonly ItemFamily[] = [
  "melee_weapon",
  "ranged_weapon",
  "armor",
  "offhand",
  "utility_item",
] as const;

export interface ItemMeta {
  family: ItemFamily;
  /** Cosmetic weapon subtype (sword, bow, …) — no mechanical effect */
  subtypeId?: string;
  author?: string;
  notes?: string;
}

export interface ItemDefinition {
  id: string;
  name: LocalizedText;
  allowedSlots: EquipmentSlot[];
  tags: string[];
  actions: ActionDefinition[];
  effects: EffectDefinition[];
  restrictions: RestrictionDefinition[];
  cost: CostDefinition;
  meta?: ItemMeta;
}

export interface AbilityDefinition {
  id: string;
  name: LocalizedText;
  level: AbilityLevel;
  polarity: AbilityPolarity;
  requirements: RequirementDefinition[];
  effects: EffectDefinition[];
  restrictions: RestrictionDefinition[];
  cost: number;
}

export interface TeamRules {
  budget: number;
  minimumCharacterCount: number;
  maximumCharacterCount: number;
  recommendedCharacterCount: number;
}

export interface AttributeRules {
  purchasable: readonly PurchasableStat[];
  minLevel: number;
  maxLevel: number;
  costPerLevelFormula: "triangular_x10";
}

export interface EffectRules {
  majorEffectCostFormula: "triangular_x100";
  negativeEffectValues: Record<RestrictionSeverity, number>;
  positiveEffectValues: Record<AbilityLevel, number>;
}

export interface EquipmentRules {
  slots: readonly EquipmentSlot[];
  maxTalents: number;
  maxActionSlots: number;
}

export interface CharacterRules {
  maxTalents: number;
}

export interface CardRules {
  actionSlotCount: number;
  equipmentSlotCount: number;
  talentSlotCount: number;
}

export interface MovementRules {
  unit: "cm" | "inch" | "grid" | "stud";
  distancePerMP: number;
}

export interface Ruleset {
  id: string;
  version: string;
  team: TeamRules;
  attributes: AttributeRules;
  effects: EffectRules;
  equipment: EquipmentRules;
  character: CharacterRules;
  cards: CardRules;
  movement: MovementRules;
}

export interface GameCatalog {
  items: Record<string, ItemDefinition>;
  abilities: Record<string, AbilityDefinition>;
}

export interface ResolvedEffect {
  effect: EffectDefinition;
  sourceId: string;
  sourceType: "item" | "ability";
  active: boolean;
}

export interface ResolvedEquipmentSlot {
  slot: EquipmentSlot;
  item?: ItemDefinition;
  label: LocalizedText;
}

export interface ResolvedCharacter {
  source: CharacterBuild;
  derivedStats: DerivedStats;
  actions: ResolvedAction[];
  equipment: ResolvedEquipmentSlot[];
  activeEffects: ResolvedEffect[];
  blockedSlots: EquipmentSlot[];
  cost: CostBreakdown;
  validation: ValidationResult;
}

export interface Team {
  id: string;
  name: string;
  rulesetId: string;
  budget: number;
  characters: CharacterBuild[];
  cardTheme: CardThemeSelection;
}

export interface CardThemeSelection {
  templateId: string;
  paletteId?: string;
  decorLevel?: "minimal" | "standard" | "ornate";
}

export interface ResolvedStats {
  HP: number;
  MP: number;
  AC: number;
  MS: number;
  RS: number;
  LS: number;
  KS: number;
}

export interface ImageReference {
  url?: string;
  assetId?: string;
}

export interface ResolvedCharacterCardData {
  name: string;
  image: ImageReference;
  stats: ResolvedStats;
  actions: ResolvedAction[];
  equipment: ResolvedEquipmentSlot[];
  totalCost: number;
  validationState: "valid" | "warning" | "invalid";
}

export type AbilityCardType =
  | "main_attack"
  | "offhand"
  | "defense"
  | "movement"
  | "ranged"
  | "leadership"
  | "knowledge"
  | "healing"
  | "magic"
  | "trap"
  | "area"
  | "negative"
  | "passive";

export interface EquipmentCardEntry {
  name: string;
  description?: string;
}

export interface AbilityCardEntry {
  name: string;
  description: string;
  type?: AbilityCardType;
}

export interface CharacterCardStats {
  hp: number;
  mp: number;
  ac: number;
  ms: number;
  rs: number;
  ls: number;
  ks: number;
}

export interface CharacterCardPortrait {
  url: string;
  fit?: "contain" | "cover";
}

export interface CharacterCard {
  id: string;
  name: string;
  subtitle?: string;
  faction?: string;
  team?: string;
  points: number;
  portrait?: CharacterCardPortrait;
  stats: CharacterCardStats;
  equipment: {
    mainWeapon?: EquipmentCardEntry;
    offhand?: EquipmentCardEntry;
    armor?: EquipmentCardEntry;
    item1?: EquipmentCardEntry;
    item2?: EquipmentCardEntry;
  };
  abilities: AbilityCardEntry[];
  template: {
    id: string;
    decorationLevel?: "minimal" | "standard" | "ornate" | "worn";
  };
  metadata?: {
    cardNumber?: string;
    version?: string;
    characterId?: string;
  };
  validationState: "valid" | "warning" | "invalid";
}

export interface CharacterCardContext {
  teamName?: string;
  templateId?: string;
  decorationLevel?: "minimal" | "standard" | "ornate" | "worn";
  locale?: "pl" | "en";
  cardNumber?: string;
}

export interface ResolvedTeam {
  source: Team;
  characters: ResolvedCharacter[];
  totalCost: number;
  validation: ValidationResult;
}

export type UnresolvedTopic =
  | "turnStructure"
  | "actionsPerActivation"
  | "initiative"
  | "leadershipSkillDetail"
  | "knowledgeSkillDetail"
  | "movementUnit"
  | "meleeEngagement"
  | "coverAndTerrain"
  | "armorCostAndCap"
  | "armorStacking"
  | "minMaxDerivedHpMp"
  | "statLevel6Meaning"
  | "effectCatalogLevels"
  | "healingStatusesMagic"
  | "mandatoryEquipment"
  | "duplicateItemsTalents"
  | "minimumCharacterCost"
  | "specialCards"
  | "scenarioObjectives"
  | "cardThemeList";

export const UNRESOLVED_TOPICS: Record<UnresolvedTopic, "UNRESOLVED"> = {
  turnStructure: "UNRESOLVED",
  actionsPerActivation: "UNRESOLVED",
  initiative: "UNRESOLVED",
  leadershipSkillDetail: "UNRESOLVED",
  knowledgeSkillDetail: "UNRESOLVED",
  movementUnit: "UNRESOLVED",
  meleeEngagement: "UNRESOLVED",
  coverAndTerrain: "UNRESOLVED",
  armorCostAndCap: "UNRESOLVED",
  armorStacking: "UNRESOLVED",
  minMaxDerivedHpMp: "UNRESOLVED",
  statLevel6Meaning: "UNRESOLVED",
  effectCatalogLevels: "UNRESOLVED",
  healingStatusesMagic: "UNRESOLVED",
  mandatoryEquipment: "UNRESOLVED",
  duplicateItemsTalents: "UNRESOLVED",
  minimumCharacterCost: "UNRESOLVED",
  specialCards: "UNRESOLVED",
  scenarioObjectives: "UNRESOLVED",
  cardThemeList: "UNRESOLVED",
};
