"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ArrowRightLeft, Bell, Building2, Crosshair, Flag, Globe2, Map, Megaphone, Shield, Siren, Users, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useGame } from "@/lib/game/store"
import { cn } from "@/lib/utils"
import { Panel, formatNum } from "./shared"

type Nation = "ANI" | "BCU"
const factionMeta = {
  ANI: { name: "Army of Aerial", color: "#4dd7c4", image: "/images/ani-sector-map.png", territory: 38, troops: 12840, fame: 7420, status: "Đang phản công" },
  BCU: { name: "Bygeniou City United", color: "#ff6b78", image: "/images/bcu-sector-map.png", territory: 34, troops: 11420, fame: 6980, status: "Phòng thủ tuyến ngoài" },
} as const

const fleetRows = [
  { id: "ani-01", nation: "ANI" as Nation, name: "Spearhead Vanguard", commander: "Raven-07", ships: 46, power: 18600, state: "Đang giao chiến", avatar: "A" },
  { id: "ani-02", nation: "ANI" as Nation, name: "Skyline Wardens", commander: "Kite", ships: 31, power: 12800, state: "Cho phép gia nhập", avatar: "S" },
  { id: "bcu-01", nation: "BCU" as Nation, name: "Crimson Talon", commander: "Valkyrie", ships: 52, power: 20500, state: "Cần hỗ trợ", avatar: "C" },
  { id: "bcu-02", nation: "BCU" as Nation, name: "Iron Meridian", commander: "Hound", ships: 28, power: 9700, state: "Tuần tra", avatar: "I" },
]

const fronts = [
  { name: "NGC / Helios Rift", type: "Chiến tuyến nóng", progress: 68, note: "Tàu mẹ ARCLIGHT PRIME đang dịch chuyển", tone: "danger" },
  { name: "ANI / K-7 Mining Ring", type: "Cần tiếp viện", progress: 42, note: "3 hạm đội địch đã xuất hiện", tone: "warning" },
  { name: "BCU / Orion Gate", type: "Đang chiếm đóng", progress: 81, note: "Pháo đài vệ tinh sắp thất thủ", tone: "success" },
]

