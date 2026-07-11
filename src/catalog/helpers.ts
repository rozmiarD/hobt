import type {
  EquipmentSlot,
  GameCatalog,
  ItemDefinition,
  LocalizedText,
} from "../types/index.js";

export function getItemsForSlot(
  catalog: GameCatalog,
  slot: EquipmentSlot,
): ItemDefinition[] {
  return Object.values(catalog.items).filter((item) =>
    item.allowedSlots.includes(slot),
  );
}

export function listAbilities(catalog: GameCatalog) {
  return Object.values(catalog.abilities);
}

export function listItems(catalog: GameCatalog) {
  return Object.values(catalog.items);
}

export function localize(text: LocalizedText, locale: "pl" | "en"): string {
  return text[locale];
}
