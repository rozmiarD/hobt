# Heroes of Brick & Tactics (HOBT)

Heroes of Brick & Tactics is a tactics game built around the **LEGO Skirmish** rules engine.

[![Pages](https://github.com/rozmiarD/HOBT/actions/workflows/pages.yml/badge.svg)](https://github.com/rozmiarD/HOBT/actions/workflows/pages.yml)

**Live configurator:** [https://rozmiard.github.io/HOBT/](https://rozmiard.github.io/HOBT/)

## Hero workshop

The web application is a complete, static character-card workshop:

- build a hero from the actual rules catalog,
- edit identity, stats, equipment, talents, and drawbacks,
- upload, crop, move, and zoom a portrait locally,
- see the tarot-format card update immediately,
- save, reopen, duplicate, and delete cards in the team collection,
- select cards and copy counts for fixed-size A4 printing,
- switch between editor and preview on mobile devices.

The same card renderer is used by the builder, collection, and print layout.
Cards are printed at **70 × 120 mm**; the browser print dialog should use
**100% scale** with background graphics enabled.

All application data is stored in the current browser using `localStorage`.
There are no user accounts, external APIs, application servers, or databases.

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

### Bootstrap talent catalog

Catalog version `1.2.0` contains ten level-one choices. Positive talents cost
100 points: Two-weapon fighting, Strong blow, Eagle eye, Watchful guard, Tough,
and Quick step. Drawbacks refund 100 points when their restriction is relevant:
Great-weapon fighting, Heavy gear, Fragile, and Unarmoured. A character may
select at most three talents or drawbacks in total.

### Bootstrap equipment catalog

The baseline contains 29 physical-accessory-friendly items, including eight
melee weapons, eight ranged weapons, a great axe, shields and armor, and utility
gear covering MS, RS, LS, KS, HP, MP, and AC. The first +1 bonus on an item is
free. Additional bonuses use the major-effect progression: the second bonus
costs 100 points and the third costs 300 points. Item restrictions may discount
paid bonuses, but equipment cannot generate a negative point cost.

The character card presents equipment and talents as separate full-width rows.
Weapon rows include the resolved test stat and damage, while other equipment
shows its stat modifier.

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

Stage 1–2: model, math, validation, card snapshot foundation.

Stage 3: complete browser-based hero workshop with:

- a guided character builder powered by the live rules catalog,
- a shared tarot-format card renderer for editing, collection, and print,
- local portrait upload with crop, position, and zoom controls,
- a locally persisted card collection with edit, duplicate, delete, and print selection,
- A4 print sheets with fixed 70 × 120 mm cards, copy counts, and optional cut lines,
- responsive editor/preview switching for phones and a side-by-side desktop workspace.

Character, team, catalog, portrait, and print-selection data is stored locally in
the browser. The GitHub Pages deployment does not require a backend.

## Local development

```bash
npm install
npm test
npm run typecheck
npm run typecheck:web
npm run dev:web
```

Open `http://localhost:5173/HOBT/`.

The Vite development server is only for local development and verification. It
is not part of the production hosting architecture.

To inspect the production build locally:

```bash
npm run build:web
npm run preview --workspace @hobt/configurator
```

## GitHub Pages deployment

Production is hosted as a static GitHub Pages site:

1. A commit is pushed to `main`.
2. [`.github/workflows/pages.yml`](.github/workflows/pages.yml) installs
   dependencies with `npm ci`.
3. The workflow runs tests, core build, frontend typecheck, and the Vite build.
4. Vite writes the static application to `web/dist`.
5. `actions/deploy-pages` publishes that directory at
   [https://rozmiard.github.io/HOBT/](https://rozmiard.github.io/HOBT/).

The Vite base path is `/HOBT/`, matching the GitHub Pages project URL. The
generated `web/dist` directory is a build artifact and does not need to be
committed.

The workflow can also be started manually using **Actions → CI and Pages → Run
workflow**.

Repository setting: **Pages → Build and deployment → Source: GitHub Actions**.

Unresolved gameplay topics are explicitly marked `UNRESOLVED` in code and are not hardcoded as rules.
# Heroes of Brick & Tactics (HOBT)

Heroes of Brick & Tactics is a tactics game built around the **LEGO Skirmish** rules engine.

[![Pages](https://github.com/rozmiarD/hobt/actions/workflows/pages.yml/badge.svg)](https://github.com/rozmiarD/hobt/actions/workflows/pages.yml)

**Live configurator:** [https://rozmiard.github.io/hobt/](https://rozmiard.github.io/hobt/)

## Hero workshop

The web application is a complete, static character-card workshop:

- build a hero from the actual rules catalog,
- edit identity, stats, equipment, talents, and drawbacks,
- upload, crop, move, and zoom a portrait locally,
- see the tarot-format card update immediately,
- save, reopen, duplicate, and delete cards in the team collection,
- select cards and copy counts for fixed-size A4 printing,
- switch between editor and preview on mobile devices.

The same card renderer is used by the builder, collection, and print layout.
Cards are printed at **70 × 120 mm**; the browser print dialog should use
**100% scale** with background graphics enabled.

All application data is stored in the current browser using `localStorage`.
There are no user accounts, external APIs, application servers, or databases.

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

### Bootstrap talent catalog

Catalog version `1.2.0` contains ten level-one choices. Positive talents cost
100 points: Two-weapon fighting, Strong blow, Eagle eye, Watchful guard, Tough,
and Quick step. Drawbacks refund 100 points when their restriction is relevant:
Great-weapon fighting, Heavy gear, Fragile, and Unarmoured. A character may
select at most three talents or drawbacks in total.

### Bootstrap equipment catalog

The baseline contains 29 physical-accessory-friendly items, including eight
melee weapons, eight ranged weapons, a great axe, shields and armor, and utility
gear covering MS, RS, LS, KS, HP, MP, and AC. The first +1 bonus on an item is
free. Additional bonuses use the major-effect progression: the second bonus
costs 100 points and the third costs 300 points. Item restrictions may discount
paid bonuses, but equipment cannot generate a negative point cost.

The character card presents equipment and talents as separate full-width rows.
Weapon rows include the resolved test stat and damage, while other equipment
shows its stat modifier.

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

Stage 1–2: model, math, validation, card snapshot foundation.

Stage 3: complete browser-based hero workshop with:

- a guided character builder powered by the live rules catalog,
- a shared tarot-format card renderer for editing, collection, and print,
- local portrait upload with crop, position, and zoom controls,
- a locally persisted card collection with edit, duplicate, delete, and print selection,
- A4 print sheets with fixed 70 × 120 mm cards, copy counts, and optional cut lines,
- responsive editor/preview switching for phones and a side-by-side desktop workspace.

Character, team, catalog, portrait, and print-selection data is stored locally in
the browser. The GitHub Pages deployment does not require a backend.

## Local development

```bash
npm install
npm test
npm run typecheck
npm run typecheck:web
npm run dev:web
```

Open `http://localhost:5173/hobt/`.

The Vite development server is only for local development and verification. It
is not part of the production hosting architecture.

To inspect the production build locally:

```bash
npm run build:web
npm run preview --workspace @hobt/configurator
```

## GitHub Pages deployment

Production is hosted as a static GitHub Pages site:

1. A commit is pushed to `main`.
2. [`.github/workflows/pages.yml`](.github/workflows/pages.yml) installs
   dependencies with `npm ci`.
3. The workflow runs tests, core build, frontend typecheck, and the Vite build.
4. Vite writes the static application to `web/dist`.
5. `actions/deploy-pages` publishes that directory at
   [https://rozmiard.github.io/hobt/](https://rozmiard.github.io/hobt/).

The Vite base path is `/hobt/`, matching the GitHub Pages project URL. The
generated `web/dist` directory is a build artifact and does not need to be
committed.

The workflow can also be started manually using **Actions → CI and Pages → Run
workflow**.

Repository setting: **Pages → Build and deployment → Source: GitHub Actions**.

Unresolved gameplay topics are explicitly marked `UNRESOLVED` in code and are not hardcoded as rules.
