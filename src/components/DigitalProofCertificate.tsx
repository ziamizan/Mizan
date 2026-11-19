import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import {
  X,
  Heart,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DigitalProof } from '../types';
import { formatDisplayDate } from '../lib/statusHelpers';
import { PdfDownloadButton } from './PdfDownloadButton';

interface DigitalProofCertificateProps {
  proof: DigitalProof | null;
  onClose: () => void;
}

export function DigitalProofCertificate({
  proof,
  onClose,
}: DigitalProofCertificateProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const verifyPath = proof
    ? `/verify/${proof.proofId}?t=${encodeURIComponent(proof.verificationToken)}`
    : '';
  const fullVerifyUrl =
    typeof window !== 'undefined' && verifyPath
      ? `${window.location.origin}${verifyPath}`
      : verifyPath;

  useEffect(() => {
    if (!proof) return;
    QRCode.toDataURL(fullVerifyUrl, {
      width: 220,
      margin: 1,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [proof, fullVerifyUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!proof) return null;

  const isValid = proof.proofStatus === 'VALID';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullVerifyUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/55 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="digital-proof-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[94vh] flex flex-col"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-brand-blue font-bold text-base">
              <Heart className="fill-brand-blue text-brand-blue" size={18} />
              <span>HelpConnect</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close certificate"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Certificate Header */}
            <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/60 dark:from-slate-800 dark:via-slate-900 dark:to-emerald-950/30 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold tracking-wider text-brand-blue uppercase">
                    Verified Community Certificate
                  </p>
                  <h2 id="digital-proof-title" className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    DIGITAL PROOF OF HELP
                  </h2>
                </div>
                <div
                  className={
                    isValid
                      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold'
                      : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 text-xs font-bold'
                  }
                >
                  {isValid ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
                  {isValid ? 'Requester Confirmed' : 'Suspended'}
                </div>
              </div>

              {/* Certificate Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">PROOF ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {proof.proofId}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">REQUEST ID</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                    {proof.requestId}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">HELP ACTIVITY</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {proof.requestTitle} · {proof.category}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">HELPER</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {proof.helperDisplayName}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">REQUESTER</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {proof.requesterDisplayName}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">COMPLETION DATE</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatDisplayDate(proof.completedAt || proof.generatedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">CONFIRMATION DATE</span>
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {formatDisplayDate(proof.confirmedAt || proof.generatedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">STATUS</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    {isValid ? 'Successfully Completed' : 'Suspended'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">VERIFICATION</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Requester Confirmed
                  </span>
                </div>
              </div>

              {(proof.rating || proof.optionalFeedback) && (
                <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-700 space-y-1.5">
                  {proof.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: proof.rating }).map((_, idx) => (
                        <Star key={idx} size={14} className="fill-amber-400 text-amber-500" />
                      ))}
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 ml-1 tabular-nums">
                        {proof.rating}/5
                      </span>
                    </div>
                  )}
                  {proof.optionalFeedback && (
                    <p className="text-sm italic text-slate-700 dark:text-slate-300">
                      “{proof.optionalFeedback}”
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* QR Verification Section */}
            <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-5">
              {qrUrl && (
                <img
                  src={qrUrl}
                  alt={`QR Code to verify proof ${proof.proofId}`}
                  className="w-28 h-28 rounded-xl bg-white p-1.5 border border-slate-200 shrink-0"
                />
              )}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Instant QR Verification
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Anyone can scan this QR code or open the verification link to confirm authenticity without exposing private contact details.
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check size={14} className="text-brand-green" /> : <Copy size={14} />}
                    {copiedLink ? 'Verification Link Copied' : 'Share Verification Link'}
                  </button>
                  <Link
                    to={verifyPath}
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-brand-blue hover:bg-blue-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
                  >
                    Open Verification Page <ExternalLink size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Required Disclaimer Footer */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center border-t border-slate-100 dark:border-slate-800 pt-4">
              This digital proof confirms that the requester voluntarily acknowledged receiving the assistance through HelpConnect. It is not an official government or legal certificate.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <PdfDownloadButton proof={proof} className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
