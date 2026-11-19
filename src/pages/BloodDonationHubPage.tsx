import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  HeartHandshake,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  PlusCircle,
  Radio,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AuthGateCard } from '../components/AuthGateCard';
import { BloodRequestDetailsModal } from '../components/BloodRequestDetailsModal';
import { BloodChatModal } from '../components/BloodChatModal';
import { HospitalLocationMap } from '../components/HospitalLocationMap';
import {
  BLOOD_GROUPS,
  BLOOD_STATUS_META,
  BLOOD_STATUS_TIMELINE,
  COMPATIBLE_DONOR_GROUPS_FOR_RECIPIENT,
  COMPATIBLE_RECIPIENTS_FOR_DONOR,
  DONOR_RESPONSE_META,
  EMERGENCY_LEVEL_META,
  calculateDistanceKm,
  daysSinceLastDonation,
  isDonorCooldownClear,
  matchEligibleBloodDonors,
  resolveCoordinatesFromLocation,
} from '../lib/bloodMatching';
import { formatDisplayDateTime } from '../lib/statusHelpers';
import {
  BloodDonorMatch,
  BloodEmergencyLevel,
  BloodGroup,
  BloodRequest,
} from '../types';
import { cn } from '../lib/utils';

type HubTab = 'donor' | 'requester' | 'request';
type DonorSubTab = 'incoming' | 'nearby' | 'accepted' | 'rejected' | 'history';

