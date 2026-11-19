import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  CreditCard,
  Building2,
  Lock,
  Loader2,
  Copy,
  Check,
  HeartHandshake,
} from 'lucide-react';
import { HelpRequest, DonationRecord, PaymentMethod } from '../types';
import { cn } from '../lib/utils';

interface DonationModalProps {
  request: HelpRequest | null;
  initialAmount?: number;
  existingReceipt?: DonationRecord | null;
  onClose: () => void;
  onDonate: (
    requestId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    note?: string
  ) => DonationRecord | null | Promise<DonationRecord | null>;
}

const PRESET_AMOUNTS = [100, 500, 1000];

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    id: 'UPI',
    label: 'UPI Instant',
    subtitle: 'GPay, PhonePe, or BHIM (Mock)',
    icon: Smartphone,
  },
  {
    id: 'Card',
    label: 'Tokenized Card',
    subtitle: 'Demo Visa ending 4242',
    icon: CreditCard,
  },
  {
    id: 'NetBanking',
    label: 'NetBanking',
    subtitle: 'Instant bank transfer demo',
    icon: Building2,
  },
];

export function DonationModal({
  request,
  initialAmount = 500,
  existingReceipt = null,
  onClose,
  onDonate,
}: DonationModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(
    PRESET_AMOUNTS.includes(initialAmount) ? initialAmount : 'custom'
  );
  const [customAmount, setCustomAmount] = useState<string>(
    PRESET_AMOUNTS.includes(initialAmount) ? '' : String(initialAmount)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [upiProvider, setUpiProvider] = useState<'GPay' | 'PhonePe' | 'BHIM'>('GPay');
  const [bankName, setBankName] = useState<'SBI' | 'HDFC' | 'ICICI'>('HDFC');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'checkout' | 'processing' | 'receipt'>(
    existingReceipt ? 'receipt' : 'checkout'
  );
  const [receipt, setReceipt] = useState<DonationRecord | null>(existingReceipt);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (existingReceipt) {
      setReceipt(existingReceipt);
      setStep('receipt');
      return;
    }
    setReceipt(null);
    setStep('checkout');
    setError(null);
    setNote('');
    setCopied(false);
    if (PRESET_AMOUNTS.includes(initialAmount)) {
      setSelectedPreset(initialAmount);
      setCustomAmount('');
    } else {
      setSelectedPreset('custom');
      setCustomAmount(String(initialAmount));
    }
  }, [request?.id, initialAmount, existingReceipt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'processing') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, step]);

  if (!request && !receipt) return null;

  const activeAmount =
    selectedPreset === 'custom'
      ? Number(customAmount.replace(/[^0-9]/g, '')) || 0
      : selectedPreset;

  const amountNeeded = request?.amountNeeded ?? 0;
  const amountCollected = request?.amountCollected ?? 0;
  const remaining = Math.max(0, amountNeeded - amountCollected);
  const currentPercent = amountNeeded > 0 ? Math.min(100, Math.round((amountCollected / amountNeeded) * 100)) : 0;
  const projectedPercent =
    amountNeeded > 0
      ? Math.min(100, Math.round(((amountCollected + activeAmount) / amountNeeded) * 100))
      : 0;

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (activeAmount < 10) {
      setError('Minimum donation amount is ₹10.');
      return;
    }
    if (activeAmount > 500000) {
      setError('Maximum single mock donation is ₹5,00,000.');
      return;
    }

    setError(null);
    setStep('processing');

    try {
      const [createdReceipt] = await Promise.all([
        Promise.resolve(onDonate(request.id, activeAmount, paymentMethod, note)),
        new Promise((resolve) => window.setTimeout(resolve, 750)),
      ]);
      if (createdReceipt) {
        setReceipt(createdReceipt);
        setStep('receipt');
      } else {
        setError('Unable to complete donation. Please sign in and try again.');
        setStep('checkout');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete donation. Please try again.');
      setStep('checkout');
    }
  };

  const handleCopyReceipt = async () => {
    if (!receipt) return;
    const summary = [
      'HelpConnect Donation Receipt',
      `Transaction ID: ${receipt.transactionRef}`,
      `Recipient: ${receipt.recipientName}`,
      `Amount: ₹${receipt.amount.toLocaleString('en-IN')}`,
      `Method: ${receipt.paymentMethod}`,
      `Status: Completed`,
      `Date: ${new Date(receipt.timestamp).toLocaleString()}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/45 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-modal-title"
        onClick={() => {
          if (step !== 'processing') onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-green flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 id="donation-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {step === 'receipt' ? 'Donation Receipt' : 'Secure Donation'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {step === 'receipt' ? 'Verified transaction summary' : 'Mock payment gateway · Zero card storage'}
                </p>
              </div>
            </div>
            {step !== 'processing' && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close donation dialog"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {step === 'checkout' && request && (
              <form onSubmit={(e) => void handleConfirmPayment(e)} className="space-y-6">
                {/* Request summary */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <span>Supporting {request.requesterName}</span>
                        {request.requesterVerified && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 text-brand-blue font-semibold">
                              <CheckCircle2 size={13} /> Verified
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{request.description}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium mb-1.5 tabular-nums">
                      <span className="text-slate-600 dark:text-slate-400">
                        Collected: <strong className="text-slate-900 dark:text-white">₹{amountCollected.toLocaleString('en-IN')}</strong> of ₹{amountNeeded.toLocaleString('en-IN')}
                      </span>
                      <span className="text-brand-green font-semibold">
                        {activeAmount > 0 ? `${currentPercent}% → ${projectedPercent}%` : `${currentPercent}%`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden relative">
                      <div
                        className="bg-brand-green h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentPercent}%` }}
                      />
                    </div>
                    {remaining > 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
                        ₹{remaining.toLocaleString('en-IN')} still needed to reach goal
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                    Select Donation Amount
                  </label>
                  <div className="grid grid-cols-4 gap-2.5">
                    {PRESET_AMOUNTS.map((amt) => {
                      const isActive = selectedPreset === amt;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(amt);
                            setError(null);
                          }}
                          className={cn(
                            'min-h-[44px] rounded-xl font-bold text-sm tabular-nums border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green',
                            isActive
                              ? 'bg-brand-green text-white border-brand-green shadow-sm'
                              : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          )}
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPreset('custom');
                        setError(null);
                      }}
                      className={cn(
                        'min-h-[44px] rounded-xl font-bold text-sm border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green',
                        selectedPreset === 'custom'
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                          : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      )}
                    >
                      Custom
                    </button>
                  </div>

                  {selectedPreset === 'custom' && (
                    <div className="mt-3 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-base">
                        ₹
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={500000}
                        inputMode="numeric"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setError(null);
                        }}
                        placeholder="Enter amount (min ₹10)"
                        aria-label="Custom donation amount in rupees"
                        className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                    Payment Method (Demo Gateway)
                  </label>
                  <div className="space-y-2">
                    {PAYMENT_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = paymentMethod === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setPaymentMethod(option.id)}
                          className={cn(
                            'w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue',
                            isSelected
                              ? 'border-brand-blue bg-blue-50/50 dark:bg-blue-950/40'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-9 h-9 rounded-lg flex items-center justify-center',
                                isSelected
                                  ? 'bg-brand-blue text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              )}
                            >
                              <Icon size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{option.label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{option.subtitle}</p>
                            </div>
                          </div>
                          <div
                            className={cn(
                              'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                              isSelected ? 'border-brand-blue' : 'border-slate-300 dark:border-slate-600'
                            )}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Lightweight method-specific mock selector (no sensitive PII/card data collected) */}
                  {paymentMethod === 'UPI' && (
                    <div className="mt-3 flex items-center gap-2">
                      {(['GPay', 'PhonePe', 'BHIM'] as const).map((app) => (
                        <button
                          key={app}
                          type="button"
                          onClick={() => setUpiProvider(app)}
                          className={cn(
                            'flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors',
                            upiProvider === app
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          )}
                        >
                          {app}
                        </button>
                      ))}
                    </div>
                  )}

                  {paymentMethod === 'NetBanking' && (
                    <div className="mt-3 flex items-center gap-2">
                      {(['HDFC', 'SBI', 'ICICI'] as const).map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setBankName(bank)}
                          className={cn(
                            'flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-colors',
                            bankName === bank
                              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          )}
                        >
                          {bank} Demo
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional Message */}
                <div>
                  <label htmlFor="donation-note" className="block text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                    Note of Support <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="donation-note"
                    type="text"
                    maxLength={120}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Wishing you a speedy recovery and strength."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:border-brand-blue"
                  />
                </div>

                {error && (
                  <p className="text-sm font-medium text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5" role="alert">
                    {error}
                  </p>
                )}

                {/* Security Disclaimer */}
                <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                  <Lock size={15} className="text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Simulated checkout for demonstration. HelpConnect never collects or stores sensitive card numbers, CVV, or banking PINs.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={activeAmount <= 0}
                  className="w-full min-h-[48px] bg-brand-green text-white py-3.5 px-6 rounded-xl font-bold text-base hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-green"
                >
                  Donate ₹{activeAmount.toLocaleString('en-IN')} Now
                </button>
              </form>
            )}

            {step === 'processing' && (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-green flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verifying Payment Securely</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    Authorizing ₹{activeAmount.toLocaleString('en-IN')} via {paymentMethod}…
                  </p>
                </div>
              </div>
            )}

            {step === 'receipt' && receipt && (
              <div className="space-y-6">
                <div className="text-center space-y-2 py-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-green flex items-center justify-center">
                    <HeartHandshake size={28} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Thank You for Your Kindness</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Your donation to <strong className="text-slate-900 dark:text-white">{receipt.recipientName}</strong> is confirmed.
                  </p>
                </div>

                {/* Receipt Details */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Amount Donated</span>
                    <span className="text-xl font-extrabold text-brand-green tabular-nums">
                      ₹{receipt.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Status</span>
                    <span className="font-semibold text-brand-green inline-flex items-center gap-1">
                      <CheckCircle2 size={14} /> Completed
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Reference ID</span>
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {receipt.transactionRef}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Payment Method</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{receipt.paymentMethod} (Mock)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                      {new Date(receipt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {receipt.note && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Your Support Note</span>
                      <p className="text-slate-700 dark:text-slate-300 italic">“{receipt.note}”</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCopyReceipt}
                    className="flex-1 min-h-[44px] py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  >
                    {copied ? <Check size={16} className="text-brand-green" /> : <Copy size={16} />}
                    {copied ? 'Receipt Copied' : 'Copy Receipt'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
