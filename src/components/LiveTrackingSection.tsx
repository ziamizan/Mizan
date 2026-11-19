import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Radio,
  LocateFixed,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { HelpRequest, HelperAcceptance } from '../types';
import { formatDisplayDateTime } from '../lib/statusHelpers';

interface LiveTrackingSectionProps {
  request: HelpRequest;
  helper?: HelperAcceptance | null;
  onOpenChat?: () => void;
  onCallHelper?: () => void;
  onStatusChange?: (newStatus: string) => Promise<void>;
  isHelper?: boolean;
}

export function LiveTrackingSection({
  request,
  helper,
  onOpenChat,
  onCallHelper,
  onStatusChange,
  isHelper = false,
}: LiveTrackingSectionProps) {
  const [locationSharing, setLocationSharing] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [helperOffset, setHelperOffset] = useState({ x: 70, y: 35 }); // SVG map coordinate percentage
  const [distanceKm, setDistanceKm] = useState(helper?.approximateDistance || 1.8);
  const [etaMins, setEtaMins] = useState(helper?.estimatedArrival || 10);

  const isClosed = ['COMPLETED_CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(request.status);

  // Status progression stages (Section 9)
  const trackingStages = [
    { key: 'HELPER_SELECTED', label: '1. Helper Selected', desc: 'Primary helper selected by receiver' },
    { key: 'CONFIRMED', label: '2. Confirmed', desc: 'Helper confirmed assistance commitment' },
    { key: 'ON_THE_WAY', label: '3. On The Way', desc: 'Helper is actively traveling towards your location' },
    { key: 'ARRIVED', label: '4. Arrived', desc: 'Helper arrived at your destination point' },
    { key: 'ASSISTANCE_IN_PROGRESS', label: '5. Assistance In Progress', desc: 'Active hands-on assistance being delivered' },
    { key: 'COMPLETED', label: '6. Help Completed', desc: 'Assistance successfully completed & proof generated' },
  ];

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'HELPER_SELECTED':
        return 0;
      case 'CONFIRMED':
        return 1;
      case 'ON_THE_WAY':
        return 2;
      case 'ARRIVED':
        return 3;
      case 'IN_PROGRESS':
      case 'ASSISTANCE_IN_PROGRESS':
        return 4;
      case 'AWAITING_CONFIRMATION':
      case 'COMPLETED_CONFIRMED':
      case 'COMPLETED':
        return 5;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(request.status);

  // Simulated live GPS micro-movement on refresh
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      // Nudge helper closer to receiver (receiver is at x: 30, y: 65)
      setHelperOffset((prev) => ({
        x: Math.max(32, prev.x - (prev.x > 32 ? 3 : 0)),
        y: Math.min(63, prev.y + (prev.y < 63 ? 2 : 0)),
      }));
      setDistanceKm((prev) => Math.max(0.2, Number((prev - 0.1).toFixed(1))));
      setEtaMins((prev) => Math.max(1, prev - 1));
      setRefreshing(false);
    }, 600);
  };

  if (isClosed) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 text-center space-y-2">
        <CheckCircle2 size={28} className="mx-auto text-brand-green" />
        <h3 className="font-bold text-slate-900 dark:text-white text-base">Tracking Ended</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Location tracking has automatically stopped because this assistance mission is completed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-brand-green/10 text-brand-green">
              <Radio size={16} className="animate-pulse" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-brand-green">
              LIVE TELEMETRY
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
            TRACK YOUR HELPER
          </h2>
        </div>

        {/* Voluntary Location Sharing Toggle */}
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={locationSharing}
              onChange={(e) => setLocationSharing(e.target.checked)}
              className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
            />
            <span>{locationSharing ? 'GPS Sharing: ON' : 'GPS Sharing: OFF'}</span>
          </label>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh location telemetry"
          >
            <RefreshCw size={15} className={cn(refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Real-time Telemetry Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
        <div>
          <span className="text-slate-500 block mb-0.5">Distance Remaining</span>
          <span className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">
            {distanceKm} km
          </span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">Estimated Arrival</span>
          <span className="font-extrabold text-brand-green text-sm tabular-nums">
            ~{etaMins} mins (Estimate)
          </span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">Current Stage</span>
          <span className="font-bold text-brand-blue text-sm">
            {trackingStages[currentStageIndex]?.label.replace(/^\d+\.\s*/, '')}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block mb-0.5">Last Location Update</span>
          <span className="font-mono text-slate-600 dark:text-slate-400 tabular-nums">
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Interactive Map Canvas (Vector SVG with Radar & Route) */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 h-64 shadow-inner">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Map Grid styling */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
            </pattern>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="#0f172a" />
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Simulated Street lines */}
          <path d="M 0 35 Q 40 30 70 35 T 100 45" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" />
          <path d="M 30 0 L 30 100" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" />
          <path d="M 0 65 L 100 65" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" />
          <path d="M 70 0 Q 75 50 70 100" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.2" />

          {/* Dotted Navigation Route between Helper and Receiver */}
          {locationSharing && (
            <path
              d={`M ${helperOffset.x} ${helperOffset.y} Q ${(helperOffset.x + 30) / 2} ${helperOffset.y} 30 65`}
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="1.8"
              strokeDasharray="2,2"
              className="animate-pulse"
            />
          )}

          {/* Receiver Location Pin (x: 30, y: 65) */}
          <circle cx="30" cy="65" r="4" fill="#3b82f6" fillOpacity="0.3" />
          <circle cx="30" cy="65" r="2" fill="#3b82f6" />

          {/* Helper Pin with Radar Pulse (at helperOffset) */}
          {locationSharing ? (
            <g>
              <circle cx={helperOffset.x} cy={helperOffset.y} r="6" fill="#10b981" fillOpacity="0.25" className="animate-ping" />
              <circle cx={helperOffset.x} cy={helperOffset.y} r="2.8" fill="#10b981" stroke="#ffffff" strokeWidth="0.8" />
            </g>
          ) : (
            <text x="50" y="50" fill="#94a3b8" fontSize="3.5" textAnchor="middle">
              Location sharing paused by helper
            </text>
          )}
        </svg>

        {/* Map Overlay Badges */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
          <span>Live GPS Coordinates active</span>
        </div>

        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 rounded-xl px-3 py-1.5 text-[11px] text-slate-300">
          <MapPin size={12} className="inline mr-1 text-brand-blue" />
          Receiver: <strong className="text-white">{request.location}</strong>
        </div>

        <div className="absolute bottom-3 right-3 flex gap-2">
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="px-3 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-700 shadow-md flex items-center gap-1.5"
            >
              <MessageSquare size={13} /> Message
            </button>
          )}
          {onCallHelper && (
            <button
              type="button"
              onClick={onCallHelper}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold hover:bg-slate-700 flex items-center gap-1.5"
            >
              <PhoneCall size={13} /> Call
            </button>
          )}
        </div>
      </div>

      {/* Six Stage Progression Timeline (Section 9) */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Assistance Progression Stages
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {trackingStages.map((st, i) => {
            const isDone = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div
                key={st.key}
                className={cn(
                  'p-3 rounded-2xl border transition-all',
                  isCurrent
                    ? 'bg-blue-50/80 dark:bg-blue-950/50 border-brand-blue shadow-sm ring-2 ring-blue-500/20'
                    : isDone
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                )}
              >
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {isDone ? (
                    <CheckCircle2 size={14} className="text-brand-green" />
                  ) : (
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold text-white',
                        isCurrent ? 'bg-brand-blue animate-pulse' : 'bg-slate-400'
                      )}
                    >
                      {i + 1}
                    </span>
                  )}
                  <span
                    className={cn(
                      isCurrent
                        ? 'text-brand-blue font-extrabold'
                        : isDone
                        ? 'text-emerald-900 dark:text-emerald-200'
                        : 'text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {st.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {st.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
