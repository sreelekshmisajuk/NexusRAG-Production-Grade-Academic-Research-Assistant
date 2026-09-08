import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  documentTitle?: string;
  count?: number;
  isLoading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  documentTitle,
  count = 1,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const isMultiple = count > 1;
  const modalTitle = title || (isMultiple ? `Remove ${count} Documents?` : 'Remove Document?');
  const modalDesc =
    description ||
    (isMultiple
      ? `Are you sure you want to remove these ${count} selected papers? This will permanently delete their chunks, semantic vectors from Qdrant, and BM25 lexical entries.`
      : `Are you sure you want to remove "${documentTitle || 'this document'}"? This will permanently purge its indexed chunks, vector representations, and physical PDF storage.`);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-card p-6 shadow-elevated space-y-5">
        {/* Header with Danger Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground leading-snug">{modalTitle}</h3>
              <p className="text-xs text-surface-muted mt-0.5">Permanent Deletion Warning</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Notice Box */}
        <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <span>{modalDesc}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium text-surface-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-subtle transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isMultiple ? `Delete ${count} Papers` : 'Delete Document'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
