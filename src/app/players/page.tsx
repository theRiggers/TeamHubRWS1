"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, Role, Player, FEE_MONTHS } from "@/lib/store"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus, UserCircle, ChevronRight, Loader2, Trash2, Banknote, Share2, TrendingUp, Beer, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const AVAILABLE_ROLES: { id: Role, label: string }[] = [
  { id: 'player', label: 'Spieler' },
  { id: 'coach', label: 'Trainer' },
  { id: 'assistant_coach', label: 'Co-Trainer' },
  { id: 'admin', label: 'Admin' },
  { id: 'kassenwart', label: 'Kassenwart' },
  { id: 'strafenwart', label: 'Strafenwart' },
];

export default function PlayersPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const { players, membershipFees, settings, addPlayer, updatePlayer, deletePlayer, recordPayment, loading, currentUserProfile } = useStore()
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRoles, setNewRoles] = useState<Role[]>(["player"])
  const [newIsExempt, setNewIsExempt] = useState(false)

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRoles, setEditRoles] = useState<Role[]>([])
  const [editIsExempt, setEditIsExempt] = useState(false)

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null)

  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentPlayer, setPaymentPlayer] = useState<Player | null>(null)
  const [paymentAccount, setPaymentAccount] = useState<'drinks' | 'treasury'>('drinks')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const getFullTreasuryBalance = (player: Player) => {
    const baseBalance = player.treasuryBalance || 0;
    if (player.isFeeExempt) return baseBalance;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Saisonwechsel am 1. Juni
    const seasonYear = currentMonth < 5 ? currentYear - 1 : currentYear;
    
    const playerFees = membershipFees.filter(f => f.playerId === player.id && f.year === seasonYear);
    if (playerFees.some(f => f.type === 'annual')) return baseBalance;

    const currentMIdxInList = FEE_MONTHS.indexOf(currentMonth);
    let monthsToPay = 0;
    if (currentMIdxInList !== -1) {
      monthsToPay = currentMIdxInList + 1;
    } else {
      // In der Sommerpause (Juni/Juli) wird für die NEUE Saison noch kein Beitrag fällig
      monthsToPay = 0;
    }

    const paidCount = playerFees.filter(f => f.type === 'monthly').length;
    const unpaidFees = Math.max(0, monthsToPay - paidCount) * settings.monthlyFee;
    return baseBalance - unpaidFees;
  };

  if (loading || !mounted) return <div className="flex h-svh items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!currentUserProfile) return null;

  const isAdmin = currentUserProfile.roles?.includes('admin')
  const isKassenwart = currentUserProfile.roles?.includes('kassenwart') || isAdmin

  if (!isAdmin && !isKassenwart) return <div className="flex flex-col items-center justify-center min-h-svh p-4 text-center"><h2 className="text-xl font-bold mb-2">Zugriff verweigert</h2><Button onClick={() => window.location.href = "/"} className="mt-4">Zurück</Button></div>

  const displayPlayers = players.filter(p => p.email !== 'kasse@kickoff.de')

  const handleAddPlayer = async () => {
    if (!newName || !newEmail || newRoles.length === 0) return
    await addPlayer(newName, newEmail, newRoles, undefined, newIsExempt)
    setIsAddOpen(false); setNewName(""); setNewEmail(""); setNewRoles(["player"]); setNewIsExempt(false)
    toast({ title: "Erfolgreich" })
  }

  const savePlayerChanges = () => {
    if (!editingPlayer || !editName || !editEmail || editRoles.length === 0) return
    updatePlayer(editingPlayer.id, { name: editName, email: editEmail, roles: editRoles, isFeeExempt: editIsExempt })
    setIsEditOpen(false); toast({ title: "Aktualisiert" })
  }

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return
    try {
      await deletePlayer(playerToDelete.id); toast({ title: "Spieler gelöscht" })
    } finally {
      setIsDeleteConfirmOpen(false); setPlayerToDelete(null)
    }
  }

  const handleRecordPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentPlayer || isNaN(amount) || amount <= 0) return;
    setIsSubmitting(true);
    try {
      await recordPayment(paymentPlayer.id, amount, paymentAccount);
      setIsPaymentOpen(false); setPaymentAmount(""); setPaymentPlayer(null); setPaymentAccount('drinks');
      toast({ title: "Zahlung verbucht" });
    } finally { setIsSubmitting(false) }
  }

  const exportDebtList = (type: 'all' | 'drinks' | 'treasury') => {
    const debtors = players.filter(p => {
      const tb = getFullTreasuryBalance(p);
      if (type === 'all') return ((p.balance || 0) < 0 || tb < 0);
      if (type === 'drinks') return (p.balance || 0) < 0;
      if (type === 'treasury') return tb < 0;
      return false;
    }).filter(p => p.email !== 'kasse@kickoff.de');

    if (debtors.length === 0) { toast({ title: "Keine Schulden" }); return; }

    const dateStr = format(new Date(), 'dd.MM.yyyy', { locale: de });
    const title = type === 'drinks' ? 'Bierliste' : type === 'treasury' ? 'Mannschaftskasse' : 'Offene Schulden';
    let text = `🍻 *${title} - RWS2*\n(Stand: ${dateStr})\n\n`;

    debtors.sort((a, b) => ((a.balance || 0) + getFullTreasuryBalance(a)) - ((b.balance || 0) + getFullTreasuryBalance(b))).forEach(p => {
      const tb = getFullTreasuryBalance(p);
      text += `• ${p.name}:\n`;
      if ((type === 'all' || type === 'drinks') && (p.balance || 0) < 0) text += `  - Bierliste: ${(p.balance || 0).toFixed(2).replace('.', ',')} €\n`;
      if ((type === 'all' || type === 'treasury') && tb < 0) text += `  - Mannschaftskasse: ${tb.toFixed(2).replace('.', ',')} €\n`;
      text += `\n`;
    });
    navigator.clipboard.writeText(text); toast({ title: "Liste kopiert" });
  };

  const toggleRole = (role: Role, list: Role[], setter: (roles: Role[]) => void) => {
    if (list.includes(role)) { if (list.length > 1) setter(list.filter(r => r !== role)) }
    else setter([...list, role]);
  }

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b sticky top-0 z-20">
          <h1 className="text-2xl font-bold text-primary font-headline">Spieler & Konten</h1>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                  <Share2 className="h-4 w-4 mr-2" /> Schuldenliste exportieren <ChevronDown className="h-3 w-3 ml-2 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl w-56">
                <DropdownMenuItem onClick={() => exportDebtList('all')} className="gap-2"><TrendingUp className="h-4 w-4" /> Alles zusammen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDebtList('drinks')} className="gap-2"><Beer className="h-4 w-4" /> Nur Bierliste</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDebtList('treasury')} className="gap-2"><Banknote className="h-4 w-4" /> Nur Mannschaftskasse</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isAdmin && (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild><Button className="red-glow rounded-xl"><UserPlus className="h-4 w-4 mr-2" /> Neuer Spieler</Button></DialogTrigger>
                <DialogContent className="max-w-md bg-card">
                  <DialogHeader><DialogTitle>Neuer Spieler</DialogTitle></DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="space-y-2"><Label>Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>E-Mail</Label><Input value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
                    <div className="p-3 bg-muted/30 rounded-xl flex items-center justify-between border">
                      <div className="space-y-0.5"><Label className="text-sm font-bold">Beitragsbefreiung</Label><p className="text-[10px] text-muted-foreground">Zahlt keine Beiträge.</p></div>
                      <Switch checked={newIsExempt} onCheckedChange={setNewIsExempt} />
                    </div>
                    <div className="space-y-3">
                      <Label>Rollen</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {AVAILABLE_ROLES.map(role => (
                          <div key={role.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50"><Checkbox id={`role-${role.id}`} checked={newRoles.includes(role.id)} onCheckedChange={() => toggleRole(role.id, newRoles, setNewRoles)}/><label htmlFor={`role-${role.id}`} className="text-xs font-medium cursor-pointer flex-1">{role.label}</label></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter><Button onClick={handleAddPlayer} className="w-full h-11 rounded-xl">Anlegen</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <div className="md:hidden flex flex-col gap-4 mb-4">
            <div className="flex justify-between items-center"><h1 className="text-2xl font-bold text-primary font-headline">Spieler</h1>{isAdmin && <Button size="sm" className="red-glow rounded-xl" onClick={() => setIsAddOpen(true)}><UserPlus className="h-4 w-4 mr-1" /> Neu</Button>}</div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" className="w-full rounded-xl border-emerald-600 text-emerald-700 h-10 text-xs"><Share2 className="h-3 w-3 mr-2" /> Schuldenliste exportieren <ChevronDown className="h-3 w-3 ml-2 opacity-50" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent className="rounded-xl w-[calc(100vw-2rem)]">
                <DropdownMenuItem onClick={() => exportDebtList('all')} className="py-3">Alles zusammen</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDebtList('drinks')} className="py-3">Nur Bierliste</DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportDebtList('treasury')} className="py-3">Nur Mannschaftskasse</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayPlayers.map((player) => {
              const tb = getFullTreasuryBalance(player);
              return (
                <Card key={player.id} className="border-none shadow-md rounded-2xl bg-card">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-primary"><UserCircle className="h-8 w-8" /></div>
                      <div className="flex flex-wrap justify-end gap-1 max-w-[150px]">{ (player.roles || []).map(r => (<Badge key={r} variant={r === 'admin' ? 'default' : 'secondary'} className="text-[9px] uppercase px-1.5 py-0">{AVAILABLE_ROLES.find(ar => ar.id === r)?.label || r}</Badge>))}</div>
                    </div>
                    <h3 className="text-xl font-bold mb-4">{player.name}</h3>
                    <div className="grid grid-cols-2 gap-4 py-3 border-t">
                      <div><p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1"><Beer className="h-2.5 w-2.5" /> Bierkasse</p><p className={cn("text-base font-bold", (player.balance || 0) < 0 ? 'text-destructive' : 'text-emerald-600')}>{(player.balance || 0).toFixed(2)} €</p></div>
                      <div><p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" /> Mannschaftskasse</p><p className={cn("text-base font-bold", tb < 0 ? 'text-destructive' : 'text-blue-600')}>{tb.toFixed(2)} €</p></div>
                    </div>
                    <div className="flex items-center justify-end pt-3 border-t gap-1">
                      {isKassenwart && ((player.balance || 0) < 0 || tb < 0) && (<Button size="icon" variant="ghost" className="text-emerald-600 hover:text-emerald-700" onClick={() => { setPaymentPlayer(player); setPaymentAmount(""); setPaymentAccount('drinks'); setIsPaymentOpen(true); }}><Banknote className="h-4 w-4" /></Button>)}
                      {isAdmin && (<><Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => { setPlayerToDelete(player); setIsDeleteConfirmOpen(true); }}><Trash2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { setEditingPlayer(player); setEditName(player.name); setEditEmail(player.email); setEditRoles(player.roles); setEditIsExempt(player.isFeeExempt || false); setIsEditOpen(true); }}><ChevronRight className="h-4 w-4" /></Button></>)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-[95vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader><DialogTitle>Spieler bearbeiten</DialogTitle></DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2"><Label>Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
              <div className="space-y-2"><Label>E-Mail</Label><Input value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
              <div className="p-3 bg-muted/30 rounded-xl flex items-center justify-between border"><div className="space-y-0.5"><Label className="text-sm font-bold">Beitragsbefreiung</Label></div><Switch checked={editIsExempt} onCheckedChange={setEditIsExempt} /></div>
              <div className="space-y-3"><Label>Rollen</Label><div className="grid grid-cols-2 gap-3">{AVAILABLE_ROLES.map(role => ( <div key={role.id} className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50"> <Checkbox id={`edit-role-${role.id}`} checked={editRoles.includes(role.id)} onCheckedChange={() => toggleRole(role.id, editRoles, setEditRoles)} /> <label htmlFor={`edit-role-${role.id}`} className="text-xs font-medium cursor-pointer flex-1">{role.label}</label> </div> ))}</div></div>
            </div>
            <DialogFooter><Button onClick={savePlayerChanges} className="w-full h-11 rounded-xl">Speichern</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle>Zahlung erfassen</DialogTitle>
              <DialogDescription>Zahlung für {paymentPlayer?.name} erfassen.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-3"><Label>Buchen auf Konto:</Label><RadioGroup value={paymentAccount} onValueChange={(v: any) => setPaymentAccount(v)} className="grid grid-cols-2 gap-4"><div><RadioGroupItem value="drinks" id="acc-drinks" className="peer sr-only" /><Label htmlFor="acc-drinks" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary"><Beer className="mb-2 h-6 w-6" /><span className="text-xs font-bold">Bierkasse</span></Label></div><div><RadioGroupItem value="treasury" id="acc-treasury" className="peer sr-only" /><Label htmlFor="acc-treasury" className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent peer-data-[state=checked]:border-primary"><TrendingUp className="mb-2 h-6 w-6" /><span className="text-xs font-bold">Mannschaftskasse</span></Label></div></RadioGroup></div>
              <div className="space-y-2"><Label>Betrag (€)</Label><Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div>
            </div>
            <DialogFooter><Button onClick={handleRecordPayment} disabled={isSubmitting || !paymentAmount} className="w-full rounded-xl h-11 bg-emerald-600 text-white">{isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Verbuchen"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
          <AlertDialogContent className="max-w-[90vw] rounded-2xl bg-card">
            <AlertDialogHeader><AlertDialogTitle>Spieler wirklich löschen?</AlertDialogTitle><AlertDialogDescription>Dies kann nicht rückgängig gemacht werden.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter className="gap-2"><AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel><AlertDialogAction onClick={handleDeletePlayer} className="bg-destructive text-white rounded-xl">Löschen</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  )
}
