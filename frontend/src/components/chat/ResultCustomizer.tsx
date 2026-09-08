import React, { useState } from 'react';
import {
  ResultCustomization,
  ResponseStyle,
  DetailLevel,
} from '../../types/research';
import {
  Zap,
  ListOrdered,
  Table as TableIcon,
  BookOpenCheck,
  FileText,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

interface ResultCustomizerProps {
  customization: ResultCustomization;
  onChange: (newConfig: ResultCustomization) => void;
}

const STYLE_OPTIONS: Array<{
  id: ResponseStyle;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: 'direct',
    label: 'Direct Answer',
    icon: Zap,
    description: 'Straight to the point. Answers only what was asked with zero filler.',
  },
  {
    id: 'bullets',
    label: 'Key Bullets',
    icon: ListOrdered,
    description: 'Structured bullet points capturing essential findings and facts.',
  },
  {
    id: 'table',
    label: 'Comparison Table',
    icon: TableIcon,
    description: 'Clean Markdown table comparing methods, architectures, or findings.',
  },
  {
    id: 'executive',
    label: 'Executive Summary',
    icon: FileText,
    description: 'High-level synthesis with 3 core takeaway bullet points.',
  },
  {
    id: 'detailed',
    label: 'In-Depth Analysis',
    icon: BookOpenCheck,
    description: 'Comprehensive academic breakdown covering full methodologies.',
  },
];

export const ResultCustomizer: React.FC<ResultCustomizerProps> = ({
  customization,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleStyleChange = (style: ResponseStyle) => {
    onChange({
      ...customization,
      style,
      // Auto-set optimal detail level
      detailLevel: style === 'direct' ? 'concise' : style === 'detailed' ? 'comprehensive' : customization.detailLevel,
    });
  };

  const handleDetailChange = (detailLevel: DetailLevel) => {
    onChange({ ...customization, detailLevel });
  };

  const currentStyleObj = STYLE_OPTIONS.find((s) => s.id === customization.style) || STYLE_OPTIONS[0];

  return (
    <div className="relative select-none">
      {/* Quick Access Toolbar Bar */}
      <div className="px-3 py-1.5 flex items-center justify-between gap-2 border-b border-surface-border/50 bg-card/40 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[10px] uppercase font-semibold text-surface-muted font-mono tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-accent" />
            Result Style:
          </span>

          {STYLE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = customization.style === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleStyleChange(opt.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${
                  isSelected
                    ? 'bg-primary text-white shadow-subtle'
                    : 'bg-surface-elevated/60 text-surface-muted hover:text-foreground hover:bg-surface-elevated border border-surface-border/50'
                }`}
                title={opt.description}
              >
                <Icon className="w-3 h-3" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Customize Modal Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
            isOpen
              ? 'bg-primary/10 text-primary-400 border border-primary/30'
              : 'text-surface-muted hover:text-foreground hover:bg-surface-elevated'
          }`}
          title="Configure how results are generated and displayed"
        >
          <Sliders className="w-3 h-3" />
          <span className="hidden sm:inline">Preferences</span>
        </button>
      </div>

      {/* Preferences Popover */}
      {isOpen && (
        <div className="absolute bottom-full right-4 mb-2 w-80 sm:w-96 rounded-xl border border-surface-border bg-card p-4 shadow-elevated z-30 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
            <div>
              <h4 className="text-xs font-bold text-foreground">Result Customization</h4>
              <p className="text-[10px] text-surface-muted">
                Control answer formatting, length, and detail exposure
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-primary-400 hover:text-primary-300 font-medium"
            >
              Done
            </button>
          </div>

          {/* Style Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground block">
              Format & Structure
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {STYLE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = customization.style === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleStyleChange(opt.id)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-surface-border bg-surface-elevated/40 text-surface-muted hover:bg-surface-elevated hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary-400' : ''}`} />
                      <div>
                        <span className="text-xs font-medium block leading-tight">{opt.label}</span>
                        <span className="text-[10px] text-surface-muted block leading-tight">
                          {opt.description}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail / Length Selector */}
          <div className="space-y-1.5 pt-2 border-t border-surface-border">
            <label className="text-[11px] font-semibold text-foreground block">
              Conciseness & Length
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {(['concise', 'standard', 'comprehensive'] as DetailLevel[]).map((level) => {
                const isSelected = customization.detailLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleDetailChange(level)}
                    className={`py-1.5 px-2 rounded-lg border text-center capitalize text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-subtle'
                        : 'border-surface-border bg-surface-elevated/60 text-surface-muted hover:text-foreground'
                    }`}
                  >
                    {level === 'concise' ? '⚡ Concise' : level === 'standard' ? '⚖️ Standard' : '🔬 Detailed'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="space-y-2 pt-2 border-t border-surface-border text-xs">
            <label className="text-[11px] font-semibold text-foreground block">
              Information Visibility
            </label>

            {/* Toggle Telemetry (Default False: Hides unwanted debug metrics) */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/40 border border-surface-border">
              <div className="pr-2">
                <span className="text-xs font-medium text-foreground block">
                  Show Retrieval Telemetry
                </span>
                <span className="text-[10px] text-surface-muted block">
                  Display BM25/Vector similarity scores and execution latencies
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...customization, showTelemetry: !customization.showTelemetry })
                }
                className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 ${
                  customization.showTelemetry ? 'bg-primary' : 'bg-surface-border'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    customization.showTelemetry ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle Citations */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/40 border border-surface-border">
              <div className="pr-2">
                <span className="text-xs font-medium text-foreground block">
                  Interactive Page Citations
                </span>
                <span className="text-[10px] text-surface-muted block">
                  Show clickable [1] citations linked to physical PDF pages
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({ ...customization, showCitations: !customization.showCitations })
                }
                className={`w-9 h-5 rounded-full p-0.5 transition-colors relative shrink-0 ${
                  customization.showCitations ? 'bg-primary' : 'bg-surface-border'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    customization.showCitations ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
