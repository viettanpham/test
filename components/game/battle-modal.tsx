"use client"

import { Button } from "@/components/ui/button"
import { useGame } from "@/lib/game/store"
import { cn } from "@/lib/utils"
import { Coins, Radar, Skull, Swords, Trophy, Users, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { BattleLogEntry, BattleUnitSnapshot } from "@/lib/game/types"
import { GEAR_COLOR_VAR, RESOURCE_META, formatNum } from "./shared"

const LOG_INTERVAL = 260

const LOG_COLOR: Record<BattleLogEntry["kind"], string> = {
  info: "text-muted-foreground",
  "player-hit": "text-primary",
  "enemy-hit": "text-accent",
  crit: "text-[color:var(--color-gear-b)] font-700",
  down: "text-destructive font-600",
  victory: "text-[color:var(--color-gear-m)] font-700",
  defeat: "text-destructive font-700",
}

export function BattleModal() {
  const { state, dispatch } = useGame()
  const battle = state.lastBattle
  const [shown, setShown] = useState(0)
  const [done, setDone] = useState(false)
  const logRef = useRef<HTMLDivElement>(null)

  // reset animation when a new battle arrives
  useEffect(() => {
    if (!battle) return
    setShown(0)
    setDone(false)
  }, [battle])

  // stream log entries
  useEffect(() => {
    if (!battle) return
    if (shown >= battle.log.length) {
      setDone(true)
      return
    }
    const t = setTimeout(() => setShown((n) => n + 1), LOG_INTERVAL)
    return () => clearTimeout(t)
  }, [battle, shown])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [shown])

  if (!battle) return null

  const skip = () => setShown(battle.log.length)
  const close = () => dispatch({ type: "DISMISS_BATTLE" })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
      <button
        aria-label="Đóng"
        onClick={done ? close : undefined}
        className="absolute inset-0 bg-background/85 backdrop-blur-sm"
      />
      <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden border border-border bg-panel shadow-2xl">
        {/* header */}
        <div
          className={cn(
            "flex items-center justify-between border-b border-border/70 px-4 py-3",
            done && battle.victory && "bg-[color:var(--color-gear-m)]/10",
            done && !battle.victory && "bg-destructive/10",
          )}
        >
          <div className="flex items-center gap-2.5">
            {done ? (
              battle.victory ? (
                <Trophy className="size-5 text-[color:var(--color-gear-m)]" />
              ) : (
                <Skull className="size-5 text-destructive" />
              )
            ) : (
              <Swords className="size-5 animate-pulse text-primary" />
            )}
            <div>
              <h2 className="font-display text-sm font-700 uppercase tracking-widest">
                {done
                  ? battle.victory
                    ? "Chiến thắng"
                    : "Thất bại"
                  : "Đang giao chiến..."}
              </h2>
              <p className="font-mono text-[10px] text-muted-foreground">
                {battle.rounds} lượt · {battle.log.length} sự kiện
              </p>
            </div>
          </div>
          {done && (
            <button
              onClick={close}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Đóng báo cáo"
            >
              <X className="size-5" />
            </button>
          )}
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-[1fr_1.1fr]">
          {/* Forces */}
          <div className="flex flex-col gap-4 border-b border-border/60 p-4 md:border-b-0 md:border-r">
            <ForceColumn
              title="Hạm đội của bạn"
              accent="var(--color-primary)"
              units={battle.playerUnits}
              player
            />
            <ForceColumn
              title="Lực lượng địch"
              accent="var(--color-destructive)"
              units={battle.enemyUnits}
            />
          </div>

          {/* Log */}
          <div className="flex min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              <Radar className="size-3.5" /> Nhật ký giao tranh
            </div>
            <div
              ref={logRef}
              className="min-h-48 flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed md:max-h-[360px]"
            >
              {battle.log.slice(0, shown).map((e, i) => (
                <p key={i} className={cn("py-0.5", LOG_COLOR[e.kind])}>
                  <span className="mr-2 text-muted-foreground/50">
                    [{String(e.turn).padStart(2, "0")}]
                  </span>
                  {e.text}
                </p>
              ))}
              {!done && (
                <span className="inline-block h-3 w-2 animate-pulse bg-primary align-middle" />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {done && battle.victory && battle.reward && (
              <>
                {Object.entries(battle.reward).map(([k, v]) => {
                  const meta = RESOURCE_META[k as keyof typeof RESOURCE_META]
                  const Icon = meta.icon
                  return (
                    <span
                      key={k}
                      className="flex items-center gap-1 font-mono text-xs"
                      style={{ color: meta.color }}
                    >
                      <Icon className="size-3.5" />+{formatNum(v as number)}
                    </span>
                  )
                })}
                {battle.troopReward ? (
                  <span
                    className="flex items-center gap-1 font-mono text-xs"
                    style={{ color: "var(--color-gear-i)" }}
                  >
                    <Users className="size-3.5" />+{battle.troopReward}
                  </span>
                ) : null}
              </>
            )}
            {done && !battle.victory && (
              <span className="text-xs text-muted-foreground">
                Không có chiến lợi phẩm. Nâng cấp hạm đội rồi thử lại.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!done ? (
              <Button variant="outline" size="sm" onClick={skip} className="font-display tracking-wider">
                Bỏ qua
              </Button>
            ) : (
              <Button size="sm" onClick={close} className="font-display tracking-wider">
                Xác nhận
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ForceColumn({
  title,
  accent,
  units,
  player,
}: {
  title: string
  accent: string
  units: BattleUnitSnapshot[]
  player?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="text-[10px] font-600 uppercase tracking-widest"
        style={{ color: accent }}
      >
        {title}
      </div>
      <ul className="flex flex-col gap-1.5">
        {units.map((u) => {
          const pct = (u.hp / u.maxHp) * 100
          const dead = u.hp <= 0
          const color =
            player && u.cls !== "enemy" ? GEAR_COLOR_VAR[u.cls as "A" | "B" | "I" | "M"] : accent
          return (
            <li
              key={u.uid}
              className={cn(
                "border border-border/50 bg-card/40 px-2.5 py-1.5 transition-opacity",
                dead && "opacity-35",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate font-display text-xs font-600">
                  {player && u.cls !== "enemy" && (
                    <span
                      className="flex size-4 items-center justify-center border text-[9px] font-900"
                      style={{ color, borderColor: color }}
                    >
                      {u.cls}
                    </span>
                  )}
                  <span className={cn("truncate", dead && "line-through")}>{u.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {dead ? "K.O." : `${formatNum(u.hp)}/${formatNum(u.maxHp)}`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-secondary/60">
                <div
                  className="h-full transition-[width] duration-300"
                  style={{
                    width: `${Math.max(0, pct)}%`,
                    backgroundColor: pct > 40 ? color : "var(--color-destructive)",
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
