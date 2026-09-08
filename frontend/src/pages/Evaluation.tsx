import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evaluationApi } from '../services/evaluationApi';
import { EvaluationMetrics } from '../components/evaluation/EvaluationMetrics';
import { ExperimentTable } from '../components/evaluation/ExperimentTable';
import { EvaluationChart } from '../components/evaluation/EvaluationChart';
import { LoadingState } from '../components/common/LoadingState';
import { useToast } from '../context/ToastContext';
import {
  Play,
  Database,
  CheckCheck,
  FileCheck2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export const Evaluation: React.FC = () => {
  const queryClient = useQueryClient();
  const { success } = useToast();
  const [selectedExperimentId, setSelectedExperimentId] = useState('exp-production');

  const { data: experiments = [], isLoading } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => evaluationApi.getExperiments(),
  });

  const runEvaluationMutation = useMutation({
    mutationFn: (name: string) => evaluationApi.runEvaluation(name),
    onSuccess: (newExp) => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      setSelectedExperimentId(newExp.id);
      success('Evaluation Suite Completed', `Finished benchmark run: ${newExp.name}`);
    },
  });

  if (isLoading || experiments.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState rows={4} message="Fetching RAG evaluation metrics..." />
      </div>
    );
  }

  const currentExperiment =
    experiments.find((e) => e.id === selectedExperimentId) || experiments[experiments.length - 1];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            RAG Pipeline Evaluation & Benchmarks
          </h1>
          <p className="text-sm text-surface-muted mt-1">
            Reference-free and reference-based metrics evaluating faithfulness, recall, and context precision
          </p>
        </div>

        <button
          onClick={() =>
            runEvaluationMutation.mutate(
              `Ablation Run ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            )
          }
          disabled={runEvaluationMutation.isPending}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-subtle self-start sm:self-auto transition-all disabled:opacity-50"
        >
          {runEvaluationMutation.isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Evaluating Test Suite...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run New Evaluation Benchmark</span>
            </>
          )}
        </button>
      </div>

      {/* Primary KPI Metrics Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-surface-muted">
          <span className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
            Selected Benchmark: <span className="text-primary-400 font-bold">{currentExperiment.name}</span>
          </span>
          <span className="font-mono text-[10px]">Evaluated: {currentExperiment.date}</span>
        </div>
        <EvaluationMetrics metrics={currentExperiment.metrics} />
      </div>

      {/* Dataset Statistics Card from prompt */}
      <div className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary-400 flex items-center justify-center border border-primary/20 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-foreground">Gold-Standard Evaluation Dataset</h4>
            <p className="text-surface-muted text-[11px]">
              Multi-document question-answer pairs curated for factual claim verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="text-center">
            <span className="text-[10px] text-surface-muted block uppercase">Questions</span>
            <span className="font-bold text-foreground">{currentExperiment.datasetSize.questions}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-surface-muted block uppercase">Documents</span>
            <span className="font-bold text-foreground">{currentExperiment.datasetSize.documents}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] text-surface-muted block uppercase">Evaluated</span>
            <span className="font-bold text-emerald-400">{currentExperiment.datasetSize.evaluated}</span>
          </div>
        </div>
      </div>

      {/* Visual Chart & Ablation Table */}
      <div className="space-y-6">
        <EvaluationChart experiments={experiments} />
        <ExperimentTable
          experiments={experiments}
          selectedExperimentId={selectedExperimentId}
          onSelectExperiment={setSelectedExperimentId}
        />
      </div>
    </div>
  );
};
