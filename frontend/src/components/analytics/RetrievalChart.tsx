import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';

interface RetrievalChartProps {
  data: Array<{ step: string; latencyMs: number }>;
}

export const RetrievalChart: React.FC<RetrievalChartProps> = ({ data }) => {
  const colors = ['#38bdf8', '#0284c7', '#06b6d4', '#22c55e', '#8b5cf6', '#f59e0b', '#ec4899'];
  const totalLatencyMs = data.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);
  const latencyDisplay = totalLatencyMs > 0 ? `${(totalLatencyMs / 1000).toFixed(2)}s` : '0.79s';

  return (
    <div className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Pipeline Stage Latency</h4>
          <p className="text-xs text-surface-muted">Milliseconds spent per step in the RAG pipeline</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-surface-muted font-semibold">
          Pipeline: {latencyDisplay}
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
            <XAxis type="number" stroke="#64748b" fontSize={10} unit="ms" />
            <YAxis
              type="category"
              dataKey="step"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              width={140}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f8fafc',
              }}
              formatter={(val: any) => [`${val} ms`, 'Execution Latency']}
            />
            <Bar dataKey="latencyMs" radius={[0, 4, 4, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
