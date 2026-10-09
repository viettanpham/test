"use client"

import { DISTRICT_DEFS, DISTRICT_ORDER } from "@/lib/game/data"
import { districtBonus, districtPopulation, populationGrowthRate } from "@/lib/game/engine"
import { useGame } from "@/lib/game/store"
import type { DistrictKey } from "@/lib/game/types"
import { Coins, Gem, Hammer, Layers, Map as MapIcon, Wrench, Zap } from "lucide-react"
import { Panel, formatNum } from "./shared"

const DISTRICT_STYLE: Record<DistrictKey, { color: string; icon: typeof Zap }> = {
  finance: { color: "#facc15", icon: Coins },
  service: { color: "#a78bfa", icon: Gem },
  industry: { color: "#94a3b8", icon: Layers },
  power: { color: "#22d3ee", icon: Zap },
  repair: { color: "#4ade80", icon: Wrench },
  shipbuilding: { color: "#f97316", icon: Hammer },
}

export function DistrictPanel() {
  const { state, dispatch } = useGame()
  const { population, districts } = state
  const used = DISTRICT_ORDER.reduce((sum, k) => sum + districts[k], 0)
  const remaining = 100 - used
  const bonus = districtBonus(population, districts)
  const growth = Math.floor(population * populationGrowthRate(state.buildings))

  const summary = [
    { label: "Credits/ngày", value: `+${formatNum(bonus.credits)}`, color: DISTRICT_STYLE.finance.color },
    { label: "Tinh thể/ngày", value: `+${formatNum(bonus.crystal)}`, color: DISTRICT_STYLE.service.color },
    { label: "Hợp kim/ngày", value: `+${formatNum(bonus.alloy)}`, color: DISTRICT_STYLE.industry.color },
    { label: "Năng lượng/ngày", value: `+${formatNum(bonus.energy)}`, color: DISTRICT_STYLE.power.color },
    { label: "HP hồi/Gear/ngày", value: `+${formatNum(bonus.repairHp)}`, color: DISTRICT_STYLE.repair.color },
    {
      label: "Đóng tàu",
      value: `-${formatNum(bonus.shipDiscount)} · +${bonus.gearCap} Gear`,
      color: DISTRICT_STYLE.shipbuilding.color,
    },
  ]

  return (
    <Panel
      title="Phân khu căn cứ chính"
      icon={<MapIcon className="size-4" />}
      action={
        <span
          className={`border px-2 py-0.5 font-mono text-[10px] ${
            remaining > 0 ? "border-accent/60 bg-accent/10 text-accent" : "border-border/60 text-muted-foreground"
          }`}
        >
          Còn {remaining}% dân cư điều động
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* Visual map */}
        <div className="flex flex-col gap-3">
          <div
            className="flex h-44 w-full overflow-hidden border border-border/60 bg-secondary/30"
            role="img"
            aria-label="Bản đồ phân khu theo tỷ lệ dân cư"
          >
            {DISTRICT_ORDER.map((key) => {
              const pct = districts[key]
              const { color, icon: Icon } = DISTRICT_STYLE[key]
              return (
                <div
                  key={key}
                  className="flex flex-col items-center justify-center gap-1 border-r border-background/40 transition-all"
                  style={{ width: `${pct}%`, backgroundColor: `${color}33`, color }}
                  title={`${DISTRICT_DEFS[key].name}: ${pct}%`}
                >
                  <Icon className="size-4 shrink-0" />
                  {pct >= 10 && <span className="font-mono text-[10px] font-bold">{pct}%</span>}
                </div>
              )
            })}
            {remaining > 0 && (
              <div
                className="flex items-center justify-center bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(148,163,184,0.15)_6px,rgba(148,163,184,0.15)_12px)] text-muted-foreground"
                style={{ width: `${remaining}%` }}
              >
                {remaining >= 10 && <span className="font-mono text-[10px]">Trống {remaining}%</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {summary.map((s) => (
              <div key={s.label} className="border border-border/50 bg-card/40 p-2">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                <div className="font-mono text-xs font-bold" style={{ color: s.color }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Dân cư {formatNum(population)} · Tăng ~{formatNum(growth)} người mỗi 2 ngày. Cứ 100 dân trong một phân khu
            cho ra 1 đơn vị hiệu ứng.
          </p>
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-2.5">
          {DISTRICT_ORDER.map((key) => {
            const def = DISTRICT_DEFS[key]
            const { color, icon: Icon } = DISTRICT_STYLE[key]
            const pct = districts[key]
            const max = pct + remaining
            const people = districtPopulation(population, pct)
            return (
              <div key={key} className="border border-border/50 p-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`district-${key}`} className="flex items-center gap-1.5 font-display text-xs font-bold">
                    <Icon className="size-3.5" style={{ color }} />
                    {def.name}
                  </label>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    <b style={{ color }}>{pct}%</b> · {formatNum(people)} dân
                  </span>
                </div>
                <input
                  id={`district-${key}`}
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={pct}
                  onChange={(e) => {
                    const next = Math.min(Number(e.target.value), max)
                    dispatch({ type: "SET_DISTRICT", key, value: next })
                  }}
                  className="mt-1.5 w-full cursor-pointer"
                  style={{ accentColor: color }}
                  aria-valuetext={`${pct}% dân cư`}
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>{def.perHundred} / 100 dân</span>
                  <span>tối đa {max}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
