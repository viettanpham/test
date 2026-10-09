export type GearClass = "A" | "B" | "I" | "M"

export type StatKey = "hp" | "attack" | "defense" | "speed" | "evasion" | "energy"

export type Stats = Record<StatKey, number>

export type PilotStatKey = "attack" | "defense" | "agility" | "shield" | "vision"
export type PilotStats = Record<PilotStatKey, number>

export type PilotSkill = {
  id: string
  name: string
  desc: string
  level: number
  maxLevel: number
  effect: string
  category: "common" | "gear"
}

export type PilotProfile = {
  id: string
  name: string
  age: number
  gender: string
  description: string
  specialty: string
  gear: GearClass
  avatar: string
  aircraftName: string
  armorType: string
  baseStats: PilotStats
  trail: string[]
  skills: PilotSkill[]
}

export type Pilot = {
  profileId: string
  name: string
  level: number
  xp: number
  skillPoints: number
  stats: PilotStats
  skills: PilotSkill[]
  avatar: string
  aircraftUid: string
  selectedAtDay: number
  /** Day-one accounts must explicitly choose a pilot before the linked gear is active. */
  hasSelectedPilot: boolean
}

export type Resources = {
  credits: number
  alloy: number
  energy: number
  crystal: number
}

export type ResourceKey = keyof Resources

export type EquipSlot = "weapon" | "missile" | "armor" | "engine" | "shield"

export type Rarity = "common" | "rare" | "epic" | "legendary"

export type ItemDef = {
  id: string
  name: string
  slot: EquipSlot
  rarity: Rarity
  /** flat stat bonuses granted while equipped */
  bonus: Partial<Stats>
  /** shop / craft cost */
  cost: Partial<Resources>
  desc: string
}

export type ItemInstance = {
  uid: string
  defId: string
  /** upgrade level 0..N, each level scales bonus */
  level: number
}

export type GearClassDef = {
  cls: GearClass
  name: string
  role: string
  color: string
  tagline: string
  /** base stats at level 1 */
  base: Stats
  /** per-level growth */
  growth: Stats
  /** default loadout hint */
  strengths: string[]
  buildCost: Partial<Resources>
}

export type Gear = {
  uid: string
  cls: GearClass
  name: string
  level: number
  xp: number
  /** current durability out of max hp (persisted between battles) */
  hpCurrent: number
  equipped: Partial<Record<EquipSlot, string>> // slot -> item uid
}

export type BuildingKey =
  | "command"
  | "hangar"
  | "factory"
  | "reactor"
  | "refinery"
  | "barracks"
  | "turret"
  | "shipyard"
  | "finance"
  | "alliance"
  | "residential"
  | "trade"
  | "entertainment"

export type DistrictKey = "finance" | "service" | "industry" | "power" | "repair" | "shipbuilding"

/** percent of population assigned to each district (step 5, min 5, total <= 100) */
export type DistrictAllocation = Record<DistrictKey, number>

export type DistrictBonus = {
  credits: number
  crystal: number
  alloy: number
  energy: number
  /** flat HP restored per gear per day */
  repairHp: number
  /** flat reduction applied to every gear build cost component */
  shipDiscount: number
  gearCap: number
}

export type BuildingDef = {
  key: BuildingKey
  name: string
  desc: string
  /** what stat/output this building drives */
  effect: string
  maxLevel: number
  baseCost: Partial<Resources>
  /** multiplier applied to cost per level */
  costScale: number
}

export type Building = {
  key: BuildingKey
  level: number
}

export type SectorKind = "outpost" | "base" | "mothership"

export type Sector = {
  id: string
  name: string
  kind: SectorKind
  isMainBase?: boolean
  baseLevel?: number
  baseGarrison?: number
  baseCapacity?: number
  baseBuildings?: number
  x: number // 0..100 map coords
  y: number
  /** enemy defensive power rating */
  threat: number
  /** enemy garrison size */
  garrison: number
  /** rewards on capture */
  reward: Partial<Resources>
  /** troops gained on capture (adds to army cap usage) */
  troopReward: number
  captured: boolean
  /** required min fleet power suggestion */
  recommendedPower: number
  faction: string
}

export type BattleSide = "player" | "enemy"

export type BattleUnitSnapshot = {
  uid: string
  name: string
  cls: GearClass | "enemy"
  hp: number
  maxHp: number
  power: number
}

export type BattleLogEntry = {
  turn: number
  text: string
  kind: "info" | "player-hit" | "enemy-hit" | "crit" | "down" | "victory" | "defeat"
}

export type BattleResult = {
  sectorId: string
  victory: boolean
  rounds: number
  log: BattleLogEntry[]
  playerUnits: BattleUnitSnapshot[]
  enemyUnits: BattleUnitSnapshot[]
  reward?: Partial<Resources>
  troopReward?: number
}

export type GameState = {
  commander: string
  day: number
  pilot: Pilot
  resources: Resources
  army: number // current troop count
  armyCap: number
  gears: Gear[]
  inventory: ItemInstance[]
  buildings: Record<BuildingKey, number> // key -> level
  population: number
  districts: DistrictAllocation
  sectors: Sector[]
  lastBattle: BattleResult | null
  eventLog: { day: number; text: string }[]
}
