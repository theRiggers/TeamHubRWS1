
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, TeamEvent, Attendance } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2, Calendar, Users, Info, ChevronLeft, ChevronRight, BarChart3, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isBefore, startOfDay } from "date-fns"
import { de } from "date-fns/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function AttendancePage() {
  const [mounted, setMounted] = useState(false)
  const { players, teamEvents, attendance, updatePlayerAttendance, loading, currentUserProfile } = useStore()
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Saisonwechsel am 01.06.
  const currentSeasonYear = currentMonth < 5 ? currentYear - 1 : currentYear;
  const visibleSeasons = [currentSeasonYear, currentSeasonYear - 1];
  
  const [selectedSeason, setSelectedSeason] = useState(currentSeasonYear.toString())

  useEffect(() => { setMounted(true) }, [])

  const filteredPlayers = useMemo(() => players.filter(p => p.email !== 'kasse@kickoff.de'), [players]);

  const seasonEvents = useMemo(() => {
    const seasonStart = new Date(parseInt(selectedSeason), 5, 1); // 1. Juni
    const seasonEnd = new Date(parseInt(selectedSeason) + 1, 4, 31, 23, 59, 59); // 31. Mai
    
    return teamEvents
      .filter(e => {
        const d = new Date(e.date);
        return d >= seasonStart && d <= seasonEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [teamEvents, selectedSeason]);

  if (loading || !mounted) {
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

  const handleToggleAttendance = async (eventId: string, playerId: string, playerName: string, currentStatus: string | undefined) => {
    if (!isCoach) return;
    
    let nextStatus: 'going' | 'declined' | null = 'going';
    if (currentStatus === 'going') nextStatus = 'declined';
    else if (currentStatus === 'declined') nextStatus = null;
    
    await updatePlayerAttendance(eventId, playerId, playerName, nextStatus);
  };

  const getAttendanceStats = (playerId: string) => {
    const playerAttendance = attendance.filter(a => a.playerId === playerId);
    const pastSeasonEvents = seasonEvents.filter(e => isBefore(new Date(e.date), new Date()));
    
    if (pastSeasonEvents.length === 0) return { count: 0, total: 0, percent: 0 };
    
    const count = pastSeasonEvents.filter(e => {
      const a = playerAttendance.find(att => att.eventId === e.id);
      return a?.status === 'going';
    }).length;

    return {
      count,
      total: pastSeasonEvents.length,
      percent: Math.round((count / pastSeasonEvents.length) * 100)
    };
  };

  const SeasonSelector = ({ variant = "default" }: { variant?: "default" | "mobile" }) => (
    <div className={cn("flex items-center gap-2", variant === "mobile" && "mr-2")}>
      <Select value={selectedSeason} onValueChange={setSelectedSeason}>
        <SelectTrigger className={cn("rounded-xl h-10", variant === "mobile" ? "w-28 text-[10px]" : "w-40 text-sm")}>
          <SelectValue placeholder="Saison" />
        </SelectTrigger>
        <SelectContent>
          {visibleSeasons.map(year => (
            <SelectItem key={year} value={year.toString()}>
              Saison {year}/{(year + 1) % 100}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger 
        userRoles={currentUserProfile.roles} 
        rightElement={<SeasonSelector variant="mobile" />} 
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border">
          <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
            <Users className="h-6 w-6" /> Anwesenheitsstatistik
          </h1>
          <SeasonSelector />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="md:hidden mb-4">
            <h1 className="text-2xl font-bold text-primary font-headline">Anwesenheit</h1>
          </div>

          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <BarChart3 className="h-6 w-6" />
                    Saison-Matrix
                  </CardTitle>
                  <CardDescription>Klicke auf die Felder, um die Anwesenheit zu bearbeiten.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="min-w-[180px] font-bold text-xs sticky left-0 bg-card z-10 border-r">Spieler</TableHead>
                    <TableHead className="text-center font-bold text-xs px-4">Quote</TableHead>
                    {seasonEvents.map(event => (
                      <TableHead key={event.id} className="text-center font-bold px-2 text-[10px] min-w-[60px] whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <span>{format(new Date(event.date), 'dd.MM.', { locale: de })}</span>
                          <span className={cn(
                            "px-1 rounded-[4px] mt-0.5",
                            event.type === 'training' ? 'bg-blue-100 text-blue-700' : 
                            event.type === 'match' ? 'bg-primary/10 text-primary' : 'bg-emerald-100 text-emerald-700'
                          )}>
                            {event.type === 'training' ? 'T' : event.type === 'match' ? 'S' : 'E'}
                          </span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map(player => {
                    const stats = getAttendanceStats(player.id);
                    return (
                      <TableRow key={player.id} className="hover:bg-muted/10 group">
                        <TableCell className="font-semibold py-4 whitespace-nowrap text-sm sticky left-0 bg-card z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          {player.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                             <span className={cn(
                               "text-xs font-black",
                               stats.percent >= 75 ? "text-emerald-600" : stats.percent >= 50 ? "text-amber-600" : "text-destructive"
                             )}>
                               {stats.percent}%
                             </span>
                             <span className="text-[9px] text-muted-foreground">{stats.count}/{stats.total}</span>
                          </div>
                        </TableCell>
                        {seasonEvents.map(event => {
                          const att = attendance.find(a => a.eventId === event.id && a.playerId === player.id);
                          const isPast = isBefore(new Date(event.date), new Date());
                          
                          return (
                            <TableCell key={event.id} className="text-center p-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className={cn(
                                        "rounded-lg h-9 w-9 p-0 transition-all",
                                        att?.status === 'going' ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : 
                                        att?.status === 'declined' ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : 
                                        "hover:bg-muted",
                                        !isPast && "opacity-40"
                                      )}
                                      onClick={() => handleToggleAttendance(event.id, player.id, player.name, att?.status)}
                                    >
                                      {att?.status === 'going' ? <Check className="h-4 w-4" /> : 
                                       att?.status === 'declined' ? <X className="h-4 w-4" /> : 
                                       <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p className="font-bold">{event.title}</p>
                                      <p>{player.name}: {att?.status === 'going' ? 'Anwesend' : att?.status === 'declined' ? 'Abgesagt' : 'Keine Info'}</p>
                                      {att?.reason && (
                                        <div className="flex items-start gap-1 text-[10px] text-muted-foreground italic border-t pt-1 mt-1">
                                          <MessageSquare className="h-2.5 w-2.5 mt-0.5" />
                                          <span>{att.reason}</span>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
             <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold">T</div>
                <div>
                   <p className="text-xs font-bold text-blue-700">Training</p>
                   <p className="text-[10px] text-blue-600/70">Wöchentliche Einheiten</p>
                </div>
             </div>
             <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">S</div>
                <div>
                   <p className="text-xs font-bold text-primary">Spiel</p>
                   <p className="text-[10px] text-primary/70">Meisterschaft & Testspiele</p>
                </div>
             </div>
             <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold">E</div>
                <div>
                   <p className="text-xs font-bold text-emerald-700">Event</p>
                   <p className="text-[10px] text-emerald-600/70">Mannschaftsabende etc.</p>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  )
}
