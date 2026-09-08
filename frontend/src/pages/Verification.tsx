import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { evaluationApi } from '../services/evaluationApi';
import { LoadingState } from '../components/common/LoadingState';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Verification: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClaimId, setSelectedClaimId] = useState<string>('claim-1');

  const { data: verification, isLoading } = useQuery({
    queryKey: ['verification'],
    queryFn: () => evaluationApi.getVerificationResult(),
  });

  if (isLoading || !verification) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <LoadingState rows={4} message="Deconstructing claims and verifying against context..." />
      </div>
    );
  }

  const selectedClaim =
    verification.claims.find((c) => c.id === selectedClaimId) || verification.claims[0];

  const getStatusBadge = (status: string) => {
    if (status === 'Supported') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> Supported
        </span>
      );
    }
    if (status === 'Partially Supported') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5" /> Partially Supported
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
        <XCircle className="w-3.5 h-3.5" /> Unsupported / Hallucination
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Hallucination & Claim Verification
          </h1>
          <p className="text-sm text-surface-muted mt-1">
            Deconstruct synthesized answers into atomic claims audited against physical page quotes
          </p>
        </div>

        {/* Overall Grounding Score Badge */}
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <div>
            <span className="text-[10px] text-surface-muted block font-semibold uppercase tracking-wider">
              Overall Grounding Score
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {(verification.overallGroundingScore * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Audited Research Question & Synthesized Answer */}
      <div className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary-400">
          <Sparkles className="w-3.5 h-3.5 text-cyan-accent" />
          <span>Audited Query</span>
        </div>
        <p className="text-sm font-semibold text-foreground font-mono">
          "{verification.query}"
        </p>
        <div className="p-3 rounded-lg bg-surface-elevated/60 border border-surface-border text-xs text-foreground/90 leading-relaxed font-serif">
          {verification.answer}
        </div>
      </div>

      {/* Claim Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Claim List */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Atomic Claims ({verification.claims.length})
          </h3>

          {verification.claims.map((claim) => {
            const isSelected = claim.id === selectedClaim.id;
            return (
              <div
                key={claim.id}
                onClick={() => setSelectedClaimId(claim.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-subtle'
                    : 'border-surface-border bg-card hover:bg-surface-elevated/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-mono font-bold text-primary-400">
                    Claim #{claim.claimNumber}
                  </span>
                  {getStatusBadge(claim.status)}
                </div>

                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {claim.statement}
                </p>

                {claim.sourceDocTitle && (
                  <div className="flex items-center justify-between text-[11px] text-surface-muted mt-3 pt-2 border-t border-surface-border/50">
                    <span className="truncate max-w-xs">{claim.sourceDocTitle}</span>
                    <span className="font-mono text-primary-300">Page {claim.sourcePage}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Deep Verification Evidence Card */}
        <div className="lg:col-span-5">
          <div className="sticky top-20 p-5 rounded-xl border border-surface-border bg-card shadow-elevated space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-primary-400 font-bold">
                  Evidence Audit
                </span>
                <h4 className="text-sm font-semibold text-foreground">
                  Claim #{selectedClaim.claimNumber} Details
                </h4>
              </div>
              {getStatusBadge(selectedClaim.status)}
            </div>

            {/* Claim Statement */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-surface-muted font-semibold">
                Synthesized Statement
              </span>
              <p className="text-xs text-foreground/90 italic bg-surface-elevated p-2.5 rounded border border-surface-border">
                "{selectedClaim.statement}"
              </p>
            </div>

            {/* Evidence Snippet */}
            {selectedClaim.evidenceSnippet ? (
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-surface-muted font-semibold">
                  Physical Document Evidence Quote
                </span>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs font-serif leading-relaxed text-foreground">
                  "{selectedClaim.evidenceSnippet}"
                </div>
                <div className="flex items-center justify-between text-[11px] text-surface-muted pt-1">
                  <span>{selectedClaim.sourceDocTitle}</span>
                  <span className="font-mono font-bold text-primary-400">
                    p. {selectedClaim.sourcePage}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                No matching physical passage found in uploaded context for this statement.
              </div>
            )}

            {/* Verification Explanation */}
            <div className="space-y-1 pt-2 border-t border-surface-border">
              <span className="text-[10px] uppercase tracking-wider text-surface-muted font-semibold">
                Reasoning Audit
              </span>
              <p className="text-xs text-surface-muted leading-relaxed">
                {selectedClaim.explanation}
              </p>
            </div>

            {/* Action to Jump to Source PDF */}
            {selectedClaim.sourceDocTitle && (
              <button
                onClick={() =>
                  navigate(
                    selectedClaim.sourceDocId
                      ? `/documents/${selectedClaim.sourceDocId}?page=${selectedClaim.sourcePage || 1}`
                      : '/library'
                  )
                }
                className="w-full mt-2 py-2 text-xs font-semibold rounded-lg bg-surface-elevated hover:bg-primary/10 hover:text-primary text-foreground border border-surface-border transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Inspect in Document Viewer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
