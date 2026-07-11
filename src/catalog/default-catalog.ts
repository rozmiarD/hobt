import type { GameCatalog, ItemDefinition, AbilityDefinition } from "../types/index.js";

const meleeSword: ItemDefinition = {
  id: "melee-sword",
  name: { pl: "Miecz", en: "Sword" },
  allowedSlots: ["mainWeapon", "offhand"],
  tags: ["weapon", "melee"],
  actions: [
    {
      id: "melee-attack",
      type: "attack",
      name: { pl: "Atak w zwarciu", en: "Melee attack" },
      attackType: "melee",
      testStat: "MS",
      damage: 1,
    },
  ],
  effects: [],
  restrictions: [],
  cost: { fixed: 0 },
};

const rangedBow: ItemDefinition = {
  id: "ranged-bow",
  name: { pl: "Łuk", en: "Bow" },
  allowedSlots: ["mainWeapon"],
  tags: ["weapon", "ranged"],
  actions: [
    {
      id: "ranged-attack",
      type: "attack",
      name: { pl: "Atak dystansowy", en: "Ranged attack" },
      attackType: "ranged",
      testStat: "RS",
      damage: 1,
      requiresLineOfSight: true,
    },
  ],
  effects: [],
  restrictions: [],
  cost: { fixed: 0 },
};

const greatAxe: ItemDefinition = {
  id: "great-axe",
  name: { pl: "Wielki topór", en: "Great axe" },
  allowedSlots: ["mainWeapon"],
  tags: ["weapon", "melee", "two-handed"],
  actions: [
    {
      id: "great-axe-attack",
      type: "attack",
      name: { pl: "Atak wielką bronią", en: "Great weapon attack" },
      attackType: "melee",
      testStat: "MS",
      damage: 2,
    },
  ],
  effects: [
    {
      id: "great-axe-dmg",
      type: "modifyDamage",
      target: "meleeAttack",
      value: 1,
      display: { pl: "+1 DMG", en: "+1 DMG" },
    },
    {
      id: "great-axe-offhand-block",
      type: "blockSlot",
      slot: "offhand",
      display: { pl: "Blokuje offhand", en: "Blocks offhand" },
    },
  ],
  restrictions: [
    {
      type: "blockSlot",
      affects: ["offhand"],
      severity: 1,
      display: { pl: "Brak możliwości używania offhandu", en: "Cannot use offhand" },
    },
  ],
  cost: {
    fixed: 0,
    effectLevels: { positive: 1, negative: 1 },
  },
};

const shield: ItemDefinition = {
  id: "shield",
  name: { pl: "Tarcza", en: "Shield" },
  allowedSlots: ["offhand"],
  tags: ["shield", "defensive"],
  actions: [
    {
      id: "shield-block",
      type: "passive",
      name: { pl: "Osłona tarczą", en: "Shield guard" },
    },
  ],
  effects: [
    {
      id: "shield-ac",
      type: "modifyStat",
      stat: "AC",
      value: 1,
      display: { pl: "+1 AC", en: "+1 AC" },
    },
  ],
  restrictions: [],
  cost: { fixed: 0 },
};

const twoWeaponFighting: AbilityDefinition = {
  id: "two-weapon-fighting",
  name: { pl: "Walka dwiema broniami", en: "Two-weapon fighting" },
  level: 1,
  polarity: "positive",
  cost: 100,
  requirements: [
    { type: "mainWeaponAttackType", value: "melee" },
    { type: "offhandAttackType", value: "melee" },
    { type: "slotNotBlocked", value: "offhand" },
  ],
  effects: [
    {
      id: "twf-trigger",
      type: "conditionalModifier",
      trigger: "primaryMeleeAttackMissed",
      result: "grantOffhandAttack",
      display: {
        pl: "Po chybionym ataku głównej broni — atak offhandem",
        en: "After primary melee miss — offhand attack",
      },
    },
  ],
  restrictions: [],
};

const greatWeaponFighting: AbilityDefinition = {
  id: "great-weapon-fighting",
  name: { pl: "Walka wielką bronią", en: "Great weapon fighting" },
  level: 1,
  polarity: "negative",
  cost: -100,
  requirements: [],
  effects: [
    {
      id: "gwf-block-offhand",
      type: "blockSlot",
      slot: "offhand",
      display: { pl: "Blokuje slot offhand", en: "Blocks offhand slot" },
    },
  ],
  restrictions: [
    {
      type: "blockSlot",
      affects: ["offhand"],
      severity: 1,
      display: { pl: "Blokuje slot offhand", en: "Blocks offhand slot" },
    },
  ],
};

const strongBlow: AbilityDefinition = {
  id: "strong-blow",
  name: { pl: "Silny cios", en: "Strong blow" },
  level: 1,
  polarity: "positive",
  cost: 100,
  requirements: [],
  effects: [
    {
      id: "strong-blow-dmg",
      type: "modifyDamage",
      target: "meleeAttack",
      value: 1,
      display: { pl: "+1 DMG ataków melee", en: "+1 DMG to melee attacks" },
    },
  ],
  restrictions: [],
};

const heavyGear: AbilityDefinition = {
  id: "heavy-gear",
  name: { pl: "Ciężki ekwipunek", en: "Heavy gear" },
  level: 1,
  polarity: "negative",
  cost: -100,
  requirements: [],
  effects: [
    {
      id: "heavy-gear-mp",
      type: "modifyStat",
      stat: "MP",
      value: -1,
      display: { pl: "-1 MP", en: "-1 MP" },
    },
  ],
  restrictions: [
    {
      type: "modifyStat",
      affects: ["MP"],
      severity: 1,
      display: { pl: "-1 MP", en: "-1 MP" },
    },
  ],
};

const fragile: AbilityDefinition = {
  id: "fragile",
  name: { pl: "Kruchy", en: "Fragile" },
  level: 1,
  polarity: "negative",
  cost: -100,
  requirements: [],
  effects: [
    {
      id: "fragile-hp",
      type: "modifyStat",
      stat: "HP",
      value: -1,
      display: { pl: "-1 HP", en: "-1 HP" },
    },
  ],
  restrictions: [
    {
      type: "modifyStat",
      affects: ["HP"],
      severity: 1,
      display: { pl: "-1 HP", en: "-1 HP" },
    },
  ],
};

export const DEFAULT_CATALOG: GameCatalog = {
  items: {
    [meleeSword.id]: meleeSword,
    [rangedBow.id]: rangedBow,
    [greatAxe.id]: greatAxe,
    [shield.id]: shield,
  },
  abilities: {
    [twoWeaponFighting.id]: twoWeaponFighting,
    [greatWeaponFighting.id]: greatWeaponFighting,
    [strongBlow.id]: strongBlow,
    [heavyGear.id]: heavyGear,
    [fragile.id]: fragile,
  },
};
