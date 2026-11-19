import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  Play,
  Shield,
  MessageSquare,
  Navigation,
  Sparkles,
  Users,
  RotateCcw,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';
import { HelpCompletionModal } from '../components/HelpCompletionModal';
import { RequesterConfirmationModal } from '../components/RequesterConfirmationModal';
import { DigitalProofCertificate } from '../components/DigitalProofCertificate';
import { RequestDetailsModal } from '../components/RequestDetailsModal';
import { ChatModal } from '../components/ChatModal';
import { AssistanceTrackingModal } from '../components/AssistanceTrackingModal';
import { HelperAcceptanceProgressBar } from '../components/HelperAcceptanceProgressBar';
import { ThreeHelperSelectionSection } from '../components/ThreeHelperSelectionSection';
import { SelectedHelperCard } from '../components/SelectedHelperCard';
import { LiveTrackingSection } from '../components/LiveTrackingSection';
import { HelperResponseModal } from '../components/HelperResponseModal';
import { DigitalProof, HelpRequest, HelperAcceptance } from '../types';
import { formatDisplayDate, REQUEST_STATUS_META } from '../lib/statusHelpers';
import { cn } from '../lib/utils';

type HistoryFilter =
  | 'All'
  | 'In Progress'
  | 'Awaiting Confirmation'
  | 'Successfully Completed'
  | 'Under Review';

const FILTERS: HistoryFilter[] = [
  'All',
  'In Progress',
  'Awaiting Confirmation',
  'Successfully Completed',
  'Under Review',
];

