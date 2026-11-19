import React, { useState } from 'react';
import {
  X,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  HeartHandshake,
  Utensils,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { MoneyDonation, MoneyDonationTargetType, PaymentMethod } from '../types';
import { cn } from '../lib/utils';

interface MoneyDonationModalProps {
  open: boolean;
  onClose: () => void;
  defaultTargetType?: MoneyDonationTargetType;
  defaultAssistanceId?: string;
  defaultHomeageId?: string;
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500];

export function MoneyDonationModal({
  open,
  onClose,
  defaultTargetType = 'GENERAL_FUND',
  defaultAssistanceId,
  defaultHomeageId,
}: MoneyDonationModalProps) {
  const {
    user,
    foodAssistanceRequests,
    homeageOrganizations,
    initiateAndVerifyMoneyDonation,
  } = useAppContext();

  const [targetType, setTargetType] = useState<MoneyDonationTargetType>(defaultTargetType);
  const [selectedAssistanceId, setSelectedAssistanceId] = useState<string>(
    defaultAssistanceId || ''
  );
  const [selectedHomeageId, setSelectedHomeageId] = useState<string>(defaultHomeageId || '');
  const [amount, setAmount] = useState<number>(500);
  const [donorName, setDonorName] = useState<string>(user.name || '');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedReceipt, setVerifiedReceipt] = useState<MoneyDonation | null>(null);

  if (!open) return null;

  const activeHomeages = homeageOrganizations.filter((h) => h.status === 'ACTIVE');
  const activeAssistance = foodAssistanceRequests.filter((r) => r.status !== 'Completed');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amount || amount < 10) {
      setError('Please enter an amount of at least ₹10.');
      return;
    }

    let targetTitle = 'General Food Assistance Fund';
    let assistanceId: string | undefined;
    let homeageId: string | undefined;

    if (targetType === 'ASSISTANCE_REQUEST') {
      const target = activeAssistance.find((a) => a.assistanceId === selectedAssistanceId);
      if (!target) {
        setError('Please select a food assistance request to support.');
        return;
      }
      assistanceId = target.assistanceId;
      targetTitle = `${target.foodRequirement} (${target.city})`;
    } else if (targetType === 'HOMEAGE') {
      const target = activeHomeages.find((h) => h.homeageId === selectedHomeageId);
      if (!target) {
        setError('Please select a registered Orphanage organization.');
        return;
      }
      homeageId = target.homeageId;
      targetTitle = `${target.name} (${target.city})`;
    }

    setProcessing(true);
    try {
      const receipt = await initiateAndVerifyMoneyDonation({
        targetType,
        assistanceId,
        homeageId,
        targetTitle,
        amount,
        donorName: donorName.trim() || user.name || 'Community Supporter',
        isAnonymous,
        paymentMethod,
      });
      setVerifiedReceipt(receipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Banknote size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                Razorpay Test Mode · Server Verified
              </p>
              <h2 className="text-lg font-extrabold">Donate Money for Food Relief</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setVerifiedReceipt(null);
              onClose();
            }}
            aria-label="Close donation modal"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {verifiedReceipt ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Donation Verified &amp; Recorded!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Your contribution of ₹{verifiedReceipt.amount.toLocaleString()} was cryptographically verified.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Number</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {verifiedReceipt.receiptNumber}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Razorpay Payment ID</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                    {verifiedReceipt.razorpayPaymentId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {verifiedReceipt.assistanceTitle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount &amp; Method</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    ₹{verifiedReceipt.amount.toLocaleString()} · {verifiedReceipt.paymentMethod}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setVerifiedReceipt(null);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Choose Donation Destination */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
                  Choose Where Your Donation Goes
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'GENERAL_FUND', label: 'General Fund', icon: Utensils },
                    { id: 'HOMEAGE', label: 'Orphanage', icon: Building2 },
                    { id: 'ASSISTANCE_REQUEST', label: 'Food Request', icon: HeartHandshake },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTargetType(opt.id as MoneyDonationTargetType)}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all',
                          targetType === opt.id
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        )}
                      >
                        <Icon size={16} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {targetType === 'ASSISTANCE_REQUEST' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Select Food Assistance Request
                  </label>
                  <select
                    value={selectedAssistanceId}
                    onChange={(e) => setSelectedAssistanceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose a food request --</option>
                    {activeAssistance.map((a) => (
                      <option key={a.assistanceId} value={a.assistanceId}>
                        {a.assistanceId} · {a.foodRequirement} ({a.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'HOMEAGE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                    Select Registered Orphanage
                  </label>
                  <select
                    value={selectedHomeageId}
                    onChange={(e) => setSelectedHomeageId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="">-- Choose an Orphanage --</option>
                    {activeHomeages.map((h) => (
                      <option key={h.homeageId} value={h.homeageId}>
                        {h.name} · {h.city}, {h.state}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Contribution Amount (INR)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_AMOUNTS.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold border tabular-nums',
                        amount === val
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      )}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={10}
                  max={500000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-white tabular-nums"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['UPI', 'Card', 'NetBanking'] as PaymentMethod[]).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={cn(
                        'py-2 rounded-xl border text-xs font-bold transition-colors',
                        paymentMethod === pm
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Donor Name + Anonymous */}
              <div className="space-y-2">
                <input
                  type="text"
                  disabled={isAnonymous}
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Your Name for Receipt"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white disabled:opacity-50"
                />
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Donate anonymously</span>
                </label>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
                <span>
                  Order signature is verified server-side via Razorpay Test Mode before recording.
                </span>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-orange-500 hover:from-emerald-700 hover:to-orange-600 text-white text-sm font-extrabold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Verifying Razorpay Payment...</span>
                  </>
                ) : (
                  <span>Pay ₹{Number(amount || 0).toLocaleString()} Securely</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
