
import React from 'react';
import { Shield, Lock, UserCheck, Clock } from 'lucide-react';

interface StatusBadgeProps {
  type: 'ROOT' | 'SUPER' | 'CLUB_ADMIN' | 'PENDING';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, label }) => {
  const configs = {
    ROOT: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <Lock size={10} />,
      defaultLabel: 'ROOT'
    },
    SUPER: {
      bg: 'bg-brand-100',
      text: 'text-brand-700',
      border: 'border-brand-200',
      icon: <Shield size={10} />,
      defaultLabel: 'מנהל על'
    },
    CLUB_ADMIN: {
      bg: 'bg-sky-100',
      text: 'text-sky-700',
      border: 'border-sky-200',
      icon: <UserCheck size={10} />,
      defaultLabel: 'מנהל חוג'
    },
    PENDING: {
      bg: 'bg-slate-100 animate-pulse',
      text: 'text-slate-500',
      border: 'border-slate-200',
      icon: <Clock size={10} />,
      defaultLabel: 'ממתין לרישום'
    }
  };

  const config = configs[type];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
      {config.icon}
      <span>{label || config.defaultLabel}</span>
    </span>
  );
};
