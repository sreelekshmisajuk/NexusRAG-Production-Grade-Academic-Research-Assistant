import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendPositive?: boolean;
  icon: LucideIcon;
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtitle,
  trend,
  trendPositive = true,
  icon: Icon,
  badge,
}) => {
  return (
    <div className="p-4 rounded-xl border border-surface-border bg-card shadow-subtle flex flex-col justify-between transition-all hover:border-surface-border/80">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-surface-muted truncate">{label}</span>
        <div className="w-7 h-7 rounded-lg bg-surface-elevated flex items-center justify-center text-primary-400 border border-surface-border shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <h3 className="text-2xl font-bold font-mono text-foreground tracking-tight">{value}</h3>
        {trend && (
          <span
            className={`text-[11px] font-mono font-medium ${
              trendPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend}
          </span>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="flex items-center justify-between text-[11px] text-surface-muted mt-2 pt-2 border-t border-surface-border/50">
          <span className="truncate">{subtitle}</span>
          {badge && (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface-elevated font-semibold">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
