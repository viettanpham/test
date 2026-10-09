"use client"

import { Button } from "@/components/ui/button"
import { GEAR_CLASSES } from "@/lib/game/data"
import {
  baseDefense,
  computeStats,
  dailyProduction,
  fleetPower,
  gearPower,
  maxHp,
} from "@/lib/game/engine"
import { useGame } from "@/lib/game/store"
import {
  Activity,
  ChevronRight,
  Heart,
  Radar,
  Rocket,
  ShieldHalf,
  Wrench,
} from "lucide-react"
import type { Tab } from "./console"
import { GEAR_COLOR_VAR, Panel, RESOURCE_META, formatNum } from "./shared"
import type { ResourceKey } from "@/lib/game/types"

export function Dashboard({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const { state, dispatch } = useGame()
  const power = fleetPower(state.gears, state.inventory)
  const prod = dailyProduction(state.buildings)
  const captured = state.sectors.filter((s) => s.captured).length
  const woundedCredits = state.gears.reduce(
    (sum, g) => sum + (maxHp(g, state.inventory) - g.hpCurrent),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sức mạnh hạm đội" value={formatNum(power)} icon={<Radar className="size-4" />} accent="var(--color-primary)" />
        <Kpi label="Phi thuyền" value={`${state.gears.length}`} icon={<Rocket className="size-4" />} accent="var(--color-gear-i)" />
        <Kpi
          label="Khu vực chiếm được"
          value={`${captured}/${state.sectors.length}`}
          icon={<ShieldHalf className="size-4" />}
          accent="var(--color-accent)"
        />
        <Kpi
          label="Phòng thủ căn cứ"
          value={formatNum(baseDefense(state.buildings))}
          icon={<Activity className="size-4" />}
          accent="var(--color-gear-m)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Fleet readiness */}
        <Panel
          title="Tình trạng hạm đội"
          icon={<Rocket className="size-4" />}
          className="xl:col-span-2"
          action={
            <div className="flex gap-1.5">
              <Button
                size="xs"
                variant="secondary"
                onClick={() => dispatch({ type: "REPAIR_ALL" })}
                disabled={woundedCredits <= 0}
              >
                <Wrench className="size-3" />
                Sửa toàn bộ
              </Button>
              <Button size="xs" variant="ghost" onClick={() => onNavigate("fleet")}>
                Quản lý <ChevronRight className="size-3" />
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {state.gears.map((g) => {
              const def = GEAR_CLASSES[g.cls]
              const stats = computeStats(g, state.inventory)
              const hpPct = (g.hpCurrent / stats.hp) * 100
              return (
                <div
                  key={g.uid}
                  className="flex items-center gap-3 border border-border/60 bg-card/50 p-2.5"
                >
                  <div
                    className="flex size-10 items-center justify-center border font-display text-lg font-900 clip-corner"
                    style={{
                      color: GEAR_COLOR_VAR[g.cls],
                      borderColor: GEAR_COLOR_VAR[g.cls],
                      backgroundColor: `color-mix(in oklch, ${GEAR_COLOR_VAR[g.cls]} 12%, transparent)`,
                    }}
                  >
                    {g.cls}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-sm font-700 text-foreground">
                        {g.name}
                      </span>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Lv {g.level} · {def.role}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Heart className="size-3 text-destructive" />
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-sm bg-secondary/60">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${hpPct}%`,
                            backgroundColor:
                              hpPct > 50
                                ? "var(--color-gear-m)"
                                : hpPct > 25
                                  ? "var(--color-accent)"
                                  : "var(--color-destructive)",
                          }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted-foreground">
                        {formatNum(g.hpCurrent)}/{formatNum(stats.hp)}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                      <span>ATK {stats.attack}</span>
                      <span>DEF {stats.defense}</span>
                      <span>SPD {stats.speed}</span>
                      <span className="ml-auto font-mono text-primary/80">
                        PWR {formatNum(gearPower(stats))}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        {/* Production */}
        <Panel title="Sản lượng / ngày" icon={<Activity className="size-4" />}>
          <div className="flex flex-col gap-2">
            {(Object.keys(prod) as ResourceKey[]).map((k) => {
              const meta = RESOURCE_META[k]
              const Icon = meta.icon
              return (
                <div
                  key={k}
                  className="flex items-center justify-between border border-border/50 bg-card/40 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4" style={{ color: meta.color }} />
                    <span className="text-xs text-muted-foreground">{meta.label}</span>
                  </div>
                  <span className="font-mono text-sm font-600 tabular-nums" style={{ color: meta.color }}>
                    +{formatNum(prod[k])}
                  </span>
                </div>
              )
            })}
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => onNavigate("base")}>
              Nâng cấp căn cứ <ChevronRight className="size-3" />
            </Button>
          </div>
        </Panel>
      </div>

      {/* Event log */}
      <Panel title="Nhật ký chiến sự" icon={<Activity className="size-4" />} bodyClassName="p-0">
        <ul className="max-h-56 divide-y divide-border/40 overflow-y-auto">
          {state.eventLog.map((e, i) => (
            <li key={i} className="flex items-start gap-3 px-3 py-2 text-xs">
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-primary/70">
                D{e.day}
              </span>
              <span className="text-foreground/80">{e.text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="relative overflow-hidden border border-border/70 bg-panel/70 p-3 clip-corner">
      <div
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-center gap-2" style={{ color: accent }}>
        {icon}
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1.5 font-display text-2xl font-900 tabular-nums text-foreground">
        {value}
      </div>
    </div>
  )
}
