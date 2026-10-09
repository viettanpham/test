"use client"

import { Button } from "@/components/ui/button"
import { ITEM_DEFS, ITEM_MAP } from "@/lib/game/data"
import { itemBonus } from "@/lib/game/engine"
import { useGame } from "@/lib/game/store"
import { cn } from "@/lib/utils"
import { ArrowUpCircle, Boxes, Factory, PackageSearch } from "lucide-react"
import { useMemo, useState } from "react"
import { Panel, RarityBadge, ResourcePill, formatNum } from "./shared"
import type { EquipSlot, Resources, StatKey } from "@/lib/game/types"

const SLOT_LABELS: Record<EquipSlot, string> = {
  weapon: "Vũ khí",
  missile: "Tên lửa",
  armor: "Giáp",
  engine: "Động cơ",
  shield: "Khiên",
}

const STAT_LABELS: Record<StatKey, string> = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  speed: "SPD",
  evasion: "EVA",
  energy: "EN",
}

const SLOT_ORDER: EquipSlot[] = ["weapon", "missile", "armor", "engine", "shield"]

function bonusText(bonus: Partial<Record<StatKey, number>>) {
  return Object.entries(bonus)
    .map(([k, v]) => `${STAT_LABELS[k as StatKey]} ${(v as number) > 0 ? "+" : ""}${v}`)
    .join("  ·  ")
}

export function EquipmentPanel() {
  const { state, dispatch } = useGame()
  const [filter, setFilter] = useState<EquipSlot | "all">("all")

  const factoryDiscount = 1 - Math.min(0.4, state.buildings.factory * 0.05)

  const equippedOn = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of state.gears) {
      for (const uid of Object.values(g.equipped)) {
        if (uid) m.set(uid, g.name)
      }
    }
    return m
  }, [state.gears])

  const shopDefs = ITEM_DEFS.filter((d) => filter === "all" || d.slot === filter)

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
      {/* Crafting */}
      <Panel
        title="Xưởng chế tạo"
        icon={<Factory className="size-4" />}
        action={
          <div className="flex flex-wrap gap-1">
            <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
              Tất cả
            </FilterBtn>
            {SLOT_ORDER.map((s) => (
              <FilterBtn key={s} active={filter === s} onClick={() => setFilter(s)}>
                {SLOT_LABELS[s]}
              </FilterBtn>
            ))}
          </div>
        }
      >
        <p className="mb-3 text-[11px] text-muted-foreground">
          Nhà máy vũ khí cấp {state.buildings.factory} giảm{" "}
          {Math.round((1 - factoryDiscount) * 100)}% chi phí chế tạo.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shopDefs.map((d) => {
            const cost: Partial<Resources> = {}
            for (const [k, v] of Object.entries(d.cost)) {
              cost[k as keyof Resources] = Math.round((v as number) * factoryDiscount)
            }
            const affordable = (Object.keys(cost) as (keyof Resources)[]).every(
              (k) => state.resources[k] >= (cost[k] as number),
            )
            return (
              <div
                key={d.id}
                className="flex flex-col gap-1.5 border border-border/50 bg-card/40 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-sm font-600">{d.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {SLOT_LABELS[d.slot]}
                    </div>
                  </div>
                  <RarityBadge rarity={d.rarity} />
                </div>
                <div className="font-mono text-[11px] text-primary/80">{bonusText(d.bonus)}</div>
                <p className="text-[10px] leading-snug text-muted-foreground">{d.desc}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
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
                  <Button
                    size="xs"
                    variant={affordable ? "default" : "secondary"}
                    disabled={!affordable}
                    onClick={() => dispatch({ type: "BUY_ITEM", defId: d.id })}
                  >
                    Chế tạo
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Inventory */}
      <Panel
        title={`Kho trang bị (${state.inventory.length})`}
        icon={<Boxes className="size-4" />}
        bodyClassName="p-2"
      >
        {state.inventory.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <PackageSearch className="size-8 opacity-50" />
            <p className="text-xs">Kho trống. Chế tạo trang bị ở xưởng.</p>
          </div>
        ) : (
          <ul className="flex max-h-[70vh] flex-col gap-1.5 overflow-y-auto">
            {state.inventory.map((inst) => {
              const d = ITEM_MAP[inst.defId]
              if (!d) return null
              const on = equippedOn.get(inst.uid)
              const canUpgrade = inst.level < 10
              const upCost = {
                credits: Math.round((d.cost.credits ?? 500) * 0.6 * (inst.level + 1)),
                crystal: 5 * (inst.level + 1),
              }
              const affordUp =
                state.resources.credits >= upCost.credits &&
                state.resources.crystal >= upCost.crystal
              return (
                <li
                  key={inst.uid}
                  className="flex items-center gap-2 border border-border/50 bg-card/40 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-display text-xs font-600">{d.name}</span>
                      <span className="font-mono text-[10px] text-accent">+{inst.level}</span>
                    </div>
                    <div className="font-mono text-[10px] text-primary/70">
                      {bonusText(itemBonus(inst))}
                    </div>
                    {on ? (
                      <div className="text-[10px] text-muted-foreground">Đang gắn: {on}</div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground/60">Chưa gắn</div>
                    )}
                  </div>
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    title={
                      canUpgrade
                        ? `Nâng cấp: ${formatNum(upCost.credits)}⬡ + ${upCost.crystal}◈`
                        : "Đã tối đa"
                    }
                    disabled={!canUpgrade || !affordUp}
                    onClick={() => dispatch({ type: "UPGRADE_ITEM", uid: inst.uid })}
                  >
                    <ArrowUpCircle className="size-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors",
        active
          ? "border-primary/60 bg-primary/12 text-primary"
          : "border-border/50 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