export function WarRoom() {
  const { state, dispatch } = useGame()
  const [nation, setNation] = useState<Nation>("ANI")
  const [fleetFilter, setFleetFilter] = useState<"all" | Nation>("all")
  const [transferred, setTransferred] = useState(false)
  const current = factionMeta[nation]
  const visibleFleets = fleetFilter === "all" ? fleetRows : fleetRows.filter((fleet) => fleet.nation === fleetFilter)
  const simulatedAlert = useMemo(() => fronts[(state.day - 1) % fronts.length], [state.day])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Phòng chiến sự toàn cầu" icon={<Globe2 className="size-4" />} bodyClassName="p-0">
          <div className="relative min-h-[330px] overflow-hidden">
            <img src="/images/ngc-sector-map.png" alt="Bản đồ chiến sự NGC" className="absolute inset-0 h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
            <div className="relative flex min-h-[330px] flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xs uppercase tracking-[0.24em] text-primary">NGC // War theatre</p>
                  <h2 className="mt-1 font-display text-2xl font-800 tracking-wide">Chiến sự đang diễn ra</h2>
                  <p className="mt-1 max-w-md text-xs text-muted-foreground">Mỗi ngày kết thúc, AI sẽ cập nhật tuyến chiếm đóng, quân số và trạng thái các căn cứ.</p>
                </div>
                <div className="flex items-center gap-1.5 border border-destructive/50 bg-destructive/10 px-2 py-1 text-[10px] uppercase tracking-wider text-destructive"><Siren className="size-3" /> Alert level 3</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {fronts.map((front) => <div key={front.name} className="border border-border/60 bg-background/75 p-2 backdrop-blur-sm"><div className="flex items-center justify-between text-[10px]"><span className="truncate font-display uppercase">{front.name}</span><span className={cn(front.tone === "danger" ? "text-destructive" : front.tone === "warning" ? "text-accent" : "text-primary")}>{front.progress}%</span></div><div className="mt-2 h-1 bg-secondary"><div className={cn("h-full", front.tone === "danger" ? "bg-destructive" : front.tone === "warning" ? "bg-accent" : "bg-primary")} style={{ width: `${front.progress}%` }} /></div><p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{front.note}</p></div>)}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Trạng thái quốc gia" icon={<Flag className="size-4" />}>
          <div className="flex flex-col gap-3">
            {(["ANI", "BCU"] as Nation[]).map((key) => { const meta = factionMeta[key]; return <button key={key} onClick={() => setNation(key)} className={cn("flex items-center gap-3 border p-2.5 text-left transition-colors", nation === key ? "border-primary/60 bg-primary/10" : "border-border/50 bg-card/30 hover:bg-card/60")}><span className="flex size-10 items-center justify-center border font-display text-sm font-900" style={{ color: meta.color, borderColor: meta.color }}>{key}</span><div className="min-w-0 flex-1"><div className="flex justify-between"><span className="font-display text-sm font-700">{meta.name}</span><span className="text-[10px] text-muted-foreground">{meta.status}</span></div><div className="mt-1 flex gap-3 font-mono text-[10px] text-muted-foreground"><span>{meta.territory} căn cứ</span><span>{formatNum(meta.troops)} quân</span><span>{formatNum(meta.fame)} fame</span></div></div></button> })}
            <div className="border border-border/50 bg-card/40 p-2.5"><div className="flex items-center gap-2 text-xs font-600"><Building2 className="size-4 text-primary" /> Lịch sử chuyển quốc gia</div><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Bạn đang phục vụ ANI từ ngày 01. Cần đủ 30 ngày hoặc có thẻ công tác để chuyển sang BCU.</p><div className="mt-2 flex items-center justify-between"><span className="font-mono text-[10px] text-accent">Ngày phục vụ: {state.day}/30</span><Button size="sm" variant="outline" disabled={transferred} onClick={() => setTransferred(true)}><ArrowRightLeft className="size-3" />{transferred ? "Đã gửi yêu cầu" : "Mở yêu cầu chuyển"}</Button></div></div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title={`Bản đồ ${nation} // ${current.name}`} icon={<Map className="size-4" />} bodyClassName="p-0">
          <div className="relative aspect-[16/7] overflow-hidden"><img src={current.image} alt={`Bản đồ chiến lược ${nation}`} className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-background/75 via-transparent to-background/30" /><div className="absolute left-4 top-4 border border-border/60 bg-background/70 px-3 py-2 backdrop-blur-sm"><div className="font-display text-lg font-800" style={{ color: current.color }}>{nation}</div><div className="text-[10px] uppercase tracking-widest text-muted-foreground">{current.status}</div></div><div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px] text-muted-foreground"><span>Kiểm soát lãnh thổ {current.territory}%</span><span className="flex items-center gap-1 text-primary"><Zap className="size-3" /> realtime feed</span></div></div>
        </Panel>
        <Panel title="Thông báo chiến sự" icon={<Bell className="size-4" />}>
          <div className="flex flex-col gap-2">{[simulatedAlert, ...fronts].slice(0, 3).map((alert, i) => <div key={`${alert.name}-${i}`} className="flex gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"><span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center", i === 0 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary")}><AlertTriangle className="size-3" /></span><div><p className="text-xs font-600">{alert.name}</p><p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">{alert.note}</p></div></div>)}</div>
          <Button className="mt-3 w-full" variant="outline" onClick={() => dispatch({ type: "NEXT_DAY" })}><Megaphone className="size-3" /> Kết thúc ngày // cập nhật chiến sự</Button>
        </Panel>
      </div>

      <Panel title="Danh sách hạm đội liên quốc gia" icon={<Users className="size-4" />}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex gap-1">{(["all", "ANI", "BCU"] as const).map((filter) => <button key={filter} onClick={() => setFleetFilter(filter)} className={cn("border px-3 py-1.5 text-[10px] font-700 uppercase tracking-wider", fleetFilter === filter ? "border-primary/60 bg-primary/10 text-primary" : "border-border/50 text-muted-foreground")}>{filter === "all" ? "Tất cả hạm đội" : filter}</button>)}</div><span className="text-[10px] text-muted-foreground">Luật gia nhập: rời hạm đội cũ tối thiểu 10 ngày</span></div>
        <div className="grid gap-2 md:grid-cols-2">{visibleFleets.map((fleet) => <div key={fleet.id} className="flex items-center gap-3 border border-border/50 bg-card/30 p-3"><div className="flex size-10 items-center justify-center border font-display text-lg font-800" style={{ color: factionMeta[fleet.nation].color, borderColor: factionMeta[fleet.nation].color }}>{fleet.avatar}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><span className="truncate font-display text-sm font-700">{fleet.name}</span><span className="shrink-0 text-[9px] uppercase tracking-widest" style={{ color: factionMeta[fleet.nation].color }}>{fleet.nation}</span></div><div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground"><span>{fleet.commander}</span><span>{fleet.ships} phi thuyền</span><span>PWR {formatNum(fleet.power)}</span></div><div className="mt-2 flex items-center justify-between"><span className={cn("text-[10px]", fleet.state === "Cần hỗ trợ" ? "text-destructive" : fleet.state === "Đang giao chiến" ? "text-accent" : "text-primary")}>{fleet.state}</span>{fleet.state === "Cho phép gia nhập" && <Button size="sm" variant="ghost" onClick={() => setTransferred(true)}><Shield className="size-3" /> Xin gia nhập</Button>}</div></div></div>)}</div>
      </Panel>
    </div>
  )
}

export function AvatarStrip() { return <div className="relative h-8 w-24 overflow-hidden rounded-sm border border-border/60 bg-card"><img src="/images/pilot-portraits.png" alt="Chân dung phi công" className="h-full w-full object-cover object-left" /><span className="absolute bottom-0 right-1 text-[8px] font-700 text-white drop-shadow">COMMANDER</span></div> }

void Crosshair
void Shield
void Users
void AvatarStrip
