import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Clock, CheckCircle2, Shield, Droplet, HandCoins, AlertCircle, Utensils, Heart } from 'lucide-react';
import { HelpRequest } from '../types';
import { HelperAcceptanceProgressBar } from './HelperAcceptanceProgressBar';
import { useAppContext } from '../context/AppContext';

interface RequestDetailsModalProps {
  request: HelpRequest | null;
  onClose: () => void;
  onDonateClick: (request: HelpRequest) => void;
  onAcceptClick: (id: string) => void;
}

export function RequestDetailsModal({
  request,
  onClose,
  onDonateClick,
  onAcceptClick,
}: RequestDetailsModalProps) {
  const { helperAcceptances, firebaseUser } = useAppContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!request) return null;

  const uid = firebaseUser?.uid || '';
  const currentRound = request.matchingRound || 1;
  const reqAcceptances = helperAcceptances.filter(
    (a) => a.requestId === request.requestId && (a.matchingRound || 1) === currentRound
  );
  const activeAcceptances = reqAcceptances.filter(
    (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
  );
  const myAcceptance = reqAcceptances.find((a) => a.helperId === uid);
  const isLimitReached = (request.acceptedCount ?? activeAcceptances.length) >= 3 || request.acceptanceClosed || request.status === 'THREE_HELPERS_FOUND';
  const isRequester = uid && request.requesterId === uid;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Emergency':
        return <AlertCircle className="text-red-600" size={20} />;
      case 'Blood':
        return <Droplet className="text-brand-red" size={20} />;
      case 'Money':
        return <HandCoins className="text-brand-green" size={20} />;
      case 'Food':
        return <Utensils className="text-brand-orange" size={20} />;
      default:
        return <Heart className="text-brand-blue" size={20} />;
    }
  };

  const amountNeeded = request.amountNeeded ?? 0;
  const amountCollected = request.amountCollected ?? 0;
  const fundedPercent = amountNeeded > 0 ? Math.min(100, Math.round((amountCollected / amountNeeded) * 100)) : 0;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/45 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-details-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                {getCategoryIcon(request.category)}
              </div>
              <div>
                <h2 id="request-details-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {request.category} Request · <span className="font-mono text-xs">{request.requestId}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {request.requesterName} · {request.requesterVerified ? 'Verified User' : 'Community Member'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close request details"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">{request.title}</p>
              <p className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                {request.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-500 block">Approximate Area</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1 mt-0.5">
                  <MapPin size={14} className="text-slate-400" /> {request.location}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Timeline</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1 mt-0.5">
                  <Clock size={14} className="text-slate-400" /> {request.time}
                </span>
              </div>
            </div>

            {/* 3-Helper Acceptance Progress Bar */}
            {request.category !== 'Money' && (
              <HelperAcceptanceProgressBar
                request={request}
                acceptances={reqAcceptances}
              />
            )}

            {request.bloodGroup && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900 p-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-red-900 dark:text-red-200">Blood Requirement</span>
                <span className="text-base font-extrabold text-brand-red tabular-nums">
                  {request.bloodGroup} · {request.units} units
                </span>
              </div>
            )}

            {request.amountNeeded !== undefined && (
              <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 p-4 space-y-2.5">
                <div className="flex justify-between text-sm font-semibold tabular-nums">
                  <span className="text-slate-600 dark:text-slate-300">
                    Collected: ₹{amountCollected.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    Goal: ₹{amountNeeded.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="w-full bg-white dark:bg-slate-800 rounded-full h-2.5 overflow-hidden border border-emerald-100 dark:border-emerald-900">
                  <div className="bg-brand-green h-2.5 rounded-full" style={{ width: `${fundedPercent}%` }} />
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium tabular-nums">
                  {fundedPercent}% funded
                </p>
              </div>
            )}

            <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400">
              <Shield size={15} className="text-slate-400 shrink-0 mt-0.5" />
              <span>
                Exact home address and private contact details remain hidden for safety.
              </span>
            </div>

            <div className="flex gap-3 pt-1">
              {request.category === 'Money' ? (
                <button
                  type="button"
                  disabled={request.status === 'COMPLETED_CONFIRMED'}
                  onClick={() => {
                    onClose();
                    onDonateClick(request);
                  }}
                  className="flex-1 min-h-[44px] bg-brand-green text-white py-3 px-5 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {request.status === 'COMPLETED_CONFIRMED' ? 'Goal Reached' : 'Donate Now'}
                </button>
              ) : myAcceptance ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 min-h-[44px] bg-blue-100 dark:bg-blue-950/60 text-brand-blue border border-blue-200 dark:border-blue-800 py-3 px-5 rounded-xl font-bold text-xs cursor-default inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>You Already Accepted This Request</span>
                </button>
              ) : isLimitReached ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-400 py-3 px-5 rounded-xl font-bold text-xs cursor-not-allowed border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center gap-2"
                >
                  <span>3/3 Helpers Found (Limit Reached)</span>
                </button>
              ) : isRequester ? (
                <div className="flex-1 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 px-5 rounded-xl font-semibold text-xs flex items-center justify-center">
                  Your Request · Waiting for helpers
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onAcceptClick(request.requestId);
                    onClose();
                  }}
                  className="flex-1 min-h-[44px] bg-brand-blue text-white py-3 px-5 rounded-xl font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  <span>I Can Help (Slot {Math.min(3, (request.acceptedCount ?? activeAcceptances.length) + 1)}/3)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
