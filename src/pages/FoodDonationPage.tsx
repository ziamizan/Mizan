import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Utensils,
  X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { FoodCategory, FoodDonationCertificate, FoodDonorType } from '../types';
import {
  compressFoodImageFile,
  FOOD_CATEGORIES,
  FOOD_DONATION_STATUS_META,
  FOOD_DONOR_TYPES,
  getEffectiveFoodStatus,
  getFoodCategoryImage,
  getRemainingTimeLabel,
} from '../lib/foodHelpers';
import { FoodCertificateModal } from '../components/FoodCertificateModal';
import { cn } from '../lib/utils';

function defaultLocalDatetime(offsetHours: number): string {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FoodDonationPage() {
  const {
    user,
    firebaseUser,
    foodDonations,
    foodCollectionRequests,
    foodCertificates,
    createFoodDonation,
    respondFoodCollectionRequest,
    markFoodReadyForPickup,
    confirmFoodHandover,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'donate' | 'manage'>('donate');

  // Form fields
  const [donorName, setDonorName] = useState(user.name || '');
  const [donorType, setDonorType] = useState<FoodDonorType>('Individual');
  const [mobileNumber, setMobileNumber] = useState(user.mobile || '');
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('Cooked Food');
  const [totalQuantity, setTotalQuantity] = useState<number>(20);
  const [quantityUnit, setQuantityUnit] = useState('meals');
  const [servingsCount, setServingsCount] = useState<number>(20);
  const [preparedAt, setPreparedAt] = useState(() => defaultLocalDatetime(-1));
  const [collectionDeadline, setCollectionDeadline] = useState(() => defaultLocalDatetime(5));
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [city, setCity] = useState(user.location?.split(',')[0]?.trim() || 'Chennai');
  const [location, setLocation] = useState(user.location || '');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [contactDetails, setContactDetails] = useState('');
  const [allowPartialAcceptance, setAllowPartialAcceptance] = useState(true);
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    donationId: string;
    notifiedHomeagesCount: number;
  } | null>(null);

  const [busyReqId, setBusyReqId] = useState<string | null>(null);
  const [manageNotice, setManageNotice] = useState<string | null>(null);
  const [activeCert, setActiveCert] = useState<FoodDonationCertificate | null>(null);

  const uid = firebaseUser?.uid || user.id;

  const myDonations = useMemo(
    () => foodDonations.filter((d) => d.donorId === uid),
    [foodDonations, uid]
  );

  const incomingRequests = useMemo(
    () => foodCollectionRequests.filter((r) => r.donorId === uid),
    [foodCollectionRequests, uid]
  );

  const myCertificates = useMemo(
    () => foodCertificates.filter((c) => c.donorId === uid || c.receiverId === uid),
    [foodCertificates, uid]
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    setError(null);
    try {
      const compressed = await compressFoodImageFile(file);
      setImageUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process image.');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);

    if (!safetyConfirmed) {
      setError('Please confirm that the donated food is fresh, hygienic, and safe for consumption.');
      return;
    }
    if (new Date(collectionDeadline).getTime() <= Date.now()) {
      setError('Food collection deadline must be a future date and time.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createFoodDonation({
        donorName: donorName.trim() || user.name,
        donorType,
        mobileNumber: mobileNumber.trim(),
        foodName: foodName.trim(),
        category,
        totalQuantity: Number(totalQuantity) || 1,
        quantityUnit: quantityUnit.trim() || 'meals',
        servingsCount: Number(servingsCount) || 1,
        preparedAt: new Date(preparedAt).toISOString(),
        collectionDeadline: new Date(collectionDeadline).toISOString(),
        description: description.trim(),
        imageUrl: imageUrl || undefined,
        pickupAddress: pickupAddress.trim(),
        city: city.trim(),
        location: location.trim() || pickupAddress.trim(),
        pickupInstructions: pickupInstructions.trim() || undefined,
        contactDetails: contactDetails.trim() || mobileNumber.trim(),
        safetyConfirmed,
        allowPartialAcceptance,
      });

      setSuccessInfo({
        donationId: result.donation.donationId,
        notifiedHomeagesCount: result.notifiedHomeagesCount,
      });
      setFoodName('');
      setDescription('');
      setImageUrl('');
      setPickupInstructions('');
      setSafetyConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish food donation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (requestId: string, action: 'Accepted' | 'Rejected') => {
    setBusyReqId(requestId);
    setManageNotice(null);
    try {
      await respondFoodCollectionRequest(
        requestId,
        action,
        action === 'Rejected' ? 'Food no longer available for this slot' : undefined
      );
      setManageNotice(`Collection request ${requestId} ${action.toLowerCase()}.`);
    } catch (err) {
      setManageNotice(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusyReqId(null);
    }
  };

  const handleMarkReady = async (requestId: string) => {
    setBusyReqId(requestId);
    setManageNotice(null);
    try {
      await markFoodReadyForPickup(requestId);
      setManageNotice(`Collection ${requestId} marked Ready for Pickup.`);
    } catch (err) {
      setManageNotice(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setBusyReqId(null);
    }
  };

  const handleConfirmHandover = async (requestId: string) => {
    setBusyReqId(requestId);
    setManageNotice(null);
    try {
      const cert = await confirmFoodHandover(requestId);
      setActiveCert(cert);
      setManageNotice(`Handover confirmed! Certificate ${cert.certificateId} generated.`);
    } catch (err) {
      setManageNotice(err instanceof Error ? err.message : 'Unable to confirm handover.');
    } finally {
      setBusyReqId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-orange-500 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-bold">
              <Utensils size={14} />
              <span>Food Donor Portal · Zero Food Waste</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Share Surplus Food. Nourish Someone Today.
            </h1>
            <p className="text-sm text-emerald-50 max-w-2xl">
              Post surplus meals from homes, restaurants, bakeries, hotels, or events. Nearby registered Orphanages and people in need are notified automatically.
            </p>
          </div>
          <Link
            to="/food"
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-extrabold whitespace-nowrap self-start md:self-center shadow-md"
          >
            Browse Available Food
          </Link>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('donate')}
          className={cn(
            'px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2',
            activeTab === 'donate'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          )}
        >
          <Utensils size={15} /> Donate Food Form
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manage')}
          className={cn(
            'px-4 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-2',
            activeTab === 'manage'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          )}
        >
          <PackageCheck size={15} /> My Donations &amp; Requests ({myDonations.length} / {incomingRequests.length})
        </button>
      </div>

      {activeTab === 'donate' ? (
        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 sm:p-8 space-y-6 border-emerald-200/60 dark:border-slate-800"
        >
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Food Donation Published ({successInfo.donationId})!</span>
              </div>
              <p>
                Your food listing is now live on the Available Food Rescue feed.{' '}
                {successInfo.notifiedHomeagesCount > 0
                  ? `${successInfo.notifiedHomeagesCount} active Orphanage organization(s) have been notified.`
                  : 'Nearby recipients and Orphanages can now request collection.'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                >
                  Manage My Donations
                </button>
                <Link
                  to="/food"
                  className="px-3.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 text-emerald-700 dark:text-emerald-300 font-bold"
                >
                  View on Food Feed
                </Link>
              </div>
            </div>
          )}

          {/* Donor Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              1. Donor Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Donor Name *</label>
                <input
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Your name or organization"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Donor Type *</label>
                <select
                  value={donorType}
                  onChange={(e) => setDonorType(e.target.value as FoodDonorType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  {FOOD_DONOR_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Mobile Number *</label>
                <input
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Food Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              2. Food Information &amp; Expiry Window
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Food Name *</label>
                <input
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Fresh Vegetable Biryani & Raita"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Food Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FoodCategory)}
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
                <label className="block text-xs font-bold mb-1">Available Quantity *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={totalQuantity}
                  onChange={(e) => setTotalQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Unit *</label>
                <select
                  value={quantityUnit}
                  onChange={(e) => setQuantityUnit(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="meals">Meals / Plates</option>
                  <option value="packets">Packets / Boxes</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="loaves">Loaves / Trays</option>
                  <option value="kits">Grocery Kits</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Number of People It Can Serve *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={servingsCount}
                  onChange={(e) => setServingsCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Food Preparation Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={preparedAt}
                  onChange={(e) => setPreparedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Food Collection Deadline *</label>
                <input
                  type="datetime-local"
                  required
                  value={collectionDeadline}
                  onChange={(e) => setCollectionDeadline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">Food Description *</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mention vegetarian/non-veg status, packaging type, allergens, and storage condition..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold mb-1.5">Food Photo Upload (Optional)</label>
              <div className="flex flex-wrap items-center gap-4">
                <label className="px-4 py-2.5 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold cursor-pointer inline-flex items-center gap-2 hover:bg-emerald-50">
                  {uploadingImg ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
                  <span>{imageUrl ? 'Change Food Photo' : 'Upload Food Photo'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                {imageUrl && (
                  <div className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-200">
                    <img src={imageUrl} alt="Food preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-slate-900/75 text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pickup Details */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              3. Pickup Address &amp; Privacy Protection
            </h2>
            <p className="text-xs text-slate-500">
              Exact pickup address and phone number remain protected and are revealed only after you or a verified Orphanage accept a collection request.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">Full Pickup Address *</label>
                <input
                  required
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="Door No, Street, Landmark"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">City *</label>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Chennai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Area / Neighborhood *</label>
                <input
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Adyar, Anna Nagar"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Additional Contact Details</label>
                <input
                  value={contactDetails}
                  onChange={(e) => setContactDetails(e.target.value)}
                  placeholder="Alternate phone or reception desk name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Pickup Instructions</label>
              <input
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                placeholder="e.g. Please bring insulated containers; ask for Manager at gate 2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPartialAcceptance}
                  onChange={(e) => setAllowPartialAcceptance(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <span>Allow partial acceptance (multiple recipients or Orphanages can claim portions)</span>
              </label>

              <label className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyConfirmed}
                  onChange={(e) => setSafetyConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  I confirm that the donated food is freshly prepared/stored hygienically, unspoiled, and safe for human consumption.
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-700 hover:to-orange-600 text-white text-sm font-extrabold shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Publishing Food Donation...</span>
              </>
            ) : (
              <span>Publish Food Donation &amp; Notify Orphanages</span>
            )}
          </button>
        </form>
      ) : (
        <section className="space-y-8">
          {manageNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
              {manageNotice}
            </div>
          )}

          {/* Incoming Collection Requests */}
          <div className="space-y-3">
            <h2 className="text-lg font-extrabold">Incoming Collection Requests ({incomingRequests.length})</h2>
            {incomingRequests.length === 0 ? (
              <div className="glass-card p-8 text-center text-xs text-slate-500">
                No incoming pickup requests yet. When a recipient or Orphanage requests your food, you can accept, mark ready, and confirm handover here.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {incomingRequests.map((req) => {
                  const cert = req.certificateId
                    ? foodCertificates.find((c) => c.certificateId === req.certificateId)
                    : undefined;
                  return (
                    <div
                      key={req.id}
                      className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {req.requestId}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 text-xs font-bold">
                            {req.status}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold">
                          {req.receiverName} requested {req.requestedQuantity} {req.quantityUnit} of {req.foodName}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          For {req.peopleCount} people · Preferred Pickup: {req.preferredCollectionTime} · Mobile: {req.receiverMobile}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {req.status === 'Pending' && (
                          <>
                            <button
                              type="button"
                              disabled={busyReqId === req.requestId}
                              onClick={() => void handleRespond(req.requestId, 'Accepted')}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={busyReqId === req.requestId}
                              onClick={() => void handleRespond(req.requestId, 'Rejected')}
                              className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {req.status === 'Accepted' && (
                          <button
                            type="button"
                            disabled={busyReqId === req.requestId}
                            onClick={() => void handleMarkReady(req.requestId)}
                            className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
                          >
                            Mark Ready for Pickup
                          </button>
                        )}
                        {['Accepted', 'Ready for Pickup'].includes(req.status) && (
                          <button
                            type="button"
                            disabled={busyReqId === req.requestId}
                            onClick={() => void handleConfirmHandover(req.requestId)}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Confirm Handover
                          </button>
                        )}
                        {cert && (
                          <button
                            type="button"
                            onClick={() => setActiveCert(cert)}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Award size={13} /> Certificate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Posted Donations */}
          <div className="space-y-3">
            <h2 className="text-lg font-extrabold">My Posted Surplus Food ({myDonations.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myDonations.map((d) => {
                const eff = getEffectiveFoodStatus(d);
                const meta = FOOD_DONATION_STATUS_META[eff];
                const t = getRemainingTimeLabel(d.collectionDeadline);
                return (
                  <div key={d.id} className="glass-card overflow-hidden flex flex-col">
                    <img
                      src={getFoodCategoryImage(d.category, d.imageUrl)}
                      alt={d.foodName}
                      className="h-36 w-full object-cover"
                    />
                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {d.donationId}
                        </span>
                        <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold border', meta.badgeClass)}>
                          {meta.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold">{d.foodName}</h3>
                      <p className="text-xs text-slate-500 tabular-nums flex flex-wrap gap-3">
                        <span>
                          Remaining: {d.availableQuantity}/{d.totalQuantity} {d.quantityUnit}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} /> {t.label}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {d.city}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Certificates */}
          {myCertificates.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-extrabold">My Food Donation Certificates ({myCertificates.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myCertificates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCert(c)}
                    className="glass-card p-4 text-left hover:border-emerald-400 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {c.certificateId}
                      </p>
                      <p className="text-sm font-extrabold">{c.foodName}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {c.quantityDelivered} {c.quantityUnit} · {c.city}
                      </p>
                    </div>
                    <Award size={22} className="text-emerald-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <FoodCertificateModal certificate={activeCert} onClose={() => setActiveCert(null)} />
    </div>
  );
}
