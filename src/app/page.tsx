"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { ExpenseActions } from "@/components/dashboard/expense-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useStore, FEE_MONTHS, Role, Player } from "@/lib/store"
import { 
  Wallet, 
  Beer, 
  Clock, 
  Loader2, 
  UserCircle, 
  ShieldCheck, 
  ExternalLink, 
  Banknote, 
  ShoppingCart, 
  CreditCard, 
  PlusCircle, 
  Package, 
  Check, 
  X, 
  TrendingUp, 
  Scale,
  CalendarDays,
  MapPin,
  Trophy,
  ChevronRight,
  Calculator,
  Medal,
  Copy,
  RotateCcw,
  HandCoins
} from "lucide-react"
import { format, isAfter, isBefore, addDays, startOfDay, parseISO } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useUser } from "@/firebase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { IntroDialog } from "@/components/layout/intro-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default function Dashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, loading: authLoading } = useUser()
  const { players, expenses, membershipFees, fines, treasuryExpenses, reimbursements, teamEvents, attendance, totalMannschaftskasse, totalBierkasse, bierkasseLiquidity, currentUserProfile, settings, addPlayer, recordPayment, recordClubhousePayment, addBezahlkiste, resetClubhouseSeason, upsertAttendance, loading: storeLoading } = useStore()
  const [onboardingName, setOnboardingName] = useState("")
  
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentPlayerId, setPaymentPlayerId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")

  const [isSelfPaymentDialogOpen, setIsSelfPaymentDialogOpen] = useState(false)
  const [selfPaymentAmount, setSelfPaymentAmount] = useState("")
  const [selfPaymentType, setSelfPaymentType] = useState<'drinks' | 'treasury' | 'fines'>('drinks')

  const [isQuickDeclineOpen, setIsQuickDeclineOpen] = useState(false)
  const [quickDeclineEventId, setQuickDeclineEventId] = useState<string | null>(null)
  const [quickDeclineReason, setQuickDeclineReason] = useState("")

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (mounted && !authLoading && !user) router.replace("/login")
  }, [mounted, authLoading, user, router])

  const roles = useMemo(() => currentUserProfile?.roles || [], [currentUserProfile]);
  const isAdmin = useMemo(() => roles.includes('admin'), [roles]);
  const isKassenwart = useMemo(() => roles.includes('kassenwart') || roles.includes('admin'), [roles]);

  const nextEvent = useMemo(() => {
    const now = new Date();
    const futureEvents = teamEvents
      .filter(e => isAfter(new Date(e.date), now))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return futureEvents[0] || null;
  }, [teamEvents]);

  const rsvpReminder = useMemo(() => {
    if (!nextEvent || !currentUserProfile) return null;
    
    const userAttendance = attendance.find(a => a.eventId === nextEvent.id && a.playerId === currentUserProfile.id);
    if (userAttendance) return null;

    const eventDate = new Date(nextEvent.date);
    const now = new Date();
    const reminderThreshold = addDays(now, 5);

    if (isBefore(eventDate, reminderThreshold)) {
      return nextEvent;
    }
    return null;
  }, [nextEvent, currentUserProfile, attendance]);

  const pendingReimbursementAmount = useMemo(() => {
    if (!currentUserProfile) return 0;
    return reimbursements
      .filter(r => r.playerId === currentUserProfile.id && r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [currentUserProfile, reimbursements]);

  const clubhouseStats = useMemo(() => {
    const resetDate = settings.lastClubhouseResetDate ? new Date(settings.lastClubhouseResetDate) : new Date(0);
    
    const allCrates = expenses.filter(e => 
      e.itemType === 'crate' && 
      new Date(e.date) >= resetDate
    );
    const totalCrateCost = allCrates.length * settings.cratePrice;
    
    const paidToClubhouse = treasuryExpenses
      .filter(t => 
        t.description.includes("Vereinsheim") && 
        new Date(t.date) >= resetDate
      )
      .reduce((sum, t) => sum + t.amount, 0);
    
    const openDebt = Math.max(0, totalCrateCost - paidToClubhouse);

    return { 
      count: allCrates.length, 
      totalCost: totalCrateCost,
      paid: paidToClubhouse,
      openDebt
    };
  }, [expenses, treasuryExpenses, settings]);

  const feeStatus = useMemo(() => {
    if (!currentUserProfile) return { open: 0, paidMonths: 0, monthsStatus: [], totalDebt: 0 };
    
    const personalTreasuryDebt = Math.abs(Math.min(0, currentUserProfile.treasuryBalance));

    if (currentUserProfile.isFeeExempt) return { open: 0, paidMonths: 0, isExempt: true, monthsStatus: [], totalDebt: personalTreasuryDebt };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Saisonwechsel am 1. Juni
    const seasonYear = currentMonth < 5 ? currentYear - 1 : currentYear;
    
    const userFees = membershipFees.filter(f => f.playerId === currentUserProfile.id && f.year === seasonYear);
    const isAnnual = userFees.some(f => f.type === 'annual');
    
    const currentMIdxInList = FEE_MONTHS.indexOf(currentMonth);

    const monthsStatus = FEE_MONTHS.map(m => {
      const isPaid = isAnnual || userFees.some(f => f.type === 'monthly' && f.month === m);
      const mIdxInList = FEE_MONTHS.indexOf(m);
      
      let isPastOrCurrent = false;
      if (currentMIdxInList !== -1) {
        isPastOrCurrent = mIdxInList <= currentMIdxInList;
      } else {
        isPastOrCurrent = false;
      }

      return { month: m, name: MONTH_NAMES_SHORT[m], isPaid, isPastOrCurrent };
    });

    if (isAnnual) return { open: 0, paidMonths: 10, isAnnual: true, monthsStatus, totalDebt: personalTreasuryDebt };
    
    let monthsToPay = 0;
    if (currentMIdxInList !== -1) {
      monthsToPay = currentMIdxInList + 1;
    } else {
      monthsToPay = 0;
    }

    const paidCount = userFees.filter(f => f.type === 'monthly').length;
    const openFees = Math.max(0, monthsToPay - paidCount) * settings.monthlyFee;
    
    return { 
      open: openFees, 
      paidMonths: paidCount, 
      isAnnual: false, 
      monthsStatus,
      totalDebt: openFees + personalTreasuryDebt
    };
  }, [currentUserProfile, membershipFees, settings]);

  const fineStatus = useMemo(() => {
    if (!currentUserProfile) return 0;
    return fines.filter(f => f.playerId === currentUserProfile.id && !f.isPaid).reduce((sum, f) => sum + f.amount, 0);
  }, [currentUserProfile, fines]);

  const costsRanking = useMemo(() => {
    const rankingMap = new Map<string, { id: string, name: string, total: number }>();
    
    players.forEach(p => {
      if (p.email !== 'kasse@kickoff.de') {
        rankingMap.set(p.id, { id: p.id, name: p.name, total: 0 });
      }
    });

    expenses.forEach(e => {
      const entry = rankingMap.get(e.playerId);
      if (entry) entry.total += e.cost;
    });

    fines.forEach(f => {
      const entry = rankingMap.get(f.playerId);
      if (entry) entry.total += f.amount;
    });

    return Array.from(rankingMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [players, expenses, fines]);

  if (!mounted || authLoading || storeLoading) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  if (!currentUserProfile) {
    const hasAdmin = players.some(p => p.roles?.includes('admin'))
    return (
      <div className="flex flex-col items-center justify-center min-h-svh bg-background p-4">
        <Card className="w-full max-md border-none shadow-2xl rounded-3xl overflow-hidden bg-card">
          <CardHeader className="text-center pb-2 pt-8">
            <div className={cn("mx-auto p-4 rounded-3xl w-fit mb-4", !hasAdmin ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500" : "bg-primary/10 text-primary")}>
              {!hasAdmin ? <ShieldCheck className="h-12 w-12" /> : <UserCircle className="h-12 w-12" />}
            </div>
            <CardTitle className="text-2xl font-bold font-headline">{!hasAdmin ? "Master-Account erstellen" : "Willkommen!"}</CardTitle>
            <CardDescription>{!hasAdmin ? "Du bist der erste Nutzer und wirst als Admin registriert." : `Gib deinen Namen ein, um dein Profil zu erstellen.`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 pb-10 px-8">
            <div className="space-y-2">
              <Label htmlFor="onboarding-name" className="text-xs uppercase font-bold text-muted-foreground ml-1">Dein Name</Label>
              <Input id="onboarding-name" placeholder="Z.B. Max Mustermann" value={onboardingName} onChange={(e) => setOnboardingName(e.target.value)} className="rounded-xl h-12 bg-muted/30 border-none text-base" disabled={isSubmitting} />
            </div>
            <Button className={cn("w-full h-12 rounded-xl font-bold text-lg", !hasAdmin ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200 dark:shadow-none shadow-lg" : "red-glow")} onClick={async () => {
              if (!onboardingName.trim()) return;
              setIsSubmitting(true);
              try {
                const roles: Role[] = !hasAdmin ? ['admin'] : ['player'];
                await addPlayer(onboardingName.trim(), user.email!, roles, user.uid);
                toast({ title: "Profil erstellt" });
              } finally { setIsSubmitting(false) }
            }} disabled={!onboardingName.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : (!hasAdmin ? "Als Admin starten" : "Profil erstellen")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleQuickRSVP = async (eventId: string, status: 'going' | 'declined') => {
    if (status === 'going') {
      await upsertAttendance(eventId, 'going');
      toast({ title: "Zusage gespeichert", description: "Wir sehen uns beim Termin!" });
    } else {
      setQuickDeclineEventId(eventId);
      setQuickDeclineReason("");
      setIsQuickDeclineOpen(true);
    }
  }

  const confirmQuickDecline = async () => {
    if (!quickDeclineEventId || !quickDeclineReason.trim()) return;
    await upsertAttendance(quickDeclineEventId, 'declined', quickDeclineReason);
    setIsQuickDeclineOpen(false);
    toast({ title: "Absage gespeichert" });
  }

  const handlePayInitiate = (type: 'drinks' | 'treasury' | 'fines') => {
    let amount = 0;
    if (type === 'drinks') {
      amount = currentUserProfile.balance < 0 ? Math.abs(currentUserProfile.balance) : 0;
    } else if (type === 'treasury') {
      amount = Math.max(0, feeStatus.totalDebt);
    } else if (type === 'fines') {
      amount = Math.max(0, fineStatus);
    }
    
    setSelfPaymentType(type);
    setSelfPaymentAmount(amount.toFixed(2));
    setIsSelfPaymentDialogOpen(true);
  }

  const handlePayConfirm = () => {
    const amount = parseFloat(selfPaymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte gib einen gültigen Betrag ein." });
      return;
    }

    const typeLabel = selfPaymentType === 'drinks' ? 'Getränke' : selfPaymentType === 'treasury' ? 'Beitrag' : 'Strafen';
    const reference = `2. Herren RWS - ${typeLabel}: ${currentUserProfile.name}`;
    
    const emailOrLink = settings.treasuryPaypalEmail || settings.paypalMeLink;
    if (!emailOrLink) {
      toast({ variant: "destructive", title: "Fehler", description: "Keine PayPal Mannschaftskasse hinterlegt." });
      return;
    }

    navigator.clipboard.writeText(reference);
    toast({ 
      title: "Betreff kopiert!", 
      description: "Der Verwendungszweck wurde kopiert. Bitte füge ihn in der PayPal-App ein." 
    });

    if (emailOrLink.includes("paypal.me")) {
      let link = emailOrLink.trim();
      if (!link.startsWith('http')) link = `https://${link}`;
      const baseUrl = link.endsWith("/") ? link : `${link}/`;
      window.location.href = `${baseUrl}${amount.toFixed(2)}`;
    } else {
      window.location.href = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(emailOrLink)}&amount=${amount.toFixed(2)}&currency_code=EUR&item_name=${encodeURIComponent(reference)}`;
    }
    setIsSelfPaymentDialogOpen(false);
  }

  const handlePayClubhouse = () => {
    const amount = clubhouseStats.openDebt;
    const emailOrLink = settings.clubhousePaypalEmail;
    if (!emailOrLink) {
      toast({ variant: "destructive", title: "Fehler", description: "Keine PayPal E-Mail für das Vereinsheim hinterlegt." });
      return;
    }
    const reference = `2. Herren RWS - Getränke-Abrechnung Vereinsheim`;
    
    navigator.clipboard.writeText(reference);
    toast({ 
      title: "Betreff kopiert!", 
      description: "Der Verwendungszweck wurde kopiert. Bitte in der PayPal-App einfügen." 
    });

    if (emailOrLink.includes("paypal.me")) {
      let link = emailOrLink.trim();
      if (!link.startsWith('http')) link = `https://${link}`;
      const baseUrl = link.endsWith("/") ? link : `${link}/`;
      window.location.href = `${baseUrl}${amount.toFixed(2)}`;
    } else {
      window.location.href = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(emailOrLink)}&amount=${amount.toFixed(2)}&currency_code=EUR&item_name=${encodeURIComponent(reference)}`;
    }
  }

  const handleRecordClubhousePaymentAction = () => {
    if (clubhouseStats.openDebt <= 0) return;
    recordClubhousePayment(clubhouseStats.openDebt);
    toast({ title: "Abrechnung verbucht", description: "Die Bierkasse wurde belastet." });
  }

  const handleResetClubhouse = async () => {
    try {
      await resetClubhouseSeason();
      toast({ title: "Saison zurückgesetzt", description: "Die Berechnungen starten ab jetzt neu." });
    } catch (error) {
      toast({ variant: "destructive", title: "Fehler beim Zurücksetzen" });
    }
  }

  const handleRecordPaymentAction = async () => {
    const amount = parseFloat(paymentAmount);
    if (!paymentPlayerId || isNaN(amount) || amount <= 0) return;
    setIsSubmitting(true);
    try {
      await recordPayment(paymentPlayerId, amount);
      setIsPaymentOpen(false);
      setPaymentAmount("");
      setPaymentPlayerId("");
      toast({ title: "Zahlung verbucht" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile.roles} />
      <MobileNavTrigger 
        userRoles={currentUserProfile.roles} 
        rightElement={
          isKassenwart && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-emerald-600 h-10 w-10 mr-1"
              onClick={() => setIsPaymentOpen(true)}
              title="Zahlung verbuchen"
            >
              <PlusCircle className="h-6 w-6" />
            </Button>
          )
        }
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border sticky top-0 z-20">
          <h1 className="text-2xl font-bold text-primary font-headline">Dashboard</h1>
          <div className="flex items-center gap-4">
            {isKassenwart && (
              <Button 
                variant="outline" 
                className="rounded-xl border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                onClick={() => setIsPaymentOpen(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" /> Zahlung verbuchen
              </Button>
            )}
            <span className="text-sm font-medium text-muted-foreground">{format(new Date(), 'EEEE, d. MMMM', { locale: de })}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 pb-20 md:pb-8">
          <div className="md:hidden flex flex-col gap-4 mb-4">
            <h1 className="text-2xl font-bold text-primary font-headline">Dashboard</h1>
          </div>

          {rsvpReminder && (
            <Alert className="bg-primary/10 border-primary/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary rounded-xl text-white shrink-0 mt-0.5">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <AlertTitle className="font-black text-primary uppercase text-xs tracking-wider">Erinnerung: Rückmeldung fehlt!</AlertTitle>
                    <AlertDescription className="text-sm font-medium text-foreground">
                      Du hast dich noch nicht fürs <strong className="text-primary">{rsvpReminder.title}</strong> am {format(new Date(rsvpReminder.date), 'dd.MM. HH:mm')} angemeldet!
                    </AlertDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button 
                    size="sm" 
                    className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 h-10 px-4"
                    onClick={() => handleQuickRSVP(rsvpReminder.id, 'going')}
                   >
                     <Check className="h-4 w-4 mr-1.5" /> Ich bin dabei
                   </Button>
                   <Button 
                    size="sm" 
                    variant="outline" 
                    className="rounded-xl font-bold border-destructive text-destructive hover:bg-destructive/10 h-10 px-4"
                    onClick={() => handleQuickRSVP(rsvpReminder.id, 'declined')}
                   >
                     <X className="h-4 w-4 mr-1.5" /> Absagen
                   </Button>
                </div>
              </div>
            </Alert>
          )}

          {pendingReimbursementAmount > 0 && (
            <Alert className="bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900 rounded-2xl">
              <HandCoins className="h-5 w-5 text-emerald-600" />
              <AlertTitle className="font-bold text-emerald-700 dark:text-emerald-400">Ausstehende Rückzahlung</AlertTitle>
              <AlertDescription className="text-sm font-medium">
                Du bekommst noch <strong className="text-emerald-700 dark:text-emerald-400">{pendingReimbursementAmount.toFixed(2)} €</strong> für deine Auslagen aus der Mannschaftskasse zurück.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-none shadow-md bg-card rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Mein Getränkekonto</p>
                  <div className="p-2 bg-primary/10 rounded-full text-primary"><Wallet className="h-4 w-4" /></div>
                </div>
                <h2 className={cn("text-2xl font-bold", currentUserProfile.balance < 0 ? 'text-destructive' : 'text-emerald-600')}>
                  {currentUserProfile.balance.toFixed(2)} €
                </h2>
                <div className="flex items-center justify-between mt-2">
                   <p className="text-[10px] text-muted-foreground">{currentUserProfile.balance < 0 ? 'Offen' : 'Guthaben'}</p>
                   <Button size="sm" variant="link" onClick={() => handlePayInitiate('drinks')} className="h-6 p-0 text-xs font-bold text-primary flex items-center gap-1">
                      Bezahlen <ExternalLink className="h-3 w-3" />
                   </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-card rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Mein Beitragskonto</p>
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400"><Banknote className="h-4 w-4" /></div>
                </div>
                {feeStatus.isExempt && feeStatus.totalDebt === 0 ? (
                  <div className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold text-blue-600">BEFREIT</h2>
                    <p className="text-[10px] text-muted-foreground">Du bist vom Mitgliedsbeitrag befreit.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className={cn("text-2xl font-bold", feeStatus.totalDebt > 0 ? 'text-destructive' : 'text-emerald-600')}>
                        {feeStatus.totalDebt > 0 ? `-${feeStatus.totalDebt.toFixed(2)}` : '0.00'} €
                      </h2>
                      <Button size="sm" variant="link" onClick={() => handlePayInitiate('treasury')} className="h-6 p-0 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        Bezahlen <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-5 gap-1 pt-4 border-t border-border">
                      {feeStatus.monthsStatus.map((m) => (
                        <div key={m.month} className="flex flex-col items-center">
                          <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center mb-1 text-[8px] font-bold", m.isPaid ? "bg-emerald-500 text-white" : m.isPastOrCurrent ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-muted-foreground")}>
                            {m.isPaid ? <Check className="h-3 w-3" /> : m.isPastOrCurrent ? <X className="h-3 w-3" /> : null}
                          </div>
                          <span className="text-[8px] text-muted-foreground font-medium">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-card rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Meine Strafen</p>
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400"><Scale className="h-4 w-4" /></div>
                </div>
                <div className="flex items-center justify-between">
                  <h2 className={cn("text-2xl font-bold", fineStatus > 0 ? 'text-destructive' : 'text-emerald-600')}>
                    {fineStatus > 0 ? `-${fineStatus.toFixed(2)}` : '0.00'} €
                  </h2>
                  <Button size="sm" variant="link" onClick={() => handlePayInitiate('fines')} className="h-6 p-0 text-xs font-bold text-amber-600 dark:text-blue-400 flex items-center gap-1">
                    Bezahlen <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {fineStatus > 0 ? 'Offene Vergehen aus dem Katalog' : 'Keine offenen Strafen'}
                </p>
              </CardContent>
            </Card>

            {isKassenwart && (
              <>
                <Card className="border-none shadow-md bg-card rounded-2xl">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Bierkasse (Stand)</p>
                      <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400"><Beer className="h-4 w-4" /></div>
                    </div>
                    <h2 className={cn("text-2xl font-bold", totalBierkasse < 0 ? 'text-destructive' : 'text-emerald-600')}>
                      {totalBierkasse.toFixed(2)} €
                    </h2>
                    <p className="text-[10px] text-muted-foreground mt-1">Guthaben + Außenstände</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md bg-card rounded-2xl">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-muted-foreground">Mannschaftskasse (Gesamt)</p>
                      <div className="p-2 bg-emerald-100 dark:bg-amber-900/30 rounded-full text-emerald-600 dark:text-emerald-400"><TrendingUp className="h-4 w-4" /></div>
                    </div>
                    <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalMannschaftskasse.toFixed(2)} €</h2>
                    <p className="text-[10px] text-muted-foreground mt-1">Beiträge & Strafen</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-none shadow-lg rounded-2xl bg-card border-l-4 border-l-blue-500 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <CalendarDays className="h-5 w-5" /> Nächster Termin
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextEvent ? (
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[55px] bg-blue-50 dark:bg-blue-900/20 p-2 rounded-xl border border-blue-100 dark:border-blue-900/50">
                      <p className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400">{format(new Date(nextEvent.date), 'EEE', { locale: de })}</p>
                      <p className="text-xl font-black text-blue-900 dark:text-blue-100">{format(new Date(nextEvent.date), 'dd')}</p>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-base">{nextEvent.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                         <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {format(new Date(nextEvent.date), 'HH:mm')}</span>
                         {nextEvent.location && (
                           <a 
                             href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextEvent.location)}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                           >
                             <MapPin className="h-3 w-3" /> {nextEvent.location}
                           </a>
                         )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => router.push('/calendar')}>
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Keine Termine geplant.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg rounded-2xl bg-card border-l-4 border-l-amber-500 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Trophy className="h-5 w-5" /> Ehrentabelle
                </CardTitle>
                <CardDescription>Gesamte Ausgaben für Getränke und Strafen.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border px-6 pb-4">
                  {costsRanking.map((p, idx) => (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                          idx === 0 ? "bg-yellow-400 text-yellow-950" : 
                          idx === 1 ? "bg-slate-300 text-slate-700" : 
                          idx === 2 ? "bg-amber-600 text-amber-50" : "bg-muted text-muted-foreground"
                        )}>
                          {idx + 1}
                        </div>
                        <span className={cn("text-sm font-semibold", idx < 3 ? "text-foreground" : "text-muted-foreground")}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black">{p.total.toFixed(2)} €</span>
                        {idx < 3 && <Medal className={cn("h-4 w-4", idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : "text-amber-700")} />}
                      </div>
                    </div>
                  ))}
                  {costsRanking.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground italic">Noch keine Daten vorhanden.</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {isKassenwart && (
            <Card className="border-none shadow-lg rounded-2xl bg-card border-t-4 border-t-amber-500">
              <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <ShoppingCart className="h-5 w-5" /> Vereinsheim Abrechnung
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-card text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900">
                      Diese Saison versoffen: {clubhouseStats.totalCost.toFixed(2)}€
                    </Badge>
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Saison zurücksetzen?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Dies setzt den Zähler "Diese Saison versoffen" und die offenen Schulden gegenüber dem Vereinsheim auf Null zurück. Bestehende Buchungen bleiben im Verlauf erhalten, werden aber für diese Statistik ab jetzt ignoriert.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetClubhouse} className="bg-destructive hover:bg-destructive/90 text-white">
                              Zurücksetzen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
                <CardDescription>Berechnung nur basierend auf Kisten (Spieler + Bezahlkisten).</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="grid grid-cols-2 gap-6 w-full md:w-auto">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Kisten Total</p>
                    <p className="text-2xl font-black text-amber-700 dark:text-amber-500">{clubhouseStats.count}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-amber-800/60 dark:text-amber-400/60 font-bold uppercase flex items-center gap-1">
                      <Calculator className="h-3 w-3" /> Noch Offen
                    </p>
                    <p className="text-3xl font-black text-amber-600 dark:text-amber-500">{clubhouseStats.openDebt.toFixed(2)} €</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                   <Button variant="outline" onClick={() => addBezahlkiste()} className="rounded-xl border-amber-600 text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/20">
                     <PlusCircle className="h-4 w-4 mr-2" /> Bezahlkiste
                   </Button>
                   <Button onClick={handlePayClubhouse} className="rounded-xl bg-amber-600 text-white font-bold">
                     <ExternalLink className="h-4 w-4 mr-2" /> PayPal
                   </Button>
                   <Button variant="secondary" onClick={handleRecordClubhousePaymentAction} disabled={clubhouseStats.openDebt <= 0} className="rounded-xl font-bold">
                     <Check className="h-4 w-4 mr-2" /> Als bezahlt markieren
                   </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="text-lg font-semibold mb-4 px-1">Getränk erfassen</h3>
            <ExpenseActions currentUserId={currentUserProfile.id} userRoles={currentUserProfile.roles} />
          </div>
        </div>

        <Dialog open={isQuickDeclineOpen} onOpenChange={setIsQuickDeclineOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle>Termin absagen</DialogTitle>
              <DialogDescription>Bitte gib einen kurzen Grund für deine Absage an.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="text-xs font-bold uppercase text-muted-foreground ml-1">Grund (Pflichtfeld)</Label>
              <Textarea 
                placeholder="Z.B. Arbeit, Krankheit, Familie..." 
                value={quickDeclineReason} 
                onChange={(e) => setQuickDeclineReason(e.target.value)}
                className="mt-2 rounded-xl h-24"
              />
            </div>
            <DialogFooter>
              <Button 
                onClick={confirmQuickDecline} 
                disabled={!quickDeclineReason.trim()} 
                className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white font-bold h-12"
              >
                Absage bestätigen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle>Zahlung erfassen</DialogTitle>
              <DialogDescription>Verbucht eine Zahlung eines Spielers in die Bierkasse.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Spieler</Label>
                <Select value={paymentPlayerId} onValueChange={setPaymentPlayerId}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Spieler wählen" /></SelectTrigger>
                  <SelectContent>
                    {players.filter(p => p.email !== 'kasse@kickoff.de').map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleRecordPaymentAction} disabled={isSubmitting || !paymentPlayerId} className="w-full h-12 rounded-xl bg-emerald-600 font-bold">
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : "Zahlung speichern"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSelfPaymentDialogOpen} onOpenChange={setIsSelfPaymentDialogOpen}>
          <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl bg-card">
            <DialogHeader>
              <DialogTitle>Zahlung vorbereiten</DialogTitle>
              <DialogDescription>
                Wie viel möchtest du für dein {selfPaymentType === 'drinks' ? 'Getränkekonto' : selfPaymentType === 'treasury' ? 'Beitragskonto' : 'Strafenkonto'} bezahlen?
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Betrag (€)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={selfPaymentAmount} 
                    onChange={e => setSelfPaymentAmount(e.target.value)} 
                    className="h-12 rounded-xl pl-10"
                  />
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Vorgeschlagener Betreff:</Label>
                   <Copy className="h-3 w-3 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium break-all">
                  2. Herren RWS - {selfPaymentType === 'drinks' ? 'Getränke' : selfPaymentType === 'treasury' ? 'Beitrag' : 'Strafen'}: {currentUserProfile.name}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium">Wird automatisch kopiert beim Klick auf "Weiter".</p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handlePayConfirm} className="w-full h-12 rounded-xl font-bold red-glow">
                Weiter zu PayPal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <IntroDialog />
      </main>
    </div>
  )
}
