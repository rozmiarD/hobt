import type {
  CatalogDocument,
  WeaponSubtype,
} from "./catalog-document.js";
import type { GameCatalog } from "../types/index.js";
import baseline from "./baseline.json" with { type: "json" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLocalizedText(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.pl === "string" &&
    typeof value.en === "string"
  );
}

function isWeaponSubtype(value: unknown): value is WeaponSubtype {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    isLocalizedText(value.name)
  );
}

function isGameCatalog(value: unknown): value is GameCatalog {
  if (!isRecord(value)) {
    return false;
  }
  return isRecord(value.items) && isRecord(value.abilities);
}

export function normalizeCatalogDocument(raw: unknown): CatalogDocument {
  if (!isRecord(raw)) {
    throw new Error("Catalog document must be an object");
  }

  const version = typeof raw.version === "string" ? raw.version : "0.0.0";
  const weaponSubtypesRaw = isRecord(raw.weaponSubtypes)
    ? raw.weaponSubtypes
    : {};

  const melee = Array.isArray(weaponSubtypesRaw.melee)
    ? weaponSubtypesRaw.melee.filter(isWeaponSubtype)
    : [];
  const ranged = Array.isArray(weaponSubtypesRaw.ranged)
    ? weaponSubtypesRaw.ranged.filter(isWeaponSubtype)
    : [];

  const catalogSource = isRecord(raw.catalog) ? raw.catalog : raw;
  if (!isGameCatalog(catalogSource)) {
    throw new Error("Catalog document is missing items/abilities");
  }

  return {
    version,
    weaponSubtypes: { melee, ranged },
    catalog: catalogSource,
  };
}

export function getBaselineCatalogDocument(): CatalogDocument {
  return normalizeCatalogDocument(baseline);
}

export function loadCatalogFromJson(json: string): CatalogDocument {
  const parsed: unknown = JSON.parse(json);
  return normalizeCatalogDocument(parsed);
}

export function serializeCatalogDocument(document: CatalogDocument): string {
  return JSON.stringify(document, null, 2);
}

export function mergeCatalogDocuments(
  base: CatalogDocument,
  overlay: CatalogDocument,
): CatalogDocument {
  return {
    version: overlay.version || base.version,
    weaponSubtypes: {
      melee:
        overlay.weaponSubtypes.melee.length > 0
          ? overlay.weaponSubtypes.melee
          : base.weaponSubtypes.melee,
      ranged:
        overlay.weaponSubtypes.ranged.length > 0
          ? overlay.weaponSubtypes.ranged
          : base.weaponSubtypes.ranged,
    },
    catalog: {
      items: { ...base.catalog.items, ...overlay.catalog.items },
      abilities: {
        ...base.catalog.abilities,
        ...overlay.catalog.abilities,
      },
    },
  };
}

export function toGameCatalog(document: CatalogDocument): GameCatalog {
  return document.catalog;
}
