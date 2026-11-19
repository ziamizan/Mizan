import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { HelpRequest } from '../types';
import { CompletionEvidenceUpload } from './CompletionEvidenceUpload';

interface HelpCompletionModalProps {
  request: HelpRequest | null;
  onClose: () => void;
  onSubmit: (
    requestId: string,
    payload: {
      completionDescription?: string;
      evidenceDataUrl?: string;
      evidenceFileName?: string;
    }
  ) => Promise<void>;
}

export function HelpCompletionModal({
  request,
  onClose,
  onSubmit,
}: HelpCompletionModalProps) {
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<{ dataUrl: string; fileName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDescription('');
    setEvidence(null);
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

  const nowLabel = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(request.requestId, {
        completionDescription: description.trim() || undefined,
        evidenceDataUrl: evidence?.dataUrl,
        evidenceFileName: evidence?.fileName,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit completion.');
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
        aria-labelledby="completion-modal-title"
        onClick={() => !submitting && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h2 id="completion-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Have you completed this assistance?
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {request.requestId} · {request.category}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close modal"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-4 space-y-1.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{request.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requester: {request.requesterName} · {request.location}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 pt-1 tabular-nums">
                <Clock size={13} /> Completion Date & Time: {nowLabel}
              </p>
            </div>

            <div>
              <label
                htmlFor="completion-desc"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
              >
                Completion Description <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <textarea
                id="completion-desc"
                rows={3}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share a brief note on the assistance provided (e.g., Delivered groceries to reception)."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 resize-none"
              />
            </div>

            <CompletionEvidenceUpload value={evidence} onChange={setEvidence} />

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-3 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 min-h-[44px] py-3 px-5 rounded-xl bg-brand-blue text-white font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Submit Completion
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
