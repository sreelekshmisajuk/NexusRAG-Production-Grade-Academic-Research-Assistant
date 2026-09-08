import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { documentApi } from '../services/documentApi';
import { researchApi } from '../services/researchApi';
import { DocumentSelector } from '../components/documents/DocumentSelector';
import { SourcesPanel } from '../components/sources/SourcesPanel';
import { ChatMessage } from '../components/chat/ChatMessage';
import { ChatInput } from '../components/chat/ChatInput';
import { ProgressIndicator } from '../components/chat/ProgressIndicator';
import { ResultCustomizer } from '../components/chat/ResultCustomizer';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  ChatMessage as ChatMessageType,
  GenerationStage,
  Source,
  ResultCustomization,
} from '../types/research';
import {
  FileText,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
} from 'lucide-react';

export const Research: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { selectedDocumentIds } = useApp();
  const { error } = useToast();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [currentStage, setCurrentStage] = useState<GenerationStage>('idle');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [customization, setCustomization] = useState<ResultCustomization>(() => {
    try {
      const saved = localStorage.getItem('rag_result_customization');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      style: 'direct',
      detailLevel: 'concise',
      showTelemetry: false,
      showCitations: true,
      showGroundingScore: true,
    };
  });

  const handleCustomizationChange = (newConfig: ResultCustomization) => {
    setCustomization(newConfig);
    try {
      localStorage.setItem('rag_result_customization', JSON.stringify(newConfig));
    } catch {
      // ignore
    }
  };

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentApi.getDocuments(),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections'],
    queryFn: () => documentApi.getCollections(),
  });

  // Collect all sources across current messages for the right panel
  const activeSources: Source[] = messages.reduce((acc, msg) => {
    if (msg.sources && msg.sources.length > 0) {
      return msg.sources;
    }
    return acc;
  }, [] as Source[]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStage]);

  // Handle query pre-populated from Dashboard search bar (?q=...)
  useEffect(() => {
    const urlQuery = searchParams.get('q');
    if (urlQuery) {
      handleSendMessage(urlQuery);
    }
  }, [searchParams]);

  const queryMutation = useMutation({
    mutationFn: async (queryText: string) => {
      if (documents.length === 0) {
        throw new Error('Please upload at least one research paper PDF first to query the index.');
      }

      // Add user message
      const userMsg: ChatMessageType = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: queryText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);

      return await researchApi.query(
        {
          query: queryText,
          document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          customization,
        },
        (stage) => setCurrentStage(stage)
      );
    },
    onSuccess: (assistantMsg) => {
      setCurrentStage('completed');
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: (err: any) => {
      setCurrentStage('idle');
      error('Research Synthesis Failed', err.message || 'Error executing retrieval pipeline.');
    },
  });

  const handleSendMessage = (text: string) => {
    if (queryMutation.isPending) return;
    queryMutation.mutate(text);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden select-none">
      {/* LEFT COLUMN: Document Selection */}
      {leftOpen && (
        <div className="w-64 lg:w-72 h-full shrink-0 animate-in slide-in-from-left duration-200">
          <DocumentSelector documents={documents} collections={collections} />
        </div>
      )}

      {/* CENTER COLUMN: Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-background relative">
        {/* Workspace Top Action Bar */}
        <div className="h-10 px-4 border-b border-surface-border bg-card/60 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLeftOpen(!leftOpen)}
              className="p-1 rounded text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
              title={leftOpen ? 'Hide Documents Panel' : 'Show Documents Panel'}
            >
              {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <span className="text-[11px] text-surface-muted font-medium">
              Grounding in <strong className="text-foreground">{selectedDocumentIds.length}</strong> papers
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/settings"
              className="px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all hover:opacity-80 flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20"
              title="Click to configure Gemini API Key in Settings"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Configure AI Key</span>
            </a>

            <button
              onClick={handleClearChat}
              className="p-1 rounded text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors text-[11px] flex items-center gap-1"
              title="Clear Conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setRightOpen(!rightOpen)}
              className="p-1 rounded text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
              title={rightOpen ? 'Hide Evidence Panel' : 'Show Evidence Panel'}
            >
              {rightOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto text-surface-muted">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary-400 flex items-center justify-center mb-3 border border-primary/20">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Evidence-Grounded Research</h3>
              <p className="text-xs leading-relaxed mt-1 mb-4">
                Ask multi-paper questions, compare methodologies, and trace answers back to physical PDF page citations.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-border/40 pb-6">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  showTelemetry={customization.showTelemetry}
                  showCitations={customization.showCitations}
                  onRegenerate={() => {
                    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                    if (lastUser) handleSendMessage(lastUser.content);
                  }}
                  onOpenSources={() => setRightOpen(true)}
                />
              ))}

              {/* Multistage Progress indicator */}
              {queryMutation.isPending && (
                <div className="max-w-4xl mx-auto px-6">
                  <ProgressIndicator stage={currentStage} />
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          )}
        </div>

        {/* Customization Toolbar: format style pills & display options */}
        <ResultCustomizer
          customization={customization}
          onChange={handleCustomizationChange}
        />

        {/* Bottom Chat Input */}
        <ChatInput onSubmit={handleSendMessage} isLoading={queryMutation.isPending} />
      </div>

      {/* RIGHT COLUMN: Sources & Evidence Panel */}
      {rightOpen && (
        <div className="w-72 lg:w-80 h-full shrink-0 animate-in slide-in-from-right duration-200">
          <SourcesPanel sources={activeSources} onCloseMobile={() => setRightOpen(false)} />
        </div>
      )}
    </div>
  );
};
