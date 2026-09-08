import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../services/documentApi';
import { PdfViewer } from '../components/pdf/PdfViewer';
import { DeleteConfirmModal } from '../components/documents/DeleteConfirmModal';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Trash2 } from 'lucide-react';

export const PdfViewerPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const page = parseInt(searchParams.get('page') || '1', 10);
  const highlight = searchParams.get('highlight') || undefined;
  const citationId = searchParams.get('cite') ? parseInt(searchParams.get('cite')!, 10) : undefined;

  const {
    data: document,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentApi.getDocument(documentId || ''),
    enabled: !!documentId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentApi.deleteDocument(documentId || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setIsDeleteModalOpen(false);
      success('Document Removed', 'The paper was deleted from the index.');
      navigate('/library');
    },
    onError: (err: any) => {
      error('Delete Failed', err.message || 'Could not delete document.');
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <LoadingState rows={5} message="Rendering PDF pages and annotations..." />
      </div>
    );
  }

  if (isError || !document) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <ErrorState
          title="Document Not Found"
          message={`Unable to load document ID "${documentId}". It may have been deleted or not yet indexed.`}
          onRetry={() => navigate('/library')}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-background">
      {/* Sub-header back button and actions */}
      <div className="h-9 px-4 border-b border-surface-border bg-card/60 flex items-center justify-between text-xs shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-surface-muted hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-surface-muted hidden sm:inline">
            Doc ID: <span className="text-foreground">{document.doc_id}</span>
          </span>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
            title="Delete this document"
          >
            <Trash2 className="w-3 h-3" />
            <span>Remove Document</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <PdfViewer
          document={document}
          initialPage={page}
          highlightText={highlight}
          citationId={citationId}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        documentTitle={document.metadata.title}
        count={1}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};
