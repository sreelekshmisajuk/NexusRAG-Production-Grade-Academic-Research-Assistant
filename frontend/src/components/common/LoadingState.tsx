import React from 'react';

interface LoadingStateProps {
  message?: string;
  rows?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading research data...',
  rows = 4,
}) => {
  return (
    <div className="w-full space-y-4 py-8 px-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-surface-muted">{message}</p>
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 w-full rounded-lg bg-surface-elevated border border-surface-border/50"
            style={{ opacity: 1 - i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
};
