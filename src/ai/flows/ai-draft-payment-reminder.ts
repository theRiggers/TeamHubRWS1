
'use server';
/**
 * @fileOverview A Genkit flow for drafting personalized payment reminders including PayPal links.
 *
 * - draftPaymentReminder - A function that generates a payment reminder message for a player.
 * - DraftPaymentReminderInput - The input type for the draftPaymentReminder function.
 * - DraftPaymentReminderOutput - The return type for the draftPaymentReminder function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const DraftPaymentReminderInputSchema = z.object({
  playerName: z.string().describe("The name of the player who needs a reminder."),
  outstandingAmount: z.number().describe("The outstanding balance of the player in Euros."),
  paypalLink: z.string().describe("The base PayPal.me or payment link for the team treasury."),
});
export type DraftPaymentReminderInput = z.infer<typeof DraftPaymentReminderInputSchema>;

const DraftPaymentReminderOutputSchema = z.object({
  reminderMessage: z.string().describe("A personalized payment reminder message for the player."),
});
export type DraftPaymentReminderOutput = z.infer<typeof DraftPaymentReminderOutputSchema>;

export async function draftPaymentReminder(input: DraftPaymentReminderInput): Promise<DraftPaymentReminderOutput> {
  return draftPaymentReminderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'draftPaymentReminderPrompt',
  input: { schema: DraftPaymentReminderInputSchema.extend({ fullPaypalLink: z.string() }) },
  output: { schema: DraftPaymentReminderOutputSchema },
  prompt: `You are an AI assistant for a football team's treasury. Your task is to draft a friendly, yet clear, payment reminder message for a player.
The message should include the player's name, their outstanding balance, and a polite call to action to settle their dues.
Crucially, include the PayPal link for the team treasury so the player can pay easily.

Player Name: {{{playerName}}}
Outstanding Amount: {{{outstandingAmount}}}€
PayPal Link: {{{fullPaypalLink}}}

Draft the reminder message:`,
});

const draftPaymentReminderFlow = ai.defineFlow(
  {
    name: 'draftPaymentReminderFlow',
    inputSchema: DraftPaymentReminderInputSchema,
    outputSchema: DraftPaymentReminderOutputSchema,
  },
  async (input) => {
    // Determine the full link based on link type
    let fullPaypalLink = input.paypalLink;
    if (input.paypalLink.includes('paypal.me')) {
        const base = input.paypalLink.endsWith('/') ? input.paypalLink : `${input.paypalLink}/`;
        fullPaypalLink = `${base}${input.outstandingAmount}`;
    }

    const { output } = await prompt({
      ...input,
      fullPaypalLink
    });
    return output!;
  }
);
