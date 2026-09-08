import React from 'react';
import { RAGEvaluationMetrics } from '../../types/evaluation';
import { ShieldCheck, Target, CheckCheck, BookOpen, AlertTriangle } from 'lucide-react';

interface EvaluationMetricsProps {
  metrics: RAGEvaluationMetrics;
}

export const EvaluationMetrics: React.FC<EvaluationMetricsProps> = ({ metrics }) => {
  const cards = [
    {
      label: 'Faithfulness',
      value: (metrics.faithfulness * 100).toFixed(0) + '%',
      desc: 'Claims grounded directly in retrieved contexts',
      icon: ShieldCheck,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Answer Relevance',
      value: (metrics.answerRelevance * 100).toFixed(0) + '%',
      desc: 'Direct responsiveness to user research question',
      icon: Target,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
    },
    {
      label: 'Context Relevance',
      value: (metrics.contextRelevance * 100).toFixed(0) + '%',
      desc: 'Noise-to-signal ratio of retrieved chunks',
      icon: CheckCheck,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Context Recall',
      value: (metrics.contextRecall * 100).toFixed(0) + '%',
      desc: 'Ground-truth evidence retrieved successfully',
      icon: BookOpen,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Citation Accuracy',
      value: (metrics.citationAccuracy * 100).toFixed(0) + '%',
      desc: 'Physical page quote verification precision',
      icon: CheckCheck,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-xl border bg-card shadow-subtle flex flex-col justify-between ${item.border}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-surface-muted truncate">{item.label}</span>
              <div
                className={`w-6 h-6 rounded-md ${item.bg} ${item.color} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className={`text-2xl font-bold font-mono ${item.color}`}>{item.value}</span>
            <p className="text-[10px] text-surface-muted mt-1 leading-snug line-clamp-2">
              {item.desc}
            </p>
          </div>
        );
      })}
    </div>
  );
};
