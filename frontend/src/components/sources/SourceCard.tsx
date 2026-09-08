import React from 'react';
import { Source } from '../../types/research';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, CheckCircle2, BookOpen } from 'lucide-react';

interface SourceCardProps {
  source: Source;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const { activeCitation, setActiveCitation } = useApp();
  const navigate = useNavigate();

  const isHighlighted = activeCitation?.id === source.citationIndex;

  const handleOpenPdf = () => {
    navigate(`/documents/${source.documentId}?page=${source.pageNumber}`);
  };

  return (
    <div
      onClick={() =>
        setActiveCitation({
          id: source.citationIndex,
          documentId: source.documentId,
          documentTitle: source.documentTitle,
          pageNumber: source.pageNumber,
          snippet: source.content,
          relevanceScore: source.relevanceScore,
          verified: source.verified,
        })
      }
      className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
        isHighlighted
          ? 'border-primary bg-primary/10 shadow-glow-primary'
          : 'border-surface-border bg-surface-elevated/40 hover:bg-surface-elevated/80 hover:border-surface-border/80'
      }`}
    >
      {/* Header: Citation index badge, title, relevance */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold ${
              isHighlighted ? 'bg-primary text-white' : 'bg-primary/20 text-primary-400'
            }`}
          >
            [{source.citationIndex}]
          </span>
          <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
            {source.documentTitle}
          </span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0 flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" /> {(source.relevanceScore * 100).toFixed(0)}%
        </span>
      </div>

      {/* Page & Author */}
      <div className="flex items-center gap-2 text-[10px] text-surface-muted mb-2 font-mono">
        <span className="text-primary-300 font-semibold">Page {source.pageNumber}</span>
        {source.author && (
          <>
            <span>•</span>
            <span className="truncate">{source.author}</span>
          </>
        )}
      </div>

      {/* Quote Snippet */}
      <p className="text-[11px] text-foreground/80 leading-relaxed font-serif italic bg-card/60 p-2 rounded border border-surface-border/50 line-clamp-4">
        "{source.content}"
      </p>

      {/* Jump to Page CTA */}
      <div className="mt-2.5 pt-2 border-t border-surface-border/60 flex items-center justify-between">
        <span className="text-[10px] text-surface-muted">Verifiable physical quote</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPdf();
          }}
          className="text-[10px] text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 hover:underline"
        >
          <span>Jump to Page {source.pageNumber}</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
