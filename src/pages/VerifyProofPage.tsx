import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import {
  ShieldCheck,
  AlertTriangle,
  Search,
  CheckCircle2,
  Lock,
  Loader2,
  XCircle,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { DigitalProof, ProofStatus, RequestCategory } from '../types';
import { formatDisplayDate } from '../lib/statusHelpers';

export function VerifyProofPage() {
  const { proofId: paramProofId } = useParams<{ proofId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenParam = searchParams.get('t') || '';
  const [inputId, setInputId] = useState(paramProofId || '');
  const [loading, setLoading] = useState(false);
  const [proof, setProof] = useState<DigitalProof | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputId(paramProofId || '');
    if (!paramProofId) {
      setProof(null);
      setNotFound(false);
      setError(null);
      return;
    }

    const cleanId = paramProofId.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(cleanId)) {
      setError('Invalid Proof ID format.');
      setProof(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    getDoc(doc(db, 'digital_proofs', cleanId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setNotFound(true);
          setProof(null);
          return;
        }
        const d = snap.data();
        const loaded: DigitalProof = {
          id: snap.id,
          proofId: String(d.proofId || snap.id),
          requestId: String(d.requestId || ''),
          requesterId: String(d.requesterId || ''),
          helperId: String(d.helperId || ''),
          requestTitle: String(d.requestTitle || ''),
          category: (d.category as RequestCategory) || 'Other',
          requesterDisplayName: String(d.requesterDisplayName || 'Community Member'),
          helperDisplayName: String(d.helperDisplayName || 'Verified Community Member'),
          verificationToken: String(d.verificationToken || ''),
          proofStatus: (d.proofStatus as ProofStatus) || 'VALID',
          completedAt: d.completedAt?.toDate ? d.completedAt.toDate().toISOString() : undefined,
          confirmedAt: d.confirmedAt?.toDate ? d.confirmedAt.toDate().toISOString() : undefined,
          generatedAt: d.generatedAt?.toDate
            ? d.generatedAt.toDate().toISOString()
            : new Date().toISOString(),
        };
        setProof(loaded);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to verify proof right now.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [paramProofId]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputId.trim();
    if (!cleaned) return;
    navigate(`/verify/${encodeURIComponent(cleaned)}`);
  };

  const tokenMatches =
    !tokenParam || (proof && proof.verificationToken === tokenParam);
  const isAuthentic = Boolean(proof && proof.proofStatus === 'VALID' && tokenMatches);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-brand-blue flex items-center justify-center">
          <ShieldCheck size={24} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Digital Proof Verification
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Enter a HelpConnect Proof ID or scan a certificate QR code to verify authenticity.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleLookup} className="glass-card p-4 flex gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="e.g. DPH-2026-00124"
            aria-label="Proof ID"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-blue/40"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 min-h-[44px] rounded-xl bg-brand-blue text-white text-sm font-bold hover:bg-blue-700 transition-colors shrink-0"
        >
          Verify
        </button>
      </form>

      {loading && (
        <div className="glass-card p-10 text-center space-y-3">
          <Loader2 size={28} className="animate-spin text-brand-blue mx-auto" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Validating proof authenticity…
          </p>
        </div>
      )}

      {error && (
        <div className="glass-card p-6 border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-950/30 flex items-center gap-3 text-red-700 dark:text-red-300 text-sm">
          <AlertTriangle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notFound && !loading && (
        <div className="glass-card p-8 text-center space-y-2 border-red-200 dark:border-red-800">
          <XCircle size={32} className="text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Proof Record Not Found</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No Digital Proof of Help matches <span className="font-mono font-semibold">{paramProofId}</span>.
          </p>
        </div>
      )}

      {proof && !loading && (
        <div className="glass-card p-6 sm:p-8 space-y-6">
          <div
            className={
              isAuthentic
                ? 'rounded-2xl p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3'
                : 'rounded-2xl p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-center gap-3'
            }
          >
            {isAuthentic ? (
              <CheckCircle2 size={24} className="text-brand-green shrink-0" />
            ) : (
              <AlertTriangle size={24} className="text-red-600 shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {!tokenMatches
                  ? 'Verification Token Mismatch'
                  : proof.proofStatus === 'SUSPENDED'
                    ? 'Proof Suspended by Moderation'
                    : 'Authentic Digital Proof of Help'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isAuthentic
                  ? 'This certificate was generated after voluntary requester confirmation on HelpConnect.'
                  : 'This verification record is currently invalid or suspended.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">PROOF ID</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {proof.proofId}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">REQUEST ID</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                {proof.requestId}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">REQUEST CATEGORY</span>
              <span className="font-semibold text-slate-900 dark:text-white">{proof.category}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">COMPLETION DATE</span>
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                {formatDisplayDate(proof.completedAt || proof.generatedAt)}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">VERIFICATION STATUS</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {proof.proofStatus === 'VALID' ? 'Requester Confirmed' : 'Suspended'}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">PARTICIPANTS</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {proof.helperDisplayName} → {proof.requesterDisplayName}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200/70 dark:border-slate-700">
            <Lock size={14} className="shrink-0 mt-0.5 text-slate-400" />
            <span>
              Privacy Protection Active: Mobile numbers, email addresses, home addresses, and private messages are never exposed on public QR verification.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
