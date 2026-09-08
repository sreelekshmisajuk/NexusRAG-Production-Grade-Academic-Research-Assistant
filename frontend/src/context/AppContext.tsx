import React, { createContext, useContext, useState, useEffect } from 'react';
import { Citation } from '../types/research';
import { SystemSettings, defaultSettings } from '../types/settings';
import { UserProfile } from '../types/profile';

interface AppContextValue {
  selectedDocumentIds: string[];
  setSelectedDocumentIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleDocumentSelection: (id: string) => void;
  selectAllDocuments: (allIds?: string[]) => void;
  clearDocumentSelection: () => void;

  activeCitation: Citation | null;
  setActiveCitation: (c: Citation | null) => void;

  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;

  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;

  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;

  // Profile Management
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  setActiveProfileId: (id: string) => void;
  createProfile: (data: Omit<UserProfile, 'id' | 'createdAt'>) => UserProfile;
  updateProfile: (id: string, updates: Partial<UserProfile>) => void;
  deleteProfile: (id: string) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  editingProfile: UserProfile | null;
  setEditingProfile: (profile: UserProfile | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('rag_assistant_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const savedTheme = localStorage.getItem('rag_assistant_theme');
      return (savedTheme as 'light' | 'dark' | 'system') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  // User Profiles State - completely empty by default, no dummy profiles!
  const [profiles, setProfiles] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('rag_user_profiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any legacy dummy profile
          const cleaned = parsed.filter(
            (p) => p.email !== 'researcher@local.ai' && p.name !== 'Lead Researcher'
          );
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rag_active_profile_id') || null;
    } catch {
      return null;
    }
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  // When user enters and has no profile created, prompt them to create one immediately
  useEffect(() => {
    if (profiles.length === 0) {
      setIsProfileModalOpen(true);
    } else if (!activeProfileId || !profiles.some((p) => p.id === activeProfileId)) {
      const fallbackId = profiles[0].id;
      setActiveProfileIdState(fallbackId);
      try {
        localStorage.setItem('rag_active_profile_id', fallbackId);
      } catch {
        // ignore
      }
    }
  }, [profiles, activeProfileId]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || (profiles.length > 0 ? profiles[0] : null);

  const setActiveProfileId = (id: string) => {
    setActiveProfileIdState(id);
    try {
      localStorage.setItem('rag_active_profile_id', id);
    } catch {
      // ignore
    }
  };

  const createProfile = (data: Omit<UserProfile, 'id' | 'createdAt'>): UserProfile => {
    const newProfile: UserProfile = {
      ...data,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...profiles, newProfile];
    setProfiles(updated);
    setActiveProfileId(newProfile.id);
    try {
      localStorage.setItem('rag_user_profiles', JSON.stringify(updated));
      localStorage.setItem('rag_active_profile_id', newProfile.id);
    } catch {
      // ignore
    }
    setIsProfileModalOpen(false);
    return newProfile;
  };

  const updateProfile = (id: string, updates: Partial<UserProfile>) => {
    const updated = profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setProfiles(updated);
    try {
      localStorage.setItem('rag_user_profiles', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setEditingProfile(null);
    setIsProfileModalOpen(false);
  };

  const deleteProfile = (id: string) => {
    const updated = profiles.filter((p) => p.id !== id);
    setProfiles(updated);
    try {
      localStorage.setItem('rag_user_profiles', JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (activeProfileId === id) {
      if (updated.length > 0) {
        setActiveProfileId(updated[0].id);
      } else {
        setActiveProfileIdState(null);
        try {
          localStorage.removeItem('rag_active_profile_id');
        } catch {
          // ignore
        }
        setIsProfileModalOpen(true);
      }
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('rag_assistant_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('rag_assistant_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const toggleDocumentSelection = (id: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllDocuments = (allIds?: string[]) => {
    if (allIds && allIds.length > 0) {
      setSelectedDocumentIds(allIds);
    }
  };

  const clearDocumentSelection = () => {
    setSelectedDocumentIds([]);
  };

  return (
    <AppContext.Provider
      value={{
        selectedDocumentIds,
        setSelectedDocumentIds,
        toggleDocumentSelection,
        selectAllDocuments,
        clearDocumentSelection,
        activeCitation,
        setActiveCitation,
        isUploadModalOpen,
        setIsUploadModalOpen,
        settings,
        updateSettings,
        theme,
        setTheme,
        globalSearchQuery,
        setGlobalSearchQuery,
        profiles,
        activeProfile,
        setActiveProfileId,
        createProfile,
        updateProfile,
        deleteProfile,
        isProfileModalOpen,
        setIsProfileModalOpen,
        editingProfile,
        setEditingProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
