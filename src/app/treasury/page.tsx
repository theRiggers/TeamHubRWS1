
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, FEE_MONTHS } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  TrendingUp, 
  Plus, 
  Loader2, 
  Banknote, 
  Calendar,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
  Check,
  X,
  CreditCard,
  BadgeEuro,
  Info,
  RotateCcw,
  UserCircle,
  Clock,
  CheckCircle2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default function TreasuryPage() {
  const { toast } = useToast()
  const { 
    players, membershipTransactions, membershipFees, totalMannschaftskasse, settings, reimbursements,
    addMembershipTransaction, deleteMembershipTransaction, addMembershipFee, deleteMembershipFee, closeSeason,
    addReimbursement, confirmReimbursement, deleteReimbursement,
    currentUserProfile, loading: storeLoading } = useStore()
  
  const [mounted, setMounted] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<'sponsor' | 'donation' | 'other' | 'expense' | 'reimbursement'>('expense')
  const [targetPlayerId, setTargetPlayerId] = useState<string>("none")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Saisonwechsel am 01.06.
  const currentSeasonYear = currentMonth < 5 ? currentYear - 1 : currentYear;
  const visibleSeasons = [currentSeasonYear, currentSeasonYear - 1, currentSeasonYear - 2];
  const [selectedSeason, setSelectedSeason] = useState(currentSeasonYear.toString())

  useEffect(() => { setMounted(true) }, [])

  const filteredPlayers = useMemo(() => players.filter(p => p.email !== 'kasse@kickoff.de'), [players]);
  const pendingReimbursements = useMemo(() => reimbursements.filter(r => r.status === 'pending'), [reimbursements]);

  if (storeLoading || !mounted) return <div className="flex h-svh items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const isKassenwart = currentUserProfile?.roles?.includes('kassenwart') || currentUserProfile?.roles?.includes('admin')
  if (!currentUserProfile || !isKassenwart) return <div className="flex flex-col items-center justify-center min-h-svh p-4 text-center"><h2 className="text-xl font-bold mb-2">Zugriff verweigert</h2><Button onClick={() => window.location.href = "/"} className="mt-4">Zurück</Button></div>

  const handleToggleFee = (playerId: string, month: number) => {
    const season = parseInt(selectedSeason);
    const existing = membershipFees.find(f => f.playerId === playerId && f.month === month && f.year === season);
    if (existing) deleteMembershipFee(existing.id);
    else addMembershipFee(playerId, 'monthly', season, month);
  };

  const handleToggleAnnual = (playerId: string) => {
    const season = parseInt(selectedSeason);
    const existing = membershipFees.find(f => f.playerId === playerId && f.type === 'annual' && f.year === season);
    if (existing) deleteMembershipFee(existing.id);
    else addMembershipFee(playerId, 'annual', season);
  };

  const handleAddTransaction = async () => {
    const val = parseFloat(amount)
    if (!description || isNaN(val) || val <= 0) { toast({ variant: "destructive", title: "Fehler" }); return; }
    setIsSubmitting(true);
    try {
      if (type === 'reimbursement') {
        if (targetPlayerId === "none") {
          toast({ variant: "destructive", title: "Fehler", description: "Bitte wähle einen Spieler für die Auslage aus." });
          return;
        }
        addReimbursement(targetPlayerId, description, val);
        toast({ title: "Auslage erfasst", description: "Anstehende Rückzahlung wurde vorgemerkt." });
      } else {
        addMembershipTransaction(description, val, type, targetPlayerId === "none" ? undefined : targetPlayerId);
        toast({ title: "Buchung erfolgreich" });
      }
      setIsDialogOpen(false); setDescription(""); setAmount(""); setType("expense"); setTargetPlayerId("none");
    } finally { setIsSubmitting(false) }
  }

  const handleCloseSeason = async () => {
    setIsSubmitting(true);
    try {
      await closeSeason(parseInt(selectedSeason));
      toast({ title: "Saison abgeschlossen" });
    } finally { setIsSubmitting(false) }
  };

  const getIcon = (type: string) => {
    if (type === 'expense') return <ArrowDownCircle className="h-4 w-4 text-destructive" />;
    return <ArrowUpCircle className="h-4 w-4 text-emerald-600" />;
  };

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b sticky top-0 z-20">
          <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2"><TrendingUp className="h-6 w-6" /> Mannschaftskasse</h1>
          <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/20"><span className="text-xs font-bold uppercase text-muted-foreground mr-2">Gesamtstand:</span><span className={cn("text-lg font-black", totalMannschaftskasse < 0 ? 'text-destructive' : 'text-emerald-600')}>{totalMannschaftskasse.toFixed(2)} €</span></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full pb-20">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 rounded-2xl h-12">
              <TabsTrigger value="transactions" className="rounded-xl flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Buchungen</TabsTrigger>
              <TabsTrigger value="fees" className="rounded-xl flex items-center gap-2"><Banknote className="h-4 w-4" /> Beiträge</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {pendingReimbursements.length > 0 && (
                <Card className="border-none shadow-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900 rounded-2xl overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-800 dark:text-amber-400">
                      <Clock className="h-4 w-4" /> Offene Rückzahlungen (Auslagen)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingReimbursements.map((rb) => (
                      <div key={rb.id} className="flex items-center justify-between bg-card p-3 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/50">
                        <div>
                          <p className="text-sm font-bold">{rb.playerName}</p>
                          <p className="text-xs text-muted-foreground">{rb.description}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-amber-700 dark:text-amber-400">-{rb.amount.toFixed(2)} €</span>
                          <Button 
                            size="sm" 
                            className="rounded-lg h-8 bg-amber-600 hover:bg-amber-700 text-xs font-bold"
                            onClick={() => confirmReimbursement(rb.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Auszahlen
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => deleteReimbursement(rb.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-base md:text-lg font-bold flex items-center gap-2"><ArrowUpCircle className="h-5 w-5 text-emerald-600" /> Umsätze</h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-xl h-9 border-amber-600 text-amber-700">
                        <RotateCcw className="h-4 w-4 mr-2" /> Saisonabschluss
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Saison {selectedSeason}/{(parseInt(selectedSeason)+1)%100} abschließen?</AlertDialogTitle>
                        <AlertDialogDescription>Dies berechnet alle unbezahlten Beiträge dieser Saison und bucht sie als Schulden auf die Konten der Spieler.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleCloseSeason} className="bg-amber-600 text-white">Abschließen</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild><Button size="sm" className="rounded-xl red-glow text-white h-9"><Plus className="h-4 w-4 mr-1" /> Buchung</Button></DialogTrigger>
                    <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
                      <DialogHeader><DialogTitle>Einnahme / Ausgabe buchen</DialogTitle><DialogDescription>Erfasse Finanzen der Mannschaftskasse.</DialogDescription></DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2"><Label>Beschreibung</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Z.B. Trikotsatz, Sponsoring..." /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label>Betrag (€)</Label><Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                          <div className="space-y-2">
                            <Label>Typ</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="expense">Reguläre Ausgabe (-)</SelectItem>
                                <SelectItem value="reimbursement">Auslage (Rückzahlung an Spieler)</SelectItem>
                                <SelectItem value="sponsor">Sponsoring (+)</SelectItem>
                                <SelectItem value="donation">Spende (+)</SelectItem>
                                <SelectItem value="other">Sonstiges (+)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Zuordnung {type === 'reimbursement' ? '(Pflicht)' : '(Optional)'}</Label>
                          <Select value={targetPlayerId} onValueChange={setTargetPlayerId}>
                            <SelectTrigger><SelectValue placeholder="Spieler wählen" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Keine Person</SelectItem>
                              {filteredPlayers.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {type === 'reimbursement' && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900 flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                              Hinweis: Auslagen werden erst nach Bestätigung der Rückzahlung vom Kassenstand abgezogen.
                            </p>
                          </div>
                        )}
                      </div>
                      <DialogFooter><Button onClick={handleAddTransaction} disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold">Speichern</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-card">
                <CardContent className="p-0 overflow-x-auto">
                  <Table><TableHeader className="bg-muted/30"><TableRow><TableHead>Datum</TableHead><TableHead>Beschreibung</TableHead><TableHead>Typ</TableHead><TableHead className="text-right">Betrag</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
                    {membershipTransactions.map((tx) => {
                      const target = tx.targetPlayerId ? players.find(p => p.id === tx.targetPlayerId) : null;
                      return (
                        <TableRow key={tx.id} className="hover:bg-muted/20 group">
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(tx.date), 'dd.MM.yyyy')}</TableCell>
                          <TableCell className="font-medium text-sm">{tx.description}{target && <span className="block text-[10px] text-blue-600 uppercase font-bold">Für: {target.name}</span>}</TableCell>
                          <TableCell><div className="flex items-center gap-2">{getIcon(tx.type)}<span className="text-[10px] font-bold uppercase">{tx.type}</span></div></TableCell>
                          <TableCell className={cn("text-right font-black", tx.type === 'expense' ? 'text-destructive' : 'text-emerald-600')}>{tx.type === 'expense' ? '-' : '+'}{tx.amount.toFixed(2)} €</TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteMembershipTransaction(tx.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      )
                    })}
                    {membershipTransactions.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Keine Buchungen vorhanden.</TableCell></TableRow>
                    )}
                  </TableBody></Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="fees" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center"><h3 className="text-lg font-bold flex items-center gap-2"><BadgeEuro className="h-5 w-5 text-blue-600" /> Beitrags-Matrix</h3><Select value={selectedSeason} onValueChange={setSelectedSeason}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{visibleSeasons.map(year => <SelectItem key={year} value={year.toString()}>{year}/{(year+1)%100}</SelectItem>)}</SelectContent></Select></div>
              <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-card"><CardContent className="p-0 overflow-x-auto">
                <Table><TableHeader className="bg-muted/30"><TableRow><TableHead className="min-w-[150px]">Spieler</TableHead><TableHead className="text-center">Jahr</TableHead>{FEE_MONTHS.map(m => <TableHead key={m} className="text-center">{MONTH_NAMES[m]}</TableHead>)}</TableRow></TableHeader><TableBody>
                  {filteredPlayers.map(player => {
                    const season = parseInt(selectedSeason);
                    const playerFees = membershipFees.filter(f => f.playerId === player.id && f.year === season);
                    const isAnnual = playerFees.some(f => f.type === 'annual');
                    return (
                      <TableRow key={player.id} className={cn("hover:bg-muted/10", player.isFeeExempt && "opacity-50 grayscale")}>
                        <TableCell className="font-semibold text-sm">{player.name}</TableCell>
                        <TableCell className="text-center"><Button variant={isAnnual ? "default" : "outline"} size="sm" className={cn("rounded-lg h-8 w-8 p-0", isAnnual && "bg-emerald-600 text-white")} onClick={() => handleToggleAnnual(player.id)}><CreditCard className="h-4 w-4" /></Button></TableCell>
                        {FEE_MONTHS.map(m => {
                          const isPaid = isAnnual || playerFees.some(f => f.type === 'monthly' && f.month === m);
                          return (
                            <TableCell key={m} className="text-center p-1"><Button variant={isPaid ? "default" : "ghost"} size="sm" className={cn("rounded-lg h-7 w-7 p-0", isPaid && !isAnnual ? "bg-emerald-500 text-white" : "", isAnnual && "bg-emerald-200 text-emerald-700")} onClick={() => handleToggleFee(player.id, m)}>{isPaid ? <Check className="h-3 w-3" /> : <X className="h-2 w-2 text-muted-foreground/20" />}</Button></TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody></Table>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
