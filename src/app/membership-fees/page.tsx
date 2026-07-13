"use client"

import { useState, useEffect, useMemo } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { useStore, FEE_MONTHS } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2, Banknote, Calendar, CreditCard, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export default function MembershipFeesPage() {
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const { players, membershipFees, settings, addMembershipFee, deleteMembershipFee, loading, currentUserProfile } = useStore()
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Saisonwechsel für Beiträge am 1. Juni
  const currentSeasonYear = currentMonth < 5 ? currentYear - 1 : currentYear;
  const visibleSeasons = [currentSeasonYear, currentSeasonYear - 1, currentSeasonYear - 2];
  
  const [selectedSeason, setSelectedSeason] = useState(currentSeasonYear.toString())

  useEffect(() => { setMounted(true) }, [])

  const filteredPlayers = useMemo(() => players.filter(p => p.email !== 'kasse@kickoff.de'), [players]);

  if (loading || !mounted) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isAdmin = currentUserProfile?.roles.includes('admin')
  const isKassenwart = currentUserProfile?.roles.includes('kassenwart') || isAdmin

  if (!currentUserProfile || !isKassenwart) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Zugriff verweigert</h2>
        <Button onClick={() => window.location.href = "/"} className="mt-4">Zurück</Button>
      </div>
    )
  }

  const handleToggleFee = (playerId: string, month: number) => {
    const season = parseInt(selectedSeason);
    const existing = membershipFees.find(f => f.playerId === playerId && f.month === month && f.year === season);
    if (existing) {
      deleteMembershipFee(existing.id);
    } else {
      addMembershipFee(playerId, 'monthly', season, month);
    }
  };

  const handleToggleAnnual = (playerId: string) => {
    const season = parseInt(selectedSeason);
    const existing = membershipFees.find(f => f.playerId === playerId && f.type === 'annual' && f.year === season);
    if (existing) {
      deleteMembershipFee(existing.id);
    } else {
      addMembershipFee(playerId, 'annual', season);
    }
  };

  const SeasonSelector = ({ variant = "default" }: { variant?: "default" | "mobile" }) => (
    <div className={cn("flex items-center gap-2", variant === "mobile" && "mr-2")}>
      {variant !== "mobile" && <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />}
      <Select value={selectedSeason} onValueChange={setSelectedSeason}>
        <SelectTrigger className={cn("rounded-xl h-10", variant === "mobile" ? "w-28 text-[10px]" : "w-32 md:w-40 text-xs md:text-sm")}>
          <SelectValue placeholder="Saison" />
        </SelectTrigger>
        <SelectContent>
          {visibleSeasons.map(year => (
            <SelectItem key={year} value={year.toString()}>
              {year}/{(year + 1) % 100}
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
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary font-headline">Beitragskasse</h1>
            <Badge variant="outline" className="text-xs">{settings.monthlyFee.toFixed(0)}€ / Monat • {settings.annualFee.toFixed(0)}€ / Jahr</Badge>
          </div>
          <SeasonSelector />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="md:hidden mb-4">
            <h1 className="text-2xl font-bold text-primary font-headline">Beiträge</h1>
            <Badge variant="outline" className="text-[10px] w-fit mt-1">{settings.monthlyFee.toFixed(0)}€ / Monat • {settings.annualFee.toFixed(0)}€ / Jahr</Badge>
          </div>

          <Card className="border-none shadow-xl rounded-2xl overflow-hidden bg-card">
            <CardHeader className="bg-primary/5 pb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2 text-primary">
                    <Banknote className="h-6 w-6" />
                    Zahlungs-Matrix
                  </CardTitle>
                  <CardDescription>Übersicht der Beiträge für Saison {selectedSeason}/{(parseInt(selectedSeason)+1)%100}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="min-w-[150px] font-bold text-xs">Spieler</TableHead>
                    <TableHead className="text-center font-bold text-xs">Jahr</TableHead>
                    {FEE_MONTHS.map(m => (
                      <TableHead key={m} className="text-center font-bold px-2 text-xs">{MONTH_NAMES[m]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map(player => {
                    const season = parseInt(selectedSeason);
                    const playerFees = membershipFees.filter(f => f.playerId === player.id && f.year === season);
                    const isAnnual = playerFees.some(f => f.type === 'annual');
                    const isExempt = player.isFeeExempt;
      
                    return (
                      <TableRow key={player.id} className={cn("hover:bg-muted/10", isExempt && "opacity-50 grayscale")}>
                        <TableCell className="font-semibold py-4 whitespace-nowrap text-sm flex items-center gap-2">
                          {player.name}
                          {isExempt && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-blue-500" />
                                </TooltipTrigger>
                                <TooltipContent>Befreit vom Mitgliedsbeitrag</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant={isAnnual ? "default" : "outline"} 
                            size="sm"
                            disabled={isExempt}
                            className={cn("rounded-lg h-8 w-8 p-0", isAnnual ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "")}
                            onClick={() => handleToggleAnnual(player.id)}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        {FEE_MONTHS.map(m => {
                          const isPaid = isAnnual || playerFees.some(f => f.type === 'monthly' && f.month === m);
                          return (
                            <TableCell key={m} className="text-center p-1">
                              <Button 
                                variant={isPaid ? "default" : "ghost"} 
                                size="sm" 
                                disabled={isAnnual || isExempt}
                                className={cn(
                                  "rounded-lg h-7 w-7 p-0 transition-all",
                                  isPaid && !isAnnual ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "",
                                  isAnnual ? "bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 opacity-100" : "hover:bg-muted"
                                )}
                                onClick={() => handleToggleFee(player.id, m)}
                              >
                                {isPaid ? <Check className="h-3 w-3" /> : <X className="h-2 w-2 text-muted-foreground/20" />}
                              </Button>
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
        </div>
      </main>
    </div>
  )
}
