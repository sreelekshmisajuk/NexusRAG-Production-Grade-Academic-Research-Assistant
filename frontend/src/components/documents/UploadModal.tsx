import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { documentApi } from '../../services/documentApi';

interface UploadItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

export const UploadModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen } = useApp();
  const { success, error } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: () => documentApi.getCollections(),
  });

  const [files, setFiles] = useState<UploadItem[]>([]);
  const [collection, setCollection] = useState<string>('General Research');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isUploadModalOpen) return null;

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newItems: UploadItem[] = [];

    Array.from(incoming).forEach((file) => {
      // Validate PDF format
      if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        error('Invalid File Type', `${file.name} is not a PDF.`);
        return;
      }
      // Validate 50MB size limit
      if (file.size > 50 * 1024 * 1024) {
        error('File Too Large', `${file.name} exceeds 50 MB limit.`);
        return;
      }
      newItems.push({
        file,
        progress: 0,
        status: 'pending',
      });
    });

    setFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === 'completed') continue;

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading', progress: 10 } : f))
      );

      try {
        await documentApi.uploadDocument(item.file, collection, (pct) => {
          setFiles((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, progress: pct } : f))
          );
        });

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'completed', progress: 100 } : f
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error', errorMessage: err.message || 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
    success(
      'Upload & Ingestion Finished',
      `Processed ${files.length} research paper(s) into ${collection}.`
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClose = () => {
    if (isProcessing) return;
    setFiles([]);
    setIsUploadModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-xl border border-surface-border bg-card shadow-elevated flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Upload Research Papers</h3>
            <p className="text-xs text-surface-muted mt-0.5">
              Ingest, parse, and embed PDF documents into your hybrid index
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Collection Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-primary-400" />
              Target Collection
            </label>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {collections.map((col) => (
                <option key={col.id} value={col.name}>
                  {col.name}
                </option>
              ))}
              {!collections.some((c) => c.name === 'General Research') && (
                <option value="General Research">General Research</option>
              )}
            </select>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-150 cursor-pointer ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-surface-border hover:border-primary/50 bg-surface-elevated/40'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFiles(e.target.files)}
              multiple
              accept=".pdf,application/pdf"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary-400 mx-auto flex items-center justify-center mb-2.5 border border-primary/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Upload PDF files</h4>
            <p className="text-[11px] text-surface-muted mt-1">
              Drag & drop files here, or <span className="text-primary-400 underline">browse</span>
            </p>
            <p className="text-[10px] text-surface-muted mt-2 font-mono">PDF files up to 50 MB</p>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-foreground">
                <span>Selected Files ({files.length})</span>
                <span className="text-[11px] text-surface-muted">
                  Total:{' '}
                  {formatFileSize(files.reduce((acc, curr) => acc + curr.file.size, 0))}
                </span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {files.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-surface-border bg-surface-elevated flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <FileText className="w-4 h-4 text-primary-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{item.file.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-surface-muted">
                          <span>{formatFileSize(item.file.size)}</span>
                          {item.status === 'uploading' && (
                            <span className="text-primary-400 font-mono">
                              {item.progress}%
                            </span>
                          )}
                          {item.status === 'completed' && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Indexed
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Failed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isProcessing && item.status !== 'completed' && (
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-surface-muted hover:text-rose-400 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-elevated/40 flex items-center justify-end gap-2.5">
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-surface-border text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            {files.some((f) => f.status === 'completed') ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={handleUploadAll}
            disabled={isProcessing || files.length === 0 || files.every((f) => f.status === 'completed')}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary-hover text-white shadow-subtle transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              'Upload & Process'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
