import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle2,
  Clock,
  Navigation,
  MapPin,
  ShieldCheck,
  MessageSquare,
  AlertTriangle,
  Check,
  User as UserIcon,
  PhoneCall,
  UserCheck,
  UserX,
  AlertCircle,
} from 'lucide-react';
import { HelpRequest, HelperAcceptance } from '../types';
import { useAppContext } from '../context/AppContext';
import { formatDisplayDate } from '../lib/statusHelpers';
import { cn } from '../lib/utils';
import { ChatModal } from './ChatModal';
import { HelpCompletionModal } from './HelpCompletionModal';
import { RequesterConfirmationModal } from './RequesterConfirmationModal';

interface AssistanceTrackingModalProps {
  request: HelpRequest | null;
  onClose: () => void;
}

const REJECTION_REASONS = [
  'Personal reasons',
  'Travel difficulties',
  'Emergency situation',
  'No longer available',
  'Other',
];

export function AssistanceTrackingModal({ request, onClose }: AssistanceTrackingModalProps) {
  const {
    firebaseUser,
    submissions,
    startJourney,
    markArrived,
    startAssistanceProgress,
    cancelRequestWithReason,
    confirmAssistance,
    markNotYetReceived,
    reportIssue,
    selectHelper,
    rejectProvideHelp,
    confirmProvideHelp,
    helperAcceptances,
  } = useAppContext();

  const [locationSharing, setLocationSharing] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [completingReq, setCompletingReq] = useState<HelpRequest | null>(null);
  const [confirmingReq, setConfirmingReq] = useState<HelpRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Helper rejection modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const uid = firebaseUser?.uid || '';
  if (!request) return null;

  const isRequester = uid === request.requesterId;
  const isAssignedHelper = uid === request.helperId || uid === request.selectedHelperId;

  const currentRound = request.matchingRound || 1;
  const roundAcceptances = helperAcceptances.filter(
    (a) => a.requestId === request.requestId && (a.matchingRound || 1) === currentRound
  );
  const selectedHelperInfo = roundAcceptances.find(
    (h) => h.helperId === request.selectedHelperId || h.helperId === request.helperId || h.isSelected
  );
  const isSelectedHelperUnavailable = selectedHelperInfo
    ? ['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(selectedHelperInfo.acceptanceStatus)
    : false;
  const remainingBackupHelpers = roundAcceptances.filter(
    (h) =>
      !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(h.acceptanceStatus) &&
      h.helperId !== selectedHelperInfo?.helperId
  );

  // Timeline stage computations
  const stages = [
    {
      id: 'created',
      label: 'Request Created',
      desc: 'Assistance request posted to community feed',
      timestamp: request.createdAt,
      isCompleted: Boolean(request.createdAt),
      isCurrent: request.status === 'REQUESTED',
    },
    {
      id: 'accepted',
      label: 'Helper Accepted',
      desc: `${request.helperDisplayName || 'Helper'} accepted to provide help`,
      timestamp: request.acceptedAt,
      isCompleted: Boolean(request.acceptedAt),
      isCurrent: request.status === 'ACCEPTED',
    },
    {
      id: 'journey',
      label: 'Helper On The Way',
      desc: 'Helper started journey towards location',
      timestamp: request.journeyStartedAt,
      isCompleted: Boolean(request.journeyStartedAt),
      isCurrent: request.status === 'IN_PROGRESS' && Boolean(request.journeyStartedAt) && !request.arrivedAt,
    },
    {
      id: 'arrived',
      label: 'Helper Arrived',
      desc: 'Helper arrived at the assistance location',
      timestamp: request.arrivedAt,
      isCompleted: Boolean(request.arrivedAt),
      isCurrent: request.status === 'IN_PROGRESS' && Boolean(request.arrivedAt) && !request.assistanceStartedAt,
    },
    {
      id: 'started',
      label: 'Assistance In Progress',
      desc: 'Helper actively providing the requested assistance',
      timestamp: request.assistanceStartedAt,
      isCompleted: Boolean(request.assistanceStartedAt),
      isCurrent: request.status === 'IN_PROGRESS' && Boolean(request.assistanceStartedAt),
    },
    {
      id: 'completed',
      label: 'Assistance Completed',
      desc: 'Helper marked assistance as successfully delivered',
      timestamp: request.completedAt,
      isCompleted: ['AWAITING_CONFIRMATION', 'COMPLETED_CONFIRMED', 'COMPLETED_UNCONFIRMED'].includes(request.status),
      isCurrent: request.status === 'AWAITING_CONFIRMATION',
    },
    {
      id: 'confirmed',
      label: 'Requester Confirmation',
      desc: 'Requester confirmed receipt & Digital Proof generated',
      timestamp: request.confirmedAt,
      isCompleted: request.status === 'COMPLETED_CONFIRMED',
      isCurrent: request.status === 'COMPLETED_CONFIRMED',
    },
  ];

  const handleAction = async (actionFn: () => Promise<void>) => {
    setLoadingAction(true);
    setError(null);
    try {
      await actionFn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setError('Please provide a mandatory cancellation reason.');
      return;
    }
    await handleAction(() => cancelRequestWithReason(request.requestId, cancelReason));
    setCancelling(false);
  };

  const handleHelperRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedRejectReason === 'Other' && customReason.trim() ? customReason.trim() : selectedRejectReason;
    await handleAction(async () => {
      await rejectProvideHelp(request.requestId, uid, finalReason);
      setShowRejectModal(false);
    });
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracking-modal-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-950/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center shrink-0">
                <Navigation size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="tracking-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                    Assistance Tracking &amp; Backup System
                  </h2>
                  <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {request.requestId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                  {request.title}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tracking view"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* MULTI-HELPER SELECTION & REJECTION BANNER */}
            {isRequester && (roundAcceptances.length > 1 || isSelectedHelperUnavailable) && (
              <div className="space-y-4">
                {isSelectedHelperUnavailable && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Your selected helper is unavailable.</p>
                      <p className="mt-0.5">
                        Don&apos;t worry! Other accepted helpers are ready to assist you. Choose one of the available backup helpers below:
                      </p>
                    </div>
                  </div>
                )}

                {/* List Accepted Helpers for Selection */}
                <div className="glass-card p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Accepted Helpers ({roundAcceptances.length}/3)
                  </p>
                  <div className="space-y-2.5">
                    {roundAcceptances.map((h, idx) => {
                      const isSelected = h.helperId === request.selectedHelperId || h.isSelected;
                      const isUnavailable = ['UNAVAILABLE', 'REJECTED'].includes(h.acceptanceStatus);
                      return (
                        <div
                          key={h.helperId || h.id}
                          className={cn(
                            'p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all',
                            isSelected && !isUnavailable
                              ? 'bg-blue-50/80 dark:bg-blue-950/50 border-brand-blue'
                              : isUnavailable
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-60'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shrink-0">
                              <UserIcon size={16} className="text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                                {h.helperDisplayName}
                                {h.helperVerified && <ShieldCheck size={13} className="text-brand-blue" />}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {h.approximateDistance} km away · ETA ~{h.estimatedArrival} mins ·{' '}
                                <strong className={isUnavailable ? 'text-red-600' : 'text-brand-green'}>
                                  {h.acceptanceStatus}
                                </strong>
                                {h.rejectionReason && ` (${h.rejectionReason})`}
                              </p>
                            </div>
                          </div>

                          {!isUnavailable && !isSelected && (
                            <button
                              type="button"
                              disabled={loadingAction}
                              onClick={() => handleAction(() => selectHelper(request.requestId, h.helperId))}
                              className="px-3.5 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 shrink-0"
                            >
                              Choose Helper {idx + 1}
                            </button>
                          )}
                          {isSelected && !isUnavailable && (
                            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0">
                              Selected Helper
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SELECTED HELPER CONFIRM / REJECT BANNER */}
            {isAssignedHelper && selectedHelperInfo && selectedHelperInfo.acceptanceStatus === 'SELECTED' && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-200 uppercase tracking-wider">
                  <UserCheck size={16} />
                  <span>Selection Confirmation Required</span>
                </div>
                <h3 className="text-lg font-extrabold">
                  You have been selected to provide assistance!
                </h3>
                <p className="text-xs text-blue-100 leading-relaxed">
                  The requester has chosen you for this request. Please confirm if you can proceed or notify if you are unavailable.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => handleAction(() => confirmProvideHelp(request.requestId, uid))}
                    className="px-5 py-2.5 rounded-xl bg-white text-slate-950 text-xs font-extrabold hover:bg-cyan-50 shadow-md inline-flex items-center gap-2"
                  >
                    <Check size={15} /> Confirm and Provide Help
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold inline-flex items-center gap-2"
                  >
                    <UserX size={15} /> I Cannot Come
                  </button>
                </div>
              </div>
            )}

            {/* Summary Card (When helper is active and available) */}
            {selectedHelperInfo && !['UNAVAILABLE', 'REJECTED'].includes(selectedHelperInfo.acceptanceStatus) && (
              <div className="glass-card p-5 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Assigned Helper
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                        <UserIcon size={18} className="text-slate-500" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          {selectedHelperInfo.helperDisplayName}
                          {selectedHelperInfo.helperVerified && (
                            <ShieldCheck size={14} className="text-brand-blue" aria-label="Verified Helper" />
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          ⭐ {selectedHelperInfo.rating || 4.9} Rating · Verified Community Member
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChat(true)}
                      className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <MessageSquare size={15} /> Chat
                    </button>
                    <a
                      href="tel:919876543210"
                      aria-label="Call helper or support"
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <PhoneCall size={16} />
                    </a>
                  </div>
                </div>

                {/* Location & ETA banner */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <MapPin size={15} className="text-brand-blue" />
                    <span>Location: <strong className="text-slate-900 dark:text-white">{request.location}</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-brand-green font-semibold inline-flex items-center gap-1">
                      <Clock size={14} /> ETA ~{selectedHelperInfo.estimatedArrival || 8} mins
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-slate-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={locationSharing}
                        onChange={(e) => setLocationSharing(e.target.checked)}
                        className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                      <span>Live GPS sharing</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Helper Control Action Bar */}
            {isAssignedHelper && selectedHelperInfo && !['UNAVAILABLE', 'REJECTED'].includes(selectedHelperInfo.acceptanceStatus) && !['COMPLETED_CONFIRMED', 'CANCELLED'].includes(request.status) && (
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wide">
                    Helper Progress Controls
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="text-xs text-red-600 dark:text-red-400 font-semibold hover:underline"
                  >
                    I Cannot Come
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={loadingAction || Boolean(request.journeyStartedAt)}
                    onClick={() => handleAction(() => startJourney(request.requestId))}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-brand-blue disabled:opacity-50"
                  >
                    {request.journeyStartedAt ? '✓ Journey Started' : '1. Start Journey'}
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction || !request.journeyStartedAt || Boolean(request.arrivedAt)}
                    onClick={() => handleAction(() => markArrived(request.requestId))}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-brand-blue disabled:opacity-50"
                  >
                    {request.arrivedAt ? '✓ Arrived' : '2. Mark as Arrived'}
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction || !request.arrivedAt || Boolean(request.assistanceStartedAt)}
                    onClick={() => handleAction(() => startAssistanceProgress(request.requestId))}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-brand-blue disabled:opacity-50"
                  >
                    {request.assistanceStartedAt ? '✓ Assistance Started' : '3. Start Assistance'}
                  </button>
                  <button
                    type="button"
                    disabled={loadingAction || !request.assistanceStartedAt || request.status === 'AWAITING_CONFIRMATION'}
                    onClick={() => setCompletingReq(request)}
                    className="px-3.5 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 ml-auto"
                  >
                    4. Mark as Completed
                  </button>
                </div>
              </div>
            )}

            {/* Requester Action Bar */}
            {isRequester && request.status === 'AWAITING_CONFIRMATION' && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Assistance Marked Completed by Helper
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Please confirm receipt to generate your verified Digital Proof of Help.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingReq(request)}
                  className="px-4 py-2.5 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-green-700 shrink-0"
                >
                  Confirm Help Received
                </button>
              </div>
            )}

            {error && (
              <p className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3" role="alert">
                {error}
              </p>
            )}

            {/* Vertical Progress Timeline */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Progress Timeline</h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {stages.map((st, i) => {
                  const isDone = st.isCompleted;
                  const isCurrent = st.isCurrent;
                  return (
                    <div key={st.id} className="relative flex items-start gap-4">
                      <div
                        className={cn(
                          'absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                          isDone
                            ? 'bg-brand-green border-brand-green text-white shadow-sm'
                            : isCurrent
                            ? 'bg-brand-blue border-brand-blue text-white animate-pulse ring-4 ring-blue-500/20'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400'
                        )}
                      >
                        {isDone ? <Check size={11} className="stroke-[3]" /> : i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm font-bold',
                              isDone || isCurrent
                                ? 'text-slate-900 dark:text-white'
                                : 'text-slate-400 dark:text-slate-600'
                            )}
                          >
                            {st.label}
                          </p>
                          {st.timestamp && (
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                              {formatDisplayDate(String(st.timestamp))}
                            </span>
                          )}
                        </div>
                        <p
                          className={cn(
                            'text-xs mt-0.5',
                            isDone || isCurrent
                              ? 'text-slate-600 dark:text-slate-300'
                              : 'text-slate-400 dark:text-slate-600'
                          )}
                        >
                          {st.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cancellation / Report Section */}
            {!['COMPLETED_CONFIRMED', 'CANCELLED'].includes(request.status) && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {!cancelling ? (
                  <button
                    type="button"
                    onClick={() => setCancelling(true)}
                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline"
                  >
                    Cancel Assistance Request
                  </button>
                ) : (
                  <form onSubmit={handleCancelSubmit} className="w-full space-y-3 bg-red-50/50 dark:bg-red-950/30 p-4 rounded-2xl border border-red-200 dark:border-red-900">
                    <p className="text-xs font-bold text-red-800 dark:text-red-300">
                      Mandatory Cancellation Reason
                    </p>
                    <input
                      type="text"
                      maxLength={500}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Issue resolved independently or emergency schedule change..."
                      className="w-full px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setCancelling(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Keep Request
                      </button>
                      <button
                        type="submit"
                        disabled={loadingAction || !cancelReason.trim()}
                        className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm Cancellation
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Helper Rejection Confirmation Modal ("I Cannot Come") */}
      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Helper Rejection Confirmation"
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-600 flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cannot Provide Assistance?
                  </h3>
                  <p className="text-xs text-slate-500">Are you sure you cannot come?</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleHelperRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Select Cancellation Reason:
                </label>
                <div className="space-y-2">
                  {REJECTION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-colors',
                        selectedRejectReason === reason
                          ? 'border-brand-blue bg-blue-50/60 dark:bg-blue-950/50 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      )}
                    >
                      <input
                        type="radio"
                        name="rejectReason"
                        checked={selectedRejectReason === reason}
                        onChange={() => setSelectedRejectReason(reason)}
                        className="text-brand-blue focus:ring-brand-blue"
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedRejectReason === 'Other' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Please specify details:
                  </label>
                  <input
                    type="text"
                    required
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Keep Assignment
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow-md disabled:opacity-50"
                >
                  Confirm Unavailable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showChat && <ChatModal request={request} onClose={() => setShowChat(false)} />}

      <HelpCompletionModal
        request={completingReq}
        onClose={() => setCompletingReq(null)}
        onSubmit={async () => {}}
      />

      <RequesterConfirmationModal
        request={confirmingReq}
        submission={submissions.find((s) => s.requestId === confirmingReq?.requestId) ?? null}
        onClose={() => setConfirmingReq(null)}
        onConfirmReceived={confirmAssistance}
        onNotYetReceived={markNotYetReceived}
        onReportIssue={reportIssue}
        onProofReady={() => {}}
      />
    </AnimatePresence>
  );
}
