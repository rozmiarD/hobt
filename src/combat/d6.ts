export function testD6(stat: number, roll: number): boolean {
  if (roll === 1) {
    return true;
  }
  if (roll === 6) {
    return false;
  }
  return roll <= stat;
}

export type AttackOutcome = "miss" | "blocked" | "damage";

export interface AttackContext {
  attackType: "melee" | "ranged";
  attackerMS: number;
  attackerRS: number;
  defenderAC: number;
  damage: number;
  hasLineOfSight: boolean;
  attackRoll: number;
  armorRoll: number;
}

export interface AttackResult {
  allowed: boolean;
  attackSuccess: boolean;
  armorTested: boolean;
  armorSuccess: boolean;
  outcome: AttackOutcome;
  damageDealt: number;
}

export function resolveAttack(context: AttackContext): AttackResult {
  if (context.attackType === "ranged" && !context.hasLineOfSight) {
    return {
      allowed: false,
      attackSuccess: false,
      armorTested: false,
      armorSuccess: false,
      outcome: "miss",
      damageDealt: 0,
    };
  }

  const testStat =
    context.attackType === "melee" ? context.attackerMS : context.attackerRS;
  const attackSuccess = testD6(testStat, context.attackRoll);

  if (!attackSuccess) {
    return {
      allowed: true,
      attackSuccess: false,
      armorTested: false,
      armorSuccess: false,
      outcome: "miss",
      damageDealt: 0,
    };
  }

  const armorSuccess = testD6(context.defenderAC, context.armorRoll);
  if (armorSuccess) {
    return {
      allowed: true,
      attackSuccess: true,
      armorTested: true,
      armorSuccess: true,
      outcome: "blocked",
      damageDealt: 0,
    };
  }

  return {
    allowed: true,
    attackSuccess: true,
    armorTested: true,
    armorSuccess: false,
    outcome: "damage",
    damageDealt: context.damage,
  };
}

export interface DualWieldContext {
  primaryMeleeHit: boolean;
  hasTwoWeaponFighting: boolean;
  offhandIsMeleeWeapon: boolean;
  offhandBlocked: boolean;
}

export function canPerformOffhandAttack(context: DualWieldContext): boolean {
  if (!context.hasTwoWeaponFighting) {
    return false;
  }
  if (context.offhandBlocked) {
    return false;
  }
  if (!context.offhandIsMeleeWeapon) {
    return false;
  }
  if (context.primaryMeleeHit) {
    return false;
  }
  return true;
}
