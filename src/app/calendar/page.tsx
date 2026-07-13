
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, TeamEvent, Attendance, Player } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Plus, Trash2, Loader2, Trophy, Users, Info, MapPin, Clock, CalendarDays, Pencil, Download, Check, X, MessageSquare, Eye, UserCircle, LayoutGrid, Radio } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, startOfDay, addDays, getDay, parseISO, isBefore } from "date-fns"
import { de } from "date-fns/locale"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { downloadIcsFile } from "@/lib/calendar-export"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"

const WEEKDAYS = [
  { id: 1, name: "Montag", short: "Mo" },
  { id: 2, name: "Dienstag", short: "Di" },
  { id: 3, name: "Mittwoch", short: "Mi" },
  { id: 4, name: "Donnerstag", short: "Do" },
  { id: 5, name: "Freitag", short: "Fr" },
  { id: 6, name: "Samstag", short: "Sa" },
  { id: 0, name: "Sonntag", short: "So" },
]

export default function CalendarPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const { players, teamEvents, attendance, lineups, addTeamEvent, updateTeamEvent, deleteTeamEvent, upsertAttendance, updatePlayerAttendance, currentUserProfile, settings, loading: storeLoading } = useStore()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [newType, setNewType] = useState<'training' | 'match' | 'social'>('training')
  const [newLocation, setNewLocation] = useState("")
  
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkTitle, setBulkTitle] = useState("Training")
  const [bulkLocation, setBulkLocation] = useState("")
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])
  const [weekdayTimes, setWeekdayTimes] = useState<Record<number, string>>({})
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState("")

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TeamEvent | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDate, setEditDate] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editType, setEditType] = useState<'training' | 'match' | 'social'>('training')
  const [editLocation, setEditLocation] = useState("")
  
  const [isDeclineOpen, setIsDeclineOpen] = useState(false)
  const [declineEventId, setDeclineEventId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState("")

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsEvent, setDetailsEvent] = useState<TeamEvent | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const upcomingEvents = useMemo(() => {
    return teamEvents.filter(e => isAfter(new Date(e.date), startOfDay(new Date())))
  }, [teamEvents]);

  if (storeLoading || !mounted) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isEditor = currentUserProfile?.roles?.some(r => ['admin', 'coach', 'assistant_coach'].includes(r))

  const handleExportAll = () => {
    if (upcomingEvents.length === 0) {
      toast({ variant: "destructive", title: "Keine Termine", description: "Es gibt keine anstehenden Termine zum Exportieren." })
      return;
    }
    downloadIcsFile(upcomingEvents, 'rws2-kalender.ics')
    toast({ title: "Export gestartet", description: "Die Kalender-Datei wird heruntergeladen." })
  }

  const handleExportSingle = (event: TeamEvent) => {
    downloadIcsFile([event], `termin-${format(new Date(event.date), 'yyyy-MM-dd')}.ics`)
    toast({ title: "Termin exportiert" })
  }

  const handleAddEvent = async () => {
    if (!newTitle || !newDate || !newTime) return
    setIsSubmitting(true)
    try {
      const combinedDate = new Date(`${newDate}T${newTime}`)
      await addTeamEvent({
        title: newTitle,
        type: newType,
        date: combinedDate.toISOString(),
        location: newLocation,
      })
      setIsAddOpen(false)
      setNewTitle(""); setNewDate(""); setNewTime(""); setNewType("training"); setNewLocation("")
      toast({ title: "Termin hinzugefügt" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditEvent = async () => {
    if (!editingEvent || !editTitle || !editDate || !editTime) return
    setIsSubmitting(true)
    try {
      const combinedDate = new Date(`${editDate}T${editTime}`)
      await updateTeamEvent(editingEvent.id, {
        title: editTitle,
        type: editType,
        date: combinedDate.toISOString(),
        location: editLocation,
      })
      setIsEditOpen(false)
      setEditingEvent(null)
      toast({ title: "Termin aktualisiert" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (event: TeamEvent) => {
    const d = new Date(event.date);
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditDate(format(d, 'yyyy-MM-dd'));
    setEditTime(format(d, 'HH:mm'));
    setEditType(event.type);
    setEditLocation(event.location || "");
    setIsEditOpen(true);
  }

  const openDetailsDialog = (event: TeamEvent) => {
    setDetailsEvent(event);
    setIsDetailsOpen(true);
  }

  const handleBulkAdd = async () => {
    if (selectedWeekdays.length === 0 || !bulkTitle || !startDate || !endDate) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte fülle alle Felder aus." })
      return
    }
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    if (isAfter(start, end)) {
      toast({ variant: "destructive", title: "Fehler", description: "Enddatum muss nach dem Startdatum liegen." })
      return
    }
    setIsSubmitting(true)
    let count = 0
    try {
      let current = start
      while (isBefore(current, addDays(end, 1))) {
        const dayIdx = getDay(current)
        if (selectedWeekdays.includes(dayIdx)) {
          const time = weekdayTimes[dayIdx] || "19:00"
          const dateStr = format(current, 'yyyy-MM-dd')
          await addTeamEvent({
            title: bulkTitle,
            type: 'training',
            date: new Date(`${dateStr}T${time}`).toISOString(),
            location: bulkLocation,
          })
          count++
        }
        current = addDays(current, 1)
      }
      setIsBulkOpen(false)
      setSelectedWeekdays([])
      setWeekdayTimes({})
      setEndDate("")
      toast({ title: "Erfolg", description: `${count} Trainingstermine wurden erstellt.` })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleWeekday = (id: number) => {
    setSelectedWeekdays(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id])
    if (!weekdayTimes[id]) setWeekdayTimes(prev => ({ ...prev, [id]: "19:00" }))
  }

  const handleDeclineClick = (eventId: string) => {
    setDeclineEventId(eventId)
    setDeclineReason("")
    setIsDeclineOpen(true)
  }

  const confirmDecline = async () => {
    if (!declineEventId || !declineReason.trim()) return
    await upsertAttendance(declineEventId, 'declined', declineReason)
    setIsDeclineOpen(false)
    toast({ title: "Absage gespeichert" })
  }

  const handleAdminStatusToggle = async (eventId: string, player: Player, currentStatus: string | undefined) => {
    if (!isEditor) return;
    const nextStatus = currentStatus === 'going' ? 'declined' : 'going';
    await updatePlayerAttendance(eventId, player.id, player.name, nextStatus);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'training': return <Users className="h-4 w-4" />;
      case 'match': return <Trophy className="h-4 w-4" />;
      case 'social': return <Info className="h-4 w-4" />;
      default: return <CalendarIcon className="h-4 w-4" />;
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'training': return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900";
      case 'match': return "bg-primary/10 text-primary border-primary/20";
      case 'social': return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
      default: return "bg-muted text-muted-foreground";
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile?.roles} />
      <MobileNavTrigger userRoles={currentUserProfile?.roles} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border sticky top-0 z-20">
          <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" /> Teamkalender
          </h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleExportAll} className="rounded-xl border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20">
              <Download className="h-4 w-4 mr-2" /> Kalender exportieren
            </Button>
            {isEditor && (
              <>
                <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="rounded-xl border-blue-600 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                      <CalendarDays className="h-4 w-4 mr-2" /> Serientermine
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] md:max-w-2xl rounded-3xl h-[85vh] md:h-auto flex flex-col p-0 overflow-hidden shadow-2xl bg-card">
                    <DialogHeader className="p-6 pb-2 shrink-0 border-b">
                      <DialogTitle className="text-xl md:text-2xl">Serientermine erstellen</DialogTitle>
                      <DialogDescription>Erstelle Trainings automatisch für einen Zeitraum.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1">
                      <div className="p-6 space-y-8">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2"><Label>Titel</Label><Input value={bulkTitle} onChange={e => setBulkTitle(e.target.value)} className="rounded-xl" /></div>
                          <div className="space-y-2"><Label>Ort (Optional)</Label><Input value={bulkLocation} onChange={e => setBulkLocation(e.target.value)} className="rounded-xl" /></div>
                        </div>
                        <div className="space-y-4">
                          <Label className="text-sm font-bold">1. Trainingstage wählen</Label>
                          <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map((day) => (
                              <Button key={day.id} variant={selectedWeekdays.includes(day.id) ? "default" : "outline"} className={cn("h-12 w-12 rounded-xl", selectedWeekdays.includes(day.id) ? "bg-blue-600 text-white" : "")} onClick={() => toggleWeekday(day.id)}>{day.short}</Button>
                            ))}
                          </div>
                        </div>
                        {selectedWeekdays.length > 0 && (
                          <div className="space-y-4">
                            <Label className="text-sm font-bold">2. Uhrzeiten festlegen</Label>
                            <div className="grid gap-3 sm:grid-cols-2">
                              {WEEKDAYS.filter(d => selectedWeekdays.includes(d.id)).map(day => (
                                <div key={day.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
                                  <span className="text-sm font-bold">{day.name}</span>
                                  <Input type="time" className="w-28 h-9" value={weekdayTimes[day.id] || "19:00"} onChange={(e) => setWeekdayTimes(prev => ({ ...prev, [day.id]: e.target.value }))}/>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-4">
                          <Label className="text-sm font-bold">3. Zeitraum festlegen</Label>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2"><Label>Start</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                            <div className="space-y-2"><Label>Ende</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 bg-muted/50 border-t">
                      <Button onClick={handleBulkAdd} disabled={isSubmitting || selectedWeekdays.length === 0 || !endDate} className="w-full h-12 rounded-2xl font-bold red-glow">Termine generieren</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button className="red-glow rounded-xl" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4 mr-2" /> Einzeltermin</Button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full pb-20">
          <div className="md:hidden flex flex-col gap-4 mb-4">
            <h1 className="text-2xl font-bold text-primary font-headline">Teamkalender</h1>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={handleExportAll} className="flex-1 rounded-xl text-xs border-blue-600 h-10"><Download className="h-3 w-3 mr-1" /> Exportieren</Button>
              {isEditor && <Button size="sm" className="flex-1 rounded-xl text-xs h-10" onClick={() => setIsAddOpen(true)}><Plus className="h-3 w-3 mr-1" /> Termin</Button>}
            </div>
          </div>

          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <Card className="border-none shadow-sm bg-muted/20"><CardContent className="p-8 text-center text-muted-foreground italic">Keine Termine geplant.</CardContent></Card>
            ) : (
              upcomingEvents.map((event) => {
                const userAttendance = attendance.find(a => a.eventId === event.id && a.playerId === currentUserProfile?.id)
                const eventAttendance = attendance.filter(a => a.eventId === event.id)
                const goingCount = eventAttendance.filter(a => a.status === 'going').length
                const declinedCount = eventAttendance.filter(a => a.status === 'declined').length

                return (
                  <Card key={event.id} className="border-none shadow-md rounded-2xl overflow-hidden hover:shadow-lg transition-shadow bg-card">
                    <div className="flex flex-col md:flex-row h-full">
                      <div className={cn("w-full md:w-2 h-2 md:h-auto", event.type === 'training' ? 'bg-blue-500' : event.type === 'match' ? 'bg-primary' : 'bg-emerald-500')}></div>
                      <div className="flex-1 flex flex-col">
                        <CardContent className="p-4 md:p-6 flex items-center justify-between">
                          <div className="flex items-center gap-4 md:gap-6">
                            <div className="text-center min-w-[60px]">
                              <p className="text-[10px] uppercase font-bold text-muted-foreground">{format(new Date(event.date), 'EEE', { locale: de })}</p>
                              <p className="text-xl font-bold">{format(new Date(event.date), 'dd')}</p>
                              <p className="text-[10px] font-medium">{format(new Date(event.date), 'MMM', { locale: de })}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                 <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", getTypeColor(event.type))}>
                                   {getTypeIcon(event.type)}
                                   <span className="ml-1 uppercase">{event.type === 'training' ? 'Training' : event.type === 'match' ? 'Spiel' : 'Event'}</span>
                                 </span>
                                 <Button variant="ghost" className="h-auto p-1 px-2 flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 rounded-lg" onClick={() => openDetailsDialog(event)}>
                                   <span className="flex items-center gap-0.5 text-emerald-600"><Check className="h-3 w-3" /> {goingCount}</span>
                                   <span className="flex items-center gap-0.5 text-destructive"><X className="h-3 w-3" /> {declinedCount}</span>
                                 </Button>
                              </div>
                              <h3 className="font-bold text-base md:text-lg">{event.title}</h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(event.date), 'HH:mm')}</span>
                                {event.location && (
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                  >
                                    <MapPin className="h-3 w-3" /> {event.location}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {event.type === 'match' && (
                              <div className="flex gap-1">
                                <Link href={`/ticker/${event.id}`}>
                                  <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" title="Live Ticker"><Radio className="h-4 w-4" /></Button>
                                </Link>
                                {isEditor && (
                                  <Link href={`/lineups/${event.id}`}>
                                    <Button variant="ghost" size="icon" className="text-emerald-600" title="Aufstellung"><LayoutGrid className="h-4 w-4" /></Button>
                                  </Link>
                                )}
                              </div>
                            )}
                            {isEditor && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)} className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteTeamEvent(event.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="px-4 md:px-6 pb-4 pt-4 border-t border-muted/30 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-1">
                            <Button size="sm" className={cn("rounded-xl font-bold flex-1 md:flex-none", userAttendance?.status === 'going' ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground")} onClick={() => upsertAttendance(event.id, 'going')}><Check className="h-4 w-4 mr-1" /> Zusage</Button>
                            <Button size="sm" variant="outline" className={cn("rounded-xl font-bold flex-1 md:flex-none", userAttendance?.status === 'declined' ? "bg-destructive text-white border-none" : "border-destructive text-destructive")} onClick={() => handleDeclineClick(event.id)}><X className="h-4 w-4 mr-1" /> Absage</Button>
                          </div>
                          {userAttendance?.status === 'declined' && userAttendance.reason && (
                            <div className="hidden md:flex items-center gap-2 text-[10px] text-muted-foreground italic bg-muted/30 px-3 py-1.5 rounded-lg border">
                              <MessageSquare className="h-3 w-3" /> {userAttendance.reason}
                            </div>
                          )}
                        </CardFooter>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader><DialogTitle>Neuer Termin</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Titel</Label><Input placeholder="Z.B. Training" value={newTitle} onChange={e => setNewTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Datum</Label><Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Uhrzeit</Label><Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="match">Spiel</SelectItem>
                    <SelectItem value="social">Mannschaftsabend / Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Ort (Optional)</Label><Input placeholder="Z.B. Kunstrasen" value={newLocation} onChange={e => setNewLocation(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={handleAddEvent} disabled={isSubmitting} className="w-full rounded-xl">Speichern</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader><DialogTitle>Termin bearbeiten</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2"><Label>Titel</Label><Input value={editTitle} onChange={e => setEditTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Datum</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Uhrzeit</Label><Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={editType} onValueChange={(v: any) => setEditType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="match">Spiel</SelectItem>
                    <SelectItem value="social">Mannschaftsabend / Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Ort (Optional)</Label><Input value={editLocation} onChange={e => setEditLocation(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={handleEditEvent} disabled={isSubmitting} className="w-full rounded-xl">Speichern</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader><DialogTitle>Termin absagen</DialogTitle><DialogDescription>Bitte gib einen Grund an.</DialogDescription></DialogHeader>
            <div className="py-4"><Textarea placeholder="Grund..." value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} className="rounded-xl h-24" /></div>
            <DialogFooter><Button onClick={confirmDecline} disabled={!declineReason.trim()} className="w-full rounded-xl bg-destructive text-white h-12">Absage bestätigen</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-[95vw] md:max-w-lg rounded-3xl p-0 overflow-hidden bg-card">
            <DialogHeader className="p-6 pb-2"><DialogTitle className="text-xl">{detailsEvent?.title}</DialogTitle><DialogDescription>Übersicht</DialogDescription></DialogHeader>
            <ScrollArea className="max-h-[60vh] px-6 pb-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-emerald-600 flex items-center gap-2 mb-3"><Check className="h-4 w-4" /> Zusagen</h4>
                  <div className="grid gap-2">
                    {players.filter(p => p.email !== 'kasse@kickoff.de').map(player => {
                      const att = attendance.find(a => a.eventId === detailsEvent?.id && a.playerId === player.id);
                      if (att?.status !== 'going') return null;
                      return (
                        <div key={player.id} className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900 text-sm font-medium flex items-center justify-between group">
                          <span>{player.name}</span>
                          {isEditor && <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleAdminStatusToggle(detailsEvent!.id, player, 'going')}><X className="h-3 w-3 text-destructive" /></Button>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-bold text-destructive flex items-center gap-2 mb-3"><X className="h-4 w-4" /> Absagen</h4>
                  <div className="grid gap-2">
                    {players.filter(p => p.email !== 'kasse@kickoff.de').map(player => {
                      const att = attendance.find(a => a.eventId === detailsEvent?.id && a.playerId === player.id);
                      if (att?.status !== 'declined') return null;
                      return (
                        <div key={player.id} className="p-3 rounded-xl bg-destructive/5 border border-destructive/10 space-y-1 group relative">
                          <div className="flex items-center justify-between">
                             <p className="text-sm font-bold">{player.name}</p>
                             {isEditor && <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleAdminStatusToggle(detailsEvent!.id, player, 'declined')}><Check className="h-3 w-3 text-emerald-600" /></Button>}
                          </div>
                          {att.reason && <p className="text-xs text-muted-foreground flex items-start gap-1.5 italic"><MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />{att.reason}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>
            <div className="p-4 bg-muted/30 border-t flex justify-end"><Button onClick={() => setIsDetailsOpen(false)} className="rounded-xl">Schließen</Button></div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
