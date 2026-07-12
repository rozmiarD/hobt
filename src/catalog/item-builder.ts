import type {
  ActionDefinition,
  ItemDefinition,
  ItemFamily,
  LocalizedText,
} from "../types/index.js";
import type { CatalogDocument } from "./catalog-document.js";
import {
  FAMILY_TRAIT_TEMPLATES,
  getFamilyProfile,
  getTraitsForFamily,
  type TraitTemplate,
} from "./families.js";
import { validateItemDefinition } from "./validate-item.js";

export interface ItemDraft {
  id: string;
  name: LocalizedText;
  family: ItemFamily;
  subtypeId: string;
  selectedTraitIds: string[];
  twoHanded: boolean;
  fixedCost: number;
}

export function createEmptyItemDraft(family: ItemFamily = "melee_weapon"): ItemDraft {
  return {
    id: "",
    name: { pl: "", en: "" },
    family,
    subtypeId: "",
    selectedTraitIds: [],
    twoHanded: false,
    fixedCost: 0,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function subtypeLabel(
  document: CatalogDocument,
  family: ItemFamily,
  subtypeId: string,
): LocalizedText | undefined {
  if (!subtypeId) {
    return undefined;
  }
  if (family === "melee_weapon") {
    return document.weaponSubtypes.melee.find((entry) => entry.id === subtypeId)?.name;
  }
  if (family === "ranged_weapon") {
    return document.weaponSubtypes.ranged.find((entry) => entry.id === subtypeId)?.name;
  }
  return undefined;
}

function baseWeaponAction(family: ItemFamily, damage: number): ActionDefinition[] {
  if (family === "melee_weapon") {
    return [
      {
        id: "melee-attack",
        type: "attack",
        name: { pl: "Atak w zwarciu", en: "Melee attack" },
        attackType: "melee",
        testStat: "MS",
        damage,
      },
    ];
  }
  if (family === "ranged_weapon") {
    return [
      {
        id: "ranged-attack",
        type: "attack",
        name: { pl: "Atak dystansowy", en: "Ranged attack" },
        attackType: "ranged",
        testStat: "RS",
        damage,
        requiresLineOfSight: true,
      },
    ];
  }
  if (family === "offhand") {
    return [
      {
        id: "offhand-passive",
        type: "passive",
        name: { pl: "Przedmiot pomocniczy", en: "Offhand item" },
      },
    ];
  }
  return [];
}

function collectTraits(traitIds: string[]): TraitTemplate[] {
  const selected = new Set(traitIds);
  const traits: TraitTemplate[] = [];

  for (const traitId of traitIds) {
    const trait = FAMILY_TRAIT_TEMPLATES.find((entry) => entry.id === traitId);
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

export function buildItemFromDraft(
  draft: ItemDraft,
  document: CatalogDocument,
): ItemDefinition {
  const profile = getFamilyProfile(draft.family);
  const subtype = subtypeLabel(document, draft.family, draft.subtypeId);
  const displayName: LocalizedText = {
    pl: draft.name.pl || subtype?.pl || profile.label.pl,
    en: draft.name.en || subtype?.en || profile.label.en,
  };

  const id =
    draft.id.trim() ||
    slugify(`${draft.family}-${draft.subtypeId || displayName.en}`) ||
    `item-${Date.now()}`;

  const traits = collectTraits(draft.selectedTraitIds);
  const autoTwoHanded =
    draft.twoHanded ||
    traits.some((trait) => trait.id === "melee-two-handed");

  const tags = [...profile.defaultTags];
  if (autoTwoHanded && draft.family === "melee_weapon") {
    tags.push("two-handed");
  }
  if (draft.family === "offhand" && traits.some((t) => t.id === "offhand-ac-plus1")) {
    tags.push("shield");
  }

  let allowedSlots = [...profile.defaultSlots];
  if (autoTwoHanded && draft.family === "melee_weapon") {
    allowedSlots = ["mainWeapon"];
  }

  let baseDamage = 1;
  if (autoTwoHanded && draft.family === "melee_weapon") {
    baseDamage = 2;
  }

  const actions = baseWeaponAction(draft.family, baseDamage);
  if (
    draft.family === "offhand" &&
    traits.some((trait) => trait.id === "offhand-melee-attack")
  ) {
    actions.push({
      id: "offhand-melee-attack",
      type: "attack",
      name: { pl: "Atak pomocniczy", en: "Offhand attack" },
      attackType: "melee",
      testStat: "MS",
      damage: 1,
    });
  }

  const effects = traits.flatMap((trait) =>
    trait.effects.map((effect) => ({
      ...effect,
      id: `${id}:${effect.id}`,
    })),
  );

  const restrictions = traits.flatMap((trait) => trait.restrictions ?? []);

  let positiveLevels = 0;
  let negativeLevels = 0;
  for (const trait of traits) {
    positiveLevels += trait.effectLevelContribution.positive ?? 0;
    negativeLevels += trait.effectLevelContribution.negative ?? 0;
  }

  if (autoTwoHanded && !traits.some((t) => t.id === "melee-two-handed")) {
    negativeLevels += 1;
    effects.push({
      id: `${id}:two-handed-block`,
      type: "blockSlot",
      slot: "offhand",
      display: { pl: "Blokuje offhand", en: "Blocks offhand" },
    });
    restrictions.push({
      type: "blockSlot",
      affects: ["offhand"],
      severity: 1,
      display: { pl: "Brak offhandu", en: "No offhand" },
    });
  }

  const item: ItemDefinition = {
    id,
    name: displayName,
    allowedSlots,
    tags: [...new Set(tags)],
    actions,
    effects,
    restrictions,
    cost: {
      fixed: draft.fixedCost,
      effectLevels: {
        positive: positiveLevels > 0 ? positiveLevels : undefined,
        negative: negativeLevels > 0 ? negativeLevels : undefined,
      },
    },
    meta: {
      family: draft.family,
      subtypeId: draft.subtypeId || undefined,
    },
  };

  return item;
}

export function itemDraftFromDefinition(
  item: ItemDefinition,
  document: CatalogDocument,
): ItemDraft {
  const family = item.meta?.family ?? "utility_item";
  const availableTraits = getTraitsForFamily(family);
  const selectedTraitIds: string[] = [];

  for (const trait of availableTraits) {
    const matches = trait.effects.every((effect) =>
      item.effects.some((itemEffect) =>
        itemEffect.type === effect.type &&
        itemEffect.stat === effect.stat &&
        itemEffect.value === effect.value &&
        itemEffect.target === effect.target,
      ),
    );
    if (matches && trait.effects.length > 0) {
      selectedTraitIds.push(trait.id);
    }
  }

  if (item.tags.includes("two-handed") && !selectedTraitIds.includes("melee-two-handed")) {
    selectedTraitIds.push("melee-two-handed");
  }

  return {
    id: item.id,
    name: { ...item.name },
    family,
    subtypeId: item.meta?.subtypeId ?? "",
    selectedTraitIds,
    twoHanded: item.tags.includes("two-handed"),
    fixedCost: item.cost.fixed ?? 0,
  };
}

export function estimateItemPointCost(item: ItemDefinition): number {
  const positiveLevel = item.cost.effectLevels?.positive ?? 0;
  const negativeLevel = item.cost.effectLevels?.negative ?? 0;
  const positiveCost =
    positiveLevel > 0 ? (100 * positiveLevel * (positiveLevel + 1)) / 2 : 0;
  const negativeCost =
    negativeLevel > 0 ? -((100 * negativeLevel * (negativeLevel + 1)) / 2) : 0;
  return (item.cost.fixed ?? 0) + positiveCost + negativeCost;
}

export function previewItemDraft(
  draft: ItemDraft,
  document: CatalogDocument,
): { item: ItemDefinition; validation: ReturnType<typeof validateItemDefinition>; cost: number } {
  const item = buildItemFromDraft(draft, document);
  const validation = validateItemDefinition(item);
  const cost = estimateItemPointCost(item);
  return { item, validation, cost };
}
