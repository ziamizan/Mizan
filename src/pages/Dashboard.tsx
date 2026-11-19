import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import {
  AlertCircle,
  MapPin,
  Clock,
  CheckCircle2,
  Droplet,
  HandCoins,
  Utensils,
  Heart,
  Receipt,
  ShieldCheck,
  FileCheck2,
  LogIn,
  Search,
  MessageSquare,
  Navigation,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DigitalProof, DonationRecord, HelpRequest, HelperAcceptance } from '../types';
import { DonationModal } from '../components/DonationModal';
import { RequestDetailsModal } from '../components/RequestDetailsModal';
import { HelpCompletionModal } from '../components/HelpCompletionModal';
import { RequesterConfirmationModal } from '../components/RequesterConfirmationModal';
import { DigitalProofCertificate } from '../components/DigitalProofCertificate';
import { ChatModal } from '../components/ChatModal';
import { AssistanceTrackingModal } from '../components/AssistanceTrackingModal';
import { HelperAcceptanceProgressBar } from '../components/HelperAcceptanceProgressBar';
import { ThreeHelperSelectionSection } from '../components/ThreeHelperSelectionSection';
import { HelperResponseModal } from '../components/HelperResponseModal';
import { REQUEST_STATUS_META } from '../lib/statusHelpers';

const QUICK_AMOUNTS = [100, 500, 1000] as const;

