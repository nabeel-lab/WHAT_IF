'use client';

import { CheckCircle2, Circle } from 'lucide-react';

interface EvidenceStateBadgeProps {
  label: string;
  description: string;
  active: boolean;
}

export default function EvidenceStateBadge({
  label,
  description,
  active,
}: EvidenceStateBadgeProps) {
  return (
    <div className={`
      flex items-start gap-3 p-3 rounded-xl
      transition-all duration-300
      ${active
        ? 'bg-emerald-950/30 border border-emerald-700/30'
        : 'bg-slate-800/30 border border-slate-700/30'}
    `}>
      <div className="flex-shrink-0 mt-0.5">
        {active ? (
          <div className="
            w-5 h-5 rounded-full
            bg-emerald-500/20 border-2 border-emerald-400
            flex items-center justify-center
          ">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
          </div>
        ) : (
          <div className="
            w-5 h-5 rounded-full
            bg-slate-800/50 border-2 border-slate-600
          " />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`
          font-semibold text-sm tracking-wide
          ${active ? 'text-slate-100' : 'text-slate-400'}
        `}>
          {label}
        </div>
        <div className={`
          text-xs mt-0.5 leading-relaxed
          ${active ? 'text-slate-300' : 'text-slate-500'}
        `}>
          {description}
        </div>
      </div>
    </div>
  );
}
