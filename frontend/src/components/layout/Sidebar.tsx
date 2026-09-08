import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  MessageSquareQuote,
  FolderKanban,
  History,
  BarChart3,
  CheckCheck,
  ShieldAlert,
  Settings,
  Sparkles,
  Database,
  Cpu,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProfileDropdown } from '../profile/ProfileDropdown';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { settings } = useApp();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Document Library', path: '/library', icon: BookOpen },
    { name: 'Research Workspace', path: '/research', icon: MessageSquareQuote, badge: 'Active' },
    { name: 'Collections', path: '/collections', icon: FolderKanban },
    { name: 'Research History', path: '/history', icon: History },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'RAG Evaluation', path: '/evaluation', icon: CheckCheck },
    { name: 'Verification & Claims', path: '/verification', icon: ShieldAlert },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 h-screen flex flex-col bg-card border-r border-surface-border select-none shrink-0 transition-all duration-200">
      {/* Brand Header */}
      <div className="p-4 border-b border-surface-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-accent flex items-center justify-center text-white shadow-glow-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground leading-tight">
              RAG Assistant
            </h1>
            <p className="text-[10px] text-surface-muted font-medium uppercase tracking-wider">
              Research Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-surface-muted">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-primary/10 text-primary-400 font-semibold shadow-subtle border border-primary/20'
                    : 'text-surface-muted hover:text-foreground hover:bg-surface-elevated'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold tracking-wider rounded bg-primary/20 text-primary-300">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Active Pipeline Status */}
      <div className="p-3 mx-3 mb-3 rounded-lg bg-surface-elevated/60 border border-surface-border text-[11px] space-y-1.5">
        <div className="flex items-center justify-between text-surface-muted">
          <span className="flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-primary-400" />
            LLM Provider
          </span>
          <span className="font-mono text-[10px] text-foreground font-semibold uppercase">
            {settings.llmProvider}
          </span>
        </div>
        <div className="flex items-center justify-between text-surface-muted">
          <span className="flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-cyan-accent" />
            Vector Engine
          </span>
          <span className="font-mono text-[10px] text-emerald-400 font-medium">
            Qdrant + BM25
          </span>
        </div>
      </div>

      {/* Interactive Researcher Profile Dropdown & Switcher */}
      <ProfileDropdown />
    </aside>
  );
};
