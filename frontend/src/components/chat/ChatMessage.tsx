import React, { useState } from 'react';
import { ChatMessage as ChatMessageType, Citation as CitationType } from '../../types/research';
import { Citation } from './Citation';
import { RetrievalDetails } from './RetrievalDetails';
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  SlidersHorizontal,
  Bot,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ChatMessageProps {
  message: ChatMessageType;
  onRegenerate?: () => void;
  onOpenSources?: () => void;
  showTelemetry?: boolean;
  showCitations?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRegenerate,
  onOpenSources,
  showTelemetry = false,
  showCitations = true,
}) => {
  const { info } = useToast();
  const [copied, setCopied] = useState(false);
  const [showLocalTelemetry, setShowLocalTelemetry] = useState(false);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(
    message.feedback || null
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    info('Copied to Clipboard', 'Response text has been copied.');
  };

  /**
   * Helper that converts markdown text and `[[X]](cite:X)` or `[X]` citations into interactive React nodes.
   */
  const renderFormattedContent = (content: string, citations?: CitationType[]) => {
    const lines = content.split('\n');
    const activeCitations = showCitations ? citations : undefined;

    return lines.map((line, lineIdx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={lineIdx} className="text-sm font-semibold text-foreground mt-4 mb-2">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Heading 2
      if (line.startsWith('## ')) {
        return (
          <h3 key={lineIdx} className="text-base font-semibold text-foreground mt-5 mb-2.5">
            {line.replace('## ', '')}
          </h3>
        );
      }
      // Table rows
      if (line.startsWith('|')) {
        const cells = line
          .split('|')
          .filter((c, i, arr) => i > 0 && i < arr.length - 1)
          .map((c) => c.trim());

        if (cells.every((c) => c.startsWith('---') || c.startsWith(':---'))) {
          return null; // separator row handled by CSS
        }

        const isHeader = lineIdx > 0 && lines[lineIdx + 1]?.includes('---');

        return (
          <div
            key={lineIdx}
            style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
            className={`grid gap-2 py-2 px-3 border border-surface-border text-xs rounded-sm my-0.5 ${
              isHeader
                ? 'bg-surface-elevated font-semibold text-foreground border-b-2 border-primary/30'
                : 'bg-card/40 hover:bg-surface-elevated/50 text-surface-muted'
            }`}
          >
            {cells.map((cell, cIdx) => (
              <span key={cIdx} className="overflow-hidden text-ellipsis">
                {renderInlineElements(cell, activeCitations)}
              </span>
            ))}
          </div>
        );
      }
      // Bullet list item
      if (line.startsWith('* ') || line.startsWith('- ')) {
        const bulletText = line.substring(2);
        return (
          <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-primary-400 mt-1.5 text-xs leading-none">•</span>
            <span className="text-xs leading-relaxed text-foreground/90">
              {renderInlineElements(bulletText, citations)}
            </span>
          </div>
        );
      }
      // Numbered list item
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+\.)\s(.*)/);
        if (match) {
          return (
            <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1">
              <span className="text-primary-400 font-mono text-xs font-semibold mt-0.5">
                {match[1]}
              </span>
              <span className="text-xs leading-relaxed text-foreground/90">
                {renderInlineElements(match[2], citations)}
              </span>
            </div>
          );
        }
      }
      // Empty line
      if (!line.trim()) {
        return <div key={lineIdx} className="h-2" />;
      }
      // Standard paragraph
      return (
        <p key={lineIdx} className="text-xs leading-relaxed text-foreground/90 my-1.5">
          {renderInlineElements(line, citations)}
        </p>
      );
    });
  };

  /**
   * Replaces citations `[[1]](cite:1)` or `[1]` with `<Citation />` components, and bold text `**...**` with `<strong>`.
   */
  const renderInlineElements = (text: string, citations?: CitationType[]) => {
    // Regex matches [[X]](cite:X) or [X]
    const parts = text.split(/(\[\[?\d+\]?\](?:\(cite:\d+\))?)/g);

    return parts.map((part, pIdx) => {
      if (citations && citations.length > 0) {
        const citeMatch = part.match(/\d+/);
        if (citeMatch) {
          const citeNum = parseInt(citeMatch[0], 10);
          const matchedCitation = citations.find((c) => c.id === citeNum);
          if (matchedCitation) {
            return <Citation key={pIdx} citation={matchedCitation} />;
          }
        }
      }

      // Handle bold formatting **bold**
      if (part.includes('**')) {
        const subparts = part.split(/(\*\*.*?\*\*)/g);
        return (
          <React.Fragment key={pIdx}>
            {subparts.map((sp, sIdx) => {
              if (sp.startsWith('**') && sp.endsWith('**')) {
                return (
                  <strong key={sIdx} className="font-semibold text-foreground">
                    {sp.slice(2, -2)}
                  </strong>
                );
              }
              return sp;
            })}
          </React.Fragment>
        );
      }

      return part;
    });
  };

  const isUser = message.role === 'user';

  return (
    <div
      className={`py-4 px-4 sm:px-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-surface-elevated/20 border-y border-surface-border/50'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3.5 items-start">
        {/* Avatar */}
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
            isUser
              ? 'bg-surface-elevated border-surface-border text-surface-muted'
              : 'bg-primary/10 border-primary/20 text-primary-400'
          }`}
        >
          {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
        </div>

        {/* Message Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-semibold text-foreground">
              {isUser ? 'Researcher Query' : 'RAG Assistant'}
            </span>
            <div className="flex items-center gap-2">
              {!isUser && message.faithfulnessScore && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> {(message.faithfulnessScore * 100).toFixed(0)}% Grounded
                </span>
              )}
              <span className="text-[10px] text-surface-muted font-mono">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Formatted Content */}
          <div className="text-xs text-foreground/90 select-text">
            {renderFormattedContent(message.content, message.citations)}
          </div>

          {/* Retrieval Details Expandable Panel (hidden by default unless requested) */}
          {!isUser && message.retrievalDetails && (showTelemetry || showLocalTelemetry) && (
            <RetrievalDetails details={message.retrievalDetails} />
          )}

          {/* Actions Bar beneath assistant responses */}
          {!isUser && (
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-border/40 text-surface-muted text-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:text-foreground hover:bg-surface-elevated rounded transition-colors flex items-center gap-1 text-[11px]"
                  title="Copy Response"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 hover:text-foreground hover:bg-surface-elevated rounded transition-colors flex items-center gap-1 text-[11px]"
                    title="Regenerate Answer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Regenerate</span>
                  </button>
                )}

                {onOpenSources && message.sources && message.sources.length > 0 && (
                  <button
                    onClick={onOpenSources}
                    className="p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary/10 rounded transition-colors flex items-center gap-1 text-[11px] font-medium"
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>View Sources ({message.sources.length})</span>
                  </button>
                )}

                {!showTelemetry && message.retrievalDetails && (
                  <button
                    onClick={() => setShowLocalTelemetry(!showLocalTelemetry)}
                    className={`p-1.5 hover:text-foreground hover:bg-surface-elevated rounded transition-colors flex items-center gap-1 text-[11px] ${
                      showLocalTelemetry ? 'text-primary-400 bg-primary/10 font-medium' : ''
                    }`}
                    title={showLocalTelemetry ? 'Hide Technical Telemetry' : 'Inspect Technical Telemetry'}
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>{showLocalTelemetry ? 'Hide Telemetry' : 'Telemetry'}</span>
                  </button>
                )}
              </div>

              {/* Feedback */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFeedback('helpful')}
                  className={`p-1.5 rounded hover:bg-surface-elevated transition-colors ${
                    feedback === 'helpful' ? 'text-emerald-400 bg-emerald-500/10' : 'hover:text-foreground'
                  }`}
                  title="Helpful Answer"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setFeedback('not_helpful')}
                  className={`p-1.5 rounded hover:bg-surface-elevated transition-colors ${
                    feedback === 'not_helpful' ? 'text-rose-400 bg-rose-500/10' : 'hover:text-foreground'
                  }`}
                  title="Not Helpful"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