export function BloodDonationHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    firebaseUser,
    authReady,
    user,
    notifications,
    messages,
    donorProfiles,
    myDonorProfile,
    bloodRequests,
    bloodDonorMatches,
    bloodDonationHistory,
    updateDonorProfile,
    createBloodRequest,
    respondToBloodRequest,
    selectBloodDonor,
    scheduleBloodDonation,
    completeBloodDonationUnits,
    cancelBloodRequest,
    pushPermission,
    requestPushPermission,
  } = useAppContext();

  const initialTabParam = searchParams.get('tab');
  const initialTab: HubTab =
    initialTabParam === 'requester' || initialTabParam === 'request'
      ? initialTabParam
      : 'donor';

  const [activeTab, setActiveTab] = useState<HubTab>(initialTab);
  const [donorSubTab, setDonorSubTab] = useState<DonorSubTab>('incoming');

  // Modals
  const [selectedRequestModal, setSelectedRequestModal] = useState<BloodRequest | null>(null);
  const [chatState, setChatState] = useState<{
    request: BloodRequest;
    partnerId: string;
    partnerName: string;
  } | null>(null);

  // Donor Preferences State
  const [prefBloodGroup, setPrefBloodGroup] = useState<BloodGroup | ''>('');
  const [prefAvailable, setPrefAvailable] = useState(true);
  const [prefCity, setPrefCity] = useState('');
  const [prefArea, setPrefArea] = useState('');
  const [prefMaxDist, setPrefMaxDist] = useState(25);
  const [prefInApp, setPrefInApp] = useState(true);
  const [prefPush, setPrefPush] = useState(true);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSms, setPrefSms] = useState(false);
  const [prefOptOut, setPrefOptOut] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefStatusMsg, setPrefStatusMsg] = useState<string | null>(null);

  // Request Form State
  const [patientFullName, setPatientFullName] = useState('');
  const [requiredBloodGroup, setRequiredBloodGroup] = useState<BloodGroup>('O+');
  const [allowCompatibleGroups, setAllowCompatibleGroups] = useState(true);
  const [requiredUnits, setRequiredUnits] = useState(1);
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [reqCity, setReqCity] = useState('Chennai');
  const [reqLocation, setReqLocation] = useState('');
  const [requiredDateTime, setRequiredDateTime] = useState(() => {
    const dt = new Date(Date.now() + 4 * 60 * 60 * 1000);
    return dt.toISOString().slice(0, 16);
  });
  const [emergencyLevel, setEmergencyLevel] = useState<BloodEmergencyLevel>('Urgent');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPhoneNumber, setContactPhoneNumber] = useState('');
  const [additionalMedicalInfo, setAdditionalMedicalInfo] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [broadcastReceipt, setBroadcastReceipt] = useState<{
    bloodRequestId: string;
    matchedCount: number;
    notificationsSentCount: number;
    channelBreakdown: { in_app: number; push: number; email: number; sms: number };
  } | null>(null);

  // Requester inline management state
  const [expandedMaps, setExpandedMaps] = useState<Record<string, boolean>>({});
  const [scheduleInputs, setScheduleInputs] = useState<Record<string, string>>({});
  const [unitInputs, setUnitInputs] = useState<Record<string, number>>({});
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const uid = firebaseUser?.uid || '';

  // Sync URL ?tab=...
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'donor' || t === 'requester' || t === 'request') {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Deep-link URL ?requestId=BLD-...
  useEffect(() => {
    const reqId = searchParams.get('requestId');
    if (!reqId || bloodRequests.length === 0) return;
    const found = bloodRequests.find((r) => r.bloodRequestId === reqId);
    if (found) {
      if (found.requesterId === uid) {
        setActiveTab('requester');
      }
      setSelectedRequestModal(found);
    }
  }, [searchParams, bloodRequests, uid]);

  // Hydrate donor preferences form when myDonorProfile loads
  useEffect(() => {
    if (myDonorProfile) {
      setPrefBloodGroup(myDonorProfile.bloodGroup || '');
      setPrefAvailable(myDonorProfile.isAvailable);
      setPrefCity(myDonorProfile.city || '');
      setPrefArea(myDonorProfile.approximateArea || '');
      setPrefMaxDist(myDonorProfile.maxDistanceKm || 25);
      setPrefInApp(myDonorProfile.notifyInApp);
      setPrefPush(myDonorProfile.notifyPush);
      setPrefEmail(myDonorProfile.notifyEmail);
      setPrefSms(myDonorProfile.notifySms);
      setPrefOptOut(myDonorProfile.notificationsOptOut);
    }
  }, [myDonorProfile]);

  useEffect(() => {
    if (!contactPersonName && user.name) {
      setContactPersonName(user.name);
    }
  }, [user.name, contactPersonName]);

  // Live preview of eligible donors who will be matched when submitting the blood request form
  const liveMatchPreview = useMemo(() => {
    const coords = resolveCoordinatesFromLocation(reqCity, reqLocation || hospitalAddress);
    return matchEligibleBloodDonors({
      requesterId: uid,
      requiredBloodGroup,
      allowCompatibleGroups,
      city: reqCity || 'Chennai',
      latitude: coords.lat,
      longitude: coords.lng,
      emergencyLevel,
      donors: donorProfiles,
    });
  }, [uid, requiredBloodGroup, allowCompatibleGroups, reqCity, reqLocation, hospitalAddress, emergencyLevel, donorProfiles]);

  // Donor views
  const myMatches = useMemo(
    () =>
      bloodDonorMatches
        .filter((m) => m.donorId === uid)
        .sort((a, b) => b.notifiedAt.localeCompare(a.notifiedAt)),
    [bloodDonorMatches, uid]
  );

  const matchByRequestId = useMemo(() => {
    const map: Record<string, BloodDonorMatch> = {};
    myMatches.forEach((m) => {
      map[m.bloodRequestId] = m;
    });
    return map;
  }, [myMatches]);

  const incomingMatches = useMemo(
    () =>
      myMatches.filter((m) => {
        const req = bloodRequests.find((r) => r.bloodRequestId === m.bloodRequestId);
        return (
          m.responseStatus === 'NOTIFIED' &&
          req &&
          !['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(req.status)
        );
      }),
    [myMatches, bloodRequests]
  );

  const acceptedMatches = useMemo(
    () =>
      myMatches.filter((m) =>
        ['INTERESTED', 'SELECTED', 'SCHEDULED'].includes(m.responseStatus)
      ),
    [myMatches]
  );

  const rejectedOrClosedMatches = useMemo(
    () =>
      myMatches.filter((m) =>
        ['REJECTED', 'CLOSED_FULFILLED', 'CANCELLED'].includes(m.responseStatus)
      ),
    [myMatches]
  );

  const nearbyOpenRequests = useMemo(() => {
    const donorLat = myDonorProfile?.latitude || 13.0827;
    const donorLng = myDonorProfile?.longitude || 80.2707;
    const donorGroup = myDonorProfile?.bloodGroup;
    const canDonateTo = donorGroup
      ? COMPATIBLE_RECIPIENTS_FOR_DONOR[donorGroup as BloodGroup] || []
      : [];

    return bloodRequests
      .filter(
        (r) =>
          r.requesterId !== uid &&
          !['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(r.status)
      )
      .map((r) => {
        const dist = calculateDistanceKm(donorLat, donorLng, r.latitude, r.longitude);
        const compatible =
          !donorGroup ||
          (r.allowCompatibleGroups
            ? canDonateTo.includes(r.requiredBloodGroup)
            : donorGroup === r.requiredBloodGroup);
        return { request: r, distanceKm: dist, compatible };
      })
      .sort((a, b) => {
        if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
        return a.distanceKm - b.distanceKm;
      });
  }, [bloodRequests, myDonorProfile, uid]);

  const myDonationHistory = useMemo(
    () =>
      bloodDonationHistory
        .filter((h) => h.donorId === uid)
        .sort((a, b) => b.donatedAt.localeCompare(a.donatedAt)),
    [bloodDonationHistory, uid]
  );

  // Requester views
  const mySubmittedRequests = useMemo(
    () =>
      bloodRequests
        .filter((r) => r.requesterId === uid)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bloodRequests, uid]
  );

  const requesterStats = useMemo(() => {
    const reqIds = new Set(mySubmittedRequests.map((r) => r.bloodRequestId));
    const relatedMatches = bloodDonorMatches.filter((m) => reqIds.has(m.bloodRequestId));
    return {
      totalRequests: mySubmittedRequests.length,
      matchingDonorsFound: mySubmittedRequests.reduce((sum, r) => sum + (r.matchedDonorsCount || 0), 0),
      notificationsSent: mySubmittedRequests.reduce((sum, r) => sum + (r.notificationsSentCount || 0), 0),
      interestedDonors: relatedMatches.filter((m) =>
        ['INTERESTED', 'SELECTED', 'SCHEDULED', 'COMPLETED'].includes(m.responseStatus)
      ).length,
      selectedDonors: relatedMatches.filter((m) =>
        ['SELECTED', 'SCHEDULED', 'COMPLETED'].includes(m.responseStatus)
      ).length,
      requiredUnits: mySubmittedRequests.reduce((sum, r) => sum + (r.requiredUnits || 0), 0),
      confirmedUnits: mySubmittedRequests.reduce((sum, r) => sum + (r.confirmedUnits || 0), 0),
    };
  }, [mySubmittedRequests, bloodDonorMatches]);

  const unreadBloodNotifCount = useMemo(
    () =>
      notifications.filter(
        (n) => !n.isRead && n.notificationType.startsWith('BLOOD_')
      ).length,
    [notifications]
  );

  const unreadChatThreadsCount = useMemo(
    () =>
      messages.filter(
        (m) =>
          m.requestId.startsWith('BLD-') &&
          m.senderId !== uid &&
          (!m.recipientId || m.recipientId === uid) &&
          !(m.readBy || []).includes(uid)
      ).length,
    [messages, uid]
  );

  if (!authReady) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-4">
        <div className="h-12 w-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <AuthGateCard
        title="Sign in to Access Blood Donor Matching"
        description="Submit urgent blood requests, broadcast alerts to compatible registered donors, manage donor availability, and coordinate securely in real time."
      />
    );
  }

  const switchTab = (next: HubTab) => {
    setActiveTab(next);
    setSearchParams({ tab: next });
  };

  const handleSaveDonorPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefStatusMsg(null);
    try {
      await updateDonorProfile({
        bloodGroup: prefBloodGroup,
        isAvailable: prefAvailable,
        city: prefCity.trim() || 'Chennai',
        approximateArea: prefArea.trim() || prefCity.trim() || 'Chennai',
        maxDistanceKm: prefMaxDist,
        notifyInApp: prefInApp,
        notifyPush: prefPush,
        notifyEmail: prefEmail,
        notifySms: prefSms,
        notificationsOptOut: prefOptOut,
      });
      setPrefStatusMsg('Donor profile & notification preferences saved.');
      setTimeout(() => setPrefStatusMsg(null), 3500);
    } catch (err) {
      setPrefStatusMsg(err instanceof Error ? err.message : 'Unable to save donor preferences.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSubmitBloodRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setBroadcastReceipt(null);

    if (
      !patientFullName.trim() ||
      !hospitalName.trim() ||
      !hospitalAddress.trim() ||
      !reqCity.trim() ||
      !reqLocation.trim() ||
      !contactPersonName.trim() ||
      !contactPhoneNumber.trim()
    ) {
      setRequestError('Please fill in all required patient, hospital, and contact fields.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const res = await createBloodRequest({
        patientFullName: patientFullName.trim(),
        requiredBloodGroup,
        allowCompatibleGroups,
        requiredUnits: Math.max(1, Math.min(20, Number(requiredUnits) || 1)),
        hospitalName: hospitalName.trim(),
        hospitalAddress: hospitalAddress.trim(),
        city: reqCity.trim(),
        location: reqLocation.trim(),
        requiredDateTime: requiredDateTime.replace('T', ' '),
        emergencyLevel,
        contactPersonName: contactPersonName.trim(),
        contactPhoneNumber: contactPhoneNumber.trim(),
        additionalMedicalInfo: additionalMedicalInfo.trim() || undefined,
      });

      setBroadcastReceipt({
        bloodRequestId: res.request.bloodRequestId,
        matchedCount: res.matchedCount,
        notificationsSentCount: res.notificationsSentCount,
        channelBreakdown: res.channelBreakdown,
      });
      setPatientFullName('');
      setHospitalName('');
      setHospitalAddress('');
      setReqLocation('');
      setAdditionalMedicalInfo('');
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : 'Failed to create blood request.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleQuickDonorRespond = async (
    bloodRequestId: string,
    action: 'INTERESTED' | 'REJECTED'
  ) => {
    setActionBusyId(bloodRequestId);
    setActionFeedback(null);
    try {
      await respondToBloodRequest(bloodRequestId, action);
      setActionFeedback({
        type: 'ok',
        text:
          action === 'INTERESTED'
            ? `Accepted ${bloodRequestId}! The requester has been notified and can now message or select you.`
            : `Declined ${bloodRequestId}.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to update response.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSelectDonor = async (bloodRequestId: string, donorId: string) => {
    setActionBusyId(`${bloodRequestId}_${donorId}`);
    setActionFeedback(null);
    try {
      await selectBloodDonor(bloodRequestId, donorId);
      setActionFeedback({
        type: 'ok',
        text: 'Donor selected! Authorized contact info and direct messaging are now active.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to select donor.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleScheduleDonor = async (bloodRequestId: string, donorId: string) => {
    const key = `${bloodRequestId}_${donorId}`;
    const dtVal = scheduleInputs[key] || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
    setActionBusyId(key);
    setActionFeedback(null);
    try {
      await scheduleBloodDonation(bloodRequestId, donorId, dtVal.replace('T', ' '));
      setActionFeedback({ type: 'ok', text: `Donation scheduled for ${dtVal.replace('T', ' ')}.` });
    } catch (err) {
      setActionFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to schedule donation.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCompleteDonorUnits = async (bloodRequestId: string, donorId: string) => {
    const key = `${bloodRequestId}_${donorId}`;
    const units = unitInputs[key] || 1;
    const notes = completionNotes[key] || '';
    setActionBusyId(key);
    setActionFeedback(null);
    try {
      await completeBloodDonationUnits(bloodRequestId, donorId, units, notes);
      setActionFeedback({
        type: 'ok',
        text: `Confirmed ${units} unit(s) donated and updated donation history.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to confirm blood donation.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCancelBloodReq = async (bloodRequestId: string) => {
    setActionBusyId(bloodRequestId);
    setActionFeedback(null);
    try {
      await cancelBloodRequest(bloodRequestId, 'Cancelled by requester');
      setActionFeedback({ type: 'ok', text: `Request ${bloodRequestId} cancelled.` });
    } catch (err) {
      setActionFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to cancel request.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const cooldownDays = daysSinceLastDonation(myDonorProfile?.lastDonationDate);
  const cooldownClear = isDonorCooldownClear(myDonorProfile?.lastDonationDate);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Medical Red & White Header Banner */}
      <section className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold">
              <Radio size={14} className="animate-pulse" />
              <span>Real-Time Blood Donor Broadcast Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Smart Blood Donor Matching & Requests
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Broadcast blood requests simultaneously to every medically compatible, active, nearby donor—or manage your donor availability and live hospital coordination.
            </p>
          </div>

          {/* Quick Donor Status & Tab Switcher */}
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="px-3.5 py-2 rounded-xl bg-red-600 text-white font-black text-sm inline-flex items-center gap-1.5 shadow-sm">
                <Droplet size={16} className="fill-white" />
                <span>{myDonorProfile?.bloodGroup || 'Group Not Set'}</span>
              </div>
              <div
                className={cn(
                  'px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5',
                  myDonorProfile?.isAvailable
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    myDonorProfile?.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
                  )}
                />
                <span>{myDonorProfile?.isAvailable ? 'Available Donor' : 'Availability Paused'}</span>
              </div>
              {(unreadBloodNotifCount > 0 || unreadChatThreadsCount > 0) && (
                <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold inline-flex items-center gap-1.5 tabular-nums">
                  <Bell size={14} />
                  <span>
                    {unreadBloodNotifCount} Alerts · {unreadChatThreadsCount} Unread Msgs
                  </span>
                </div>
              )}
            </div>

            {/* Top Navigation Tabs */}
            <div className="inline-flex flex-wrap p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1">
              <button
                type="button"
                onClick={() => switchTab('donor')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5',
                  activeTab === 'donor'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <HeartHandshake size={15} />
                <span>Donor Dashboard</span>
                {incomingMatches.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black tabular-nums">
                    {incomingMatches.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchTab('requester')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5',
                  activeTab === 'requester'
                    ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Activity size={15} />
                <span>Requester Dashboard</span>
                {mySubmittedRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold tabular-nums">
                    {mySubmittedRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => switchTab('request')}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5',
                  activeTab === 'request'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100'
                )}
              >
                <PlusCircle size={15} />
                <span>Request Blood</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mandatory Medical Verification Notice */}
        <div className="mt-5 rounded-2xl bg-red-50/70 dark:bg-red-950/25 border border-red-200/80 dark:border-red-900/60 px-4 py-3 flex items-start gap-3 text-xs text-red-900 dark:text-red-200">
          <ShieldAlert size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Medical Safety Disclaimer:</strong> Donor blood group profiles are community-registered and do not guarantee medical eligibility. Final blood typing, antibody cross-matching, hemoglobin levels, and donor fitness screening must be completed at the hospital blood bank before donation.
          </p>
        </div>
      </section>

      {actionFeedback && (
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-xs font-semibold border flex items-center gap-2',
            actionFeedback.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          )}
        >
          {actionFeedback.type === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{actionFeedback.text}</span>
        </div>
      )}

      {/* ==================== TAB 1: DONOR DASHBOARD ==================== */}
      {activeTab === 'donor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Donor Profile & Eligibility Controls */}
          <aside className="lg:col-span-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-red-600" />
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  My Donor Settings
                </h2>
              </div>
              {myDonorProfile?.bloodGroupVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck size={12} /> Verified
                </span>
              )}
            </div>

            {!prefBloodGroup && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-900 dark:text-amber-200">
                Select and save your Blood Group below so matching blood requests in your area can alert you automatically.
              </div>
            )}

            <form onSubmit={handleSaveDonorPrefs} className="space-y-4">
              <div>
                <label htmlFor="donor-bg" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  My Blood Group
                </label>
                <select
                  id="donor-bg"
                  value={prefBloodGroup}
                  onChange={(e) => setPrefBloodGroup(e.target.value as BloodGroup | '')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-white"
                >
                  <option value="">-- Select Blood Group --</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
                {prefBloodGroup && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    Can donate RBCs to:{' '}
                    <strong className="text-red-600 dark:text-red-400">
                      {COMPATIBLE_RECIPIENTS_FOR_DONOR[prefBloodGroup].join(', ')}
                    </strong>
                  </p>
                )}
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950/60 cursor-pointer">
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">
                    Available to Donate Blood
                  </span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                    Include my profile in broadcast searches
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={prefAvailable}
                  onChange={(e) => setPrefAvailable(e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="donor-city" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    City
                  </label>
                  <input
                    id="donor-city"
                    type="text"
                    value={prefCity}
                    onChange={(e) => setPrefCity(e.target.value)}
                    placeholder="Chennai"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="donor-area" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Area
                  </label>
                  <input
                    id="donor-area"
                    type="text"
                    value={prefArea}
                    onChange={(e) => setPrefArea(e.target.value)}
                    placeholder="Anna Nagar"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Max Travel Distance</span>
                  <span className="text-red-600 dark:text-red-400 tabular-nums">{prefMaxDist} km</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={prefMaxDist}
                  onChange={(e) => setPrefMaxDist(Number(e.target.value))}
                  className="w-full accent-red-600"
                />
              </div>

              {/* Cooldown Readout */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-700 dark:text-slate-300">56-Day Eligibility Cooldown</span>
                  <span className={cooldownClear ? 'text-emerald-600' : 'text-amber-600'}>
                    {cooldownClear ? 'Eligible' : `${56 - (cooldownDays || 0)}d remaining`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {cooldownDays !== null
                    ? `Last recorded donation: ${cooldownDays} day(s) ago · Total donations: ${myDonorProfile?.totalDonations || myDonationHistory.length}`
                    : `No cooldown restriction · Completed donations: ${myDonorProfile?.totalDonations || myDonationHistory.length}`}
                </p>
              </div>

              {/* Notification Channels */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Notification Channels
                  </span>
                  {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={() => void requestPushPermission()}
                      className="text-[11px] font-bold text-red-600 hover:underline"
                    >
                      Enable Browser Push
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={prefInApp}
                      disabled={prefOptOut}
                      onChange={(e) => setPrefInApp(e.target.checked)}
                      className="accent-red-600"
                    />
                    <span>In-App</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={prefPush}
                      disabled={prefOptOut}
                      onChange={(e) => setPrefPush(e.target.checked)}
                      className="accent-red-600"
                    />
                    <span>Push</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={prefEmail}
                      disabled={prefOptOut}
                      onChange={(e) => setPrefEmail(e.target.checked)}
                      className="accent-red-600"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={prefSms}
                      disabled={prefOptOut}
                      onChange={(e) => setPrefSms(e.target.checked)}
                      className="accent-red-600"
                    />
                    <span>SMS</span>
                  </label>
                </div>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefOptOut}
                    onChange={(e) => setPrefOptOut(e.target.checked)}
                    className="accent-red-600"
                  />
                  <BellOff size={14} className="text-slate-500" />
                  <span>Opt out of all broadcast blood alerts</span>
                </label>
              </div>

              {prefStatusMsg && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  {prefStatusMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={savingPrefs}
                className="w-full min-h-[42px] py-2.5 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors"
              >
                {savingPrefs && <Loader2 size={14} className="animate-spin" />}
                <span>Save Donor Preferences</span>
              </button>
            </form>
          </aside>

          {/* Right Column: Donor Requests & History Feed */}
          <div className="lg:col-span-8 space-y-4">
            {/* Donor Sub-tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              {[
                { key: 'incoming', label: 'Incoming Alerts', count: incomingMatches.length },
                { key: 'nearby', label: 'Nearby Open Requests', count: nearbyOpenRequests.length },
                { key: 'accepted', label: 'Accepted / Selected', count: acceptedMatches.length },
                { key: 'rejected', label: 'Declined / Closed', count: rejectedOrClosedMatches.length },
                { key: 'history', label: 'Completed History', count: myDonationHistory.length },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setDonorSubTab(t.key as DonorSubTab)}
                  className={cn(
                    'px-3.5 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5',
                    donorSubTab === t.key
                      ? 'bg-red-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                >
                  <span>{t.label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-md text-[10px] tabular-nums',
                      donorSubTab === t.key
                        ? 'bg-red-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Sub-tab: Incoming / Accepted / Rejected Matches */}
            {(donorSubTab === 'incoming' ||
              donorSubTab === 'accepted' ||
              donorSubTab === 'rejected') && (
              <div className="space-y-3">
                {(() => {
                  const list =
                    donorSubTab === 'incoming'
                      ? incomingMatches
                      : donorSubTab === 'accepted'
                        ? acceptedMatches
                        : rejectedOrClosedMatches;

                  if (list.length === 0) {
                    return (
                      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
                        <Droplet size={28} className="mx-auto text-red-400" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          No blood requests in this section
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                          {donorSubTab === 'incoming'
                            ? 'When a requester submits a compatible blood request near your city, you will receive an immediate broadcast notification here.'
                            : 'Your accepted, selected, declined, or closed donor matches appear here with real-time updates.'}
                        </p>
                      </div>
                    );
                  }

                  return list.map((match) => {
                    const req = bloodRequests.find((r) => r.bloodRequestId === match.bloodRequestId);
                    if (!req) return null;
                    const emerg = EMERGENCY_LEVEL_META[req.emergencyLevel] || EMERGENCY_LEVEL_META.Normal;
                    const respMeta = DONOR_RESPONSE_META[match.responseStatus] || DONOR_RESPONSE_META.NOTIFIED;
                    const busy = actionBusyId === req.bloodRequestId;

                    return (
                      <article
                        key={match.matchId}
                        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center shrink-0">
                              <span className="text-base font-black leading-none">{req.requiredBloodGroup}</span>
                              <span className="text-[9px] uppercase font-bold opacity-90">Needed</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400">
                                  {req.bloodRequestId}
                                </span>
                                <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', emerg.badgeClass)}>
                                  {emerg.label}
                                </span>
                                <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', respMeta.badgeClass)}>
                                  {respMeta.label}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                  {match.compatibilityType === 'EXACT' ? 'Exact Group Match' : 'Compatible RBC'}
                                </span>
                              </div>
                              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <Building2 size={15} className="text-red-600" />
                                <span>{req.hospitalName}</span>
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin size={12} className="text-slate-400" />
                                  {req.location}, {req.city} ({match.distanceKm} km away)
                                </span>
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Clock size={12} className="text-slate-400" />
                                  Required: {req.requiredDateTime}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right text-xs tabular-nums">
                            <span className="text-slate-500 dark:text-slate-400 block">Units Progress</span>
                            <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {req.confirmedUnits} / {req.requiredUnits} units
                            </span>
                          </div>
                        </div>

                        {match.scheduledDateTime && (
                          <div className="rounded-xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 px-3.5 py-2.5 text-xs text-cyan-900 dark:text-cyan-200 flex items-center gap-2 font-semibold">
                            <Calendar size={14} />
                            <span>Scheduled Donation Appointment: {match.scheduledDateTime}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestModal(req)}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-red-300"
                          >
                            View Request & Hospital Map
                          </button>

                          {match.responseStatus === 'NOTIFIED' &&
                            !['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(req.status) && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleQuickDonorRespond(req.bloodRequestId, 'INTERESTED')}
                                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 inline-flex items-center gap-1.5"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>I'm Interested (Accept)</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleQuickDonorRespond(req.bloodRequestId, 'REJECTED')}
                                  className="px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 inline-flex items-center gap-1.5"
                                >
                                  <XCircle size={14} />
                                  <span>Decline</span>
                                </button>
                              </>
                            )}

                          {['INTERESTED', 'SELECTED', 'SCHEDULED'].includes(match.responseStatus) && (
                            <button
                              type="button"
                              onClick={() =>
                                setChatState({
                                  request: req,
                                  partnerId: req.requesterId,
                                  partnerName: req.requesterDisplayName,
                                })
                              }
                              className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 inline-flex items-center gap-1.5"
                            >
                              <MessageSquare size={14} />
                              <span>Message Requester</span>
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  });
                })()}
              </div>
            )}

            {/* Sub-tab: Nearby Open Blood Requests */}
            {donorSubTab === 'nearby' && (
              <div className="space-y-3">
                {nearbyOpenRequests.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
                    <Navigation size={26} className="mx-auto text-slate-400" />
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      No open community blood requests right now
                    </p>
                  </div>
                ) : (
                  nearbyOpenRequests.map(({ request: req, distanceKm, compatible }) => {
                    const existingMatch = matchByRequestId[req.bloodRequestId];
                    const emerg = EMERGENCY_LEVEL_META[req.emergencyLevel] || EMERGENCY_LEVEL_META.Normal;
                    return (
                      <article
                        key={req.bloodRequestId}
                        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                            {req.requiredBloodGroup}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-red-600">{req.bloodRequestId}</span>
                              <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', emerg.badgeClass)}>
                                {emerg.label}
                              </span>
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-md text-[11px] font-bold',
                                  compatible
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                )}
                              >
                                {compatible ? 'Compatible With Your Group' : 'Different Blood Group'}
                              </span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {req.hospitalName} · {req.city}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              ~{distanceKm} km away · {req.confirmedUnits}/{req.requiredUnits} units confirmed · By {req.requiredDateTime}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedRequestModal(req)}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:border-red-300"
                          >
                            View Details
                          </button>
                          {(!existingMatch || existingMatch.responseStatus === 'NOTIFIED') &&
                            req.requesterId !== firebaseUser?.uid &&
                            !['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(req.status) && (
                              <button
                                type="button"
                                disabled={actionBusyId === req.bloodRequestId}
                                onClick={() => void handleQuickDonorRespond(req.bloodRequestId, 'INTERESTED')}
                                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 disabled:opacity-50"
                              >
                                Accept &amp; Donate
                              </button>
                            )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}

            {/* Sub-tab: Completed Donation History */}
            {donorSubTab === 'history' && (
              <div className="space-y-3">
                {myDonationHistory.length === 0 ? (
                  <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
                    <CheckCircle2 size={28} className="mx-auto text-emerald-500" />
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      No verified blood donations recorded yet
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      When a requester confirms your completed blood donation, your verified record appears here.
                    </p>
                  </div>
                ) : (
                  myDonationHistory.map((hist) => (
                    <div
                      key={hist.historyId}
                      className="rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900 p-5 flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                          {hist.bloodGroup}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                              {hist.historyId}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              {hist.status}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {hist.hospitalName} · {hist.city}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            {hist.unitsDonated} unit(s) donated · Request {hist.bloodRequestId} · {formatDisplayDateTime(hist.donatedAt)}
                          </p>
                          {hist.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{hist.notes}"</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: REQUESTER DASHBOARD ==================== */}
      {activeTab === 'requester' && (
        <div className="space-y-6">
          {/* Requester Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'My Requests', value: requesterStats.totalRequests, accent: 'text-slate-900 dark:text-white' },
              { label: 'Matching Donors Found', value: requesterStats.matchingDonorsFound, accent: 'text-red-600 dark:text-red-400' },
              { label: 'Notifications Sent', value: requesterStats.notificationsSent, accent: 'text-rose-600 dark:text-rose-400' },
              { label: 'Interested Donors', value: requesterStats.interestedDonors, accent: 'text-blue-600 dark:text-blue-400' },
              { label: 'Selected Donors', value: requesterStats.selectedDonors, accent: 'text-indigo-600 dark:text-indigo-400' },
              {
                label: 'Units Confirmed',
                value: `${requesterStats.confirmedUnits}/${requesterStats.requiredUnits}`,
                accent: 'text-emerald-600 dark:text-emerald-400',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{stat.label}</p>
                <p className={cn('text-2xl font-black mt-1 tabular-nums', stat.accent)}>{stat.value}</p>
              </div>
            ))}
          </div>

          {mySubmittedRequests.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center space-y-3">
              <Droplet size={32} className="mx-auto text-red-500" />
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                You haven't submitted any blood requests yet
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Submit a blood donation request to automatically match and alert every eligible compatible donor in your city.
              </p>
              <button
                type="button"
                onClick={() => switchTab('request')}
                className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 inline-flex items-center gap-2"
              >
                <PlusCircle size={15} /> Create Blood Request
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {mySubmittedRequests.map((req) => {
                const statusMeta = BLOOD_STATUS_META[req.status] || BLOOD_STATUS_META.REQUEST_SUBMITTED;
                const emergMeta = EMERGENCY_LEVEL_META[req.emergencyLevel] || EMERGENCY_LEVEL_META.Normal;
                const reqMatches = bloodDonorMatches
                  .filter((m) => m.bloodRequestId === req.bloodRequestId)
                  .sort((a, b) => {
                    const rank: Record<string, number> = {
                      SCHEDULED: 0,
                      SELECTED: 1,
                      INTERESTED: 2,
                      COMPLETED: 3,
                      NOTIFIED: 4,
                      REJECTED: 5,
                      CLOSED_FULFILLED: 6,
                      CANCELLED: 7,
                    };
                    return (rank[a.responseStatus] ?? 9) - (rank[b.responseStatus] ?? 9);
                  });

                const unitPct = Math.min(
                  100,
                  Math.round((req.confirmedUnits / Math.max(1, req.requiredUnits)) * 100)
                );
                const isClosed = ['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(req.status);
                const mapOpen = Boolean(expandedMaps[req.bloodRequestId]);

                return (
                  <section
                    key={req.bloodRequestId}
                    className="rounded-3xl border border-red-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5"
                  >
                    {/* Request Summary Top Row */}
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex flex-col items-center justify-center shrink-0">
                          <span className="text-base font-black leading-none">{req.requiredBloodGroup}</span>
                          <span className="text-[9px] font-bold uppercase opacity-90">{req.requiredUnits}U</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                              <span className="font-mono text-red-600 dark:text-red-400">{req.bloodRequestId}</span> · {req.hospitalName}
                            </h2>
                            <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', emergMeta.badgeClass)}>
                              {emergMeta.label}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', statusMeta.badgeClass)}>
                              {statusMeta.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            Patient: <strong>{req.patientDisplayName}</strong> · {req.location}, {req.city} · Needed by{' '}
                            <span className="font-semibold tabular-nums">{req.requiredDateTime}</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                            Matched Donors: <strong>{req.matchedDonorsCount}</strong> · Alerts Sent:{' '}
                            <strong>{req.notificationsSentCount}</strong> · Interested:{' '}
                            <strong>
                              {
                                reqMatches.filter((m) =>
                                  ['INTERESTED', 'SELECTED', 'SCHEDULED', 'COMPLETED'].includes(m.responseStatus)
                                ).length
                              }
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMaps((prev) => ({
                              ...prev,
                              [req.bloodRequestId]: !prev[req.bloodRequestId],
                            }))
                          }
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:border-red-300"
                        >
                          {mapOpen ? 'Hide Map' : 'Hospital Map'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedRequestModal(req)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:border-red-300"
                        >
                          Full Details
                        </button>
                        {!isClosed && (
                          <button
                            type="button"
                            disabled={actionBusyId === req.bloodRequestId}
                            onClick={() => void handleCancelBloodReq(req.bloodRequestId)}
                            className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-50"
                          >
                            Cancel Request
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multi-Unit Progress Bar */}
                    <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300">
                          Blood Units Fulfillment Progress
                        </span>
                        <span className="text-red-600 dark:text-red-400 tabular-nums">
                          {req.confirmedUnits} of {req.requiredUnits} unit(s) confirmed ({unitPct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all duration-300"
                          style={{ width: `${unitPct}%` }}
                        />
                      </div>
                    </div>

                    {/* 9-Stage Status Timeline */}
                    {req.status === 'REQUEST_CANCELLED' ? (
                      <div className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Request Cancelled {req.cancellationReason ? `· ${req.cancellationReason}` : ''}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                        {BLOOD_STATUS_TIMELINE.map((step, idx) => {
                          const currentIdx = statusMeta.stepIndex;
                          const done = currentIdx >= idx;
                          const active = currentIdx === idx;
                          return (
                            <div
                              key={step.key}
                              className={cn(
                                'px-2.5 py-2 rounded-xl border text-[11px] font-bold transition-colors',
                                done
                                  ? active
                                    ? 'bg-red-600 text-white border-red-600'
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'
                              )}
                            >
                              <span className="block text-[10px] opacity-80 tabular-nums">Step {idx + 1}</span>
                              <span className="block truncate">{step.shortLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {mapOpen && (
                      <HospitalLocationMap
                        hospitalName={req.hospitalName}
                        hospitalAddress={req.hospitalAddress}
                        city={req.city}
                        latitude={req.latitude}
                        longitude={req.longitude}
                        heightClass="h-52"
                      />
                    )}

                    {/* Broadcast Donor Matches & Management */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Users size={14} className="text-red-600" />
                          <span>Broadcasted Eligible Donors ({reqMatches.length})</span>
                        </h3>
                      </div>

                      {reqMatches.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-xs text-slate-500 dark:text-slate-400">
                          No registered donors currently matched your criteria in the database at submission time. Any newly available donors can still discover this request in Nearby Open Requests.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {reqMatches.map((match) => {
                            const key = `${req.bloodRequestId}_${match.donorId}`;
                            const respMeta =
                              DONOR_RESPONSE_META[match.responseStatus] || DONOR_RESPONSE_META.NOTIFIED;
                            const busy = actionBusyId === key;
                            const canSelect =
                              !isClosed && match.responseStatus === 'INTERESTED';
                            const canScheduleOrComplete =
                              !isClosed &&
                              ['INTERESTED', 'SELECTED', 'SCHEDULED'].includes(match.responseStatus);
                            const canMessage = ['INTERESTED', 'SELECTED', 'SCHEDULED', 'COMPLETED'].includes(
                              match.responseStatus
                            );

                            return (
                              <div
                                key={match.matchId}
                                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                      {match.donorBloodGroup}
                                    </div>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                                          {match.donorDisplayName}
                                        </span>
                                        {match.donorVerified && (
                                          <ShieldCheck size={14} className="text-emerald-600" />
                                        )}
                                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border', respMeta.badgeClass)}>
                                          {respMeta.label}
                                        </span>
                                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                          {match.compatibilityType === 'EXACT' ? 'Exact' : 'Compatible'} · {match.distanceKm} km
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        City: {match.donorCity || 'Community'} · Alerted via:{' '}
                                        {match.notificationChannels.join(', ')}
                                        {match.scheduledDateTime ? ` · Scheduled: ${match.scheduledDateTime}` : ''}
                                        {match.fulfilledUnitsCount > 0 ? ` · Verified: ${match.fulfilledUnitsCount} unit(s)` : ''}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {canSelect && (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void handleSelectDonor(req.bloodRequestId, match.donorId)}
                                        className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 inline-flex items-center gap-1"
                                      >
                                        <UserCheck size={13} />
                                        <span>Select Donor</span>
                                      </button>
                                    )}

                                    {canMessage && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setChatState({
                                            request: req,
                                            partnerId: match.donorId,
                                            partnerName: match.donorDisplayName,
                                          })
                                        }
                                        className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 inline-flex items-center gap-1"
                                      >
                                        <MessageSquare size={13} />
                                        <span>Message</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {canScheduleOrComplete && (
                                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="datetime-local"
                                        value={
                                          scheduleInputs[key] ||
                                          new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
                                        }
                                        onChange={(e) =>
                                          setScheduleInputs((prev) => ({ ...prev, [key]: e.target.value }))
                                        }
                                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                      />
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => void handleScheduleDonor(req.bloodRequestId, match.donorId)}
                                        className="px-3 py-1.5 rounded-lg border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-200 font-bold hover:bg-cyan-100 shrink-0"
                                      >
                                        Schedule Time
                                      </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={unitInputs[key] || 1}
                                        onChange={(e) =>
                                          setUnitInputs((prev) => ({
                                            ...prev,
                                            [key]: Math.max(1, Number(e.target.value) || 1),
                                          }))
                                        }
                                        aria-label="Units donated"
                                        className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs tabular-nums"
                                      />
                                      <input
                                        type="text"
                                        value={completionNotes[key] || ''}
                                        onChange={(e) =>
                                          setCompletionNotes((prev) => ({ ...prev, [key]: e.target.value }))
                                        }
                                        placeholder="Optional bank confirmation note"
                                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                      />
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() =>
                                          void handleCompleteDonorUnits(req.bloodRequestId, match.donorId)
                                        }
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 shrink-0"
                                      >
                                        Confirm Units
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: REQUEST BLOOD FORM ==================== */}
      {activeTab === 'request' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSubmitBloodRequest}
            className="lg:col-span-8 rounded-3xl border border-red-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6 shadow-sm"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Droplet size={20} className="text-red-600 fill-red-600" />
                <span>Submit Urgent Blood Donation Request</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                An automatic Request ID (<span className="font-mono">BLD-YYYY-XXXXX</span>) will be generated and broadcast to ALL eligible matched donors immediately.
              </p>
            </div>

            {broadcastReceipt && (
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-extrabold text-sm">
                  <CheckCircle2 size={18} />
                  <span>
                    Blood Request <span className="font-mono">{broadcastReceipt.bloodRequestId}</span> Broadcasted!
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block">Matched Donors</span>
                    <strong className="text-base text-slate-900 dark:text-white tabular-nums">
                      {broadcastReceipt.matchedCount}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block">In-App Sent</span>
                    <strong className="text-base text-slate-900 dark:text-white tabular-nums">
                      {broadcastReceipt.channelBreakdown.in_app}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block">Push Queued</span>
                    <strong className="text-base text-slate-900 dark:text-white tabular-nums">
                      {broadcastReceipt.channelBreakdown.push}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block">Email Dispatched</span>
                    <strong className="text-base text-slate-900 dark:text-white tabular-nums">
                      {broadcastReceipt.channelBreakdown.email}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-slate-500 block">SMS Dispatched</span>
                    <strong className="text-base text-slate-900 dark:text-white tabular-nums">
                      {broadcastReceipt.channelBreakdown.sms}
                    </strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => switchTab('requester')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  Track Live Donor Responses in Requester Dashboard
                </button>
              </div>
            )}

            {requestError && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-300">
                {requestError}
              </div>
            )}

            {/* Patient & Blood Requirements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="bld-patient" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Patient Full Name * (Masked publicly; full name visible only to selected donors)
                </label>
                <input
                  id="bld-patient"
                  type="text"
                  required
                  value={patientFullName}
                  onChange={(e) => setPatientFullName(e.target.value)}
                  placeholder="Enter patient name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label htmlFor="bld-group" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Required Blood Group *
                </label>
                <select
                  id="bld-group"
                  value={requiredBloodGroup}
                  onChange={(e) => setRequiredBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-red-600 dark:text-red-400"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bld-units" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Required Blood Units *
                </label>
                <input
                  id="bld-units"
                  type="number"
                  min={1}
                  max={20}
                  required
                  value={requiredUnits}
                  onChange={(e) => setRequiredUnits(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm tabular-nums"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={allowCompatibleGroups}
                    onChange={(e) => setAllowCompatibleGroups(e.target.checked)}
                    className="mt-0.5 accent-red-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Include medically compatible RBC donor blood groups (exact group prioritized first)
                    </span>
                    <span className="text-slate-600 dark:text-slate-400">
                      For <strong>{requiredBloodGroup}</strong> patient:{' '}
                      {(allowCompatibleGroups
                        ? COMPATIBLE_DONOR_GROUPS_FOR_RECIPIENT[requiredBloodGroup]
                        : [requiredBloodGroup]
                      ).join(', ')}
                    </span>
                  </div>
                </label>
              </div>

              <div>
                <label htmlFor="bld-emerg" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Emergency Level *
                </label>
                <select
                  id="bld-emerg"
                  value={emergencyLevel}
                  onChange={(e) => setEmergencyLevel(e.target.value as BloodEmergencyLevel)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-semibold"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Critical">Critical Emergency</option>
                </select>
              </div>

              <div>
                <label htmlFor="bld-dt" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Required Date and Time *
                </label>
                <input
                  id="bld-dt"
                  type="datetime-local"
                  required
                  value={requiredDateTime}
                  onChange={(e) => setRequiredDateTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>
            </div>

            {/* Hospital & Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="sm:col-span-2">
                <label htmlFor="bld-hosp" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Hospital Name *
                </label>
                <input
                  id="bld-hosp"
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="E.g., Apollo Speciality Hospital"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bld-addr" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Hospital Address *
                </label>
                <input
                  id="bld-addr"
                  type="text"
                  required
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  placeholder="Street address & Blood Bank wing"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label htmlFor="bld-city" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  City *
                </label>
                <input
                  id="bld-city"
                  type="text"
                  required
                  value={reqCity}
                  onChange={(e) => setReqCity(e.target.value)}
                  placeholder="Chennai"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label htmlFor="bld-loc" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Area / Location *
                </label>
                <input
                  id="bld-loc"
                  type="text"
                  required
                  value={reqLocation}
                  onChange={(e) => setReqLocation(e.target.value)}
                  placeholder="E.g., Greams Road / Anna Nagar"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label htmlFor="bld-cname" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact Person Name *
                </label>
                <input
                  id="bld-cname"
                  type="text"
                  required
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  placeholder="Attender or coordinator name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label htmlFor="bld-cphone" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact Phone Number * (Shared only with selected donors)
                </label>
                <input
                  id="bld-cphone"
                  type="tel"
                  required
                  value={contactPhoneNumber}
                  onChange={(e) => setContactPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bld-med" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional Medical Information (Optional)
                </label>
                <textarea
                  id="bld-med"
                  rows={3}
                  value={additionalMedicalInfo}
                  onChange={(e) => setAdditionalMedicalInfo(e.target.value)}
                  placeholder="Ward / Blood Bank counter details, component type (Whole Blood / PRBC / Platelets), or arrival instructions."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingRequest}
              className="w-full min-h-[48px] py-3.5 rounded-xl bg-red-600 text-white font-extrabold text-sm hover:bg-red-700 disabled:opacity-60 inline-flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              {submittingRequest ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
              <span>Submit & Broadcast to All Eligible Donors ({liveMatchPreview.length})</span>
            </button>
          </form>

          {/* Right Column: Live Compatibility & Broadcast Reach Preview */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl border border-red-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Radio size={18} />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Live Donor Broadcast Preview
                </h3>
              </div>

              <div className="rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 space-y-1">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Eligible Matched Donors Ready Now
                </p>
                <p className="text-3xl font-black text-red-600 dark:text-red-400 tabular-nums">
                  {liveMatchPreview.length}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                  Exact ({requiredBloodGroup}):{' '}
                  <strong>{liveMatchPreview.filter((m) => m.compatibilityType === 'EXACT').length}</strong> · Compatible:{' '}
                  <strong>{liveMatchPreview.filter((m) => m.compatibilityType === 'COMPATIBLE').length}</strong>
                </p>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200">Automatic Matching Rules Applied:</p>
                <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Medically approved RBC compatibility ({requiredBloodGroup})</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Active accounts marked available to donate</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>56-day post-donation safety cooldown cleared</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Within donor max distance or matching city ({reqCity || 'Any'})</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Broadcasts to every eligible donor simultaneously</span>
                  </li>
                </ul>
              </div>

              {liveMatchPreview.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Top Matched Donors Preview
                  </p>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {liveMatchPreview.slice(0, 6).map((m) => (
                      <div
                        key={m.donor.uid}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[10px]">
                            {m.donor.bloodGroup}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {m.donor.displayName}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                          {m.distanceKm} km
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Blood Request Details Modal */}
      <BloodRequestDetailsModal
        request={selectedRequestModal}
        match={
          selectedRequestModal
            ? matchByRequestId[selectedRequestModal.bloodRequestId] || null
            : null
        }
        onClose={() => {
          setSelectedRequestModal(null);
          if (searchParams.get('requestId')) {
            setSearchParams({ tab: activeTab });
          }
        }}
        onOpenChat={(req, partnerId, partnerName) => {
          setSelectedRequestModal(null);
          setChatState({ request: req, partnerId, partnerName });
        }}
      />

      {/* Direct 1-to-1 Blood Coordination Chat Modal */}
      <BloodChatModal
        bloodRequest={chatState?.request || null}
        partnerId={chatState?.partnerId || ''}
        partnerName={chatState?.partnerName || ''}
        onClose={() => setChatState(null)}
      />
    </div>
  );
}
