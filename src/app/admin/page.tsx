"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Settings, Save, Beer, Package, Banknote, Link as LinkIcon, Scale, Plus, Trash2, Github, Copy, Trophy, Globe, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminPage() {
  const { toast } = useToast()
  const { settings, updateSettings, fineCatalog, updateFineType, addFineType, deleteFineType, currentUserProfile, loading: storeLoading } = useStore()
  const [mounted, setMounted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form State Settings
  const [beerPrice, setBeerPrice] = useState("")
  const [cratePrice, setCratePrice] = useState("")
  const [monthlyFee, setMonthlyFee] = useState("")
  const [annualFee, setAnnualFee] = useState("")
  const [paypalMeLink, setPaypalMeLink] = useState("")
  const [clubhouseEmail, setClubhouseEmail] = useState("")
  const [treasuryEmail, setTreasuryEmail] = useState("")
  const [footballDeLink, setFootballDeLink] = useState("")
  const [fupaLink, setFupaLink] = useState("")

  // Form State Fines
  const [newFineName, setNewFineName] = useState("")
  const [newFineAmount, setNewFineAmount] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (settings) {
      setBeerPrice(settings.beerPrice.toString())
      setCratePrice(settings.cratePrice.toString())
      setMonthlyFee(settings.monthlyFee.toString())
      setAnnualFee(settings.annualFee.toString())
      setPaypalMeLink(settings.paypalMeLink || "")
      setClubhouseEmail(settings.clubhousePaypalEmail || "")
      setTreasuryEmail(settings.treasuryPaypalEmail || "")
      setFootballDeLink(settings.footballDeLink || "")
      setFupaLink(settings.fupaLink || "")
    }
  }, [settings])

  if (storeLoading || !mounted) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isAdmin = currentUserProfile?.roles?.includes('admin')
  const isStrafenwart = currentUserProfile?.roles?.includes('strafenwart') || isAdmin

  if (!currentUserProfile || (!isAdmin && !isStrafenwart)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Zugriff verweigert</h2>
        <Button onClick={() => window.location.href = "/"} className="mt-4">Zurück</Button>
      </div>
    )
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      await updateSettings({
        beerPrice: parseFloat(beerPrice),
        cratePrice: parseFloat(cratePrice),
        monthlyFee: parseFloat(monthlyFee),
        annualFee: parseFloat(annualFee),
        paypalMeLink,
        clubhousePaypalEmail: clubhouseEmail,
        treasuryPaypalEmail: treasuryEmail,
        footballDeLink,
        fupaLink,
      })
      toast({ title: "Einstellungen gespeichert" })
    } catch (error) {
      toast({ variant: "destructive", title: "Fehler beim Speichern" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddFineType = async () => {
    const val = parseFloat(newFineAmount)
    if (!newFineName || isNaN(val)) return
    setIsSaving(true)
    try {
      await addFineType(newFineName, val)
      setNewFineName("")
      setNewFineAmount("")
      toast({ title: "Strafe hinzugefügt" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateFineAmount = async (id: string, name: string, amountStr: string) => {
    const val = parseFloat(amountStr)
    if (isNaN(val)) return
    await updateFineType(id, name, val)
  }

  const copyToClipboard = (text: string, title: string, description: string) => {
    navigator.clipboard.writeText(text)
    toast({ title, description })
  }

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger userRoles={currentUserProfile.roles} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border">
          <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Administration
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-5xl mx-auto w-full pb-20">
          <Tabs defaultValue={isAdmin ? "general" : "fines"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 rounded-xl h-12">
              {isAdmin && <TabsTrigger value="general" className="rounded-lg">Preise & Integrationen</TabsTrigger>}
              <TabsTrigger value="fines" className="rounded-lg">Strafenkatalog</TabsTrigger>
            </TabsList>

            {isAdmin && (
              <TabsContent value="general" className="space-y-6">
                <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-card">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Beer className="h-5 w-5 text-primary" />
                      Preise & Gebühren
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="beer-price">Preis pro Bier (€)</Label>
                      <Input id="beer-price" type="number" step="0.01" value={beerPrice} onChange={(e) => setBeerPrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="crate-price">Preis pro Kiste (€)</Label>
                      <Input id="crate-price" type="number" step="0.01" value={cratePrice} onChange={(e) => setCratePrice(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly-fee">Monatsbeitrag (€)</Label>
                      <Input id="monthly-fee" type="number" step="0.01" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annual-fee">Jahresbeitrag (€)</Label>
                      <Input id="annual-fee" type="number" step="0.01" value={annualFee} onChange={(e) => setAnnualFee(e.target.value)} />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-blue-50/50 dark:bg-blue-900/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                      <LinkIcon className="h-5 w-5" /> Integrationen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="football-de">Fußball.de Spielplan-Link</Label>
                        <div className="relative">
                          <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="football-de" placeholder="https://www.fussball.de/..." value={footballDeLink} onChange={(e) => setFootballDeLink(e.target.value)} className="pl-10" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fupa-link">FuPa.net Spielplan-Link</Label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="fupa-link" placeholder="https://www.fupa.net/..." value={fupaLink} onChange={(e) => setFupaLink(e.target.value)} className="pl-10" />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="clubhouse-paypal">PayPal Vereinsheim</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="clubhouse-paypal" placeholder="E-Mail oder PayPal.me" value={clubhouseEmail} onChange={(e) => setClubhouseEmail(e.target.value)} className="pl-10" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="treasury-paypal">PayPal Mannschaftskasse</Label>
                        <div className="relative">
                          <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="treasury-paypal" placeholder="E-Mail für Beitragszahlungen" value={treasuryEmail} onChange={(e) => setTreasuryEmail(e.target.value)} className="pl-10" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paypal-me">PayPal.me Link Hauptkonto (Optional)</Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="paypal-me" placeholder="https://paypal.me/DeinName" value={paypalMeLink} onChange={(e) => setPaypalMeLink(e.target.value)} className="pl-10" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-slate-900 text-white">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Github className="h-5 w-5" />
                      GitHub Synchronisation
                    </CardTitle>
                    <CardDescription className="text-slate-400">Halte deine lokale Version aktuell oder schalte Änderungen live.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">1. Neuesten Stand vom Server laden (Pull)</Label>
                      <div className="p-3 bg-slate-800 rounded-xl font-mono text-xs break-all border border-slate-700 flex items-center justify-between gap-4">
                        <code className="text-slate-300">git pull</code>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard('git pull', "Befehl kopiert", "Füge 'git pull' im Terminal ein.")} className="h-8 w-8 text-slate-400 hover:text-white">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-slate-500">2. Eigene Änderungen hochladen (Push)</Label>
                      <div className="p-3 bg-slate-800 rounded-xl font-mono text-xs break-all border border-slate-700 flex items-center justify-between gap-4">
                        <code className="text-slate-300">git add . && git commit -m "Update" && git push</code>
                        <Button size="icon" variant="ghost" onClick={() => copyToClipboard('git add . && git commit -m "Update" && git push', "Befehl kopiert", "Füge den Befehl im Terminal ein.")} className="h-8 w-8 text-slate-400 hover:text-white">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">Drücke F1 {"->"} "Terminal: Create New Terminal", um Befehle auszuführen.</p>
                  </CardContent>
                </Card>

                <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full rounded-xl h-12 font-bold red-glow">
                  {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                  Haupteinstellungen speichern
                </Button>
              </TabsContent>
            )}

            <TabsContent value="fines" className="space-y-6">
              <Card className="border-none shadow-md rounded-2xl overflow-hidden bg-card">
                <CardHeader className="bg-amber-500/10 dark:bg-amber-900/20">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Scale className="h-5 w-5" /> Strafenkatalog verwalten
                  </CardTitle>
                  <CardDescription>Hier kannst du die Vergehen und deren Standardbeträge festlegen.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid gap-4 p-4 border-2 border-dashed border-amber-200 dark:border-amber-900 rounded-2xl bg-amber-50/30 dark:bg-amber-950/10">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Neues Vergehen hinzufügen</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Bezeichnung</Label>
                        <Input 
                          placeholder="Z.B. Zu spät zum Spiel" 
                          value={newFineName} 
                          onChange={(e) => setNewFineName(e.target.value)} 
                          className="bg-card"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Standardbetrag (€)</Label>
                        <Input 
                          type="number" 
                          step="0.50" 
                          placeholder="5.00" 
                          value={newFineAmount} 
                          onChange={(e) => setNewFineAmount(e.target.value)} 
                          className="bg-card"
                        />
                      </div>
                    </div>
                    <Button onClick={handleAddFineType} disabled={isSaving || !newFineName || !newFineAmount} className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
                      <Plus className="h-4 w-4 mr-2" /> Zum Katalog hinzufügen
                    </Button>
                  </div>

                  <div className="divide-y divide-border">
                    {fineCatalog.map((fine) => (
                      <div key={fine.id} className="py-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0 mr-4">
                          <Input 
                            defaultValue={fine.name} 
                            onBlur={(e) => {
                              if (e.target.value && e.target.value !== fine.name) {
                                updateFineType(fine.id, e.target.value, fine.amount)
                              }
                            }}
                            className="font-bold border-none p-0 h-auto focus-visible:ring-0 bg-transparent text-sm truncate" 
                          />
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Klicken zum Bearbeiten</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative w-24">
                            <Input 
                              type="number" 
                              step="0.50" 
                              defaultValue={fine.amount} 
                              onBlur={(e) => handleUpdateFineAmount(fine.id, fine.name, e.target.value)}
                              className="h-9 text-right pr-6 rounded-lg bg-muted/30 border-none font-bold" 
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">€</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-lg" 
                            onClick={() => deleteFineType(fine.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {fineCatalog.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground italic text-sm">Der Katalog ist leer.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
