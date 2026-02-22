'use server';
/**
 * @fileOverview A Genkit flow for the InfoWise chatbot to answer employee questions
 *               about company policies and internal information.
 *
 * - employeeInfoRetrievalChatbot - A function that handles the employee information retrieval process.
 * - EmployeeInfoRetrievalChatbotInput - The input type for the employeeInfoRetrievalChatbot function.
 * - EmployeeInfoRetrievalChatbotOutput - The return type for the employeeInfoRetrievalChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContextDocumentSchema = z.object({
    title: z.string(),
    content: z.string(),
});

const HistoryItemSchema = z.object({
    role: z.enum(['user', 'bot']),
    content: z.string(),
});

const EmployeeInfoRetrievalChatbotInputSchema = z.object({
  query: z.string().describe('The natural language question from the employee.'),
  history: z.array(HistoryItemSchema).optional().describe("The conversation history leading up to the query."),
  contextDocuments: z.array(ContextDocumentSchema).describe('A list of internal documents to use as context for answering the query.'),
});
export type EmployeeInfoRetrievalChatbotInput = z.infer<
  typeof EmployeeInfoRetrievalChatbotInputSchema
>;

const EmployeeInfoRetrievalChatbotOutputSchema = z.object({
  answer: z
    .string()
    .describe(
      'A concise and accurate answer based on the provided internal company documents. If the answer cannot be found in the documents, state that.'
    ),
  citations: z
    .array(z.string())
    .describe(
      'A list of titles of the source documents used to formulate the answer. Only cite documents that were actually used.'
    ),
});
export type EmployeeInfoRetrievalChatbotOutput = z.infer<
  typeof EmployeeInfoRetrievalChatbotOutputSchema
>;

export async function employeeInfoRetrievalChatbot(
  input: EmployeeInfoRetrievalChatbotInput
): Promise<EmployeeInfoRetrievalChatbotOutput> {
  return employeeInfoRetrievalChatbotFlow(input);
}

const employeeInfoRetrievalPrompt = ai.definePrompt({
  name: 'employeeInfoRetrievalPrompt',
  input: {schema: EmployeeInfoRetrievalChatbotInputSchema},
  output: {schema: EmployeeInfoRetrievalChatbotOutputSchema},
  prompt: `You are InfoWise, a helpful and intelligent internal knowledge hub chatbot for a large organization. Your goal is to provide concise, accurate, and reliable answers to employee questions based ONLY on the internal company documents provided below. You should consider the entire conversation history to understand the full context of the user's latest query.

Conversation History:
{{#if history}}
{{#each history}}
- {{this.role}}: {{this.content}}
{{/each}}
{{else}}
(No history)
{{/if}}

Employee's Latest Query: {{{query}}}

Available Documents:
{{#each contextDocuments}}
- Document Title: {{{this.title}}}
  Document Content: {{{this.content}}}
{{/each}}

Instructions:
1.  Carefully read the latest query, the conversation history, and all the provided documents. The history provides context for the latest query.
2.  Formulate a direct and to-the-point answer to the user's latest query using ONLY the information from the "Available Documents".
3.  If the answer cannot be found within the provided documents, explicitly state that the information is not available in the knowledge base. Do not make up information.
4.  For your answer, create a list of citations referencing the 'Document Title' of the exact documents you used. If no documents were used, provide an empty list for citations.
5.  Respond in the required JSON format.`,
});

const employeeInfoRetrievalChatbotFlow = ai.defineFlow(
  {
    name: 'employeeInfoRetrievalChatbotFlow',
    inputSchema: EmployeeInfoRetrievalChatbotInputSchema,
    outputSchema: EmployeeInfoRetrievalChatbotOutputSchema,
  },
  async input => {
    if (input.contextDocuments.length === 0) {
        return {
            answer: "I don't have any documents in my knowledge base to search. Please add documents in the admin section.",
            citations: [],
        };
    }
    const {output} = await employeeInfoRetrievalPrompt(input);
    return output!;
  }
);
