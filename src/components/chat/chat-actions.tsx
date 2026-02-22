'use client';

import { useState } from 'react';
import { FileText, ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CitationsProps {
  citations: string[];
}

export function Citations({ citations }: CitationsProps) {
  if (!citations || citations.length === 0) return null;

  return (
    <Card className="mt-4 border-border/50 bg-background/50 shadow-none">
      <CardHeader className="p-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" />
          <span>Sources</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {citations.map((citation, index) => (
            <li key={index}>{citation}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function Feedback() {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3">
      <p className="text-xs text-muted-foreground">Was this answer helpful?</p>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 text-muted-foreground transition-colors hover:text-green-500 hover:bg-green-500/10',
            feedback === 'up' && 'bg-green-500/10 text-green-500'
          )}
          onClick={() => setFeedback('up')}
          disabled={!!feedback}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 text-muted-foreground transition-colors hover:text-red-500 hover:bg-red-500/10',
            feedback === 'down' && 'bg-red-500/10 text-red-500'
          )}
          onClick={() => setFeedback('down')}
          disabled={!!feedback}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
