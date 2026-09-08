import React, { useState } from 'react';
import { RetrievalDetails as RetrievalDetailsType } from '../../types/research';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  Clock,
  Filter,
} from 'lucide-react';

interface RetrievalDetailsProps {
  details: RetrievalDetailsType;
}

export const RetrievalDetails: React.FC<RetrievalDetailsProps> = ({ details }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-3 rounded-lg border border-surface-border bg-surface-elevated/40 overflow-hidden text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-surface-muted hover:text-foreground hover:bg-surface-elevated/70 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Cpu className="w-3.5 h-3.5 text-primary-400" />
          <span>Retrieval Telemetry & Strategy</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary-400 font-semibold">
            {details.strategy}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-surface-muted">
          <span>{details.totalTimeMs} ms</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-surface-border space-y-3.5 bg-card/60 animate-in fade-in duration-150">
          {/* Query & Rewriting */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-surface-muted uppercase tracking-wider">
              Original Query
            </span>
            <p className="text-xs text-foreground font-mono bg-surface-elevated p-2 rounded border border-surface-border">
              {details.originalQuery}
            </p>
          </div>

          {details.rewrittenQueries.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-surface-muted uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-accent" />
                Query Rewriting (HyDE Multi-Query)
              </span>
              <ul className="space-y-1">
                {details.rewrittenQueries.map((rq, idx) => (
                  <li
                    key={idx}
                    className="text-[11px] text-surface-muted font-mono bg-surface-elevated/60 px-2 py-1 rounded border border-surface-border/50"
                  >
                    • {rq}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Scores with visual horizontal bars */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-surface-muted uppercase tracking-wider">
              Retrieval Strategy Scores
            </span>

            {/* Semantic Score */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-surface-muted">Semantic Vector Similarity (Dense)</span>
                <span className="font-mono text-primary-400 font-semibold">
                  {details.semanticScore.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${details.semanticScore * 100}%` }}
                />
              </div>
            </div>

            {/* BM25 Score */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-surface-muted">Lexical BM25 Rank (Sparse)</span>
                <span className="font-mono text-cyan-glow font-semibold">
                  {details.bm25Score.toFixed(2)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-accent rounded-full transition-all duration-500"
                  style={{ width: `${details.bm25Score * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pipeline Funnel Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-surface-border text-center">
            <div className="p-2 rounded bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-surface-muted block">Retrieved</span>
              <span className="text-sm font-semibold font-mono text-foreground">
                {details.documentsRetrieved} docs
              </span>
            </div>
            <div className="p-2 rounded bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-surface-muted block">After Rerank</span>
              <span className="text-sm font-semibold font-mono text-primary-400">
                {details.afterReranking} chunks
              </span>
            </div>
            <div className="p-2 rounded bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-surface-muted block">Final Context</span>
              <span className="text-sm font-semibold font-mono text-emerald-400">
                {details.finalContextChunks} chunks
              </span>
            </div>
            <div className="p-2 rounded bg-surface-elevated border border-surface-border">
              <span className="text-[10px] text-surface-muted block">Reranker Model</span>
              <span className="text-[10px] font-medium font-mono text-surface-muted truncate block">
                {details.rerankerModel.replace('ms-marco-', '')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
