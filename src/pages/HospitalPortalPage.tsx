import React, { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Droplet,
  Eye,
  Home,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  BloodDonationHistoryRecord,
  BloodDonorMatch,
  BloodEmergencyLevel,
  BloodGroup,
  BloodRequest,
  BloodRequestPrivateContact,
  DonorProfile,
  DonorResponseStatus,
  HospitalBloodStatus,
} from '../types';
import { formatDisplayDateTime } from '../lib/statusHelpers';
import { cn } from '../lib/utils';
import HospitalAnalyticsDashboard from '../components/HospitalAnalyticsDashboard';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const EMERGENCY_LEVELS: BloodEmergencyLevel[] = ['Normal', 'Urgent', 'Critical'];
const HOSPITAL_STATUS_OPTIONS: HospitalBloodStatus[] = [
  'Submitted',
  'Under Hospital Verification',
  'Donor Search Started',
  'Donors Available',
  'Donation Scheduled',
  'Donation Completed',
  'Request Fulfilled',
  'Cancelled',
];

const DONATION_STEPS: Array<{ key: DonorResponseStatus; label: string }> = [
  { key: 'INTERESTED', label: 'Accepted' },
  { key: 'SELECTED', label: 'Selected' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'COMPLETED', label: 'Donated' },
];

type HospitalTab = 'home' | 'blood' | 'donors' | 'history' | 'notifications';
type HistoryRecordType = 'ALL' | 'VERIFIED_DONATIONS' | 'FULFILLED_REQUESTS' | 'CANCELLED_REQUESTS';

interface ChatTarget {
  request: BloodRequest;
  partnerId: string;
  partnerName: string;
  partnerRoleLabel: string;
}

function getStepIndex(status: DonorResponseStatus): number {
  switch (status) {
    case 'COMPLETED':
      return 3;
    case 'SCHEDULED':
      return 2;
    case 'SELECTED':
      return 1;
    default:
      return 0;
  }
}

function getDonorStageLabel(status: DonorResponseStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'Donated';
    case 'SCHEDULED':
      return 'Scheduled';
    case 'SELECTED':
      return 'Selected';
    default:
      return 'Accepted';
  }
}

function getDonorStageTextClass(status: DonorResponseStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'SCHEDULED':
      return 'text-blue-700 dark:text-blue-400';
    case 'SELECTED':
      return 'text-indigo-700 dark:text-indigo-400';
    default:
      return 'text-amber-700 dark:text-amber-400';
  }
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return 'No record yet';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ============================================================
// MEMOIZED CARD: BLOOD REQUEST ITEM (LOCAL DRAFT STATE FOR SPEED)
// ============================================================
interface BloodRequestCardProps {
  req: BloodRequest;
  reqMatches: BloodDonorMatch[];
  unlocked?: BloodRequestPrivateContact;
  isBusy: boolean;
  isLoadingContact: boolean;
  currentUid?: string;
  onUpdateBlood: (
    req: BloodRequest,
    payload: { status: HospitalBloodStatus; notes: string; verified?: boolean }
  ) => void;
  onUnlockContact: (bloodRequestId: string) => void;
  onOpenDonorDetails: (bloodRequestId: string) => void;
  onOpenChat: (target: ChatTarget) => void;
}

