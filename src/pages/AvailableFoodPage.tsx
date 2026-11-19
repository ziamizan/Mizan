import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  HeartHandshake,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Send,
  Utensils,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { FoodDonation, FoodDonationPrivateContact } from '../types';
import {
  computeFoodDistanceKm,
  FOOD_CATEGORIES,
  FOOD_DONATION_STATUS_META,
  getEffectiveFoodStatus,
  getFoodCategoryImage,
  getRemainingTimeLabel,
} from '../lib/foodHelpers';
import { resolveCoordinatesFromLocation } from '../lib/bloodMatching';
import { cn } from '../lib/utils';

export function AvailableFoodPage() {
  const {
    user,
    firebaseUser,
    foodDonations,
    foodCollectionRequests,
    messages,
    submitFoodCollectionRequest,
    getFoodDonationPrivateContact,
    sendMessage,
  } = useAppContext();

  // 6 Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(100);
  const [minQuantity, setMinQuantity] = useState<number>(0);
  const [deadlineFilter, setDeadlineFilter] = useState<'ALL' | 'URGENT_6H' | 'TODAY'>('ALL');

  const [detailDonation, setDetailDonation] = useState<FoodDonation | null>(null);
  const [requestTarget, setRequestTarget] = useState<FoodDonation | null>(null);
  const [receiverName, setReceiverName] = useState(user.name || '');
  const [receiverMobile, setReceiverMobile] = useState(user.mobile || '');
  const [requestedQuantity, setRequestedQuantity] = useState<number>(5);
  const [peopleCount, setPeopleCount] = useState<number>(5);
  const [preferredCollectionTime, setPreferredCollectionTime] = useState('Within 1 hour');
  const [pickupLocation, setPickupLocation] = useState(user.location || '');
  const [reason, setReason] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [unlockedContact, setUnlockedContact] = useState<
    Record<string, FoodDonationPrivateContact>
  >({});

  // Chat modal
  const [chatDonation, setChatDonation] = useState<FoodDonation | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const userCoords = useMemo(
    () => resolveCoordinatesFromLocation(user.location || 'Chennai', user.location || 'Chennai'),
    [user.location]
  );

  const filteredDonations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cityQ = cityFilter.trim().toLowerCase();
    const now = Date.now();

    return foodDonations
      .map((d) => ({
        donation: d,
        effectiveStatus: getEffectiveFoodStatus(d),
        distanceKm: computeFoodDistanceKm(
          userCoords.lat,
          userCoords.lng,
          d.latitude,
          d.longitude
        ),
      }))
      .filter(({ donation, effectiveStatus, distanceKm }) => {
        if (effectiveStatus === 'Cancelled') return false;
        if (categoryFilter !== 'ALL' && donation.category !== categoryFilter) return false;
        if (cityQ && !`${donation.city} ${donation.pickupArea} ${donation.location}`.toLowerCase().includes(cityQ)) {
          return false;
        }
        if (maxDistanceKm < 100 && distanceKm > maxDistanceKm) return false;
        if (minQuantity > 0 && donation.availableQuantity < minQuantity) return false;
        if (deadlineFilter !== 'ALL') {
          const ms = new Date(donation.collectionDeadline).getTime() - now;
          if (ms <= 0) return false;
          if (deadlineFilter === 'URGENT_6H' && ms > 6 * 3600 * 1000) return false;
          if (deadlineFilter === 'TODAY' && ms > 24 * 3600 * 1000) return false;
        }
        if (q) {
          const hay = `${donation.donationId} ${donation.foodName} ${donation.category} ${donation.donorName} ${donation.donorType} ${donation.city} ${donation.pickupArea}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aAvail = a.donation.availableQuantity > 0 && a.effectiveStatus !== 'Expired' ? 1 : 0;
        const bAvail = b.donation.availableQuantity > 0 && b.effectiveStatus !== 'Expired' ? 1 : 0;
        if (bAvail !== aAvail) return bAvail - aAvail;
        return new Date(b.donation.createdAt).getTime() - new Date(a.donation.createdAt).getTime();
      });
  }, [
    foodDonations,
    searchQuery,
    categoryFilter,
    cityFilter,
    maxDistanceKm,
    minQuantity,
    deadlineFilter,
    userCoords,
  ]);

  const uid = firebaseUser?.uid || user.id;

  const openRequestModal = (d: FoodDonation) => {
    setRequestTarget(d);
    setRequestedQuantity(Math.min(5, Math.max(1, d.availableQuantity)));
    setPeopleCount(Math.min(5, Math.max(1, d.servingsCount)));
    setNotice(null);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTarget) return;
    setSubmittingReq(true);
    setNotice(null);
    try {
      const created = await submitFoodCollectionRequest({
        donationId: requestTarget.donationId,
        receiverName: receiverName.trim() || user.name,
        receiverMobile: receiverMobile.trim(),
        requestedQuantity: Number(requestedQuantity) || 1,
        peopleCount: Number(peopleCount) || 1,
        preferredCollectionTime: preferredCollectionTime.trim() || 'Within 1 hour',
        pickupLocation: pickupLocation.trim() || requestTarget.city,
        reason: reason.trim() || undefined,
      });
      setRequestTarget(null);
      setReason('');
      setNotice({
        type: 'success',
        text: `Collection Request ${created.requestId} sent to ${requestTarget.donorName}. You will be notified once accepted!`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to submit food collection request.',
      });
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleUnlockContact = async (donationId: string) => {
    setNotice(null);
    try {
      const contact = await getFoodDonationPrivateContact(donationId);
      if (contact) {
        setUnlockedContact((prev) => ({ ...prev, [donationId]: contact }));
      } else {
        setNotice({
          type: 'error',
          text: 'Exact donor address & phone unlock once your collection request is accepted.',
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Donor contact unlocks after your collection request is accepted.',
      });
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatDonation || !chatInput.trim()) return;
    setSendingChat(true);
    try {
      await sendMessage(chatDonation.donationId, chatInput.trim());
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
    if (!chatDonation) return [];
    return messages
      .filter((m) => m.requestId === chatDonation.donationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, chatDonation]);

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-orange-500 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold">
              <Utensils size={14} />
              <span>Available Surplus Food Rescue</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Find Fresh Surplus Food Nearby
            </h1>
            <p className="text-sm text-emerald-50 max-w-2xl">
              Browse verified leftover meals, bakery items, produce, and groceries ready for immediate pickup before expiry.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/food-donate"
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-extrabold shadow-md"
            >
              + Donate Food
            </Link>
            <Link
              to="/food-assistance"
              className="px-4 py-2.5 rounded-xl bg-slate-900/25 hover:bg-slate-900/40 border border-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5"
            >
              <HeartHandshake size={14} /> Request Food Assistance
            </Link>
          </div>
        </div>
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
          <span className="flex items-center gap-2">
            {notice.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {notice.text}
          </span>
          <button type="button" onClick={() => setNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 6 Filter Controls */}
      <section className="glass-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meal, restaurant, category..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
        >
          <option value="ALL">All Categories</option>
          {FOOD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="City or Area..."
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
        />
        <select
          value={maxDistanceKm}
          onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
        >
          <option value={100}>Any Distance</option>
          <option value={5}>Within 5 km</option>
          <option value={15}>Within 15 km</option>
          <option value={30}>Within 30 km</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            value={minQuantity || ''}
            onChange={(e) => setMinQuantity(Number(e.target.value) || 0)}
            placeholder="Min Qty"
            className="px-2.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums"
          />
          <select
            value={deadlineFilter}
            onChange={(e) => setDeadlineFilter(e.target.value as 'ALL' | 'URGENT_6H' | 'TODAY')}
            className="px-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold"
          >
            <option value="ALL">Any Expiry</option>
            <option value="URGENT_6H">&lt; 6 hrs</option>
            <option value="TODAY">Today</option>
          </select>
        </div>
      </section>

      {/* Food Listings Grid */}
      {filteredDonations.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Utensils size={32} className="mx-auto text-emerald-500" />
          <h2 className="text-base font-extrabold">No food listings match your filters</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try clearing your filters, or be the first to share surplus food with your local community.
          </p>
          <Link
            to="/food-donate"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Donate Surplus Food
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDonations.map(({ donation: d, effectiveStatus, distanceKm }) => {
            const statusMeta = FOOD_DONATION_STATUS_META[effectiveStatus];
            const timer = getRemainingTimeLabel(d.collectionDeadline);
            const myAcceptedReq = foodCollectionRequests.find(
              (r) =>
                r.donationId === d.donationId &&
                r.receiverId === uid &&
                ['Accepted', 'Ready for Pickup', 'Collected', 'Completed'].includes(r.status)
            );
            const contact = unlockedContact[d.donationId];
            const canRequest =
              d.donorId !== uid &&
              d.availableQuantity > 0 &&
              !['Expired', 'Reserved', 'Collected', 'Completed', 'Cancelled'].includes(effectiveStatus);

            return (
              <div
                key={d.id}
                className="glass-card overflow-hidden flex flex-col justify-between border-emerald-100 dark:border-slate-800"
              >
                <div>
                  <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                    <img
                      src={getFoodCategoryImage(d.category, d.imageUrl)}
                      alt={d.foodName}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className={cn(
                        'absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold border',
                        statusMeta.badgeClass
                      )}
                    >
                      {statusMeta.label}
                    </span>
                    <span
                      className={cn(
                        'absolute bottom-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold tabular-nums',
                        timer.isUrgent
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-950/75 text-white'
                      )}
                    >
                      <Clock size={11} className="inline mr-1" />
                      {timer.label}
                    </span>
                  </div>

                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {d.category} · {d.donorType}
                      </span>
                      <span className="tabular-nums">{distanceKm.toFixed(1)} km away</span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {d.foodName}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                      {d.description}
                    </p>

                    <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {d.availableQuantity}/{d.totalQuantity} {d.quantityUnit} left
                      </span>
                      <span className="text-slate-500">Serves ~{d.servingsCount}</span>
                    </div>

                    <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <MapPin size={13} className="text-orange-500 shrink-0" />
                      {d.pickupArea}, {d.city}
                    </p>

                    {contact && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-0.5">
                        <p className="font-bold text-emerald-800 dark:text-emerald-200">
                          Pickup: {contact.pickupAddress}
                        </p>
                        <a
                          href={`tel:${contact.mobileNumber}`}
                          className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-300"
                        >
                          <Phone size={12} /> {contact.mobileNumber}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDetailDonation(d)}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    View Details
                  </button>
                  {canRequest && (
                    <button
                      type="button"
                      onClick={() => openRequestModal(d)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-700 hover:to-orange-600 text-white text-xs font-extrabold"
                    >
                      Request This Food
                    </button>
                  )}
                  {myAcceptedReq && (
                    <button
                      type="button"
                      onClick={() => void handleUnlockContact(d.donationId)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold inline-flex items-center gap-1"
                    >
                      <Eye size={13} /> Address
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setChatDonation(d)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Message Donor"
                  >
                    <MessageSquare size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {detailDonation && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <img
              src={getFoodCategoryImage(detailDonation.category, detailDonation.imageUrl)}
              alt={detailDonation.foodName}
              className="h-48 w-full object-cover"
            />
            <div className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-bold text-emerald-600">
                    {detailDonation.donationId} · {detailDonation.category}
                  </p>
                  <h3 className="text-lg font-extrabold">{detailDonation.foodName}</h3>
                </div>
                <button type="button" onClick={() => setDetailDonation(null)}>
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{detailDonation.description}</p>
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-500 block">Donor</span>
                  <span className="font-bold">
                    {detailDonation.donorName} ({detailDonation.donorType})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Remaining</span>
                  <span className="font-bold tabular-nums text-emerald-600">
                    {detailDonation.availableQuantity}/{detailDonation.totalQuantity} {detailDonation.quantityUnit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Pickup Area</span>
                  <span className="font-bold">
                    {detailDonation.pickupArea}, {detailDonation.city}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Collection Window</span>
                  <span className="font-bold tabular-nums">
                    {getRemainingTimeLabel(detailDonation.collectionDeadline).label}
                  </span>
                </div>
              </div>
              {detailDonation.pickupInstructions && (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold">Pickup Instructions:</span> {detailDonation.pickupInstructions}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailDonation(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Close
                </button>
                {detailDonation.availableQuantity > 0 && detailDonation.donorId !== uid && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailDonation;
                      setDetailDonation(null);
                      openRequestModal(target);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Request This Food
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Request Food Collection Modal */}
      {requestTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
            <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-orange-500 text-white flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Request: {requestTarget.foodName}</h3>
              <button type="button" onClick={() => setRequestTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRequestSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Your Name *</label>
                  <input
                    required
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Mobile Number *</label>
                  <input
                    required
                    value={receiverMobile}
                    onChange={(e) => setReceiverMobile(e.target.value)}
                    placeholder="+91..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">
                    Quantity Needed (Max {requestTarget.availableQuantity} {requestTarget.quantityUnit})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={requestTarget.availableQuantity}
                    required
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">People Being Served *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Preferred Pickup Time *</label>
                <input
                  required
                  value={preferredCollectionTime}
                  onChange={(e) => setPreferredCollectionTime(e.target.value)}
                  placeholder="e.g. Today 7:30 PM / Within 30 mins"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Your Location</label>
                <input
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  placeholder="Neighborhood / City"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Note / Reason (Optional)</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Collecting for 12 elderly residents nearby"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={submittingReq}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5"
              >
                {submittingReq && <Loader2 size={14} className="animate-spin" />}
                Submit Collection Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Donor Chat Modal */}
      {chatDonation && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-100">{chatDonation.donationId}</p>
                <h4 className="text-sm font-extrabold">Chat with {chatDonation.donorName}</h4>
              </div>
              <button type="button" onClick={() => setChatDonation(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50 dark:bg-slate-950">
              {chatMessages.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">
                  Ask the donor about packaging, dietary details, or pickup timing.
                </p>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={cn('flex flex-col', m.senderId === uid ? 'items-end' : 'items-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-3.5 py-2 text-xs',
                        m.senderId === uid
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                      )}
                    >
                      <p className="font-bold text-[10px] opacity-80">{m.senderName}</p>
                      <p>{m.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type message to donor..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1"
              >
                <Send size={13} /> Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
