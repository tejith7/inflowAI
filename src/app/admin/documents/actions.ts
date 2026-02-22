'use server';

import { ingestDocument } from '@/ai/flows/ingest-document-flow';
import { extractContentFromHtml } from '@/ai/flows/extract-content-from-html-flow';

export async function generateTitleForDocument(rawContent: string): Promise<{ title: string } | { error: string }> {
    try {
        if (!rawContent.trim()) {
            return { error: 'Content cannot be empty.' };
        }
        const result = await ingestDocument({ rawContent });
        return { title: result.title };
    } catch (error) {
        console.error('Error generating title:', error);
        return { error: 'Failed to generate title from content.' };
    }
}

export async function processUrlForIngestion(url: string): Promise<{ title: string; content: string; originalUrl: string } | { error: string }> {
    try {
        if (!url.trim() || !url.startsWith('http')) {
            return { error: 'Please enter a valid URL.' };
        }

        // 1. Fetch HTML from URL
        const response = await fetch(url);
        if (!response.ok) {
            return { error: `Failed to fetch URL: ${response.statusText}` };
        }
        const htmlContent = await response.text();

        // 2. Extract content from HTML using an AI flow
        const extractionResult = await extractContentFromHtml({ htmlContent });
        const { extractedContent } = extractionResult;
        if (!extractedContent || extractedContent.trim().length < 10) {
            return { error: 'Could not extract meaningful content from the URL.' };
        }

        // 3. Generate title from extracted content using existing AI flow
        const result = await ingestDocument({ rawContent: extractedContent });
        
        return {
            title: result.title,
            content: result.content,
            originalUrl: url,
        };

    } catch (error) {
        console.error('Error processing URL for ingestion:', error);
        return { error: 'Failed to process the URL. Please check if it is a valid and accessible web page.' };
    }
}
