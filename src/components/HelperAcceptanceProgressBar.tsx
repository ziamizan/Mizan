import React from 'react';
import { Users, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { HelpRequest, HelperAcceptance } from '../types';

interface HelperAcceptanceProgressBarProps {
  request: HelpRequest;
  acceptances?: HelperAcceptance[];
  className?: string;
  compact?: boolean;
}

export function HelperAcceptanceProgressBar({
  request,
  acceptances = [],
  className,
  compact = false,
}: HelperAcceptanceProgressBarProps) {
  // Matching round filter
  const currentRound = request.matchingRound || 1;
  const roundAcceptances = acceptances.filter(
    (a) => (a.matchingRound || 1) === currentRound
  );

  // Active helpers (not rejected/unavailable)
  const activeHelpers = roundAcceptances.filter(
    (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
  );

  const acceptedCount = activeHelpers.length > 0
    ? Math.min(3, activeHelpers.length)
    : (request.acceptedCount ?? (request.status === 'ACCEPTED' ? 1 : 0));

  const remainingSlots = Math.max(0, 3 - acceptedCount);
  const isFull = acceptedCount >= 3 || request.acceptanceClosed;
  const percentage = Math.round((acceptedCount / 3) * 100);

  return (
    <div
      className={cn(
        'rounded-2xl border p-3.5 transition-all',
        isFull
          ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
          : acceptedCount > 0
          ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          <Users size={14} className={isFull ? 'text-purple-600 dark:text-purple-400' : 'text-brand-blue'} />
          <span>Helper Acceptance</span>
          {currentRound > 1 && (
            <span className="ml-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Round {currentRound}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isFull ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
              <CheckCircle2 size={12} /> 3/3 HELPERS FOUND
            </span>
          ) : (
            <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
              {acceptedCount}/3 Helpers Accepted
            </span>
          )}
        </div>
      </div>

      {/* Visual progress bar */}
      <div
        className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden mb-2 relative"
        role="progressbar"
        aria-valuenow={acceptedCount}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-label="Helper acceptance progress"
      >
        <div
          className={cn(
            'h-2.5 rounded-full transition-all duration-500 ease-out',
            isFull
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
              : acceptedCount === 2
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
              : 'bg-brand-blue'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
          {isFull ? (
            <span className="text-purple-700 dark:text-purple-300 font-bold inline-flex items-center gap-1">
              <ShieldAlert size={12} /> ACCEPTANCE LIMIT REACHED
            </span>
          ) : (
            <span>
              <strong className="text-slate-900 dark:text-white font-bold">{remainingSlots}</strong>{' '}
              {remainingSlots === 1 ? 'Slot Remaining' : 'Slots Remaining'}
            </span>
          )}
        </span>

        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Status:{' '}
          <strong
            className={cn(
              'font-bold',
              isFull
                ? 'text-purple-700 dark:text-purple-300'
                : acceptedCount > 0
                ? 'text-brand-blue'
                : 'text-slate-700 dark:text-slate-300'
            )}
          >
            {isFull ? '3/3 FOUND' : acceptedCount > 0 ? `${acceptedCount}/3 ACCEPTED` : 'OPEN'}
          </strong>
        </span>
      </div>

      {/* Mini Helper Avatars when helpers have accepted */}
      {roundAcceptances.length > 0 && !compact && (
        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Accepted:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {roundAcceptances.map((h, idx) => {
              const isRejected = ['UNAVAILABLE', 'REJECTED'].includes(h.acceptanceStatus);
              const isSelected = h.isSelected || h.acceptanceStatus === 'SELECTED' || h.acceptanceStatus === 'CONFIRMED';
              return (
                <span
                  key={h.id || h.acceptanceId || idx}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border',
                    isRejected
                      ? 'bg-slate-100 text-slate-400 line-through border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                      : isSelected
                      ? 'bg-amber-100 text-amber-900 font-bold border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  )}
                  title={`${h.helperDisplayName} (${h.approximateDistance}km, ${h.estimatedArrival} mins)`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                  <span>Helper {idx + 1}: {h.helperDisplayName}</span>
                  {isSelected && <span className="text-amber-700 dark:text-amber-300 text-[9px] font-bold">(Selected)</span>}
                  {isRejected && <span className="text-red-500 text-[9px] font-bold">(Unavailable)</span>}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
