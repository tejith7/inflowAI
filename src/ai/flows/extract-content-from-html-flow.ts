'use server';
/**
 * @fileOverview A Genkit flow to extract the main text content from a raw HTML string.
 *
 * - extractContentFromHtml - A function that takes HTML and returns clean text.
 * - ExtractContentFromHtmlInput - The input type for the function.
 * - ExtractContentFromHtmlOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractContentFromHtmlInputSchema = z.object({
  htmlContent: z.string().describe('The raw HTML content of a web page.'),
});
export type ExtractContentFromHtmlInput = z.infer<
  typeof ExtractContentFromHtmlInputSchema
>;

const ExtractContentFromHtmlOutputSchema = z.object({
  extractedContent: z.string().describe('The clean, main textual content extracted from the HTML, with all boilerplate (nav, footer, ads) removed.'),
});
export type ExtractContentFromHtmlOutput = z.infer<
  typeof ExtractContentFromHtmlOutputSchema
>;

export async function extractContentFromHtml(
  input: ExtractContentFromHtmlInput
): Promise<ExtractContentFromHtmlOutput> {
  return extractContentFromHtmlFlow(input);
}

const extractContentPrompt = ai.definePrompt({
  name: 'extractContentFromHtmlPrompt',
  input: { schema: ExtractContentFromHtmlInputSchema },
  output: { schema: ExtractContentFromHtmlOutputSchema },
  prompt: `You are an expert web content extractor. Your task is to analyze the following HTML document and extract only the main article or body text.
  
  Instructions:
  1.  Identify the primary content of the page. This is usually within <article>, <main>, or a div with an ID like 'content' or 'main'.
  2.  Exclude all non-essential elements like navigation bars, sidebars, headers, footers, advertisements, and cookie banners.
  3.  Remove all script and style tags.
  4.  Convert the remaining HTML into clean, readable text. Preserve paragraph breaks.
  5.  If the HTML appears to have no main content (e.g., it's just a login page or an error page), return an empty string for the extractedContent.

HTML Content:
\`\`\`html
{{{htmlContent}}}
\`\`\`
`,
});

const extractContentFromHtmlFlow = ai.defineFlow(
  {
    name: 'extractContentFromHtmlFlow',
    inputSchema: ExtractContentFromHtmlInputSchema,
    outputSchema: ExtractContentFromHtmlOutputSchema,
  },
  async input => {
    const { output } = await extractContentPrompt(input);
    return output!;
  }
);
