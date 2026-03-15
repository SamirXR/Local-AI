// Manages chat history and streaming state.
import { useCallback, useRef, useState } from 'react';
import type { ChatMessage } from '../lib/engineAdapter';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Running tokens/sec during generation */
  tokensPerSec?: number;
}

export interface UseChatReturn {
  messages: Message[];
  isGenerating: boolean;
  systemPrompt: string;
  setSystemPrompt(p: string): void;
  sendMessage(
    userContent: string,
    sendChat: (msgs: ChatMessage[], onToken: (t: string) => void) => Promise<void>,
    abortChat: () => void,
  ): Promise<void>;
  stopGenerating(): void;
  clearMessages(): void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [systemPrompt, setSystemPromptState] = useState(
    () => localStorage.getItem('systemPrompt') ?? 'You are a helpful AI assistant.',
  );

  // Mutable refs avoid stale-closure issues inside sendMessage's async body
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;

  const systemPromptRef = useRef(systemPrompt);
  systemPromptRef.current = systemPrompt;

  const abortRef = useRef<(() => void) | null>(null);

  const setSystemPrompt = useCallback((p: string) => {
    setSystemPromptState(p);
    localStorage.setItem('systemPrompt', p);
  }, []);

  const sendMessage = useCallback(
    async (
      userContent: string,
      sendChat: (msgs: ChatMessage[], onToken: (t: string) => void) => Promise<void>,
      abortChat: () => void,
    ) => {
      if (!userContent.trim()) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userContent.trim(),
      };

      const assistantId = crypto.randomUUID();
      setMessages(prev => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '' },
      ]);
      setIsGenerating(true);

      let tokenCount = 0;
      const startTime = Date.now();
      abortRef.current = abortChat;

      try {
        // Build the full conversation to send to the model.
        // messagesRef holds the state *before* our new messages were appended
        // (React batches setState), so we reconstruct history manually.
        const history: ChatMessage[] = [
          ...messagesRef.current.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: userMsg.content },
        ];

        const apiMessages: ChatMessage[] = [
          ...(systemPromptRef.current
            ? [{ role: 'system' as const, content: systemPromptRef.current }]
            : []),
          ...history,
        ];

        await sendChat(apiMessages, (token: string) => {
          tokenCount++;
          const elapsed = (Date.now() - startTime) / 1000;
          const tps = Math.round(tokenCount / Math.max(elapsed, 0.01));

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: m.content + token, tokensPerSec: tps }
                : m,
            ),
          );
        });
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    // Empty deps: we access fresh values through refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const stopGenerating = useCallback(() => {
    abortRef.current?.();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isGenerating,
    systemPrompt,
    setSystemPrompt,
    sendMessage,
    stopGenerating,
    clearMessages,
  };
}
