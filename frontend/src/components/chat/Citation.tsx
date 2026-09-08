import React, { useState } from 'react';
import { Citation as CitationType } from '../../types/research';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

interface CitationProps {
  citation: CitationType;
}

export const Citation: React.FC<CitationProps> = ({ citation }) => {
  const { activeCitation, setActiveCitation } = useApp();
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  const isActive = activeCitation?.id === citation.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCitation(citation);
  };

  return (
    <span
      className="relative inline-block mx-0.5 align-baseline"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleClick}
        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
          isActive
            ? 'bg-primary text-white ring-2 ring-primary/40 shadow-sm'
            : 'bg-primary/15 text-primary-400 hover:bg-primary/25 border border-primary/25 hover:border-primary/40'
        }`}
        title={`Source [${citation.id}]: ${citation.documentTitle} (p. ${citation.pageNumber})`}
      >
        [{citation.id}]
      </button>

      {/* Hover preview tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-72 p-3 rounded-lg bg-card border border-surface-border shadow-elevated text-left pointer-events-auto animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-[10px] font-mono uppercase font-bold text-primary-400">
              Source [{citation.id}]
            </span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-2.5 h-2.5" /> {(citation.relevanceScore * 100).toFixed(0)}% Match
            </span>
          </div>

          <h5 className="text-xs font-semibold text-foreground line-clamp-2">
            {citation.documentTitle}
          </h5>
          <p className="text-[11px] text-surface-muted mt-0.5">Page {citation.pageNumber}</p>

          <p className="text-[11px] text-surface-muted mt-2 p-1.5 rounded bg-surface-elevated/70 line-clamp-3 leading-relaxed border border-surface-border/40 font-serif italic">
            "{citation.snippet}"
          </p>

          <button
            onClick={() => navigate(`/documents/${citation.documentId}?page=${citation.pageNumber}`)}
            className="mt-2 w-full flex items-center justify-center gap-1 py-1 text-[10px] font-medium text-primary-400 hover:text-primary-300 rounded bg-primary/10 transition-colors"
          >
            <span>Open PDF Page {citation.pageNumber}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </span>
  );
};
