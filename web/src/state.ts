import type {
  CharacterBuild,
  EquipmentSlot,
  PurchasableStat,
  Team,
} from "@hobt/lego-skirmish/types/domain.js";
import { DEFAULT_RULESET } from "@hobt/lego-skirmish/rules/default-ruleset.js";
import type { Locale } from "./i18n.js";

const STORAGE_KEY = "hobt-configurator-state-v2";

export interface AppState {
  locale: Locale;
  team: Team;
  activeCharacterId: string | null;
  draft: CharacterBuild;
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
    team: {
      id: "team-1",
      name: "Moja drużyna",
      rulesetId: DEFAULT_RULESET.id,
      budget: DEFAULT_RULESET.team.budget,
      characters: [],
      cardTheme: { templateId: "universal-clean", decorLevel: "standard" },
    },
    activeCharacterId: null,
    draft,
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
      draft: parsed.draft ?? createEmptyCharacter(),
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    draft: createEmptyCharacter(
      state.locale === "pl" ? "Nowa postać" : "New character",
    ),
  };
}
