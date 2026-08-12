"use client"

import { cn } from "@/lib/utils"
import { Coins, Gem, Layers, Zap } from "lucide-react"
import type { ReactNode } from "react"
import type { GearClass, Rarity, ResourceKey } from "@/lib/game/types"

export const GEAR_COLOR_VAR: Record<GearClass, string> = {
  A: "var(--color-gear-a)",
  B: "var(--color-gear-b)",
  I: "var(--color-gear-i)",
  M: "var(--color-gear-m)",
}

export function gearStyle(cls: GearClass) {
  return { color: GEAR_COLOR_VAR[cls] }
}

export const RESOURCE_META: Record<
  ResourceKey,
  { label: string; icon: typeof Coins; color: string }
> = {
  credits: { label: "Credits", icon: Coins, color: "var(--color-accent)" },
  alloy: { label: "Hợp kim", icon: Layers, color: "oklch(0.72 0.05 240)" },
  energy: { label: "Năng lượng", icon: Zap, color: "var(--color-primary)" },
  crystal: { label: "Tinh thể", icon: Gem, color: "var(--color-gear-b)" },
}

export function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M"
  if (n >= 10_000) return (n / 1000).toFixed(1) + "K"
  return Math.round(n).toLocaleString("en-US")
}

export const RARITY_META: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Thường", color: "oklch(0.7 0.02 240)" },
  rare: { label: "Hiếm", color: "var(--color-primary)" },
  epic: { label: "Sử thi", color: "var(--color-gear-b)" },
  legendary: { label: "Huyền thoại", color: "var(--color-accent)" },
}

export function Panel({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={cn(
        "relative border border-border/70 bg-panel/80 backdrop-blur-sm",
        "shadow-[0_0_0_1px_oklch(0.75_0.15_205_/_6%),inset_0_1px_0_oklch(1_0_0_/_4%)]",
        className,
      )}
    >
      {title != null && (
        <header className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2 text-primary">
            {icon}
            <h2 className="font-display text-xs font-700 tracking-[0.18em] uppercase text-foreground/90">
              {title}
            </h2>
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  )
}

export function StatBar({
  label,
  value,
  max,
  color = "var(--color-primary)",
}: {
  label: string
  value: number
  max: number
  color?: string
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-sm bg-secondary/60">
        <div
          className="h-full rounded-sm transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-foreground/90">
        {Math.round(value)}
      </span>
    </div>
  )
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const m = RARITY_META[rarity]
  return (
    <span
      className="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[9px] font-600 uppercase tracking-widest"
      style={{ color: m.color, borderColor: m.color, backgroundColor: `color-mix(in oklch, ${m.color} 12%, transparent)` }}
    >
      {m.label}
    </span>
  )
}

export function ResourcePill({
  k,
  amount,
  cost,
}: {
  k: ResourceKey
  amount?: number
  cost?: number
}) {
  const meta = RESOURCE_META[k]
  const Icon = meta.icon
  const insufficient = cost != null && amount != null && amount < cost
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] tabular-nums",
        insufficient ? "text-destructive" : "text-foreground/90",
      )}
    >
      <Icon className="size-3" style={{ color: insufficient ? undefined : meta.color }} />
      {cost != null ? formatNum(cost) : formatNum(amount ?? 0)}
    </span>
  )
}
