import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Droplet,
  Building2,
  MapPin,
  Clock,
  Phone,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Lock,
  Navigation,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { BloodDonorMatch, BloodRequest, BloodRequestPrivateContact } from '../types';
import { useAppContext } from '../context/AppContext';
import {
  BLOOD_STATUS_META,
  EMERGENCY_LEVEL_META,
} from '../lib/bloodMatching';
import { formatDisplayDateTime } from '../lib/statusHelpers';
import { HospitalLocationMap } from './HospitalLocationMap';
import { cn } from '../lib/utils';

interface BloodRequestDetailsModalProps {
  request: BloodRequest | null;
  match?: BloodDonorMatch | null;
  onClose: () => void;
  onOpenChat: (request: BloodRequest, partnerId: string, partnerName: string) => void;
}

export function BloodRequestDetailsModal({
  request,
  match,
  onClose,
  onOpenChat,
}: BloodRequestDetailsModalProps) {
  const {
    firebaseUser,
    getBloodRequestPrivateContact,
    respondToBloodRequest,
  } = useAppContext();

  const [privateContact, setPrivateContact] = useState<BloodRequestPrivateContact | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = firebaseUser?.uid || '';

  useEffect(() => {
    let active = true;
    setPrivateContact(null);
    setRejectMode(false);
    setRejectReason('');
    setError(null);

    if (request) {
      void getBloodRequestPrivateContact(request.bloodRequestId).then((res) => {
        if (active) setPrivateContact(res);
      });
    }
    return () => {
      active = false;
    };
  }, [request, getBloodRequestPrivateContact]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!request) return null;

  const isRequester = uid === request.requesterId;
  const isAuthorizedForContact =
    isRequester || Boolean(privateContact?.contactPhoneNumber) || request.selectedDonorIds.includes(uid);
  const isClosed = ['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(request.status);

  const statusMeta = BLOOD_STATUS_META[request.status] || BLOOD_STATUS_META.REQUEST_SUBMITTED;
  const emergMeta = EMERGENCY_LEVEL_META[request.emergencyLevel] || EMERGENCY_LEVEL_META.Normal;

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await respondToBloodRequest(request.bloodRequestId, 'INTERESTED');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit acceptance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await respondToBloodRequest(request.bloodRequestId, 'REJECTED', rejectReason);
      setRejectMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to decline request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/55 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="blood-req-details-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-red-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-red-100 dark:border-slate-800 bg-red-50/60 dark:bg-slate-950 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center shrink-0 shadow-sm">
                <span className="text-base font-black leading-none">{request.requiredBloodGroup}</span>
                <span className="text-[9px] font-bold uppercase opacity-90 mt-0.5">Blood</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="blood-req-details-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                    Request <span className="font-mono text-red-600 dark:text-red-400">{request.bloodRequestId}</span>
                  </h2>
                  <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', emergMeta.badgeClass)}>
                    {emergMeta.label}
                  </span>
                  <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', statusMeta.badgeClass)}>
                    {statusMeta.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Submitted {formatDisplayDateTime(request.createdAt)} · Requested by {request.requesterDisplayName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close blood request details"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Key Medical Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
                <span className="text-slate-500 dark:text-slate-400 block">Required Blood</span>
                <span className="text-lg font-black text-red-600 dark:text-red-400 tabular-nums">
                  {request.requiredBloodGroup}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block">Units Needed</span>
                <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                  {request.confirmedUnits} / {request.requiredUnits}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block">Patient (Masked)</span>
                <span className="font-bold text-slate-900 dark:text-white block truncate mt-0.5">
                  {isAuthorizedForContact && privateContact?.patientFullName
                    ? privateContact.patientFullName
                    : request.patientDisplayName}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block">Required By</span>
                <span className="font-bold text-slate-900 dark:text-white block mt-0.5 tabular-nums">
                  {request.requiredDateTime}
                </span>
              </div>
            </div>

            {/* Hospital & Distance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-white dark:bg-slate-900/60">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <Building2 size={16} className="text-red-600" />
                    <span>{request.hospitalName}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span>
                      {request.hospitalAddress}, {request.location}, {request.city}
                    </span>
                  </p>
                  {match && (
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-1">
                      <Navigation size={12} />
                      <span>
                        Approx. {match.distanceKm} km from your registered donor location ·{' '}
                        {match.compatibilityType === 'EXACT' ? 'Exact Group Match' : 'Compatible RBC Match'}
                      </span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowMap((s) => !s)}
                  className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-100"
                >
                  {showMap ? 'Hide Hospital Map' : 'View Hospital Location'}
                </button>
              </div>

              {showMap && (
                <HospitalLocationMap
                  hospitalName={request.hospitalName}
                  hospitalAddress={request.hospitalAddress}
                  city={request.city}
                  latitude={request.latitude}
                  longitude={request.longitude}
                  heightClass="h-52"
                />
              )}
            </div>

            {/* Contact Protection Block */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  {isAuthorizedForContact ? (
                    <ShieldCheck size={14} className="text-emerald-600" />
                  ) : (
                    <Lock size={14} className="text-slate-400" />
                  )}
                  Authorized Contact Information
                </h3>
                <span className="text-[11px] font-semibold text-slate-500">
                  Contact Person: <strong className="text-slate-800 dark:text-slate-200">{request.contactPersonName}</strong>
                </span>
              </div>

              {isAuthorizedForContact && privateContact?.contactPhoneNumber ? (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white font-mono">
                    <Phone size={15} className="text-emerald-600" />
                    <span>{privateContact.contactPhoneNumber}</span>
                  </div>
                  <a
                    href={`tel:${privateContact.contactPhoneNumber}`}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                  >
                    Call Hospital Contact
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Phone numbers and full patient identity remain PII-protected until the requester selects you as an authorized donor or explicitly shares contact in direct chat.
                </p>
              )}

              {request.additionalMedicalInfo && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold">Medical Notes: </span>
                  {request.additionalMedicalInfo}
                </div>
              )}
            </div>

            {/* Medical Verification & Safety Disclaimer */}
            <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 flex items-start gap-3">
              <ShieldAlert size={18} className="text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold">Medical Screening & Verification Notice</p>
                <p className="leading-relaxed">
                  Registered donor blood group profiles do not guarantee medical eligibility. Final blood typing, cross-matching, hemoglobin screening, and donor suitability confirmation must be performed by qualified medical professionals and the hospital blood bank prior to donation.
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {rejectMode && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Reason for declining (optional)
                </label>
                <input
                  type="text"
                  maxLength={300}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="E.g., Recently donated, traveling, or out of area"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleReject()}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                  >
                    Confirm Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectMode(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center gap-3">
            {!isRequester && match && !isClosed && (
              <>
                {match.responseStatus === 'NOTIFIED' && (
                  <>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void handleAccept()}
                      className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 inline-flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 size={16} />
                      <span>Accept Request (I'm Interested)</span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setRejectMode(true)}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={15} />
                      <span>Decline</span>
                    </button>
                  </>
                )}

                {['INTERESTED', 'SELECTED', 'SCHEDULED'].includes(match.responseStatus) && (
                  <button
                    type="button"
                    onClick={() => onOpenChat(request, request.requesterId, request.requesterDisplayName)}
                    className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 inline-flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} />
                    <span>Message Requester</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 ml-auto"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
