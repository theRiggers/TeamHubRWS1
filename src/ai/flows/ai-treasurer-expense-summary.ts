'use server';
/**
 * @fileOverview A Genkit flow for generating an AI-powered summary of team expenses for a football team's treasurer.
 *
 * - treasurerExpenseSummary - A function that triggers the expense summary generation.
 * - TreasurerExpenseSummaryInput - The input type for the treasurerExpenseSummary function.
 * - TreasurerExpenseSummaryOutput - The return type for the treasurerExpenseSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpenseItemSchema = z.object({
  playerId: z.string().describe('The ID of the player associated with the expense.'),
  playerName: z.string().describe('The name of the player.'),
  itemType: z.enum(['beer', 'crate']).describe('The type of drink purchased (beer or crate).'),
  cost: z.number().describe('The cost of the item.'),
  date: z.string().datetime().describe('The date and time the expense was recorded in ISO 8601 format (e.g., "YYYY-MM-DDTHH:mm:ss.sssZ").'),
});

const TreasurerExpenseSummaryInputSchema = z.object({
  expenses: z.array(ExpenseItemSchema).describe('A list of all team expenses.'),
});
export type TreasurerExpenseSummaryInput = z.infer<typeof TreasurerExpenseSummaryInputSchema>;

const PlayerItemBreakdownSchema = z.object({
  itemType: z.enum(['beer', 'crate']).describe('The type of drink purchased (beer or crate).'),
  quantity: z.number().int().describe('The total quantity of this item type consumed by the player.'),
  totalCost: z.number().describe('The total cost for this item type for the player.'),
});

const PlayerSummaryOutputSchema = z.object({
  playerId: z.string().describe('The ID of the player.'),
  playerName: z.string().describe('The name of the player.'),
  totalOwed: z.number().describe('The total amount of money the player owes.'),
  itemBreakdown: z.array(PlayerItemBreakdownSchema).describe('Breakdown of items and their costs for this player.'),
});

const OverduePaymentSchema = z.object({
  playerId: z.string().describe('The ID of the player with overdue payments.'),
  playerName: z.string().describe('The name of the player with overdue payments.'),
  amount: z.number().describe('The amount overdue.'),
  reason: z.string().describe('A brief reason for identifying this as an overdue payment (e.g., "Expenses from over 30 days ago").'),
});

const TreasurerExpenseSummaryOutputSchema = z.object({
  overallSummary: z.string().describe('A general summary of the team expenses, including total amounts, average spend per player, and any notable trends.'),
  playerSummaries: z.array(PlayerSummaryOutputSchema).describe('Detailed summaries for each player, including their total outstanding amount and a breakdown of items consumed.'),
  overduePayments: z.array(OverduePaymentSchema).describe('A list of players with potentially overdue payments, including the amount and a reason.'),
  paymentRequestMessages: z.array(z.string()).describe('Suggested payment request messages for players identified with overdue payments. Each string is a complete message for one player.'),
});
export type TreasurerExpenseSummaryOutput = z.infer<typeof TreasurerExpenseSummaryOutputSchema>;

export async function treasurerExpenseSummary(input: TreasurerExpenseSummaryInput): Promise<TreasurerExpenseSummaryOutput> {
  return treasurerExpenseSummaryFlow(input);
}

// Define a schema for the prompt's specific input, which includes currentDate for calculations.
const TreasurerExpenseSummaryPromptInputSchema = TreasurerExpenseSummaryInputSchema.extend({
  currentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("The current date in 'YYYY-MM-DD' format."),
});

const prompt = ai.definePrompt({
  name: 'treasurerExpenseSummaryPrompt',
  input: {schema: TreasurerExpenseSummaryPromptInputSchema},
  output: {schema: TreasurerExpenseSummaryOutputSchema},
  prompt: `You are an AI-powered assistant for a football team's treasurer. Your task is to generate a comprehensive summary of all team expenses for beer and other drinks, broken down by player and drink type. You should also identify any potentially overdue payments and suggest payment request messages.\n\nToday's date is: {{{currentDate}}}.\n\nHere are the expenses incurred by the team:\n\n{{#each expenses}}\n- Player ID: {{{playerId}}}, Player Name: {{{playerName}}}, Item: {{{itemType}}}, Cost: \u20ac{{{cost}}}, Date: {{{date}}}\n{{/each}}\n\nPlease analyze the provided expense data and generate a JSON object conforming to the TreasurerExpenseSummaryOutputSchema.\n\nWhen identifying overdue payments, consider any expense recorded more than 30 days prior to today's date ({{{currentDate}}}) as potentially overdue. Sum up all such older expenses for each player to determine their overdue amount.\n\nFor the payment request messages, create clear, concise, and polite messages addressed to individual players with overdue payments, reminding them of their outstanding balance and the items they owe for.`,
});

const treasurerExpenseSummaryFlow = ai.defineFlow(
  {
    name: 'treasurerExpenseSummaryFlow',
    inputSchema: TreasurerExpenseSummaryInputSchema,
    outputSchema: TreasurerExpenseSummaryOutputSchema,
  },
  async (input) => {
    // Get the current date to pass to the prompt for overdue payment calculation.
    const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Pass the combined object (original input + current date) to the prompt.
    const {output} = await prompt({...input, currentDate});
    return output!;
  }
);
