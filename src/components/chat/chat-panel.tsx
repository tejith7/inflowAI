'use client';

import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { ChatMessage, type Message } from '@/components/chat/chat-message';
import { ChatDocumentDialog } from '@/components/chat/chat-document-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { useChatHistory } from '@/hooks/use-chat-history';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Document {
  id: string;
  title: string;
  content: string;
  fileType: string;
  originalFilename?: string;
  ingestedAt: Timestamp | null;
}

interface ChatPanelProps {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  chatHistory: ReturnType<typeof useChatHistory>;
}

export function ChatPanel({ messages, setMessages, chatHistory }: ChatPanelProps) {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const documentsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'documents') : null),
    [firestore, user]
  );
  const { data: documents, isLoading: documentsLoading } = useCollection<Document>(documentsCollection);

  const {
    conversationId,
    isLoadingHistory,
    createConversation,
    saveMessage,
  } = chatHistory;

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await processQuery(input);
  };

  const processQuery = async (query: string) => {
    // The history is the state of messages *before* this new query.
    const conversationHistory = messages
      .slice(1) // remove welcome message
      .filter((m) => typeof m.content === 'string')
      .map((m) => ({
        role: m.role as 'user' | 'bot',
        content: m.content as string,
      }));

    const userInput: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    const newMessages = [...messages, userInput];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Show streaming message placeholder (empty content that will fill in)
    const streamingMsgId = Date.now().toString() + '-stream';
    const streamingMessage: Message = { id: streamingMsgId, role: 'bot', content: '' };
    setMessages((prev) => [...prev, streamingMessage]);

    if (!user) {
      setIsLoading(false);
      const botResponse: Message = {
        id: Date.now().toString(),
        role: 'bot',
        content: 'Please log in or sign up to search the knowledge base.',
        data: { type: 'answer', citations: [] },
      };
      setMessages((prev) => [...prev.slice(0, -1), botResponse]);
      return;
    }

    // Create conversation on first message or use existing one
    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await createConversation(query);
    }

    // Save user message
    if (currentConvId) {
      await saveMessage(userInput, currentConvId);
    }

    const contextDocuments = documents
      ? documents.map((doc) => ({ title: doc.title, content: doc.content }))
      : [];

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          conversationHistory,
          contextDocuments,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Stream request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = '';
      let finalCitations: string[] = [];
      let finalAnswer = '';
      let resultType: 'answer' | 'clarification' | 'error' = 'answer';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'token') {
              streamedContent += data.content;
              // Update the streaming message in place
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId ? { ...m, content: streamedContent } : m
                )
              );
            } else if (data.type === 'done') {
              finalAnswer = data.answer || streamedContent;
              finalCitations = data.citations || [];
              resultType = 'answer';
              // Update display with clean answer (removes JSON wrapper)
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId ? { ...m, content: finalAnswer } : m
                )
              );
            } else if (data.type === 'clarification') {
              finalAnswer = data.question;
              resultType = 'clarification';
              streamedContent = data.question;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingMsgId ? { ...m, content: data.question } : m
                )
              );
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // skip malformed chunks
            throw e;
          }
        }
      }

      setIsLoading(false);

      // Finalize the message with citations
      const botResponse: Message = {
        id: streamingMsgId,
        role: 'bot',
        content: finalAnswer || streamedContent,
        data: resultType === 'answer'
          ? { type: 'answer', answer: finalAnswer, citations: finalCitations }
          : resultType === 'clarification'
            ? { type: 'clarification', question: finalAnswer }
            : undefined,
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === streamingMsgId ? botResponse : m))
      );

      // Save bot response
      if (currentConvId) {
        await saveMessage(botResponse, currentConvId);
      }

      // Log query for analytics
      try {
        const userQueriesRef = collection(firestore, 'users', user.uid, 'userQueries');
        addDoc(userQueriesRef, {
          query,
          responseType: resultType,
          answerFound: resultType === 'answer' && !finalAnswer.toLowerCase().includes('not available in the knowledge base'),
          citations: finalCitations,
          userId: user.uid,
          timestamp: serverTimestamp(),
        }).catch(() => { });
      } catch { }

    } catch (error) {
      setIsLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'Please try again.';
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: errorMsg,
      });
      // Replace streaming placeholder with error message instead of removing
      const errorResponse: Message = {
        id: streamingMsgId,
        role: 'bot',
        content: `Sorry, I couldn't process your request. ${errorMsg}`,
      };
      setMessages((prev) =>
        prev.map((m) => (m.id === streamingMsgId ? errorResponse : m))
      );
    }
  };

  const handleDocumentAdded = (title: string) => {
    const botMessage: Message = {
      id: `doc-added-${Date.now()}`,
      role: 'bot',
      content: `📄 Document "${title}" has been added to the knowledge base. You can now ask me questions about it!`,
    };
    setMessages((prev) => [...prev, botMessage]);
  };

  const formDisabled = isLoading || documentsLoading || isUserLoading || isLoadingHistory;

  return (
    <div className="relative flex h-full w-full flex-col">
      <ScrollArea className="flex-1" viewportRef={scrollAreaRef}>
        <div className="p-4 pb-8 sm:p-6 sm:pb-8">
          <div className="space-y-6">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isLoading={isLoading && msg.content === ''}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
      <div className="p-4 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="relative mx-auto max-w-2xl"
        >
          <div className="pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"></div>
          {user && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10"
                    onClick={() => setIsDocDialogOpen(true)}
                    disabled={formDisabled}
                  >
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Add document</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Add document to knowledge base</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Input
            type="text"
            placeholder={user ? "Ask anything about the company..." : "Log in to ask questions"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={formDisabled || !user}
            className={`h-14 w-full rounded-full border-2 border-border/80 bg-background/80 py-4 pr-16 text-base shadow-lg backdrop-blur-md focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40 ${user ? 'pl-14' : 'pl-6'}`}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full btn-primary-gradient transition-transform duration-300 hover:scale-110"
            disabled={formDisabled || !input.trim() || !user}
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>

      <ChatDocumentDialog
        isOpen={isDocDialogOpen}
        onOpenChange={setIsDocDialogOpen}
        onDocumentAdded={handleDocumentAdded}
      />
    </div>
  );
}
