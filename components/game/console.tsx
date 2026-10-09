"use client"

import { cn } from "@/lib/utils"
import { GameProvider } from "@/lib/game/store"
import { Boxes, Flag, LayoutDashboard, Radar, Rocket, Warehouse } from "lucide-react"
import { useState } from "react"
import { BasePanel } from "./base-panel"
import { BattleModal } from "./battle-modal"
import { Dashboard } from "./dashboard"
import { EquipmentPanel } from "./equipment-panel"
import { FleetPanel } from "./fleet-panel"
import { HudBar } from "./hud-bar"
import { MapPanel } from "./map-panel"
import { WarRoom } from "./war-room"

type Tab = "dashboard" | "fleet" | "equipment" | "base" | "map" | "war"

const NAV: { id: Tab; label: string; icon: typeof Radar }[] = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "fleet", label: "Hạm đội", icon: Rocket },
  { id: "equipment", label: "Trang bị", icon: Boxes },
  { id: "base", label: "Căn cứ", icon: Warehouse },
  { id: "map", label: "Infinity", icon: Radar },
  { id: "war", label: "Chiến sự", icon: Flag },
]

export function GameConsole() {
  return (
    <GameProvider>
      <div className="min-h-screen">
        <HudBar />
        <ConsoleBody />
        <BattleModal />
      </div>
    </GameProvider>
  )
}

function ConsoleBody() {
  const [tab, setTab] = useState<Tab>("dashboard")

  return (
    <div className="mx-auto flex max-w-[1600px] gap-0">
      {/* Nav rail */}
      <nav className="sticky top-[57px] z-20 flex h-[calc(100vh-57px)] w-16 shrink-0 flex-col gap-1 border-r border-border/70 bg-panel/50 p-2 md:w-44">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors",
                active
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 bg-primary" />
              )}
              <Icon className="size-5 shrink-0" />
              <span className="hidden font-display text-xs font-600 tracking-wider uppercase md:inline">
                {item.label}
              </span>
            </button>
          )
        })}
        <div className="mt-auto hidden px-3 py-2 md:block">
          <p className="text-[9px] leading-relaxed text-muted-foreground/70">
            Điều binh, nâng cấp căn cứ và chiếm lĩnh các khu vực trong hệ sao.
          </p>
        </div>
      </nav>

      {/* Content */}
      <main className="min-w-0 flex-1 p-3 md:p-5">
        {tab === "dashboard" && <Dashboard onNavigate={setTab} />}
        {tab === "fleet" && <FleetPanel />}
        {tab === "equipment" && <EquipmentPanel />}
        {tab === "base" && <BasePanel />}
        {tab === "map" && <MapPanel />}
        {tab === "war" && <WarRoom />}
      </main>
    </div>
  )
}

export type { Tab }
