
"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, Fine, FineType } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Scale, Plus, Trash2, Loader2, UserCircle, CheckCircle2, History, Share2, Calculator } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function FinesPage() {
  const { toast } = useToast()
  const { players, fines, fineCatalog, addFine, markFineAsPaid, deleteFine, currentUserProfile, loading: storeLoading } = useStore()
  const [mounted, setMounted] = useState(false)
  
  const [selectedPlayer, setSelectedPlayer] = useState("")
  const [selectedFineTypeId, setSelectedFineTypeId] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const unpaidFines = useMemo(() => fines.filter(f => !f.isPaid), [fines]);
  const paidFines = useMemo(() => fines.filter(f => f.isPaid), [fines]);

  useEffect(() => {
    const selectedFine = fineCatalog.find(f => f.id === selectedFineTypeId)
    if (selectedFine) setCustomAmount(selectedFine.amount.toString())
  }, [selectedFineTypeId, fineCatalog])

  if (storeLoading || !mounted) return <div className="flex h-svh items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  const isAdmin = currentUserProfile?.roles?.includes('admin')
  const isKassenwart = currentUserProfile?.roles?.includes('kassenwart')
  const isStrafenwart = currentUserProfile?.roles?.includes('strafenwart') || isAdmin || isKassenwart

  if (!currentUserProfile || !isStrafenwart) return <div className="flex flex-col items-center justify-center min-h-svh p-4 text-center"><h2 className="text-xl font-bold mb-2">Zugriff verweigert</h2><Button onClick={() => window.location.href = "/"} className="mt-4">Zurück</Button></div>

  const exportFinesList = () => {
    if (unpaidFines.length === 0) return;
    const dateStr = format(new Date(), 'dd.MM.yyyy', { locale: de });
    let text = `⚖️ *Offene Strafen - RWS2*\n(Stand: ${dateStr})\n\n`;
    const playerFines: Record<string, Fine[]> = {};
    unpaidFines.forEach(f => {
      if (!playerFines[f.playerName]) playerFines[f.playerName] = [];
      playerFines[f.playerName].push(f);
    });
    Object.entries(playerFines).sort((a, b) => a[0].localeCompare(b[0])).forEach(([playerName, items]) => {
      const total = items.reduce((sum, i) => sum + i.amount, 0);
      text += `• *${playerName}: ${total.toFixed(2).replace('.', ',')} €*\n`;
      items.forEach(i => { text += `  - ${i.reason} (${i.amount.toFixed(2).replace('.', ',')} €)\n` });
      text += `\n`;
    });
    navigator.clipboard.writeText(text); toast({ title: "Liste kopiert" });
  };

  const handleAddFine = async () => {
    const val = parseFloat(customAmount); const qty = parseInt(quantity);
    const fineType = fineCatalog.find(f => f.id === selectedFineTypeId);
    if (!selectedPlayer || !fineType || isNaN(val) || val <= 0 || isNaN(qty) || qty <= 0) { toast({ variant: "destructive", title: "Fehler" }); return; }
    setIsSubmitting(true);
    try {
      const totalAmount = val * qty;
      const reason = qty === 1 ? fineType.name : `${fineType.name} (${qty}x)`;
      addFine(selectedPlayer, reason, totalAmount);
      toast({ title: "Strafe eingetragen" }); setSelectedFineTypeId(""); setCustomAmount(""); setSelectedPlayer(""); setQuantity("1");
    } finally { setIsSubmitting(false) }
  }

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b sticky top-0 z-20">
          <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2"><Scale className="h-6 w-6" /> Strafenverwaltung</h1>
          <Button variant="outline" onClick={exportFinesList} className="rounded-xl border-emerald-600 text-emerald-700 hover:bg-emerald-50"><Share2 className="h-4 w-4 mr-2" /> Strafenliste exportieren</Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full pb-20">
          <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-amber-500/10"><CardTitle className="text-lg">Neue Strafe erfassen</CardTitle></CardHeader>
            <CardContent className="pt-6 grid gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Spieler</Label><Select value={selectedPlayer} onValueChange={setSelectedPlayer}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger><SelectContent>{players.filter(p => p.email !== 'kasse@kickoff.de').map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Vergehen</Label><Select value={selectedFineTypeId} onValueChange={setSelectedFineTypeId}><SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger><SelectContent>{fineCatalog.map(f => (<SelectItem key={f.id} value={f.id}>{f.name} ({f.amount.toFixed(2)}€)</SelectItem>))}</SelectContent></Select></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Einzelbetrag (€)</Label><Input type="number" step="0.50" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="h-12 rounded-xl" /></div>
                <div className="space-y-2"><Label>Anzahl</Label><Input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-12 rounded-xl" /></div>
              </div>
              <Button onClick={handleAddFine} disabled={isSubmitting || !selectedPlayer} className="w-full h-12 rounded-xl bg-amber-600 text-white font-bold">{isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Strafe buchen"}</Button>
            </CardContent>
          </Card>

          <Tabs defaultValue="unpaid" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl"><TabsTrigger value="unpaid" className="rounded-lg">Offen ({unpaidFines.length})</TabsTrigger><TabsTrigger value="paid" className="rounded-lg">Bezahlt ({paidFines.length})</TabsTrigger></TabsList>
            <TabsContent value="unpaid"><Card className="border-none shadow-md rounded-2xl overflow-hidden bg-card"><CardContent className="p-0"><div className="divide-y divide-border">
              {unpaidFines.map((f) => (
                <div key={f.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><UserCircle className="h-6 w-6" /></div><div><p className="font-bold text-sm">{f.playerName}</p><p className="text-xs text-muted-foreground">{f.reason} • {format(new Date(f.date), 'dd.MM.yy')}</p></div></div>
                  <div className="flex items-center gap-2"><span className="font-bold text-destructive">-{f.amount.toFixed(2)} €</span><Button variant="ghost" size="icon" className="text-emerald-600" onClick={() => markFineAsPaid(f.id)}><CheckCircle2 className="h-5 w-5" /></Button><Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => deleteFine(f.id)}><Trash2 className="h-4 w-4" /></Button></div>
                </div>
              ))}
            </div></CardContent></Card></TabsContent>
            <TabsContent value="paid"><Card className="border-none shadow-md rounded-2xl overflow-hidden bg-card opacity-80"><CardContent className="p-0"><div className="divide-y divide-border">
              {paidFines.map((f) => (
                <div key={f.id} className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-6 w-6" /></div><div><p className="font-bold text-sm">{f.playerName}</p><p className="text-xs text-muted-foreground line-through">{f.reason} • {format(new Date(f.date), 'dd.MM.yy')}</p></div></div><span className="font-bold text-emerald-600">{f.amount.toFixed(2)} €</span></div>
              ))}
            </div></CardContent></Card></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
