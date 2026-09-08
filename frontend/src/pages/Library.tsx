import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../services/documentApi';
import { DocumentCard } from '../components/documents/DocumentCard';
import { DocumentTable } from '../components/documents/DocumentTable';
import { DeleteConfirmModal } from '../components/documents/DeleteConfirmModal';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Search,
  UploadCloud,
  FolderPlus,
  LayoutGrid,
  List,
  Filter,
  ArrowUpDown,
  FileText,
  Trash2,
} from 'lucide-react';

export const Library: React.FC = () => {
  const queryClient = useQueryClient();
  const { setIsUploadModalOpen, globalSearchQuery, selectedDocumentIds, clearDocumentSelection } =
    useApp();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'pages'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id?: string;
    ids?: string[];
    title?: string;
    count: number;
  } | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentApi.getDocuments(),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: () => documentApi.getCollections(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: { id?: string; ids?: string[] }) => {
      if (target.ids && target.ids.length > 0) {
        await documentApi.deleteDocuments(target.ids);
      } else if (target.id) {
        await documentApi.deleteDocument(target.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      clearDocumentSelection();
      setDeleteTarget(null);
      success('Document(s) Removed', 'Selected paper(s) have been deleted from the index.');
    },
    onError: (err: any) => {
      error('Delete Failed', err.message || 'Could not remove document from index.');
    },
  });

  const createCollectionMutation = useMutation({
    mutationFn: (name: string) => documentApi.createCollection(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setNewCollectionName('');
      setIsCreatingCollection(false);
      success('Collection Created', 'New research group is ready.');
    },
  });

  const effectiveSearch = search || globalSearchQuery;

  // Filter & Sort
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch =
        doc.metadata.title.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        doc.filename.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        (doc.metadata.author &&
          doc.metadata.author.toLowerCase().includes(effectiveSearch.toLowerCase()));

      const matchesCollection =
        collectionFilter === 'all' || doc.collection === collectionFilter;

      const matchesStatus =
        statusFilter === 'all' || doc.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesCollection && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        const res = a.metadata.title.localeCompare(b.metadata.title);
        return sortOrder === 'asc' ? res : -res;
      }
      if (sortBy === 'pages') {
        return sortOrder === 'asc' ? a.total_pages - b.total_pages : b.total_pages - a.total_pages;
      }
      const dateA = new Date(a.uploaded_at).getTime();
      const dateB = new Date(b.uploaded_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Research Library</h1>
          <p className="text-sm text-surface-muted mt-1">
            Manage your indexed research papers, metadata, and collections
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {selectedDocumentIds.length > 0 && (
            <button
              onClick={() =>
                setDeleteTarget({
                  ids: selectedDocumentIds,
                  count: selectedDocumentIds.length,
                  title: `Remove ${selectedDocumentIds.length} Selected Papers?`,
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold shadow-subtle transition-all animate-in fade-in"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete Selected ({selectedDocumentIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsCreatingCollection(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border bg-card text-xs font-medium text-foreground hover:bg-surface-elevated transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-primary-400" />
            <span>Create Collection</span>
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-subtle transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload PDFs</span>
          </button>
        </div>
      </div>

      {/* New Collection Inline Form */}
      {isCreatingCollection && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-1">
            <FolderPlus className="w-4 h-4 text-primary-400 shrink-0" />
            <input
              type="text"
              placeholder="Collection name (e.g. Multi-Modal Vision RAG)..."
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              className="w-full bg-card border border-surface-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreatingCollection(false)}
              className="px-3 py-1.5 text-xs font-medium text-surface-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (newCollectionName.trim()) {
                  createCollectionMutation.mutate(newCollectionName.trim());
                }
              }}
              disabled={!newCollectionName.trim()}
              className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-medium disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Filter & Controls Toolbar */}
      <div className="p-3.5 rounded-xl border border-surface-border bg-card shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
          <input
            type="text"
            placeholder="Search by title, author, filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-elevated/70 border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-surface-muted focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Filters & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Collection Filter */}
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Collections ({documents.length})</option>
            {collections.map((col) => (
              <option key={col.id} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-elevated border border-surface-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="processed">Processed</option>
            <option value="processing">Processing</option>
            <option value="uploaded">Uploaded</option>
            <option value="failed">Failed</option>
          </select>

          {/* Sort By */}
          <button
            onClick={() => {
              if (sortBy === 'date') setSortBy('title');
              else if (sortBy === 'title') setSortBy('pages');
              else setSortBy('date');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-border bg-surface-elevated text-surface-muted hover:text-foreground"
            title="Toggle sort field"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span className="capitalize">Sort: {sortBy}</span>
          </button>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2 py-1.5 rounded-lg border border-surface-border bg-surface-elevated text-surface-muted hover:text-foreground font-mono"
            title="Sort direction"
          >
            {sortOrder.toUpperCase()}
          </button>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center border border-surface-border rounded-lg overflow-hidden bg-surface-elevated p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded ${
                viewMode === 'grid'
                  ? 'bg-card text-primary-400 shadow-xs'
                  : 'text-surface-muted hover:text-foreground'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded ${
                viewMode === 'table'
                  ? 'bg-card text-primary-400 shadow-xs'
                  : 'text-surface-muted hover:text-foreground'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Documents Content */}
      {isLoading ? (
        <LoadingState rows={4} message="Loading research library..." />
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          title="No research papers found"
          description={
            effectiveSearch
              ? `No documents matched "${effectiveSearch}". Try adjusting your filters.`
              : 'Upload your first academic paper to start asking grounded questions.'
          }
          actionLabel="Upload Research Paper"
          onAction={() => setIsUploadModalOpen(true)}
          icon={<FileText className="w-6 h-6 text-primary-400" />}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.doc_id}
              document={doc}
              onDelete={(id) => {
                const targetDoc = documents.find((d) => d.doc_id === id);
                setDeleteTarget({
                  id,
                  title: targetDoc?.metadata.title || targetDoc?.filename || 'Document',
                  count: 1,
                });
              }}
            />
          ))}
        </div>
      ) : (
        <DocumentTable
          documents={filteredDocuments}
          onDelete={(id) => {
            const targetDoc = documents.find((d) => d.doc_id === id);
            setDeleteTarget({
              id,
              title: targetDoc?.metadata.title || targetDoc?.filename || 'Document',
              count: 1,
            });
          }}
        />
      )}

      {/* Confirmation Modal for Document Deletion */}
      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget);
          }
        }}
        documentTitle={deleteTarget?.title}
        count={deleteTarget?.count || 1}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
