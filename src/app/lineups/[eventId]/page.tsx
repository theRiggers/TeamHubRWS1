"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, Player, LineupPosition } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, Save, Plus, X, Users, Trophy, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { de } from "date-fns/locale"

const FORMATIONS = [
  { 
    id: "4-3-3", 
    label: "4-3-3", 
    positions: [
      { id: "gk", label: "TW", top: "85%", left: "50%" },
      { id: "lb", label: "LV", top: "65%", left: "15%" },
      { id: "cb1", label: "IV", top: "70%", left: "38%" },
      { id: "cb2", label: "IV", top: "70%", left: "62%" },
      { id: "rb", label: "RV", top: "65%", left: "85%" },
      { id: "cm1", label: "ZM", top: "45%", left: "25%" },
      { id: "cdm", label: "DM", top: "52%", left: "50%" },
      { id: "cm2", label: "ZM", top: "45%", left: "75%" },
      { id: "lw", label: "LA", top: "18%", left: "20%" },
      { id: "st", label: "MS", top: "15%", left: "50%" },
      { id: "rw", label: "RA", top: "18%", left: "80%" },
    ]
  },
  { 
    id: "5-4-1", 
    label: "5-4-1", 
    positions: [
      { id: "gk", label: "TW", top: "85%", left: "50%" },
      { id: "lwb", label: "LAV", top: "62%", left: "12%" },
      { id: "cb1", label: "IV", top: "72%", left: "32%" },
      { id: "cb2", label: "IV", top: "75%", left: "50%" },
      { id: "cb3", label: "IV", top: "72%", left: "68%" },
      { id: "rwb", label: "RAV", top: "62%", left: "88%" },
      { id: "lm", label: "LM", top: "40%", left: "20%" },
      { id: "cm1", label: "ZM", top: "42%", left: "42%" },
      { id: "cm2", label: "ZM", top: "42%", left: "58%" },
      { id: "rm", label: "RM", top: "40%", left: "80%" },
      { id: "st", label: "ST", top: "15%", left: "50%" },
    ]
  },
  { 
    id: "3-4-3", 
    label: "3-4-3", 
    positions: [
      { id: "gk", label: "TW", top: "85%", left: "50%" },
      { id: "cb1", label: "IV", top: "72%", left: "25%" },
      { id: "cb2", label: "IV", top: "75%", left: "50%" },
      { id: "cb3", label: "IV", top: "72%", left: "75%" },
      { id: "lm", label: "LM", top: "45%", left: "15%" },
      { id: "cm1", label: "ZM", top: "48%", left: "38%" },
      { id: "cm2", label: "ZM", top: "48%", left: "62%" },
      { id: "rm", label: "RM", top: "45%", left: "85%" },
      { id: "lw", label: "LA", top: "18%", left: "25%" },
      { id: "st", label: "MS", top: "15%", left: "50%" },
      { id: "rw", label: "RA", top: "18%", left: "75%" },
    ]
  }
];

