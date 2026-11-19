import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Shield } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';
import { ISSUE_STATUS_META, formatDisplayDateTime } from '../lib/statusHelpers';
import { cn } from '../lib/utils';

export function IssueReportingPage() {
  const { requestId: paramReqId } = useParams<{ requestId?: string }>();
  const navigate = useNavigate();
  const { firebaseUser, authReady, requests, issues, reportIssue } = useAppContext();

  const uid = firebaseUser?.uid || '';
  const eligibleRequests = requests.filter(
    (r) =>
      (r.requesterId === uid || r.helperId === uid) &&
      ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED_UNCONFIRMED'].includes(
        r.status
      )
  );

  const [selectedRequestId, setSelectedRequestId] = useState(
    paramReqId || eligibleRequests[0]?.requestId || ''
  );
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authReady) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthGateCard
        title="Sign in to Report an Issue"
        description="Submit assistance disputes securely for administrative moderation."
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqId = selectedRequestId || paramReqId || eligibleRequests[0]?.requestId;
    if (!reqId) {
      setError('Please select a help request.');
      return;
    }
    if (description.trim().length < 5) {
      setError('Please provide at least a short description of the issue.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await reportIssue(reqId, description.trim());
      setSubmitted(true);
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit issue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Report an Issue
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          If assistance was not completed as expected, send the case for administrative review.
        </p>
      </div>

      {submitted && (
        <div className="glass-card p-5 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-brand-green shrink-0" size={22} />
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                Issue Submitted for Review
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                The request status has been updated to Under Review and logged in the audit trail.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shrink-0"
          >
            Back to History
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div>
          <label
            htmlFor="issue-request"
            className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
          >
            Select Help Request
          </label>
          {eligibleRequests.length === 0 && !paramReqId ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              You have no active or awaiting-confirmation requests eligible for issue reporting.
            </p>
          ) : (
            <select
              id="issue-request"
              value={selectedRequestId || paramReqId || ''}
              onChange={(e) => setSelectedRequestId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100"
            >
              {paramReqId && !eligibleRequests.some((r) => r.requestId === paramReqId) && (
                <option value={paramReqId}>{paramReqId}</option>
              )}
              {eligibleRequests.map((r) => (
                <option key={r.id} value={r.requestId}>
                  {r.requestId} — {r.title} ({r.status})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor="issue-details"
            className="block text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5"
          >
            Issue Description
          </label>
          <textarea
            id="issue-details"
            rows={4}
            maxLength={1000}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what occurred (e.g., Helper marked completed before arriving, or request details mismatch)."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Shield size={14} className="shrink-0" />
          <span>All issue reports are reviewed by an administrator and recorded in an immutable audit log.</span>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || (eligibleRequests.length === 0 && !paramReqId)}
          className="w-full min-h-[44px] py-3 px-5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
          Submit Issue for Admin Review
        </button>
      </form>

      {/* Existing Issues */}
      {issues.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Reported Cases</h2>
          {issues.map((iss) => {
            const meta = ISSUE_STATUS_META[iss.issueStatus];
            return (
              <div key={iss.id} className="glass-card p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                    {iss.id} · Request {iss.requestId}
                  </span>
                  <span className={cn('px-2.5 py-0.5 rounded-md border text-xs font-semibold', meta.className)}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200">{iss.issueDescription}</p>
                {iss.adminNotes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
                    Moderator Note: {iss.adminNotes}
                  </p>
                )}
                <p className="text-xs text-slate-400 tabular-nums">
                  Submitted {formatDisplayDateTime(iss.createdAt)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
