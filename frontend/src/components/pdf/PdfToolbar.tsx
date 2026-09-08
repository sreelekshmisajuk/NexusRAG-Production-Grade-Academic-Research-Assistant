import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  Download,
  Maximize2,
} from 'lucide-react';

interface PdfToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filename: string;
}

export const PdfToolbar: React.FC<PdfToolbarProps> = ({
  currentPage,
  totalPages,
  zoom,
  onPageChange,
  onZoomChange,
  searchQuery,
  onSearchChange,
  filename,
}) => {
  return (
    <div className="h-12 border-b border-surface-border bg-card/90 px-4 flex items-center justify-between gap-3 text-xs select-none">
      {/* Document Title */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-foreground truncate max-w-xs sm:max-w-md">
          {filename}
        </span>
      </div>

      {/* Center Controls: Page Navigation & Search */}
      <div className="flex items-center gap-2">
        {/* Page Switcher */}
        <div className="flex items-center gap-1 bg-surface-elevated rounded-lg px-1.5 py-1 border border-surface-border">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded text-surface-muted hover:text-foreground disabled:opacity-30"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs px-1 text-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1 rounded text-surface-muted hover:text-foreground disabled:opacity-30"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1 bg-surface-elevated rounded-lg px-1.5 py-1 border border-surface-border">
          <button
            onClick={() => onZoomChange(Math.max(50, zoom - 15))}
            className="p-1 rounded text-surface-muted hover:text-foreground"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs px-1 text-foreground">{zoom}%</span>
          <button
            onClick={() => onZoomChange(Math.min(200, zoom + 15))}
            className="p-1 rounded text-surface-muted hover:text-foreground"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* In-page Search */}
        <div className="relative hidden md:block w-36">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-surface-muted" />
          <input
            type="text"
            placeholder="Search text..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-elevated border border-surface-border rounded-md pl-6 pr-2 py-1 text-[11px] text-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => alert('PDF export downloaded.')}
          className="p-1.5 rounded-lg border border-surface-border text-surface-muted hover:text-foreground hover:bg-surface-elevated"
          title="Download PDF"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
