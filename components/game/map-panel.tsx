"use client"

import { Button } from "@/components/ui/button"
import { GEAR_CLASSES } from "@/lib/game/data"
import { computeStats, fleetPower, gearPower, maxHp } from "@/lib/game/engine"
import { useGame } from "@/lib/game/store"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Building2,
  CheckCircle2,
  Coins,
  Crosshair,
  Radar,
  Rocket,
  Skull,
  Swords,
  Shield,
  Users,
} from "lucide-react"
import { useState } from "react"
import {
  GEAR_COLOR_VAR,
  Panel,
  RESOURCE_META,
  formatNum,
} from "./shared"
import type { Sector, SectorKind } from "@/lib/game/types"

const HOME = { x: 8, y: 90 }

const EDGES: [string, string][] = [
  ["home", "s1"],
  ["s1", "s2"],
  ["s2", "s4"],
  ["s2", "s3"],
  ["s4", "s3"],
  ["s3", "s6"],
  ["s3", "s5"],
  ["s6", "s7"],
  ["s5", "s7"],
  ["s8", "s9"], ["s8", "s10"], ["s9", "s10"],
  ["s10", "s14"], ["s14", "s16"], ["s16", "s18"],
  ["s11", "s12"], ["s12", "s13"], ["s13", "s15"],
  ["s15", "s17"], ["s17", "s11"], ["s10", "s3"],
  ["s9", "s4"], ["s12", "s6"],
]

const KIND_META: Record<SectorKind, { label: string; size: number; icon: typeof Radar }> = {
  outpost: { label: "Tiền đồn", size: 26, icon: Radar },
  base: { label: "Căn cứ", size: 34, icon: Crosshair },
  mothership: { label: "Tàu mẹ", size: 46, icon: Skull },
}

