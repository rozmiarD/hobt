import type {
  CharacterBuild,
  EquipmentSlot,
  PurchasableStat,
  Team,
} from "@hobt/lego-skirmish/types/domain.js";
import {
  buildItemFromDraft,
  createEmptyItemDraft,
  getBaselineCatalogDocument,
  itemDraftFromDefinition,
  type CatalogDocument,
  type ItemDraft,
  type ItemFamily,
} from "@hobt/lego-skirmish";
import { DEFAULT_RULESET } from "@hobt/lego-skirmish/rules/default-ruleset.js";
import type { Locale } from "./i18n.js";

const STORAGE_KEY = "hobt-configurator-state-v2";

export type AppMode = "team" | "catalog";

export type EditorStep = "identity" | "stats" | "equipment" | "talents";

export type CatalogSort = "cost-asc" | "cost-desc" | "name-asc";
export type TalentFilter = "all" | "positive" | "negative";
export type MobilePanel = "none" | "filters" | "team";

export interface AppState {
  locale: Locale;
  appMode: AppMode;
  catalogDocument: CatalogDocument;
  itemDraft: ItemDraft;
  catalogSelectionId: string | null;
  team: Team;
  activeCharacterId: string | null;
  activeEditorStep: EditorStep;
  draft: CharacterBuild;
  searchQuery: string;
  catalogSort: CatalogSort;
  equipmentSlotFilter: EquipmentSlot;
  talentFilter: TalentFilter;
  maxCostFilter: number;
  mobilePanel: MobilePanel;
}

let nextId = 1;

export function createEmptyCharacter(name = "Nowa postać"): CharacterBuild {
  const id = `char-${nextId++}`;
  return {
    id,
    name,
    baseStats: { MS: 0, RS: 0, LS: 0, KS: 0, HP: 0, MP: 0 },
    equipment: {},
    talentIds: [],
    cosmetics: {},
  };
}

