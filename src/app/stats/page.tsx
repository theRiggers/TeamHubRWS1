
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, TickerEvent } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Medal, Loader2, Users, Goal, Handshake, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function StatsPage() {
  const [mounted, setMounted] = useState(false)
  const { tickerEvents, players, currentUserProfile, loading } = useStore()
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  
  // Saisonwechsel am 01.06.
  const currentSeasonYear = currentMonth < 5 ? currentYear - 1 : currentYear;
  const [selectedSeason, setSelectedSeason] = useState(currentSeasonYear.toString())

  useEffect(() => { setMounted(true) }, [])

  const stats = useMemo(() => {
    const seasonStart = new Date(parseInt(selectedSeason), 5, 1)
    const seasonEnd = new Date(parseInt(selectedSeason) + 1, 4, 31, 23, 59, 59)
    
    const goalMap = new Map<string, { id: string, name: string, count: number }>()
    const assistMap = new Map<string, { id: string, name: string, count: number }>()

    tickerEvents.forEach(e => {
      const eventDate = new Date(e.timestamp)
      if (eventDate < seasonStart || eventDate > seasonEnd) return

      if (e.type === 'goal' && e.playerId) {
        const entry = goalMap.get(e.playerId) || { id: e.playerId, name: e.playerName || "Unbekannt", count: 0 }
        entry.count += 1
        goalMap.set(e.playerId, entry)
        
        if (e.assistPlayerId && e.assistPlayerId !== "none") {
          const aEntry = assistMap.get(e.assistPlayerId) || { id: e.assistPlayerId, name: e.assistPlayerName || "Unbekannt", count: 0 }
          aEntry.count += 1
          assistMap.set(e.assistPlayerId, aEntry)
        }
      }
    })

    return {
      goals: Array.from(goalMap.values()).sort((a, b) => b.count - a.count).slice(0, 15),
      assists: Array.from(assistMap.values()).sort((a, b) => b.count - a.count).slice(0, 15)
    }
  }, [tickerEvents, selectedSeason])

  if (loading || !mounted) return <div className="flex h-svh items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!currentUserProfile) return null

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border sticky top-0 z-20">
          <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
            <Trophy className="h-6 w-6" /> Leistungsstatistiken
          </h1>
          <div className="flex items-center gap-3">
             <Calendar className="h-4 w-4 text-muted-foreground" />
             <Select value={selectedSeason} onValueChange={setSelectedSeason}>
               <SelectTrigger className="w-40 rounded-xl">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value={currentSeasonYear.toString()}>{currentSeasonYear}/{(currentSeasonYear+1)%100}</SelectItem>
                 <SelectItem value={(currentSeasonYear-1).toString()}>{(currentSeasonYear-1)}/{currentSeasonYear%100}</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full pb-20">
          <div className="md:hidden flex flex-col gap-4 mb-4">
             <h1 className="text-2xl font-bold text-primary font-headline">Statistiken</h1>
             <Select value={selectedSeason} onValueChange={setSelectedSeason}>
               <SelectTrigger className="w-full rounded-xl h-12"><SelectValue /></SelectTrigger>
               <SelectContent>
                 <SelectItem value={currentSeasonYear.toString()}>{currentSeasonYear}/{(currentSeasonYear+1)%100}</SelectItem>
                 <SelectItem value={(currentSeasonYear-1).toString()}>{(currentSeasonYear-1)}/{currentSeasonYear%100}</SelectItem>
               </SelectContent>
             </Select>
          </div>

          <Tabs defaultValue="goals" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 rounded-2xl h-12">
              <TabsTrigger value="goals" className="rounded-xl flex items-center gap-2">
                <Goal className="h-4 w-4" /> Torjäger
              </TabsTrigger>
              <TabsTrigger value="assists" className="rounded-xl flex items-center gap-2">
                <Handshake className="h-4 w-4" /> Vorlagengeber
              </TabsTrigger>
            </TabsList>

            <TabsContent value="goals" className="space-y-4 animate-in fade-in duration-300">
               <div className="grid gap-3">
                 {stats.goals.map((p, idx) => (
                   <Card key={p.id} className={cn(
                     "border-none shadow-md rounded-2xl overflow-hidden transition-all",
                     idx === 0 ? "bg-yellow-400/10 border-l-4 border-l-yellow-400" : "bg-card"
                   )}>
                     <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className={cn(
                           "h-10 w-10 rounded-xl flex items-center justify-center font-black",
                           idx === 0 ? "bg-yellow-400 text-yellow-950" : 
                           idx === 1 ? "bg-slate-300 text-slate-700" : 
                           idx === 2 ? "bg-amber-600 text-amber-50" : "bg-muted text-muted-foreground"
                         )}>
                           {idx + 1}
                         </div>
                         <div>
                           <p className="font-bold text-sm">{p.name}</p>
                           <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tore</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className="text-2xl font-black">{p.count}</span>
                          {idx < 3 && <Medal className={cn("h-5 w-5", idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : "text-amber-700")} />}
                       </div>
                     </CardContent>
                   </Card>
                 ))}
                 {stats.goals.length === 0 && (
                   <p className="text-center py-12 text-muted-foreground italic">Noch keine Tore in dieser Saison erfasst.</p>
                 )}
               </div>
            </TabsContent>

            <TabsContent value="assists" className="space-y-4 animate-in fade-in duration-300">
               <div className="grid gap-3">
                 {stats.assists.map((p, idx) => (
                   <Card key={p.id} className={cn(
                     "border-none shadow-md rounded-2xl overflow-hidden transition-all",
                     idx === 0 ? "bg-blue-500/10 border-l-4 border-l-blue-500" : "bg-card"
                   )}>
                     <CardContent className="p-4 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                         <div className={cn(
                           "h-10 w-10 rounded-xl flex items-center justify-center font-black",
                           idx === 0 ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                         )}>
                           {idx + 1}
                         </div>
                         <div>
                           <p className="font-bold text-sm">{p.name}</p>
                           <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Vorlagen</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                          <span className="text-2xl font-black">{p.count}</span>
                          {idx < 3 && <Handshake className={cn("h-5 w-5", idx === 0 ? "text-blue-500" : "text-muted-foreground/50")} />}
                       </div>
                     </CardContent>
                   </Card>
                 ))}
                 {stats.assists.length === 0 && (
                   <p className="text-center py-12 text-muted-foreground italic">Noch keine Vorlagen in dieser Saison erfasst.</p>
                 )}
               </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
