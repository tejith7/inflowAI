'use server';

import { ai } from '@/ai/genkit';

/**
 * Generate an embedding vector for the given text using Gemini's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const result = await ai.embed({
        embedder: 'googleai/text-embedding-004',
        content: text,
    });
    return result[0].embedding;
}
