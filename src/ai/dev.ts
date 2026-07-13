import { config } from 'dotenv';
config();

import '@/ai/flows/ai-draft-payment-reminder.ts';
import '@/ai/flows/ai-overdue-payment-highlight-flow.ts';
import '@/ai/flows/ai-treasurer-expense-summary.ts';
import '@/ai/flows/ai-parse-transactions.ts';
// src/ai/flows/ai-clubhouse-payment-draft.ts is no longer used for the UI but can remain in filesystem.
