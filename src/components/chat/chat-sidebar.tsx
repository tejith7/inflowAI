'use client';

import { useState } from 'react';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConversationMeta {
    id: string;
    title: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

interface ChatSidebarProps {
    conversations: ConversationMeta[];
    activeConversationId: string | null;
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

function formatRelativeTime(timestamp: Timestamp | null): string {
    if (!timestamp) return '';
    const now = Date.now();
    const diffMs = now - timestamp.toMillis();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupConversations(conversations: ConversationMeta[]) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; items: ConversationMeta[] }[] = [
        { label: 'Today', items: [] },
        { label: 'Yesterday', items: [] },
        { label: 'Previous 7 Days', items: [] },
        { label: 'Older', items: [] },
    ];

    conversations.forEach((conv) => {
        if (!conv.updatedAt) {
            groups[3].items.push(conv);
            return;
        }
        const date = conv.updatedAt.toDate();
        if (date >= today) groups[0].items.push(conv);
        else if (date >= yesterday) groups[1].items.push(conv);
        else if (date >= sevenDaysAgo) groups[2].items.push(conv);
        else groups[3].items.push(conv);
    });

    return groups.filter((g) => g.items.length > 0);
}

export function ChatSidebar({
    conversations,
    activeConversationId,
    onNewChat,
    onSelectConversation,
    onDeleteConversation,
    isCollapsed,
    onToggleCollapse,
}: ChatSidebarProps) {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const groups = groupConversations(conversations);

    return (
        <div
            className={cn(
                'flex h-full flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300',
                isCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72'
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-3 py-3">
                <h2 className="text-sm font-semibold text-foreground">Chats</h2>
                <div className="flex items-center gap-1">
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                                    onClick={onNewChat}
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">New Chat</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                                    onClick={onToggleCollapse}
                                >
                                    <PanelLeftClose className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Close sidebar</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* Conversations list */}
            <ScrollArea className="flex-1 px-2 py-2">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                        <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No conversations yet</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">
                            Start a new chat to begin
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groups.map((group) => (
                            <div key={group.label}>
                                <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                                    {group.label}
                                </p>
                                <div className="space-y-0.5">
                                    {group.items.map((conv) => (
                                        <div
                                            key={conv.id}
                                            className={cn(
                                                'group relative flex items-center rounded-lg px-2.5 py-2 text-sm transition-colors cursor-pointer',
                                                activeConversationId === conv.id
                                                    ? 'bg-primary/10 text-foreground'
                                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                            )}
                                            onClick={() => onSelectConversation(conv.id)}
                                            onMouseEnter={() => setHoveredId(conv.id)}
                                            onMouseLeave={() => setHoveredId(null)}
                                        >
                                            <MessageSquare className="mr-2.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                                            <div className="flex-1 overflow-hidden">
                                                <p className="truncate text-[13px] leading-tight">
                                                    {conv.title}
                                                </p>
                                                <p className="mt-0.5 text-[11px] opacity-50">
                                                    {formatRelativeTime(conv.updatedAt)}
                                                </p>
                                            </div>
                                            {hoveredId === conv.id && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 shrink-0 rounded-md text-muted-foreground/60 hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteConversation(conv.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

/** Toggle button shown when sidebar is collapsed */
export function SidebarToggle({ onClick }: { onClick: () => void }) {
    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="fixed left-3 top-16 z-30 h-9 w-9 rounded-lg border border-border/50 bg-background/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:text-foreground"
                        onClick={onClick}
                    >
                        <PanelLeft className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Open sidebar</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
