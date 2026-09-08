import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../services/documentApi';
import { LoadingState } from '../components/common/LoadingState';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  FolderKanban,
  FileText,
  MessageSquare,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  Layers,
} from 'lucide-react';

export const Collections: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectAllDocuments } = useApp();
  const { success } = useToast();

  const [selectedColId, setSelectedColId] = useState<string>('');
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: collections = [], isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => documentApi.getCollections(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentApi.getDocuments(),
  });

  const createColMutation = useMutation({
    mutationFn: ({ name, desc }: { name: string; desc: string }) =>
      documentApi.createCollection(name, desc),
    onSuccess: (newCol) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setIsModalOpen(false);
      setNewColName('');
      setNewColDesc('');
      setSelectedColId(newCol.id);
      success('Collection Created', `${newCol.name} has been added.`);
    },
  });

  const deleteColMutation = useMutation({
    mutationFn: (id: string) => documentApi.deleteCollection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      success('Collection Deleted', 'The research collection was removed.');
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <LoadingState rows={4} message="Loading document collections..." />
      </div>
    );
  }

  const selectedCol = collections.find((c) => c.id === selectedColId) || collections[0];

  const colDocuments = documents.filter((d) => d.collection === selectedCol?.name);

  const handleStartResearchWithCollection = () => {
    if (colDocuments.length > 0) {
      selectAllDocuments(colDocuments.map((d) => d.doc_id));
    }
    navigate('/research');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Document Collections
          </h1>
          <p className="text-sm text-surface-muted mt-1">
            Organize academic papers into specialized thematic domains for focused cross-document retrieval
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-subtle transition-all self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Main Grid: Collections list on Left, Active Collection Detail on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Collections Cards Grid */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Active Research Groups ({collections.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {collections.map((col) => {
              const isSelected = col.id === selectedCol?.id;
              return (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-glow-primary'
                      : 'border-surface-border bg-card hover:bg-surface-elevated/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary-400 flex items-center justify-center border border-primary/20">
                        <FolderKanban className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-surface-muted bg-surface-elevated px-2 py-0.5 rounded border border-surface-border">
                        {col.documentCount} papers
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                      {col.name}
                    </h4>
                    <p className="text-xs text-surface-muted mt-1 line-clamp-2 leading-relaxed">
                      {col.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-border/50 flex items-center justify-between text-[11px] text-surface-muted font-mono">
                    <span>{col.sessionCount} sessions</span>
                    <span>{col.queryCount} queries</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Collection Detail View from Prompt */}
        <div className="lg:col-span-5">
          {selectedCol && (
            <div className="p-6 rounded-2xl border border-surface-border bg-card shadow-elevated space-y-5 sticky top-20">
              <div className="flex items-start justify-between gap-3 border-b border-surface-border pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-primary-400 font-bold tracking-wider">
                    Target Collection
                  </span>
                  <h3 className="text-lg font-bold text-foreground mt-1 leading-snug">
                    {selectedCol.name}
                  </h3>
                  <p className="text-xs text-surface-muted mt-1 leading-relaxed">
                    {selectedCol.description}
                  </p>
                </div>

                <button
                  onClick={() => deleteColMutation.mutate(selectedCol.id)}
                  className="p-1.5 text-surface-muted hover:text-rose-400 hover:bg-surface-elevated rounded transition-colors"
                  title="Delete Collection"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Statistics Grid from prompt */}
              <div className="grid grid-cols-3 gap-2 py-2">
                <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-center">
                  <span className="text-[10px] text-surface-muted block uppercase font-medium">
                    Documents
                  </span>
                  <span className="text-lg font-bold font-mono text-foreground mt-0.5 block">
                    {selectedCol.documentCount}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-center">
                  <span className="text-[10px] text-surface-muted block uppercase font-medium">
                    Sessions
                  </span>
                  <span className="text-lg font-bold font-mono text-primary-400 mt-0.5 block">
                    {selectedCol.sessionCount}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-surface-elevated border border-surface-border text-center">
                  <span className="text-[10px] text-surface-muted block uppercase font-medium">
                    Questions
                  </span>
                  <span className="text-lg font-bold font-mono text-emerald-400 mt-0.5 block">
                    {selectedCol.queryCount}
                  </span>
                </div>
              </div>

              {/* Contained Documents preview */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  Included Papers ({colDocuments.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {colDocuments.length === 0 ? (
                    <p className="text-xs text-surface-muted italic">
                      No documents currently assigned to this collection.
                    </p>
                  ) : (
                    colDocuments.map((doc) => (
                      <div
                        key={doc.doc_id}
                        className="p-2 rounded bg-surface-elevated/60 border border-surface-border text-xs flex items-center justify-between gap-2"
                      >
                        <span className="truncate font-medium text-foreground">{doc.metadata.title}</span>
                        <span className="text-[10px] font-mono text-surface-muted shrink-0">
                          {doc.total_pages}p
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CTA Button from Prompt */}
              <button
                onClick={handleStartResearchWithCollection}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-subtle flex items-center justify-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-cyan-accent" />
                <span>Start Research in {selectedCol.name.split(' ')[0]}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Collection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-surface-border bg-card p-6 shadow-elevated space-y-4">
            <h3 className="text-base font-semibold text-foreground">Create Research Collection</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-surface-muted block mb-1 font-medium">Collection Name</label>
                <input
                  type="text"
                  placeholder="e.g. LLM Reasoning & Chain of Thought"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-surface-muted block mb-1 font-medium">Description</label>
                <textarea
                  placeholder="Focus topics, methodologies, and benchmark domains..."
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-surface-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newColName.trim()) {
                    createColMutation.mutate({ name: newColName.trim(), desc: newColDesc.trim() });
                  }
                }}
                disabled={!newColName.trim()}
                className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
