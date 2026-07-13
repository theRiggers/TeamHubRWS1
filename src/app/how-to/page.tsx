
"use client"

import { useState, useEffect } from "react"
import { Sidebar, MobileNavTrigger } from "@/components/layout/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Smartphone, Share, PlusSquare, MoreVertical, Download, Info, CheckCircle2, ArrowLeft } from "lucide-react"
import { useStore } from "@/lib/store"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useUser } from "@/firebase"

export default function HowToPage() {
  const [mounted, setMounted] = useState(false)
  const { user } = useUser()
  const { currentUserProfile, loading: storeLoading } = useStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (storeLoading || !mounted) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-svh bg-background overflow-hidden">
      <Sidebar userRoles={currentUserProfile?.roles} />
      <MobileNavTrigger userRoles={currentUserProfile?.roles} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="hidden md:flex h-16 items-center justify-between px-8 bg-card border-b border-border">
          <div className="flex items-center gap-4">
            {!user && (
              <Link href="/login">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
              <Smartphone className="h-6 w-6" /> App installieren
            </h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 max-w-4xl mx-auto w-full pb-20">
          <div className="md:hidden flex items-center gap-3 mb-4">
            {!user && (
              <Link href="/login">
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  <ArrowLeft className="h-6 w-6" />
                </Button>
              </Link>
            )}
            <h1 className="text-2xl font-bold text-primary font-headline flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> App installieren
            </h1>
          </div>

          <Card className="border-none shadow-md bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Warum als App installieren?
              </CardTitle>
              <CardDescription>
                Nutze das Headquarter RWS2 wie eine echte App direkt von deinem Home Screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm">Schneller Zugriff ohne Browser-Eingabe.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm">Mehr Platz auf dem Bildschirm (keine Adresszeile).</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm">Direkte Ein-Klick-Navigation zu deinen Schulden.</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Apple iOS Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <svg className="h-6 w-6" viewBox="0 0 1024 1024" fill="currentColor">
                   <path d="M730.3 442.4c-.9-122.1 101.4-180.8 106.1-183.7-56.7-82.7-144.9-94.1-175.9-95.2-74.9-7.6-146.1 44.1-184.2 44.1-38.1 0-96.1-43.2-158.4-42.1-81.8 1.2-156.9 47.7-199.1 121-85 147.6-21.7 366 60.3 484.8 40.3 58.1 88.2 123.1 151.1 120.7 60.6-2.4 83.5-39.2 156.7-39.2 73.1 0 93.8 39.2 157.4 37.9 64.9-1.2 107.1-59.2 147-117.2 46.1-67.4 65-132.6 66.1-136.1-1.4-.6-126.9-48.7-128.1-193.1M632.7 215.1c33.6-40.7 56-97.1 49.8-153.1-48.1 1.9-106.3 32-140.8 72.3-31 35.8-58.1 93.9-50.8 148.3 53.7 4.1 108.1-26.8 141.8-67.5" />
                </svg>
                Apple iPhone (Safari)
              </h2>
              <Card className="border-none shadow-lg rounded-2xl bg-card">
                <CardContent className="pt-6 space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center font-bold text-primary shrink-0">1</div>
                    <div className="space-y-1">
                      <p className="font-bold">Teilen-Button drücken</p>
                      <p className="text-xs text-muted-foreground">Tippe unten in Safari auf das Quadrat mit dem Pfeil nach oben.</p>
                      <div className="mt-2 p-2 bg-muted/50 rounded-lg inline-block">
                        <Share className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center font-bold text-primary shrink-0">2</div>
                    <div className="space-y-1">
                      <p className="font-bold">"Zum Home-Bildschirm"</p>
                      <p className="text-xs text-muted-foreground">Scrolle in der Liste nach unten, bis du diesen Punkt findest.</p>
                      <div className="mt-2 p-2 bg-muted/50 rounded-lg inline-block">
                        <PlusSquare className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center font-bold text-primary shrink-0">3</div>
                    <div className="space-y-1">
                      <p className="font-bold">Hinzufügen bestätigen</p>
                      <p className="text-xs text-muted-foreground">Klicke oben rechts on "Hinzufügen". Die App erscheint nun auf deinem Homescreen.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Android Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 px-1">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414C17.0609 15.3414 16.6917 14.9723 16.6917 14.5101C16.6917 14.048 17.0609 13.6788 17.523 13.6788C17.9851 13.6788 18.3543 14.048 18.3543 14.5101C18.3543 14.9723 17.9851 15.3414 17.523 15.3414ZM6.47702 15.3414C6.01489 15.3414 5.64575 14.9723 5.64575 14.5101C5.64575 14.048 6.01489 13.6788 6.47702 13.6788C6.93915 13.6788 7.3083 14.048 7.3083 14.5101C7.3083 14.9723 6.93915 15.3414 6.47702 15.3414ZM17.8929 10.435L19.5085 7.63666C19.6472 7.39656 19.5651 7.08985 19.3249 6.95116C19.0847 6.81248 18.7781 6.89456 18.6394 7.13466L17.0016 9.97155C15.5413 9.30396 13.8443 8.92424 12 8.92424C10.1557 8.92424 8.45869 9.30396 6.99843 9.97155L5.3606 7.13466C5.22191 6.89456 4.9153 6.81248 4.6751 6.95116C4.43489 7.08985 4.35281 7.39656 4.4915 7.63666L6.10708 10.435C3.12579 12.062 1.10931 15.1187 1.00287 18.6943H22.9971C22.8907 15.1187 20.8742 12.062 17.8929 10.435Z"/>
                </svg>
                Android (Chrome)
              </h2>
              <Card className="border-none shadow-lg rounded-2xl bg-card">
                <CardContent className="pt-6 space-y-6">
                  <div className="flex gap-4">
                    <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center font-bold text-primary shrink-0">1</div>
                    <div className="space-y-1">
                      <p className="font-bold">Menü öffnen</p>
                      <p className="text-xs text-muted-foreground">Tippe oben rechts in Chrome auf die drei Punkte.</p>
                      <div className="mt-2 p-2 bg-muted/50 rounded-lg inline-block">
                        <MoreVertical className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center font-bold text-primary shrink-0">2</div>
                    <div className="space-y-1">
                      <p className="font-bold">"App installieren"</p>
                      <p className="text-xs text-muted-foreground">Wähle den punkt "App installieren" oder "Zum Startbildschirm hinzufügen".</p>
                      <div className="mt-2 p-2 bg-muted/50 rounded-lg inline-block">
                        <Download className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-muted h-10 w-10 rounded-full flex items-center justify-center font-bold text-primary shrink-0">3</div>
                    <div className="space-y-1">
                      <p className="font-bold">Installation bestätigen</p>
                      <p className="text-xs text-muted-foreground">Folge den Anweisungen auf dem Bildschirm. Das Logo erscheint nun bei deinen Apps.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
