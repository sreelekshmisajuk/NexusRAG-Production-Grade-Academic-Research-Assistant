import React from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';
import { GenerationStage } from '../../types/research';

interface ProgressIndicatorProps {
  stage: GenerationStage;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ stage }) => {
  if (stage === 'idle' || stage === 'completed') return null;

  const steps = [
    { key: 'rewriting', label: 'Query rewritten (HyDE)' },
    { key: 'retrieving', label: 'Documents retrieved (Hybrid BM25 + Dense)' },
    { key: 'reranking', label: 'Evidence reranked (Cross-Encoder)' },
    { key: 'generating', label: 'Generating evidence-grounded answer' },
    { key: 'verifying', label: 'Verifying citation quotes' },
  ];

  const stageOrder: Record<GenerationStage, number> = {
    idle: 0,
    rewriting: 1,
    retrieving: 2,
    reranking: 3,
    generating: 4,
    verifying: 5,
    completed: 6,
  };

  const currentLevel = stageOrder[stage] || 1;

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-subtle space-y-3 my-3 animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-xs font-semibold text-primary-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Analyzing your research sources...</span>
      </div>

      <div className="space-y-1.5 pl-1">
        {steps.map((step, idx) => {
          const stepLevel = idx + 1;
          const isDone = currentLevel > stepLevel;
          const isCurrent = currentLevel === stepLevel;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-2 text-xs transition-colors ${
                isDone
                  ? 'text-emerald-400'
                  : isCurrent
                  ? 'text-primary-300 font-medium'
                  : 'text-surface-muted/60'
              }`}
            >
              {isDone && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
              {isCurrent && <div className="w-2 h-2 rounded-full bg-primary-400 animate-ping" />}
              {!isDone && !isCurrent && <Circle className="w-3 h-3 text-surface-muted/40" />}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
