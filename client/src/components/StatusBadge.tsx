import React from 'react';
import type { HealthStatus } from '../types';

interface StatusBadgeProps {
  status: HealthStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const statusStyles: Record<HealthStatus, { bg: string; dot: string; text: string; label: string }> = {
    healthy: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      dot: 'bg-emerald-400',
      text: 'Backend Ready',
      label: 'Server Online',
    },
    checking: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      dot: 'bg-amber-400 animate-pulse',
      text: 'Checking Backend...',
      label: 'Connecting',
    },
    unreachable: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      dot: 'bg-rose-400',
      text: 'Backend Standby',
      label: 'Offline',
    },
  };

  const current = statusStyles[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${current.bg}`}>
      <span className={`w-2 h-2 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </div>
  );
};
