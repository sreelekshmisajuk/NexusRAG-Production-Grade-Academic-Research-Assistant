import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 md:p-12 border border-dashed border-surface-border rounded-xl bg-card/40 my-6">
      <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center text-primary-400 mb-4 shadow-subtle border border-surface-border">
        {icon || <FileQuestion className="w-6 h-6 text-surface-muted" />}
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="text-sm text-surface-muted max-w-md mt-1.5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover shadow-subtle transition-all duration-150"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
