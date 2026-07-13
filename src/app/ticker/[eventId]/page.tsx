"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, TeamEvent, Ticker, TickerEvent, Player, MatchComment } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  ArrowLeft, 
  Trophy, 
  Users, 
  MessageSquare, 
  Clock, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Flag, 
  Replace, 
  CheckCircle2, 
  Radio, 
  Check, 
  X, 
  Send 
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export default function TickerPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const eventId = params.eventId as string

  const [mounted, setMounted] = useState(false)
  const { 
    players, teamEvents, tickers, tickerEvents, matchComments, claimTicker, releaseTicker, finishTicker,
    updateTickerScore, addTickerEvent, deleteTickerEvent, addMatchComment, currentUserProfile, loading 
  } = useStore()

  const [newMinute, setNewMinute] = useState("")
  const [newText, setNewText] = useState("")
  const [newType, setNewType] = useState<TickerEvent['type']>('comment')
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [selectedAssist, setSelectedAssist] = useState("")
  const [playerIn, setPlayerIn] = useState("")
  const [playerOut, setPlayerOut] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [chatMessage, setChatMessage] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [matchComments]);

  const event = useMemo(() => teamEvents.find(e => e.id === eventId), [teamEvents, eventId]);
  
  const ticker = useMemo(() => {
    const found = tickers.find(t => t.id === eventId);
    return {
      id: eventId,
      homeScore: found?.homeScore ?? 0,
      awayScore: found?.awayScore ?? 0,
      operatorId: found?.operatorId ?? null,
      operatorName: found?.operatorName ?? null,
      status: found?.status ?? 'pre',
      updatedAt: found?.updatedAt ?? new Date().toISOString()
    } as Ticker;
  }, [tickers, eventId]);

  const sortedEvents = useMemo(() => 
    tickerEvents.filter(e => e.eventId === eventId)
      .sort((a, b) => b.minute - a.minute || new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [tickerEvents, eventId]
  );

  const filteredComments = useMemo(() => 
    matchComments.filter(c => c.eventId === eventId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [matchComments, eventId]
  );

  if (loading || !mounted) return <div className="flex h-svh items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!event || !currentUserProfile) return null;

  const isOperator = ticker.operatorId === currentUserProfile.id;
  const isAvailable = !ticker.operatorId && ticker.status !== 'finished';
  const isFinished = ticker.status === 'finished';

  const handleAddEvent = async () => {
    const minute = parseInt(newMinute);
    if (isNaN(minute)) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte gib eine gültige Minute an." });
      return;
    }
    setIsSubmitting(true);
    try {
      const p = players.find(x => x.id === selectedPlayer);
      const a = players.find(x => x.id === selectedAssist);
      const pin = players.find(x => x.id === playerIn);
      const pout = players.find(x => x.id === playerOut);

      await addTickerEvent(eventId, {
        type: newType,
        minute,
        playerId: selectedPlayer || undefined,
        playerName: p?.name,
        assistPlayerId: selectedAssist || undefined,
        assistPlayerName: a?.name,
        playerInId: playerIn || undefined,
        playerInName: pin?.name,
        playerOutId: playerOut || undefined,
        playerOutName: pout?.name,
        text: newText || undefined
      });

      if (newType === 'goal') {
        await updateTickerScore(eventId, (ticker.homeScore || 0) + 1, ticker.awayScore || 0);
      } else if (newType === 'goal_opponent') {
        await updateTickerScore(eventId, ticker.homeScore || 0, (ticker.awayScore || 0) + 1);
      }

      setNewMinute(""); setNewText(""); setSelectedPlayer(""); setSelectedAssist(""); setPlayerIn(""); setPlayerOut("");
      toast({ title: "Event hinzugefügt" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatMessage.trim()) return;
    const text = chatMessage.trim();
    setChatMessage("");
    await addMatchComment(eventId, text);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal': return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'goal_opponent': return <X className="h-4 w-4 text-destructive" />;
      case 'sub': return <Replace className="h-4 w-4 text-blue-500" />;
      case 'comment': return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
      case 'status': return <Clock className="h-4 w-4 text-emerald-500" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between px-3 md:px-8 bg-card border-b border-border sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-1.5 md:gap-3 shrink min-w-0">
             <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full shrink-0 h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button>
             <h1 className="text-sm md:text-lg font-bold text-primary font-headline truncate max-w-[110px] md:max-w-none">{event.title}</h1>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            <div className="bg-primary/10 px-2 md:px-3 py-1 rounded-lg md:rounded-xl border border-primary/20 flex items-center gap-1.5 md:gap-2">
              <span className="text-base md:text-lg font-black tracking-tighter whitespace-nowrap">{ticker.homeScore} : {ticker.awayScore}</span>
            </div>
            {isFinished ? (
              <Badge variant="outline" className="h-8 md:h-9 px-2 md:px-3 rounded-lg md:rounded-xl border-emerald-500 text-emerald-600 bg-emerald-50 font-black text-[10px] md:text-xs">ABGEPFIFFEN</Badge>
            ) : isAvailable ? (
              <Button size="sm" onClick={() => claimTicker(eventId)} className="rounded-lg md:rounded-xl h-8 md:h-9 px-2 md:px-4 bg-emerald-600 text-[10px] md:text-xs font-bold"><Radio className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Übernehmen</Button>
            ) : isOperator ? (
              <Button size="sm" variant="outline" onClick={() => releaseTicker(eventId)} className="rounded-lg md:rounded-xl h-8 md:h-9 px-2 md:px-4 text-[10px] md:text-xs font-bold">Freigeben</Button>
            ) : (
              <Badge variant="outline" className="h-8 md:h-9 px-2 md:px-3 rounded-lg md:rounded-xl border-amber-500 text-amber-600 bg-amber-50 text-[10px] md:text-xs font-bold">
                LIVE
              </Badge>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">
          {isOperator && !isFinished && (
            <Card className="border-none shadow-lg rounded-2xl bg-card border-l-4 border-l-primary overflow-hidden mb-6">
              <CardHeader className="bg-primary/5 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-primary" /> Ticker-Konsole</CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-destructive hover:bg-destructive/10 uppercase tracking-widest"><X className="h-3 w-3 mr-1" /> Abpfiff</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Spiel wirklich beenden?</AlertDialogTitle>
                      <AlertDialogDescription>Danach kann der Ticker nicht mehr bedient oder verändert werden.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={() => finishTicker(eventId)} className="bg-destructive text-white rounded-xl">Beenden</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Minute</Label>
                    <Input type="number" placeholder="z.B. 45" value={newMinute} onChange={e => setNewMinute(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Aktionstyp</Label>
                    <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comment">Kommentar</SelectItem>
                        <SelectItem value="goal">Tor RWS2 (+1)</SelectItem>
                        <SelectItem value="goal_opponent">Gegner-Tor (+1)</SelectItem>
                        <SelectItem value="sub">Wechsel RWS2</SelectItem>
                        <SelectItem value="status">Spielstatus (Anpfiff, Pause...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  {newType === 'goal' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Torschütze</Label>
                        <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                          <SelectContent>
                            {players.filter(p => p.email !== 'kasse@kickoff.de').map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Vorlage</Label>
                        <Select value={selectedAssist} onValueChange={setSelectedAssist}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Keine Vorlage</SelectItem>
                            {players.filter(p => p.email !== 'kasse@kickoff.de').map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {newType === 'sub' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Raus</Label>
                        <Select value={playerOut} onValueChange={setPlayerOut}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                          <SelectContent>
                            {players.filter(p => p.email !== 'kasse@kickoff.de').map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rein</Label>
                        <Select value={playerIn} onValueChange={setPlayerIn}>
                          <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                          <SelectContent>
                            {players.filter(p => p.email !== 'kasse@kickoff.de').map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Kommentar / Info</Label>
                    <Input placeholder="Was passiert gerade?" value={newText} onChange={e => setNewText(e.target.value)} className="h-11 rounded-xl" />
                  </div>
                </div>

                <Button onClick={handleAddEvent} disabled={isSubmitting || !newMinute} className="w-full h-12 rounded-xl font-bold red-glow">
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                  Event posten
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* LEFT COLUMN: TICKER (3/5) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Flag className="h-5 w-5 text-primary" /> Live-Verlauf
                </h2>
              </div>

              <div className="relative space-y-4">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border z-0"></div>
                {sortedEvents.map((e) => (
                  <div key={e.id} className="relative z-10 flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border-2 border-background",
                      e.type === 'goal' ? 'bg-yellow-400 text-yellow-950' : 
                      e.type === 'goal_opponent' ? 'bg-destructive text-white' :
                      e.type === 'sub' ? 'bg-blue-500 text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {getEventIcon(e.type)}
                    </div>
                    <Card className="flex-1 border-none shadow-sm rounded-2xl bg-card overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                             <span className="font-black text-sm">{e.minute}'</span>
                             <span className="text-[10px] font-bold uppercase text-muted-foreground">
                               {e.type === 'goal' ? 'Tor!' : e.type === 'goal_opponent' ? 'Gegner-Tor' : e.type === 'sub' ? 'Wechsel' : 'Info'}
                             </span>
                          </div>
                          {e.type === 'goal' && (
                            <div className="space-y-0.5">
                              <p className="font-bold text-base">{e.playerName}</p>
                              {e.assistPlayerName && <p className="text-xs text-muted-foreground">V: {e.assistPlayerName}</p>}
                            </div>
                          )}
                          {e.type === 'goal_opponent' && (
                            <p className="font-bold text-base text-destructive">Tor für den Gegner</p>
                          )}
                          {e.type === 'sub' && (
                            <div className="flex flex-col gap-0.5 text-sm font-medium">
                              <span className="text-destructive flex items-center gap-1"><X className="h-3 w-3" /> OUT: {e.playerOutName}</span>
                              <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> IN: {e.playerInName}</span>
                            </div>
                          )}
                          {e.text && <p className="text-sm font-medium leading-relaxed">{e.text}</p>}
                        </div>
                        {isOperator && !isFinished && (
                          <Button variant="ghost" size="icon" onClick={() => deleteTickerEvent(eventId, e)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))}
                {sortedEvents.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground italic bg-muted/20 rounded-3xl border-2 border-dashed">
                    Noch keine Ticker-Einträge vorhanden.
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: TEAM CHAT (2/5) */}
            <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" /> Team-Chat
                </h2>
                <Badge variant="outline" className="text-[8px] bg-muted/50 border-none font-bold">LIVE</Badge>
              </div>

              <Card className="border-none shadow-xl rounded-3xl bg-card overflow-hidden h-[500px] flex flex-col border border-border/50">
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {filteredComments.map((c) => (
                        <div key={c.id} className={cn(
                          "flex flex-col max-w-[85%]",
                          c.playerId === currentUserProfile.id ? "ml-auto items-end" : "items-start"
                        )}>
                          <span className="text-[9px] font-bold text-muted-foreground px-2 mb-1">
                            {c.playerName} • {format(new Date(c.timestamp), 'HH:mm')}
                          </span>
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm",
                            c.playerId === currentUserProfile.id 
                              ? "bg-primary text-white rounded-tr-none" 
                              : "bg-muted rounded-tl-none"
                          )}>
                            {c.text}
                          </div>
                        </div>
                      ))}
                      {filteredComments.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 py-20">
                          <div className="p-4 bg-muted rounded-full">
                            <MessageSquare className="h-8 w-8 opacity-20" />
                          </div>
                          <p className="text-sm italic">Schreib die erste Nachricht!</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <div className="p-4 bg-muted/30 border-t border-border flex gap-2">
                  <Input 
                    placeholder="Nachricht schreiben..." 
                    className="rounded-xl h-11 border-none shadow-inner bg-card focus-visible:ring-1 focus-visible:ring-primary" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  />
                  <Button size="icon" className="h-11 w-11 rounded-xl shrink-0 red-glow shadow-md transition-transform active:scale-90" onClick={handleSendChat} disabled={!chatMessage.trim()}>
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </Card>
              <p className="text-[10px] text-center text-muted-foreground px-4 leading-relaxed">
                Der Chat ist temporär und wird am Tag nach dem Spiel automatisch gelöscht.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
