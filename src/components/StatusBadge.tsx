import { cn } from '@/lib/utils';
import type { InstanceStatus } from '@/types/instance';

interface StatusBadgeProps {
  status: InstanceStatus;
}

const statusConfig: Record<InstanceStatus, { label: string; className: string; dotClassName: string }> = {
  connected: {
    label: 'ONLINE',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    dotClassName: 'bg-green-500',
  },
  disconnected: {
    label: 'OFFLINE',
    className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dotClassName: 'bg-slate-400',
  },
  error: {
    label: 'ERRO',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    dotClassName: 'bg-red-500',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider',
        config.className
      )}
    >
      <span className="relative flex h-2 w-2">
        {status === 'connected' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        )}
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dotClassName)}></span>
      </span>
      {config.label}
    </span>
  );
}