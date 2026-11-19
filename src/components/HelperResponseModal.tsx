import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Heart,
  ShieldCheck,
} from 'lucide-react';
import { HelpRequest, HelperAcceptance } from '../types';

const REJECTION_REASONS = [
  'Personal reasons',
  'Travel difficulties',
  'Emergency situation',
  'No longer available',
  'Other',
] as const;

interface HelperResponseModalProps {
  request: HelpRequest;
  acceptance: HelperAcceptance;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export function HelperResponseModal({
  request,
  acceptance,
  isOpen,
  onClose,
  onConfirm,
  onReject,
}: HelperResponseModalProps) {
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('Personal reasons');
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirmHelp = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === 'Other' && customReason.trim()
      ? `Other: ${customReason.trim()}`
      : selectedReason;

    setSubmitting(true);
    setError(null);
    try {
      await onReject(finalReason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rejection submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 overflow-hidden"
        >
          {!showRejectConfirm ? (
            /* Choice 1: Initial Prompt */
            <>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/60 text-brand-blue rounded-2xl shrink-0">
                  <Heart size={24} />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
                    Receiver Selected You!
                  </span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Confirm Assistance Commitment
                  </h3>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-100 dark:border-slate-800 space-y-2 text-sm">
                <p className="font-bold text-slate-900 dark:text-white">
                  {request.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {request.description}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> {request.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> Urgency: {request.time}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-800">
                  {error}
                </p>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Please confirm whether you are able to proceed with this assistance request or decline so a backup helper can be called immediately.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmHelp}
                  className="py-3 px-4 rounded-xl bg-brand-green hover:bg-green-700 text-white font-extrabold text-xs uppercase tracking-wide transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  CONFIRM AND PROVIDE HELP
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowRejectConfirm(true)}
                  className="py-3 px-4 rounded-xl border-2 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-extrabold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle size={16} />
                  I CANNOT COME
                </button>
              </div>
            </>
          ) : (
            /* Choice 2: Rejection Reason Dialog (Section 6) */
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 rounded-2xl shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Are you sure you cannot provide this assistance?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Selecting a reason helps the requester and allows our system to immediately notify and present backup helpers.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-800">
                  {error}
                </p>
              )}

              {/* Reasons radio */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Please select your reason:
                </label>
                <div className="space-y-2">
                  {REJECTION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200"
                    >
                      <input
                        type="radio"
                        name="rejectionReason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>

                {selectedReason === 'Other' && (
                  <input
                    type="text"
                    maxLength={200}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe brief reason..."
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                    autoFocus
                  />
                )}
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRejectConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold uppercase tracking-wide transition-all shadow-sm"
                >
                  {submitting ? 'Submitting...' : 'Confirm Cannot Come'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
