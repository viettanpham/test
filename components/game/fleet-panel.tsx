"use client"

import { Button } from "@/components/ui/button"
import { GEAR_CLASSES, GEAR_ORDER, ITEM_MAP } from "@/lib/game/data"
import {
  computeStats,
  gearCap,
  gearPower,
  itemBonus,
  maxHp,
  xpForLevel,
} from "@/lib/game/engine"
import { useGame } from "@/lib/game/store"
import { cn } from "@/lib/utils"
import { Hammer, Pencil, Plus, Wrench } from "lucide-react"
import { useMemo, useState } from "react"
import {
  GEAR_COLOR_VAR,
  Panel,
  ResourcePill,
  StatBar,
  formatNum,
} from "./shared"
import type { EquipSlot, GearClass, StatKey } from "@/lib/game/types"

const SLOTS: { slot: EquipSlot; label: string }[] = [
  { slot: "weapon", label: "Vũ khí chính" },
  { slot: "missile", label: "Tên lửa" },
  { slot: "armor", label: "Giáp" },
  { slot: "engine", label: "Động cơ" },
  { slot: "shield", label: "Khiên" },
]

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  speed: "SPD",
  evasion: "EVA",
  energy: "EN",
}

const STAT_MAX: Record<StatKey, number> = {
  hp: 6000,
  attack: 700,
  defense: 500,
  speed: 260,
  evasion: 90,
  energy: 400,
}

