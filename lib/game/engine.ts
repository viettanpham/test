import { BUILDING_DEFS, GEAR_CLASSES, ITEM_MAP } from "./data"
import type {
  BattleLogEntry,
  BattleResult,
  BattleUnitSnapshot,
  Building,
  BuildingKey,
  Gear,
  ItemInstance,
  Resources,
  Sector,
  Stats,
  StatKey,
} from "./types"

const STAT_KEYS: StatKey[] = ["hp", "attack", "defense", "speed", "evasion", "energy"]

/** upgrade level adds 12% of base bonus per level */
export function itemBonus(inst: ItemInstance): Partial<Stats> {
  const def = ITEM_MAP[inst.defId]
  if (!def) return {}
  const mult = 1 + inst.level * 0.12
  const out: Partial<Stats> = {}
  for (const k of STAT_KEYS) {
    const v = def.bonus[k]
    if (v !== undefined) out[k] = Math.round(v * mult)
  }
  return out
}

/** base stats for a gear class at a given level */
export function baseStatsAtLevel(cls: Gear["cls"], level: number): Stats {
  const def = GEAR_CLASSES[cls]
  const out = {} as Stats
  for (const k of STAT_KEYS) {
    out[k] = Math.round(def.base[k] + def.growth[k] * (level - 1))
  }
  return out
}

/** fully-resolved stats including equipped items */
export function computeStats(gear: Gear, inventory: ItemInstance[]): Stats {
  const stats = baseStatsAtLevel(gear.cls, gear.level)
  for (const slot of Object.keys(gear.equipped) as (keyof Gear["equipped"])[]) {
    const uid = gear.equipped[slot]
    if (!uid) continue
    const inst = inventory.find((i) => i.uid === uid)
    if (!inst) continue
    const bonus = itemBonus(inst)
    for (const k of STAT_KEYS) {
      if (bonus[k] !== undefined) stats[k] += bonus[k] as number
    }
  }
  // never below zero
  for (const k of STAT_KEYS) stats[k] = Math.max(0, Math.round(stats[k]))
  return stats
}

/** single combat power rating used for map recommendations */
export function gearPower(stats: Stats): number {
  return Math.round(
    stats.hp * 0.5 +
      stats.attack * 4 +
      stats.defense * 2.5 +
      stats.speed * 2 +
      stats.evasion * 6 +
      stats.energy * 1,
  )
}

export function fleetPower(gears: Gear[], inventory: ItemInstance[]): number {
  return gears.reduce((sum, g) => sum + gearPower(computeStats(g, inventory)), 0)
}

export function maxHp(gear: Gear, inventory: ItemInstance[]): number {
  return computeStats(gear, inventory).hp
}

export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.5))
}

// ---------- Building helpers ----------

export function buildingUpgradeCost(key: BuildingKey, currentLevel: number): Partial<Resources> {
  const def = BUILDING_DEFS[key]
  const scale = Math.pow(def.costScale, currentLevel)
  const out: Partial<Resources> = {}
  for (const [k, v] of Object.entries(def.baseCost)) {
    out[k as keyof Resources] = Math.round((v as number) * scale)
  }
  return out
}

export function dailyProduction(buildings: Record<BuildingKey, number>): Resources {
  return {
    credits: 300 + buildings.command * 120,
    alloy: 60 + buildings.refinery * 55,
    energy: 60 + buildings.reactor * 50,
    crystal: Math.floor((buildings.command + buildings.refinery) / 4) * 5,
  }
}

export function armyCap(buildings: Record<BuildingKey, number>): number {
  return 120 + buildings.barracks * 60
}

export function gearCap(buildings: Record<BuildingKey, number>): number {
  return 4 + buildings.hangar + buildings.shipyard
}

export function baseDefense(buildings: Record<BuildingKey, number>): number {
  return buildings.turret * 260 + buildings.command * 90
}

export function hangarRepairPerDay(buildings: Record<BuildingKey, number>): number {
  return 0.08 + buildings.hangar * 0.05 // fraction of maxHp restored per day
}

// ---------- Battle simulation ----------

function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

type SimUnit = {
  uid: string
  name: string
  cls: Gear["cls"] | "enemy"
  hp: number
  maxHp: number
  attack: number
  defense: number
  speed: number
  evasion: number
  power: number
  isSupport: boolean
}

function snapshot(units: SimUnit[]): BattleUnitSnapshot[] {
  return units.map((u) => ({
    uid: u.uid,
    name: u.name,
    cls: u.cls,
    hp: Math.max(0, Math.round(u.hp)),
    maxHp: u.maxHp,
    power: u.power,
  }))
}

/**
 * Deterministic-ish turn based battle. Player fleet vs a sector garrison.
 * Returns full log + surviving hp so caller can persist durability.
 */