const BloodRequestCard = memo(function BloodRequestCard({
  req,
  reqMatches,
  unlocked,
  isBusy,
  isLoadingContact,
  currentUid,
  onUpdateBlood,
  onUnlockContact,
  onOpenDonorDetails,
  onOpenChat,
}: BloodRequestCardProps) {
  const [statusDraft, setStatusDraft] = useState<HospitalBloodStatus>(
    req.hospitalStatus || 'Submitted'
  );
  const [notesDraft, setNotesDraft] = useState<string>(req.hospitalNotes || '');

  const handleSave = () => {
    onUpdateBlood(req, {
      status: statusDraft,
      notes: notesDraft,
      verified: req.hospitalVerified ?? true,
    });
  };

  const handleVerify = () => {
    setStatusDraft('Donor Search Started');
    onUpdateBlood(req, {
      status: 'Donor Search Started',
      notes: notesDraft,
      verified: true,
    });
  };

  return (
    <article className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex flex-col items-center justify-center shrink-0">
            <span className="text-sm font-extrabold text-red-700 dark:text-red-300">
              {req.requiredBloodGroup}
            </span>
            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 tabular-nums">
              {req.confirmedUnits}/{req.requiredUnits}u
            </span>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {req.bloodRequestId}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span
                className={cn(
                  'font-bold',
                  req.emergencyLevel === 'Critical'
                    ? 'text-red-600 dark:text-red-400'
                    : req.emergencyLevel === 'Urgent'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {req.emergencyLevel}
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {req.hospitalStatus || 'Submitted'}
              </span>
              {req.hospitalVerified && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck size={13} /> Verified
                  </span>
                </>
              )}
            </div>

            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Patient: {req.patientDisplayName}
              <span className="font-normal text-slate-500 dark:text-slate-400">
                {' '}
                · {req.hospitalName}
              </span>
            </h3>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} /> {req.location}, {req.city}
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock size={13} /> Needed by {formatDisplayDateTime(req.requiredDateTime)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users size={13} /> Contact: {req.contactPersonName}
              </span>
            </div>

            {req.additionalMedicalInfo && (
              <p className="text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                {req.additionalMedicalInfo}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenDonorDetails(req.bloodRequestId)}
            className={cn(
              'px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors whitespace-nowrap',
              reqMatches.length > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400'
            )}
          >
            <UserCheck size={14} />
            <span className="tabular-nums">
              {reqMatches.length} Donor{reqMatches.length === 1 ? '' : 's'}
            </span>
          </button>

          {!req.hospitalVerified && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleVerify}
              className="px-3 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap transition-colors"
            >
              {isBusy ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
              <span>Verify</span>
            </button>
          )}

          <button
            type="button"
            disabled={isLoadingContact}
            onClick={() => onUnlockContact(req.bloodRequestId)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <Eye size={13} />
            <span>Patient Phone</span>
          </button>

          {req.requesterId !== currentUid && (
            <button
              type="button"
              onClick={() =>
                onOpenChat({
                  request: req,
                  partnerId: req.requesterId,
                  partnerName: req.requesterDisplayName,
                  partnerRoleLabel: 'Requester',
                })
              }
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <MessageSquare size={13} />
              <span>Message</span>
            </button>
          )}
        </div>
      </div>

      {unlocked && (
        <div className="px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs flex flex-wrap items-center gap-4 text-blue-900 dark:text-blue-200">
          <span className="font-semibold">Patient: {unlocked.patientFullName}</span>
          <a
            href={`tel:${unlocked.contactPhoneNumber}`}
            className="inline-flex items-center gap-1 font-bold hover:underline tabular-nums"
          >
            <Phone size={13} /> {unlocked.contactPhoneNumber}
          </a>
        </div>
      )}

      {/* Accepted Donors Quick Summary */}
      {reqMatches.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">Accepted Donors:</span>
            {reqMatches.slice(0, 3).map((m, idx) => (
              <span key={m.matchId} className="inline-flex items-center gap-1">
                {idx > 0 && <span className="text-slate-300 dark:text-slate-700 mr-2">·</span>}
                <strong className="text-slate-800 dark:text-slate-100">{m.donorDisplayName}</strong>
                <span>({m.donorBloodGroup})</span>
                <span className={cn('font-semibold', getDonorStageTextClass(m.responseStatus))}>
                  · {getDonorStageLabel(m.responseStatus)}
                </span>
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onOpenDonorDetails(req.bloodRequestId)}
            className="text-xs font-semibold text-brand-blue dark:text-cyan-400 hover:underline whitespace-nowrap"
          >
            Open Donor Details →
          </button>
        </div>
      )}

      {/* Status & Note Update Controls */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        <div className="md:col-span-4">
          <select
            aria-label="Request status"
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value as HospitalBloodStatus)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-slate-100"
          >
            {HOSPITAL_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-6">
          <input
            type="text"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Write a short note (e.g. Cross-match lab ready)..."
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-brand-blue"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={handleSave}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 dark:bg-brand-blue hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {isBusy ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </article>
  );
});

// ============================================================
// MEMOIZED CARD: DONOR DETAILS & DONATION PROCESS TRACKER
// ============================================================
interface DonorDetailCardProps {
  match: BloodDonorMatch;
  profile?: DonorProfile;
  linkedReq?: BloodRequest;
  isBusy: boolean;
  onSelectDonor: (match: BloodDonorMatch) => void;
  onOpenSchedule: (match: BloodDonorMatch) => void;
  onOpenComplete: (match: BloodDonorMatch) => void;
  onOpenChat: (target: ChatTarget) => void;
}

const DonorDetailCard = memo(function DonorDetailCard({
  match,
  profile,
  linkedReq,
  isBusy,
  onSelectDonor,
  onOpenSchedule,
  onOpenComplete,
  onOpenChat,
}: DonorDetailCardProps) {
  const stepIndex = getStepIndex(match.responseStatus);
  const totalDonations = profile?.totalDonations ?? (match.responseStatus === 'COMPLETED' ? 1 : 0);
  const lastDonated = profile?.lastDonationDate;
  const isAvailable = profile ? profile.isAvailable : match.donorConfirmedAvailable;

  return (
    <article className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-5">
      <div className="space-y-4">
        {/* Donor Profile Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 flex flex-col items-center justify-center shrink-0">
              <span className="text-sm font-extrabold text-red-700 dark:text-red-300">
                {match.donorBloodGroup}
              </span>
              <span className="text-[9px] font-bold uppercase text-red-600 dark:text-red-400">
                {match.compatibilityType === 'EXACT' ? 'Exact' : 'Match'}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  {match.donorDisplayName}
                </h3>
                {(match.donorVerified || profile?.bloodGroupVerified) && (
                  <ShieldCheck
                    size={15}
                    className="text-emerald-600 shrink-0"
                    aria-label="Verified Donor"
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
                {match.donorArea || match.donorCity} · {match.distanceKm} km away ·{' '}
                {isAvailable ? 'Ready to donate' : 'Resting after donation'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className={cn(
                'text-xs font-bold uppercase tracking-wide',
                getDonorStageTextClass(match.responseStatus)
              )}
            >
              {getDonorStageLabel(match.responseStatus)}
            </span>
            <p className="text-[11px] text-slate-400 tabular-nums">
              {totalDonations} past donation{totalDonations === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* 4-Step Donation Process Status Bar */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Donation Process Status
            </span>
            <span className="text-slate-500 dark:text-slate-400 tabular-nums">
              Step {stepIndex + 1} of 4
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {DONATION_STEPS.map((step, idx) => {
              const isDone = idx < stepIndex || (idx === 3 && stepIndex === 3);
              const isCurrent = idx === stepIndex && stepIndex < 3;
              return (
                <div key={step.key} className="space-y-1.5">
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-colors',
                      isDone
                        ? 'bg-emerald-600'
                        : isCurrent
                          ? 'bg-brand-blue'
                          : 'bg-slate-200 dark:bg-slate-800'
                    )}
                  />
                  <div className="flex items-center gap-1 text-[11px]">
                    {isDone && <Check size={11} className="text-emerald-600 shrink-0" />}
                    <span
                      className={cn(
                        'truncate',
                        isDone
                          ? 'font-semibold text-emerald-700 dark:text-emerald-400'
                          : isCurrent
                            ? 'font-bold text-brand-blue dark:text-cyan-400'
                            : 'text-slate-400 dark:text-slate-500'
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {match.scheduledDateTime && match.responseStatus !== 'COMPLETED' && (
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1.5 pt-1 tabular-nums">
              <Calendar size={13} /> Scheduled visit: {match.scheduledDateTime}
            </p>
          )}
          {match.responseStatus === 'COMPLETED' && (
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 pt-1 tabular-nums">
              <CheckCircle2 size={13} /> Completed · {match.fulfilledUnitsCount || 1} unit
              {(match.fulfilledUnitsCount || 1) > 1 ? 's' : ''} verified
              {match.completedAt ? ` on ${formatShortDate(match.completedAt)}` : ''}
            </p>
          )}
        </div>

        {/* Donor Profile Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="flex items-start gap-2.5 min-w-0">
            <Phone size={14} className="text-brand-blue shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">Phone Number</p>
              {match.donorPhone ? (
                <a
                  href={`tel:${match.donorPhone}`}
                  className="font-semibold text-slate-900 dark:text-white hover:text-brand-blue hover:underline truncate block tabular-nums"
                >
                  {match.donorPhone}
                </a>
              ) : (
                <p className="font-medium text-slate-600 dark:text-slate-300">Message in chat</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 min-w-0">
            <Mail size={14} className="text-brand-blue shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">Email</p>
              <p className="font-semibold text-slate-900 dark:text-white truncate">
                {match.donorEmail || 'Verified community member'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 min-w-0">
            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">Area &amp; City</p>
              <p className="font-semibold text-slate-900 dark:text-white truncate">
                {match.donorArea || match.donorCity}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 min-w-0">
            <Clock size={14} className="text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400">Accepted / Last Donated</p>
              <p className="font-semibold text-slate-900 dark:text-white truncate tabular-nums">
                {formatShortDate(match.respondedAt || match.updatedAt)}
                {lastDonated ? ` · Last: ${formatShortDate(lastDonated)}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Linked Blood Request */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              Request {match.bloodRequestId}
            </span>
            {linkedReq && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {linkedReq.confirmedUnits}/{linkedReq.requiredUnits} units ·{' '}
                {linkedReq.emergencyLevel}
              </span>
            )}
          </div>
          {linkedReq && (
            <p className="text-slate-600 dark:text-slate-300">
              Patient:{' '}
              <strong className="text-slate-900 dark:text-white">
                {linkedReq.patientDisplayName}
              </strong>{' '}
              (Needs {linkedReq.requiredBloodGroup})
            </p>
          )}
          {match.donorNotes && (
            <p className="text-slate-500 dark:text-slate-400">
              Donor note: &ldquo;{match.donorNotes}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
        {match.responseStatus === 'INTERESTED' && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSelectDonor(match)}
            className="px-3.5 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {isBusy ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={14} />}
            <span>Select Donor</span>
          </button>
        )}

        {['INTERESTED', 'SELECTED'].includes(match.responseStatus) && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onOpenSchedule(match)}
            className="px-3.5 py-2 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-100 transition-colors"
          >
            <Calendar size={14} />
            <span>Set Time</span>
          </button>
        )}

        {['SELECTED', 'SCHEDULED'].includes(match.responseStatus) && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onOpenComplete(match)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 size={14} />
            <span>Mark Donated</span>
          </button>
        )}

        {match.responseStatus === 'COMPLETED' && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={14} />
            <span>Donation Completed</span>
          </span>
        )}

        {linkedReq && (
          <button
            type="button"
            onClick={() =>
              onOpenChat({
                request: linkedReq,
                partnerId: match.donorId,
                partnerName: match.donorDisplayName,
                partnerRoleLabel: `Donor (${match.donorBloodGroup})`,
              })
            }
            className="ml-auto px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare size={13} />
            <span>Chat</span>
          </button>
        )}
      </div>
    </article>
  );
});

// ============================================================
// MEMOIZED ROW: HISTORY DONATION
// ============================================================
const HistoryDonationRow = memo(function HistoryDonationRow({
  rec,
}: {
  rec: BloodDonationHistoryRecord;
}) {
  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
      <td className="px-4 py-3 font-mono">
        <p className="font-semibold text-slate-900 dark:text-white">{rec.historyId}</p>
        <p className="text-[11px] text-slate-500">{rec.bloodRequestId}</p>
      </td>
      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
        {rec.donorDisplayName}
      </td>
      <td className="px-4 py-3 font-bold text-red-700 dark:text-red-400">{rec.bloodGroup}</td>
      <td className="px-4 py-3 font-semibold tabular-nums text-slate-900 dark:text-white">
        {rec.unitsDonated} u
      </td>
      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
        {rec.hospitalName}
        <span className="text-slate-400"> · {rec.city}</span>
      </td>
      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
        {formatDisplayDateTime(rec.donatedAt)}
      </td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-xs">
        {rec.notes || '—'}
      </td>
    </tr>
  );
});

// ============================================================
// MAIN HOSPITAL PORTAL PAGE (HELPCONNECT VISUAL DESIGN LANGUAGE)
// ============================================================
export function HospitalPortalPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const {
    firebaseUser,
    hospitalAccount,
    hospitals,
    donorProfiles,
    bloodRequests,
    bloodDonorMatches,
    bloodDonationHistory,
    messages,
    notifications,
    hasMultipleRoles,
    clearSelectedPortal,
    signOutUser,
    createBloodRequest,
    hospitalUpdateBloodRequest,
    getBloodRequestPrivateContact,
    selectBloodDonor,
    scheduleBloodDonation,
    completeBloodDonationUnits,
    sendBloodChatMessage,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<HospitalTab>('home');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Blood Requests Filters (Deferred search for zero input lag)
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>('ALL');
  const [emergencyFilter, setEmergencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [busyReqId, setBusyReqId] = useState<string | null>(null);
  const [unlockedContacts, setUnlockedContacts] = useState<
    Record<string, BloodRequestPrivateContact>
  >({});
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null);

  // Request Blood Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reqPatientName, setReqPatientName] = useState('');
  const [reqBloodGroup, setReqBloodGroup] = useState<BloodGroup>('O+');
  const [reqAllowCompatible, setReqAllowCompatible] = useState(true);
  const [reqUnits, setReqUnits] = useState<number>(2);
  const [reqEmergency, setReqEmergency] = useState<BloodEmergencyLevel>('Urgent');
  const [reqHospitalName, setReqHospitalName] = useState('');
  const [reqHospitalAddress, setReqHospitalAddress] = useState('');
  const [reqCity, setReqCity] = useState('');
  const [reqLocation, setReqLocation] = useState('');
  const [reqDateTime, setReqDateTime] = useState(() =>
    new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [reqContactPerson, setReqContactPerson] = useState('');
  const [reqContactPhone, setReqContactPhone] = useState('');
  const [reqMedicalInfo, setReqMedicalInfo] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Donor Details Filters & Modals
  const [donorSearch, setDonorSearch] = useState('');
  const deferredDonorSearch = useDeferredValue(donorSearch);
  const [donorStatusFilter, setDonorStatusFilter] = useState<string>('ALL');
  const [donorReqFilter, setDonorReqFilter] = useState<string>('ALL');
  const [busyDonorMatchId, setBusyDonorMatchId] = useState<string | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<BloodDonorMatch | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState(() =>
    new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [completeTarget, setCompleteTarget] = useState<BloodDonorMatch | null>(null);
  const [completeUnits, setCompleteUnits] = useState<number>(1);
  const [completeNotes, setCompleteNotes] = useState('');

  // History Filters
  const [historyQuery, setHistoryQuery] = useState('');
  const deferredHistoryQuery = useDeferredValue(historyQuery);
  const [historyBloodGroup, setHistoryBloodGroup] = useState<string>('ALL');
  const [historyType, setHistoryType] = useState<HistoryRecordType>('ALL');
  const [historyFromDate, setHistoryFromDate] = useState('');
  const [historyToDate, setHistoryToDate] = useState('');

  // Chat Modal
  const [chatTarget, setChatTarget] = useState<ChatTarget | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const myHospitalOrg = useMemo(
    () => hospitals.find((h) => h.hospitalId === hospitalAccount?.hospitalId) || null,
    [hospitals, hospitalAccount?.hospitalId]
  );

  const myHospitalCity = (myHospitalOrg?.city || '').toLowerCase();
  const myHospitalName = (
    hospitalAccount?.hospitalName ||
    myHospitalOrg?.name ||
    'Hospital Portal'
  ).trim();

  // Strictly blood-related notifications only
  const bloodNotifications = useMemo(
    () =>
      notifications.filter(
        (n) => n.notificationType.startsWith('BLOOD_') || Boolean(n.bloodRequestId)
      ),
    [notifications]
  );
  const unreadBloodCount = useMemo(
    () => bloodNotifications.filter((n) => !n.isRead).length,
    [bloodNotifications]
  );

  // Pre-indexed maps for O(1) lookups
  const bloodRequestById = useMemo(() => {
    const map: Record<string, BloodRequest> = {};
    bloodRequests.forEach((r) => {
      map[r.bloodRequestId] = r;
    });
    return map;
  }, [bloodRequests]);

  const donorProfileById = useMemo(() => {
    const map: Record<string, DonorProfile> = {};
    donorProfiles.forEach((p) => {
      map[p.uid] = p;
    });
    return map;
  }, [donorProfiles]);

  const { acceptedDonors, acceptedDonorsByReqId, donorStageCounts } = useMemo(() => {
    const byReq: Record<string, BloodDonorMatch[]> = {};
    const list: BloodDonorMatch[] = [];
    const counts = { INTERESTED: 0, SELECTED: 0, SCHEDULED: 0, COMPLETED: 0 };

    bloodDonorMatches.forEach((m) => {
      if (
        m.responseStatus === 'INTERESTED' ||
        m.responseStatus === 'SELECTED' ||
        m.responseStatus === 'SCHEDULED' ||
        m.responseStatus === 'COMPLETED'
      ) {
        list.push(m);
        counts[m.responseStatus] += 1;
        if (!byReq[m.bloodRequestId]) byReq[m.bloodRequestId] = [];
        byReq[m.bloodRequestId].push(m);
      }
    });

    list.sort(
      (a, b) =>
        new Date(b.respondedAt || b.updatedAt).getTime() -
        new Date(a.respondedAt || a.updatedAt).getTime()
    );

    return { acceptedDonors: list, acceptedDonorsByReqId: byReq, donorStageCounts: counts };
  }, [bloodDonorMatches]);

  const filteredAcceptedDonors = useMemo(() => {
    const q = deferredDonorSearch.trim().toLowerCase();
    return acceptedDonors.filter((m) => {
      if (donorStatusFilter !== 'ALL' && m.responseStatus !== donorStatusFilter) return false;
      if (donorReqFilter !== 'ALL' && m.bloodRequestId !== donorReqFilter) return false;
      if (q) {
        const linked = bloodRequestById[m.bloodRequestId];
        const hay = [
          m.donorDisplayName,
          m.donorBloodGroup,
          m.donorPhone || '',
          m.donorEmail || '',
          m.donorCity,
          m.donorArea || '',
          m.bloodRequestId,
          linked?.patientDisplayName || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [acceptedDonors, deferredDonorSearch, donorStatusFilter, donorReqFilter, bloodRequestById]);

  const sortedBloodRequests = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return [...bloodRequests]
      .filter((r) => {
        if (bloodGroupFilter !== 'ALL' && r.requiredBloodGroup !== bloodGroupFilter) return false;
        if (emergencyFilter !== 'ALL' && r.emergencyLevel !== emergencyFilter) return false;
        const effectiveStatus = r.hospitalStatus || 'Submitted';
        if (statusFilter !== 'ALL' && effectiveStatus !== statusFilter) return false;
        if (q) {
          const hay = `${r.bloodRequestId} ${r.patientDisplayName} ${r.hospitalName} ${r.city} ${r.location} ${r.requiredBloodGroup} ${r.contactPersonName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aOwn =
          a.assignedHospitalId === hospitalAccount?.hospitalId
            ? 2
            : a.city.toLowerCase() === myHospitalCity
              ? 1
              : 0;
        const bOwn =
          b.assignedHospitalId === hospitalAccount?.hospitalId
            ? 2
            : b.city.toLowerCase() === myHospitalCity
              ? 1
              : 0;
        if (bOwn !== aOwn) return bOwn - aOwn;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    bloodRequests,
    deferredSearch,
    bloodGroupFilter,
    emergencyFilter,
    statusFilter,
    hospitalAccount?.hospitalId,
    myHospitalCity,
  ]);

  const pastBloodRequests = useMemo(
    () =>
      bloodRequests.filter(
        (r) =>
          ['REQUEST_FULFILLED', 'REQUEST_CANCELLED', 'DONATION_COMPLETED'].includes(r.status) ||
          ['Request Fulfilled', 'Donation Completed', 'Cancelled'].includes(r.hospitalStatus || '')
      ),
    [bloodRequests]
  );

  const filteredHistoryDonations = useMemo(() => {
    if (historyType === 'FULFILLED_REQUESTS' || historyType === 'CANCELLED_REQUESTS') return [];
    const q = deferredHistoryQuery.trim().toLowerCase();
    return [...bloodDonationHistory]
      .filter((h) => {
        if (historyBloodGroup !== 'ALL' && h.bloodGroup !== historyBloodGroup) return false;
        if (historyFromDate) {
          const fromTs = new Date(`${historyFromDate}T00:00:00`).getTime();
          if (new Date(h.donatedAt).getTime() < fromTs) return false;
        }
        if (historyToDate) {
          const toTs = new Date(`${historyToDate}T23:59:59`).getTime();
          if (new Date(h.donatedAt).getTime() > toTs) return false;
        }
        if (q) {
          const hay = `${h.historyId} ${h.bloodRequestId} ${h.donorDisplayName} ${h.requesterDisplayName} ${h.hospitalName} ${h.city} ${h.bloodGroup} ${h.notes || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.donatedAt).getTime() - new Date(a.donatedAt).getTime());
  }, [
    bloodDonationHistory,
    deferredHistoryQuery,
    historyBloodGroup,
    historyType,
    historyFromDate,
    historyToDate,
  ]);

  const filteredHistoryRequests = useMemo(() => {
    if (historyType === 'VERIFIED_DONATIONS') return [];
    const q = deferredHistoryQuery.trim().toLowerCase();
    return [...pastBloodRequests]
      .filter((r) => {
        const isCancelled = r.status === 'REQUEST_CANCELLED' || r.hospitalStatus === 'Cancelled';
        if (historyType === 'FULFILLED_REQUESTS' && isCancelled) return false;
        if (historyType === 'CANCELLED_REQUESTS' && !isCancelled) return false;
        if (historyBloodGroup !== 'ALL' && r.requiredBloodGroup !== historyBloodGroup) return false;
        const refDate = r.fulfilledAt || r.updatedAt || r.createdAt;
        if (historyFromDate) {
          const fromTs = new Date(`${historyFromDate}T00:00:00`).getTime();
          if (new Date(refDate).getTime() < fromTs) return false;
        }
        if (historyToDate) {
          const toTs = new Date(`${historyToDate}T23:59:59`).getTime();
          if (new Date(refDate).getTime() > toTs) return false;
        }
        if (q) {
          const hay = `${r.bloodRequestId} ${r.patientDisplayName} ${r.requesterDisplayName} ${r.hospitalName} ${r.city} ${r.requiredBloodGroup} ${r.hospitalNotes || ''} ${r.cancellationReason || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.fulfilledAt || b.updatedAt).getTime() -
          new Date(a.fulfilledAt || a.updatedAt).getTime()
      );
  }, [
    pastBloodRequests,
    deferredHistoryQuery,
    historyBloodGroup,
    historyType,
    historyFromDate,
    historyToDate,
  ]);

  const totalHistoryCount = bloodDonationHistory.length + pastBloodRequests.length;

  const stats = useMemo(() => {
    const openRequests = bloodRequests.filter(
      (r) =>
        !['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(r.status) &&
        !['Request Fulfilled', 'Cancelled'].includes(r.hospitalStatus || '')
    );
    const urgentOpen = openRequests.filter(
      (r) => r.emergencyLevel === 'Critical' || r.emergencyLevel === 'Urgent'
    ).length;
    const verifiedUnits = bloodDonationHistory.reduce((acc, h) => acc + (h.unitsDonated || 0), 0);
    return {
      openCount: openRequests.length,
      urgentOpen,
      acceptedCount: acceptedDonors.length,
      inProgressDonors:
        donorStageCounts.INTERESTED + donorStageCounts.SELECTED + donorStageCounts.SCHEDULED,
      scheduledDonors: donorStageCounts.SCHEDULED,
      verifiedUnits,
      historyCount: totalHistoryCount,
    };
  }, [bloodRequests, acceptedDonors.length, donorStageCounts, bloodDonationHistory, totalHistoryCount]);

  // Stable callbacks for memoized children
  const openRequestBloodModal = useCallback(() => {
    setReqHospitalName(myHospitalOrg?.name || hospitalAccount?.hospitalName || '');
    setReqHospitalAddress(myHospitalOrg?.address || '');
    setReqCity(myHospitalOrg?.city || '');
    setReqLocation(
      myHospitalOrg?.address && myHospitalOrg?.city
        ? `${myHospitalOrg.address.split(',')[0]}, ${myHospitalOrg.city}`
        : myHospitalOrg?.city || ''
    );
    setReqContactPerson(myHospitalOrg?.contactPerson || '');
    setReqContactPhone(myHospitalOrg?.mobile || '');
    setReqPatientName('');
    setReqBloodGroup('O+');
    setReqAllowCompatible(true);
    setReqUnits(2);
    setReqEmergency('Urgent');
    setReqDateTime(new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16));
    setReqMedicalInfo('');
    setRequestModalOpen(true);
  }, [myHospitalOrg, hospitalAccount?.hospitalName]);

  const handleOpenDonorDetailsForReq = useCallback((bloodRequestId: string) => {
    setDonorReqFilter(bloodRequestId);
    setActiveTab('donors');
  }, []);

  const handleOpenChat = useCallback((target: ChatTarget) => {
    setChatTarget(target);
  }, []);

  const handleOpenSchedule = useCallback((match: BloodDonorMatch) => {
    setScheduleTarget(match);
    setScheduleDateTime(new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16));
  }, []);

  const handleOpenComplete = useCallback((match: BloodDonorMatch) => {
    setCompleteTarget(match);
    setCompleteUnits(1);
    setCompleteNotes('');
  }, []);

  const handleUpdateBlood = useCallback(
    async (
      req: BloodRequest,
      payload: { status: HospitalBloodStatus; notes: string; verified?: boolean }
    ) => {
      setBusyReqId(req.bloodRequestId);
      setNotice(null);
      try {
        await hospitalUpdateBloodRequest(req.bloodRequestId, {
          hospitalStatus: payload.status,
          hospitalVerified: payload.verified ?? req.hospitalVerified ?? true,
          hospitalNotes: payload.notes,
          assignToSelf: true,
        });
        setNotice({
          type: 'success',
          text: `Saved changes for ${req.bloodRequestId} (${payload.status}).`,
        });
      } catch (err) {
        setNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Could not save changes.',
        });
      } finally {
        setBusyReqId(null);
      }
    },
    [hospitalUpdateBloodRequest]
  );

  const handleUnlockContact = useCallback(
    async (bloodRequestId: string) => {
      setLoadingContactId(bloodRequestId);
      setNotice(null);
      try {
        const contact = await getBloodRequestPrivateContact(bloodRequestId);
        if (contact) {
          setUnlockedContacts((prev) => ({ ...prev, [bloodRequestId]: contact }));
        } else {
          setNotice({
            type: 'error',
            text: 'No private phone number is stored for this request.',
          });
        }
      } catch (err) {
        setNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Could not load patient phone.',
        });
      } finally {
        setLoadingContactId(null);
      }
    },
    [getBloodRequestPrivateContact]
  );

  const handleSelectDonor = useCallback(
    async (match: BloodDonorMatch) => {
      setBusyDonorMatchId(match.matchId);
      setNotice(null);
      try {
        await selectBloodDonor(match.bloodRequestId, match.donorId);
        setNotice({
          type: 'success',
          text: `${match.donorDisplayName} (${match.donorBloodGroup}) is now selected. Donor has been notified.`,
        });
      } catch (err) {
        setNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Could not select donor.',
        });
      } finally {
        setBusyDonorMatchId(null);
      }
    },
    [selectBloodDonor]
  );

  const handleBroadcastBloodRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmittingRequest(true);
    try {
      const result = await createBloodRequest({
        patientFullName: reqPatientName.trim(),
        requiredBloodGroup: reqBloodGroup,
        allowCompatibleGroups: reqAllowCompatible,
        requiredUnits: reqUnits,
        hospitalName: reqHospitalName.trim() || myHospitalName,
        hospitalAddress: reqHospitalAddress.trim(),
        city: reqCity.trim(),
        location: reqLocation.trim() || reqCity.trim(),
        requiredDateTime: reqDateTime,
        emergencyLevel: reqEmergency,
        contactPersonName: reqContactPerson.trim(),
        contactPhoneNumber: reqContactPhone.trim(),
        additionalMedicalInfo: reqMedicalInfo.trim() || undefined,
      });
      setRequestModalOpen(false);
      setActiveTab('blood');
      setNotice({
        type: 'success',
        text: `Blood request ${result.request.bloodRequestId} (${result.request.requiredBloodGroup}, ${result.request.requiredUnits} unit${result.request.requiredUnits > 1 ? 's' : ''}) sent to nearby donors. ${result.matchedCount} donor(s) alerted.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send blood request.',
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTarget || !scheduleDateTime) return;
    setBusyDonorMatchId(scheduleTarget.matchId);
    setNotice(null);
    try {
      await scheduleBloodDonation(
        scheduleTarget.bloodRequestId,
        scheduleTarget.donorId,
        scheduleDateTime.replace('T', ' ')
      );
      setNotice({
        type: 'success',
        text: `Donation time set for ${scheduleTarget.donorDisplayName} (${scheduleDateTime.replace('T', ' ')}).`,
      });
      setScheduleTarget(null);
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not set donation time.',
      });
    } finally {
      setBusyDonorMatchId(null);
    }
  };

  const handleConfirmComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;
    setBusyDonorMatchId(completeTarget.matchId);
    setNotice(null);
    try {
      await completeBloodDonationUnits(
        completeTarget.bloodRequestId,
        completeTarget.donorId,
        completeUnits,
        completeNotes.trim() || undefined
      );
      setNotice({
        type: 'success',
        text: `Marked ${completeUnits} unit(s) donated by ${completeTarget.donorDisplayName}. Added to History.`,
      });
      setCompleteTarget(null);
      setCompleteUnits(1);
      setCompleteNotes('');
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save completed donation.',
      });
    } finally {
      setBusyDonorMatchId(null);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatTarget || !chatInput.trim()) return;
    setSendingChat(true);
    try {
      await sendBloodChatMessage(chatTarget.request.bloodRequestId, {
        recipientId: chatTarget.partnerId,
        text: `[${myHospitalName}] ${chatInput.trim()}`,
      });
      setChatInput('');
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not send message.',
      });
    } finally {
      setSendingChat(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/hospital/login', { replace: true });
  };

  const activeChatMessages = useMemo(() => {
    if (!chatTarget) return [];
    return messages
      .filter((m) => m.requestId === chatTarget.request.bloodRequestId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, chatTarget]);

  const resetHistoryFilters = () => {
    setHistoryQuery('');
    setHistoryBloodGroup('ALL');
    setHistoryType('ALL');
    setHistoryFromDate('');
    setHistoryToDate('');
  };

  const desktopLinks: Array<{ id: HospitalTab; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'blood', label: 'Requests' },
    { id: 'donors', label: 'Donor Details' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 md:pb-12">
      {/* ============================================================ */}
      {/* DESKTOP TOP NAVIGATION (MATCHES HELPCONNECT DESIGN)          */}
      {/* ============================================================ */}
      <header className="hidden md:flex fixed top-0 w-full z-40 glass px-6 py-3.5 items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-brand-blue font-extrabold text-lg whitespace-nowrap shrink-0"
        >
          <Building2 className="text-brand-blue" size={20} />
          <span>Hospital Portal</span>
        </button>

        <nav aria-label="Hospital Portal Menu" className="flex items-center gap-6">
          {desktopLinks.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'text-sm font-semibold whitespace-nowrap shrink-0 transition-colors hover:text-brand-blue',
                  isActive
                    ? 'text-brand-blue underline underline-offset-8 decoration-2'
                    : 'text-slate-600 dark:text-slate-300'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {hasMultipleRoles && (
            <button
              type="button"
              onClick={() => {
                clearSelectedPortal();
                navigate('/portals', { replace: true });
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-blue inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <ArrowLeftRight size={14} />
              <span>Portals</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            aria-label="Blood Alerts"
            className={cn(
              'relative p-2 rounded-xl transition-colors',
              activeTab === 'notifications'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-brand-blue'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Bell size={18} />
            {unreadBloodCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadBloodCount > 9 ? '9+' : unreadBloodCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Sign Out"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
          >
            <LogOut size={18} />
          </button>

          <button
            type="button"
            onClick={openRequestBloodModal}
            className="px-4 py-2 rounded-full bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
          >
            Request Blood
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MOBILE TOP MINI BAR (EXACT HELPCONNECT SCREENSHOT STYLE)     */}
      {/* ============================================================ */}
      <header className="md:hidden fixed top-0 w-full z-40 glass px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 text-brand-blue font-extrabold text-base min-w-0"
        >
          <Building2 className="text-brand-blue shrink-0" size={19} />
          <span className="truncate">Hospital Portal</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {hasMultipleRoles && (
            <button
              type="button"
              onClick={() => {
                clearSelectedPortal();
                navigate('/portals', { replace: true });
              }}
              aria-label="Switch Portal"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
            >
              <ArrowLeftRight size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            aria-label="Blood Alerts"
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300"
          >
            <Bell size={19} />
            {unreadBloodCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                {unreadBloodCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Sign Out"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300"
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* MAIN CONTENT VIEWPORT                                        */}
      {/* ============================================================ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 md:pt-24 space-y-6">
        {/* Global Status Notice */}
        {notice && (
          <div
            className={cn(
              'px-4 py-3.5 rounded-2xl border text-xs sm:text-sm flex items-start justify-between gap-3',
              notice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
            )}
          >
            <div className="flex items-start gap-2">
              {notice.type === 'success' ? (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              )}
              <span>{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Close notice"
              className="opacity-70 hover:opacity-100"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 0: HOME (DARK INDIGO HERO CARD + HOSPITAL DETAILS CARD)  */}
        {/* ============================================================ */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Signature Dark Indigo Hero Card (Matches Uploaded Screenshot) */}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white p-7 sm:p-10 lg:p-14 border border-slate-800 shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-xs font-bold text-cyan-300 tracking-wide">
                  <Sparkles size={14} />
                  <span>WELCOME TO HOSPITAL PORTAL</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-balance">
                  Saving Lives.
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-brand-blue bg-clip-text text-transparent">
                    Connecting Donors.
                  </span>
                </h1>

                <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed">
                  Request blood from nearby donors, view full donor details as soon as someone
                  accepts, and track every donation clearly from one fast workspace.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1">
                  <button
                    type="button"
                    onClick={openRequestBloodModal}
                    className="px-6 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-sm font-extrabold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>REQUEST BLOOD</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('donors')}
                    className="px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all backdrop-blur-md"
                  >
                    <span>DONOR DETAILS</span>
                    <Users size={16} />
                  </button>
                </div>

                {/* Bottom Community/Hospital Strip inside Hero */}
                <div className="pt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <div className="flex -space-x-2">
                    <span className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 font-extrabold text-[11px] flex items-center justify-center ring-2 ring-slate-950">
                      O+
                    </span>
                    <span className="w-8 h-8 rounded-full bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center justify-center ring-2 ring-slate-950">
                      A+
                    </span>
                    <span className="w-8 h-8 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-slate-950 tabular-nums">
                      +{stats.acceptedCount}
                    </span>
                  </div>
                  <span>
                    <strong className="text-white">{myHospitalName}</strong> ·{' '}
                    {stats.openCount} open blood request{stats.openCount === 1 ? '' : 's'} ·{' '}
                    {stats.acceptedCount} accepted donor{stats.acceptedCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </section>

            {/* Front Page Hospital Details Card */}
            <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-brand-blue dark:text-cyan-400">
                      {myHospitalOrg?.hospitalType || 'Multi-Specialty Hospital'}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck size={13} /> Active Hospital
                    </span>
                    <span>·</span>
                    <span className="font-mono">
                      {myHospitalOrg?.hospitalId || hospitalAccount?.hospitalId || 'HSP-001'}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {myHospitalName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('blood')}
                  className="text-xs font-bold text-brand-blue dark:text-cyan-400 hover:underline self-start sm:self-center whitespace-nowrap"
                >
                  View All Requests ({bloodRequests.length}) →
                </button>
              </div>

              {/* Hospital Profile Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="p-4 sm:px-5 space-y-1">
                  <p className="text-[11px] font-medium text-slate-400">Registration &amp; License</p>
                  <p className="font-semibold text-slate-900 dark:text-white font-mono">
                    {myHospitalOrg?.registrationNumber || 'Registered Facility'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    Blood Bank: {myHospitalOrg?.bloodBankLicense || 'Standard License'}
                  </p>
                </div>

                <div className="p-4 sm:px-5 space-y-1">
                  <p className="text-[11px] font-medium text-slate-400">Contact Person</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {myHospitalOrg?.contactPerson || 'Blood Bank Officer'}
                  </p>
                  {myHospitalOrg?.mobile ? (
                    <a
                      href={`tel:${myHospitalOrg.mobile}`}
                      className="inline-flex items-center gap-1 text-brand-blue dark:text-cyan-400 font-semibold hover:underline tabular-nums"
                    >
                      <Phone size={12} /> {myHospitalOrg.mobile}
                    </a>
                  ) : (
                    <p className="text-slate-500">Official desk</p>
                  )}
                </div>

                <div className="p-4 sm:px-5 space-y-1">
                  <p className="text-[11px] font-medium text-slate-400">Official Email</p>
                  <p className="font-semibold text-slate-900 dark:text-white truncate">
                    {myHospitalOrg?.email || hospitalAccount?.email || 'Not listed'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 truncate">
                    Username: @{myHospitalOrg?.username || hospitalAccount?.username || 'hospital'}
                  </p>
                </div>

                <div className="p-4 sm:px-5 space-y-1">
                  <p className="text-[11px] font-medium text-slate-400">Hospital Address</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {myHospitalOrg?.address || 'Address on file'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {[myHospitalOrg?.city, myHospitalOrg?.state, myHospitalOrg?.postalCode]
                      .filter(Boolean)
                      .join(', ') || 'Verified location'}
                  </p>
                </div>
              </div>

              {/* 4 Live Summary Counters */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 divide-x divide-slate-200/70 dark:divide-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('blood')}
                  className="p-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">Open Requests</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {stats.openCount}
                  </p>
                  <p className="text-[11px] text-red-600 dark:text-red-400 font-medium tabular-nums">
                    {stats.urgentOpen} urgent / critical
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('donors')}
                  className="p-4 text-left hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">Donor Details</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {stats.acceptedCount}
                  </p>
                  <p className="text-[11px] text-brand-blue dark:text-cyan-400 font-medium tabular-nums">
                    {stats.inProgressDonors} active · {stats.scheduledDonors} scheduled
                  </p>
                </button>

                <div className="p-4 text-left border-t lg:border-t-0 border-slate-200/70 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Units Donated</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {stats.verifiedUnits}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                    {bloodDonationHistory.length} verified records
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="p-4 text-left border-t lg:border-t-0 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100/60 dark:hover:bg-slate-900/60 transition-colors"
                >
                  <p className="text-xs text-slate-500 dark:text-slate-400">Past History</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    {stats.historyCount}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Search old records
                  </p>
                </button>
              </div>
            </section>

            {/* Monthly Blood Requests & Successful Donations Visual Dashboard (Recharts) */}
            <HospitalAnalyticsDashboard
              bloodRequests={bloodRequests}
              bloodDonationHistory={bloodDonationHistory}
              isDark={theme === 'dark'}
              onRequestBlood={openRequestBloodModal}
            />

            {/* Quick Recent Accepted Donors Preview on Home */}
            {acceptedDonors.length > 0 && (
              <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Latest Accepted Donors
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Recent people who accepted your blood requests.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('donors')}
                    className="text-xs font-bold text-brand-blue dark:text-cyan-400 hover:underline whitespace-nowrap"
                  >
                    View All ({acceptedDonors.length}) →
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {acceptedDonors.slice(0, 3).map((m) => (
                    <div
                      key={m.matchId}
                      className="py-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 font-extrabold flex items-center justify-center shrink-0">
                          {m.donorBloodGroup}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {m.donorDisplayName}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400 truncate">
                            {m.donorPhone || m.donorCity} · Request {m.bloodRequestId}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDonorReqFilter(m.bloodRequestId);
                          setActiveTab('donors');
                        }}
                        className={cn(
                          'text-xs font-bold whitespace-nowrap hover:underline',
                          getDonorStageTextClass(m.responseStatus)
                        )}
                      >
                        {getDonorStageLabel(m.responseStatus)} →
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: BLOOD REQUESTS                                        */}
        {/* ============================================================ */}
        {activeTab === 'blood' && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Blood Requests</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage incoming requests or send a new blood request to nearby people.
                </p>
              </div>
              <button
                type="button"
                onClick={openRequestBloodModal}
                className="px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
              >
                <Plus size={15} />
                <span>Request Blood</span>
              </button>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ID, patient, city, blood group..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-blue"
                />
              </div>

              <select
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="ALL">All Blood Groups</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    Blood Group {bg}
                  </option>
                ))}
              </select>

              <select
                value={emergencyFilter}
                onChange={(e) => setEmergencyFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="ALL">All Urgency Levels</option>
                {EMERGENCY_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium"
              >
                <option value="ALL">All Statuses</option>
                {HOSPITAL_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {sortedBloodRequests.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                <Droplet size={26} className="mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No blood requests match your search.
                </p>
                <button
                  type="button"
                  onClick={openRequestBloodModal}
                  className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Request Blood
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedBloodRequests.map((req) => (
                  <BloodRequestCard
                    key={req.bloodRequestId}
                    req={req}
                    reqMatches={acceptedDonorsByReqId[req.bloodRequestId] || []}
                    unlocked={unlockedContacts[req.bloodRequestId]}
                    isBusy={busyReqId === req.bloodRequestId}
                    isLoadingContact={loadingContactId === req.bloodRequestId}
                    currentUid={firebaseUser?.uid}
                    onUpdateBlood={handleUpdateBlood}
                    onUnlockContact={handleUnlockContact}
                    onOpenDonorDetails={handleOpenDonorDetailsForReq}
                    onOpenChat={handleOpenChat}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================================================ */}
        {/* TAB 2: DONOR DETAILS (DYNAMIC ACCEPTED DONORS & PROCESS)     */}
        {/* ============================================================ */}
        {activeTab === 'donors' && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Donor Details
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    People who accepted blood donation requests appear here automatically with their profile details and donation progress.
                  </p>
                </div>
                {(donorReqFilter !== 'ALL' || donorStatusFilter !== 'ALL' || donorSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDonorReqFilter('ALL');
                      setDonorStatusFilter('ALL');
                      setDonorSearch('');
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 self-start"
                  >
                    <RotateCcw size={13} /> Clear Filters
                  </button>
                )}
              </div>

              {/* Donation Stage Quick-Filter Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { key: 'ALL', label: 'All Donors', count: acceptedDonors.length },
                    { key: 'INTERESTED', label: 'Accepted', count: donorStageCounts.INTERESTED },
                    { key: 'SELECTED', label: 'Selected', count: donorStageCounts.SELECTED },
                    { key: 'SCHEDULED', label: 'Scheduled', count: donorStageCounts.SCHEDULED },
                    { key: 'COMPLETED', label: 'Donated', count: donorStageCounts.COMPLETED },
                  ] as const
                ).map((stage) => {
                  const isActive = donorStatusFilter === stage.key;
                  return (
                    <button
                      key={stage.key}
                      type="button"
                      onClick={() => setDonorStatusFilter(stage.key)}
                      className={cn(
                        'px-3 py-2 rounded-xl border text-left transition-colors',
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/50 border-brand-blue text-brand-blue dark:text-cyan-300'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
                      )}
                    >
                      <p className="text-[11px] font-medium">{stage.label}</p>
                      <p className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                        {stage.count}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Search & Request Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={donorSearch}
                    onChange={(e) => setDonorSearch(e.target.value)}
                    placeholder="Search donor name, phone, blood group, area, request ID..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <select
                  value={donorReqFilter}
                  onChange={(e) => setDonorReqFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  <option value="ALL">All Blood Requests</option>
                  {bloodRequests.map((r) => (
                    <option key={r.bloodRequestId} value={r.bloodRequestId}>
                      {r.bloodRequestId} · {r.requiredBloodGroup} ({r.patientDisplayName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredAcceptedDonors.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
                <UserCheck size={26} className="mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No accepted donors found for this view.
                </p>
                <p className="text-xs text-slate-500">
                  Send a blood request and donors who accept will appear here right away.
                </p>
                <button
                  type="button"
                  onClick={openRequestBloodModal}
                  className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus size={14} /> Request Blood
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredAcceptedDonors.map((match) => (
                  <DonorDetailCard
                    key={match.matchId}
                    match={match}
                    profile={donorProfileById[match.donorId]}
                    linkedReq={bloodRequestById[match.bloodRequestId]}
                    isBusy={busyDonorMatchId === match.matchId}
                    onSelectDonor={handleSelectDonor}
                    onOpenSchedule={handleOpenSchedule}
                    onOpenComplete={handleOpenComplete}
                    onOpenChat={handleOpenChat}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ============================================================ */}
        {/* TAB 3: SEARCHABLE BLOOD HISTORY                              */}
        {/* ============================================================ */}
        {activeTab === 'history' && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    Blood History
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Search past blood donations, donor names, patient references, and dates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetHistoryFilters}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 self-start"
                >
                  <RotateCcw size={13} /> Reset
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="lg:col-span-2 relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={historyQuery}
                    onChange={(e) => setHistoryQuery(e.target.value)}
                    placeholder="Search ID, donor name, patient, notes..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <select
                  value={historyBloodGroup}
                  onChange={(e) => setHistoryBloodGroup(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  <option value="ALL">All Blood Groups</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>

                <select
                  value={historyType}
                  onChange={(e) => setHistoryType(e.target.value as HistoryRecordType)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  <option value="ALL">All Records</option>
                  <option value="VERIFIED_DONATIONS">Completed Donations</option>
                  <option value="FULFILLED_REQUESTS">Fulfilled Requests</option>
                  <option value="CANCELLED_REQUESTS">Cancelled Requests</option>
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="From date"
                    value={historyFromDate}
                    onChange={(e) => setHistoryFromDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <input
                    type="date"
                    aria-label="To date"
                    value={historyToDate}
                    onChange={(e) => setHistoryToDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-6 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span>
                  Showing{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {filteredHistoryDonations.length + filteredHistoryRequests.length}
                  </strong>{' '}
                  records
                </span>
                <span>
                  Completed Donations:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {filteredHistoryDonations.length}
                  </strong>{' '}
                  ({filteredHistoryDonations.reduce((acc, h) => acc + (h.unitsDonated || 0), 0)}{' '}
                  units)
                </span>
              </div>
            </div>

            {filteredHistoryDonations.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Completed Donations
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {filteredHistoryDonations.length} record
                    {filteredHistoryDonations.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Record ID</th>
                        <th className="px-4 py-3 font-semibold">Donor</th>
                        <th className="px-4 py-3 font-semibold">Blood Group</th>
                        <th className="px-4 py-3 font-semibold">Units</th>
                        <th className="px-4 py-3 font-semibold">Hospital</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredHistoryDonations.map((rec) => (
                        <HistoryDonationRow key={rec.historyId} rec={rec} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredHistoryRequests.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Past Requests
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {filteredHistoryRequests.length} request
                    {filteredHistoryRequests.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHistoryRequests.map((req) => {
                    const isCancelled =
                      req.status === 'REQUEST_CANCELLED' || req.hospitalStatus === 'Cancelled';
                    return (
                      <div
                        key={req.bloodRequestId}
                        className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {req.bloodRequestId}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span className="font-bold text-red-700 dark:text-red-400">
                              {req.requiredBloodGroup}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <span
                              className={cn(
                                'font-semibold',
                                isCancelled
                                  ? 'text-slate-500 dark:text-slate-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              )}
                            >
                              {isCancelled ? 'Cancelled' : 'Fulfilled'}
                            </span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-200 font-medium">
                            Patient: {req.patientDisplayName} · {req.hospitalName}, {req.city}
                          </p>
                          {(req.hospitalNotes || req.cancellationReason) && (
                            <p className="text-slate-500 dark:text-slate-400">
                              {req.hospitalNotes || req.cancellationReason}
                            </p>
                          )}
                        </div>

                        <div className="text-left sm:text-right shrink-0 space-y-1 tabular-nums">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {req.confirmedUnits} / {req.requiredUnits} units
                          </p>
                          <p className="text-slate-500">
                            {formatDisplayDateTime(req.fulfilledAt || req.updatedAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredHistoryDonations.length === 0 && filteredHistoryRequests.length === 0 && (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
                <Clock size={26} className="mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  No past records match your search.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ============================================================ */}
        {/* TAB 4: BLOOD ALERTS                                          */}
        {/* ============================================================ */}
        {activeTab === 'notifications' && (
          <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white">Blood Alerts</h1>
                <p className="text-xs text-slate-500">
                  Live alerts when donors accept your blood requests.
                </p>
              </div>
              {unreadBloodCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead()}
                  className="text-xs font-semibold text-brand-blue dark:text-cyan-400 hover:underline"
                >
                  Mark All Read
                </button>
              )}
            </div>

            {bloodNotifications.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">No alerts yet.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {bloodNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-5 py-4 flex items-start justify-between gap-4',
                      !n.isRead && 'bg-blue-50/40 dark:bg-blue-950/20'
                    )}
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">{n.message}</p>
                      <p className="text-[11px] text-slate-400 tabular-nums">
                        {formatDisplayDateTime(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {n.notificationType === 'BLOOD_DONOR_INTERESTED' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (n.bloodRequestId) setDonorReqFilter(n.bloodRequestId);
                            setActiveTab('donors');
                            if (!n.isRead) void markNotificationRead(n.id);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-brand-blue text-white text-[11px] font-semibold"
                        >
                          Open Donor Details
                        </button>
                      )}
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => void markNotificationRead(n.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ============================================================ */}
      {/* MOBILE BOTTOM NAVIGATION BAR WITH FLOATING CENTER '+' BUTTON */}
      {/* (EXACT MATCH TO HELPCONNECT SCREENSHOT)                      */}
      {/* ============================================================ */}
      <nav
        aria-label="Hospital Mobile Navigation"
        className="md:hidden fixed bottom-0 w-full z-40 glass pt-1.5 pb-2 px-4 flex items-center justify-between rounded-t-2xl"
      >
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-2 py-1 transition-all',
            activeTab === 'home' ? 'text-brand-blue' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Home size={19} />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('blood')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-2 py-1 transition-all',
            activeTab === 'blood' ? 'text-brand-blue' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Search size={19} />
          <span className="text-[10px] font-semibold">Requests</span>
        </button>

        <button
          type="button"
          onClick={openRequestBloodModal}
          aria-label="Request Blood"
          className="relative -top-4 bg-brand-blue hover:bg-blue-700 text-white p-3.5 rounded-full shadow-lg shadow-blue-500/30 transition-all"
        >
          <PlusCircle size={22} className="text-white" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('donors')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-2 py-1 transition-all',
            activeTab === 'donors' ? 'text-brand-blue' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <UserCheck size={19} />
          <span className="text-[10px] font-semibold">Donors</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-2 py-1 transition-all',
            activeTab === 'history' ? 'text-brand-blue' : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Clock size={19} />
          <span className="text-[10px] font-semibold">History</span>
        </button>
      </nav>

      {/* ============================================================ */}
      {/* MODAL: REQUEST BLOOD                                         */}
      {/* ============================================================ */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Droplet size={18} className="text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold">Request Blood</h3>
                  <p className="text-[11px] text-slate-300">
                    Sends a blood request directly to nearby people
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                aria-label="Close modal"
                className="p-1 rounded-lg hover:bg-white/15"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleBroadcastBloodRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Patient Name or Ward *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqPatientName}
                    onChange={(e) => setReqPatientName(e.target.value)}
                    placeholder="e.g. ICU Ward Bed 4"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Blood Group Needed *
                  </label>
                  <select
                    value={reqBloodGroup}
                    onChange={(e) => setReqBloodGroup(e.target.value as BloodGroup)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold text-red-600"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Units Needed *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={reqUnits}
                    onChange={(e) => setReqUnits(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Urgency *
                  </label>
                  <select
                    value={reqEmergency}
                    onChange={(e) => setReqEmergency(e.target.value as BloodEmergencyLevel)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Critical">Critical (Immediate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Hospital Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqHospitalName}
                    onChange={(e) => setReqHospitalName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqCity}
                    onChange={(e) => setReqCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Hospital Address / Area *
                  </label>
                  <input
                    type="text"
                    required
                    value={reqLocation}
                    onChange={(e) => setReqLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Needed Date &amp; Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={reqDateTime}
                    onChange={(e) => setReqDateTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={reqContactPhone}
                    onChange={(e) => setReqContactPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Short Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={reqMedicalInfo}
                    onChange={(e) => setReqMedicalInfo(e.target.value)}
                    placeholder="Add ward floor, blood bank gate, or special instructions..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reqAllowCompatible}
                  onChange={(e) => setReqAllowCompatible(e.target.checked)}
                  className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                />
                <span>Also alert compatible blood groups if exact match is not available.</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 text-xs font-extrabold inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {submittingRequest ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  <span>Send Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SET DONATION TIME                                     */}
      {/* ============================================================ */}
      {scheduleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Set Donation Time
            </h3>
            <p className="text-xs text-slate-500">
              Choose when <strong>{scheduleTarget.donorDisplayName}</strong> should visit{' '}
              {myHospitalName}.
            </p>

            <form onSubmit={handleConfirmSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setScheduleTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  Save Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRM COMPLETED DONATION                            */}
      {/* ============================================================ */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Confirm Blood Donation
            </h3>
            <p className="text-xs text-slate-500">
              Enter the units donated by <strong>{completeTarget.donorDisplayName}</strong>. This
              record will be saved to History.
            </p>

            <form onSubmit={handleConfirmComplete} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Units Donated *
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  required
                  value={completeUnits}
                  onChange={(e) => setCompleteUnits(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="e.g. Screened and stored safely"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Confirm &amp; Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DIRECT CHAT                                           */}
      {/* ============================================================ */}
      {chatTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[520px]">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold">
                  Chat with {chatTarget.partnerName} ({chatTarget.partnerRoleLabel})
                </h3>
                <p className="text-[11px] text-slate-300">
                  Request {chatTarget.request.bloodRequestId} ·{' '}
                  {chatTarget.request.requiredBloodGroup}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatTarget(null)}
                aria-label="Close chat"
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950">
              {activeChatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
                  <MessageSquare size={22} />
                  <p>No messages yet. Say hello to coordinate the visit.</p>
                </div>
              ) : (
                activeChatMessages.map((msg) => {
                  const isMe = msg.senderId === firebaseUser?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col max-w-[80%]',
                        isMe ? 'ml-auto items-end' : 'mr-auto items-start'
                      )}
                    >
                      <div
                        className={cn(
                          'p-3 rounded-2xl text-xs leading-relaxed',
                          isMe
                            ? 'bg-brand-blue text-white rounded-br-none'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-none'
                        )}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 tabular-nums">
                        {formatDisplayDateTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleSendChat}
              className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                required
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:border-brand-blue"
              />
              <button
                type="submit"
                disabled={sendingChat}
                className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
              >
                {sendingChat ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
