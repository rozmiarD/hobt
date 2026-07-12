import type { GameCatalog } from "../types/index.js";
import { getBaselineCatalogDocument } from "./load-catalog.js";

export const DEFAULT_CATALOG: GameCatalog = getBaselineCatalogDocument().catalog;
