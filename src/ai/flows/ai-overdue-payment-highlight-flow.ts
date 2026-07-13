'use server';
/**
 * @fileOverview This file defines a Genkit flow for identifying and highlighting players with overdue payments.
 *
 * - highlightOverduePayments - A function that identifies and summarizes overdue payments for players.
 * - OverduePaymentHighlightInput - The input type for the highlightOverduePayments function.
 * - OverduePaymentHighlightOutput - The return type for the highlightOverduePayments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema Definition
const PlayerPaymentSchema = z.object({
  id: z.string().describe('Unique identifier for the player.'),
  name: z.string().describe('The name of the player.'),
  balance: z.number().describe('The current balance of the player. A negative value indicates an overdue payment.'),
});

const OverduePaymentHighlightInputSchema = z.array(PlayerPaymentSchema).describe('A list of all players and their current payment balances.');
export type OverduePaymentHighlightInput = z.infer<typeof OverduePaymentHighlightInputSchema>;

// Output Schema Definition
const OverduePlayerSummarySchema = z.object({
  playerName: z.string().describe('The name of the player with an overdue payment.'),
  overdueAmount: z.number().describe('The amount the player owes (absolute value of negative balance).'),
});

const OverduePaymentHighlightOutputSchema = z.object({
  overduePlayers: z.array(OverduePlayerSummarySchema).describe('A list of players with overdue payments and the amounts they owe.'),
  summaryMessage: z.string().describe('A summary message highlighting the overdue payments.'),
});
export type OverduePaymentHighlightOutput = z.infer<typeof OverduePaymentHighlightOutputSchema>;

// Wrapper function
export async function highlightOverduePayments(input: OverduePaymentHighlightInput): Promise<OverduePaymentHighlightOutput> {
  return overduePaymentHighlightFlow(input);
}

// Prompt definition
const overduePaymentPrompt = ai.definePrompt({
  name: 'overduePaymentPrompt',
  input: {schema: OverduePaymentHighlightInputSchema},
  output: {schema: OverduePaymentHighlightOutputSchema},
  prompt: `You are an AI assistant for a football team's cashier. Your task is to identify players with overdue payments from the provided list and summarize their outstanding balances.\n\nHere is the list of players and their current balances:\n{{#each this}}\n- Player ID: {{this.id}}, Name: {{this.name}}, Balance: {{this.balance}}€\n{{/each}}\n\nPlease identify all players with a negative balance, calculate the absolute amount they owe, and list them. Then, provide a concise summary message highlighting these overdue payments.\n\nExample of desired output structure for 'overduePlayers':\n[\n  {\n    "playerName": "Player A",\n    "overdueAmount": 15.00\n  },\n  {\n    "playerName": "Player B",\n    "overdueAmount": 20.50\n  }\n]\n\nIf there are no overdue payments, the 'overduePlayers' array should be empty, and the 'summaryMessage' should state that there are no overdue payments.\nThe 'summaryMessage' should clearly state which players have overdue payments and also include the total overdue amount across all identified players.`,
});

// Flow definition
const overduePaymentHighlightFlow = ai.defineFlow(
  {
    name: 'overduePaymentHighlightFlow',
    inputSchema: OverduePaymentHighlightInputSchema,
    outputSchema: OverduePaymentHighlightOutputSchema,
  },
  async (input) => {
    const {output} = await overduePaymentPrompt(input);
    return output!;
  }
);
