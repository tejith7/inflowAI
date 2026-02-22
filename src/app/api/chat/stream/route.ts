import { ai } from '@/ai/genkit';
import { chatbotQueryClarification } from '@/ai/flows/chatbot-query-clarification';
import { hybridSearch } from '@/lib/search-utils';
import { z } from 'genkit';

export const maxDuration = 60;

const EmployeeInfoRetrievalOutputSchema = z.object({
    answer: z.string(),
    citations: z.array(z.string()),
});

const systemPrompt = `You are InfoWise, a helpful and intelligent internal knowledge hub chatbot for a large organization. Your goal is to provide concise, accurate, and reliable answers to employee questions based ONLY on the internal company documents provided below. You should consider the entire conversation history to understand the full context of the user's latest query.

Instructions:
1.  Carefully read the latest query, the conversation history, and all the provided documents.
2.  Formulate a direct and to-the-point answer using ONLY the information from the provided documents.
3.  If the answer cannot be found within the provided documents, explicitly state that the information is not available in the knowledge base.
4.  For your answer, create a list of citations referencing the document titles you used.
5.  Respond in the required JSON format with "answer" and "citations" fields.`;

export async function POST(req: Request) {
    try {
        const { query, conversationHistory, contextDocuments } = await req.json();

        // Step 1: Clarification check (non-streamed, fast)
        const clarificationResult = await chatbotQueryClarification({
            query,
            history: conversationHistory || [],
        });

        if (clarificationResult.clarificationNeeded && clarificationResult.question) {
            return new Response(
                `data: ${JSON.stringify({ type: 'clarification', question: clarificationResult.question })}\n\n`,
                {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        Connection: 'keep-alive',
                    },
                }
            );
        }

        // Step 2: Hybrid search for relevant docs
        const relevantDocuments = await hybridSearch(query, contextDocuments || [], 5);

        // Build the prompt content
        const historyText = conversationHistory?.length
            ? conversationHistory.map((h: { role: string; content: string }) => `- ${h.role}: ${h.content}`).join('\n')
            : '(No history)';

        const docsText = relevantDocuments.length
            ? relevantDocuments.map((d: { title: string; content: string }) =>
                `- Document Title: ${d.title}\n  Document Content: ${d.content}`
            ).join('\n')
            : '(No documents available)';

        const userPrompt = `Conversation History:\n${historyText}\n\nEmployee's Latest Query: ${query}\n\nAvailable Documents:\n${docsText}`;

        // Step 3: Stream the LLM response
        const { stream, response } = await ai.generateStream({
            system: systemPrompt,
            prompt: userPrompt,
            output: { schema: EmployeeInfoRetrievalOutputSchema },
        });

        const encoder = new TextEncoder();

        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    // Stream text chunks as they arrive
                    for await (const chunk of stream) {
                        const text = chunk.text;
                        if (text) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ type: 'token', content: text })}\n\n`)
                            );
                        }
                    }

                    // After stream completes, get the structured output
                    const finalResponse = await response;
                    const output = finalResponse.output;

                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({
                                type: 'done',
                                answer: output?.answer || finalResponse.text,
                                citations: output?.citations || [],
                            })}\n\n`
                        )
                    );
                } catch (error) {
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ type: 'error', message: 'An error occurred while generating the response.' })}\n\n`
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
    } catch (error) {
        console.error('Streaming error:', error);
        return new Response(
            `data: ${JSON.stringify({ type: 'error', message: 'Sorry, I encountered an error. Please try again.' })}\n\n`,
            {
                status: 500,
                headers: { 'Content-Type': 'text/event-stream' },
            }
        );
    }
}