export function HelpHistoryPage() {
  const {
    firebaseUser,
    authReady,
    requests,
    proofs,
    submissions,
    startAssistance,
    submitCompletion,
    confirmAssistance,
    markNotYetReceived,
    reportIssue,
    acceptRequest,
    helperAcceptances,
    selectHelper,
    confirmProvideHelp,
    rejectProvideHelp,
    reopenRequestRound,
  } = useAppContext();

  const [filter, setFilter] = useState<HistoryFilter>('All');
  const [completingReq, setCompletingReq] = useState<HelpRequest | null>(null);
  const [confirmingReq, setConfirmingReq] = useState<HelpRequest | null>(null);
  const [detailsReq, setDetailsReq] = useState<HelpRequest | null>(null);
  const [activeProof, setActiveProof] = useState<DigitalProof | null>(null);
  const [chatReq, setChatReq] = useState<HelpRequest | null>(null);
  const [trackingReq, setTrackingReq] = useState<HelpRequest | null>(null);
  const [helperResponseTarget, setHelperResponseTarget] = useState<{
    request: HelpRequest;
    acceptance: HelperAcceptance;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const uid = firebaseUser?.uid || '';

  const myActivities = useMemo(() => {
    const myAcceptedIds = new Set(
      helperAcceptances.filter((a) => a.helperId === uid).map((a) => a.requestId)
    );
    const mine = requests.filter(
      (r) =>
        r.requesterId === uid ||
        r.helperId === uid ||
        r.selectedHelperId === uid ||
        myAcceptedIds.has(r.requestId)
    );
    return mine.filter((r) => {
      if (filter === 'All') return true;
      if (filter === 'In Progress') {
        return [
          'REQUESTED',
          'OPEN',
          'WAITING_FOR_HELPERS',
          'ONE_HELPER_ACCEPTED',
          'TWO_HELPERS_ACCEPTED',
          'THREE_HELPERS_FOUND',
          'AWAITING_RECEIVER_SELECTION',
          'HELPER_SELECTED',
          'CONFIRMED',
          'BACKUP_SELECTION_REQUIRED',
          'ACCEPTED',
          'IN_PROGRESS',
          'ON_THE_WAY',
          'ARRIVED',
          'ASSISTANCE_IN_PROGRESS',
          'REOPENED',
        ].includes(r.status);
      }
      if (filter === 'Awaiting Confirmation') {
        return ['AWAITING_CONFIRMATION', 'COMPLETED_UNCONFIRMED'].includes(r.status);
      }
      if (filter === 'Successfully Completed') {
        return r.status === 'COMPLETED_CONFIRMED';
      }
      if (filter === 'Under Review') {
        return ['ISSUE_REPORTED', 'UNDER_REVIEW', 'HELPER_UNAVAILABLE'].includes(r.status);
      }
      return true;
    });
  }, [requests, helperAcceptances, uid, filter]);

  if (!authReady) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-4">
        <div className="h-8 w-48 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthGateCard
        title="Sign in to View Help History"
        description="Track help requests you have created or accepted, choose helpers, and confirm Digital Proofs of Help."
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Help History</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Manage ongoing assistance, select helpers from accepted candidates, and track live progress.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 min-h-[40px] rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-colors',
              filter === f
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Activity Cards */}
      <div className="space-y-6">
        {myActivities.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-3">
            <Clock size={28} className="mx-auto text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">No matching help activity</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Create a request or offer help on the community feed to build your Help History.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                to="/request"
                className="px-4 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-blue-700"
              >
                Request Help
              </Link>
              <Link
                to="/feed"
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200"
              >
                Browse Requests
              </Link>
            </div>
          </div>
        ) : (
          myActivities.map((req) => {
            const isRequester = req.requesterId === uid;
            const currentRound = req.matchingRound || 1;
            const reqAcceptances = helperAcceptances.filter(
              (a) => a.requestId === req.requestId && (a.matchingRound || 1) === currentRound
            );
            const activeAcceptances = reqAcceptances.filter(
              (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
            );
            const myAcceptance = reqAcceptances.find((a) => a.helperId === uid);
            const isSelectedForHelp = Boolean(
              myAcceptance &&
                (myAcceptance.isSelected ||
                  myAcceptance.acceptanceStatus === 'SELECTED' ||
                  req.selectedHelperId === uid)
            );
            const isAssignedPrimary = Boolean(
              req.helperId === uid || req.selectedHelperId === uid
            );
            const isHelper = isAssignedPrimary || Boolean(myAcceptance);
            const meta = REQUEST_STATUS_META[req.status];
            const proof = proofs.find((p) => p.requestId === req.requestId);

            const assignedAcceptance = reqAcceptances.find(
              (a) => a.helperId === (req.selectedHelperId || req.helperId)
            );

            const showSelectionSection =
              isRequester &&
              (req.status === 'THREE_HELPERS_FOUND' ||
                req.status === 'AWAITING_RECEIVER_SELECTION' ||
                req.status === 'BACKUP_SELECTION_REQUIRED' ||
                (activeAcceptances.length >= 3 && !req.selectedHelperId && !req.helperId));

            return (
              <div key={req.id} className="glass-card p-6 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                        {req.requestId}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{req.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDisplayDate(req.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-brand-blue">
                        {isRequester ? 'Your Request' : 'Assisting Candidate'}
                      </span>
                      {currentRound > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                            Matching Round {currentRound}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{req.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {isRequester
                        ? req.helperDisplayName
                          ? `Assigned Helper: ${req.helperDisplayName}`
                          : activeAcceptances.length >= 3
                          ? '3 helpers accepted! Please select your helper below.'
                          : `Waiting for helpers (${activeAcceptances.length}/3 accepted)`
                        : `Requester: ${req.requesterName} · Location: ${req.location}`}
                    </p>
                  </div>

                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold shrink-0',
                      meta.badgeClass
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', meta.dotColor)} />
                    {meta.label}
                  </span>
                </div>

                {/* Acceptance Progress Bar */}
                {req.category !== 'Money' && (
                  <HelperAcceptanceProgressBar
                    request={req}
                    acceptances={reqAcceptances}
                  />
                )}

                {/* Auto Reopen Notice (Rule 7) */}
                {req.status === 'REOPENED' && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <RotateCcw size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">Matching Round {currentRound} Started</p>
                      <p>All candidate helpers from the prior round became unavailable. The request was automatically reopened to find 3 new helpers.</p>
                    </div>
                  </div>
                )}

                {/* Selected Helper Action Prompt (Rule 5 & 6) */}
                {isSelectedForHelp && req.status === 'HELPER_SELECTED' && myAcceptance && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                      <Sparkles size={16} className="text-amber-600" />
                      <span>You have been selected as the primary helper!</span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      Please confirm your commitment to provide this assistance, or let the receiver know immediately if you cannot come so a backup helper can be notified.
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setActionError(null);
                          try {
                            await confirmProvideHelp(req.requestId, myAcceptance.helperId);
                          } catch (e) {
                            setActionError(e instanceof Error ? e.message : 'Confirmation failed');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-brand-green hover:bg-green-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <CheckCircle2 size={14} /> CONFIRM AND PROVIDE HELP
                      </button>
                      <button
                        type="button"
                        onClick={() => setHelperResponseTarget({ request: req, acceptance: myAcceptance })}
                        className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold text-xs inline-flex items-center gap-1.5 transition-all border border-red-200 dark:border-red-800"
                      >
                        I CANNOT COME
                      </button>
                    </div>
                  </div>
                )}

                {/* Section 3 & 4: Dedicated 3-Helper Selection Page Section for Receiver */}
                {showSelectionSection && (
                  <div className="pt-2">
                    <ThreeHelperSelectionSection
                      request={req}
                      acceptances={reqAcceptances}
                      onSelectHelper={async (helperId) => {
                        setActionError(null);
                        try {
                          await selectHelper(req.requestId, helperId);
                        } catch (e) {
                          setActionError(e instanceof Error ? e.message : 'Helper selection failed');
                        }
                      }}
                    />
                  </div>
                )}

                {/* Section 5 & 8: Selected Helper Details Card with Masked Call & Chat */}
                {isRequester && assignedAcceptance && ['HELPER_SELECTED', 'CONFIRMED', 'ON_THE_WAY', 'ARRIVED', 'ASSISTANCE_IN_PROGRESS', 'ACCEPTED', 'IN_PROGRESS'].includes(req.status) && (
                  <SelectedHelperCard
                    request={req}
                    helper={assignedAcceptance}
                    onOpenChat={() => setChatReq(req)}
                    onOpenTracking={() => setTrackingReq(req)}
                  />
                )}

                {/* Progress Step Indicator */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Shield size={13} /> Privacy Protected
                  </span>
                  {req.status === 'COMPLETED_UNCONFIRMED' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        Requester marked not yet received — helper can re-submit completion once resolved.
                      </span>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDetailsReq(req)}
                    className="px-4 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    View Details
                  </button>

                  {isHelper && req.status === 'ACCEPTED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        void startAssistance(req.requestId).catch((e) =>
                          setActionError(e instanceof Error ? e.message : 'Action failed')
                        );
                      }}
                      className="px-4 py-2 min-h-[40px] rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue text-xs font-bold hover:bg-blue-100 inline-flex items-center gap-1.5"
                    >
                      <Play size={13} /> Start Assistance
                    </button>
                  )}

                  {isHelper &&
                    ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED_UNCONFIRMED'].includes(req.status) && (
                      <button
                        type="button"
                        onClick={() => setCompletingReq(req)}
                        className="px-4 py-2 min-h-[40px] rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Mark as Completed
                      </button>
                    )}

                  {isRequester && req.status === 'AWAITING_CONFIRMATION' && (
                    <button
                      type="button"
                      onClick={() => setConfirmingReq(req)}
                      className="px-4 py-2 min-h-[40px] rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-green-700 inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Confirm Help Received
                    </button>
                  )}

                  {(isRequester || isHelper) &&
                    ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'COMPLETED_UNCONFIRMED'].includes(
                      req.status
                    ) && (
                      <Link
                        to={`/report-issue/${req.requestId}`}
                        className="px-4 py-2 min-h-[40px] rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-1.5"
                      >
                        <AlertTriangle size={13} /> Report Issue
                      </Link>
                    )}

                  {(isRequester || isHelper) && req.helperId && (
                    <>
                      <button
                        type="button"
                        onClick={() => setChatReq(req)}
                        className="px-4 py-2 min-h-[40px] rounded-xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue border border-blue-200 dark:border-blue-800 text-xs font-bold hover:bg-blue-100 inline-flex items-center gap-1.5"
                      >
                        <MessageSquare size={14} /> Chat
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrackingReq(req)}
                        className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-green border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 inline-flex items-center gap-1.5"
                      >
                        <Navigation size={14} /> Track Progress
                      </button>
                    </>
                  )}

                  {proof && (
                    <button
                      type="button"
                      onClick={() => setActiveProof(proof)}
                      className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-green border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 inline-flex items-center gap-1.5 ml-auto"
                    >
                      <FileCheck2 size={14} /> View Digital Proof
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <HelpCompletionModal
        request={completingReq}
        onClose={() => setCompletingReq(null)}
        onSubmit={submitCompletion}
      />

      <RequesterConfirmationModal
        request={confirmingReq}
        submission={
          confirmingReq
            ? submissions.find((s) => s.requestId === confirmingReq.requestId) ?? null
            : null
        }
        onClose={() => setConfirmingReq(null)}
        onConfirmReceived={confirmAssistance}
        onNotYetReceived={markNotYetReceived}
        onReportIssue={reportIssue}
        onProofReady={(proof) => setActiveProof(proof)}
      />

      <RequestDetailsModal
        request={detailsReq}
        onClose={() => setDetailsReq(null)}
        onDonateClick={() => {}}
        onAcceptClick={(id) => {
          setActionError(null);
          void acceptRequest(id).catch((e) =>
            setActionError(e instanceof Error ? e.message : 'Unable to accept request.')
          );
        }}
      />

      <DigitalProofCertificate proof={activeProof} onClose={() => setActiveProof(null)} />
      <ChatModal request={chatReq} onClose={() => setChatReq(null)} />
      <AssistanceTrackingModal request={trackingReq} onClose={() => setTrackingReq(null)} />

      {/* Selected Helper Confirm / Decline Help Modal */}
      {helperResponseTarget && (
        <HelperResponseModal
          request={helperResponseTarget.request}
          acceptance={helperResponseTarget.acceptance}
          isOpen={Boolean(helperResponseTarget)}
          onClose={() => setHelperResponseTarget(null)}
          onConfirm={async () => {
            await confirmProvideHelp(
              helperResponseTarget.request.requestId,
              helperResponseTarget.acceptance.helperId
            );
            setHelperResponseTarget(null);
          }}
          onReject={async (reason) => {
            await rejectProvideHelp(
              helperResponseTarget.request.requestId,
              helperResponseTarget.acceptance.helperId,
              reason
            );
            setHelperResponseTarget(null);
          }}
        />
      )}
    </div>
  );
}
