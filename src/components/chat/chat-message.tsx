import { Bot, User } from 'lucide-react';
import {
  Citations,
  Feedback,
} from '@/components/chat/chat-actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LogoIcon } from '../icons';
import { MarkdownContent } from './markdown-content';

export type Message = {
  id: string;
  role: 'user' | 'bot';
  content: string | React.ReactNode;
  data?: any;
};

interface ChatMessageProps {
  message: Message;
  isLoading: boolean;
}

export function ChatMessage({
  message,
  isLoading,
}: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isBot = message.role === 'bot';

  if (isLoading && isBot && message.content === '') {
    return <LoadingMessage />;
  }

  return (
    <div
      className={cn(
        'flex items-start gap-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {isBot && (
        <Avatar
          className={cn(
            'h-9 w-9 border border-border bg-card shadow-sm'
          )}
        >
          <AvatarFallback className="bg-transparent text-primary">
            <Bot className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[85%] rounded-2xl p-4 text-sm sm:max-w-[75%]',
          isUser
            ? 'rounded-br-lg bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground'
            : 'rounded-bl-lg bg-card shadow-sm'
        )}
      >
        {typeof message.content === 'string' ? (
          isBot ? (
            <MarkdownContent content={message.content} />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )
        ) : (
          message.content
        )}

        {isBot && message.data?.type === 'answer' && (
          <>
            <Citations citations={message.data.citations} />
            <Feedback />
          </>
        )}
      </div>

      {isUser && (
        <Avatar
          className={cn(
            'h-9 w-9 border border-border bg-card shadow-sm'
          )}
        >
          <AvatarFallback className="bg-transparent text-muted-foreground">
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-start gap-4">
      <Avatar
        className={cn(
          'h-9 w-9 border border-border bg-card'
        )}
      >
        <AvatarFallback className="bg-transparent text-primary">
          <Bot className="h-5 w-5 animate-pulse" />
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[80%] space-y-2 rounded-2xl rounded-bl-none bg-card p-4 shadow-sm">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
