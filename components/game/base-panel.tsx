"use client"

import { Button } from "@/components/ui/button"
import { BUILDING_DEFS, BUILDING_ORDER } from "@/lib/game/data"
import {
  armyCap,
  baseDefense,
  buildingUpgradeCost,
  gearCap,
  prosperity,
  prosperityTier,
} from "@/lib/game/engine"
import { useGame } from "@/lib/game/store"
import {
  Building2,
  Crosshair,
  Factory,
  FerrisWheel,
  Hammer,
  Handshake,
  Home,
  Landmark,
  Layers,
  Lock,
  ShieldHalf,
  Sparkles,
  Store,
  Users,
  Warehouse,
  Zap,
} from "lucide-react"
import { Panel, ResourcePill, formatNum } from "./shared"
import { DistrictPanel } from "./district-panel"
import type { BuildingKey, Resources } from "@/lib/game/types"

const BUILDING_ICON: Record<BuildingKey, typeof Zap> = {
  command: Building2,
  hangar: Warehouse,
  factory: Factory,
  reactor: Zap,
  refinery: Layers,
  barracks: Users,
  turret: Crosshair,
  shipyard: Hammer,
  finance: Landmark,
  alliance: Handshake,
  residential: Home,
  trade: Store,
  entertainment: FerrisWheel,
}

export function BasePanel() {
  const { state, dispatch } = useGame()
  const commandLevel = state.buildings.command
  const capturedCount = state.sectors.filter((s) => s.captured).length
  const prosperityScore = prosperity(state.population, state.buildings, capturedCount)

  return (
    <div className="flex flex-col gap-4">
      {/* Base summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          icon={<Home className="size-4" />}
          label="Dân cư"
          value={formatNum(state.population)}
          color="var(--color-accent)"
        />
        <SummaryCard
          icon={<Sparkles className="size-4" />}
          label="Độ phồn vinh"
          value={`${prosperityScore} · ${prosperityTier(prosperityScore)}`}
          color="var(--color-gear-s)"
        />
        <SummaryCard
          icon={<Users className="size-4" />}
          label="Quân số"
          value={`${formatNum(state.army)} / ${formatNum(armyCap(state.buildings))}`}
          color="var(--color-accent)"
        />
        <SummaryCard
          icon={<ShieldHalf className="size-4" />}
          label="Phòng thủ căn cứ"
          value={formatNum(baseDefense(state.buildings))}
          color="var(--color-gear-m)"
        />
        <SummaryCard
          icon={<Warehouse className="size-4" />}
          label="Sức chứa hạm đội"
          value={`${state.gears.length} / ${gearCap(state.buildings, state.population, state.districts)}`}
          color="var(--color-gear-i)"
        />
        <SummaryCard
          icon={<Building2 className="size-4" />}
          label="Cấp chỉ huy"
          value={`Lv ${commandLevel}`}
          color="var(--color-primary)"
        />
      </div>

      {/* Army bar */}
      <Panel title="Lực lượng đồn trú" icon={<Users className="size-4" />}>
        <div className="flex items-center gap-3">
          <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-secondary/60">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${Math.min(100, (state.army / armyCap(state.buildings)) * 100)}%`,
              }}
            />
          </div>
          <span className="font-mono text-sm tabular-nums text-foreground">
            {formatNum(state.army)}/{formatNum(armyCap(state.buildings))}
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Chiếm khu vực để tăng quân số. Nâng Doanh Trại để mở rộng giới hạn.
        </p>
      </Panel>

      <DistrictPanel />

      {/* Buildings */}
      <Panel title="Công trình căn cứ" icon={<Building2 className="size-4" />}>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {BUILDING_ORDER.map((key) => {
            const def = BUILDING_DEFS[key]
            const level = state.buildings[key]
            const Icon = BUILDING_ICON[key]
            const atMax = level >= def.maxLevel
            const cost = buildingUpgradeCost(key, level)
            const gated = key !== "command" && level >= commandLevel + 2
            const affordable = (Object.keys(cost) as (keyof Resources)[]).every(
              (k) => state.resources[k] >= (cost[k] as number),
            )
            const disabled = atMax || gated || !affordable

            return (
              <div
                key={key}
                className="flex gap-3 border border-border/60 bg-card/40 p-3"
              >
                <div className="flex size-11 shrink-0 items-center justify-center border border-primary/40 bg-primary/10 text-primary clip-corner">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-700">{def.name}</span>
                    <span className="shrink-0 font-mono text-xs text-accent">
                      Lv {level}
                      <span className="text-muted-foreground">/{def.maxLevel}</span>
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {def.desc}
                  </p>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-primary/70">
                    {def.effect}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {atMax ? (
                      <span className="text-[10px] uppercase tracking-widest text-accent">
                        Cấp tối đa
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {Object.entries(cost).map(([k, v]) => (
                          <ResourcePill
                            key={k}
                            k={k as never}
                            amount={state.resources[k as never]}
                            cost={v as number}
                          />
                        ))}
                      </div>
                    )}
                    <Button
                      size="xs"
                      variant={gated ? "ghost" : "default"}
                      disabled={disabled}
                      onClick={() => dispatch({ type: "UPGRADE_BUILDING", key })}
                    >
                      {gated ? (
                        <>
                          <Lock className="size-3" />
                          Cần Chỉ Huy
                        </>
                      ) : atMax ? (
                        "Tối đa"
                      ) : (
                        "Nâng cấp"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="relative overflow-hidden border border-border/70 bg-panel/70 p-3 clip-corner">
      <div className="absolute inset-y-0 left-0 w-0.5" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2" style={{ color }}>
        {icon}
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1 font-display text-lg font-900 tabular-nums text-foreground">
        {value}
      </div>
    </div>
  )
}
