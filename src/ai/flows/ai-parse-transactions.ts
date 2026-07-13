'use server';
/**
 * @fileOverview Ein Genkit-Flow zum Analysieren von Bank- oder PayPal-Transaktionstexten.
 * 
 * - parseTransactions - Extrahiert Spieler-Zahlungen aus Rohtext.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const TransactionInputSchema = z.object({
  rawText: z.string().describe("Der kopierte Text aus PayPal oder Online-Banking."),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).describe("Liste der aktuellen Spieler zum Abgleich."),
});

const IdentifiedPaymentSchema = z.object({
  playerId: z.string().describe("ID des identifizierten Spielers."),
  playerName: z.string().describe("Name des identifizierten Spielers."),
  amount: z.number().describe("Der erkannte Zahlungsbetrag."),
  date: z.string().describe("Das erkannte Datum der Transaktion."),
  confidence: z.number().describe("Sicherheit der Erkennung (0-1)."),
});

const ParseTransactionsOutputSchema = z.object({
  identifiedPayments: z.array(IdentifiedPaymentSchema),
  unmatchedLines: z.array(z.string()).describe("Zeilen, die keinem Spieler zugeordnet werden konnten."),
});

export type ParseTransactionsOutput = z.infer<typeof ParseTransactionsOutputSchema>;

export async function parseTransactions(input: z.infer<typeof TransactionInputSchema>): Promise<ParseTransactionsOutput> {
  return parseTransactionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'parseTransactionsPrompt',
  input: { schema: TransactionInputSchema },
  output: { schema: ParseTransactionsOutputSchema },
  prompt: `Du bist ein spezialisierter Buchhaltungs-Assistent für einen Fußballverein.
Deine Aufgabe ist es, aus dem bereitgestellten Rohtext (PayPal-Auszug oder Bank-Umsätze) Zahlungen von Spielern zu identifizieren.

Hier ist die Liste der bekannten Spieler:
{{#each players}}
- ID: {{this.id}}, Name: {{this.name}}
{{/each}}

Analysiere diesen Text:
"""
{{{rawText}}}
"""

Regeln:
1. Ordne Zahlungen anhand des Namens (auch Teilnamen oder Vorname) den Spielern zu.
2. Extrahiere den Betrag und das Datum.
3. Wenn ein Name im Text vorkommt, der nicht in der Spielerliste ist, setze ihn auf die 'unmatchedLines'.
4. Sei vorsichtig mit 'confidence'. Wenn du unsicher bist, setze sie niedrig.
5. Ignoriere Ausgaben (negative Beträge), suche nur nach Zahlungseingängen.`,
});

const parseTransactionsFlow = ai.defineFlow(
  {
    name: 'parseTransactionsFlow',
    inputSchema: TransactionInputSchema,
    outputSchema: ParseTransactionsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
