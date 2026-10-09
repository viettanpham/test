"use client"

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react"
import { BUILDING_ORDER, GEAR_CLASSES, ITEM_MAP, PILOT_PROFILES, SECTORS } from "./data"
import {
  armyCap as calcArmyCap,
  baseStatsAtLevel,
  buildingUpgradeCost,
  dailyProduction,
  gearCap as calcGearCap,
  hangarRepairPerDay,
  maxHp,
  simulateBattle,
  xpForLevel,
} from "./engine"
import type {
  BuildingKey,
  EquipSlot,
  GameState,
  Gear,
  GearClass,
  ItemInstance,
  Resources,
} from "./types"

let uidCounter = 1000
const nextUid = (p: string) => `${p}_${uidCounter++}`

function makeGear(cls: GearClass, name: string, level = 1): Gear {
  const hp = baseStatsAtLevel(cls, level).hp
  return {
    uid: nextUid("g"),
    cls,
    name,
    level,
    xp: 0,
    hpCurrent: hp,
    equipped: {},
  }
}

function makeItem(defId: string, level = 0): ItemInstance {
  return { uid: nextUid("i"), defId, level }
}

function initialBuildings(): Record<BuildingKey, number> {
  return {
    command: 1,
    hangar: 1,
    factory: 1,
    reactor: 2,
    refinery: 2,
    barracks: 1,
    turret: 1,
    shipyard: 1,
  }
}

function createInitialState(): GameState {
  const g1 = makeGear("A", "Vanguard")
  const g2 = makeGear("I", "Falcon")
  const i1 = makeItem("w_pulse")
  const i2 = makeItem("a_plate")
  const i3 = makeItem("e_ion")
  g1.equipped = { weapon: i1.uid, armor: i2.uid }
  g2.equipped = { engine: i3.uid }
  const g3 = makeGear("B", "Hammerfall")
  const g4 = makeGear("M", "Aurora")
  const g5 = makeGear("I", "Wraith")
  const buildings = initialBuildings()

  return {
    commander: "Chỉ Huy",
    day: 1,
    pilot: { profileId: "", name: "Chưa chọn", level: 1, xp: 0, skillPoints: 0, stats: { attack: 0, defense: 0, agility: 0, shield: 0, vision: 0 }, skills: [], avatar: "", aircraftUid: g1.uid, selectedAtDay: 1, hasSelectedPilot: false },
    resources: { credits: 3500, alloy: 1200, energy: 600, crystal: 40 },
    army: 60,
    armyCap: calcArmyCap(buildings),
    gears: [g1, g2, g3, g4, g5],
    inventory: [i1, i2, i3, makeItem("w_pulse"), makeItem("a_plate")],
    buildings,
    sectors: SECTORS.map((s) => ({ ...s })),
    lastBattle: null,
    eventLog: [{ day: 1, text: "Sở chỉ huy được kích hoạt. Chào mừng, Chỉ Huy." }],
  }
}

// ---------- resource helpers ----------

function canAfford(res: Resources, cost: Partial<Resources>): boolean {
  return (Object.keys(cost) as (keyof Resources)[]).every(
    (k) => res[k] >= (cost[k] as number),
  )
}

function spend(res: Resources, cost: Partial<Resources>): Resources {
  const out = { ...res }
  for (const k of Object.keys(cost) as (keyof Resources)[]) {
    out[k] -= cost[k] as number
  }
  return out
}

function gain(res: Resources, add: Partial<Resources>): Resources {
  const out = { ...res }
  for (const k of Object.keys(add) as (keyof Resources)[]) {
    out[k] += add[k] as number
  }
  return out
}

function pushEvent(state: GameState, text: string): GameState["eventLog"] {
  return [{ day: state.day, text }, ...state.eventLog].slice(0, 40)
}

// ---------- actions ----------

