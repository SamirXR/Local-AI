import { useState, useRef, useCallback } from 'react';
import { Send, Square } from 'lucide-react';

interface Props {
  onSend(content: string): void;
  onStop(): void;
  isGenerating: boolean;
  disabled: boolean;
  placeholder?: string;
}

export default function InputBar({
  onSend,
  onStop,
  isGenerating,
  disabled,
  placeholder = 'Type a message…',
}: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isGenerating) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, disabled, isGenerating, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea up to ~200 px
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-slate-700/80 panel-glass px-3 sm:px-4 py-3 backdrop-blur">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className={[
            'flex-1 bg-slate-900/70 text-slate-100 placeholder-slate-500 border border-slate-600/70',
            'rounded-2xl px-4 py-2.5 text-sm resize-none leading-6',
            'focus:outline-none focus:ring-2 focus:ring-slate-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[42px] max-h-[200px] overflow-y-auto',
          ].join(' ')}
        />

        {isGenerating ? (
          <button
            onClick={onStop}
            title="Stop generating"
            className="flex-shrink-0 p-2.5 bg-slate-300 hover:bg-slate-200 text-black active:scale-95 rounded-2xl transition-all"
          >
            <Square size={18} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || !input.trim()}
            title="Send (Enter)"
            className="flex-shrink-0 p-2.5 bg-slate-100 hover:bg-slate-200 text-black disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed active:scale-95 rounded-2xl transition-all"
          >
            <Send size={18} />
          </button>
        )}
      </div>

      <p className="text-center text-[10px] text-slate-500 mt-1.5 tracking-[0.04em]">
        Shift + Enter for new line · All inference runs locally in your browser
      </p>
    </div>
  );
}
