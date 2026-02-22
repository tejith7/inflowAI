'use server';

import {
  employeeInfoRetrievalChatbot,
  EmployeeInfoRetrievalChatbotInput,
} from '@/ai/flows/employee-info-retrieval-chatbot-flow';
import { chatbotQueryClarification } from '@/ai/flows/chatbot-query-clarification';
import { hybridSearch } from '@/lib/search-utils';

export type HandleQueryResponse =
  | {
    type: 'clarification';
    question: string;
  }
  | {
    type: 'answer';
    answer: string;
    citations: string[];
  }
  | {
    type: 'error';
    message: string;
  };

type ContextDocument =
  EmployeeInfoRetrievalChatbotInput['contextDocuments'][number];

type HistoryItem = {
  role: 'user' | 'bot';
  content: string;
};

export async function handleQuery(
  query: string,
  conversationHistory: HistoryItem[],
  contextDocuments: ContextDocument[]
): Promise<HandleQueryResponse> {
  try {
    // Step 1: Check if the query needs clarification, providing history for context
    const clarificationResult = await chatbotQueryClarification({
      query,
      history: conversationHistory,
    });

    if (clarificationResult.clarificationNeeded && clarificationResult.question) {
      return {
        type: 'clarification',
        question: clarificationResult.question,
      };
    }

    // Step 2: Use Hybrid RAG to retrieve the most relevant documents
    const relevantDocuments = await hybridSearch(query, contextDocuments, 5);

    // Step 3: Pass only the relevant documents to the LLM
    const result = await employeeInfoRetrievalChatbot({
      query,
      history: conversationHistory,
      contextDocuments: relevantDocuments,
    });

    return {
      type: 'answer',
      answer: result.answer,
      citations: result.citations,
    };
  } catch (error) {
    console.error('Error handling query:', error);
    return {
      type: 'error',
      message: 'Sorry, I encountered an error. Please try again.',
    };
  }
}
