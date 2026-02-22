'use server';
/**
 * @fileOverview A Genkit flow to process raw text content and prepare it for ingestion
 *               as a structured document.
 *
 * - ingestDocument - A function that takes raw text and generates a title.
 * - IngestDocumentInput - The input type for the ingestDocument function.
 * - IngestDocumentOutput - The return type for the ingestDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IngestDocumentInputSchema = z.object({
  rawContent: z.string().describe('The raw text content of the document to be ingested.'),
});
export type IngestDocumentInput = z.infer<
  typeof IngestDocumentInputSchema
>;

const IngestDocumentOutputSchema = z.object({
  title: z.string().describe('A concise, descriptive title generated from the document content.'),
  content: z.string().describe('The original content of the document.'),
});
export type IngestDocumentOutput = z.infer<
  typeof IngestDocumentOutputSchema
>;

export async function ingestDocument(
  input: IngestDocumentInput
): Promise<IngestDocumentOutput> {
  return ingestDocumentFlow(input);
}

const TitleGenerationPromptOutput = z.object({
  title: z.string().describe('A concise, descriptive title generated from the document content.'),
});

const ingestDocumentPrompt = ai.definePrompt({
  name: 'ingestDocumentPrompt',
  input: {schema: IngestDocumentInputSchema},
  output: {schema: TitleGenerationPromptOutput},
  prompt: `You are a document processing AI. Your task is to analyze the following document content and generate a concise, descriptive title for it. The title should accurately summarize the main topic of the document.

Document Content:
{{{rawContent}}}`,
});

const ingestDocumentFlow = ai.defineFlow(
  {
    name: 'ingestDocumentFlow',
    inputSchema: IngestDocumentInputSchema,
    outputSchema: IngestDocumentOutputSchema,
  },
  async input => {
    const {output} = await ingestDocumentPrompt(input);
    return {
      title: output!.title,
      content: input.rawContent, // Return original content alongside the generated title
    };
  }
);