export function simulateBattle(
  gears: Gear[],
  inventory: ItemInstance[],
  sector: Sector,
): BattleResult {
  const rand = rng(Math.floor(sector.threat + gears.length * 7 + Date.now() % 100000))
  const log: BattleLogEntry[] = []

  const playerUnits: SimUnit[] = gears.map((g) => {
    const s = computeStats(g, inventory)
    return {
      uid: g.uid,
      name: g.name,
      cls: g.cls,
      hp: g.hpCurrent,
      maxHp: s.hp,
      attack: s.attack,
      defense: s.defense,
      speed: s.speed,
      evasion: s.evasion,
      power: gearPower(s),
      isSupport: g.cls === "M",
    }
  })

  // build enemy units scaled to the sector
  const enemyCount = sector.kind === "mothership" ? 6 : sector.kind === "base" ? 4 : 3
  const perThreat = sector.threat / enemyCount
  const enemyUnits: SimUnit[] = Array.from({ length: enemyCount }).map((_, i) => {
    const isCore = sector.kind === "mothership" && i === 0
    const hp = Math.round(perThreat * (isCore ? 6 : 3.2))
    return {
      uid: `e${i}`,
      name: isCore
        ? sector.name
        : `${sector.faction} #${i + 1}`,
      cls: "enemy",
      hp,
      maxHp: hp,
      attack: Math.round(perThreat * (isCore ? 1.3 : 0.9)),
      defense: Math.round(perThreat * 0.4),
      speed: 60 + Math.round(rand() * 40),
      evasion: 8 + Math.round(rand() * 14),
      power: Math.round(perThreat * 5),
      isSupport: false,
    }
  })

  log.push({
    turn: 0,
    text: `Tiến vào ${sector.name} — lực lượng ${sector.faction}. Giao chiến bắt đầu!`,
    kind: "info",
  })

  const alive = (u: SimUnit[]) => u.filter((x) => x.hp > 0)
  let turn = 1
  const maxTurns = 40

  while (alive(playerUnits).length > 0 && alive(enemyUnits).length > 0 && turn <= maxTurns) {
    // order all alive units by speed desc
    const all = [...alive(playerUnits), ...alive(enemyUnits)].sort((a, b) => b.speed - a.speed)

    for (const attacker of all) {
      if (attacker.hp <= 0) continue
      const isPlayer = playerUnits.includes(attacker)
      const enemies = isPlayer ? alive(enemyUnits) : alive(playerUnits)
      if (enemies.length === 0) break

      // M-Gear supports instead of attacking
      if (attacker.isSupport && isPlayer) {
        const wounded = alive(playerUnits)
          .filter((u) => u.hp < u.maxHp)
          .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
        const heal = Math.round(attacker.attack * 1.6 + 120)
        if (wounded) {
          wounded.hp = Math.min(wounded.maxHp, wounded.hp + heal)
          log.push({
            turn,
            text: `${attacker.name} (M-Gear) hồi ${heal} HP cho ${wounded.name}.`,
            kind: "player-hit",
          })
        } else {
          // no one wounded: buff = small attack this turn on random enemy
          const target = enemies[Math.floor(rand() * enemies.length)]
          const dmg = Math.round(attacker.attack * 0.8)
          target.hp -= dmg
          log.push({
            turn,
            text: `${attacker.name} khai hỏa hỗ trợ, gây ${dmg} lên ${target.name}.`,
            kind: "player-hit",
          })
        }
        continue
      }

      const target = enemies[Math.floor(rand() * enemies.length)]

      // evasion check
      if (rand() * 100 < target.evasion) {
        log.push({
          turn,
          text: `${target.name} né được đòn của ${attacker.name}!`,
          kind: "info",
        })
        continue
      }

      const crit = rand() < 0.16 + (attacker.cls === "A" ? 0.1 : 0)
      const base = attacker.attack * (crit ? 1.9 : 1)
      const mitig = base * (target.defense / (target.defense + 400))
      let dmg = Math.max(8, Math.round(base - mitig))
      dmg = Math.round(dmg * (0.85 + rand() * 0.3))
      target.hp -= dmg

      log.push({
        turn,
        text: crit
          ? `CHÍ MẠNG! ${attacker.name} nổ ${dmg} sát thương lên ${target.name}.`
          : `${attacker.name} gây ${dmg} lên ${target.name}.`,
        kind: crit ? "crit" : isPlayer ? "player-hit" : "enemy-hit",
      })

      if (target.hp <= 0) {
        log.push({
          turn,
          text: `${target.name} bị phá hủy!`,
          kind: "down",
        })
      }
    }
    turn++
  }

  const victory = alive(enemyUnits).length === 0 && alive(playerUnits).length > 0
  log.push({
    turn,
    text: victory
      ? `CHIẾM ĐƯỢC ${sector.name}! Khu vực đã thuộc quyền kiểm soát.`
      : alive(playerUnits).length === 0
        ? `Hạm đội bị tiêu diệt. Rút lui thất bại tại ${sector.name}.`
        : `Giao tranh bế tắc — hạm đội buộc phải rút lui khỏi ${sector.name}.`,
    kind: victory ? "victory" : "defeat",
  })

  return {
    sectorId: sector.id,
    victory,
    rounds: turn - 1,
    log,
    playerUnits: snapshot(playerUnits),
    enemyUnits: snapshot(enemyUnits),
    reward: victory ? sector.reward : undefined,
    troopReward: victory ? sector.troopReward : undefined,
  }
}
