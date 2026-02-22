import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const maxDuration = 60;

export async function POST(req: Request) {
    const encoder = new TextEncoder();

    try {
        const body = await req.json();
        const { query, conversationHistory, contextDocuments } = body;

        // Initialize Genkit fresh in the route to avoid module caching issues
        const ai = genkit({
            plugins: [googleAI()],
            model: 'googleai/gemini-2.5-flash',
        });

        // Build context
        const historyText = conversationHistory?.length
            ? conversationHistory.map((h: { role: string; content: string }) => `- ${h.role}: ${h.content}`).join('\n')
            : '(No history)';

        // Simple keyword search
        const queryTerms = query.toLowerCase().split(/\s+/);
        const relevantDocs = (contextDocuments || [])
            .map((doc: { title: string; content: string }) => ({
                doc,
                score: queryTerms.reduce((s: number, t: string) =>
                    s + ((doc.title + ' ' + doc.content).toLowerCase().includes(t) ? 1 : 0), 0),
            }))
            .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
            .slice(0, 5)
            .map((s: { doc: { title: string; content: string } }) => s.doc);

        const docsText = relevantDocs.length
            ? relevantDocs.map((d: { title: string; content: string }) =>
                `- Document Title: ${d.title}\n  Document Content: ${d.content}`
            ).join('\n')
            : '(No documents available)';

        const systemPrompt = `You are InfoWise, a helpful and intelligent internal knowledge hub chatbot. Answer employee questions based ONLY on the provided documents. If the answer cannot be found, state that. Consider conversation history for context.`;

        const userPrompt = `Conversation History:\n${historyText}\n\nEmployee's Latest Query: ${query}\n\nAvailable Documents:\n${docsText}`;

        // Stream response
        const { stream, response } = await ai.generateStream({
            system: systemPrompt,
            prompt: userPrompt,
        });

        let fullText = '';

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const text = chunk.text;
                        if (text) {
                            fullText += text;
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: text })}\n\n`)
                            );
                        }
                    }

                    await response;

                    // Extract citations by checking which doc titles appear in the response
                    const citations: string[] = [];
                    for (const doc of relevantDocs) {
                        if (fullText.toLowerCase().includes(doc.title.toLowerCase())) {
                            citations.push(doc.title);
                        }
                    }

                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ type: 'done', answer: fullText, citations })}\n\n`
                        )
                    );
                } catch (err) {
                    console.error('Stream chunk error:', err);
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ type: 'error', message: 'Error generating response.' })}\n\n`
                        )
                    );
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        });
    } catch (error: any) {
        console.error('STREAMING ROUTE ERROR:', error?.message, error?.stack);
        return new Response(
            `data: ${JSON.stringify({ type: 'error', message: error?.message || 'Server error' })}\n\n`,
            {
                status: 500,
                headers: { 'Content-Type': 'text/event-stream' },
            }
        );
    }
}
