import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Award,
  Banknote,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  HeartHandshake,
  Loader2,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  PackageCheck,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sun,
  Truck,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import {
  FoodAssistancePrivateContact,
  FoodAssistanceRequest,
  FoodDonationCertificate,
  FoodDonationPrivateContact,
  HomeageFoodRequestStatus,
} from '../types';
import {
  FOOD_DONATION_STATUS_META,
  getEffectiveFoodStatus,
  getFoodCategoryImage,
  getRemainingTimeLabel,
} from '../lib/foodHelpers';
import { FoodCertificateModal } from '../components/FoodCertificateModal';
import { formatDisplayDateTime } from '../lib/statusHelpers';
import { cn } from '../lib/utils';

const HOMEAGE_STATUS_OPTIONS: HomeageFoodRequestStatus[] = [
  'Submitted',
  'Waiting for Homeage',
  'Accepted',
  'Food Arranged',
  'Distribution Scheduled',
  'Out for Delivery',
  'Successfully Delivered',
  'Completed',
  'Rejected',
  'Cancelled',
];

type HomeageTab = 'surplus' | 'assistance' | 'community' | 'notifications';

export function HomeagePortalPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const {
    firebaseUser,
    homeageAccount,
    homeageOrganizations,
    foodDonations,
    foodCollectionRequests,
    foodAssistanceRequests,
    moneyDonations,
    volunteerRegistrations,
    foodCertificates,
    messages,
    notifications,
    hasMultipleRoles,
    clearSelectedPortal,
    signOutUser,
    homeageAcceptFoodDonation,
    getFoodDonationPrivateContact,
    markFoodReadyForPickup,
    confirmFoodHandover,
    getFoodAssistancePrivateContact,
    homeageManageFoodAssistance,
    offerFoodContribution,
    sendMessage,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<HomeageTab>('surplus');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Surplus food acceptance state
  const [acceptQtyByDonation, setAcceptQtyByDonation] = useState<Record<string, number>>({});
  const [pickupTimeByDonation, setPickupTimeByDonation] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [donorContacts, setDonorContacts] = useState<Record<string, FoodDonationPrivateContact>>({});
  const [activeCert, setActiveCert] = useState<FoodDonationCertificate | null>(null);

  // Food assistance management state
  const [draftStatusByAssist, setDraftStatusByAssist] = useState<
    Record<string, HomeageFoodRequestStatus>
  >({});
  const [draftVolunteerByAssist, setDraftVolunteerByAssist] = useState<Record<string, string>>({});
  const [draftScheduleByAssist, setDraftScheduleByAssist] = useState<Record<string, string>>({});
  const [assistContacts, setAssistContacts] = useState<Record<string, FoodAssistancePrivateContact>>({});

  // Offer food modal
  const [offerTarget, setOfferTarget] = useState<FoodAssistanceRequest | null>(null);
  const [offerQty, setOfferQty] = useState<number>(10);
  const [offerServings, setOfferServings] = useState<number>(10);
  const [offerMode, setOfferMode] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Chat modal
  const [chatAssist, setChatAssist] = useState<FoodAssistanceRequest | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const myHomeageOrg = useMemo(
    () => homeageOrganizations.find((h) => h.homeageId === homeageAccount?.homeageId) || null,
    [homeageOrganizations, homeageAccount?.homeageId]
  );

  const myHomeageName = homeageAccount?.homeageName || myHomeageOrg?.name || 'Food Homeage Portal';
  const myCity = (myHomeageOrg?.city || '').toLowerCase();

  // Strictly food-related notifications
  const foodNotifications = useMemo(
    () =>
      notifications.filter(
        (n) =>
          n.notificationType.startsWith('FOOD_') ||
          Boolean(n.foodDonationId) ||
          Boolean(n.foodAssistanceId)
      ),
    [notifications]
  );
  const unreadFoodCount = foodNotifications.filter((n) => !n.isRead).length;

  // My accepted collection requests
  const myCollectionRequests = useMemo(() => {
    const uid = firebaseUser?.uid;
    const hId = homeageAccount?.homeageId;
    return foodCollectionRequests.filter(
      (r) => (uid && r.receiverId === uid) || (hId && r.homeageId === hId)
    );
  }, [foodCollectionRequests, firebaseUser?.uid, homeageAccount?.homeageId]);

  // Money donations directed to this Homeage (or general food relief)
  const myMoneyDonations = useMemo(() => {
    const hId = homeageAccount?.homeageId;
    return moneyDonations.filter((m) => !hId || m.homeageId === hId || m.targetType === 'GENERAL_FUND');
  }, [moneyDonations, homeageAccount?.homeageId]);

  const sortedDonations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...foodDonations]
      .filter((d) => {
        if (!q) return true;
        return `${d.donationId} ${d.foodName} ${d.category} ${d.donorName} ${d.city} ${d.pickupArea}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aCity = a.city.toLowerCase() === myCity ? 1 : 0;
        const bCity = b.city.toLowerCase() === myCity ? 1 : 0;
        if (bCity !== aCity) return bCity - aCity;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [foodDonations, searchQuery, myCity]);

  const sortedAssistance = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...foodAssistanceRequests]
      .filter((r) => {
        if (!q) return true;
        return `${r.assistanceId} ${r.foodRequirement} ${r.requesterDisplayName} ${r.city} ${r.location} ${r.foodCategory}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aOwn = a.assignedHomeageId === homeageAccount?.homeageId ? 2 : a.city.toLowerCase() === myCity ? 1 : 0;
        const bOwn = b.assignedHomeageId === homeageAccount?.homeageId ? 2 : b.city.toLowerCase() === myCity ? 1 : 0;
        if (bOwn !== aOwn) return bOwn - aOwn;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [foodAssistanceRequests, searchQuery, homeageAccount?.homeageId, myCity]);

  // 8 Food Homeage Stats
  const stats = useMemo(() => {
    const totalFoodRequests = foodAssistanceRequests.length;
    const newFoodRequests = foodAssistanceRequests.filter(
      (r) => !r.homeageStatus || r.homeageStatus === 'Submitted' || r.homeageStatus === 'Waiting for Homeage'
    ).length;
    const availableSurplus = foodDonations.filter(
      (d) => getEffectiveFoodStatus(d) === 'Available' && d.availableQuantity > 0
    ).length;
    const pendingCollections = myCollectionRequests.filter((r) =>
      ['Pending', 'Accepted', 'Ready for Pickup'].includes(r.status)
    ).length;
    const acceptedRequests = foodAssistanceRequests.filter((r) =>
      ['Accepted', 'Food Arranged', 'Distribution Scheduled', 'Out for Delivery'].includes(
        r.homeageStatus || ''
      )
    ).length;
    const completedDonations =
      myCollectionRequests.filter((r) => ['Collected', 'Completed'].includes(r.status)).length +
      foodAssistanceRequests.filter((r) =>
        ['Successfully Delivered', 'Completed'].includes(r.homeageStatus || '')
      ).length;
    const totalQtyReceived = myCollectionRequests
      .filter((r) => ['Accepted', 'Ready for Pickup', 'Collected', 'Completed'].includes(r.status))
      .reduce((acc, r) => acc + r.requestedQuantity, 0);
    const peopleHelped =
      myCollectionRequests
        .filter((r) => ['Collected', 'Completed'].includes(r.status))
        .reduce((acc, r) => acc + r.peopleCount, 0) +
      foodAssistanceRequests
        .filter((r) => ['Successfully Delivered', 'Completed'].includes(r.homeageStatus || ''))
        .reduce((acc, r) => acc + r.peopleRequiringFood, 0);

    return {
      totalFoodRequests,
      newFoodRequests,
      availableSurplus,
      pendingCollections,
      acceptedRequests,
      completedDonations,
      totalQtyReceived,
      peopleHelped,
    };
  }, [foodAssistanceRequests, foodDonations, myCollectionRequests]);

  const handleSignOut = async () => {
    await signOutUser();
    navigate('/orphanage/login', { replace: true });
  };

  const handleAcceptSurplus = async (donationId: string, maxAvailable: number) => {
    const qty = acceptQtyByDonation[donationId] ?? maxAvailable;
    if (!qty || qty <= 0 || qty > maxAvailable) {
      setNotice({ type: 'error', text: `Enter a valid quantity between 1 and ${maxAvailable}.` });
      return;
    }
    setBusyId(donationId);
    setNotice(null);
    try {
      await homeageAcceptFoodDonation(
        donationId,
        qty,
        pickupTimeByDonation[donationId] || 'Within 1 hour'
      );
      setNotice({
        type: 'success',
        text: `Reserved ${qty} units from ${donationId}. Donor pickup details can now be unlocked.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to accept food donation.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnlockDonorContact = async (donationId: string) => {
    setBusyId(`contact_${donationId}`);
    try {
      const contact = await getFoodDonationPrivateContact(donationId);
      if (contact) {
        setDonorContacts((prev) => ({ ...prev, [donationId]: contact }));
      } else {
        setNotice({ type: 'error', text: 'Private donor contact not found.' });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Accept the donation first to unlock donor address.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkReady = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await markFoodReadyForPickup(requestId);
      setNotice({ type: 'success', text: `Collection ${requestId} marked Ready for Pickup.` });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to mark ready for pickup.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmHandover = async (requestId: string) => {
    setBusyId(requestId);
    try {
      const cert = await confirmFoodHandover(requestId);
      setActiveCert(cert);
      setNotice({
        type: 'success',
        text: `Handover confirmed! Digital Certificate ${cert.certificateId} issued.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to confirm food handover.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnlockAssistContact = async (assistanceId: string) => {
    setBusyId(`acontact_${assistanceId}`);
    try {
      const contact = await getFoodAssistancePrivateContact(assistanceId);
      if (contact) {
        setAssistContacts((prev) => ({ ...prev, [assistanceId]: contact }));
      } else {
        setNotice({ type: 'error', text: 'Requester private contact not found.' });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to unlock requester contact.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveAssistance = async (req: FoodAssistanceRequest) => {
    setBusyId(req.assistanceId);
    setNotice(null);
    const nextStatus =
      draftStatusByAssist[req.assistanceId] || req.homeageStatus || 'Accepted';
    const volunteer =
      draftVolunteerByAssist[req.assistanceId] !== undefined
        ? draftVolunteerByAssist[req.assistanceId]
        : req.assignedVolunteerName || '';
    const scheduled =
      draftScheduleByAssist[req.assistanceId] !== undefined
        ? draftScheduleByAssist[req.assistanceId]
        : req.distributionScheduledAt || '';

    try {
      await homeageManageFoodAssistance(req.assistanceId, {
        homeageStatus: nextStatus,
        assignedVolunteerName: volunteer.trim() || undefined,
        distributionScheduledAt: scheduled.trim() || undefined,
      });
      const displayNextStatus =
        nextStatus === 'Waiting for Homeage' ? 'Waiting for Orphanage' : nextStatus;
      setNotice({
        type: 'success',
        text: `Food Assistance ${req.assistanceId} updated to "${displayNextStatus}". Requester notified.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to update food assistance request.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTarget) return;
    setSubmittingOffer(true);
    try {
      await offerFoodContribution({
        assistanceId: offerTarget.assistanceId,
        donorName: myHomeageName,
        foodCategory: offerTarget.foodCategory,
        foodQuantity: Number(offerQty) || 1,
        quantityUnit: offerTarget.requiredUnit,
        servings: Number(offerServings) || 1,
        deliveryMode: offerMode,
        contactDetails: myHomeageOrg?.mobile || homeageAccount?.email || 'Orphanage Desk',
      });
      setOfferTarget(null);
      setNotice({
        type: 'success',
        text: `Offered ${offerQty} ${offerTarget.requiredUnit} to ${offerTarget.assistanceId}.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to offer food contribution.',
      });
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatAssist || !chatInput.trim()) return;
    setSendingChat(true);
    try {
      await sendMessage(chatAssist.assistanceId, chatInput.trim());
      setChatInput('');
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to send message.',
      });
    } finally {
      setSendingChat(false);
    }
  };

  const chatMessages = useMemo(() => {
    if (!chatAssist) return [];
    return messages
      .filter((m) => m.requestId === chatAssist.assistanceId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, chatAssist]);

  return (
    <div className="min-h-screen bg-emerald-50/40 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Isolated Green & Orange Food Homeage Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-emerald-200 dark:border-emerald-900/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-orange-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Utensils size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                  {myHomeageName}
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck size={11} /> Orphanage Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate tabular-nums">
                {homeageAccount?.homeageId || 'HOME'}
                {myHomeageOrg?.city ? ` · ${myHomeageOrg.city}, ${myHomeageOrg.state}` : ''} · Food Rescue &amp; Hunger Relief Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasMultipleRoles && (
              <button
                type="button"
                onClick={() => {
                  clearSelectedPortal();
                  navigate('/portals', { replace: true });
                }}
                className="px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
              >
                <ArrowLeftRight size={14} />
                <span className="hidden sm:inline">Switch Portal</span>
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              aria-label="Food Alerts"
              className={cn(
                'relative p-2 rounded-xl border transition-colors',
                activeTab === 'notifications'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-800'
              )}
            >
              <Bell size={18} />
              {unreadFoodCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadFoodCount > 9 ? '9+' : unreadFoodCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-orange-500 text-white p-6 sm:p-8 shadow-xl">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold text-emerald-50">
              <HeartHandshake size={14} />
              <span>Dedicated Food Rescue &amp; Orphanage Operations</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Food Donation &amp; Hunger Relief Command Center
            </h2>
            <p className="text-sm text-emerald-50">
              Accept surplus meals from local donors (full or partial), dispatch volunteers for food assistance requests, confirm handovers with digital certificates, and track verified funds.
            </p>
          </div>
        </section>

        {/* 8 Food Homeage Statistics */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Food Requests', value: stats.totalFoodRequests, accent: 'text-emerald-700 dark:text-emerald-400', icon: HeartHandshake },
            { label: 'New Food Requests', value: stats.newFoodRequests, accent: 'text-orange-600 dark:text-orange-400', icon: Clock },
            { label: 'Available Surplus Food', value: stats.availableSurplus, accent: 'text-emerald-600 dark:text-emerald-400', icon: Utensils },
            { label: 'Pending Collections', value: stats.pendingCollections, accent: 'text-amber-600 dark:text-amber-400', icon: Truck },
            { label: 'Accepted Requests', value: stats.acceptedRequests, accent: 'text-teal-600 dark:text-teal-400', icon: PackageCheck },
            { label: 'Completed Handovers', value: stats.completedDonations, accent: 'text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 },
            { label: 'Total Units Rescued', value: stats.totalQtyReceived, accent: 'text-orange-600 dark:text-orange-400', icon: Building2 },
            { label: 'People Helped', value: stats.peopleHelped, accent: 'text-emerald-700 dark:text-emerald-400', icon: Users },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon size={18} className={s.accent} />
                  <span className={cn('text-2xl font-extrabold tabular-nums', s.accent)}>
                    {s.value}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{s.label}</p>
              </div>
            );
          })}
        </section>

        {notice && (
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 border',
              notice.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            )}
          >
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notice">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tabs + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'surplus', label: `Surplus Food (${foodDonations.length})`, icon: Utensils },
              { id: 'assistance', label: `Food Requests (${foodAssistanceRequests.length})`, icon: HeartHandshake },
              { id: 'community', label: `Funds, Volunteers & Certificates`, icon: Award },
              { id: 'notifications', label: `Food Alerts (${unreadFoodCount})`, icon: Bell },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as HomeageTab)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all',
                    activeTab === t.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-300'
                  )}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, city, donor, ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>
        </div>

        {/* TAB 1: SURPLUS FOOD DONATIONS + MY COLLECTIONS */}
        {activeTab === 'surplus' && (
          <section className="space-y-8">
            {/* Active Collections by this Homeage */}
            {myCollectionRequests.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Your Orphanage Pickups &amp; Handovers ({myCollectionRequests.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myCollectionRequests.map((cr) => {
                    const contact = donorContacts[cr.donationId];
                    const linkedCert = cr.certificateId
                      ? foodCertificates.find((c) => c.certificateId === cr.certificateId)
                      : undefined;
                    return (
                      <div
                        key={cr.id}
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/60 p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-orange-600">
                            {cr.requestId}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                            {cr.status}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold">{cr.foodName}</h4>
                          <p className="text-xs text-slate-500 tabular-nums">
                            Accepted: {cr.requestedQuantity} {cr.quantityUnit} · Donor: {cr.donorName} · Pickup: {cr.preferredCollectionTime}
                          </p>
                        </div>

                        {contact && (
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                            <p className="font-bold text-emerald-800 dark:text-emerald-200">
                              Donor Pickup Address &amp; Phone
                            </p>
                            <p>{contact.pickupAddress}</p>
                            <a
                              href={`tel:${contact.mobileNumber}`}
                              className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300"
                            >
                              <Phone size={12} /> {contact.mobileNumber}
                            </a>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleUnlockDonorContact(cr.donationId)}
                            className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Eye size={13} /> Pickup Contact
                          </button>
                          {cr.status === 'Accepted' && (
                            <button
                              type="button"
                              disabled={busyId === cr.requestId}
                              onClick={() => void handleMarkReady(cr.requestId)}
                              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
                            >
                              Mark Ready for Pickup
                            </button>
                          )}
                          {['Accepted', 'Ready for Pickup'].includes(cr.status) && (
                            <button
                              type="button"
                              disabled={busyId === cr.requestId}
                              onClick={() => void handleConfirmHandover(cr.requestId)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} /> Confirm Handover &amp; Issue Certificate
                            </button>
                          )}
                          {linkedCert && (
                            <button
                              type="button"
                              onClick={() => setActiveCert(linkedCert)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1"
                            >
                              <Award size={13} /> View Certificate
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Surplus Food Donations */}
            <div className="space-y-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Incoming Surplus Food Donations ({sortedDonations.length})
              </h3>
              {sortedDonations.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
                  No surplus food donations listed right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {sortedDonations.map((d) => {
                    const effectiveStatus = getEffectiveFoodStatus(d);
                    const statusMeta = FOOD_DONATION_STATUS_META[effectiveStatus];
                    const timeInfo = getRemainingTimeLabel(d.collectionDeadline);
                    const canAccept =
                      d.availableQuantity > 0 &&
                      !['Expired', 'Completed', 'Collected', 'Cancelled', 'Reserved'].includes(effectiveStatus);
                    const qtyVal = acceptQtyByDonation[d.donationId] ?? d.availableQuantity;

                    return (
                      <div
                        key={d.id}
                        className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col"
                      >
                        <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={getFoodCategoryImage(d.category, d.imageUrl)}
                            alt={d.foodName}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold border', statusMeta.badgeClass)}>
                              {statusMeta.label}
                            </span>
                            {d.city.toLowerCase() === myCity && (
                              <span className="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[11px] font-bold">
                                Same City Match
                              </span>
                            )}
                          </div>
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/75 text-white text-[11px] font-bold tabular-nums">
                            {timeInfo.label}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                {d.donationId}
                              </span>
                              <span>{d.donorType}</span>
                            </div>
                            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                              {d.foodName}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                              {d.description}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 tabular-nums">
                              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                Available: {d.availableQuantity}/{d.totalQuantity} {d.quantityUnit}
                              </span>
                              <span>Serves ~{d.servingsCount} people</span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={12} /> {d.pickupArea}, {d.city}
                              </span>
                            </div>
                          </div>

                          {canAccept && (
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    Qty ({d.allowPartialAcceptance !== false ? 'Full or Partial' : 'Full Only'})
                                  </label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={d.availableQuantity}
                                    disabled={d.allowPartialAcceptance === false}
                                    value={qtyVal}
                                    onChange={(e) =>
                                      setAcceptQtyByDonation((prev) => ({
                                        ...prev,
                                        [d.donationId]: Number(e.target.value),
                                      }))
                                    }
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold tabular-nums"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                    Pickup Time
                                  </label>
                                  <input
                                    type="text"
                                    value={pickupTimeByDonation[d.donationId] || 'Within 45 mins'}
                                    onChange={(e) =>
                                      setPickupTimeByDonation((prev) => ({
                                        ...prev,
                                        [d.donationId]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={busyId === d.donationId}
                                onClick={() => void handleAcceptSurplus(d.donationId, d.availableQuantity)}
                                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-700 hover:to-orange-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                              >
                                {busyId === d.donationId ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={14} />
                                )}
                                Accept {qtyVal === d.availableQuantity ? 'Full' : 'Partial'} Donation ({qtyVal}{' '}
                                {d.quantityUnit})
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 2: FOOD ASSISTANCE REQUESTS */}
        {activeTab === 'assistance' && (
          <section className="space-y-4">
            {sortedAssistance.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
                No food assistance requests submitted yet.
              </div>
            ) : (
              sortedAssistance.map((req) => {
                const curStatus =
                  draftStatusByAssist[req.assistanceId] || req.homeageStatus || 'Waiting for Homeage';
                const curVol =
                  draftVolunteerByAssist[req.assistanceId] !== undefined
                    ? draftVolunteerByAssist[req.assistanceId]
                    : req.assignedVolunteerName || '';
                const curSched =
                  draftScheduleByAssist[req.assistanceId] !== undefined
                    ? draftScheduleByAssist[req.assistanceId]
                    : req.distributionScheduledAt || '';
                const pct = Math.min(
                  100,
                  Math.round((req.fulfilledQuantity / Math.max(1, req.requiredQuantity)) * 100)
                );
                const contact = assistContacts[req.assistanceId];

                return (
                  <div
                    key={req.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {req.assistanceId}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-bold">
                            {req.urgencyLevel}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                            {!req.homeageStatus || req.homeageStatus === 'Waiting for Homeage'
                              ? 'Waiting for Orphanage'
                              : req.homeageStatus}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {req.foodRequirement} ({req.foodCategory})
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                          Requester: {req.requesterDisplayName} · {req.peopleRequiringFood} people ({req.familyMembersCount} family) · Location: {req.location}, {req.city} · Needed by: {req.requiredDate}
                        </p>
                        {req.reason && (
                          <p className="text-xs text-slate-600 dark:text-slate-300">{req.reason}</p>
                        )}
                      </div>

                      <div className="w-full lg:w-64 space-y-1.5 shrink-0">
                        <div className="flex justify-between text-xs font-bold tabular-nums">
                          <span>Fulfillment</span>
                          <span className="text-emerald-700 dark:text-emerald-400">
                            {req.fulfilledQuantity}/{req.requiredQuantity} {req.requiredUnit} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-orange-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {req.amountTarget > 0 && (
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            Funds Raised: ₹{req.amountRaised.toLocaleString()} / ₹{req.amountTarget.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    {contact && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span>
                          Requester: <span className="font-bold">{contact.fullName}</span>
                        </span>
                        <a
                          href={`tel:${contact.mobileNumber}`}
                          className="font-bold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1 tabular-nums"
                        >
                          <Phone size={12} /> {contact.mobileNumber}
                        </a>
                      </div>
                    )}

                    {/* Orphanage Workflow Controls */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Orphanage Status
                        </label>
                        <select
                          value={curStatus}
                          onChange={(e) =>
                            setDraftStatusByAssist((prev) => ({
                              ...prev,
                              [req.assistanceId]: e.target.value as HomeageFoodRequestStatus,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
                        >
                          {HOMEAGE_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st === 'Waiting for Homeage' ? 'Waiting for Orphanage' : st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Assign Volunteer
                        </label>
                        <input
                          value={curVol}
                          onChange={(e) =>
                            setDraftVolunteerByAssist((prev) => ({
                              ...prev,
                              [req.assistanceId]: e.target.value,
                            }))
                          }
                          placeholder="Volunteer name"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Distribution Schedule
                        </label>
                        <input
                          type="datetime-local"
                          value={curSched}
                          onChange={(e) =>
                            setDraftScheduleByAssist((prev) => ({
                              ...prev,
                              [req.assistanceId]: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </div>

                      <div className="md:col-span-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === req.assistanceId}
                          onClick={() => void handleSaveAssistance(req)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        >
                          Save &amp; Notify
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOfferTarget(req);
                            setOfferQty(Math.max(1, req.requiredQuantity - req.fulfilledQuantity));
                            setOfferServings(req.peopleRequiringFood);
                          }}
                          className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
                        >
                          Offer Food
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUnlockAssistContact(req.assistanceId)}
                          className="p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                          title="Unlock Requester Contact"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setChatAssist(req)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          title="Chat with Requester"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* TAB 3: FUNDS, VOLUNTEERS & CERTIFICATES */}
        {activeTab === 'community' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Verified Razorpay Funds */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Banknote size={18} />
                <h3 className="text-sm font-extrabold">Verified Money Donations ({myMoneyDonations.length})</h3>
              </div>
              {myMoneyDonations.length === 0 ? (
                <p className="text-xs text-slate-500">No verified funds received yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {myMoneyDonations.map((md) => (
                    <div
                      key={md.id}
                      className="p-3 rounded-xl bg-emerald-50/60 dark:bg-slate-950 border border-emerald-100 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold">
                        <span>{md.isAnonymous ? 'Anonymous Supporter' : md.donorName}</span>
                        <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                          ₹{md.amount.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-500">{md.assistanceTitle}</p>
                      <p className="font-mono text-[10px] text-slate-400">{md.receiptNumber}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Volunteers */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Users size={18} />
                <h3 className="text-sm font-extrabold">Food Volunteers ({volunteerRegistrations.length})</h3>
              </div>
              {volunteerRegistrations.length === 0 ? (
                <p className="text-xs text-slate-500">No volunteers registered yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {volunteerRegistrations.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl bg-orange-50/50 dark:bg-slate-950 border border-orange-100 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold">
                        <span>{v.volunteerName}</span>
                        <span className="text-orange-600">{v.role}</span>
                      </div>
                      <p className="text-slate-500">
                        {v.city} · {v.availability} · {v.mobile}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificates */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Award size={18} />
                <h3 className="text-sm font-extrabold">Handover Certificates ({foodCertificates.length})</h3>
              </div>
              {foodCertificates.length === 0 ? (
                <p className="text-xs text-slate-500">Confirm a food handover to issue a digital certificate.</p>
              ) : (
                <div className="space-y-2.5">
                  {foodCertificates.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setActiveCert(c)}
                      className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 text-xs space-y-1"
                    >
                      <div className="flex justify-between font-bold">
                        <span className="font-mono text-emerald-700 dark:text-emerald-400">
                          {c.certificateId}
                        </span>
                        <span className="tabular-nums">
                          {c.quantityDelivered} {c.quantityUnit}
                        </span>
                      </div>
                      <p className="font-semibold">{c.foodName}</p>
                      <p className="text-slate-500">
                        {c.donorName} → {c.receiverName}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* TAB 4: FOOD NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">Orphanage Food Alerts</h3>
              {unreadFoodCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllNotificationsRead()}
                  className="px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                >
                  Mark All Read
                </button>
              )}
            </div>
            {foodNotifications.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
                No food alerts yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {foodNotifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) void markNotificationRead(n.id);
                      setActiveTab(n.foodAssistanceId ? 'assistance' : 'surplus');
                    }}
                    className={cn(
                      'rounded-2xl p-4 border cursor-pointer',
                      !n.isRead
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{n.title}</p>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {formatDisplayDateTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Offer Food Contribution Modal */}
      {offerTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-orange-500 text-white flex items-center justify-between">
              <h4 className="text-sm font-extrabold">Offer Food to {offerTarget.assistanceId}</h4>
              <button type="button" onClick={() => setOfferTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitOffer} className="p-5 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Fulfilling: <span className="font-bold">{offerTarget.foodRequirement}</span> ({offerTarget.city})
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Quantity ({offerTarget.requiredUnit})
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={offerQty}
                    onChange={(e) => setOfferQty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Servings</label>
                  <input
                    type="number"
                    min={1}
                    value={offerServings}
                    onChange={(e) => setOfferServings(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Fulfillment Mode</label>
                <select
                  value={offerMode}
                  onChange={(e) => setOfferMode(e.target.value as 'Delivery' | 'Pickup')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="Delivery">Orphanage Volunteer Delivery</option>
                  <option value="Pickup">Pickup from Orphanage Center</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submittingOffer}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
              >
                {submittingOffer ? 'Submitting...' : 'Confirm Food Contribution'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Requester Chat Modal */}
      {chatAssist && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-emerald-100">
                  Food Request Chat · {chatAssist.assistanceId}
                </p>
                <h4 className="text-sm font-extrabold">{chatAssist.requesterDisplayName}</h4>
              </div>
              <button type="button" onClick={() => setChatAssist(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50 dark:bg-slate-950">
              {chatMessages.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">
                  Coordinate meal pickup or volunteer delivery with the requester.
                </p>
              ) : (
                chatMessages.map((m) => {
                  const mine = m.senderId === firebaseUser?.uid;
                  return (
                    <div key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-3.5 py-2 text-xs',
                          mine
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                        )}
                      >
                        <p className="font-bold text-[10px] opacity-80 mb-0.5">{m.senderName}</p>
                        <p>{m.text}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type update for requester..."
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Send size={13} /> Send
              </button>
            </form>
          </div>
        </div>
      )}

      <FoodCertificateModal certificate={activeCert} onClose={() => setActiveCert(null)} />
    </div>
  );
}
