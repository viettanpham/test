import { BUILDING_DEFS, GEAR_CLASSES, ITEM_MAP } from "./data"
import type {
  BattleLogEntry,
  BattleResult,
  BattleUnitSnapshot,
  Building,
  BuildingKey,
  DistrictAllocation,
  DistrictBonus,
  DistrictKey,
  Gear,
  ItemInstance,
  Pilot,
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

/** production from core infrastructure (command, refinery, reactor) */
export function coreProduction(buildings: Record<BuildingKey, number>): Resources {
  return {
    credits: 300 + buildings.command * 120,
    alloy: 60 + buildings.refinery * 55,
    energy: 60 + buildings.reactor * 50,
    crystal: Math.floor((buildings.command + buildings.refinery) / 4) * 5,
  }
}

/** production from civic buildings (finance, residential, trade, entertainment) */
export function civicProduction(buildings: Record<BuildingKey, number>): Resources {
  return {
    credits:
      (buildings.finance ?? 0) * 250 +
      (buildings.residential ?? 0) * 100 +
      (buildings.trade ?? 0) * 400 +
      (buildings.entertainment ?? 0) * 500,
    alloy: (buildings.trade ?? 0) * 40,
    energy: 0,
    crystal: (buildings.trade ?? 0) * 1,
  }
}

export const POP_PER_UNIT = 100

export function districtPopulation(population: number, pct: number): number {
  return Math.floor((population * pct) / 100)
}

export function districtBonus(population: number, districts?: DistrictAllocation): DistrictBonus {
  const units = (k: DistrictKey) =>
    districts ? Math.floor(districtPopulation(population, districts[k]) / POP_PER_UNIT) : 0
  return {
    credits: units("finance") * 50,
    crystal: units("service") * 1,
    alloy: units("industry") * 5,
    energy: units("power") * 10,
    repairHp: units("repair") * 1000,
    shipDiscount: units("shipbuilding") * 100,
    gearCap: units("shipbuilding") * 1,
  }
}

export function dailyProduction(
  buildings: Record<BuildingKey, number>,
  population = 0,
  districts?: DistrictAllocation,
): Resources {
  const core = coreProduction(buildings)
  const civic = civicProduction(buildings)
  const d = districtBonus(population, districts)
  return {
    credits: core.credits + civic.credits + d.credits,
    alloy: core.alloy + civic.alloy + d.alloy,
    energy: core.energy + civic.energy + d.energy,
    crystal: core.crystal + civic.crystal + d.crystal,
  }
}

export function armyCap(buildings: Record<BuildingKey, number>): number {
  return 120 + buildings.barracks * 60 + (buildings.residential ?? 0) * 60
}

export function gearCap(
  buildings: Record<BuildingKey, number>,
  population = 0,
  districts?: DistrictAllocation,
): number {
  return (
    4 +
    buildings.hangar +
    buildings.shipyard +
    (buildings.alliance ?? 0) +
    districtBonus(population, districts).gearCap
  )
}

/** gear build cost after shipyard % discount and shipbuilding district flat discount (floor 10%) */
export function gearBuildCost(
  base: Partial<Resources>,
  buildings: Record<BuildingKey, number>,
  population = 0,
  districts?: DistrictAllocation,
): Partial<Resources> {
  const pct = 1 - Math.min(0.4, buildings.shipyard * 0.05)
  const flat = districtBonus(population, districts).shipDiscount
  const out: Partial<Resources> = {}
  for (const [k, v] of Object.entries(base)) {
    const original = v as number
    out[k as keyof Resources] = Math.max(Math.round(original * 0.1), Math.round(original * pct) - flat)
  }
  return out
}

export function populationGrowthRate(buildings: Record<BuildingKey, number>): number {
  return 0.05 + (buildings.residential ?? 0) * 0.005
}

/** immigrants received when capturing a sector: 10% of enemy HP destroyed, clamped 100..100,000 */
export function captureImmigrants(enemyHpDamage: number): number {
  return Math.max(100, Math.min(100_000, Math.floor(enemyHpDamage * 0.1)))
}

export function prosperity(
  population: number,
  buildings: Record<BuildingKey, number>,
  capturedCount: number,
): number {
  const civic =
    (buildings.finance ?? 0) +
    (buildings.residential ?? 0) +
    (buildings.trade ?? 0) +
    (buildings.entertainment ?? 0)
  return Math.round(population / 5000 + civic * 3 + capturedCount * 5)
}

export function prosperityTier(score: number): string {
  if (score >= 300) return "Thịnh vượng"
  if (score >= 150) return "Phồn hoa"
  if (score >= 60) return "Ổn định"
  return "Sơ khai"
}

// ---------- Pilot helpers ----------

/** flat bonuses the linked pilot grants their personal aircraft */
export function pilotAircraftBonus(pilot: Pilot): { attack: number; defense: number; shieldHp: number } {
  if (!pilot.hasSelectedPilot) return { attack: 0, defense: 0, shieldHp: 0 }
  const s = pilot.stats
  return {
    attack: s.attack * 30 + s.agility * 10 + s.vision * 10,
    defense: s.defense * 10 + s.agility * 5 + s.vision * 5,
    shieldHp: s.shield * 200,
  }
}

export function pilotAircraftStats(gear: Gear, inventory: ItemInstance[], pilot: Pilot): Stats {
  const stats = computeStats(gear, inventory)
  if (!pilot.hasSelectedPilot || pilot.aircraftUid !== gear.uid) return stats
  const b = pilotAircraftBonus(pilot)
  return { ...stats, attack: stats.attack + b.attack, defense: stats.defense + b.defense }
}

export function fleetPowerWithPilot(gears: Gear[], inventory: ItemInstance[], pilot: Pilot): number {
  const shield = pilotAircraftBonus(pilot).shieldHp
  return gears.reduce((sum, g) => {
    const isPilot = pilot.hasSelectedPilot && g.uid === pilot.aircraftUid
    return sum + gearPower(pilotAircraftStats(g, inventory, pilot)) + (isPilot ? Math.round(shield * 0.5) : 0)
  }, 0)
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
  /** absorbs damage before hp; does not persist after battle */
  shield: number
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
  pilot?: Pilot,
): BattleResult {
  const rand = rng(Math.floor(sector.threat + gears.length * 7 + Date.now() % 100000))
  const log: BattleLogEntry[] = []
  const pilotUid = pilot?.hasSelectedPilot ? pilot.aircraftUid : null
  const pilotShield = pilot ? pilotAircraftBonus(pilot).shieldHp : 0

  const playerUnits: SimUnit[] = gears.map((g) => {
    const isPilot = g.uid === pilotUid
    const s = isPilot && pilot ? pilotAircraftStats(g, inventory, pilot) : computeStats(g, inventory)
    return {
      uid: g.uid,
      name: isPilot && pilot ? `${pilot.name} · ${g.name}` : g.name,
      cls: g.cls,
      hp: g.hpCurrent,
      shield: isPilot ? pilotShield : 0,
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
      shield: 0,
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
  const leader = playerUnits.find((u) => u.uid === pilotUid)
  if (leader) {
    log.push({
      turn: 0,
      text: `Phi công ${leader.name} dẫn đầu hạm đội${pilotShield ? ` (khiên ${pilotShield} HP)` : ""}.`,
      kind: "info",
    })
  }

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
      const absorbed = Math.min(target.shield, dmg)
      target.shield -= absorbed
      target.hp -= dmg - absorbed

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
