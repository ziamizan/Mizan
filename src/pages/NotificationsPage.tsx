import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Droplet,
  Utensils,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';
import { RequesterConfirmationModal } from '../components/RequesterConfirmationModal';
import { DigitalProofCertificate } from '../components/DigitalProofCertificate';
import { BloodRequestDetailsModal } from '../components/BloodRequestDetailsModal';
import { BloodChatModal } from '../components/BloodChatModal';
import { BloodRequest, DigitalProof, HelpRequest } from '../types';
import { formatDisplayDateTime } from '../lib/statusHelpers';
import { cn } from '../lib/utils';

export function NotificationsPage() {
  const navigate = useNavigate();
  const {
    firebaseUser,
    authReady,
    notifications,
    requests,
    proofs,
    submissions,
    bloodRequests,
    bloodDonorMatches,
    markNotificationRead,
    markAllNotificationsRead,
    confirmAssistance,
    markNotYetReceived,
    reportIssue,
    respondToBloodRequest,
  } = useAppContext();

  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [confirmingReq, setConfirmingReq] = useState<HelpRequest | null>(null);
  const [activeProof, setActiveProof] = useState<DigitalProof | null>(null);
  const [activeBloodReq, setActiveBloodReq] = useState<BloodRequest | null>(null);
  const [bloodChatState, setBloodChatState] = useState<{
    request: BloodRequest;
    partnerId: string;
    partnerName: string;
  } | null>(null);
  const [bloodBusyId, setBloodBusyId] = useState<string | null>(null);
  const [bloodNotice, setBloodNotice] = useState<string | null>(null);

  if (!authReady) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-3">
        <div className="h-8 w-44 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthGateCard
        title="Sign in to View Notifications"
        description="Stay updated in real time when helpers accept your requests, submit completion, or when your Digital Proof of Help is ready."
      />
    );
  }

  const uid = firebaseUser.uid;
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visible = tab === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const getIcon = (type: string) => {
    if (type.startsWith('BLOOD_')) {
      return <Droplet size={18} className="text-red-600 fill-red-600/20" />;
    }
    if (type.startsWith('FOOD_')) {
      return <Utensils size={18} className="text-emerald-600" />;
    }
    switch (type) {
      case 'PROOF_GENERATED':
        return <FileCheck2 size={18} className="text-brand-green" />;
      case 'CONFIRMATION_NEEDED':
        return <ShieldCheck size={18} className="text-amber-600" />;
      case 'ISSUE_REPORTED':
      case 'NOT_RECEIVED':
        return <AlertTriangle size={18} className="text-red-600" />;
      default:
        return <CheckCircle2 size={18} className="text-brand-blue" />;
    }
  };

  const handleQuickBloodInterested = async (notifId: string, bloodRequestId: string) => {
    setBloodBusyId(bloodRequestId);
    setBloodNotice(null);
    try {
      await markNotificationRead(notifId);
      await respondToBloodRequest(bloodRequestId, 'INTERESTED');
      setBloodNotice(`Accepted blood request ${bloodRequestId}. The requester has been notified!`);
    } catch (err) {
      setBloodNotice(err instanceof Error ? err.message : 'Unable to accept blood request.');
    } finally {
      setBloodBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Notifications Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 tabular-nums">
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllNotificationsRead()}
            className="px-4 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <CheckCheck size={15} /> Mark all as read
          </button>
        )}
      </div>

      {bloodNotice && (
        <div className="rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-semibold text-red-800 dark:text-red-200">
          {bloodNotice}
        </div>
      )}

      <div className="inline-flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
            tab === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          )}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('unread')}
          className={cn(
            'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
            tab === 'unread'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400'
          )}
        >
          Unread ({unreadCount})
        </button>
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-2">
            <Bell size={28} className="mx-auto text-slate-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              You are all caught up
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Real-time notifications for blood donor broadcasts, accepted requests, completion confirmations, and Digital Proofs appear here.
            </p>
          </div>
        ) : (
          visible.map((notif) => {
            const linkedReq = notif.requestId
              ? requests.find((r) => r.requestId === notif.requestId)
              : undefined;
            const linkedProof = notif.proofId
              ? proofs.find((p) => p.proofId === notif.proofId)
              : undefined;
            const linkedBloodReq = notif.bloodRequestId
              ? bloodRequests.find((r) => r.bloodRequestId === notif.bloodRequestId)
              : undefined;
            const linkedBloodMatch = notif.bloodRequestId
              ? bloodDonorMatches.find(
                  (m) => m.bloodRequestId === notif.bloodRequestId && m.donorId === uid
                )
              : undefined;

            const isBloodNotif = notif.notificationType.startsWith('BLOOD_');
            const isFoodNotif = notif.notificationType.startsWith('FOOD_');
            const canQuickAcceptBlood =
              notif.notificationType === 'BLOOD_REQUEST_MATCH' &&
              Boolean(notif.bloodRequestId) &&
              linkedBloodMatch?.responseStatus === 'NOTIFIED' &&
              linkedBloodReq &&
              !['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(linkedBloodReq.status);

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) void markNotificationRead(notif.id);
                }}
                className={cn(
                  'glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-colors',
                  !notif.isRead &&
                    (isBloodNotif
                      ? 'border-red-300 dark:border-red-900 bg-red-50/40 dark:bg-red-950/20'
                      : isFoodNotif
                        ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-brand-blue/40 bg-blue-50/40 dark:bg-blue-950/20')
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shrink-0">
                    {getIcon(notif.notificationType)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {notif.title}
                      </h3>
                      {!notif.isRead && (
                        <span
                          className={cn(
                            'text-[11px] font-semibold',
                            isBloodNotif
                              ? 'text-red-600'
                              : isFoodNotif
                                ? 'text-emerald-600'
                                : 'text-brand-blue'
                          )}
                        >
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{notif.message}</p>
                    <p className="text-xs text-slate-400 tabular-nums">
                      {formatDisplayDateTime(notif.createdAt)}
                      {notif.bloodRequestId
                        ? ` · ${notif.bloodRequestId}`
                        : notif.foodDonationId
                          ? ` · ${notif.foodDonationId}`
                          : notif.foodAssistanceId
                            ? ` · ${notif.foodAssistanceId}`
                            : notif.requestId
                              ? ` · ${notif.requestId}`
                              : ''}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {notif.bloodRequestId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notif.isRead) void markNotificationRead(notif.id);
                        if (linkedBloodReq) {
                          setActiveBloodReq(linkedBloodReq);
                        } else {
                          navigate(notif.actionUrl || `/blood?requestId=${notif.bloodRequestId}`);
                        }
                      }}
                      className="px-3.5 py-2 min-h-[38px] rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-slate-900 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-50"
                    >
                      View Request
                    </button>
                  )}

                  {canQuickAcceptBlood && notif.bloodRequestId && (
                    <button
                      type="button"
                      disabled={bloodBusyId === notif.bloodRequestId}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleQuickBloodInterested(notif.id, notif.bloodRequestId!);
                      }}
                      className="px-3.5 py-2 min-h-[38px] rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-60"
                    >
                      I'm Interested
                    </button>
                  )}

                  {notif.notificationType === 'CONFIRMATION_NEEDED' &&
                    linkedReq &&
                    linkedReq.status === 'AWAITING_CONFIRMATION' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!notif.isRead) void markNotificationRead(notif.id);
                          setConfirmingReq(linkedReq);
                        }}
                        className="px-4 py-2 min-h-[40px] rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-green-700"
                      >
                        Confirm Receipt
                      </button>
                    )}

                  {linkedProof && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notif.isRead) void markNotificationRead(notif.id);
                        setActiveProof(linkedProof);
                      }}
                      className="px-4 py-2 min-h-[40px] rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700"
                    >
                      View Proof
                    </button>
                  )}

                  {isFoodNotif && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!notif.isRead) void markNotificationRead(notif.id);
                        navigate(
                          notif.actionUrl ||
                            (notif.foodAssistanceId ? '/food-assistance' : '/food')
                        );
                      }}
                      className="px-3.5 py-2 min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                    >
                      Open Food Portal
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

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

      <BloodRequestDetailsModal
        request={activeBloodReq}
        match={
          activeBloodReq
            ? bloodDonorMatches.find(
                (m) => m.bloodRequestId === activeBloodReq.bloodRequestId && m.donorId === uid
              ) || null
            : null
        }
        onClose={() => setActiveBloodReq(null)}
        onOpenChat={(req, partnerId, partnerName) => {
          setActiveBloodReq(null);
          setBloodChatState({ request: req, partnerId, partnerName });
        }}
      />

      <BloodChatModal
        bloodRequest={bloodChatState?.request || null}
        partnerId={bloodChatState?.partnerId || ''}
        partnerName={bloodChatState?.partnerName || ''}
        onClose={() => setBloodChatState(null)}
      />
    </div>
  );
}
