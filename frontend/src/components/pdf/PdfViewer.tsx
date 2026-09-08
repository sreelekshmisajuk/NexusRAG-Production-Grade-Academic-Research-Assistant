import React, { useState, useEffect } from 'react';
import { Document } from '../../types/document';
import { PdfToolbar } from './PdfToolbar';
import {
  FileText,
  List,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

interface PdfViewerProps {
  document: Document;
  initialPage?: number;
  highlightText?: string;
  citationId?: number;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  document: doc,
  initialPage = 1,
  highlightText,
  citationId,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [zoom, setZoom] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'toc' | 'pages'>('toc');

  useEffect(() => {
    if (initialPage) setCurrentPage(initialPage);
  }, [initialPage]);

  const tocItems = [
    { title: 'Abstract', page: 1 },
    { title: '1. Introduction', page: 1 },
    { title: '2. Related Work & Retrieval Baselines', page: 2 },
    { title: '3. Hybrid Search & Vector Indexing', page: 3 },
    { title: '4. Cross-Encoder Reranking Architecture', page: 4 },
    { title: '5. Empirical Benchmarks & Evaluation', page: Math.min(doc.total_pages, 6) },
    { title: '6. Conclusion & Future Directions', page: doc.total_pages },
  ];

  // Academic PDF simulation text tailored to the selected page
  const getPageContent = (page: number) => {
    if (page === 1) {
      return {
        section: '1. Introduction',
        title: doc.metadata.title,
        authors: doc.metadata.author || 'Academic Research Consortium',
        body: [
          `Abstract — Generative large language models (LLMs) have demonstrated remarkable capabilities across diverse reasoning benchmarks. However, when queried on specialized or evolving domain topics, parametric models frequently suffer from factual hallucinations and outdated knowledge representation.`,
          `To address these fundamental limitations, Retrieval-Augmented Generation (RAG) paradigms decouple storage from parametric reasoning. By retrieving authoritative passages from external document repositories, models can ground their generation in explicit physical evidence.`,
          `In this paper, we systematically analyze hybrid retrieval pipelines combining dense embedding bi-encoders with lexical sparse indices (Rank-BM25) and subsequent cross-encoder reranking. Our findings demonstrate a 38% reduction in hallucination rates across technical scientific corpora.`,
        ],
      };
    }
    if (page === 4 || page === initialPage) {
      return {
        section: '4. Cross-Encoder Joint Token Attention & Reranking',
        title: 'Joint Query-Passage Interaction Formulation',
        authors: 'Methodology & Optimization',
        body: [
          `Retrieval augmentation provides access to external authoritative knowledge repositories, preventing the language model from generating factually hallucinatory claims through explicit contextual grounding.`,
          `Unlike dual bi-encoders where query and document representations are mapped independently into vector spaces, the cross-encoder computes full joint self-attention across the combined token sequence: S(q, d) = W * [CLS, q, SEP, d].`,
          `Cross-encoder reranking mitigates the lost-in-the-middle degradation by placing the highest-scoring candidate chunks at the extreme head and tail of the synthesized context window, maximizing attention retention.`,
        ],
      };
    }
    return {
      section: `Section ${page}. Implementation & Benchmark Results`,
      title: `Page ${page}: Context Retrieval Analysis`,
      authors: `Technical Report • Page ${page} of ${doc.total_pages}`,
      body: [
        `Passage representations are segmented using recursive token chunkers with 500-token boundaries and 100-token contextual overlaps to maintain semantic continuity across document section breaks.`,
        `Empirical evaluation confirms that Reciprocal Rank Fusion (RRF) at alpha=0.7 balances lexical exact-match sensitivity with dense semantic recall, achieving 94% citation verifiability.`,
      ],
    };
  };

  const pageData = getPageContent(currentPage);

  return (
    <div className="h-full flex flex-col bg-background select-none">
      {/* Top Toolbar */}
      <PdfToolbar
        currentPage={currentPage}
        totalPages={doc.total_pages}
        zoom={zoom}
        onPageChange={setCurrentPage}
        onZoomChange={setZoom}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filename={doc.filename}
      />

      {/* Main Split: Left Index & Right PDF Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Document Navigation Sidebar */}
        <div className="w-56 border-r border-surface-border bg-card flex flex-col shrink-0 hidden md:flex">
          <div className="flex border-b border-surface-border text-xs">
            <button
              onClick={() => setActiveTab('toc')}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                activeTab === 'toc'
                  ? 'border-b-2 border-primary text-primary-400 font-semibold'
                  : 'text-surface-muted hover:text-foreground'
              }`}
            >
              Contents
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`flex-1 py-2 text-center font-medium transition-colors ${
                activeTab === 'pages'
                  ? 'border-b-2 border-primary text-primary-400 font-semibold'
                  : 'text-surface-muted hover:text-foreground'
              }`}
            >
              Pages ({doc.total_pages})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {activeTab === 'toc' ? (
              tocItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(item.page)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                    currentPage === item.page
                      ? 'bg-primary/10 text-primary-400 font-medium'
                      : 'text-surface-muted hover:text-foreground hover:bg-surface-elevated'
                  }`}
                >
                  <span className="truncate">{item.title}</span>
                  <span className="text-[10px] font-mono text-surface-muted ml-1">
                    p.{item.page}
                  </span>
                </button>
              ))
            ) : (
              <div className="grid grid-cols-2 gap-2 p-1">
                {Array.from({ length: doc.total_pages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`p-2 rounded border text-center transition-all ${
                        currentPage === pNum
                          ? 'border-primary bg-primary/10 text-primary-400'
                          : 'border-surface-border bg-surface-elevated/40 text-surface-muted hover:border-surface-border'
                      }`}
                    >
                      <div className="w-full h-14 bg-card rounded border border-surface-border/50 mb-1 flex items-center justify-center text-[10px] font-mono">
                        p. {pNum}
                      </div>
                      <span className="text-[10px] font-mono">Page {pNum}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right PDF Reading Canvas */}
        <div className="flex-1 overflow-hidden p-2 md:p-4 flex flex-col bg-surface-elevated/30">
          <iframe
            src={`/api/documents/${doc.doc_id}/pdf#page=${currentPage}`}
            className="w-full h-full rounded-xl border border-surface-border bg-white shadow-elevated"
            title={doc.filename}
          />
        </div>
      </div>

      {/* Bottom Selected Evidence / Citation Banner */}
      <div className="p-3 border-t border-surface-border bg-card/95 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary-400 font-mono font-bold text-[11px] shrink-0">
            Evidence [{citationId || 1}]
          </span>
          <p className="text-surface-muted truncate font-serif italic">
            "{highlightText || pageData.body[0]}"
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Grounded
          </span>
        </div>
      </div>
    </div>
  );
};
