export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  institution?: string;
  avatarGradient: string;
  createdAt: string;
}

export const AVATAR_GRADIENTS = [
  { id: 'indigo-purple', name: 'Indigo Nebula', class: 'from-indigo-500 to-purple-600', text: 'text-white' },
  { id: 'cyan-blue', name: 'Cyan Horizon', class: 'from-cyan-500 to-blue-600', text: 'text-white' },
  { id: 'emerald-teal', name: 'Emerald Forest', class: 'from-emerald-500 to-teal-600', text: 'text-white' },
  { id: 'amber-orange', name: 'Amber Glow', class: 'from-amber-500 to-orange-600', text: 'text-white' },
  { id: 'rose-pink', name: 'Cosmic Rose', class: 'from-rose-500 to-pink-600', text: 'text-white' },
  { id: 'violet-fuchsia', name: 'Ultra Violet', class: 'from-violet-500 to-fuchsia-600', text: 'text-white' },
];

export const SUGGESTED_ROLES = [
  'Lead Researcher',
  'Principal Investigator',
  'Postdoctoral Fellow',
  'PhD Candidate',
  'Graduate Student',
  'Research Engineer',
  'Data Scientist',
  'Independent Scholar',
];
