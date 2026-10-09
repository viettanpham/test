"use client"

import { useGame } from "@/lib/game/store"
import { GEAR_CLASSES, ITEM_MAP } from "@/lib/game/data"
import { Button } from "@/components/ui/button"
import { Panel } from "./shared"
import { Brain, Crosshair, Gauge, Shield, Sparkles, Target, Wrench } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PilotStatKey } from "@/lib/game/types"

const STAT_META: Record<PilotStatKey, { label: string; icon: typeof Crosshair; desc: string }> = {
  attack: { label: "ATK", icon: Crosshair, desc: "Sát thương phi cơ" },
  defense: { label: "DEF", icon: Shield, desc: "Giáp và giảm sát thương" },
  agility: { label: "AGI", icon: Gauge, desc: "Tốc độ và né tránh" },
  shield: { label: "SHIELD", icon: Sparkles, desc: "Lá chắn năng lượng" },
  vision: { label: "VISION", icon: Target, desc: "Tầm nhìn vũ khí" },
}

export function PilotPanel() {
  const { state, dispatch } = useGame()
  const pilot = state.pilot
  const aircraft = state.gears.find((g) => g.uid === pilot.aircraftUid) ?? state.gears[0]
  const aircraftDef = aircraft ? GEAR_CLASSES[aircraft.cls] : null
  return <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
    <div className="space-y-4">
      <Panel title="Hồ sơ nhân vật" icon={<Brain className="size-4" />}>
        <div className="flex gap-3">
          <div className="h-24 w-24 shrink-0 overflow-hidden border border-primary/40 bg-primary/10"><img src={pilot.avatar} alt="Chân dung phi công" className="h-full w-full object-cover object-left" /></div>
          <div><div className="font-display text-lg font-bold text-primary">{pilot.name}</div><div className="font-mono text-xs text-muted-foreground">PILOT LEVEL {pilot.level} · {pilot.xp} XP</div><div className="mt-3 text-xs text-accent">{pilot.skillPoints} điểm kỹ năng khả dụng</div></div>
        </div>
        <div className="mt-4 space-y-2">{(Object.keys(STAT_META) as PilotStatKey[]).map((key) => { const meta = STAT_META[key]; const Icon = meta.icon; return <div key={key} className="flex items-center gap-2 border border-border/50 bg-card/40 p-2"><Icon className="size-4 text-primary" /><div className="min-w-0 flex-1"><div className="flex justify-between text-xs"><span className="font-display font-semibold">{meta.label}</span><span className="font-mono text-primary">{pilot.stats[key]}</span></div><div className="text-[10px] text-muted-foreground">{meta.desc}</div></div><Button size="icon-sm" variant="secondary" disabled={!pilot.skillPoints} onClick={() => dispatch({ type: "ALLOCATE_PILOT_STAT", stat: key })}>+</Button></div> })}</div>
      </Panel>
      <Panel title="Kỹ năng ACE" icon={<Sparkles className="size-4" />}>
        <div className="space-y-2">{pilot.skills.map((skill) => <div key={skill.id} className="border border-border/50 bg-card/40 p-2.5"><div className="flex items-center justify-between"><div className="font-display text-xs font-semibold">{skill.name}</div><Button size="xs" variant="secondary" disabled={!pilot.skillPoints || skill.level >= skill.maxLevel} onClick={() => dispatch({ type: "UPGRADE_PILOT_SKILL", skillId: skill.id })}>Lv {skill.level}/{skill.maxLevel}</Button></div><div className="mt-1 text-[10px] text-muted-foreground">{skill.desc} · <span className="text-primary">{skill.effect}</span></div></div>)}</div>
      </Panel>
    </div>
    <Panel title="Phi cơ cá nhân" icon={<Wrench className="size-4" />} action={<span className="font-mono text-[10px] text-accent">1 PILOT / 1 AIRCRAFT</span>}>
      {aircraft && aircraftDef && <div className="space-y-4"><div className="flex flex-col gap-3 border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center"><div className={cn("flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl font-display font-bold", `border-[${aircraftDef.color}]`)} style={{ color: aircraftDef.color }}>{aircraft.cls}</div><div className="flex-1"><div className="font-display text-xl font-bold">{aircraft.name}</div><div className="text-xs uppercase tracking-wider text-muted-foreground">{aircraftDef.name} · {aircraftDef.role} · Giáp {aircraft.level <= 5 ? "Light" : "Heavy"}</div><div className="mt-2 h-2 overflow-hidden bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, aircraft.hpCurrent / (aircraftDef.base.hp + 500) * 100)}%` }} /></div><div className="mt-1 font-mono text-[10px] text-muted-foreground">Hull integrity {Math.round(aircraft.hpCurrent)} HP</div></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(["weapon", "missile", "armor", "engine", "shield"] as const).map((slot) => { const uid = aircraft.equipped[slot]; const item = uid ? state.inventory.find((i) => i.uid === uid) : null; const def = item ? ITEM_MAP[item.defId] : null; return <div key={slot} className="border border-border/50 bg-card/40 p-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">{slot}</div><div className="mt-1 text-xs font-semibold">{def?.name ?? "Chưa lắp"}</div><div className="text-[10px] text-primary">{def ? `+${item?.level ?? 0} · ${def.rarity}` : "Mở kho Trang bị để lắp"}</div></div> })}</div></div>}
    </Panel>
  </div>
}

export default PilotPanel
