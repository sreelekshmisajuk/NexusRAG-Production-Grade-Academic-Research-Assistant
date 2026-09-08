import React from 'react';
import { Experiment } from '../../types/evaluation';
import { Check, Sparkles, Database } from 'lucide-react';

interface ExperimentTableProps {
  experiments: Experiment[];
  selectedExperimentId: string;
  onSelectExperiment: (id: string) => void;
}

export const ExperimentTable: React.FC<ExperimentTableProps> = ({
  experiments,
  selectedExperimentId,
  onSelectExperiment,
}) => {
  return (
    <div className="rounded-xl border border-surface-border bg-card overflow-hidden shadow-subtle">
      <div className="p-4 border-b border-surface-border flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Architecture Benchmarks & Ablation Studies
          </h4>
          <p className="text-xs text-surface-muted">
            Compare retrieval pipelines across standard Ragas / TruLens metrics
          </p>
        </div>
        <span className="text-[11px] font-mono bg-surface-elevated text-surface-muted px-2 py-0.5 rounded border border-surface-border">
          N = 100 Questions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-surface-border bg-surface-elevated/40 text-[11px] font-semibold text-surface-muted uppercase">
              <th className="p-3.5">Metric</th>
              {experiments.map((exp) => (
                <th
                  key={exp.id}
                  onClick={() => onSelectExperiment(exp.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    selectedExperimentId === exp.id
                      ? 'bg-primary/10 text-primary-400 font-bold border-b-2 border-primary'
                      : 'hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{exp.name}</span>
                    {selectedExperimentId === exp.id && (
                      <Check className="w-3 h-3 text-primary-400" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border font-mono text-xs">
            <tr>
              <td className="p-3.5 font-sans font-medium text-foreground">Faithfulness</td>
              {experiments.map((exp) => (
                <td
                  key={exp.id}
                  className={`p-3.5 font-semibold ${
                    exp.metrics.faithfulness >= 0.9 ? 'text-emerald-400 font-bold' : 'text-surface-muted'
                  }`}
                >
                  {exp.metrics.faithfulness.toFixed(2)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3.5 font-sans font-medium text-foreground">Answer Relevance</td>
              {experiments.map((exp) => (
                <td
                  key={exp.id}
                  className={`p-3.5 font-semibold ${
                    exp.metrics.answerRelevance >= 0.88 ? 'text-emerald-400 font-bold' : 'text-surface-muted'
                  }`}
                >
                  {exp.metrics.answerRelevance.toFixed(2)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3.5 font-sans font-medium text-foreground">Context Recall</td>
              {experiments.map((exp) => (
                <td
                  key={exp.id}
                  className={`p-3.5 font-semibold ${
                    exp.metrics.contextRecall >= 0.9 ? 'text-emerald-400 font-bold' : 'text-surface-muted'
                  }`}
                >
                  {exp.metrics.contextRecall.toFixed(2)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3.5 font-sans font-medium text-foreground">Context Relevance</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="p-3.5 text-surface-muted">
                  {exp.metrics.contextRelevance.toFixed(2)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3.5 font-sans font-medium text-foreground">Citation Accuracy</td>
              {experiments.map((exp) => (
                <td
                  key={exp.id}
                  className={`p-3.5 font-semibold ${
                    exp.metrics.citationAccuracy >= 0.9 ? 'text-cyan-accent font-bold' : 'text-surface-muted'
                  }`}
                >
                  {exp.metrics.citationAccuracy.toFixed(2)}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-3.5 font-sans font-medium text-foreground">Hallucination Rate</td>
              {experiments.map((exp) => (
                <td
                  key={exp.id}
                  className={`p-3.5 ${
                    exp.metrics.hallucinationRate <= 0.1 ? 'text-emerald-400 font-bold' : 'text-rose-400'
                  }`}
                >
                  {(exp.metrics.hallucinationRate * 100).toFixed(0)}%
                </td>
              ))}
            </tr>

            <tr className="bg-surface-elevated/20">
              <td className="p-3.5 font-sans font-medium text-surface-muted">Retriever Strategy</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="p-3.5 text-surface-muted text-[11px]">
                  {exp.retriever}
                </td>
              ))}
            </tr>

            <tr className="bg-surface-elevated/20">
              <td className="p-3.5 font-sans font-medium text-surface-muted">Reranker Model</td>
              {experiments.map((exp) => (
                <td key={exp.id} className="p-3.5 text-surface-muted text-[11px]">
                  {exp.reranker}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
