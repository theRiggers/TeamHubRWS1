
"use client"

import { useState, useEffect } from "react"
import { Beer, Package, PlusCircle, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useStore, Role } from "@/lib/store"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface ExpenseActionsProps {
  currentUserId: string;
  userRoles?: Role[];
}

export function ExpenseActions({ currentUserId, userRoles = ['player'] }: ExpenseActionsProps) {
  const { toast } = useToast()
  const { addExpense, settings, players } = useStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [targetPlayerId, setTargetPlayerId] = useState(currentUserId)

  useEffect(() => {
    setTargetPlayerId(currentUserId)
  }, [currentUserId])

  const isPrivileged = userRoles.includes('admin') || userRoles.includes('kassenwart')

  const handleAdd = (type: 'beer' | 'crate') => {
    setLoading(type)
    
    const targetPlayer = players.find(p => p.id === targetPlayerId)
    const name = targetPlayer?.name || "Spieler"

    setTimeout(() => {
      addExpense(targetPlayerId, type)
      setLoading(null)
      toast({
        title: "Erfolgreich!",
        description: `${type === 'beer' ? 'Bier' : 'Kasten'} für ${name} verbucht.`,
      })
    }, 400)
  }

  return (
    <div className="space-y-4">
      {isPrivileged && (
        <Card className="border-none shadow-md bg-card rounded-2xl overflow-hidden mb-2">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <UserCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Buchen für:</Label>
              <Select value={targetPlayerId} onValueChange={setTargetPlayerId}>
                <SelectTrigger className="h-10 rounded-xl border-none bg-muted/30 dark:bg-muted/10 font-bold focus:ring-0">
                  <SelectValue placeholder="Spieler wählen" />
                </SelectTrigger>
                <SelectContent>
                  {players.filter(p => p.email !== 'kasse@kickoff.de').map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.id === currentUserId ? "(Ich)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:gap-4 md:grid-cols-2">
        <Card className="overflow-hidden border-none shadow-lg glass-card relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Beer className="h-16 md:h-24 w-16 md:w-24 text-primary rotate-12" />
          </div>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
              <Beer className="h-5 w-5" />
              Bier
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <p className="text-2xl md:text-3xl font-bold text-foreground mb-4">{settings.beerPrice.toFixed(2)} €</p>
            <Button 
              className="w-full h-14 md:h-12 rounded-xl text-lg font-bold cyan-glow transition-all active:scale-95 flex items-center justify-center gap-2" 
              onClick={() => handleAdd('beer')}
              disabled={!!loading}
            >
              {loading === 'beer' ? <PlusCircle className="animate-spin h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              Bier eintragen
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none shadow-lg glass-card relative group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Package className="h-16 md:h-24 w-16 md:w-24 text-accent -rotate-12" />
          </div>
          <CardHeader className="p-4 md:p-6 pb-2">
            <CardTitle className="flex items-center gap-2 text-primary text-lg">
              <Package className="h-5 w-5" />
              Ganze Kiste
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <p className="text-2xl md:text-3xl font-bold text-foreground mb-4">{settings.cratePrice.toFixed(2)} €</p>
            <Button 
              variant="outline"
              className="w-full h-14 md:h-12 rounded-xl text-lg font-bold border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all active:scale-95 flex items-center justify-center gap-2" 
              onClick={() => handleAdd('crate')}
              disabled={!!loading}
            >
              {loading === 'crate' ? <PlusCircle className="animate-spin h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              Kiste eintragen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
