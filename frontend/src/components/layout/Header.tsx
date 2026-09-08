import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Search,
  UploadCloud,
  Moon,
  Sun,
  Menu,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const {
    setIsUploadModalOpen,
    theme,
    setTheme,
    globalSearchQuery,
    setGlobalSearchQuery,
    activeProfile,
    setIsProfileModalOpen,
    setEditingProfile,
  } = useApp();

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getBreadcrumbTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Research Workspace';
    if (path === '/library') return 'Document Library';
    if (path === '/research') return 'Research Chat & Evidence Workspace';
    if (path.startsWith('/documents/')) return 'PDF Research Inspector';
    if (path === '/collections') return 'Document Collections';
    if (path === '/history') return 'Research Sessions & History';
    if (path === '/analytics') return 'RAG Telemetry & Analytics';
    if (path === '/evaluation') return 'RAG Evaluation & Benchmarks';
    if (path === '/verification') return 'Hallucination & Claim Verification';
    if (path === '/settings') return 'System & Retrieval Settings';
    return 'Research Assistant';
  };

  return (
    <header className="h-14 border-b border-surface-border bg-card/80 backdrop-blur px-4 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-1.5 rounded-lg text-surface-muted hover:text-foreground hover:bg-surface-elevated"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            {getBreadcrumbTitle()}
          </h2>
          <p className="text-[11px] text-surface-muted hidden sm:block">
            Evidence-grounded multi-document synthesis
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Global Search Bar */}
        <div className="relative w-48 sm:w-64 md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-muted" />
          <input
            type="text"
            placeholder="Search papers, claims, queries..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            className="w-full bg-surface-elevated/70 border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-surface-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all font-sans"
          />
        </div>

        {/* Upload Action */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary hover:bg-primary-hover text-white shadow-subtle transition-all duration-150 shrink-0"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload PDFs</span>
        </button>

        {/* Active Profile Indicator */}
        {activeProfile ? (
          <button
            onClick={() => {
              setEditingProfile(activeProfile);
              setIsProfileModalOpen(true);
            }}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-lg border border-surface-border bg-surface-elevated/50 hover:bg-surface-elevated text-xs transition-colors shrink-0"
            title={`Active: ${activeProfile.name} (${activeProfile.role}) - Click to edit`}
          >
            <div
              className={`w-6 h-6 rounded-md bg-gradient-to-br ${
                activeProfile.avatarGradient || 'from-indigo-500 to-purple-600'
              } flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0`}
            >
              {getInitials(activeProfile.name)}
            </div>
            <span className="font-medium text-foreground max-w-[100px] truncate hidden md:inline">
              {activeProfile.name}
            </span>
          </button>
        ) : (
          <button
            onClick={() => {
              setEditingProfile(null);
              setIsProfileModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary-300 text-xs font-medium transition-colors shrink-0"
          >
            Create Profile
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg border border-surface-border text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-sky-600" />}
        </button>
      </div>
    </header>
  );
};
