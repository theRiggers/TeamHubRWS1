"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, Absence } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  PlaneTakeoff, 
  Plus, 
  Trash2, 
  Loader2, 
  Calendar, 
  History, 
  AlertCircle,
  Stethoscope,
  Umbrella,
  Briefcase,
  UserX,
  Users,
  Search,
  Filter,
  Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isBefore, isAfter, startOfDay, endOfDay, isWithinInterval, startOfMonth, endOfMonth } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const ABSENCE_TYPES = [
  { id: 'vacation', label: 'Urlaub', icon: <Umbrella className="h-4 w-4" /> },
  { id: 'injury', label: 'Verletzung', icon: <UserX className="h-4 w-4" /> },
  { id: 'illness', label: 'Krankheit', icon: <Stethoscope className="h-4 w-4" /> },
  { id: 'work', label: 'Arbeit', icon: <Briefcase className="h-4 w-4" /> },
  { id: 'other', label: 'Sonstiges', icon: <AlertCircle className="h-4 w-4" /> },
] as const;

export default function AbsencesPage() {
  const { toast } = useToast()
  const { absences, addAbsence, deleteAbsence, currentUserProfile, loading: storeLoading } = useStore()
  const [mounted, setMounted] = useState(false)
  
  // Personal Form State
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [type, setType] = useState<typeof ABSENCE_TYPES[number]['id']>('vacation')
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Admin Filter State
  const [filterStart, setFilterStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [filterEnd, setFilterEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

  useEffect(() => { setMounted(true) }, [])

  const isEditor = currentUserProfile?.roles?.some(r => ['admin', 'coach', 'assistant_coach'].includes(r))

  const myAbsences = useMemo(() => {
    if (!currentUserProfile) return [];
    return absences
      .filter(a => a.playerId === currentUserProfile.id)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [absences, currentUserProfile]);

  const teamAbsences = useMemo(() => {
    if (!isEditor) return [];
    const fs = startOfDay(new Date(filterStart));
    const fe = endOfDay(new Date(filterEnd));

    return absences
      .filter(abs => {
        const absStart = startOfDay(new Date(abs.startDate));
        const absEnd = endOfDay(new Date(abs.endDate));
        // Check if absence interval overlaps with filter interval
        return (absStart <= fe && absEnd >= fs);
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [absences, isEditor, filterStart, filterEnd]);

  if (storeLoading || !mounted) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!currentUserProfile) return null;

  const handleAddAbsence = async () => {
    if (!startDate || !endDate) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte wähle ein Start- und Enddatum aus." });
      return;
    }

    if (isAfter(new Date(startDate), new Date(endDate))) {
      toast({ variant: "destructive", title: "Fehler", description: "Das Enddatum muss nach dem Startdatum liegen." });
      return;
    }

    setIsSubmitting(true);
    try {
      await addAbsence({
        startDate,
        endDate,
        type,
        reason: reason.trim() || undefined,
      });
      setStartDate("");
      setEndDate("");
      setReason("");
      toast({ title: "Abwesenheit gespeichert", description: "Du wurdest für diesen Zeitraum automatisch von allen Terminen abgemeldet." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getAbsenceIcon = (type: string) => {
    return ABSENCE_TYPES.find(t => t.id === type)?.icon || <AlertCircle className="h-4 w-4" />;
  }

  const getAbsenceLabel = (type: string) => {
    return ABSENCE_TYPES.find(t => t.id === type)?.label || type;
  }

  const handleExportCsv = () => {
    if (teamAbsences.length === 0) {
      toast({ variant: "destructive", title: "Keine Daten", description: "Es gibt keine Abwesenheiten im gewählten Zeitraum zum Exportieren." });
      return;
    }

    const headers = ["Spieler", "Von", "Bis", "Typ", "Bemerkung"];
    const rows = teamAbsences.map(abs => [
      abs.playerName,
      format(new Date(abs.startDate), 'dd.MM.yyyy'),
      format(new Date(abs.endDate), 'dd.MM.yyyy'),
      getAbsenceLabel(abs.type),
      abs.reason || ""
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Abwesenheiten_${filterStart}_bis_${filterEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export erfolgreich", description: "Die CSV-Datei wurde heruntergeladen." });
  };

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border">
          <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
            <PlaneTakeoff className="h-6 w-6" /> Abwesenheiten
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-6xl mx-auto w-full pb-20">
          <div className="md:hidden mb-4">
            <h1 className="text-2xl font-bold text-primary font-headline">Abwesenheiten</h1>
          </div>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className={cn("grid w-full h-12 rounded-xl mb-8", isEditor ? "grid-cols-2" : "grid-cols-1")}>
              <TabsTrigger value="personal" className="rounded-lg gap-2">
                <History className="h-4 w-4" /> Meine Liste
              </TabsTrigger>
              {isEditor && (
                <TabsTrigger value="team" className="rounded-lg gap-2">
                  <Users className="h-4 w-4" /> Team-Übersicht
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="personal" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-primary/5">
                  <CardTitle className="text-lg">Neue Abwesenheit eintragen</CardTitle>
                  <CardDescription>Trage hier Zeiträume ein, in denen du nicht teilnehmen kannst.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid gap-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Von (Inklusive)</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-xl h-12 pl-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Bis (Inklusive)</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-xl h-12 pl-10" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Grund / Typ</Label>
                      <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger className="rounded-xl h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ABSENCE_TYPES.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                {t.icon}
                                <span>{t.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Bemerkung (Optional)</Label>
                      <Input placeholder="Z.B. Kreuzbandriss, Montage..." value={reason} onChange={e => setReason(e.target.value)} className="rounded-xl h-12" />
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      Hinweis: Durch das Speichern wirst du automatisch für alle Termine in diesem Zeitraum abgemeldet. Bestehende Zusagen werden überschrieben.
                    </p>
                  </div>

                  <Button onClick={handleAddAbsence} disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold text-base shadow-lg red-glow">
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                    Abwesenheit speichern
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2 px-1">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Meine Abwesenheiten
                </h3>
                
                <div className="grid gap-3">
                  {myAbsences.map((abs) => {
                    const now = new Date();
                    const isCurrent = isWithinInterval(now, { 
                      start: startOfDay(new Date(abs.startDate)), 
                      end: endOfDay(new Date(abs.endDate)) 
                    });
                    const isPast = isBefore(endOfDay(new Date(abs.endDate)), now);

                    return (
                      <Card key={abs.id} className={cn(
                        "border-none shadow-md rounded-2xl overflow-hidden transition-all",
                        isCurrent ? "border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10" : 
                        isPast ? "opacity-60 bg-muted/20" : "bg-card"
                      )}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center",
                              isCurrent ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                            )}>
                              {getAbsenceIcon(abs.type)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm">{format(new Date(abs.startDate), 'dd.MM.')} - {format(new Date(abs.endDate), 'dd.MM.yyyy')}</p>
                                {isCurrent && <Badge className="bg-emerald-600 text-white text-[8px] h-4">AKTUELL</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {getAbsenceLabel(abs.type)} {abs.reason && `• ${abs.reason}`}
                              </p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => deleteAbsence(abs.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {myAbsences.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">
                      Bisher keine Abwesenheiten eingetragen.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {isEditor && (
              <TabsContent value="team" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-card">
                  <CardHeader className="bg-blue-50/50 dark:bg-blue-900/10 border-b">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="h-5 w-5 text-blue-600" />
                          Team-Abwesenheiten
                        </CardTitle>
                        <CardDescription>Übersicht aller gemeldeten Zeiträume.</CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 bg-card p-2 rounded-xl border shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                           <div className="space-y-1">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Zeitraum von</Label>
                             <Input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="h-8 text-xs rounded-lg" />
                           </div>
                           <div className="space-y-1">
                             <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">bis</Label>
                             <Input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="h-8 text-xs rounded-lg" />
                           </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-10 rounded-lg text-xs gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          onClick={handleExportCsv}
                        >
                          <Download className="h-4 w-4" />
                          Export (CSV)
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="font-bold text-xs">Spieler</TableHead>
                            <TableHead className="font-bold text-xs">Von</TableHead>
                            <TableHead className="font-bold text-xs">Bis</TableHead>
                            <TableHead className="font-bold text-xs">Grund</TableHead>
                            <TableHead className="font-bold text-xs">Bemerkung</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamAbsences.map((abs) => {
                            const now = new Date();
                            const isCurrent = isWithinInterval(now, { 
                              start: startOfDay(new Date(abs.startDate)), 
                              end: endOfDay(new Date(abs.endDate)) 
                            });
                            const isPast = isBefore(endOfDay(new Date(abs.endDate)), now);

                            return (
                              <TableRow key={abs.id} className={cn(
                                "hover:bg-muted/10",
                                isCurrent && "bg-emerald-50/20 dark:bg-emerald-950/10 border-l-4 border-l-emerald-500",
                                isPast && "opacity-50 grayscale"
                              )}>
                                <TableCell className="font-bold text-sm">
                                  {abs.playerName}
                                  {isCurrent && <Badge className="ml-2 bg-emerald-600 text-[8px] h-4">AKTUELL</Badge>}
                                </TableCell>
                                <TableCell className="text-xs">{format(new Date(abs.startDate), 'dd.MM.yyyy')}</TableCell>
                                <TableCell className="text-xs">{format(new Date(abs.endDate), 'dd.MM.yyyy')}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5 text-xs font-medium">
                                    {getAbsenceIcon(abs.type)}
                                    {getAbsenceLabel(abs.type)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground italic">
                                  {abs.reason || '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {teamAbsences.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">
                                Keine Abwesenheiten im gewählten Zeitraum gefunden.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  )
}
