import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Document, Collection } from '../../types/document';
import { documentApi } from '../../services/documentApi';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  CheckSquare,
  Square,
  Search,
  FolderKanban,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface DocumentSelectorProps {
  documents: Document[];
  collections: Collection[];
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({ documents, collections }) => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const {
    selectedDocumentIds,
    setSelectedDocumentIds,
    toggleDocumentSelection,
    selectAllDocuments,
    clearDocumentSelection,
    setIsUploadModalOpen,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentApi.deleteDocument(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setSelectedDocumentIds((prev) => prev.filter((id) => id !== deletedId));
      setDeleteTarget(null);
      success('Document Removed', 'Paper has been deleted from the index.');
    },
    onError: (err: any) => {
      error('Delete Failed', err.message || 'Could not delete document.');
    },
  });

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.metadata.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.filename.toLowerCase().includes(search.toLowerCase());
    const matchesCollection =
      selectedCollection === 'all' || doc.collection === selectedCollection;
    return matchesSearch && matchesCollection;
  });

  const allFilteredSelected =
    filteredDocs.length > 0 &&
    filteredDocs.every((d) => selectedDocumentIds.includes(d.doc_id));

  return (
    <div className="h-full flex flex-col bg-card border-r border-surface-border select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-surface-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-primary-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Research Sources
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary-400 border border-primary/20 font-bold">
            {selectedDocumentIds.length} active
          </span>
        </div>

        {/* Search input */}
        <div className="relative mt-2">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-muted" />
          <input
            type="text"
            placeholder="Filter source papers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-elevated/70 border border-surface-border rounded-md pl-7 pr-2.5 py-1 text-[11px] text-foreground placeholder:text-surface-muted focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Selection Controls */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-surface-border/60 text-[11px]">
          <button
            onClick={() =>
              allFilteredSelected
                ? clearDocumentSelection()
                : selectAllDocuments(filteredDocs.map((d) => d.doc_id))
            }
            className="text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1"
          >
            {allFilteredSelected ? (
              <>
                <Square className="w-3 h-3" /> Clear Filtered
              </>
            ) : (
              <>
                <CheckSquare className="w-3 h-3" /> Select All ({filteredDocs.length})
              </>
            )}
          </button>
          <button
            onClick={clearDocumentSelection}
            className="text-surface-muted hover:text-foreground text-[10px]"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Collection Filter Tabs */}
      <div className="px-3 py-2 border-b border-surface-border bg-surface-elevated/40 flex items-center gap-1 overflow-x-auto text-[10px]">
        <button
          onClick={() => setSelectedCollection('all')}
          className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
            selectedCollection === 'all'
              ? 'bg-primary text-white font-medium'
              : 'text-surface-muted hover:text-foreground'
          }`}
        >
          All ({documents.length})
        </button>
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => setSelectedCollection(col.name)}
            className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors ${
              selectedCollection === col.name
                ? 'bg-primary text-white font-medium'
                : 'text-surface-muted hover:text-foreground'
            }`}
          >
            {col.name.split(' ')[0]} ({col.documentCount})
          </button>
        ))}
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8 px-3 text-surface-muted text-xs">
            No papers match your filter.
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isChecked = selectedDocumentIds.includes(doc.doc_id);
            return (
              <div
                key={doc.doc_id}
                onClick={() => toggleDocumentSelection(doc.doc_id)}
                className={`p-2.5 rounded-lg border transition-all duration-150 cursor-pointer text-xs flex items-start gap-2.5 group ${
                  isChecked
                    ? 'border-primary/40 bg-primary/5 shadow-subtle'
                    : 'border-surface-border hover:border-surface-border/80 bg-surface-elevated/30 hover:bg-surface-elevated/60'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="mt-0.5 rounded accent-primary w-3.5 h-3.5 cursor-pointer shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`font-medium line-clamp-2 leading-snug transition-colors ${
                      isChecked ? 'text-foreground font-semibold' : 'text-surface-muted group-hover:text-foreground'
                    }`}
                  >
                    {doc.metadata.title}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-surface-muted mt-1 font-mono">
                    <span>{doc.total_pages}p</span>
                    <span>•</span>
                    <span className="truncate">{doc.collection.split(' ')[0]}</span>
                    {doc.status === 'Processed' && (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0 ml-auto" />
                    )}
                  </div>
                </div>

                {/* Quick Delete button on hover */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({
                      id: doc.doc_id,
                      title: doc.metadata.title || doc.filename,
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-surface-muted hover:text-rose-400 hover:bg-surface-elevated rounded transition-all ml-1 shrink-0"
                  title="Delete unneeded paper"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Ingestion Action */}
      <div className="p-3 border-t border-surface-border bg-surface-elevated/20">
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full py-1.5 px-2 text-xs font-medium rounded-lg border border-dashed border-primary/40 text-primary-400 hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ Ingest More Papers</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id);
          }
        }}
        documentTitle={deleteTarget?.title}
        count={1}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