export type Action =
  | { type: "SET_COMMANDER"; name: string }
  | { type: "NEXT_DAY" }
  | { type: "BUILD_GEAR"; cls: GearClass; name: string }
  | { type: "REPAIR_GEAR"; uid: string }
  | { type: "REPAIR_ALL" }
  | { type: "RENAME_GEAR"; uid: string; name: string }
  | { type: "BUY_ITEM"; defId: string }
  | { type: "UPGRADE_ITEM"; uid: string }
  | { type: "EQUIP_ITEM"; gearUid: string; itemUid: string }
  | { type: "UNEQUIP_SLOT"; gearUid: string; slot: EquipSlot }
  | { type: "UPGRADE_BUILDING"; key: BuildingKey }
  | { type: "LAUNCH_BATTLE"; sectorId: string; gearUids: string[] }
  | { type: "UPGRADE_MAIN_BASE"; sectorId: string }
  | { type: "GARRISON_MAIN_BASE"; sectorId: string; amount: number }
  | { type: "DISMISS_BATTLE" }
  | { type: "ALLOCATE_PILOT_STAT"; stat: import("./types").PilotStatKey }
  | { type: "UPGRADE_PILOT_SKILL"; skillId: string }
  | { type: "SELECT_PILOT"; profileId: string }

const REPAIR_CREDIT_PER_HP = 0.4

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_COMMANDER":
      return { ...state, commander: action.name.trim() || "Chỉ Huy" }

    case "NEXT_DAY": {
      const prod = dailyProduction(state.buildings)
      const repairFrac = hangarRepairPerDay(state.buildings)
      const gears = state.gears.map((g) => {
        const mh = maxHp(g, state.inventory)
        return { ...g, hpCurrent: Math.min(mh, g.hpCurrent + Math.round(mh * repairFrac)) }
      })
      return {
        ...state,
        day: state.day + 1,
        resources: gain(state.resources, prod),
        gears,
        eventLog: pushEvent(
          { ...state, day: state.day + 1 },
          `Ngày mới: +${prod.credits}⬡ +${prod.alloy}◆ +${prod.energy}⚡. Hangar sửa chữa hạm đội.`,
        ),
      }
    }

    case "BUILD_GEAR": {
      const def = GEAR_CLASSES[action.cls]
      const discount = 1 - Math.min(0.4, state.buildings.shipyard * 0.05)
      const cost: Partial<Resources> = {}
      for (const [k, v] of Object.entries(def.buildCost)) {
        cost[k as keyof Resources] = Math.round((v as number) * discount)
      }
      if (state.gears.length >= calcGearCap(state.buildings)) return state
      if (!canAfford(state.resources, cost)) return state
      const g = makeGear(action.cls, action.name.trim() || def.name)
      return {
        ...state,
        resources: spend(state.resources, cost),
        gears: [...state.gears, g],
        eventLog: pushEvent(state, `Đóng mới ${def.name} "${g.name}" tại xưởng đóng tàu.`),
      }
    }

    case "REPAIR_GEAR": {
      const g = state.gears.find((x) => x.uid === action.uid)
      if (!g) return state
      const mh = maxHp(g, state.inventory)
      const missing = mh - g.hpCurrent
      if (missing <= 0) return state
      const cost = { credits: Math.ceil(missing * REPAIR_CREDIT_PER_HP) }
      if (!canAfford(state.resources, cost)) return state
      return {
        ...state,
        resources: spend(state.resources, cost),
        gears: state.gears.map((x) => (x.uid === g.uid ? { ...x, hpCurrent: mh } : x)),
        eventLog: pushEvent(state, `Sửa chữa ${g.name} về full HP (-${cost.credits}⬡).`),
      }
    }

    case "REPAIR_ALL": {
      let missingTotal = 0
      for (const g of state.gears) missingTotal += maxHp(g, state.inventory) - g.hpCurrent
      if (missingTotal <= 0) return state
      const cost = { credits: Math.ceil(missingTotal * REPAIR_CREDIT_PER_HP) }
      if (!canAfford(state.resources, cost)) return state
      return {
        ...state,
        resources: spend(state.resources, cost),
        gears: state.gears.map((g) => ({ ...g, hpCurrent: maxHp(g, state.inventory) })),
        eventLog: pushEvent(state, `Sửa chữa toàn hạm đội (-${cost.credits}⬡).`),
      }
    }

    case "RENAME_GEAR":
      return {
        ...state,
        gears: state.gears.map((g) =>
          g.uid === action.uid ? { ...g, name: action.name.trim() || g.name } : g,
        ),
      }

    case "BUY_ITEM": {
      const def = ITEM_MAP[action.defId]
      if (!def) return state
      const discount = 1 - Math.min(0.4, state.buildings.factory * 0.05)
      const cost: Partial<Resources> = {}
      for (const [k, v] of Object.entries(def.cost)) {
        cost[k as keyof Resources] = Math.round((v as number) * discount)
      }
      if (!canAfford(state.resources, cost)) return state
      const inst = makeItem(def.id)
      return {
        ...state,
        resources: spend(state.resources, cost),
        inventory: [...state.inventory, inst],
        eventLog: pushEvent(state, `Chế tạo ${def.name}.`),
      }
    }

    case "UPGRADE_ITEM": {
      const inst = state.inventory.find((i) => i.uid === action.uid)
      if (!inst) return state
      const def = ITEM_MAP[inst.defId]
      if (!def || inst.level >= 10) return state
      const base = def.cost.credits ?? 500
      const cost = {
        credits: Math.round(base * 0.6 * (inst.level + 1)),
        crystal: 5 * (inst.level + 1),
      }
      if (!canAfford(state.resources, cost)) return state
      return {
        ...state,
        resources: spend(state.resources, cost),
        inventory: state.inventory.map((i) =>
          i.uid === inst.uid ? { ...i, level: i.level + 1 } : i,
        ),
        eventLog: pushEvent(state, `Nâng cấp ${def.name} lên +${inst.level + 1}.`),
      }
    }

    case "EQUIP_ITEM": {
      const gear = state.gears.find((g) => g.uid === action.gearUid)
      const inst = state.inventory.find((i) => i.uid === action.itemUid)
      if (!gear || !inst) return state
      const def = ITEM_MAP[inst.defId]
      if (!def) return state
      // unequip this item from any other gear first
      const gears = state.gears.map((g) => {
        const eq = { ...g.equipped }
        for (const s of Object.keys(eq) as EquipSlot[]) {
          if (eq[s] === inst.uid) delete eq[s]
        }
        if (g.uid === gear.uid) eq[def.slot] = inst.uid
        return { ...g, equipped: eq }
      })
      // recompute durability cap
      const fixed = gears.map((g) => ({
        ...g,
        hpCurrent: Math.min(g.hpCurrent, maxHp(g, state.inventory)),
      }))
      return { ...state, gears: fixed }
    }

    case "UNEQUIP_SLOT": {
      const gears = state.gears.map((g) => {
        if (g.uid !== action.gearUid) return g
        const eq = { ...g.equipped }
        delete eq[action.slot]
        return { ...g, equipped: eq }
      })
      return { ...state, gears }
    }

    case "UPGRADE_BUILDING": {
      const level = state.buildings[action.key]
      const cost = buildingUpgradeCost(action.key, level)
      // command gates other buildings
      if (action.key !== "command" && level >= state.buildings.command + 2) return state
      if (!canAfford(state.resources, cost)) return state
      const buildings = { ...state.buildings, [action.key]: level + 1 }
      return {
        ...state,
        resources: spend(state.resources, cost),
        buildings,
        armyCap: calcArmyCap(buildings),
        eventLog: pushEvent(state, `Nâng cấp công trình lên cấp ${level + 1}.`),
      }
    }

    case "LAUNCH_BATTLE": {
      const sector = state.sectors.find((s) => s.id === action.sectorId)
      if (!sector || sector.captured) return state
      const fleet = state.gears.filter((g) => action.gearUids.includes(g.uid))
      if (fleet.length === 0) return state
      const result = simulateBattle(fleet, state.inventory, sector)

      // apply surviving durability
      const hpByUid = new Map(result.playerUnits.map((u) => [u.uid, u.hp]))
      let gears = state.gears.map((g) =>
        hpByUid.has(g.uid) ? { ...g, hpCurrent: hpByUid.get(g.uid)! } : g,
      )

      let resources = state.resources
      let sectors = state.sectors
      let army = state.army
      let events = state.eventLog

      if (result.victory) {
        resources = gain(resources, sector.reward)
        sectors = state.sectors.map((s) =>
          s.id === sector.id ? { ...s, captured: true } : s,
        )
        army = Math.min(state.armyCap, army + sector.troopReward)
        // XP for survivors
        const xpGain = Math.round(sector.threat / 3)
        gears = gears.map((g) => {
          if (!action.gearUids.includes(g.uid) || g.hpCurrent <= 0) return g
          let xp = g.xp + xpGain
          let level = g.level
          while (xp >= xpForLevel(level)) {
            xp -= xpForLevel(level)
            level += 1
          }
          return { ...g, xp, level }
        })
        events = pushEvent(
          state,
          `Chiếm được ${sector.name}! +${sector.reward.credits ?? 0}⬡, +${sector.troopReward} quân.`,
        )
      } else {
        events = pushEvent(state, `Thất bại tại ${sector.name}. Hạm đội chịu tổn thất.`)
      }

      return {
        ...state,
        gears,
        resources,
        sectors,
        army,
        lastBattle: result,
        eventLog: events,
      }
    }

    case "UPGRADE_MAIN_BASE": {
      const sector = state.sectors.find((s) => s.id === action.sectorId)
      if (!sector?.isMainBase || !sector.captured) return state
      const level = sector.baseLevel ?? 1
      const cost = { credits: 1800 * level, alloy: 700 * level, crystal: 18 * level }
      if (!canAfford(state.resources, cost)) return state
      const sectors = state.sectors.map((s) => s.id === sector.id
        ? { ...s, baseLevel: level + 1, baseCapacity: (s.baseCapacity ?? 120) + 40, baseBuildings: (s.baseBuildings ?? 1) + 1 }
        : s)
      return { ...state, resources: spend(state.resources, cost), sectors, eventLog: pushEvent(state, `Nâng cấp ${sector.name} lên cấp ${level + 1}.`) }
    }

    case "GARRISON_MAIN_BASE": {
      const sector = state.sectors.find((s) => s.id === action.sectorId)
      if (!sector?.isMainBase || !sector.captured) return state
      const current = sector.baseGarrison ?? 0
      const cap = sector.baseCapacity ?? 120
      const amount = Math.max(0, Math.min(action.amount, state.army, cap - current))
      if (!amount) return state
      const sectors = state.sectors.map((s) => s.id === sector.id ? { ...s, baseGarrison: current + amount } : s)
      return { ...state, army: state.army - amount, sectors, eventLog: pushEvent(state, `Điều ${amount} quân đến đồn trú tại ${sector.name}.`) }
    }

    case "ALLOCATE_PILOT_STAT":
      if (state.pilot.skillPoints <= 0) return state
      return { ...state, pilot: { ...state.pilot, skillPoints: state.pilot.skillPoints - 1, stats: { ...state.pilot.stats, [action.stat]: state.pilot.stats[action.stat] + 1 } } }

    case "UPGRADE_PILOT_SKILL": {
      const skill = state.pilot.skills.find((s) => s.id === action.skillId)
      if (!skill || state.pilot.skillPoints <= 0 || skill.level >= skill.maxLevel) return state
      return { ...state, pilot: { ...state.pilot, skillPoints: state.pilot.skillPoints - 1, skills: state.pilot.skills.map((s) => s.id === skill.id ? { ...s, level: s.level + 1 } : s) }, eventLog: pushEvent(state, `Nâng cấp kỹ năng ${skill.name} lên cấp ${skill.level + 1}.`) }
    }

    case "SELECT_PILOT": {
      const profile = PILOT_PROFILES.find((p) => p.id === action.profileId)
      if (!profile || (state.pilot.hasSelectedPilot && profile.id === state.pilot.profileId) || (state.pilot.hasSelectedPilot && state.day - state.pilot.selectedAtDay < 10)) return state
      const aircraft = state.gears.find((g) => g.cls === profile.gear)
      if (!aircraft) return state
      return { ...state, pilot: { ...state.pilot, profileId: profile.id, name: profile.name, stats: { ...profile.baseStats }, skills: profile.skills.map((s) => ({ ...s })), avatar: profile.avatar, aircraftUid: aircraft.uid, selectedAtDay: state.day, hasSelectedPilot: true }, eventLog: pushEvent(state, `Đổi phi công sang ${profile.name}. Kỹ năng và phi cơ liên kết đã kích hoạt.`) }
    }

    case "DISMISS_BATTLE":
      return { ...state, lastBattle: null }

    default:
      return state
  }
}

type Ctx = {
  state: GameState
  dispatch: React.Dispatch<Action>
}

const GameContext = createContext<Ctx | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error("useGame must be used within GameProvider")
  return ctx
}

export { BUILDING_ORDER }
