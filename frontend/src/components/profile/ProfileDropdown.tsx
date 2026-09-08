import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import {
  User,
  Plus,
  Edit2,
  Check,
  Trash2,
  ChevronUp,
  Building2,
  Sparkles,
} from 'lucide-react';

export const ProfileDropdown: React.FC = () => {
  const {
    profiles,
    activeProfile,
    setActiveProfileId,
    setIsProfileModalOpen,
    setEditingProfile,
    deleteProfile,
  } = useApp();

  const { success } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSelectProfile = (id: string, name: string) => {
    setActiveProfileId(id);
    setIsOpen(false);
    success('Profile Switched', `Active researcher changed to ${name}.`);
  };

  const handleCreateNew = () => {
    setEditingProfile(null);
    setIsProfileModalOpen(true);
    setIsOpen(false);
  };

  const handleEditCurrent = () => {
    if (activeProfile) {
      setEditingProfile(activeProfile);
      setIsProfileModalOpen(true);
      setIsOpen(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to remove the profile for "${name}"?`)) {
      deleteProfile(id);
      success('Profile Removed', `Profile for "${name}" was deleted.`);
    }
  };

  // If no profile exists yet
  if (!activeProfile) {
    return (
      <div className="p-3 border-t border-surface-border">
        <button
          onClick={handleCreateNew}
          className="w-full py-2 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary-300 border border-primary/30 flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-subtle group"
        >
          <Plus className="w-3.5 h-3.5 transition-transform group-hover:scale-120" />
          <span>Create Researcher Profile</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative p-3 border-t border-surface-border" ref={dropdownRef}>
      {/* Active Profile Pill / Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 -m-0.5 rounded-xl hover:bg-surface-elevated/70 border border-transparent hover:border-surface-border transition-all duration-150 text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl bg-gradient-to-br ${
              activeProfile.avatarGradient || 'from-indigo-500 to-purple-600'
            } flex items-center justify-center text-xs font-bold text-white shadow-md shrink-0 transition-transform group-hover:scale-105`}
          >
            {getInitials(activeProfile.name)}
          </div>
          <div className="truncate min-w-0">
            <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary-300 transition-colors">
              {activeProfile.name}
            </p>
            <p className="text-[10px] text-surface-muted truncate">
              {activeProfile.role || activeProfile.email}
            </p>
          </div>
        </div>

        <ChevronUp
          className={`w-4 h-4 text-surface-muted transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-foreground' : 'group-hover:text-foreground'
          }`}
        />
      </button>

      {/* Upward Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-card border border-surface-border rounded-xl shadow-2xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-surface-border bg-surface-elevated/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <User className="w-3.5 h-3.5 text-primary-400" />
              <span>Researcher Profiles</span>
            </div>
            <span className="text-[10px] font-mono text-surface-muted px-1.5 py-0.5 rounded bg-surface-border">
              {profiles.length} total
            </span>
          </div>

          {/* Profiles List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p.id, p.name)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all group ${
                    isActive
                      ? 'bg-primary/10 border border-primary/25 text-primary-300 font-medium'
                      : 'hover:bg-surface-elevated text-foreground hover:border-surface-border border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${
                        p.avatarGradient || 'from-indigo-500 to-purple-600'
                      } flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-xs`}
                    >
                      {getInitials(p.name)}
                    </div>
                    <div className="truncate min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate">{p.name}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-surface-muted truncate flex items-center gap-1">
                        <span>{p.role}</span>
                        {p.institution && (
                          <>
                            <span>•</span>
                            <span className="truncate">{p.institution}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {isActive ? (
                      <Check className="w-4 h-4 text-primary-400 stroke-[2.5]" />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, p.id, p.name)}
                        className="p-1 rounded text-surface-muted hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Menu */}
          <div className="p-1.5 border-t border-surface-border bg-surface-elevated/20 space-y-0.5">
            <button
              type="button"
              onClick={handleEditCurrent}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-primary-400" />
              <span>Edit Active Profile</span>
            </button>

            <button
              type="button"
              onClick={handleCreateNew}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-primary-400 hover:text-primary-300 hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
