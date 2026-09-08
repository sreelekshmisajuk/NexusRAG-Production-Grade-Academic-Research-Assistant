import React from 'react';
import { ProcessingStatus } from '../../types/document';
import { CheckCircle2, Clock, AlertTriangle, FileText } from 'lucide-react';

interface StatusBadgeProps {
  status: ProcessingStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const configs: Record<
    ProcessingStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    Processed: {
      label: 'Processed',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    },
    Processing: {
      label: 'Processing',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      icon: <Clock className={`${size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin`} />,
    },
    Uploaded: {
      label: 'Uploaded',
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/20',
      icon: <FileText className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    },
    Failed: {
      label: 'Failed',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
    },
  };

  const current = configs[status] || configs.Uploaded;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-md border ${
        current.bg
      } ${current.text} ${current.border} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      {current.icon}
      {current.label}
    </span>
  );
};
