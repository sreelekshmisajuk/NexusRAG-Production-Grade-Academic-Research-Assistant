import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Document } from '../../types/document';
import { StatusBadge } from '../common/StatusBadge';
import {
  FileText,
  Trash2,
  ExternalLink,
  MessageSquareQuote,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DocumentTableProps {
  documents: Document[];
  onDelete?: (id: string) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({ documents, onDelete }) => {
  const navigate = useNavigate();
  const { toggleDocumentSelection, selectedDocumentIds, selectAllDocuments, clearDocumentSelection } =
    useApp();

  const allSelected =
    documents.length > 0 && documents.every((d) => selectedDocumentIds.includes(d.doc_id));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-surface-border bg-card">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-surface-border bg-surface-elevated/50 text-[11px] font-semibold text-surface-muted uppercase tracking-wider">
            <th className="p-3 w-10 text-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  if (allSelected) clearDocumentSelection();
                  else selectAllDocuments(documents.map((d) => d.doc_id));
                }}
                className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
              />
            </th>
            <th className="p-3">Title & Filename</th>
            <th className="p-3">Collection</th>
            <th className="p-3">Pages</th>
            <th className="p-3">Size</th>
            <th className="p-3">Status</th>
            <th className="p-3">Uploaded</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {documents.map((doc) => {
            const isSelected = selectedDocumentIds.includes(doc.doc_id);
            return (
              <tr
                key={doc.doc_id}
                className={`hover:bg-surface-elevated/60 transition-colors ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
              >
                <td className="p-3 text-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleDocumentSelection(doc.doc_id)}
                    className="w-3.5 h-3.5 rounded accent-primary cursor-pointer"
                  />
                </td>
                <td className="p-3 max-w-xs">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-primary-400 shrink-0" />
                    <div className="min-w-0">
                      <p
                        onClick={() => navigate(`/documents/${doc.doc_id}`)}
                        className="font-medium text-foreground truncate hover:text-primary cursor-pointer"
                      >
                        {doc.metadata.title}
                      </p>
                      <p className="text-[10px] text-surface-muted truncate">
                        {doc.metadata.author || doc.filename}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-surface-muted whitespace-nowrap">
                  <span className="bg-surface-elevated px-2 py-0.5 rounded border border-surface-border/50 text-[10px]">
                    {doc.collection}
                  </span>
                </td>
                <td className="p-3 text-surface-muted whitespace-nowrap">{doc.total_pages}</td>
                <td className="p-3 text-surface-muted whitespace-nowrap">
                  {formatFileSize(doc.file_size_bytes)}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="p-3 text-surface-muted whitespace-nowrap">
                  {formatDate(doc.uploaded_at)}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => navigate('/research')}
                      className="p-1 text-surface-muted hover:text-primary hover:bg-surface-elevated rounded"
                      title="Ask question"
                    >
                      <MessageSquareQuote className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/documents/${doc.doc_id}`)}
                      className="p-1 text-surface-muted hover:text-foreground hover:bg-surface-elevated rounded"
                      title="Inspect PDF"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(doc.doc_id)}
                        className="p-1 text-surface-muted hover:text-rose-400 hover:bg-surface-elevated rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
