
"use client"

import { useState, useEffect } from "react"
import { useStore, Role } from "@/lib/store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Beer, 
  Calendar, 
  TrendingUp, 
  Scale, 
  ShieldCheck, 
  Users,
  CheckCircle2,
  ChevronRight,
  Info,
  Radio,
  LayoutGrid,
  Trophy
} from "lucide-react"
import { cn } from "@/lib/utils"

export function IntroDialog() {
  const { currentUserProfile, markIntroSeen } = useStore()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (currentUserProfile) {
      const currentRoles = currentUserProfile.roles || []
      const lastSeen = currentUserProfile.lastIntroSeenRoles || []
      
      // Check if there are any roles that the user hasn't seen the intro for
      const hasNewRoles = currentRoles.some(r => !lastSeen.includes(r))
      const isFirstTime = lastSeen.length === 0

      if (isFirstTime || hasNewRoles) {
        setIsOpen(true)
      }
    }
  }, [currentUserProfile])

  if (!currentUserProfile) return null

  const roles = currentUserProfile.roles || []
  const isAdmin = roles.includes('admin')
  const isKassenwart = roles.includes('kassenwart') || isAdmin
  const isStrafenwart = roles.includes('strafenwart') || isAdmin
  const isCoach = roles.some(r => ['coach', 'assistant_coach'].includes(r)) || isAdmin

  const handleClose = async () => {
    await markIntroSeen(roles)
    setIsOpen(false)
  }

  const roleFeatures = [
    {
      title: "Getränke & Guthaben",
      description: "Trage deine Biere oder Kisten direkt auf dem Dashboard ein. Behalte dein Guthaben immer im Blick.",
      icon: <Beer className="h-6 w-6 text-amber-500" />,
      show: true
    },
    {
      title: "Team-Kalender",
      description: "Sag zu oder ab für Trainings und Spiele. Exportiere die Termine direkt in deinen Handy-Kalender.",
      icon: <Calendar className="h-6 w-6 text-blue-500" />,
      show: true
    },
    {
      title: "Live-Ticker & Chat",
      description: "Verfolge Spiele live, juble im Chat und checke die Torjägerliste direkt nach dem Abpfiff.",
      icon: <Radio className="h-6 w-6 text-primary" />,
      show: true
    },
    {
      title: "Mannschaftskasse",
      description: "Verwalte Sponsoren, Spenden und sonstige Ausgaben. Behalte die Beitrags-Matrix im Griff.",
      icon: <TrendingUp className="h-6 w-6 text-emerald-500" />,
      show: isKassenwart
    },
    {
      title: "Strafenkatalog",
      description: "Verwalte Vergehen und buche Mehrfach-Strafen (z.B. 2x Tunnel) direkt für die Spieler.",
      icon: <Scale className="h-6 w-6 text-amber-600" />,
      show: isStrafenwart
    },
    {
      title: "Trainer-Tools",
      description: "Plane Aufstellungen auf dem Spielfeld und analysiere die Anwesenheits-Statistik der Saison.",
      icon: <LayoutGrid className="h-6 w-6 text-blue-600" />,
      show: isCoach
    },
    {
      title: "Administration",
      description: "Passe Preise an, verwalte Spielerrollen und konfiguriere Integrationen wie Fußball.de.",
      icon: <ShieldCheck className="h-6 w-6 text-slate-700" />,
      show: isAdmin
    }
  ].filter(f => f.show)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[95vw] md:max-w-2xl rounded-3xl p-0 overflow-hidden shadow-2xl bg-card border-none">
        <div className="bg-primary p-8 text-white relative">
          <Sparkles className="absolute top-4 right-4 h-12 w-12 opacity-20 animate-pulse" />
          <DialogHeader>
            <DialogTitle className="text-3xl font-black font-headline">
              Moin {currentUserProfile.name.split(' ')[0]}!
            </DialogTitle>
            <DialogDescription className="text-white/80 text-lg">
              Willkommen im Headquarter RWS2. Hier ist ein Überblick über deine Funktionen.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          <div className="grid gap-6">
            {roleFeatures.map((feature, idx) => (
              <div key={idx} className="flex gap-4 items-start group">
                <div className="bg-muted p-3 rounded-2xl group-hover:scale-110 transition-transform shrink-0">
                  {feature.icon}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900 flex gap-3 items-center">
            <Info className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
              Tipp: Installiere die App über den Menüpunkt "App installieren" auf deinem Home-Screen für den schnellsten Zugriff!
            </p>
          </div>
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleClose} 
            className="w-full h-12 rounded-2xl font-bold text-lg red-glow"
          >
            Alles klar, los geht's!
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
