
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { useState } from "react"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"
import { useStore, Role } from "@/lib/store"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  History as HistoryIcon, 
  Users as UsersIcon, 
  LayoutDashboard as DashboardIcon, 
  LogOut as LogOutIcon, 
  Menu as MenuIcon, 
  Banknote as BanknoteIcon, 
  Settings as SettingsIcon, 
  Scale as ScaleIcon,
  Calendar as CalendarIcon,
  TrendingUp as TreasuryIcon,
  Smartphone as SmartphoneIcon,
  CheckCircle2 as AttendanceIcon,
  PlaneTakeoff as AbsenceIcon,
  Trophy as StatsIcon
} from "lucide-react"

const navigation = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon },
  { name: 'Kalender', href: '/calendar', icon: CalendarIcon },
  { name: 'Statistiken', href: '/stats', icon: StatsIcon },
  { name: 'Anwesenheit', href: '/attendance', icon: AttendanceIcon, roles: ['admin', 'coach', 'assistant_coach'] },
  { name: 'Abwesenheiten', href: '/absences', icon: AbsenceIcon },
  { name: 'Verlauf', href: '/history', icon: HistoryIcon },
  { name: 'Mannschaftskasse', href: '/treasury', icon: TreasuryIcon, roles: ['admin', 'kassenwart'] },
  { name: 'Strafen', href: '/fines', icon: ScaleIcon, roles: ['admin', 'strafenwart', 'kassenwart'] },
  { name: 'Spieler', href: '/players', icon: UsersIcon, roles: ['admin', 'kassenwart'] },
  { name: 'App installieren', href: '/how-to', icon: SmartphoneIcon },
  { name: 'Administration', href: '/admin', icon: SettingsIcon, roles: ['admin'] },
]

interface SidebarProps {
  userRoles?: Role[]
}

export function Sidebar({ userRoles = ['player'] }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const { currentUserProfile } = useStore()

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }

  const NavContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="relative h-10 w-10 flex-shrink-0">
            <Image src="/logo.png" alt="RW Sutthausen" fill className="object-contain" priority />
          </div>
          <span className="text-xl font-bold font-headline text-primary">Headquarter RWS2</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navigation.map((item) => {
          if (!user && item.href !== '/how-to') return null
          if (item.roles && !item.roles.some(r => userRoles.includes(r as Role))) return null
          const isActive = pathname === item.href
          return (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "group flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <item.icon className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
                )} />
                {item.name}
              </div>
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border bg-sidebar">
        {user && (
          <div className="bg-muted/50 dark:bg-muted/20 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
                {currentUserProfile?.name.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{currentUserProfile?.name || user.displayName || 'Benutzer'}</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mb-2">
          <ThemeToggle />
          {user && (
            <Button variant="ghost" onClick={handleLogout} className="flex-1 justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl">
              <LogOutIcon className="mr-3 h-5 w-5" /> Abmelden
            </Button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <aside className="hidden md:flex h-full w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-sm">
      <NavContent />
    </aside>
  )
}

export function MobileNavTrigger({ userRoles = ['player'], rightElement }: { userRoles?: Role[], rightElement?: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const { currentUserProfile } = useStore()

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/login")
  }
  
  return (
    <div className="md:hidden flex h-auto min-16 flex-col bg-background border-b border-border sticky top-0 z-30 pt-safe-top">
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 h-10 w-10">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 bg-sidebar">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
                <SheetDescription>Hauptmenü Headquarter RWS2</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col h-full">
                <div className="flex h-auto min-16 items-center px-6 border-b border-sidebar-border pt-safe-top">
                  <Link href="/" className="flex items-center gap-3 h-16 hover:opacity-80 transition-opacity" onClick={() => setIsOpen(false)}>
                    <div className="relative h-8 w-8">
                      <Image src="/logo.png" alt="Logo" fill className="object-contain" />
                    </div>
                    <span className="text-xl font-bold font-headline text-primary">Headquarter RWS2</span>
                  </Link>
                </div>
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                  {navigation.map((item) => {
                    if (!user && item.href !== '/how-to') return null
                    if (item.roles && !item.roles.some(r => userRoles.includes(r as Role))) return null
                    const isActive = pathname === item.href
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsOpen(false)}>
                        <div className={cn("group flex items-center px-3 py-3.5 text-base font-medium rounded-xl transition-all duration-200", isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                          <item.icon className={cn("mr-4 h-6 w-6 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground")} />
                          {item.name}
                        </div>
                      </Link>
                    )
                  })}
                </div>
                <div className="p-4 border-t border-sidebar-border bg-sidebar">
                  {user && (
                    <div className="bg-muted/50 dark:bg-muted/20 rounded-2xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm text-sm">
                          {currentUserProfile?.name.substring(0, 2).toUpperCase() || user.email?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-sidebar-foreground truncate">{currentUserProfile?.name || user.displayName || 'Benutzer'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    {user && (
                      <Button variant="ghost" onClick={handleLogout} className="flex-1 justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl py-7">
                        <LogOutIcon className="mr-3 h-5 w-5" /> Abmelden
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-3 ml-2 h-16 hover:opacity-80 transition-opacity">
            <div className="relative h-6 w-6">
              <Image src="/logo.png" alt="RW Sutthausen" fill className="object-contain" />
            </div>
            <span className="font-bold text-lg text-primary">Headquarter RWS2</span>
          </Link>
        </div>
        <div className="flex items-center">{rightElement}</div>
      </div>
    </div>
  )
}
