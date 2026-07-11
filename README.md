# Heroes of Brick & Tactics (HOBT)

Heroes of Brick & Tactics is a tactics game built around the **LEGO Skirmish** rules engine.

## LEGO Skirmish core

The first implementation stage delivers a data-driven TypeScript rules engine for:

- ruleset definition and versioning,
- character builds with separated base vs derived stats,
- equipment and talents with structural effects,
- point-cost calculation with full breakdown,
- legality validation (character and team),
- combat foundation (`d6` roll-under, basic attack/armor flow),
- character card snapshots for future rendering.

Mechanical identity is independent of LEGO appearance, setting, or weapon cosmetics.

### Default ruleset

- ID: `lego-skirmish-core`
- Version: `0.2.0-draft`

### Quick start

```bash
npm install
npm test
npm run build
```

### Example

```ts
import {
  DEFAULT_RULESET,
  DEFAULT_CATALOG,
  resolveCharacter,
  buildCharacterCardSnapshot,
} from "@hobt/lego-skirmish";

const resolved = resolveCharacter(
  {
    id: "berserker",
    name: "Żelazny Berserker",
    baseStats: { MS: 3, RS: 0, LS: 0, KS: 0, HP: 4, MP: 3 },
    equipment: {},
    talentIds: ["strong-blow", "great-weapon-fighting"],
    cosmetics: {},
  },
  DEFAULT_RULESET,
  DEFAULT_CATALOG,
);

console.log(resolved.cost.total); // 220
const card = buildCharacterCardSnapshot(resolved);
```

## Status

Stage 1–2 implemented: model, math, validation, card snapshot foundation. Web configurator and print renderer are planned next.

Unresolved gameplay topics are explicitly marked `UNRESOLVED` in code and are not hardcoded as rules.
