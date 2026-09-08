import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Document } from '../../types/document';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileText,
  Calendar,
  Layers,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  MessageSquareQuote,
  MoreVertical,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document: doc, onDelete }) => {
  const navigate = useNavigate();
  const { toggleDocumentSelection, selectedDocumentIds } = useApp();
  const isSelected = selectedDocumentIds.includes(doc.doc_id);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 bg-card p-4 flex flex-col justify-between hover:shadow-card ${
        isSelected ? 'border-primary shadow-glow-primary' : 'border-surface-border hover:border-surface-border/80'
      }`}
    >
      {/* Top Bar: Icon, Collection, Status */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary-400 flex items-center justify-center border border-primary/20 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-medium text-surface-muted bg-surface-elevated px-2 py-0.5 rounded border border-surface-border/50 truncate max-w-[150px]">
              {doc.collection}
            </span>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        {/* Document Title & Author */}
        <h4
          onClick={() => navigate(`/documents/${doc.doc_id}`)}
          className="text-sm font-semibold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors cursor-pointer"
          title={doc.metadata.title}
        >
          {doc.metadata.title}
        </h4>
        {doc.metadata.author && (
          <p className="text-xs text-surface-muted mt-1 truncate">{doc.metadata.author}</p>
        )}

        {/* Abstract snippet if present */}
        {doc.abstract && (
          <p className="text-[11px] text-surface-muted mt-2 line-clamp-2 leading-relaxed bg-surface-elevated/40 p-2 rounded">
            {doc.abstract}
          </p>
        )}
      </div>

      {/* Metadata Metrics */}
      <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-[11px] text-surface-muted">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-primary-400" />
            {doc.total_pages} {doc.total_pages === 1 ? 'page' : 'pages'}
          </span>
          <span className="flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3 text-cyan-accent" />
            {formatFileSize(doc.file_size_bytes)}
          </span>
        </div>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(doc.uploaded_at)}
        </span>
      </div>

      {/* Bottom Action Footer */}
      <div className="mt-3 pt-2 flex items-center justify-between gap-2 border-t border-surface-border/60">
        <button
          onClick={() => toggleDocumentSelection(doc.doc_id)}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-colors flex items-center gap-1.5 ${
            isSelected
              ? 'bg-primary text-white border-primary'
              : 'border-surface-border text-surface-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            readOnly
            className="w-3 h-3 rounded accent-primary pointer-events-none"
          />
          <span>{isSelected ? 'Selected' : 'Select'}</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/research')}
            className="p-1.5 text-surface-muted hover:text-primary hover:bg-surface-elevated rounded transition-colors"
            title="Ask Questions about this Document"
          >
            <MessageSquareQuote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigate(`/documents/${doc.doc_id}`)}
            className="p-1.5 text-surface-muted hover:text-foreground hover:bg-surface-elevated rounded transition-colors"
            title="Inspect Document Pages"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(doc.doc_id)}
              className="p-1.5 text-surface-muted hover:text-rose-400 hover:bg-surface-elevated rounded transition-colors"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
