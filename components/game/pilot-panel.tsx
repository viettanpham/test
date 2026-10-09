'use client'

import { useGame } from '@/lib/game/store'
import { GEAR_CLASSES, ITEM_MAP, PILOT_PROFILES } from '@/lib/game/data'
import { Button } from '@/components/ui/button'
import { Panel } from './shared'
import { Brain, Crosshair, Gauge, Shield, Sparkles, Target, Wrench, Lock, UserRound, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PilotStatKey } from '@/lib/game/types'

const STAT_META: Record<PilotStatKey, { label: string; icon: typeof Crosshair; desc: string }> = {
  attack: { label: 'ATK', icon: Crosshair, desc: 'Sát thương phi cơ' },
  defense: { label: 'DEF', icon: Shield, desc: 'Giáp và giảm sát thương' },
  agility: { label: 'AGI', icon: Gauge, desc: 'Tốc độ và né tránh' },
  shield: { label: 'SHIELD', icon: Sparkles, desc: 'Lá chắn năng lượng' },
  vision: { label: 'VISION', icon: Target, desc: 'Tầm nhìn vũ khí' },
}

export function PilotPanel() {
  const { state, dispatch } = useGame()
  const pilot = state.pilot
  const profile = PILOT_PROFILES.find((p) => p.id === pilot.profileId) ?? PILOT_PROFILES[0]
  const aircraft = state.gears.find((g) => g.uid === pilot.aircraftUid) ?? state.gears[0]
  const aircraftDef = aircraft ? GEAR_CLASSES[aircraft.cls] : null
  const locked = state.day - pilot.selectedAtDay < 10
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Panel title="Chọn phi công" icon={<UserRound className="size-4" />}>
          <div className="space-y-2">
            {PILOT_PROFILES.map((p) => {
              const active = p.id === profile.id
              const PIcon = GEAR_CLASSES[p.gear].cls === p.gear ? Plane : Plane
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => dispatch({ type: 'SELECT_PILOT', profileId: p.id })}
                  className={cn(
                    'flex w-full items-center gap-3 border p-2 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 bg-card/40 hover:border-primary/50'
                  )}
                >
                  <img
                    src={p.avatar}
                    alt={`Chân dung ${p.name}`}
                    className="size-14 shrink-0 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-display font-bold">
                      <span>{p.name}</span>
                      <span className="text-xs" style={{ color: GEAR_CLASSES[p.gear].color }}>
                        {p.gear}-GEAR
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.specialty} · {p.aircraftName}
                    </div>
                  </div>
                  <PIcon className="size-4 text-primary" />
                </button>
              )
            })}
          </div>
          <div className="mt-3 border border-dashed border-accent/50 bg-accent/5 p-2 text-[10px] text-muted-foreground">
            {locked ? (
              <>
                <Lock className="mr-1 inline size-3 text-accent" />
                Phi công hiện tại còn {10 - (state.day - pilot.selectedAtDay)} ngày khóa chuyển đổi.
              </>
            ) : (
              'Có thể thay phi công. Mỗi lần thay cần chờ 10 ngày chiến thuật.'
            )}
          </div>
        </Panel>
        <Panel
          title={`${profile.name} · ${profile.specialty}`}
          icon={<Brain className="size-4" />}
          action={<span className="font-mono text-[10px] text-accent">LV {pilot.level} · {pilot.xp} XP</span>}
        >
          <div className="flex gap-4">
            <img
              src={profile.avatar}
              alt={`Chân dung ${profile.name}`}
              className="h-36 w-28 shrink-0 object-cover border border-primary/50"
            />
            <div className="min-w-0 flex-1">
              <div className="font-display text-lg font-bold text-primary">{profile.description}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {profile.gender} · {profile.age} tuổi · Phi cơ liên kết: <span className="text-foreground">{profile.aircraftName}</span>
              </div>
              <div className="mt-3 space-y-2">
                {profile.trail.map((t) => (
                  <div key={t} className="border border-yellow-500/30 bg-yellow-500/5 px-2 py-1.5 text-xs text-yellow-300">
                    <span className="mr-2 font-mono text-yellow-400">TRAIL</span>{t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Panel
          title="Thông tin nhân vật"
          icon={<Sparkles className="size-4" />}
          action={<span className="text-[10px] text-accent">{pilot.skillPoints} ĐIỂM KỸ NĂNG</span>}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(STAT_META) as PilotStatKey[]).map((key) => {
              const meta = STAT_META[key]
              const Icon = meta.icon
              const white = profile.baseStats[key]
              const blue = pilot.stats[key] - white
              const gold = Math.round(white * (profile.trail.length > 1 ? 0.1 : 0.2))
              return (
                <div key={key} className="border border-border/50 bg-card/40 p-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <span className="font-display text-xs font-bold">{meta.label}</span>
                    <span className="ml-auto font-mono text-sm font-bold text-foreground">
                      {white + blue + gold}
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{meta.desc}</div>
                  <div className="mt-1 font-mono text-[10px]">
                    <span className="font-bold text-white">{white}</span>
                    <span className="text-sky-400"> +{blue} gear</span>
                    <span className="text-yellow-400"> +{gold} trail</span>
                  </div>
                  <Button
                    className="mt-2 h-6 w-full text-[10px]"
                    size="sm"
                    variant="secondary"
                    disabled={!pilot.skillPoints}
                    onClick={() => dispatch({ type: 'ALLOCATE_PILOT_STAT', stat: key })}
                  >
                    + CỘNG ĐIỂM
                  </Button>
                </div>
              )
            })}
          </div>
          <div className="mt-3 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
            <span className="font-bold text-white">TRẮNG</span> chỉ số gốc · <span className="text-sky-400">XANH</span> trang bị ·
            <span className="text-yellow-400">VÀNG</span> trail nhân vật · Total = tổng hiệu lực
          </div>
        </Panel>
        <Panel title="Kỹ năng ACE" icon={<Sparkles className="size-4" />}>
          <div className="grid gap-2 sm:grid-cols-2">
            {pilot.skills.map((skill) => (
              <div
                key={skill.id}
                className={cn(
                  'border p-2.5',
                  skill.category === 'gear' ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card/40'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display text-xs font-semibold">{skill.name}</div>
                  <Button
                    size="xs"
                    variant="secondary"
                    disabled={!pilot.skillPoints || skill.level >= skill.maxLevel}
                    onClick={() => dispatch({ type: 'UPGRADE_PILOT_SKILL', skillId: skill.id })}
                  >
                    Lv {skill.level}/{skill.maxLevel}
                  </Button>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {skill.desc} · <span className="text-primary">{skill.effect}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Phi cơ cá nhân · trang bị liên kết"
        icon={<Wrench className="size-4" />}
        action={<span className="font-mono text-[10px] text-accent">1 PILOT / 1 AIRCRAFT</span>}
      >
        {aircraft && aircraftDef && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-2 text-3xl font-display font-bold"
                style={{ borderColor: aircraftDef.color, color: aircraftDef.color }}
              >
                {aircraft.cls}
              </div>
              <div className="flex-1">
                <div className="font-display text-xl font-bold">{aircraft.name}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {aircraftDef.name} · {aircraftDef.role} · {profile.armorType}
                </div>
                <div className="mt-2 h-2 overflow-hidden bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, (aircraft.hpCurrent / (aircraftDef.base.hp + 500)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(['weapon', 'missile', 'armor', 'engine', 'shield'] as const).map((slot) => {
                const uid = aircraft.equipped[slot]
                const item = uid ? state.inventory.find((i) => i.uid === uid) : null
                const def = item ? ITEM_MAP[item.defId] : null
                return (
                  <div key={slot} className="border border-border/50 bg-card/40 p-2">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{slot}</div>
                    <div className="mt-1 text-xs font-semibold">{def?.name ?? 'Chưa lắp'}</div>
                    <div className="text-[10px] text-sky-400">
                      {def ? `+${item?.level ?? 0} · ${def.rarity}` : 'Mở kho Trang bị'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}

export default PilotPanel
