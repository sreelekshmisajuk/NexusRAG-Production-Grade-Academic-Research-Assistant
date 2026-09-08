import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, FileText, CornerDownLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, isLoading }) => {
  const { selectedDocumentIds, settings } = useApp();
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const samplePrompts = [
    'Compare the retrieval strategies used across my uploaded papers.',
    'How does cross-encoder reranking mitigate hallucination?',
    'What causes the U-shaped Lost-in-the-Middle context degradation?',
  ];

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [query]);

  return (
    <div className="p-4 border-t border-surface-border bg-card/70 backdrop-blur shrink-0">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* Prompt suggestion pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <span className="text-[10px] text-surface-muted flex items-center gap-1 shrink-0 font-medium">
            <Sparkles className="w-3 h-3 text-cyan-accent" /> Suggested:
          </span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onSubmit(prompt)}
              disabled={isLoading}
              className="px-2.5 py-1 rounded-full border border-surface-border bg-surface-elevated/60 text-surface-muted hover:text-foreground hover:border-primary/40 whitespace-nowrap transition-colors disabled:opacity-50 text-[11px]"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Container */}
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 p-2 rounded-xl border border-surface-border bg-surface-elevated/70 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all shadow-subtle"
        >
          <div className="flex-1 min-w-0">
            {/* Active Sources Badge */}
            <div className="flex items-center gap-2 px-1 mb-1 text-[10px] text-surface-muted font-mono">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3 text-primary-400" />
                {selectedDocumentIds.length} source papers active
              </span>
              <span>•</span>
              <span className="text-cyan-accent uppercase">{settings.llmProvider}</span>
            </div>

            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your research question across selected papers... (Shift+Enter for newline)"
              rows={1}
              disabled={isLoading}
              className="w-full bg-transparent resize-none text-xs text-foreground placeholder:text-surface-muted focus:outline-none px-1 max-h-32"
            />
          </div>

          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="p-2 rounded-lg bg-primary hover:bg-primary-hover text-white disabled:opacity-30 transition-all shrink-0 flex items-center justify-center shadow-subtle"
            title="Submit Research Query"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
