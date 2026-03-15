import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../hooks/useChat';

interface Props {
  messages: Message[];
  isGenerating: boolean;
  assistantLogoSrc?: string;
  assistantLabel?: string;
}

export default function ChatWindow({ messages, isGenerating, assistantLogoSrc, assistantLabel = 'AI' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantMsg = [...messages].reverse().find((m): m is Message => m.role === 'assistant');
  const lastAssistantId = lastAssistantMsg?.id;

  // Auto-scroll to bottom as tokens stream in
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 blueprint-grid">
        <div className="text-center max-w-sm panel-glass rounded-2xl p-6">
          <div className="text-4xl mb-4 text-slate-100">[ AI ]</div>
          <h2 className="text-xl font-semibold text-slate-200 mb-2 tracking-[0.04em]">Local AI terminal</h2>
          <p className="text-sm text-slate-400 tracking-normal">
            All inference runs in your browser. No data ever leaves your device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 blueprint-grid scanline">
      {messages.map(msg => {
        const isStreaming = isGenerating && msg.id === lastAssistantId;

        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Avatar */}
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700 border border-slate-300/40 flex items-center justify-center text-[10px] font-bold mt-0.5 overflow-hidden">
                {assistantLogoSrc ? (
                  <img
                    src={assistantLogoSrc}
                    alt={`${assistantLabel} logo`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  assistantLabel
                )}
              </div>
            )}

            <div
              className={[
                'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-slate-200 text-black rounded-tr-sm border border-slate-400/50'
                  : 'panel-glass text-slate-100 rounded-tl-sm border-slate-600/60',
              ].join(' ')}
            >
              {msg.role === 'assistant' ? (
                <>
                  <div
                    className={[
                      'prose prose-invert prose-sm max-w-none',
                      'prose-p:my-1 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700',
                      'prose-code:text-indigo-300 prose-code:bg-slate-900 prose-code:px-1 prose-code:rounded',
                      isStreaming && !msg.content ? 'cursor-blink' : '',
                    ].join(' ')}
                  >
                    <ReactMarkdown>
                      {msg.content || (isStreaming ? '' : '…')}
                    </ReactMarkdown>
                    {isStreaming && msg.content && (
                      <span className="inline-block w-0.5 h-4 bg-slate-100 animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                  {/* Tokens-per-second counter */}
                  {msg.tokensPerSec !== undefined && (
                    <p className="text-[10px] text-slate-600 mt-1.5 text-right">
                      {isStreaming
                        ? `${msg.tokensPerSec} tok/s`
                        : `${msg.tokensPerSec} tok/s avg`}
                    </p>
                  )}
                </>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>

            {/* User avatar */}
            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700 border border-slate-500/50 flex items-center justify-center text-xs font-bold mt-0.5">
                You
              </div>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
