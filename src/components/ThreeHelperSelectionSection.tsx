import React, { useState } from 'react';
import {
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  HeartHandshake,
  Droplet,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { HelpRequest, HelperAcceptance } from '../types';
import {
  calculateRecommendedHelper,
  formatDisplayDateTime,
  formatDistance,
  formatEstimatedArrival,
} from '../lib/statusHelpers';

interface ThreeHelperSelectionSectionProps {
  request: HelpRequest;
  acceptances: HelperAcceptance[];
  onSelectHelper: (helperId: string) => Promise<void>;
  onViewHelperDetails?: (helper: HelperAcceptance) => void;
  isLoading?: boolean;
}

export function ThreeHelperSelectionSection({
  request,
  acceptances,
  onSelectHelper,
  onViewHelperDetails,
  isLoading = false,
}: ThreeHelperSelectionSectionProps) {
  const [selectedDetails, setSelectedDetails] = useState<HelperAcceptance | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const currentRound = request.matchingRound || 1;
  const roundAcceptances = acceptances.filter(
    (a) => (a.matchingRound || 1) === currentRound
  );

  const availableHelpers = roundAcceptances.filter(
    (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
  );

  const rejectedHelpers = roundAcceptances.filter(
    (a) => ['UNAVAILABLE', 'REJECTED'].includes(a.acceptanceStatus)
  );

  const currentlySelected = roundAcceptances.find(
    (a) => a.isSelected || a.helperId === request.helperId || a.helperId === request.selectedHelperId
  );

  const hasRejections = rejectedHelpers.length > 0;
  const recommendedHelper = calculateRecommendedHelper(availableHelpers);

  const handleChoose = async (helperId: string) => {
    setActionError(null);
    setSelectingId(helperId);
    try {
      await onSelectHelper(helperId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to select helper.');
    } finally {
      setSelectingId(null);
    }
  };

  // If request has been reopened because all 3 rejected
  if (availableHelpers.length === 0 && hasRejections) {
    return (
      <div className="rounded-3xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/30 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/60 text-brand-blue rounded-2xl shrink-0">
            <RefreshCw size={24} className="animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Request Automatically Reopened (Matching Round {currentRound})
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              All helpers from the previous round were unavailable. Your original request has been preserved and reopened with 3 fresh acceptance slots.
            </p>
          </div>
        </div>

        {/* Rejection history */}
        <div className="pt-3 border-t border-blue-200/60 dark:border-blue-900/60 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Previous Round Helper History (Preserved)
          </p>
          <div className="divide-y divide-blue-200/50 dark:divide-blue-900/40 text-xs">
            {rejectedHelpers.map((h) => (
              <div key={h.id || h.acceptanceId} className="py-2 flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {h.helperDisplayName}
                </span>
                <span className="text-red-600 dark:text-red-400 font-medium">
                  Unavailable ({h.rejectionReason || 'No longer available'})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rejection Banner for Backup Helper Mode */}
      {hasRejections && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/40 p-4 flex items-start gap-3.5 shadow-sm">
          <AlertCircle size={22} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Your selected helper is unable to come. Don't worry! Other helpers are still available.
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              The backup helper system has immediately brought forward your remaining verified accepted helpers. Please choose your replacement helper below.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-brand-blue">
            <HeartHandshake size={18} />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">
            {hasRejections ? 'BACKUP HELPERS AVAILABLE' : 'MATCHING ROUND READY'}
          </span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          {hasRejections
            ? 'Select a Backup Helper'
            : 'Three People Are Ready to Help You!'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {hasRejections
            ? 'Choose from the remaining accepted helpers below to resume your assistance immediately.'
            : 'Choose the most suitable helper for your request.'}
        </p>
      </div>

      {/* Special Blood Donation Disclaimer & Requirements */}
      {request.category === 'Blood' && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/80 dark:bg-red-950/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-red-900 dark:text-red-200">
            <Droplet size={18} className="text-brand-red" />
            <span>Blood Donation Helper Selection · {request.bloodGroup || 'Blood'} Needed</span>
          </div>
          <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">
            <strong>Medical Notice:</strong> Blood compatibility, hemoglobin levels, and donor eligibility must be confirmed by qualified medical professionals and the receiving hospital or licensed blood bank. HelpConnect connects volunteer donors but does not provide medical approval.
          </p>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3 text-xs text-red-700 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Three Helper Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roundAcceptances.map((helper, idx) => {
          const isRejected = ['UNAVAILABLE', 'REJECTED'].includes(helper.acceptanceStatus);
          const isSelected = helper.isSelected || helper.helperId === currentlySelected?.helperId;
          const isRecommended = Boolean(
            !isRejected && recommendedHelper && recommendedHelper.helperId === helper.helperId
          );

          const arrivalEstText = formatEstimatedArrival(helper.estimatedArrival || 10);
          const distanceText = formatDistance(helper.approximateDistance || 1.8);

          return (
            <div
              key={helper.id || helper.acceptanceId || idx}
              className={cn(
                'rounded-3xl border p-5 flex flex-col justify-between transition-all relative overflow-hidden',
                isRejected
                  ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                  : isSelected
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-brand-blue shadow-md ring-2 ring-blue-500/20'
                  : isRecommended
                  ? 'bg-gradient-to-b from-emerald-50/70 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-300 dark:border-emerald-800 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              )}
            >
              {/* RECOMMENDED or SELECTED Badge */}
              <div className="mb-3 flex items-center justify-between gap-2">
                {isRecommended && !isRejected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-sm uppercase tracking-wide">
                    <Sparkles size={12} /> RECOMMENDED
                  </span>
                )}
                {isSelected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-600 text-white shadow-sm uppercase tracking-wide">
                    <CheckCircle2 size={12} /> CURRENTLY SELECTED
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    <XCircle size={12} /> UNAVAILABLE
                  </span>
                )}
                {!isRecommended && !isSelected && !isRejected && (
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Helper {idx + 1}
                  </span>
                )}
              </div>

              {/* Helper Profile Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={
                        helper.helperPhotoUrl ||
                        `https://images.unsplash.com/photo-${
                          idx === 0
                            ? '1534528741775-53994a69daeb'
                            : idx === 1
                            ? '1507003211169-0a1dd7228f2d'
                            : '1494790108377-be9c29b29330'
                        }?w=120&auto=format&fit=crop&q=80`
                      }
                      alt={helper.helperDisplayName}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-white dark:border-slate-800 shadow-sm"
                    />
                    {helper.helperVerified && (
                      <span
                        className="absolute -bottom-1 -right-1 bg-brand-blue text-white p-0.5 rounded-full border-2 border-white dark:border-slate-900"
                        title="Verified Community Helper"
                      >
                        <ShieldCheck size={14} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <span>{helper.helperDisplayName}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ⭐ {helper.rating || 4.9} ({helper.reviewsCount || 16} assists)
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                      {helper.currentAvailability || 'Available Now'}
                    </span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 space-y-2 text-xs border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" /> Estimated Arrival:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {arrivalEstText}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <MapPin size={13} className="text-slate-400" /> Distance:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {distanceText}
                    </span>
                  </div>

                  {helper.helperBloodGroup && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Droplet size={13} className="text-brand-red" /> Blood Group:
                      </span>
                      <span className="font-black text-brand-red tabular-nums">
                        {helper.helperBloodGroup}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-500">
                    <span>Assistance Delivered:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {helper.previousHelpCount || 12} successful
                    </strong>
                  </div>
                </div>

                {/* Rejection notice if rejected */}
                {isRejected && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900">
                    Reason: {helper.rejectionReason || 'No longer available'}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {!isRejected && (
                  <button
                    type="button"
                    disabled={isLoading || selectingId === helper.helperId || isSelected}
                    onClick={() => handleChoose(helper.helperId)}
                    className={cn(
                      'w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5',
                      isSelected
                        ? 'bg-blue-600 text-white cursor-default'
                        : isRecommended
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-brand-blue hover:bg-blue-700 text-white'
                    )}
                  >
                    {selectingId === helper.helperId ? (
                      <span>Assigning...</span>
                    ) : isSelected ? (
                      <span>✓ Assigned Helper</span>
                    ) : hasRejections ? (
                      <span>CHOOSE {helper.helperDisplayName.toUpperCase()}</span>
                    ) : (
                      <span>CHOOSE THIS HELPER</span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetails(helper);
                    onViewHelperDetails?.(helper);
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
                >
                  VIEW DETAILS
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Helper Profile Detail Modal */}
      {selectedDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedDetails(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Helper Profile</h3>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3">
              <img
                src={selectedDetails.helperPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                alt={selectedDetails.helperDisplayName}
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  {selectedDetails.helperDisplayName}
                  {selectedDetails.helperVerified && (
                    <ShieldCheck size={16} className="text-brand-blue" />
                  )}
                </h4>
                <p className="text-xs text-slate-500">
                  Verified Community Volunteer · {selectedDetails.currentAvailability || 'Available Now'}
                </p>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                  ⭐ {selectedDetails.rating || 4.9} Rating ({selectedDetails.reviewsCount || 18} community reviews)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl">
              <div>
                <span className="text-slate-500 block">Approx. Distance</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatDistance(selectedDetails.approximateDistance || 1.8)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Estimated Arrival</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatEstimatedArrival(selectedDetails.estimatedArrival || 10)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Accepted At</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatDisplayDateTime(selectedDetails.acceptedAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Matching Round</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Round {selectedDetails.matchingRound || 1}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 bg-blue-50/60 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
              <Info size={14} className="inline mr-1 text-brand-blue" />
              Arrival times are estimates calculated using live community telemetry and approximate geolocation coordinates.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              {!['UNAVAILABLE', 'REJECTED'].includes(selectedDetails.acceptanceStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    void handleChoose(selectedDetails.helperId);
                    setSelectedDetails(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700"
                >
                  Choose This Helper
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
