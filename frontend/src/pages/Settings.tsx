import React from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import {
  Settings as SettingsIcon,
  Cpu,
  Sliders,
  SlidersHorizontal,
  Palette,
  Check,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, updateSettings, theme, setTheme } = useApp();
  const { success, error: toastError } = useToast();

  const [apiStatus, setApiStatus] = React.useState<{
    has_gemini_key: boolean;
    has_openai_key: boolean;
    has_groq_key: boolean;
    masked_gemini_key: string;
    is_live_ai_active: boolean;
    llm_provider: string;
  } | null>(null);

  const [geminiKeyInput, setGeminiKeyInput] = React.useState('');
  const [isSavingKey, setIsSavingKey] = React.useState(false);

  const fetchApiStatus = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings');
      if (res.ok) {
        const data = await res.json();
        setApiStatus(data);
      }
    } catch {
      // Backend may be starting
    }
  };

  React.useEffect(() => {
    fetchApiStatus();
  }, []);

  const handleSaveApiKey = async () => {
    if (!geminiKeyInput.trim()) {
      toastError('Key Required', 'Please paste a valid API key.');
      return;
    }
    setIsSavingKey(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemini_api_key: geminiKeyInput.trim(),
          llm_provider: 'gemini',
        }),
      });
      if (res.ok) {
        success('AI Key Activated', 'Google Gemini is now connected and ready to synthesize research!');
        setGeminiKeyInput('');
        fetchApiStatus();
      } else {
        toastError('Save Failed', 'Could not persist API key to backend.');
      }
    } catch (err: any) {
      toastError('Connection Error', err?.message || 'Failed to connect to backend.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleSave = () => {
    success('Settings Updated', 'Your system preferences have been persisted.');
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          System & Retrieval Settings
        </h1>
        <p className="text-sm text-surface-muted mt-1">
          Configure model providers, hybrid search parameters, rerankers, and interface preferences
        </p>
      </div>

      {/* SECTION 0: AI Brain & API Keys */}
      <div className="p-6 rounded-2xl border border-primary/30 bg-card/90 shadow-subtle space-y-5">
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="w-4 h-4 text-primary-400" />
            <span>AI Brain & API Key Configuration</span>
          </div>
          {apiStatus?.is_live_ai_active ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live AI Chatbot Active (Gemini)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Offline Fallback Mode (No Key Set)
            </span>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs text-surface-muted leading-relaxed">
            To enable conversational answers like <strong className="text-foreground">ChatGPT, Gemini, or Claude</strong>, paste your free Google Gemini API key below. Once saved, the assistant immediately synthesizes research, explains complex papers, and provides conversational answers.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="password"
              placeholder={apiStatus?.has_gemini_key ? `Active Key: ${apiStatus.masked_gemini_key} (Paste new key to replace)` : "Paste Gemini API Key here (starts with AIzaSy...)"}
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              className="flex-1 bg-surface-elevated border border-surface-border rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-surface-muted/60 focus:outline-none focus:border-primary font-mono"
            />
            <button
              onClick={handleSaveApiKey}
              disabled={isSavingKey || !geminiKeyInput.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {isSavingKey ? 'Saving...' : 'Save & Activate Key'}
            </button>
          </div>

          <div className="text-[11px] text-surface-muted flex items-center gap-1">
            <span>Don't have a key? Get a free API key in 30 seconds at</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-primary-400 hover:underline font-medium"
            >
              Google AI Studio ↗
            </a>
          </div>
        </div>
      </div>

      {/* SECTION 1: Model Settings */}
      <div className="p-6 rounded-2xl border border-surface-border bg-card shadow-subtle space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-surface-border pb-3">
          <Cpu className="w-4 h-4 text-primary-400" />
          <span>Model & Inference Configuration</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* LLM Provider */}
          <div className="space-y-1.5">
            <label className="text-surface-muted font-medium">LLM Provider</label>
            <select
              value={settings.llmProvider}
              onChange={(e) => updateSettings({ llmProvider: e.target.value as any })}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="openai">OpenAI (GPT-4o mini / GPT-4o)</option>
              <option value="groq">Groq (Llama-3.3-70b High Speed)</option>
              <option value="ollama">Ollama (Local Offline LLM)</option>
            </select>
          </div>

          {/* Embedding Model */}
          <div className="space-y-1.5">
            <label className="text-surface-muted font-medium">Embedding Model</label>
            <select
              value={settings.embeddingModel}
              onChange={(e) => updateSettings({ embeddingModel: e.target.value })}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono text-[11px]"
            >
              <option value="sentence-transformers/all-MiniLM-L6-v2">
                sentence-transformers/all-MiniLM-L6-v2 (Default Fast)
              </option>
              <option value="BAAI/bge-base-en-v1.5">BAAI/bge-base-en-v1.5 (High Quality)</option>
              <option value="BAAI/bge-small-en-v1.5">BAAI/bge-small-en-v1.5</option>
              <option value="text-embedding-3-small">OpenAI text-embedding-3-small</option>
            </select>
          </div>

          {/* Reranker Model */}
          <div className="space-y-1.5">
            <label className="text-surface-muted font-medium">Cross-Encoder Reranker</label>
            <select
              value={settings.rerankerModel}
              onChange={(e) => updateSettings({ rerankerModel: e.target.value })}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono text-[11px]"
            >
              <option value="ms-marco-MiniLM-L-6-v2">
                ms-marco-MiniLM-L-6-v2 (ONNX Local High Speed)
              </option>
              <option value="BAAI/bge-reranker-base">BAAI/bge-reranker-base (Accurate)</option>
              <option value="flashrank-TinyBERT-L-2-v2">flashrank-TinyBERT-L-2-v2 (Ultra Light)</option>
            </select>
          </div>

          {/* Embedding Device */}
          <div className="space-y-1.5">
            <label className="text-surface-muted font-medium">Embedding Compute Device</label>
            <select
              value={settings.embeddingDevice}
              onChange={(e) => updateSettings({ embeddingDevice: e.target.value as any })}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono"
            >
              <option value="cpu">CPU (Standard PyTorch / ONNX)</option>
              <option value="cuda">CUDA (NVIDIA GPU Acceleration)</option>
              <option value="mps">MPS (Apple Silicon Metal)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: Retrieval Settings */}
      <div className="p-6 rounded-2xl border border-surface-border bg-card shadow-subtle space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-surface-border pb-3">
          <Sliders className="w-4 h-4 text-cyan-accent" />
          <span>Hybrid Retrieval & Indexing Parameters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Retrieval Strategy */}
          <div className="space-y-1.5">
            <label className="text-surface-muted font-medium">Retrieval Strategy</label>
            <select
              value={settings.retrievalStrategy}
              onChange={(e) => updateSettings({ retrievalStrategy: e.target.value as any })}
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-semibold"
            >
              <option value="hybrid">Hybrid Search (Dense + BM25 RRF)</option>
              <option value="semantic">Semantic Only (Dense Qdrant)</option>
              <option value="bm25">Lexical Only (Sparse BM25)</option>
            </select>
          </div>

          {/* Top K */}
          <div className="space-y-1.5">
            <label className="text-surface-muted font-medium">
              Top K Initial Retrieval: <span className="font-mono text-primary-400 font-bold">{settings.topK}</span>
            </label>
            <input
              type="range"
              min="5"
              max="30"
              value={settings.topK}
              onChange={(e) => updateSettings({ topK: parseInt(e.target.value, 10) })}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          {/* Rerank Top K */}
          <div className="space-y-1.5">
            <label className="text-surface-muted font-medium">
              Rerank Top K Context: <span className="font-mono text-primary-400 font-bold">{settings.rerankTopK}</span>
            </label>
            <input
              type="range"
              min="2"
              max="15"
              value={settings.rerankTopK}
              onChange={(e) => updateSettings({ rerankTopK: parseInt(e.target.value, 10) })}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Weights Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-surface-border text-xs">
          <div className="space-y-1.5">
            <div className="flex justify-between text-surface-muted font-medium">
              <span>Semantic Search Weight</span>
              <span className="font-mono text-primary-400 font-bold">{settings.semanticWeight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={settings.semanticWeight}
              onChange={(e) => {
                const s = parseInt(e.target.value, 10);
                updateSettings({ semanticWeight: s, bm25Weight: 100 - s });
              }}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-surface-muted font-medium">
              <span>Lexical BM25 Weight</span>
              <span className="font-mono text-cyan-glow font-bold">{settings.bm25Weight}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={settings.bm25Weight}
              onChange={(e) => {
                const b = parseInt(e.target.value, 10);
                updateSettings({ bm25Weight: b, semanticWeight: 100 - b });
              }}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* Pipeline Flags from prompt */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-surface-border text-xs">
          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-surface-border bg-surface-elevated/40 cursor-pointer hover:bg-surface-elevated">
            <input
              type="checkbox"
              checked={settings.enableQueryRewriting}
              onChange={(e) => updateSettings({ enableQueryRewriting: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
            <div>
              <span className="font-medium text-foreground block">Query Rewriting & HyDE</span>
              <span className="text-[10px] text-surface-muted">
                Expands research questions into hypothetical document embeddings
              </span>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-surface-border bg-surface-elevated/40 cursor-pointer hover:bg-surface-elevated">
            <input
              type="checkbox"
              checked={settings.enableReranking}
              onChange={(e) => updateSettings({ enableReranking: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
            <div>
              <span className="font-medium text-foreground block">Cross-Encoder Reranking</span>
              <span className="text-[10px] text-surface-muted">
                Performs joint attention to score top candidates before synthesis
              </span>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-surface-border bg-surface-elevated/40 cursor-pointer hover:bg-surface-elevated">
            <input
              type="checkbox"
              checked={settings.enableCitationVerification}
              onChange={(e) => updateSettings({ enableCitationVerification: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
            <div>
              <span className="font-medium text-foreground block">Citation Verification</span>
              <span className="text-[10px] text-surface-muted">
                Validates physical text quotes against original PDF passages
              </span>
            </div>
          </label>

          <label className="flex items-center gap-2 p-2.5 rounded-lg border border-surface-border bg-surface-elevated/40 cursor-pointer hover:bg-surface-elevated">
            <input
              type="checkbox"
              checked={settings.enableHallucinationDetection}
              onChange={(e) => updateSettings({ enableHallucinationDetection: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
            <div>
              <span className="font-medium text-foreground block">Hallucination Guardrail</span>
              <span className="text-[10px] text-surface-muted">
                Audits statement claims to flag unsupported assertions
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* SECTION 3: Interface Settings */}
      <div className="p-6 rounded-2xl border border-surface-border bg-card shadow-subtle space-y-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-surface-border pb-3">
          <Palette className="w-4 h-4 text-purple-400" />
          <span>Interface & Theme Settings</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Theme selection from prompt: Light, Dark, System */}
          <div className="space-y-2">
            <label className="text-surface-muted font-medium block">Workspace Theme</label>
            <div className="flex items-center gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs capitalize transition-all ${
                    theme === t
                      ? 'border-primary bg-primary/10 text-primary-400 font-semibold shadow-xs'
                      : 'border-surface-border bg-surface-elevated text-surface-muted hover:text-foreground'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Mode */}
          <div className="space-y-2">
            <label className="text-surface-muted font-medium block">Compact Mode</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateSettings({ compactMode: false })}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs transition-all ${
                  !settings.compactMode
                    ? 'border-primary bg-primary/10 text-primary-400 font-semibold shadow-xs'
                    : 'border-surface-border bg-surface-elevated text-surface-muted hover:text-foreground'
                }`}
              >
                Off (Default)
              </button>
              <button
                onClick={() => updateSettings({ compactMode: true })}
                className={`flex-1 py-2 px-3 rounded-lg border text-xs transition-all ${
                  settings.compactMode
                    ? 'border-primary bg-primary/10 text-primary-400 font-semibold shadow-xs'
                    : 'border-surface-border bg-surface-elevated text-surface-muted hover:text-foreground'
                }`}
              >
                On (Dense)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-subtle transition-all flex items-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );
};