export function createInitialState(): AppState {
  const draft = createEmptyCharacter();
  return {
    locale: "pl",
    appMode: "team",
    catalogDocument: structuredClone(getBaselineCatalogDocument()),
    itemDraft: createEmptyItemDraft(),
    catalogSelectionId: null,
    team: {
      id: "team-1",
      name: "Moja drużyna",
      rulesetId: DEFAULT_RULESET.id,
      budget: DEFAULT_RULESET.team.budget,
      characters: [],
      cardTheme: { templateId: "universal-clean", decorLevel: "standard" },
    },
    activeCharacterId: null,
    activeEditorStep: "identity",
    draft,
    searchQuery: "",
    catalogSort: "cost-asc",
    equipmentSlotFilter: "mainWeapon",
    talentFilter: "all",
    maxCostFilter: DEFAULT_RULESET.team.budget,
    mobilePanel: "none",
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw) as AppState;
    const maxId = parsed.team.characters
      .concat(parsed.draft)
      .map((character) => Number(character.id.replace(/\D/g, "")) || 0)
      .reduce((max, value) => Math.max(max, value), 0);
    nextId = maxId + 1;
    return {
      ...createInitialState(),
      ...parsed,
      catalogDocument:
        parsed.catalogDocument ?? structuredClone(getBaselineCatalogDocument()),
      itemDraft: parsed.itemDraft ?? createEmptyItemDraft(),
      catalogSelectionId: parsed.catalogSelectionId ?? null,
      appMode: parsed.appMode ?? "team",
      draft: parsed.draft ?? createEmptyCharacter(),
      activeEditorStep: parsed.activeEditorStep ?? "identity",
      searchQuery: parsed.searchQuery ?? "",
      catalogSort: parsed.catalogSort ?? "cost-asc",
      equipmentSlotFilter: parsed.equipmentSlotFilter ?? "mainWeapon",
      talentFilter: parsed.talentFilter ?? "all",
      maxCostFilter: parsed.maxCostFilter ?? DEFAULT_RULESET.team.budget,
      mobilePanel: "none",
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setActiveEditorStep(
  state: AppState,
  step: EditorStep,
): AppState {
  return { ...state, activeEditorStep: step };
}

export function setLocale(state: AppState, locale: Locale): AppState {
  return { ...state, locale };
}

export function setDraftName(state: AppState, name: string): AppState {
  return { ...state, draft: { ...state.draft, name } };
}

export function setDraftSubtitle(state: AppState, subtitle: string): AppState {
  return { ...state, draft: { ...state.draft, subtitle } };
}

export function setDraftFaction(state: AppState, faction: string): AppState {
  return { ...state, draft: { ...state.draft, faction } };
}

export function setDraftPortrait(
  state: AppState,
  portraitDataUrl: string | undefined,
): AppState {
  return {
    ...state,
    draft: {
      ...state.draft,
      cosmetics: {
        ...state.draft.cosmetics,
        portraitDataUrl,
      },
    },
  };
}

export function setTeamName(state: AppState, name: string): AppState {
  return {
    ...state,
    team: { ...state.team, name },
  };
}

export function setDraftStat(
  state: AppState,
  stat: PurchasableStat,
  value: number,
): AppState {
  const level = Math.max(0, Math.min(6, value));
  return {
    ...state,
    draft: {
      ...state.draft,
      baseStats: { ...state.draft.baseStats, [stat]: level },
    },
  };
}

export function setDraftEquipment(
  state: AppState,
  slot: EquipmentSlot,
  itemId: string | null,
): AppState {
  const equipment = { ...state.draft.equipment };
  if (!itemId) {
    delete equipment[slot];
  } else {
    equipment[slot] = { itemId };
  }
  return { ...state, draft: { ...state.draft, equipment } };
}

export function toggleDraftTalent(state: AppState, talentId: string): AppState {
  const selected = new Set(state.draft.talentIds);
  if (selected.has(talentId)) {
    selected.delete(talentId);
  } else if (selected.size < DEFAULT_RULESET.character.maxTalents) {
    selected.add(talentId);
  }
  return {
    ...state,
    draft: { ...state.draft, talentIds: [...selected] },
  };
}

export function setCardTheme(state: AppState, templateId: string): AppState {
  return {
    ...state,
    team: {
      ...state.team,
      cardTheme: { ...state.team.cardTheme, templateId },
    },
  };
}

export function addDraftToTeam(state: AppState): AppState {
  const exists = state.team.characters.some(
    (character) => character.id === state.draft.id,
  );
  const characters = exists
    ? state.team.characters.map((character) =>
        character.id === state.draft.id ? structuredClone(state.draft) : character,
      )
    : [...state.team.characters, structuredClone(state.draft)];
  return {
    ...state,
    team: { ...state.team, characters },
    activeCharacterId: state.draft.id,
  };
}

export function removeFromTeam(state: AppState, characterId: string): AppState {
  const characters = state.team.characters.filter(
    (character) => character.id !== characterId,
  );
  return {
    ...state,
    team: { ...state.team, characters },
    activeCharacterId:
      state.activeCharacterId === characterId ? null : state.activeCharacterId,
  };
}

export function selectTeamCharacter(
  state: AppState,
  characterId: string,
): AppState {
  const character = state.team.characters.find(
    (entry) => entry.id === characterId,
  );
  if (!character) {
    return state;
  }
  return {
    ...state,
    activeCharacterId: characterId,
    draft: structuredClone(character),
  };
}

export function startNewCharacter(state: AppState): AppState {
  return {
    ...state,
    activeCharacterId: null,
    activeEditorStep: "identity",
    draft: createEmptyCharacter(
      state.locale === "pl" ? "Nowa postać" : "New character",
    ),
  };
}

export function setSearchQuery(state: AppState, searchQuery: string): AppState {
  return { ...state, searchQuery };
}

export function setCatalogSort(state: AppState, catalogSort: CatalogSort): AppState {
  return { ...state, catalogSort };
}

export function setEquipmentSlotFilter(
  state: AppState,
  equipmentSlotFilter: EquipmentSlot,
): AppState {
  return { ...state, equipmentSlotFilter };
}

export function setTalentFilter(
  state: AppState,
  talentFilter: TalentFilter,
): AppState {
  return { ...state, talentFilter };
}

export function setMaxCostFilter(state: AppState, maxCostFilter: number): AppState {
  return {
    ...state,
    maxCostFilter: Math.max(0, Math.min(DEFAULT_RULESET.team.budget, maxCostFilter)),
  };
}

export function setMobilePanel(state: AppState, mobilePanel: MobilePanel): AppState {
  return { ...state, mobilePanel };
}

export function clearAll(state: AppState): AppState {
  return { ...createInitialState(), locale: state.locale };
}

export function setAppMode(state: AppState, appMode: AppMode): AppState {
  return { ...state, appMode };
}

export function setCatalogDocument(
  state: AppState,
  catalogDocument: CatalogDocument,
): AppState {
  return { ...state, catalogDocument: structuredClone(catalogDocument) };
}

export function resetCatalogToBaseline(state: AppState): AppState {
  return {
    ...state,
    catalogDocument: structuredClone(getBaselineCatalogDocument()),
    itemDraft: createEmptyItemDraft(),
    catalogSelectionId: null,
  };
}

export function startNewCatalogItem(state: AppState): AppState {
  return {
    ...state,
    itemDraft: createEmptyItemDraft(state.itemDraft.family),
    catalogSelectionId: null,
  };
}

export function selectCatalogItem(state: AppState, itemId: string): AppState {
  const item = state.catalogDocument.catalog.items[itemId];
  if (!item) {
    return state;
  }
  return {
    ...state,
    catalogSelectionId: itemId,
    itemDraft: itemDraftFromDefinition(item, state.catalogDocument),
  };
}

export function setItemDraftFamily(state: AppState, family: ItemFamily): AppState {
  return {
    ...state,
    itemDraft: {
      ...createEmptyItemDraft(family),
      id: state.itemDraft.id,
      name: state.itemDraft.name,
    },
  };
}

export function setItemDraftId(state: AppState, id: string): AppState {
  return { ...state, itemDraft: { ...state.itemDraft, id } };
}

export function setItemDraftName(
  state: AppState,
  localeKey: "pl" | "en",
  value: string,
): AppState {
  return {
    ...state,
    itemDraft: {
      ...state.itemDraft,
      name: { ...state.itemDraft.name, [localeKey]: value },
    },
  };
}

export function setItemDraftSubtype(state: AppState, subtypeId: string): AppState {
  return { ...state, itemDraft: { ...state.itemDraft, subtypeId } };
}

export function setItemDraftFixedCost(state: AppState, fixedCost: number): AppState {
  return {
    ...state,
    itemDraft: {
      ...state.itemDraft,
      fixedCost: Math.max(-500, Math.min(500, fixedCost)),
    },
  };
}

export function setItemDraftTwoHanded(state: AppState, twoHanded: boolean): AppState {
  return { ...state, itemDraft: { ...state.itemDraft, twoHanded } };
}

export function toggleItemDraftTrait(state: AppState, traitId: string): AppState {
  const selected = new Set(state.itemDraft.selectedTraitIds);
  if (selected.has(traitId)) {
    selected.delete(traitId);
  } else {
    selected.add(traitId);
  }
  return {
    ...state,
    itemDraft: { ...state.itemDraft, selectedTraitIds: [...selected] },
  };
}

export function saveItemDraftToCatalog(state: AppState): AppState {
  const item = buildItemFromDraft(state.itemDraft, state.catalogDocument);
  return {
    ...state,
    catalogDocument: {
      ...state.catalogDocument,
      catalog: {
        ...state.catalogDocument.catalog,
        items: {
          ...state.catalogDocument.catalog.items,
          [item.id]: item,
        },
      },
    },
    catalogSelectionId: item.id,
    itemDraft: { ...state.itemDraft, id: item.id },
  };
}

export function deleteCatalogItem(state: AppState, itemId: string): AppState {
  const items = { ...state.catalogDocument.catalog.items };
  delete items[itemId];
  return {
    ...state,
    catalogDocument: {
      ...state.catalogDocument,
      catalog: { ...state.catalogDocument.catalog, items },
    },
    catalogSelectionId:
      state.catalogSelectionId === itemId ? null : state.catalogSelectionId,
    itemDraft:
      state.catalogSelectionId === itemId
        ? createEmptyItemDraft(state.itemDraft.family)
        : state.itemDraft,
  };
}