export function Dashboard() {
  const {
    firebaseUser,
    requests,
    proofs,
    submissions,
    donations,
    signInWithGoogle,
    acceptRequest,
    submitCompletion,
    confirmAssistance,
    markNotYetReceived,
    reportIssue,
    donateToRequest,
    helperAcceptances,
    acceptRequestSlot,
    selectHelper,
    confirmProvideHelp,
    rejectProvideHelp,
  } = useAppContext();

  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get('q') || '').trim().toLowerCase();

  const [filter, setFilter] = useState<string>('All');
  const [selectedAmounts, setSelectedAmounts] = useState<Record<string, number>>({});
  const [customModeByReq, setCustomModeByReq] = useState<Record<string, boolean>>({});
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);

  const [donationTarget, setDonationTarget] = useState<{
    request: HelpRequest | null;
    initialAmount: number;
    receipt?: DonationRecord | null;
  } | null>(null);
  const [detailsRequest, setDetailsRequest] = useState<HelpRequest | null>(null);
  const [completingReq, setCompletingReq] = useState<HelpRequest | null>(null);
  const [confirmingReq, setConfirmingReq] = useState<HelpRequest | null>(null);
  const [activeProof, setActiveProof] = useState<DigitalProof | null>(null);
  const [chatReq, setChatReq] = useState<HelpRequest | null>(null);
  const [trackingReq, setTrackingReq] = useState<HelpRequest | null>(null);

  // 3-Helper System modals & selection
  const [selectionRequest, setSelectionRequest] = useState<HelpRequest | null>(null);
  const [helperResponseTarget, setHelperResponseTarget] = useState<{
    request: HelpRequest;
    acceptance: HelperAcceptance;
  } | null>(null);

  const filters = ['All', 'Emergency', 'Blood', 'Money', 'Food', 'Other'];
  const uid = firebaseUser?.uid || '';

  const filteredRequests = React.useMemo(() => {
    return requests.filter((r) => {
      const matchesCategory = filter === 'All' || r.category === filter;
      if (!matchesCategory) return false;

      if (!searchQuery) return true;
      const text = `${r.title} ${r.description} ${r.category} ${r.location} ${r.bloodGroup || ''} ${r.requesterName} ${r.requestId}`.toLowerCase();
      return text.includes(searchQuery);
    });
  }, [requests, filter, searchQuery]);

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

  const getActiveAmountForRequest = (reqId: string) => {
    if (customModeByReq[reqId]) {
      const parsed = Number((customInputs[reqId] ?? '').replace(/[^0-9]/g, ''));
      return parsed > 0 ? parsed : 500;
    }
    return selectedAmounts[reqId] ?? 500;
  };

  const handleSelectPresetAmount = (reqId: string, amount: number) => {
    setCustomModeByReq((prev) => ({ ...prev, [reqId]: false }));
    setSelectedAmounts((prev) => ({ ...prev, [reqId]: amount }));
  };

  const handleSelectCustomAmount = (reqId: string) => {
    setCustomModeByReq((prev) => ({ ...prev, [reqId]: true }));
  };

  const handleOpenDonation = (req: HelpRequest) => {
    setDonationTarget({
      request: req,
      initialAmount: getActiveAmountForRequest(req.id),
      receipt: null,
    });
  };

  const handleAcceptSlot = async (req: HelpRequest) => {
    setActionError(null);
    if (!firebaseUser) {
      try {
        await signInWithGoogle();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Please sign in to offer help.');
      }
      return;
    }
    try {
      await acceptRequestSlot(req.requestId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to accept request.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
            How can we help today?
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Smart multi-helper matching · Max 3 helpers per round.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/proofs"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5"
          >
            <FileCheck2 size={14} className="text-brand-blue" /> My Digital Proofs
          </Link>
        </div>
      </div>

      {!firebaseUser && (
        <div className="mb-6 glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            Sign in with Google to accept requests, submit completion evidence, and generate Digital Proofs of Help.
          </p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="px-4 py-2 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <LogIn size={14} /> Sign In
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {actionError}
        </div>
      )}

      {searchQuery && (
        <div className="mb-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 min-w-0 pr-3">
            <Search size={16} className="text-brand-blue shrink-0" />
            <span className="truncate">
              Search results for: <strong className="font-bold text-slate-900 dark:text-white">"{searchQuery}"</strong> ({filteredRequests.length} found)
            </span>
          </div>
          <Link
            to="/feed"
            className="text-xs font-bold text-brand-blue hover:underline shrink-0"
          >
            Clear Search
          </Link>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2.5 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'px-5 py-2 min-h-[40px] rounded-full font-medium whitespace-nowrap shrink-0 transition-all',
              filter === f
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Recent Donations Receipt Bar */}
      {donations.length > 0 && (
        <div className="mb-6 glass-card p-5 border border-emerald-200/80 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <ShieldCheck size={18} className="text-brand-green" />
              <span>Your Recent Donations ({donations.length})</span>
            </div>
            <span className="text-xs text-slate-500">Click any receipt to view or copy</span>
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {donations.slice(0, 3).map((don) => (
              <button
                key={don.id}
                type="button"
                onClick={() =>
                  setDonationTarget({
                    request: requests.find((r) => r.requestId === don.requestId) ?? null,
                    initialAmount: don.amount,
                    receipt: don,
                  })
                }
                className="w-full py-2.5 flex items-center justify-between text-left hover:bg-white/60 dark:hover:bg-slate-900/50 px-2 rounded-lg transition-colors"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    Donated to {don.recipientName}
                  </p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {don.transactionRef} · {don.paymentMethod}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-brand-green tabular-nums">
                    ₹{don.amount.toLocaleString('en-IN')}
                  </span>
                  <Receipt size={15} className="text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-6">
        {filteredRequests.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <p className="text-slate-700 dark:text-slate-200 font-semibold mb-1">
              No active requests in this category
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Create a new request or switch filters to see community needs.
            </p>
            <button
              type="button"
              onClick={() => setFilter('All')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold"
            >
              Show All Requests
            </button>
          </div>
        ) : (
          filteredRequests.map((req, i) => {
            const isMoney = req.category === 'Money' && req.amountNeeded !== undefined;
            const amountNeeded = req.amountNeeded ?? 0;
            const amountCollected = req.amountCollected ?? 0;
            const fundedPercent =
              amountNeeded > 0
                ? Math.min(100, Math.round((amountCollected / amountNeeded) * 100))
                : 0;
            const isGoalReached = isMoney && amountCollected >= amountNeeded;
            const selectedAmt = getActiveAmountForRequest(req.id);
            const isCustomActive = Boolean(customModeByReq[req.id]);

            const isRequester = Boolean(uid && req.requesterId === uid);
            const isHelper = Boolean(uid && req.helperId === uid);
            const statusMeta = REQUEST_STATUS_META[req.status];
            const linkedProof = proofs.find((p) => p.requestId === req.requestId);

            return (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.25) }}
                key={req.id}
                className="glass-card p-6 relative overflow-hidden"
              >
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                      {getCategoryIcon(req.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                        <span>{req.title || `${req.category} Needed`}</span>
                        {req.requesterVerified && (
                          <CheckCircle2
                            size={16}
                            className="text-brand-blue"
                            aria-label="Verified User"
                          />
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {req.requestId}
                        </span>
                        <span aria-hidden="true"> · </span>
                        {req.requesterName}
                        <span aria-hidden="true"> · </span>
                        {req.category}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold whitespace-nowrap shrink-0',
                      statusMeta.badgeClass
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta.dotColor)} />
                    {isGoalReached ? 'Goal Reached' : statusMeta.label}
                  </span>
                </div>

                <p className="text-slate-800 dark:text-slate-200 text-base mb-4 font-medium">
                  {req.description}
                </p>

                {/* 3-Helper Live Acceptance Limit Progress Bar (Rules 1 & 2) */}
                {req.category !== 'Money' && (
                  <HelperAcceptanceProgressBar
                    request={req}
                    acceptances={helperAcceptances.filter((a) => a.requestId === req.requestId)}
                    className="mb-4"
                  />
                )}

                {req.bloodGroup && (
                  <p className="text-brand-red font-bold text-sm mb-4 tabular-nums">
                    {req.bloodGroup} Blood Required · {req.units} units
                  </p>
                )}

                {isMoney && (
                  <div className="mb-5 space-y-4">
                    <div>
                      <div className="flex justify-between items-baseline text-sm mb-1.5 font-medium tabular-nums">
                        <span className="text-slate-600 dark:text-slate-400">
                          Amount Collected:{' '}
                          <strong className="text-slate-900 dark:text-white">
                            ₹{amountCollected.toLocaleString('en-IN')}
                          </strong>
                        </span>
                        <span className="text-slate-900 dark:text-white font-semibold">
                          Goal: ₹{amountNeeded.toLocaleString('en-IN')} ({fundedPercent}%)
                        </span>
                      </div>
                      <div
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={fundedPercent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="bg-brand-green h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${fundedPercent}%` }}
                        />
                      </div>
                    </div>

                    {!isGoalReached && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-4 gap-2">
                          {QUICK_AMOUNTS.map((amt) => {
                            const isSelected = !isCustomActive && selectedAmt === amt;
                            return (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => handleSelectPresetAmount(req.id, amt)}
                                className={cn(
                                  'min-h-[40px] py-2 px-2 rounded-xl text-sm font-bold tabular-nums border transition-all',
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-brand-green border-brand-green'
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                )}
                              >
                                ₹{amt.toLocaleString('en-IN')}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => handleSelectCustomAmount(req.id)}
                            className={cn(
                              'min-h-[40px] py-2 px-2 rounded-xl text-sm font-bold border transition-all whitespace-nowrap',
                              isCustomActive
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            )}
                          >
                            Custom
                          </button>
                        </div>

                        {isCustomActive && (
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                              ₹
                            </span>
                            <input
                              type="number"
                              min={10}
                              max={500000}
                              inputMode="numeric"
                              value={customInputs[req.id] ?? ''}
                              onChange={(e) =>
                                setCustomInputs((prev) => ({
                                  ...prev,
                                  [req.id]: e.target.value,
                                }))
                              }
                              placeholder="Enter custom amount (₹)"
                              aria-label="Custom donation amount"
                              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-white tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400 mb-5">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={15} /> {req.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={15} /> {req.time}
                  </div>
                </div>

                {/* Helper State Calculations */}
                {(() => {
                  const reqAcceptances = helperAcceptances.filter(
                    (a) => a.requestId === req.requestId && (a.matchingRound || 1) === (req.matchingRound || 1)
                  );
                  const activeAcceptances = reqAcceptances.filter(
                    (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
                  );
                  const myAcceptance = reqAcceptances.find((a) => a.helperId === uid);
                  const hasUserAccepted = Boolean(myAcceptance && !['UNAVAILABLE', 'REJECTED'].includes(myAcceptance.acceptanceStatus));
                  const isLimitReached = (req.acceptedCount ?? activeAcceptances.length) >= 3 || req.acceptanceClosed || req.status === 'THREE_HELPERS_FOUND';
                  const isSelectedForHelp = Boolean(myAcceptance && (myAcceptance.isSelected || myAcceptance.acceptanceStatus === 'SELECTED' || req.selectedHelperId === uid));
                  const canSelectHelper = isRequester && (isLimitReached || ['THREE_HELPERS_FOUND', 'AWAITING_RECEIVER_SELECTION', 'BACKUP_SELECTION_REQUIRED'].includes(req.status) || activeAcceptances.length >= 3);

                  return (
                    <div className="flex flex-wrap gap-3">
                      {req.category === 'Money' ? (
                        <button
                          type="button"
                          disabled={isGoalReached}
                          onClick={() => handleOpenDonation(req)}
                          className="flex-1 min-h-[44px] bg-brand-green text-white py-3 px-4 rounded-xl font-bold hover:bg-green-700 disabled:bg-emerald-100 disabled:text-emerald-800 transition-colors tabular-nums"
                        >
                          {isGoalReached
                            ? 'Fully Funded ✓'
                            : `Donate ₹${selectedAmt.toLocaleString('en-IN')} Now`}
                        </button>
                      ) : linkedProof ? (
                        <button
                          type="button"
                          onClick={() => setActiveProof(linkedProof)}
                          className="flex-1 min-h-[44px] bg-brand-green text-white py-3 px-4 rounded-xl font-bold hover:bg-green-700 transition-colors inline-flex items-center justify-center gap-2"
                        >
                          <FileCheck2 size={18} /> View Digital Proof
                        </button>
                      ) : isRequester && req.status === 'AWAITING_CONFIRMATION' ? (
                        <button
                          type="button"
                          onClick={() => setConfirmingReq(req)}
                          className="flex-1 min-h-[44px] bg-brand-green text-white py-3 px-4 rounded-xl font-bold hover:bg-green-700 transition-colors"
                        >
                          Confirm Help Received
                        </button>
                      ) : isRequester && canSelectHelper ? (
                        <button
                          type="button"
                          onClick={() => setSelectionRequest(req)}
                          className="flex-1 min-h-[44px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-bold shadow-sm transition-all inline-flex items-center justify-center gap-2"
                        >
                          <Sparkles size={18} />
                          <span>Choose Helper ({activeAcceptances.length} Ready!)</span>
                        </button>
                      ) : isSelectedForHelp && req.status === 'HELPER_SELECTED' ? (
                        <button
                          type="button"
                          onClick={() => setHelperResponseTarget({ request: req, acceptance: myAcceptance! })}
                          className="flex-1 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-slate-900 py-3 px-4 rounded-xl font-black shadow-sm transition-all inline-flex items-center justify-center gap-2 animate-pulse"
                        >
                          <Clock size={18} />
                          <span>Action Required: Confirm / Decline Help</span>
                        </button>
                      ) : isHelper &&
                        ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED_UNCONFIRMED', 'CONFIRMED', 'ON_THE_WAY', 'ARRIVED', 'ASSISTANCE_IN_PROGRESS'].includes(req.status) ? (
                        <button
                          type="button"
                          onClick={() => setCompletingReq(req)}
                          className="flex-1 min-h-[44px] bg-brand-blue text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                          Mark as Completed
                        </button>
                      ) : hasUserAccepted ? (
                        <div className="flex-1 min-h-[44px] bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-brand-blue py-3 px-4 rounded-xl font-bold text-center inline-flex items-center justify-center gap-1.5 text-xs">
                          <CheckCircle2 size={16} />
                          <span>You Accepted (Slot Reserved · Round {req.matchingRound || 1})</span>
                        </div>
                      ) : isLimitReached && !isRequester ? (
                        <button
                          type="button"
                          disabled
                          className="flex-1 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 py-3 px-4 rounded-xl font-bold text-xs cursor-not-allowed border border-slate-200 dark:border-slate-700 inline-flex items-center justify-center gap-1.5"
                        >
                          <ShieldCheck size={16} />
                          <span>3/3 HELPERS FOUND · ACCEPTANCE LIMIT REACHED</span>
                        </button>
                      ) : !isRequester && ['OPEN', 'REQUESTED', 'ONE_HELPER_ACCEPTED', 'TWO_HELPERS_ACCEPTED', 'REOPENED', 'WAITING_FOR_HELPERS'].includes(req.status) ? (
                        <button
                          type="button"
                          onClick={() => void handleAcceptSlot(req)}
                          className="flex-1 min-h-[44px] bg-brand-blue text-white py-3 px-4 rounded-xl font-bold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <span>I Can Help (Slot {Math.min(3, (req.acceptedCount ?? activeAcceptances.length) + 1)}/3)</span>
                        </button>
                      ) : (
                        <Link
                          to="/history"
                          className="flex-1 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 px-4 rounded-xl font-bold text-center inline-flex items-center justify-center"
                        >
                          {isRequester ? 'Manage Request in History' : statusMeta.label}
                        </Link>
                      )}

                      {/* Requester view helpers secondary button */}
                      {isRequester && activeAcceptances.length > 0 && !canSelectHelper && (
                        <button
                          type="button"
                          onClick={() => setSelectionRequest(req)}
                          className="px-3.5 py-3 min-h-[44px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-bold hover:bg-purple-100 transition-colors inline-flex items-center gap-1.5 shrink-0 text-xs"
                          title="View helpers who have accepted so far"
                        >
                          <Users size={15} />
                          <span>Helpers ({activeAcceptances.length}/3)</span>
                        </button>
                      )}

                      {(isRequester || isHelper) && (req.helperId || req.selectedHelperId) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setChatReq(req)}
                            className="px-4 py-3 min-h-[44px] bg-blue-50 dark:bg-blue-950/60 text-brand-blue border border-blue-200 dark:border-blue-800 rounded-xl font-bold hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5 shrink-0"
                            title="Open Coordination Chat"
                          >
                            <MessageSquare size={16} /> Chat
                          </button>
                          <button
                            type="button"
                            onClick={() => setTrackingReq(req)}
                            className="px-4 py-3 min-h-[44px] bg-emerald-50 dark:bg-emerald-950/60 text-brand-green border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1.5 shrink-0"
                            title="Track Live Assistance Progress"
                          >
                            <Navigation size={16} /> Track Progress
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => setDetailsRequest(req)}
                        className="px-6 py-3 min-h-[44px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                      >
                        Details
                      </button>
                    </div>
                  );
                })()}
              </motion.div>
            );
          })
        )}
      </div>

      {donationTarget && (
        <DonationModal
          request={donationTarget.request}
          initialAmount={donationTarget.initialAmount}
          existingReceipt={donationTarget.receipt}
          onClose={() => setDonationTarget(null)}
          onDonate={async (requestId, amount, method, note) => {
            const rec = await donateToRequest(requestId, amount, method, note);
            return rec;
          }}
        />
      )}

      <RequestDetailsModal
        request={detailsRequest}
        onClose={() => setDetailsRequest(null)}
        onDonateClick={(req) => handleOpenDonation(req)}
        onAcceptClick={(id) => {
          const target = requests.find((r) => r.requestId === id || r.id === id);
          if (target) void handleAcceptSlot(target);
        }}
      />

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

      <DigitalProofCertificate proof={activeProof} onClose={() => setActiveProof(null)} />
      <ChatModal request={chatReq} onClose={() => setChatReq(null)} />
      <AssistanceTrackingModal request={trackingReq} onClose={() => setTrackingReq(null)} />

      {/* 3-Helper Selection Modal for Receiver (Rules 3 & 4) */}
      {selectionRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectionRequest(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xl relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectionRequest(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors z-10"
              aria-label="Close Selection Modal"
            >
              <X size={20} />
            </button>

            <ThreeHelperSelectionSection
              request={selectionRequest}
              acceptances={helperAcceptances.filter(
                (a) => a.requestId === selectionRequest.requestId
              )}
              onSelectHelper={async (helperId) => {
                await selectHelper(selectionRequest.requestId, helperId);
                setSelectionRequest(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Helper Confirm / Decline Help Modal (Rule 5 & 6) */}
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
