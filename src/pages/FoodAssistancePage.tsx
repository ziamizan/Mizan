import React, { useState } from 'react';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  MapPin,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { FoodAssistanceRequest, FoodCategory, FoodVolunteerRole } from '../types';
import {
  FOOD_ASSISTANCE_STATUS_META,
  FOOD_CATEGORIES,
  FOOD_VOLUNTEER_ROLES,
} from '../lib/foodHelpers';
import { MoneyDonationModal } from '../components/MoneyDonationModal';
import { cn } from '../lib/utils';

export function FoodAssistancePage() {
  const {
    user,
    foodAssistanceRequests,
    volunteerRegistrations,
    createFoodAssistanceRequest,
    offerFoodContribution,
    registerFoodVolunteer,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'feed' | 'request' | 'volunteer'>('feed');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Request Food Assistance Form
  const [fullName, setFullName] = useState(user.name || '');
  const [mobileNumber, setMobileNumber] = useState(user.mobile || '');
  const [familyMembersCount, setFamilyMembersCount] = useState<number>(4);
  const [peopleRequiringFood, setPeopleRequiringFood] = useState<number>(4);
  const [foodRequirement, setFoodRequirement] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(12);
  const [requiredUnit, setRequiredUnit] = useState('meals');
  const [amountTarget, setAmountTarget] = useState<number>(1500);
  const [foodCategory, setFoodCategory] = useState<FoodCategory>('Rice and Meals');
  const [city, setCity] = useState(user.location?.split(',')[0]?.trim() || 'Chennai');
  const [location, setLocation] = useState(user.location || '');
  const [requiredDate, setRequiredDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [urgencyLevel, setUrgencyLevel] = useState<'Normal' | 'Urgent' | 'Critical'>('Urgent');
  const [reason, setReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  // Offer Food Modal
  const [offerTarget, setOfferTarget] = useState<FoodAssistanceRequest | null>(null);
  const [offerQty, setOfferQty] = useState<number>(5);
  const [offerServings, setOfferServings] = useState<number>(5);
  const [offerMode, setOfferMode] = useState<'Delivery' | 'Pickup'>('Delivery');
  const [offerContact, setOfferContact] = useState(user.mobile || '');
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Donate Money Modal
  const [moneyModalState, setMoneyModalState] = useState<{
    open: boolean;
    assistanceId?: string;
  }>({ open: false });

  // Volunteer Form
  const [volName, setVolName] = useState(user.name || '');
  const [volMobile, setVolMobile] = useState(user.mobile || '');
  const [volCity, setVolCity] = useState(user.location?.split(',')[0]?.trim() || 'Chennai');
  const [volRole, setVolRole] = useState<FoodVolunteerRole>('Food Distribution');
  const [volAvailability, setVolAvailability] = useState('Evenings & Weekends');
  const [volAssistanceId, setVolAssistanceId] = useState<string>('');
  const [submittingVol, setSubmittingVol] = useState(false);

  const handleCreateAssistance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReq(true);
    setNotice(null);
    try {
      const res = await createFoodAssistanceRequest({
        fullName: fullName.trim() || user.name,
        mobileNumber: mobileNumber.trim(),
        familyMembersCount: Number(familyMembersCount) || 1,
        peopleRequiringFood: Number(peopleRequiringFood) || 1,
        foodRequirement: foodRequirement.trim(),
        requiredQuantity: Number(requiredQuantity) || 1,
        requiredUnit: requiredUnit.trim() || 'meals',
        amountTarget: Number(amountTarget) || 0,
        foodCategory,
        city: city.trim(),
        location: location.trim() || city.trim(),
        requiredDate,
        urgencyLevel,
        reason: reason.trim() || undefined,
        additionalDetails: additionalDetails.trim() || undefined,
      });
      setFoodRequirement('');
      setReason('');
      setAdditionalDetails('');
      setActiveTab('feed');
      setNotice({
        type: 'success',
        text: `Food Assistance Request ${res.request.assistanceId} submitted! ${res.notifiedHomeagesCount} registered Orphanage(s) notified.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to submit food assistance request.',
      });
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTarget) return;
    setSubmittingOffer(true);
    setNotice(null);
    try {
      await offerFoodContribution({
        assistanceId: offerTarget.assistanceId,
        donorName: user.name || 'Community Donor',
        foodCategory: offerTarget.foodCategory,
        foodQuantity: Number(offerQty) || 1,
        quantityUnit: offerTarget.requiredUnit,
        servings: Number(offerServings) || 1,
        deliveryMode: offerMode,
        contactDetails: offerContact.trim() || user.mobile || 'In-App Chat',
      });
      setOfferTarget(null);
      setNotice({
        type: 'success',
        text: `Thank you! Offered ${offerQty} ${offerTarget.requiredUnit} for ${offerTarget.assistanceId}.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to offer food contribution.',
      });
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleRegisterVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingVol(true);
    setNotice(null);
    try {
      const reg = await registerFoodVolunteer({
        volunteerName: volName.trim() || user.name,
        mobile: volMobile.trim(),
        city: volCity.trim(),
        role: volRole,
        availability: volAvailability.trim(),
        assistanceId: volAssistanceId || undefined,
      });
      setVolAssistanceId('');
      setNotice({
        type: 'success',
        text: `Welcome aboard! Registered as a Food Rescue Volunteer (${reg.volunteerId}).`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to register volunteer.',
      });
    } finally {
      setSubmittingVol(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-600 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold">
              <HeartHandshake size={14} />
              <span>Community Food Assistance &amp; Volunteer Network</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Support Families Facing Hunger or Request Food Assistance
            </h1>
            <p className="text-sm text-orange-50 max-w-2xl">
              Submit verified food assistance requests routed directly to Orphanage centers, contribute meals or Razorpay-verified funds, or volunteer for pickup and delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMoneyModalState({ open: true })}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center gap-1.5 self-start lg:self-center shadow-md"
          >
            <Banknote size={15} /> Donate Money (Verified)
          </button>
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'feed', label: `Active Food Requests (${foodAssistanceRequests.length})`, icon: HeartHandshake },
          { id: 'request', label: 'Request Food Assistance', icon: Utensils },
          { id: 'volunteer', label: `Food Volunteers (${volunteerRegistrations.length})`, icon: Users },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as 'feed' | 'request' | 'volunteer')}
              className={cn(
                'px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2',
                activeTab === t.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              )}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PUBLIC ASSISTANCE FEED */}
      {activeTab === 'feed' && (
        <section className="space-y-4">
          {foodAssistanceRequests.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-3">
              <HeartHandshake size={32} className="mx-auto text-orange-500" />
              <h2 className="text-base font-extrabold">No active food assistance requests yet</h2>
              <p className="text-xs text-slate-500">
                If you or a family nearby need meal or grocery support, submit a request and Orphanages will respond.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('request')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Submit Food Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {foodAssistanceRequests.map((req) => {
                const statusMeta = FOOD_ASSISTANCE_STATUS_META[req.status];
                const foodPct = Math.min(
                  100,
                  Math.round((req.fulfilledQuantity / Math.max(1, req.requiredQuantity)) * 100)
                );
                const moneyPct =
                  req.amountTarget > 0
                    ? Math.min(100, Math.round((req.amountRaised / req.amountTarget) * 100))
                    : 0;

                return (
                  <div
                    key={req.id}
                    className="glass-card p-5 flex flex-col justify-between space-y-4 border-emerald-100 dark:border-slate-800"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {req.assistanceId}
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[11px] font-bold border',
                              req.urgencyLevel === 'Critical'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300'
                                : req.urgencyLevel === 'Urgent'
                                  ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            )}
                          >
                            {req.urgencyLevel}
                          </span>
                        </div>
                        <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', statusMeta.badgeClass)}>
                          {req.homeageStatus === 'Waiting for Homeage'
                            ? 'Waiting for Orphanage'
                            : req.homeageStatus || statusMeta.label}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          {req.foodRequirement}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requested by {req.requesterDisplayName} · {req.peopleRequiringFood} people ({req.familyMembersCount} family) · {req.foodCategory}
                        </p>
                      </div>

                      {req.reason && (
                        <p className="text-xs text-slate-600 dark:text-slate-300">{req.reason}</p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} className="text-orange-500" /> {req.location}, {req.city}
                        </span>
                        <span className="tabular-nums">Needed by: {req.requiredDate}</span>
                        {req.assignedHomeageName && (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            Orphanage: {req.assignedHomeageName}
                          </span>
                        )}
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-2 pt-1">
                        <div>
                          <div className="flex justify-between text-xs font-bold tabular-nums mb-1">
                            <span>Food Fulfilled</span>
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {req.fulfilledQuantity}/{req.requiredQuantity} {req.requiredUnit} ({foodPct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${foodPct}%` }}
                            />
                          </div>
                        </div>

                        {req.amountTarget > 0 && (
                          <div>
                            <div className="flex justify-between text-xs font-bold tabular-nums mb-1">
                              <span>Financial Support</span>
                              <span className="text-orange-600 dark:text-orange-400">
                                ₹{req.amountRaised.toLocaleString()} / ₹{req.amountTarget.toLocaleString()} ({moneyPct}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${moneyPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3 Help Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setOfferTarget(req);
                          setOfferQty(Math.max(1, req.requiredQuantity - req.fulfilledQuantity));
                          setOfferServings(req.peopleRequiringFood);
                        }}
                        className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        Donate Food
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMoneyModalState({ open: true, assistanceId: req.assistanceId })
                        }
                        className="py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
                      >
                        Donate Money
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVolAssistanceId(req.assistanceId);
                          setActiveTab('volunteer');
                        }}
                        className="py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold"
                      >
                        Volunteer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: REQUEST FOOD ASSISTANCE FORM */}
      {activeTab === 'request' && (
        <form onSubmit={handleCreateAssistance} className="glass-card p-6 sm:p-8 max-w-3xl mx-auto space-y-5">
          <div>
            <h2 className="text-lg font-extrabold">Submit a Food Assistance Request</h2>
            <p className="text-xs text-slate-500">
              Your full name and mobile number are kept private; only authorized Orphanages and accepted contributors can view them.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Full Name *</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Mobile Number *</label>
              <input
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="+91..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Family Members Count *</label>
              <input
                type="number"
                min={1}
                required
                value={familyMembersCount}
                onChange={(e) => setFamilyMembersCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">People Requiring Food *</label>
              <input
                type="number"
                min={1}
                required
                value={peopleRequiringFood}
                onChange={(e) => setPeopleRequiringFood(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Food Requirement Title *</label>
              <input
                required
                value={foodRequirement}
                onChange={(e) => setFoodRequirement(e.target.value)}
                placeholder="e.g. Dry Ration & Cooked Meals for Family"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Food Category *</label>
              <select
                value={foodCategory}
                onChange={(e) => setFoodCategory(e.target.value as FoodCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Required Quantity *</label>
              <input
                type="number"
                min={1}
                required
                value={requiredQuantity}
                onChange={(e) => setRequiredQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Unit *</label>
              <input
                required
                value={requiredUnit}
                onChange={(e) => setRequiredUnit(e.target.value)}
                placeholder="meals / kg / kits"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Optional Financial Goal (₹)</label>
              <input
                type="number"
                min={0}
                value={amountTarget}
                onChange={(e) => setAmountTarget(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">City *</label>
              <input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Area / Location *</label>
              <input
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Neighborhood / Landmark"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Required Date *</label>
              <input
                type="date"
                required
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">Urgency Level *</label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value as 'Normal' | 'Urgent' | 'Critical')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical (Immediate Hunger Relief)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Reason for Request</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief context (optional)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Additional Details</label>
            <textarea
              rows={2}
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              placeholder="Dietary requirements, infant food needs, or delivery instructions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submittingReq}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-700 hover:to-orange-600 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2"
          >
            {submittingReq && <Loader2 size={15} className="animate-spin" />}
            Submit Food Assistance Request
          </button>
        </form>
      )}

      {/* TAB 3: FOOD VOLUNTEERS */}
      {activeTab === 'volunteer' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleRegisterVolunteer} className="lg:col-span-5 glass-card p-6 space-y-4">
            <h2 className="text-base font-extrabold">Register as a Food Rescue Volunteer</h2>
            {volAssistanceId && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                <span>Volunteering for: <strong>{volAssistanceId}</strong></span>
                <button type="button" onClick={() => setVolAssistanceId('')}>
                  <X size={13} />
                </button>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold mb-1">Full Name *</label>
              <input
                required
                value={volName}
                onChange={(e) => setVolName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Mobile Number *</label>
              <input
                required
                value={volMobile}
                onChange={(e) => setVolMobile(e.target.value)}
                placeholder="+91..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">City *</label>
              <input
                required
                value={volCity}
                onChange={(e) => setVolCity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Volunteer Role *</label>
              <select
                value={volRole}
                onChange={(e) => setVolRole(e.target.value as FoodVolunteerRole)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {FOOD_VOLUNTEER_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Availability *</label>
              <input
                required
                value={volAvailability}
                onChange={(e) => setVolAvailability(e.target.value)}
                placeholder="e.g. Weekdays 6-9 PM, Weekends"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submittingVol}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
            >
              {submittingVol ? 'Registering...' : 'Join Volunteer Team'}
            </button>
          </form>

          <div className="lg:col-span-7 glass-card p-6 space-y-4">
            <h2 className="text-base font-extrabold">
              Active Community Food Volunteers ({volunteerRegistrations.length})
            </h2>
            {volunteerRegistrations.length === 0 ? (
              <p className="text-xs text-slate-500">Be the first volunteer in your city to help rescue and deliver meals.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {volunteerRegistrations.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex justify-between font-bold">
                      <span>{v.volunteerName}</span>
                      <span className="text-emerald-600">{v.role}</span>
                    </div>
                    <p className="text-slate-500">
                      {v.city} · {v.availability}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Offer Food Modal */}
      {offerTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="text-sm font-extrabold">Offer Food for {offerTarget.assistanceId}</h3>
              <button type="button" onClick={() => setOfferTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmitOffer} className="p-5 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Supporting: <strong>{offerTarget.foodRequirement}</strong> ({offerTarget.city})
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">People Served</label>
                  <input
                    type="number"
                    min={1}
                    value={offerServings}
                    onChange={(e) => setOfferServings(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Delivery Mode</label>
                <select
                  value={offerMode}
                  onChange={(e) => setOfferMode(e.target.value as 'Delivery' | 'Pickup')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="Delivery">I will deliver the food</option>
                  <option value="Pickup">Requester / Volunteer can pick up</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Your Contact Number *</label>
                <input
                  required
                  value={offerContact}
                  onChange={(e) => setOfferContact(e.target.value)}
                  placeholder="+91..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
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

      <MoneyDonationModal
        open={moneyModalState.open}
        onClose={() => setMoneyModalState({ open: false })}
        defaultTargetType={moneyModalState.assistanceId ? 'ASSISTANCE_REQUEST' : 'GENERAL_FUND'}
        defaultAssistanceId={moneyModalState.assistanceId}
      />
    </div>
  );
}
