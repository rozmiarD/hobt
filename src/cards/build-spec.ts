import type {
  AbilityCardEntry,
  AbilityCardType,
  CharacterCard,
  CharacterCardContext,
  EquipmentCardEntry,
  EquipmentSlot,
  LocalizedText,
  ResolvedAction,
  ResolvedCharacter,
} from "../types/index.js";
import { DEFAULT_CATALOG } from "../catalog/default-catalog.js";
import { DEFAULT_RULESET } from "../rules/default-ruleset.js";

const SLOT_ORDER: EquipmentSlot[] = [
  "mainWeapon",
  "offhand",
  "armor",
  "item1",
  "item2",
];

function localize(text: LocalizedText, locale: "pl" | "en"): string {
  return text[locale];
}

function validationState(
  resolved: ResolvedCharacter,
): CharacterCard["validationState"] {
  if (!resolved.validation.valid) {
    return "invalid";
  }
  if (resolved.validation.warnings.length > 0) {
    return "warning";
  }
  return "valid";
}

function inferAbilityType(
  action: ResolvedAction,
  polarity?: "positive" | "negative" | "mixed",
): AbilityCardType {
  if (polarity === "negative") {
    return "negative";
  }
  if (action.sourceSlot === "mainWeapon") {
    return action.attackType === "ranged" ? "ranged" : "main_attack";
  }
  if (action.sourceSlot === "offhand") {
    return "offhand";
  }
  if (action.type === "attack" && action.attackType === "ranged") {
    return "ranged";
  }
  if (action.type === "attack") {
    return "main_attack";
  }
  return "passive";
}

function describeAction(
  action: ResolvedAction,
  locale: "pl" | "en",
  itemName?: string,
): string {
  const prefix = itemName ? `${itemName}: ` : "";
  if (action.type === "attack") {
    const parts = [
      action.testStat ?? "MS",
      `DMG ${action.damage ?? 1}`,
    ];
    if (action.requiresLineOfSight) {
      parts.push("LoS");
    }
    return `${prefix}${parts.join(" · ")}`;
  }
  return `${prefix}${localize(action.name, locale)}.`;
}

function describeTalent(
  action: ResolvedAction,
  locale: "pl" | "en",
): string {
  if (action.id.startsWith("empty:") || action.sourceId === "empty") {
    return locale === "pl" ? "Brak." : "None.";
  }

  const ability = DEFAULT_CATALOG.abilities[action.sourceId];
  if (ability) {
    const effectText = ability.effects
      .map((effect) => effect.display)
      .filter((display): display is LocalizedText => Boolean(display))
      .map((display) => localize(display, locale));
    if (effectText.length > 0) {
      return effectText.join(" ");
    }
    const restriction = ability.restrictions.find((entry) => entry.display)?.display;
    if (restriction) {
      return localize(restriction, locale);
    }
  }

  if (action.type === "attack") {
    return describeAction(action, locale);
  }

  return locale === "pl" ? "Efekt pasywny." : "Passive effect.";
}

function abilityLabel(
  action: ResolvedAction,
  locale: "pl" | "en",
): string {
  if (action.slotIndex === 1) {
    return locale === "pl" ? "Atak główny" : "Main attack";
  }
  if (action.slotIndex === 2) {
    return locale === "pl" ? "Offhand" : "Offhand";
  }
  if (action.name.pl === "—" || action.name.en === "—") {
    return locale === "pl" ? "—" : "—";
  }
  return localize(action.name, locale);
}

function buildEquipmentEntries(
  resolved: ResolvedCharacter,
  locale: "pl" | "en",
): CharacterCard["equipment"] {
  const entries: CharacterCard["equipment"] = {};
  for (const slot of SLOT_ORDER) {
    const resolvedSlot = resolved.equipment.find((entry) => entry.slot === slot);
    if (!resolvedSlot?.item) {
      continue;
    }
    const action = resolved.actions.find(
      (entry) =>
        entry.sourceSlot === slot && entry.sourceId === resolvedSlot.item?.id,
    );
    const details = [
      ...(action ? [describeAction(action, locale)] : []),
      ...resolvedSlot.item.effects
        .filter((effect) => !action || effect.type !== "modifyDamage")
        .flatMap((effect) =>
          effect.display ? [localize(effect.display, locale)] : [],
        ),
      ...resolvedSlot.item.restrictions.flatMap((restriction) =>
        restriction.display ? [localize(restriction.display, locale)] : [],
      ),
    ];
    const cardEntry: EquipmentCardEntry = {
      name: localize(resolvedSlot.item.name, locale),
      description: [...new Set(details)].join(" · ") || undefined,
    };
    entries[slot] = cardEntry;
  }
  return entries;
}

function buildAbilityEntries(
  resolved: ResolvedCharacter,
  locale: "pl" | "en",
): AbilityCardEntry[] {
  return resolved.actions
    .filter((action) => resolved.source.talentIds.includes(action.sourceId))
    .slice(0, DEFAULT_RULESET.cards.talentSlotCount)
    .map((action) => ({
      name: abilityLabel(action, locale),
      description: describeTalent(action, locale),
      type: inferAbilityType(action),
    }));
}

export function buildCharacterCard(
  resolved: ResolvedCharacter,
  context: CharacterCardContext = {},
): CharacterCard {
  const locale = context.locale ?? "pl";
  const source = resolved.source;

  return {
    id: source.id,
    name: source.name,
    subtitle: source.subtitle?.trim() || undefined,
    faction: source.faction?.trim() || undefined,
    team: context.teamName?.trim() || undefined,
    points: resolved.cost.total,
    portrait: source.cosmetics.portraitDataUrl
      ? {
          url: source.cosmetics.portraitDataUrl,
          fit: "cover",
          positionX: source.cosmetics.portraitPositionX ?? 50,
          positionY: source.cosmetics.portraitPositionY ?? 50,
          zoom: source.cosmetics.portraitZoom ?? 1,
        }
      : undefined,
    stats: {
      hp: resolved.derivedStats.HP,
      mp: resolved.derivedStats.MP,
      ac: resolved.derivedStats.AC,
      ms: resolved.derivedStats.MS,
      rs: resolved.derivedStats.RS,
      ls: resolved.derivedStats.LS,
      ks: resolved.derivedStats.KS,
    },
    equipment: buildEquipmentEntries(resolved, locale),
    abilities: buildAbilityEntries(resolved, locale),
    template: {
      id: context.templateId ?? "universal-clean",
      decorationLevel: context.decorationLevel ?? "standard",
    },
    metadata: {
      characterId: source.id,
      version: DEFAULT_RULESET.version,
      cardNumber: context.cardNumber,
    },
    validationState: validationState(resolved),
  };
}
