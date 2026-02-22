'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/chat/chat-panel';
import { ChatSidebar, SidebarToggle } from '@/components/chat/chat-sidebar';
import { useChatHistory } from '@/hooks/use-chat-history';
import { useUser } from '@/firebase';
import type { Message } from '@/components/chat/chat-message';

const welcomeMessage: Message = {
    id: 'welcome',
    role: 'bot',
    content: "Welcome to InfoWise! I'm here to help you with your questions about our company. How can I assist you today?",
};

export function ChatLayout() {
    const { user } = useUser();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [messages, setMessages] = useState<Message[]>([welcomeMessage]);

    const chatHistory = useChatHistory();
    const {
        conversationId,
        conversations,
        loadConversation,
        startNewChat,
        deleteConversation,
    } = chatHistory;

    const handleNewChat = () => {
        startNewChat();
        setMessages([welcomeMessage]);
    };

    const handleSelectConversation = async (convId: string) => {
        const loadedMessages = await loadConversation(convId);
        setMessages([welcomeMessage, ...loadedMessages]);
    };

    const handleDeleteConversation = async (convId: string) => {
        await deleteConversation(convId);
        if (conversationId === convId) {
            handleNewChat();
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
            {/* Sidebar */}
            {user && (
                <ChatSidebar
                    conversations={conversations}
                    activeConversationId={conversationId}
                    onNewChat={handleNewChat}
                    onSelectConversation={handleSelectConversation}
                    onDeleteConversation={handleDeleteConversation}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(true)}
                />
            )}

            {/* Toggle button when sidebar is collapsed */}
            {user && isSidebarCollapsed && (
                <SidebarToggle onClick={() => setIsSidebarCollapsed(false)} />
            )}

            {/* Chat area */}
            <div className="flex-1 overflow-hidden">
                <ChatPanel
                    messages={messages}
                    setMessages={setMessages}
                    chatHistory={chatHistory}
                />
            </div>
        </div>
    );
}