export function MapPanel() {
  const { state, dispatch } = useGame()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fleet, setFleet] = useState<string[]>(state.gears.map((g) => g.uid))

  const selected = state.sectors.find((s) => s.id === selectedId) ?? null

  const pos = (id: string) => {
    if (id === "home") return HOME
    const s = state.sectors.find((x) => x.id === id)!
    return { x: s.x, y: s.y }
  }

  const selectedGears = state.gears.filter((g) => fleet.includes(g.uid))
  const attackPower = fleetPower(selectedGears, state.inventory)

  const toggleGear = (uid: string) =>
    setFleet((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid],
    )

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
      {/* Map */}
      <Panel title="Bản đồ hệ sao" icon={<Radar className="size-4" />} bodyClassName="p-0">
        <div className="relative aspect-[16/11] w-full overflow-hidden bg-[radial-gradient(circle_at_20%_90%,oklch(0.28_0.06_255),oklch(0.15_0.03_255))]">
          {/* starfield dots */}
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(oklch(0.9_0_0/0.5)_1px,transparent_1px)] [background-size:34px_34px]" />

          {/* routes */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            {EDGES.map(([a, b], i) => {
              const pa = pos(a)
              const pb = pos(b)
              const captured =
                (a === "home" || state.sectors.find((s) => s.id === a)?.captured) &&
                state.sectors.find((s) => s.id === b)?.captured
              return (
                <line
                  key={i}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke={captured ? "var(--color-gear-m)" : "var(--color-primary)"}
                  strokeWidth="0.35"
                  strokeDasharray="1.5 1.2"
                  opacity={captured ? 0.55 : 0.28}
                />
              )
            })}
          </svg>

          {/* Home base */}
          <MapNode x={HOME.x} y={HOME.y} label="Căn cứ chính" home />

          {/* Sectors */}
          {state.sectors.map((s) => (
            <SectorNode
              key={s.id}
              sector={s}
              active={selectedId === s.id}
              onSelect={() => setSelectedId(s.id)}
            />
          ))}

          {/* Legend */}
          <div className="absolute bottom-2 right-2 flex flex-col gap-1 rounded-sm border border-border/50 bg-background/70 px-2.5 py-1.5 backdrop-blur-sm">
            {(Object.keys(KIND_META) as SectorKind[]).map((k) => {
              const Icon = KIND_META[k].icon
              return (
                <div key={k} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Icon className="size-3 text-primary" />
                  {KIND_META[k].label}
                </div>
              )
            })}
          </div>
        </div>
      </Panel>

      {/* Sector detail + fleet */}
      <div className="flex flex-col gap-4">
        {selected ? (
          (() => {
            const SelIcon = KIND_META[selected.kind].icon
            return (
          <Panel
            title={selected.name}
            icon={<SelIcon className="size-4" />}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {KIND_META[selected.kind].label} · {selected.faction}
                </span>
                {selected.captured && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-gear-m" style={{ color: "var(--color-gear-m)" }}>
                    <CheckCircle2 className="size-3" />
                    Đã chiếm
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Metric icon={<Swords className="size-3.5" />} label="Uy hiếp" value={formatNum(selected.threat)} />
                <Metric icon={<Users className="size-3.5" />} label="Đồn trú" value={formatNum(selected.baseGarrison ?? selected.garrison)} />
                <Metric icon={<Radar className="size-3.5" />} label="Đề nghị PWR" value={formatNum(selected.recommendedPower)} />
                <Metric icon={<Users className="size-3.5" />} label="Quân thưởng" value={`+${selected.troopReward}`} />
              </div>

              {selected.isMainBase && (
                <div className="border border-primary/40 bg-primary/5 p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-display text-xs font-700 uppercase tracking-wider text-primary"><Building2 className="size-3.5" /> Căn cứ trọng điểm</span>
                    <span className="font-mono text-[10px] text-muted-foreground">LV.{selected.baseLevel ?? 1} · {selected.baseBuildings ?? 1} công trình</span>
                  </div>
                  <div className="mb-2 h-1.5 overflow-hidden rounded-sm bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((selected.baseGarrison ?? 0) / (selected.baseCapacity ?? 120)) * 100)}%` }} />
                  </div>
                  <div className="mb-2 flex justify-between text-[10px] text-muted-foreground"><span>Quân đồn trú</span><span className="font-mono text-foreground">{selected.baseGarrison ?? 0} / {selected.baseCapacity ?? 120}</span></div>
                  {selected.captured ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => dispatch({ type: "GARRISON_MAIN_BASE", sectorId: selected.id, amount: 25 })} disabled={state.army <= 0} className="text-[10px]"><Shield className="size-3" /> +25 quân</Button>
                      <Button size="sm" onClick={() => dispatch({ type: "UPGRADE_MAIN_BASE", sectorId: selected.id })} className="text-[10px]"><ArrowUp className="size-3" /> Nâng cấp</Button>
                    </div>
                  ) : <p className="text-[10px] text-accent">Chiếm cứ điểm để mở khóa quyền điều khiển, đồn trú và xây dựng.</p>}
                </div>
              )}

              <div className="border border-border/50 bg-card/40 p-2.5">
                <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Phần thưởng chiếm đóng
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {Object.entries(selected.reward).map(([k, v]) => {
                    const meta = RESOURCE_META[k as keyof typeof RESOURCE_META]
                    const Icon = meta.icon
                    return (
                      <span key={k} className="flex items-center gap-1 font-mono text-xs" style={{ color: meta.color }}>
                        <Icon className="size-3.5" />+{formatNum(v as number)}
                      </span>
                    )
                  })}
                </div>
              </div>

              {!selected.captured && (
                <>
                  <div className="flex items-center justify-between rounded-sm border border-border/50 bg-card/40 px-2.5 py-2">
                    <span className="text-[11px] text-muted-foreground">Sức mạnh hạm đội cử đi</span>
                    <span
                      className={cn(
                        "font-mono text-sm font-700",
                        attackPower >= selected.recommendedPower
                          ? "text-[color:var(--color-gear-m)]"
                          : "text-accent",
                      )}
                    >
                      {formatNum(attackPower)}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      dispatch({ type: "LAUNCH_BATTLE", sectorId: selected.id, gearUids: fleet })
                    }}
                    disabled={fleet.length === 0}
                    className="font-display tracking-wider"
                  >
                    <Swords className="size-4" />
                    Xuất kích
                  </Button>
                  {attackPower < selected.recommendedPower && (
                    <p className="text-center text-[10px] text-accent">
                      Cảnh báo: dưới mức đề nghị, rủi ro thất bại cao.
                    </p>
                  )}
                </>
              )}
            </div>
          </Panel>
            )
          })()
        ) : (
          <Panel title="Mục tiêu" icon={<Crosshair className="size-4" />}>
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Radar className="size-8 opacity-50" />
              <p className="text-xs">Chọn một khu vực trên bản đồ để lên kế hoạch tấn công.</p>
            </div>
          </Panel>
        )}

        {/* Fleet picker */}
        <Panel title="Chọn hạm đội xuất kích" icon={<Rocket className="size-4" />} bodyClassName="p-2">
          <ul className="flex flex-col gap-1.5">
            {state.gears.map((g) => {
              const stats = computeStats(g, state.inventory)
              const selectedG = fleet.includes(g.uid)
              const hpPct = (g.hpCurrent / maxHp(g, state.inventory)) * 100
              return (
                <li key={g.uid}>
                  <button
                    onClick={() => toggleGear(g.uid)}
                    className={cn(
                      "flex w-full items-center gap-2.5 border p-2 text-left transition-colors",
                      selectedG
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/50 bg-card/30 opacity-60 hover:opacity-100",
                    )}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center border font-display text-sm font-900"
                      style={{ color: GEAR_COLOR_VAR[g.cls], borderColor: GEAR_COLOR_VAR[g.cls] }}
                    >
                      {g.cls}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-display text-sm font-600">{g.name}</span>
                        <span className="font-mono text-[10px] text-primary/80">
                          PWR {formatNum(gearPower(stats))}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-sm bg-secondary/60">
                          <div
                            className="h-full"
                            style={{
                              width: `${hpPct}%`,
                              backgroundColor:
                                hpPct > 50 ? "var(--color-gear-m)" : "var(--color-destructive)",
                            }}
                          />
                        </div>
                        <span className="text-[9px] uppercase text-muted-foreground">
                          {GEAR_CLASSES[g.cls].role}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 border border-border/50 bg-card/40 px-2.5 py-1.5">
      <span className="text-primary">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-sm tabular-nums">{value}</div>
      </div>
    </div>
  )
}

function MapNode({
  x,
  y,
  label,
  home,
}: {
  x: number
  y: number
  label: string
  home?: boolean
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="flex size-8 items-center justify-center rounded-full border-2 border-[color:var(--color-gear-m)] bg-[color:var(--color-gear-m)]/20 text-[color:var(--color-gear-m)]">
          <Rocket className="size-4" />
        </div>
        {home && (
          <span className="whitespace-nowrap rounded-sm bg-background/70 px-1 text-[9px] uppercase tracking-wider text-[color:var(--color-gear-m)]">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}

function SectorNode({
  sector,
  active,
  onSelect,
}: {
  sector: Sector
  active: boolean
  onSelect: () => void
}) {
  const meta = KIND_META[sector.kind]
  const Icon = meta.icon
  const color = sector.captured
    ? "var(--color-gear-m)"
    : sector.kind === "mothership"
      ? "var(--color-destructive)"
      : "var(--color-accent)"
  return (
    <button
      onClick={onSelect}
      className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
      style={{ left: `${sector.x}%`, top: `${sector.y}%` }}
      aria-label={sector.name}
    >
      <div className="flex flex-col items-center gap-1">
        <span
          className={cn(
            "relative flex items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110",
            active && "ring-2 ring-offset-2 ring-offset-background",
            sector.isMainBase && "shadow-[0_0_18px_rgba(56,189,248,0.55)]",
            sector.kind === "mothership" && !sector.captured && "animate-pulse",
          )}
          style={{
            width: meta.size,
            height: meta.size,
            borderColor: color,
            backgroundColor: `color-mix(in oklch, ${color} 22%, transparent)`,
            color,
            // @ts-expect-error css var for ring color
            "--tw-ring-color": color,
          }}
        >
          {sector.captured ? <CheckCircle2 className="size-4" /> : <Icon className="size-4" />}
        </span>
        <span
          className="max-w-28 whitespace-nowrap rounded-sm bg-background/75 px-1 text-[9px] font-600 uppercase tracking-wide backdrop-blur-sm"
          style={{ color }}
        >
          {sector.isMainBase ? "◆ " : ""}{sector.name}
        </span>
      </div>
    </button>
  )
}
