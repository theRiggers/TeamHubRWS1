'use server';
/**
 * @fileOverview Ein Genkit-Flow zum Entwerfen einer Nachricht für die Kisten-Abrechnung mit dem Vereinsheim.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ClubhousePaymentInputSchema = z.object({
  crateCount: z.number().describe("Anzahl der im Monat gekauften Kisten."),
  totalAmount: z.number().describe("Der Gesamtbetrag, der an das Vereinsheim zu zahlen ist."),
  monthName: z.string().describe("Der Name des aktuellen Abrechnungsmonats."),
});

const ClubhousePaymentOutputSchema = z.object({
  draftMessage: z.string().describe("Ein Entwurf für die Nachricht/E-Mail an das Vereinsheim."),
});

export async function draftClubhousePayment(input: z.infer<typeof ClubhousePaymentInputSchema>) {
  return draftClubhousePaymentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'draftClubhousePaymentPrompt',
  input: { schema: ClubhousePaymentInputSchema },
  output: { schema: ClubhousePaymentOutputSchema },
  prompt: `Du bist der Schatzmeister eines Fußballvereins. 
Deine Aufgabe ist es, eine kurze, freundliche Nachricht an das Vereinsheim (oder den Wirt) zu verfassen.
Darin teilst du mit, wie viele Kisten im Monat {{{monthName}}} verbraucht wurden und dass der Betrag von {{{totalAmount}}}€ (basierend auf {{{crateCount}}} Kisten) nun überwiesen wird.

Monat: {{{monthName}}}
Anzahl Kisten: {{{crateCount}}}
Gesamtbetrag: {{{totalAmount}}}€

Schreibe die Nachricht so, dass sie direkt kopiert und per WhatsApp oder E-Mail verschickt werden kann.`,
});

const draftClubhousePaymentFlow = ai.defineFlow(
  {
    name: 'draftClubhousePaymentFlow',
    inputSchema: ClubhousePaymentInputSchema,
    outputSchema: ClubhousePaymentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
