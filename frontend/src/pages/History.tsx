import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { researchApi } from '../services/researchApi';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  MessageSquare,
  Calendar,
  Layers,
} from 'lucide-react';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success } = useToast();

  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['researchHistory'],
    queryFn: () => researchApi.getHistory(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => researchApi.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researchHistory'] });
      success('Session Deleted', 'Research history entry removed.');
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      researchApi.renameSession(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researchHistory'] });
      setEditingId(null);
      success('Session Renamed', 'Updated research title saved.');
    },
  });

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const startRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      renameMutation.mutate({ id, title: editTitle.trim() });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Research History
          </h1>
          <p className="text-sm text-surface-muted mt-1">
            Access previous research threads, verified evidence traces, and citations
          </p>
        </div>

        <button
          onClick={() => navigate('/research')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-subtle self-start sm:self-auto transition-all"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>New Research Session</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
        <input
          type="text"
          placeholder="Search previous sessions by topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-surface-border rounded-lg pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-surface-muted focus:outline-none focus:border-primary/50 shadow-subtle"
        />
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <LoadingState rows={4} message="Loading research sessions..." />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          title="No research history found"
          description={
            search
              ? `No sessions match "${search}".`
              : 'Previous research questions and cited reasoning traces will appear here.'
          }
          actionLabel="Start First Session"
          onAction={() => navigate('/research')}
          icon={<HistoryIcon className="w-6 h-6 text-primary-400" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((ses) => (
            <div
              key={ses.id}
              className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle hover:shadow-card transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              {/* Title & Metadata */}
              <div className="min-w-0 flex-1">
                {editingId === ses.id ? (
                  <div className="flex items-center gap-2 max-w-md">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-surface-elevated border border-surface-border rounded px-2.5 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(ses.id)}
                      className="p-1 text-emerald-400 hover:bg-surface-elevated rounded"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-surface-muted hover:bg-surface-elevated rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <h3
                    onClick={() => navigate('/research')}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                  >
                    {ses.title}
                  </h3>
                )}

                <div className="flex items-center gap-4 text-xs text-surface-muted mt-1.5 font-mono">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-primary-400" />
                    {ses.queryCount} {ses.queryCount === 1 ? 'query' : 'queries'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-cyan-accent" />
                    {ses.documentIds.length} papers
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(ses.createdAt)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate('/research')}
                  className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-primary/10 hover:text-primary text-foreground text-xs font-medium border border-surface-border transition-colors flex items-center gap-1.5"
                >
                  <span>Reopen Session</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <button
                  onClick={() => startRename(ses.id, ses.title)}
                  className="p-1.5 text-surface-muted hover:text-foreground hover:bg-surface-elevated rounded transition-colors"
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => deleteMutation.mutate(ses.id)}
                  className="p-1.5 text-surface-muted hover:text-rose-400 hover:bg-surface-elevated rounded transition-colors"
                  title="Delete Session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
