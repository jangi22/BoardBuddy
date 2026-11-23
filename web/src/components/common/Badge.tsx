import React from 'react';
import { VerificationStatus } from '../../types';

interface BadgeProps {
  status?: VerificationStatus | string;
  variant?: 'purple' | 'green' | 'amber' | 'rose' | 'slate' | 'blue';
  children?: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<{ status: VerificationStatus | string; className?: string }> = ({ status, className = '' }) => {
  const norm = String(status || '').replace(/\s+/g, '_').toUpperCase();
  switch (norm) {
    case 'APPROVED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Approved
        </span>
      );
    case 'PENDING':
    case 'PENDING_VERIFICATION':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Pending Verification
        </span>
      );
    case 'NEEDS_CLEARER_COPY':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          Needs Clearer Copy
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Rejected
        </span>
      );
    case 'SUSPENDED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
          Suspended
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
          {status}
        </span>
      );
  }
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'purple', children, className = '' }) => {
  const styles = {
    purple: 'bg-[#6847E8]/10 text-[#6847E8] border-[#6847E8]/20',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
};
