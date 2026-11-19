import React, { useState } from 'react';
import {
  ShieldCheck,
  PhoneCall,
  MessageSquare,
  Navigation,
  Lock,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
} from 'lucide-react';
import { HelpRequest, HelperAcceptance } from '../types';
import { formatDistance, formatEstimatedArrival } from '../lib/statusHelpers';

interface SelectedHelperCardProps {
  request: HelpRequest;
  helper: HelperAcceptance;
  onOpenChat: () => void;
  onOpenTracking: () => void;
}

export function SelectedHelperCard({
  request,
  helper,
  onOpenChat,
  onOpenTracking,
}: SelectedHelperCardProps) {
  const [showCallConsentModal, setShowCallConsentModal] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);

  return (
    <div className="rounded-3xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
            Assigned Primary Helper
          </span>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            Connected Community Helper
          </h3>
        </div>
        <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
          ID: {request.requestId}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={helper.helperPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
              alt={helper.helperDisplayName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-blue/30"
            />
            {helper.helperVerified && (
              <span className="absolute -bottom-1 -right-1 bg-brand-blue text-white p-1 rounded-full shadow-sm">
                <ShieldCheck size={14} />
              </span>
            )}
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{helper.helperDisplayName}</span>
              {helper.helperVerified && (
                <span className="text-xs text-brand-blue font-semibold">Verified</span>
              )}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ⭐ {helper.rating || 4.9} · {helper.reviewsCount || 18} successful community missions
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                {helper.currentAvailability || 'Available Now'}
              </span>
              <span className="text-slate-500">
                · {formatDistance(helper.approximateDistance || 1.8)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Chat & Call with Privacy Consent */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenChat}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs shadow-sm inline-flex items-center justify-center gap-1.5 transition-all"
          >
            <MessageSquare size={16} />
            <span>In-App Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCallConsentModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-all"
          >
            <PhoneCall size={16} className="text-brand-green" />
            <span>Call Helper</span>
          </button>

          <button
            type="button"
            onClick={onOpenTracking}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-brand-green border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 font-bold text-xs inline-flex items-center gap-1.5 transition-all"
          >
            <Navigation size={16} />
            <span>Track</span>
          </button>
        </div>
      </div>

      {/* Sensitive Contact & Privacy Consent Dialog */}
      {showCallConsentModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCallConsentModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 text-brand-green rounded-2xl">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Secure Direct Contact
                </h4>
                <p className="text-xs text-slate-500">
                  Privacy-first communication policy
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              HelpConnect protects private phone numbers. Direct phone access is voluntary and only enabled once you consent to share contact connectivity for this request.
            </p>

            {!consentGranted ? (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConsentGranted(true)}
                  className="w-full py-2.5 rounded-xl bg-brand-green text-white font-bold text-xs hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                >
                  <Eye size={15} /> Reveal Direct Voice Contact
                </button>
                <button
                  type="button"
                  onClick={() => setShowCallConsentModal(false)}
                  className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel & Use In-App Chat
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                  +91 (987) 654-3210 (Masked Proxy)
                </div>
                <a
                  href="tel:+919876543210"
                  className="w-full py-2.5 rounded-xl bg-brand-green text-white font-bold text-xs hover:bg-green-700 shadow-sm flex items-center justify-center gap-2"
                >
                  <PhoneCall size={15} /> Dial Now
                </a>
                <button
                  type="button"
                  onClick={() => setShowCallConsentModal(false)}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
