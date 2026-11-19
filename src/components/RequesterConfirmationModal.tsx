import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Clock, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { CompletionSubmission, DigitalProof, HelpRequest } from '../types';
import { FeedbackRatingForm } from './FeedbackRatingForm';
import { cn } from '../lib/utils';

interface RequesterConfirmationModalProps {
  request: HelpRequest | null;
  submission?: CompletionSubmission | null;
  onClose: () => void;
  onConfirmReceived: (
    requestId: string,
    payload: { rating?: number; feedback?: string; appreciationMessage?: string }
  ) => Promise<DigitalProof>;
  onNotYetReceived: (requestId: string, explanation?: string) => Promise<void>;
  onReportIssue: (requestId: string, issueDescription: string) => Promise<void>;
  onProofReady: (proof: DigitalProof) => void;
}

export function RequesterConfirmationModal({
  request,
  submission,
  onClose,
  onConfirmReceived,
  onNotYetReceived,
  onReportIssue,
  onProofReady,
}: RequesterConfirmationModalProps) {
  const [choice, setChoice] = useState<'confirm' | 'not_yet' | 'issue'>('confirm');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [appreciation, setAppreciation] = useState('');
  const [explanation, setExplanation] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setChoice('confirm');
    setRating(0);
    setFeedback('');
    setAppreciation('');
    setExplanation('');
    setIssueDescription('');
    setError(null);
  }, [request?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  if (!request) return null;

  const handleConfirm = async (skipFeedback = false) => {
    setSubmitting(true);
    setError(null);
    try {
      const proof = await onConfirmReceived(request.requestId, {
        rating: !skipFeedback && rating > 0 ? rating : undefined,
        feedback: !skipFeedback && feedback.trim() ? feedback.trim() : undefined,
        appreciationMessage:
          !skipFeedback && appreciation.trim() ? appreciation.trim() : undefined,
      });
      onClose();
      onProofReady(proof);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to confirm completion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotYet = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onNotYetReceived(request.requestId, explanation.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issueDescription.trim().length < 5) {
      setError('Please describe the issue briefly (at least 5 characters).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onReportIssue(request.requestId, issueDescription.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to report issue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="requester-confirm-title"
        onClick={() => !submitting && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-green flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 id="requester-confirm-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Optional Confirmation of Help
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {request.requestId} · {request.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close confirmation modal"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              Your requested assistance has been marked as completed by{' '}
              <strong className="text-slate-900 dark:text-white">
                {request.helperDisplayName || 'Verified Community Member'}
              </strong>
              . Did you receive the help successfully?
            </p>

            {/* Helper completion notes & optional evidence */}
            {submission && (submission.completionDescription || submission.evidenceDataUrl) && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
                <span className="text-xs font-semibold text-slate-500">Helper Completion Note</span>
                {submission.completionDescription && (
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    {submission.completionDescription}
                  </p>
                )}
                {submission.evidenceDataUrl && (
                  <img
                    src={submission.evidenceDataUrl}
                    alt="Supporting evidence uploaded by helper"
                    className="w-full max-h-48 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                )}
              </div>
            )}

            {/* Three options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setChoice('confirm');
                  setError(null);
                }}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex items-center sm:flex-col sm:items-start gap-2',
                  choice === 'confirm'
                    ? 'border-brand-green bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <CheckCircle2 size={18} className="text-brand-green shrink-0" />
                <span className="text-xs font-bold">1. Yes, Help Received</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChoice('not_yet');
                  setError(null);
                }}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex items-center sm:flex-col sm:items-start gap-2',
                  choice === 'not_yet'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <Clock size={18} className="text-amber-600 shrink-0" />
                <span className="text-xs font-bold">2. Not Yet Received</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChoice('issue');
                  setError(null);
                }}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex items-center sm:flex-col sm:items-start gap-2',
                  choice === 'issue'
                    ? 'border-red-500 bg-red-50/70 dark:bg-red-950/50 text-red-900 dark:text-red-200'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <AlertTriangle size={18} className="text-red-600 shrink-0" />
                <span className="text-xs font-bold">3. Report an Issue</span>
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5" role="alert">
                {error}
              </p>
            )}

            {choice === 'confirm' && (
              <div className="space-y-4">
                <FeedbackRatingForm
                  rating={rating}
                  onRatingChange={setRating}
                  feedback={feedback}
                  onFeedbackChange={setFeedback}
                  appreciation={appreciation}
                  onAppreciationChange={setAppreciation}
                />

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleConfirm(true)}
                    className="sm:w-auto px-4 py-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Skip Feedback & Confirm
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleConfirm(false)}
                    className="flex-1 min-h-[44px] py-3 px-5 rounded-xl bg-brand-green text-white font-bold text-sm hover:bg-green-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    Confirm Help & Generate Digital Proof
                  </button>
                </div>
              </div>
            )}

            {choice === 'not_yet' && (
              <form onSubmit={handleNotYet} className="space-y-4">
                <div>
                  <label htmlFor="not-yet-reason" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    Optional Explanation
                  </label>
                  <textarea
                    id="not-yet-reason"
                    rows={3}
                    maxLength={600}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Let the helper know what is still pending (e.g., Waiting for items to arrive)."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] py-3 px-5 rounded-xl bg-amber-600 text-white font-bold text-sm hover:bg-amber-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Keep Open & Notify Helper
                </button>
              </form>
            )}

            {choice === 'issue' && (
              <form onSubmit={handleIssue} className="space-y-4">
                <div>
                  <label htmlFor="issue-desc" className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                    Describe the Issue
                  </label>
                  <textarea
                    id="issue-desc"
                    rows={3}
                    maxLength={1000}
                    required
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                    placeholder="Explain what happened so a HelpConnect moderator can review this case."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] py-3 px-5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  Send Case for Admin Review
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
