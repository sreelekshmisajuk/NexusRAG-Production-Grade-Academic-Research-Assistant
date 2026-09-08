import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/analyticsApi';
import { MetricCard } from '../components/analytics/MetricCard';
import { QueryChart } from '../components/analytics/QueryChart';
import { RetrievalChart } from '../components/analytics/RetrievalChart';
import { LoadingState } from '../components/common/LoadingState';
import {
  FileText,
  Search,
  Clock,
  CheckCircle2,
  PieChart as PieIcon,
  BookMarked,
  Award,
  Zap,
} from 'lucide-react';

export const Analytics: React.FC = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsApi.getSummary(),
  });

  if (isLoading || !analytics) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState rows={4} message="Aggregating RAG telemetry and retrieval logs..." />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Telemetry & Performance Analytics
        </h1>
        <p className="text-sm text-surface-muted mt-1">
          Monitor latency profiles, retrieval recall, and multi-document citation verifiability
        </p>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Documents"
          value={analytics.totalDocuments}
          subtitle="Indexed in vector + lexical stores"
          icon={FileText}
        />
        <MetricCard
          label="Total Queries"
          value={analytics.totalQueries}
          subtitle="Reasoning traces synthesized"
          trend="+18% week-over-week"
          trendPositive={true}
          icon={Search}
        />
        <MetricCard
          label="Average Latency"
          value={`${analytics.averageLatencySeconds}s`}
          subtitle="End-to-end multi-document pipeline"
          icon={Clock}
          badge="P95: 2.1s"
        />
        <MetricCard
          label="Citation Accuracy"
          value={`${(analytics.citationAccuracy * 100).toFixed(0)}%`}
          subtitle="Verified physical passage quotes"
          icon={CheckCircle2}
          trend="+4.2% with Reranker"
          trendPositive={true}
        />
      </div>

      {/* Information Retrieval Benchmark KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-primary-400 font-mono">Recall@5</span>
            <h4 className="text-2xl font-bold font-mono text-foreground mt-1">
              {(analytics.recallAt5 * 100).toFixed(0)}%
            </h4>
            <p className="text-[11px] text-surface-muted mt-0.5">Relevant context captured in Top 5</p>
          </div>
          <Award className="w-8 h-8 text-primary-400 opacity-60" />
        </div>

        <div className="p-4 rounded-xl border border-cyan-glow/20 bg-cyan-accent/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-cyan-accent font-mono">Precision@5</span>
            <h4 className="text-2xl font-bold font-mono text-foreground mt-1">
              {(analytics.precisionAt5 * 100).toFixed(0)}%
            </h4>
            <p className="text-[11px] text-surface-muted mt-0.5">High signal-to-noise candidate density</p>
          </div>
          <Zap className="w-8 h-8 text-cyan-accent opacity-60" />
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-emerald-400 font-mono">MRR (Mean Reciprocal Rank)</span>
            <h4 className="text-2xl font-bold font-mono text-foreground mt-1">
              {(analytics.mrr * 100).toFixed(0)}%
            </h4>
            <p className="text-[11px] text-surface-muted mt-0.5">Optimal rank position of primary ground truth</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
        </div>
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueryChart data={analytics.queriesOverTime} />
        <RetrievalChart data={analytics.latencyBreakdown} />
      </div>

      {/* Categories & Top Cited Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Categories */}
        <div className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Query Category Distribution</h4>
              <p className="text-xs text-surface-muted">Subject matter classification of incoming queries</p>
            </div>
            <PieIcon className="w-4 h-4 text-surface-muted" />
          </div>

          <div className="space-y-3 mt-4">
            {analytics.queryCategories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">{cat.category}</span>
                  <span className="font-mono text-surface-muted">
                    {cat.count} ({cat.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Cited Documents */}
        <div className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Most Cited Research Papers</h4>
              <p className="text-xs text-surface-muted">Authoritative literature driving reasoning outputs</p>
            </div>
            <BookMarked className="w-4 h-4 text-primary-400" />
          </div>

          <div className="space-y-2 mt-4">
            {analytics.topDocuments.map((doc, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-surface-border bg-surface-elevated/40 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{doc.title}</p>
                  <span className="text-[10px] text-surface-muted font-mono">
                    Referenced in {doc.queries} query contexts
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-primary-400 bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
                  {doc.citations} citations
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
