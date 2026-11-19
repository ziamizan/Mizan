import React, { useMemo, useState } from 'react';
import {
  Search,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Star,
  Clock,
  FileCheck2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';
import { DigitalProofCertificate } from '../components/DigitalProofCertificate';
import { PdfDownloadButton } from '../components/PdfDownloadButton';
import { RequesterConfirmationModal } from '../components/RequesterConfirmationModal';
import { DigitalProof, HelpRequest, RequestCategory } from '../types';
import { formatDisplayDate, REQUEST_STATUS_META } from '../lib/statusHelpers';
import { cn } from '../lib/utils';

const CATEGORIES: ('All' | RequestCategory)[] = [
  'All',
  'Emergency',
  'Blood',
  'Money',
  'Food',
  'Medicine',
  'Transport',
  'Education',
  'Shelter',
  'Volunteer',
  'Other',
];

export function ProofsDashboardPage() {
  const {
    firebaseUser,
    authReady,
    requests,
    proofs,
    submissions,
    confirmations,
    issues,
    confirmAssistance,
    markNotYetReceived,
    reportIssue,
  } = useAppContext();

  const [roleTab, setRoleTab] = useState<'requester' | 'helper'>('requester');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | RequestCategory>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [activeProof, setActiveProof] = useState<DigitalProof | null>(null);
  const [confirmingRequest, setConfirmingRequest] = useState<HelpRequest | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const uid = firebaseUser?.uid || '';

  const myRequests = useMemo(
    () => requests.filter((r) => r.requesterId === uid || r.helperId === uid),
    [requests, uid]
  );

  const stats = useMemo(() => {
    const totalHelpRequests = myRequests.length;
    const assistanceCompleted = myRequests.filter((r) =>
      ['AWAITING_CONFIRMATION', 'COMPLETED_CONFIRMED', 'COMPLETED_UNCONFIRMED'].includes(
        r.status
      )
    ).length;
    const confirmedAssistance = proofs.filter(
      (p) => (p.requesterId === uid || p.helperId === uid) && p.proofStatus === 'VALID'
    ).length;
    const awaitingConfirmation = myRequests.filter(
      (r) => r.status === 'AWAITING_CONFIRMATION'
    ).length;
    const issuesUnderReview =
      myRequests.filter((r) => ['ISSUE_REPORTED', 'UNDER_REVIEW'].includes(r.status)).length ||
      issues.filter((i) => i.issueStatus !== 'RESOLVED').length;

    return {
      totalHelpRequests,
      assistanceCompleted,
      confirmedAssistance,
      awaitingConfirmation,
      issuesUnderReview,
    };
  }, [myRequests, proofs, uid, issues]);

  // Requester view: received-help proofs + awaiting confirmation items
  const requesterProofs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return proofs
      .filter((p) => p.requesterId === uid)
      .filter((p) => (categoryFilter === 'All' ? true : p.category === categoryFilter))
      .filter((p) => {
        if (!dateFilter) return true;
        const iso = (p.confirmedAt || p.generatedAt).slice(0, 10);
        return iso === dateFilter;
      })
      .filter((p) => {
        if (!q) return true;
        return (
          p.proofId.toLowerCase().includes(q) ||
          p.requestId.toLowerCase().includes(q) ||
          p.requestTitle.toLowerCase().includes(q)
        );
      });
  }, [proofs, uid, categoryFilter, dateFilter, searchTerm]);

  // Helper view: all completed/pending assistance records where user is helper
  const helperRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests
      .filter(
        (r) =>
          r.helperId === uid &&
          [
            'AWAITING_CONFIRMATION',
            'COMPLETED_CONFIRMED',
            'COMPLETED_UNCONFIRMED',
            'ISSUE_REPORTED',
            'UNDER_REVIEW',
          ].includes(r.status)
      )
      .filter((r) => (categoryFilter === 'All' ? true : r.category === categoryFilter))
      .filter((r) => {
        if (!dateFilter) return true;
        const iso = (r.completedAt || r.createdAt).slice(0, 10);
        return iso === dateFilter;
      })
      .filter((r) => {
        if (!q) return true;
        const linkedProof = proofs.find((p) => p.requestId === r.requestId);
        return (
          r.requestId.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          (linkedProof?.proofId.toLowerCase().includes(q) ?? false)
        );
      });
  }, [requests, uid, categoryFilter, dateFilter, searchTerm, proofs]);

  const awaitingMyConfirmation = useMemo(
    () =>
      requests.filter(
        (r) => r.requesterId === uid && r.status === 'AWAITING_CONFIRMATION'
      ),
    [requests, uid]
  );

  const handleCopyShareLink = async (proof: DigitalProof) => {
    const url = `${window.location.origin}/verify/${proof.proofId}?t=${encodeURIComponent(
      proof.verificationToken
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(proof.proofId);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  if (!authReady) {
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-4">
        <div className="h-8 w-56 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthGateCard
        title="Sign in to View My Digital Proofs"
        description="Access verified Digital Proofs of Help, download PDF certificates, share QR verification links, and confirm completed assistance."
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-brand-blue mb-1">
            Every act of kindness matters · Every confirmed help creates trust
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            My Digital Proofs
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Optional, privacy-safe verification records for confirmed community assistance.
          </p>
        </div>
        <Link
          to="/verify"
          className="px-4 py-2.5 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue hover:text-brand-blue transition-colors inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <ShieldCheck size={16} /> Verify a Proof ID
        </Link>
      </div>

      {/* Dashboard Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Help Requests</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
            {stats.totalHelpRequests}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assistance Completed</p>
          <p className="text-2xl font-extrabold text-brand-blue mt-1 tabular-nums">
            {stats.assistanceCompleted}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Confirmed Assistance</p>
          <p className="text-2xl font-extrabold text-brand-green mt-1 tabular-nums">
            {stats.confirmedAssistance}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Awaiting Confirmation</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1 tabular-nums">
            {stats.awaitingConfirmation}
          </p>
        </div>
        <div className="glass-card p-4 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Issues Under Review</p>
          <p className="text-2xl font-extrabold text-red-600 mt-1 tabular-nums">
            {stats.issuesUnderReview}
          </p>
        </div>
      </div>

      {/* Pending Requester Confirmation Banner */}
      {awaitingMyConfirmation.length > 0 && (
        <div className="glass-card p-5 border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
            <Sparkles size={18} className="text-amber-600" />
            <span>
              {awaitingMyConfirmation.length} assistance request
              {awaitingMyConfirmation.length > 1 ? 's' : ''} awaiting your optional confirmation
            </span>
          </div>
          <div className="space-y-2.5">
            {awaitingMyConfirmation.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-amber-200/70 dark:border-amber-800/60"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {req.title}{' '}
                    <span className="font-mono text-xs text-slate-500 font-normal">
                      ({req.requestId})
                    </span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marked completed by {req.helperDisplayName || 'Helper'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingRequest(req)}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-green-700 transition-colors shrink-0"
                >
                  Confirm or Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Tabs & Search/Filter Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setRoleTab('requester')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                roleTab === 'requester'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Received-Help Proofs ({requesterProofs.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('helper')}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                roleTab === 'helper'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              Helper Assistance Records ({helperRecords.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                roleTab === 'requester'
                  ? 'Search by Proof ID (DPH-...) or title'
                  : 'Search by Request ID (HC-...) or title'
              }
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'All' | RequestCategory)}
            aria-label="Filter by category"
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'All' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by completion date"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Requester Received Proofs List */}
      {roleTab === 'requester' && (
        <div className="space-y-4">
          {requesterProofs.length === 0 ? (
            <div className="glass-card p-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                <FileCheck2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No Digital Proofs yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                When you receive assistance and optionally confirm completion, your Digital Proof of Help certificate appears here.
              </p>
              <Link
                to="/history"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                View Help History
              </Link>
            </div>
          ) : (
            requesterProofs.map((proof) => (
              <div
                key={proof.id}
                className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold text-brand-blue tabular-nums">
                      {proof.proofId}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{proof.requestId}</span>
                    <span aria-hidden="true">·</span>
                    <span>{proof.category}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        proof.proofStatus === 'VALID'
                          ? 'text-brand-green font-semibold'
                          : 'text-red-600 font-semibold'
                      }
                    >
                      {proof.proofStatus === 'VALID' ? 'Verified' : 'Suspended'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {proof.requestTitle}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Helper: {proof.helperDisplayName} · Confirmed{' '}
                    {formatDisplayDate(proof.confirmedAt || proof.generatedAt)}
                  </p>
                  {proof.optionalFeedback && (
                    <p className="text-xs italic text-slate-500 dark:text-slate-400">
                      “{proof.optionalFeedback}”
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveProof(proof)}
                    className="px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Open Proof
                  </button>
                  <PdfDownloadButton proof={proof} />
                  <button
                    type="button"
                    onClick={() => void handleCopyShareLink(proof)}
                    className="px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    {copiedId === proof.proofId ? (
                      <Check size={15} className="text-brand-green" />
                    ) : (
                      <Copy size={15} />
                    )}
                    {copiedId === proof.proofId ? 'Copied' : 'Share Link'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Helper Completed Assistance Records */}
      {roleTab === 'helper' && (
        <div className="space-y-4">
          {helperRecords.length === 0 ? (
            <div className="glass-card p-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                <Clock size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No Completed Assistance Records Yet
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Accept a request from the community feed and mark it completed once you provide help.
              </p>
              <Link
                to="/feed"
                className="inline-flex items-center px-5 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Find People to Help
              </Link>
            </div>
          ) : (
            helperRecords.map((req) => {
              const linkedProof = proofs.find((p) => p.requestId === req.requestId);
              const linkedConf = confirmations.find((c) => c.requestId === req.requestId);
              const meta = REQUEST_STATUS_META[req.status];

              return (
                <div
                  key={req.id}
                  className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                        {req.requestId}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="text-slate-500 dark:text-slate-400">{req.category}</span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className={cn('px-2.5 py-0.5 rounded-md border font-semibold', meta.badgeClass)}>
                        {meta.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{req.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Requester: {req.requesterName} · Completed{' '}
                      {formatDisplayDate(req.completedAt || req.createdAt)}
                    </p>

                    {linkedConf?.rating && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        <Star size={14} className="fill-amber-400 text-amber-500" />
                        <span className="tabular-nums">{linkedConf.rating}/5</span>
                        {linkedConf.feedback && (
                          <span className="text-slate-600 dark:text-slate-300 font-normal italic">
                            — “{linkedConf.feedback}”
                          </span>
                        )}
                      </div>
                    )}

                    {req.status === 'AWAITING_CONFIRMATION' && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Waiting for requester’s optional confirmation. Proof generates automatically once confirmed.
                      </p>
                    )}

                    {req.status === 'UNDER_REVIEW' && (
                      <p className="text-xs text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                        <AlertTriangle size={13} /> Case is currently under administrative review.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {linkedProof ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveProof(linkedProof)}
                          className="px-4 py-2.5 min-h-[44px] rounded-xl bg-brand-green text-white text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                          View Digital Proof
                        </button>
                        <PdfDownloadButton proof={linkedProof} />
                        <Link
                          to={`/verify/${linkedProof.proofId}?t=${encodeURIComponent(
                            linkedProof.verificationToken
                          )}`}
                          className="p-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-blue inline-flex items-center"
                          aria-label="Open public verification link"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </>
                    ) : (
                      <Link
                        to="/history"
                        className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center"
                      >
                        View in History
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Certificate Modal */}
      <DigitalProofCertificate proof={activeProof} onClose={() => setActiveProof(null)} />

      {/* Confirmation Modal */}
      <RequesterConfirmationModal
        request={confirmingRequest}
        submission={
          confirmingRequest
            ? submissions.find((s) => s.requestId === confirmingRequest.requestId) ?? null
            : null
        }
        onClose={() => setConfirmingRequest(null)}
        onConfirmReceived={confirmAssistance}
        onNotYetReceived={markNotYetReceived}
        onReportIssue={reportIssue}
        onProofReady={(proof) => setActiveProof(proof)}
      />
    </div>
  );
}
