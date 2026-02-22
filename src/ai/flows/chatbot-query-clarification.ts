'use server';
/**
 * @fileOverview This file provides a Genkit flow for clarifying ambiguous or broad user queries
 * to the InfoWise chatbot.
 *
 * - chatbotQueryClarification - A function that takes a user query and returns a clarifying question if needed.
 * - ChatbotQueryClarificationInput - The input type for the chatbotQueryClarification function.
 * - ChatbotQueryClarificationOutput - The return type for the chatbotQueryClarification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HistoryItemSchema = z.object({
  role: z.enum(['user', 'bot']),
  content: z.string(),
});

// Input Schema
const ChatbotQueryClarificationInputSchema = z.object({
  query: z.string().describe("The user's latest query."),
  history: z.array(HistoryItemSchema).optional().describe("The conversation history leading up to the query."),
});
export type ChatbotQueryClarificationInput = z.infer<typeof ChatbotQueryClarificationInputSchema>;

// Output Schema
const ChatbotQueryClarificationOutputSchema = z.object({
  clarificationNeeded: z.boolean().describe('Whether a clarifying question is needed.'),
  question: z.string().describe('A single, concise follow-up question to ask the user. Empty if no clarification is needed.'),
});
export type ChatbotQueryClarificationOutput = z.infer<typeof ChatbotQueryClarificationOutputSchema>;

export async function chatbotQueryClarification(input: ChatbotQueryClarificationInput): Promise<ChatbotQueryClarificationOutput> {
  return chatbotQueryClarificationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clarifyChatbotQueryPrompt',
  input: { schema: ChatbotQueryClarificationInputSchema },
  output: { schema: ChatbotQueryClarificationOutputSchema },
  prompt: `You are InfoFlow AI, an intelligent internal assistant for a large organization.
Your behavior rules:
- Your goal is to be professional, confident, and concise.
- Analyze the user's latest query in the context of the conversation history.
- If the latest query, combined with the history, is vague, ambiguous, or lacks specific detail, you MUST formulate a single, smart follow-up question to better understand the user's intent. Set 'clarificationNeeded' to true and populate the 'question'.
- If the query and history provide enough information to be answerable, you MUST set 'clarificationNeeded' to false and leave 'question' empty.
- Ask only one clarification question at a time.
- Do not overwhelm the user.

Conversation History:
{{#if history}}
{{#each history}}
- {{this.role}}: {{this.content}}
{{/each}}
{{else}}
(No history)
{{/if}}

User's Latest Query: "{{{query}}}"

Example 1: Vague Query (No History)
User's Latest Query: "Tell me about benefits"
Your Output: { "clarificationNeeded": true, "question": "Of course. Could you specify which benefits you're interested in? For example, are you looking for information on health insurance, retirement plans, or paid time off?" }

Example 2: Specific Query (No History)
User's Latest Query: "How do I submit an expense report for my trip to London?"
Your Output: { "clarificationNeeded": false, "question": "" }

Example 3: Vague Query with History
Conversation History:
- user: "Tell me about holidays"
- bot: "Certainly. Are you asking for the official company holiday schedule for the current year, or information on our time-off policies related to holidays?"
User's Latest Query: "The schedule"
Your Output: { "clarificationNeeded": false, "question": "" } // The combined context is now specific enough.

Please provide your response in the required JSON format.`,
});

const chatbotQueryClarificationFlow = ai.defineFlow(
  {
    name: 'chatbotQueryClarificationFlow',
    inputSchema: ChatbotQueryClarificationInputSchema,
    outputSchema: ChatbotQueryClarificationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
