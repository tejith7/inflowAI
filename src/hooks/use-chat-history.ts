'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    limit,
} from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Message } from '@/components/chat/chat-message';

interface ConversationMeta {
    id: string;
    title: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

interface FirestoreMessage {
    role: 'user' | 'bot';
    content: string;
    data?: any;
    createdAt: any;
}

export function useChatHistory() {
    const firestore = useFirestore();
    const { user } = useUser();
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [conversations, setConversations] = useState<ConversationMeta[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Load list of conversations
    const loadConversations = useCallback(async () => {
        if (!firestore || !user) return;
        try {
            const convsRef = collection(firestore, 'users', user.uid, 'conversations');
            const q = query(convsRef, orderBy('updatedAt', 'desc'), limit(20));
            const snapshot = await getDocs(q);
            const convs: ConversationMeta[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                title: doc.data().title || 'Untitled Chat',
                createdAt: doc.data().createdAt,
                updatedAt: doc.data().updatedAt,
            }));
            setConversations(convs);
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }, [firestore, user]);

    // Create a new conversation
    const createConversation = useCallback(async (firstMessageContent: string): Promise<string | null> => {
        if (!firestore || !user) return null;
        try {
            const convsRef = collection(firestore, 'users', user.uid, 'conversations');
            const title = firstMessageContent.slice(0, 50) + (firstMessageContent.length > 50 ? '...' : '');
            const newConv = await addDoc(convsRef, {
                title,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setConversationId(newConv.id);
            await loadConversations();
            return newConv.id;
        } catch (error) {
            console.error('Error creating conversation:', error);
            return null;
        }
    }, [firestore, user, loadConversations]);

    // Save a message to the current conversation
    const saveMessage = useCallback(async (message: Message, convId?: string) => {
        const targetConvId = convId || conversationId;
        if (!firestore || !user || !targetConvId) return;
        if (message.id === 'welcome' || message.id === 'loading') return;
        if (typeof message.content !== 'string') return;

        try {
            const messagesRef = collection(
                firestore, 'users', user.uid, 'conversations', targetConvId, 'messages'
            );
            await addDoc(messagesRef, {
                role: message.role,
                content: message.content,
                data: message.data || null,
                createdAt: serverTimestamp(),
            });

            // Update conversation timestamp
            const convRef = doc(firestore, 'users', user.uid, 'conversations', targetConvId);
            await setDoc(convRef, { updatedAt: serverTimestamp() }, { merge: true });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    }, [firestore, user, conversationId]);

    // Load messages for a conversation
    const loadConversation = useCallback(async (convId: string): Promise<Message[]> => {
        if (!firestore || !user) return [];
        setIsLoadingHistory(true);
        try {
            const messagesRef = collection(
                firestore, 'users', user.uid, 'conversations', convId, 'messages'
            );
            const q = query(messagesRef, orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);
            const messages: Message[] = snapshot.docs.map((doc, index) => ({
                id: doc.id,
                role: doc.data().role as 'user' | 'bot',
                content: doc.data().content,
                data: doc.data().data || undefined,
            }));
            setConversationId(convId);
            return messages;
        } catch (error) {
            console.error('Error loading conversation:', error);
            return [];
        } finally {
            setIsLoadingHistory(false);
        }
    }, [firestore, user]);

    // Delete a conversation
    const deleteConversation = useCallback(async (convId: string) => {
        if (!firestore || !user) return;
        try {
            // Delete all messages first
            const messagesRef = collection(
                firestore, 'users', user.uid, 'conversations', convId, 'messages'
            );
            const snapshot = await getDocs(messagesRef);
            await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));

            // Delete conversation doc
            const convRef = doc(firestore, 'users', user.uid, 'conversations', convId);
            await deleteDoc(convRef);

            if (conversationId === convId) {
                setConversationId(null);
            }
            await loadConversations();
        } catch (error) {
            console.error('Error deleting conversation:', error);
        }
    }, [firestore, user, conversationId, loadConversations]);

    // Start a new chat (clear current conversation)
    const startNewChat = useCallback(() => {
        setConversationId(null);
    }, []);

    // Load conversations on mount
    useEffect(() => {
        if (user) {
            loadConversations();
        }
    }, [user, loadConversations]);

    return {
        conversationId,
        conversations,
        isLoadingHistory,
        createConversation,
        saveMessage,
        loadConversation,
        deleteConversation,
        startNewChat,
        loadConversations,
    };
}
