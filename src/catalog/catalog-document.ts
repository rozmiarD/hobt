import type { GameCatalog, LocalizedText } from "../types/index.js";

export interface WeaponSubtype {
  id: string;
  name: LocalizedText;
}

export interface CatalogDocument {
  version: string;
  weaponSubtypes: {
    melee: WeaponSubtype[];
    ranged: WeaponSubtype[];
  };
  catalog: GameCatalog;
}
