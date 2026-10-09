"use client"

import { Button } from "@/components/ui/button"
import { fleetPower } from "@/lib/game/engine"
import { useGame } from "@/lib/game/store"
import { CalendarClock, Radar, Rocket, Users } from "lucide-react"
import { useState } from "react"
import { AvatarStrip } from "./war-room"
import { RESOURCE_META, ResourcePill, formatNum } from "./shared"
import type { ResourceKey } from "@/lib/game/types"

const RES_ORDER: ResourceKey[] = ["credits", "alloy", "energy", "crystal"]

export function HudBar() {
  const { state, dispatch } = useGame()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(state.commander)
  const power = fleetPower(state.gears, state.inventory)

  return (
    <header className="scanline sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center border border-primary/50 bg-primary/10 text-primary clip-corner">
            <Rocket className="size-5" />
          </div>
          <div className="leading-none">
            <div className="font-display text-sm font-900 tracking-[0.2em] text-foreground text-glow">
              STELLAR COMMAND
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              ACE Fleet Operations
            </div>
          </div>
        </div>

        {/* Commander */}
        <div className="hidden items-center gap-2 border-l border-border/60 pl-6 md:flex">
          <AvatarStrip />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Chỉ huy
          </span>
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                dispatch({ type: "SET_COMMANDER", name })
                setEditing(false)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  dispatch({ type: "SET_COMMANDER", name })
                  setEditing(false)
                }
              }}
              className="w-28 rounded-sm border border-input bg-input/40 px-2 py-0.5 font-display text-sm text-foreground outline-none focus:border-primary"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="font-display text-sm font-700 text-primary hover:underline"
            >
              {state.commander}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <Stat icon={<CalendarClock className="size-3.5 text-primary" />} label="Ngày">
            {state.day}
          </Stat>
          <Stat icon={<Users className="size-3.5 text-accent" />} label="Quân số">
            {formatNum(state.army)}/{formatNum(state.armyCap)}
          </Stat>
          <Stat icon={<Radar className="size-3.5 text-primary" />} label="Sức mạnh">
            {formatNum(power)}
          </Stat>
        </div>

        {/* Resources + action */}
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-3 rounded-sm border border-border/60 bg-card/60 px-3 py-1.5">
            {RES_ORDER.map((k) => (
              <div key={k} className="flex items-center gap-1" title={RESOURCE_META[k].label}>
                <ResourcePill k={k} amount={state.resources[k]} />
              </div>
            ))}
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => dispatch({ type: "NEXT_DAY" })}
            className="font-display tracking-wider"
          >
            <CalendarClock className="size-3.5" />
            Kết thúc ngày
          </Button>
        </div>
      </div>
    </header>
  )
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="font-mono font-600 tabular-nums text-foreground">{children}</span>
    </div>
  )
}
