import { cn } from '@/lib/utils';
import type { InstanceStatus } from '@/types/instance';

interface StatusBadgeProps {
  status: InstanceStatus;
}

const statusConfig: Record<InstanceStatus, { label: string; className: string }> = {
  connected: {
    label: 'Connected',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  disconnected: {
    label: 'Disconnected',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  error: {
    label: 'Error',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'connected' && 'bg-green-500',
          status === 'disconnected' && 'bg-red-500',
          status === 'error' && 'bg-amber-500'
        )}
      />
      {config.label}
    </span>
  );
}