export function FleetPanel() {
  const { state, dispatch } = useGame()
  const [selectedUid, setSelectedUid] = useState<string>(state.gears[0]?.uid ?? "")
  const [buildCls, setBuildCls] = useState<GearClass>("A")
  const [buildName, setBuildName] = useState("")

  const selected = state.gears.find((g) => g.uid === selectedUid) ?? state.gears[0]
  const cap = gearCap(state.buildings, state.population, state.districts)

  // map item uid -> gear name it's equipped on
  const equippedOn = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of state.gears) {
      for (const uid of Object.values(g.equipped)) {
        if (uid) m.set(uid, g.name)
      }
    }
    return m
  }, [state.gears])

  const buildDef = GEAR_CLASSES[buildCls]
  const shipyardDiscount = 1 - Math.min(0.4, state.buildings.shipyard * 0.05)

  return (
    <div className="flex flex-col gap-4">
      {/* Build bay */}
      <Panel title="Xưởng đóng tàu" icon={<Hammer className="size-4" />}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            {GEAR_ORDER.map((cls) => {
              const def = GEAR_CLASSES[cls]
              const active = buildCls === cls
              return (
                <button
                  key={cls}
                  onClick={() => setBuildCls(cls)}
                  className={cn(
                    "flex flex-col gap-1 border p-2.5 text-left transition-colors",
                    active ? "bg-card" : "border-border/50 bg-card/30 hover:bg-card/60",
                  )}
                  style={active ? { borderColor: GEAR_COLOR_VAR[cls] } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex size-7 items-center justify-center border font-display text-sm font-900"
                      style={{
                        color: GEAR_COLOR_VAR[cls],
                        borderColor: GEAR_COLOR_VAR[cls],
                      }}
                    >
                      {cls}
                    </span>
                    <span className="font-display text-xs font-700">{def.name}</span>
                  </div>
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {def.role}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 lg:w-72">
            <p className="text-xs text-muted-foreground text-pretty">{buildDef.tagline}</p>
            <input
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              placeholder={`Đặt tên ${buildDef.name}...`}
              className="rounded-sm border border-input bg-input/40 px-2.5 py-1.5 text-sm outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {Object.entries(buildDef.buildCost).map(([k, v]) => (
                  <ResourcePill
                    key={k}
                    k={k as never}
                    amount={state.resources[k as never]}
                    cost={Math.round((v as number) * shipyardDiscount)}
                  />
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => {
                  dispatch({ type: "BUILD_GEAR", cls: buildCls, name: buildName })
                  setBuildName("")
                }}
                disabled={state.gears.length >= cap}
              >
                <Plus className="size-3.5" />
                Đóng tàu
              </Button>
            </div>
            <p className="text-right text-[10px] text-muted-foreground">
              Hạm đội: {state.gears.length}/{cap} (nâng Hangar & Xưởng để mở rộng)
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Gear list */}
        <Panel title="Phi thuyền" icon={<Plus className="size-4" />} bodyClassName="p-2">
          <ul className="flex flex-col gap-1.5">
            {state.gears.map((g) => {
              const stats = computeStats(g, state.inventory)
              const hpPct = (g.hpCurrent / stats.hp) * 100
              const active = g.uid === selected?.uid
              return (
                <li key={g.uid}>
                  <button
                    onClick={() => setSelectedUid(g.uid)}
                    className={cn(
                      "flex w-full items-center gap-2.5 border p-2 text-left transition-colors",
                      active
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/50 bg-card/30 hover:bg-card/60",
                    )}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center border font-display text-sm font-900"
                      style={{ color: GEAR_COLOR_VAR[g.cls], borderColor: GEAR_COLOR_VAR[g.cls] }}
                    >
                      {g.cls}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-600">{g.name}</div>
                      <div className="mt-0.5 h-1 overflow-hidden rounded-sm bg-secondary/60">
                        <div
                          className="h-full"
                          style={{
                            width: `${hpPct}%`,
                            backgroundColor:
                              hpPct > 50 ? "var(--color-gear-m)" : "var(--color-destructive)",
                          }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">Lv{g.level}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>

        {/* Detail */}
        {selected && <GearDetail key={selected.uid} uid={selected.uid} equippedOn={equippedOn} />}
      </div>
    </div>
  )
}

function GearDetail({
  uid,
  equippedOn,
}: {
  uid: string
  equippedOn: Map<string, string>
}) {
  const { state, dispatch } = useGame()
  const gear = state.gears.find((g) => g.uid === uid)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(gear?.name ?? "")

  if (!gear) return null
  const def = GEAR_CLASSES[gear.cls]
  const stats = computeStats(gear, state.inventory)
  const mh = maxHp(gear, state.inventory)
  const missing = mh - gear.hpCurrent
  const repairCost = Math.ceil(missing * 0.4)
  const xpNeed = xpForLevel(gear.level)

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <span style={{ color: GEAR_COLOR_VAR[gear.cls] }}>{def.name}</span>
          <span className="text-muted-foreground">/ {def.role}</span>
        </span>
      }
      action={
        <div className="flex items-center gap-1.5">
          <Button
            size="xs"
            variant="secondary"
            disabled={missing <= 0 || state.resources.credits < repairCost}
            onClick={() => dispatch({ type: "REPAIR_GEAR", uid: gear.uid })}
          >
            <Wrench className="size-3" />
            Sửa {missing > 0 ? `(${formatNum(repairCost)}⬡)` : ""}
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: identity + stats */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-14 items-center justify-center border-2 font-display text-2xl font-900 clip-corner"
              style={{
                color: GEAR_COLOR_VAR[gear.cls],
                borderColor: GEAR_COLOR_VAR[gear.cls],
                backgroundColor: `color-mix(in oklch, ${GEAR_COLOR_VAR[gear.cls]} 12%, transparent)`,
              }}
            >
              {gear.cls}
            </div>
            <div className="min-w-0 flex-1">
              {renaming ? (
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => {
                    dispatch({ type: "RENAME_GEAR", uid: gear.uid, name })
                    setRenaming(false)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      dispatch({ type: "RENAME_GEAR", uid: gear.uid, name })
                      setRenaming(false)
                    }
                  }}
                  className="w-full rounded-sm border border-input bg-input/40 px-2 py-1 font-display text-lg outline-none focus:border-primary"
                />
              ) : (
                <button
                  className="flex items-center gap-2 font-display text-lg font-700 hover:text-primary"
                  onClick={() => {
                    setName(gear.name)
                    setRenaming(true)
                  }}
                >
                  {gear.name}
                  <Pencil className="size-3 text-muted-foreground" />
                </button>
              )}
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>Cấp {gear.level}</span>
                <span className="font-mono text-primary/80">
                  PWR {formatNum(gearPower(stats))}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-secondary/60">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${Math.min(100, (gear.xp / xpNeed) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  XP {formatNum(gear.xp)}/{formatNum(xpNeed)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
              <StatBar
                key={k}
                label={STAT_LABELS[k]}
                value={stats[k]}
                max={STAT_MAX[k]}
                color={GEAR_COLOR_VAR[gear.cls]}
              />
            ))}
          </div>

          <div className="border border-border/50 bg-card/30 p-2.5">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              Sở trường
            </div>
            <ul className="flex flex-col gap-0.5 text-xs text-foreground/80">
              {def.strengths.map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span
                    className="size-1 rounded-full"
                    style={{ backgroundColor: GEAR_COLOR_VAR[gear.cls] }}
                  />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: equipment slots */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Trang bị
          </div>
          {SLOTS.map(({ slot, label }) => {
            const equippedUid = gear.equipped[slot]
            const equippedInst = state.inventory.find((i) => i.uid === equippedUid)
            const options = state.inventory.filter((i) => ITEM_MAP[i.defId]?.slot === slot)
            return (
              <div
                key={slot}
                className="flex items-center gap-2 border border-border/50 bg-card/30 p-2"
              >
                <div className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="min-w-0 flex-1">
                  <select
                    value={equippedUid ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        dispatch({ type: "UNEQUIP_SLOT", gearUid: gear.uid, slot })
                      } else {
                        dispatch({
                          type: "EQUIP_ITEM",
                          gearUid: gear.uid,
                          itemUid: e.target.value,
                        })
                      }
                    }}
                    className="w-full rounded-sm border border-input bg-input/40 px-2 py-1 text-xs outline-none focus:border-primary"
                  >
                    <option value="">— Trống —</option>
                    {options.map((i) => {
                      const d = ITEM_MAP[i.defId]
                      const on = equippedOn.get(i.uid)
                      const onOther = on && i.uid !== equippedUid
                      return (
                        <option key={i.uid} value={i.uid}>
                          {d.name} +{i.level}
                          {onOther ? ` (đang ở ${on})` : ""}
                        </option>
                      )
                    })}
                  </select>
                  {equippedInst && (
                    <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-primary/80">
                      {Object.entries(itemBonus(equippedInst)).map(([sk, v]) => (
                        <span key={sk}>
                          {STAT_LABELS[sk as StatKey]} {(v as number) > 0 ? "+" : ""}
                          {v as number}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
