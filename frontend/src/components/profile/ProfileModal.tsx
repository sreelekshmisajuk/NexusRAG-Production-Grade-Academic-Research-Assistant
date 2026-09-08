import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { AVATAR_GRADIENTS, SUGGESTED_ROLES } from '../../types/profile';
import { User, Mail, Briefcase, Building2, Palette, Sparkles, X, Check } from 'lucide-react';

export const ProfileModal: React.FC = () => {
  const {
    isProfileModalOpen,
    setIsProfileModalOpen,
    profiles,
    createProfile,
    updateProfile,
    editingProfile,
    setEditingProfile,
  } = useApp();

  const { success, error } = useToast();

  const isFirstTime = profiles.length === 0;
  const isEditing = !!editingProfile;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(SUGGESTED_ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [institution, setInstitution] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(AVATAR_GRADIENTS[0].class);

  useEffect(() => {
    if (editingProfile) {
      setName(editingProfile.name);
      setEmail(editingProfile.email);
      if (SUGGESTED_ROLES.includes(editingProfile.role)) {
        setRole(editingProfile.role);
        setCustomRole('');
      } else {
        setRole('Other');
        setCustomRole(editingProfile.role);
      }
      setInstitution(editingProfile.institution || '');
      setSelectedGradient(editingProfile.avatarGradient || AVATAR_GRADIENTS[0].class);
    } else {
      // Reset form for creation
      setName('');
      setEmail('');
      setRole(SUGGESTED_ROLES[0]);
      setCustomRole('');
      setInstitution('');
      // Cycle initial gradient based on profiles count
      const nextGrad = AVATAR_GRADIENTS[profiles.length % AVATAR_GRADIENTS.length].class;
      setSelectedGradient(nextGrad);
    }
  }, [editingProfile, isProfileModalOpen, profiles.length]);

  if (!isProfileModalOpen) return null;

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'R';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Name Required', 'Please enter your researcher name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      error('Valid Email Required', 'Please provide a valid email address.');
      return;
    }

    const effectiveRole = role === 'Other' ? (customRole.trim() || 'Researcher') : role;

    if (isEditing && editingProfile) {
      updateProfile(editingProfile.id, {
        name: name.trim(),
        email: email.trim(),
        role: effectiveRole,
        institution: institution.trim() || undefined,
        avatarGradient: selectedGradient,
      });
      success('Profile Updated', `Profile for "${name.trim()}" was updated.`);
    } else {
      createProfile({
        name: name.trim(),
        email: email.trim(),
        role: effectiveRole,
        institution: institution.trim() || undefined,
        avatarGradient: selectedGradient,
      });
      success('Profile Created', `Welcome to NexusRAG, ${name.trim()}!`);
    }

    handleClose();
  };

  const handleClose = () => {
    if (isFirstTime && profiles.length === 0) {
      // Cannot dismiss modal if no profile exists
      return;
    }
    setEditingProfile(null);
    setIsProfileModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Ribbon */}
        <div className="px-6 py-5 border-b border-surface-border bg-gradient-to-r from-primary-950/40 via-card to-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary-400 shadow-glow-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight">
                {isEditing
                  ? 'Edit Researcher Profile'
                  : isFirstTime
                  ? 'Welcome to NexusRAG — Create Your Profile'
                  : 'Create New Researcher Profile'}
              </h2>
              <p className="text-xs text-surface-muted">
                {isFirstTime
                  ? 'Please set up your profile to enter your research workspace.'
                  : 'Manage identity, affiliations, and provenance attribution.'}
              </p>
            </div>
          </div>

          {!isFirstTime && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-surface-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Live Avatar Preview & Palette Picker */}
          <div className="p-4 rounded-xl bg-surface-elevated/40 border border-surface-border flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedGradient} flex items-center justify-center text-lg font-bold text-white shadow-lg shrink-0 transition-all duration-200`}
            >
              {getInitials(name || 'Researcher')}
            </div>

            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-primary-400" />
                Choose Avatar Palette
              </label>
              <div className="flex items-center gap-2">
                {AVATAR_GRADIENTS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGradient(g.class)}
                    className={`w-7 h-7 rounded-lg bg-gradient-to-br ${g.class} flex items-center justify-center transition-all hover:scale-110 ${
                      selectedGradient === g.class
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-card shadow-md scale-105'
                        : 'opacity-80 hover:opacity-100'
                    }`}
                    title={g.name}
                  >
                    {selectedGradient === g.class && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary-400" />
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dr. Alex Rivera or Sarah Chen"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-slate-950 transition-all shadow-inner"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary-400" />
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., alex.rivera@university.edu"
              className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-slate-950 transition-all shadow-inner"
            />
          </div>

          {/* Role & Custom Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-primary-400" />
                Academic Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all cursor-pointer shadow-inner"
              >
                {SUGGESTED_ROLES.map((r) => (
                  <option key={r} value={r} className="bg-slate-900 text-white py-1">
                    {r}
                  </option>
                ))}
                <option value="Other" className="bg-slate-900 text-white py-1">
                  Other / Custom...
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary-400" />
                Institution / Lab
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g., MIT CSAIL or Independent"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-slate-950 transition-all shadow-inner"
              />
            </div>
          </div>

          {role === 'Other' && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Custom Role Title
              </label>
              <input
                type="text"
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                placeholder="e.g., Senior Research Analyst, Systems Biologist"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary focus:bg-slate-950 transition-all shadow-inner"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-2.5">
            {!isFirstTime && (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-medium text-surface-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg shadow-glow-primary transition-all duration-150 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Save Changes' : isFirstTime ? 'Create Profile & Enter' : 'Create Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