export default function LineupPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const eventId = params.eventId as string
  
  const [mounted, setMounted] = useState(false)
  const { players, teamEvents, attendance, lineups, upsertLineup, currentUserProfile, loading: storeLoading } = useStore()
  
  const [selectedFormationId, setSelectedFormationId] = useState("4-3-3")
  const [startingEleven, setStartingEleven] = useState<LineupPosition[]>([])
  const [substitutes, setSubstitutes] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const currentEvent = useMemo(() => teamEvents.find(e => e.id === eventId), [teamEvents, eventId]);
  const currentLineup = useMemo(() => lineups.find(l => l.eventId === eventId), [lineups, eventId]);
  
  const availablePlayers = useMemo(() => {
    const goingIds = attendance.filter(a => a.eventId === eventId && a.status === 'going').map(a => a.playerId);
    return players.filter(p => goingIds.includes(p.id));
  }, [players, attendance, eventId]);

  useEffect(() => {
    if (currentLineup) {
      setSelectedFormationId(currentLineup.formation);
      setStartingEleven(currentLineup.startingEleven);
      setSubstitutes(currentLineup.substitutes);
    }
  }, [currentLineup]);

  if (storeLoading || !mounted) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isAdmin = currentUserProfile?.roles.includes('admin')
  const isCoach = currentUserProfile?.roles.some(r => ['coach', 'assistant_coach'].includes(r)) || isAdmin

  if (!currentUserProfile || !isCoach) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Zugriff verweigert</h2>
        <Button onClick={() => window.location.href = "/"} className="mt-4">Zurück</Button>
      </div>
    )
  }

  if (!currentEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Termin nicht gefunden</h2>
        <Button onClick={() => router.push("/calendar")} className="mt-4">Zum Kalender</Button>
      </div>
    )
  }

  const currentFormation = FORMATIONS.find(f => f.id === selectedFormationId) || FORMATIONS[0];

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await upsertLineup(eventId, {
        formation: selectedFormationId,
        startingEleven,
        substitutes
      })
      toast({ title: "Aufstellung gespeichert" })
    } finally {
      setIsSaving(false)
    }
  }

  const togglePlayerOnPosition = (posId: string, playerId: string) => {
    const newLineup = startingEleven.filter(p => p.playerId !== playerId && p.positionId !== posId);
    const newBench = substitutes.filter(id => id !== playerId);

    if (playerId !== "none") {
      newLineup.push({ positionId: posId, playerId });
    }
    
    setStartingEleven(newLineup);
    setSubstitutes(newBench);
  }

  const addSubstitute = (playerId: string) => {
    if (substitutes.includes(playerId)) return;
    
    const newStarting = startingEleven.filter(p => p.playerId !== playerId);
    setStartingEleven(newStarting);
    setSubstitutes(prev => [...prev, playerId]);
  }

  const removeSubstitute = (playerId: string) => {
    setSubstitutes(prev => prev.filter(id => id !== playerId));
  }

  const getPlayerOnPosition = (posId: string) => {
    const entry = startingEleven.find(p => p.positionId === posId);
    return entry ? players.find(p => p.id === entry.playerId) : null;
  }

  const unusedPlayers = availablePlayers.filter(p => 
    !startingEleven.some(s => s.playerId === p.id) && 
    !substitutes.includes(p.id)
  );

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
               <ArrowLeft className="h-5 w-5" />
             </Button>
             <div>
               <h1 className="text-xl font-bold text-primary font-headline">Aufstellung: {currentEvent.title}</h1>
               <p className="text-[10px] text-muted-foreground uppercase font-bold">{format(new Date(currentEvent.date), 'EEEE, dd. MMMM', { locale: de })}</p>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <Select value={selectedFormationId} onValueChange={setSelectedFormationId}>
               <SelectTrigger className="w-32 h-10 rounded-xl">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 {FORMATIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
               </SelectContent>
             </Select>
             <Button onClick={handleSave} disabled={isSaving} className="rounded-xl h-10 red-glow">
               {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
               Speichern
             </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24">
          <div className="md:hidden flex flex-col gap-4 mb-6">
             <div className="flex items-center gap-3">
               <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10">
                 <ArrowLeft className="h-6 w-6" />
               </Button>
               <h1 className="text-xl font-bold font-headline">{currentEvent.title}</h1>
             </div>
             <div className="flex items-center gap-2">
                <Select value={selectedFormationId} onValueChange={setSelectedFormationId}>
                  <SelectTrigger className="flex-1 h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATIONS.map(f => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={handleSave} disabled={isSaving} className="h-12 w-12 rounded-xl red-glow">
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </Button>
             </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-emerald-700/10 dark:bg-emerald-950/20 relative aspect-[2/3] md:aspect-[3/4] max-w-2xl mx-auto border-4 border-emerald-600/30">
                <div className="absolute inset-0 pointer-events-none opacity-20">
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[15%] border-b-2 border-x-2 border-white"></div>
                   <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-[15%] border-t-2 border-x-2 border-white"></div>
                   <div className="absolute top-1/2 left-0 right-0 h-px bg-white"></div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white"></div>
                </div>

                {currentFormation.positions.map((pos) => {
                  const player = getPlayerOnPosition(pos.id);
                  return (
                    <div 
                      key={pos.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group"
                      style={{ top: pos.top, left: pos.left }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <Select 
                          value={player?.id || "none"} 
                          onValueChange={(val) => togglePlayerOnPosition(pos.id, val)}
                        >
                          <SelectTrigger className={cn(
                            "w-12 h-12 md:w-16 md:h-16 rounded-full p-0 flex items-center justify-center text-xs font-black shadow-lg transition-all",
                            player ? "bg-primary text-white border-2 border-white" : "bg-white/50 backdrop-blur-sm border-2 border-dashed border-primary/30 text-primary/50"
                          )}>
                             <span className="sr-only">{pos.label}</span>
                             <div className="flex flex-col items-center">
                               {player ? (
                                 <span className="text-[10px] md:text-xs">{player.name.substring(0, 10)}</span>
                               ) : (
                                 <Plus className="h-4 w-4" />
                               )}
                             </div>
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="none">Kein Spieler</SelectItem>
                            {availablePlayers.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="bg-black/50 text-white text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {pos.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </Card>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900 flex items-center gap-3">
                 <Info className="h-5 w-5 text-blue-600" />
                 <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">Es werden nur Spieler angezeigt, die für diesen Termin zugesagt haben.</p>
              </div>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" /> Ersatzbank
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    {substitutes.map(subId => {
                      const player = players.find(p => p.id === subId);
                      return (
                        <div key={subId} className="p-3 bg-muted/30 rounded-xl flex items-center justify-between group border">
                          <span className="font-bold text-sm">{player?.name}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeSubstitute(subId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    {substitutes.length === 0 && (
                      <p className="text-center py-6 text-muted-foreground italic text-xs">Noch keine Ersatzspieler ausgewählt.</p>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Ersatz hinzufügen</Label>
                    <Select onValueChange={addSubstitute}>
                      <SelectTrigger className="mt-1 h-11 rounded-xl">
                        <SelectValue placeholder="Spieler wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {unusedPlayers.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-amber-500/10">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-amber-600" /> Verfügbare Spieler ({unusedPlayers.length})
                  </CardTitle>
                  <CardDescription>Zusagen, noch nicht in Aufstellung.</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 max-h-[300px] overflow-y-auto">
                  <div className="grid gap-2">
                    {unusedPlayers.map(p => (
                      <div key={p.id} className="p-2 rounded-lg bg-muted/20 text-xs font-medium border">
                        {p.name}
                      </div>
                    ))}
                    {unusedPlayers.length === 0 && (
                      <p className="text-center py-4 text-muted-foreground italic text-xs">Alle Spieler verplant.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
