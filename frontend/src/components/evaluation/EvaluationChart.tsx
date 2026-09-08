import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Experiment } from '../../types/evaluation';

interface EvaluationChartProps {
  experiments: Experiment[];
}

export const EvaluationChart: React.FC<EvaluationChartProps> = ({ experiments }) => {
  const chartData = [
    {
      metric: 'Faithfulness',
      ...experiments.reduce((acc, exp) => ({ ...acc, [exp.name]: exp.metrics.faithfulness }), {}),
    },
    {
      metric: 'Answer Relevance',
      ...experiments.reduce((acc, exp) => ({ ...acc, [exp.name]: exp.metrics.answerRelevance }), {}),
    },
    {
      metric: 'Context Recall',
      ...experiments.reduce((acc, exp) => ({ ...acc, [exp.name]: exp.metrics.contextRecall }), {}),
    },
    {
      metric: 'Citation Accuracy',
      ...experiments.reduce((acc, exp) => ({ ...acc, [exp.name]: exp.metrics.citationAccuracy }), {}),
    },
  ];

  const palette = ['#64748b', '#0ea5e9', '#10b981'];

  return (
    <div className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Ablation Metric Visualizer</h4>
          <p className="text-xs text-surface-muted">
            Performance gain comparing Baseline vs Hybrid vs Production RAG
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
            <XAxis dataKey="metric" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis domain={[0.6, 1.0]} stroke="#64748b" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f8fafc',
              }}
              formatter={(val: any) => [`${(Number(val) * 100).toFixed(0)}%`, 'Score']}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            {experiments.map((exp, idx) => (
              <Bar
                key={exp.id}
                dataKey={exp.name}
                fill={palette[idx % palette.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
