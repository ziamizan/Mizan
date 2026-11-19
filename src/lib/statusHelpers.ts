import { RequestStatus, IssueStatus, HelperAcceptance } from '../types';

export interface StatusMeta {
  label: string;
  badgeClass: string;
  dotColor: string;
}

export const REQUEST_STATUS_META: Record<RequestStatus, StatusMeta> = {
  REQUESTED: {
    label: 'Open',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-500',
  },
  OPEN: {
    label: 'Open',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-500',
  },
  WAITING_FOR_HELPERS: {
    label: 'Waiting for Helpers',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-500',
  },
  ONE_HELPER_ACCEPTED: {
    label: '1/3 Accepted',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-500',
  },
  TWO_HELPERS_ACCEPTED: {
    label: '2/3 Accepted',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
  },
  THREE_HELPERS_FOUND: {
    label: '3/3 Helpers Found',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    dotColor: 'bg-purple-600',
  },
  AWAITING_RECEIVER_SELECTION: {
    label: 'Awaiting Receiver Selection',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    dotColor: 'bg-purple-600',
  },
  HELPER_SELECTED: {
    label: 'Helper Selected',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Confirmed',
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-600',
  },
  HELPER_UNAVAILABLE: {
    label: 'Helper Unavailable',
    badgeClass:
      'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  BACKUP_SELECTION_REQUIRED: {
    label: 'Backup Selection Required',
    badgeClass:
      'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  ON_THE_WAY: {
    label: 'On The Way',
    badgeClass:
      'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    dotColor: 'bg-sky-500',
  },
  ARRIVED: {
    label: 'Arrived',
    badgeClass:
      'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    dotColor: 'bg-teal-500',
  },
  ASSISTANCE_IN_PROGRESS: {
    label: 'Assistance In Progress',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-600',
  },
  ACCEPTED: {
    label: 'Helper Accepted',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-600',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-600',
  },
  AWAITING_CONFIRMATION: {
    label: 'Awaiting Confirmation',
    badgeClass:
      'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
  },
  COMPLETED_CONFIRMED: {
    label: 'Help Completed',
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-600',
  },
  COMPLETED: {
    label: 'Help Completed',
    badgeClass:
      'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotColor: 'bg-emerald-600',
  },
  COMPLETED_UNCONFIRMED: {
    label: 'Not Yet Received',
    badgeClass:
      'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    dotColor: 'bg-orange-500',
  },
  REOPENED: {
    label: 'Reopened (New Round)',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dotColor: 'bg-blue-600',
  },
  ISSUE_REPORTED: {
    label: 'Issue Reported',
    badgeClass:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    dotColor: 'bg-red-600',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    badgeClass:
      'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
    dotColor: 'bg-red-600',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass:
      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    dotColor: 'bg-slate-400',
  },
};

/**
 * Smart Helper Recommendation Algorithm (Section 4):
 * Evaluates available helpers according to priority:
 * 1. Shortest realistic estimated arrival time
 * 2. Shortest distance
 * 3. Current availability ("Available Now" prioritized)
 * 4. Verification status
 * 5. Previous successful assistance count
 * 6. Acceptance time
 * Note: Never recommends a helper who is unavailable, rejected, or cancelled.
 */
export function calculateRecommendedHelper(
  helpers: HelperAcceptance[]
): HelperAcceptance | null {
  const eligible = helpers.filter(
    (h) =>
      h.acceptanceStatus !== 'UNAVAILABLE' &&
      h.acceptanceStatus !== 'REJECTED' &&
      h.acceptanceStatus !== 'CANCELLED'
  );
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort((a, b) => {
    // 1. Shortest realistic estimated arrival time
    if (a.estimatedArrival !== b.estimatedArrival) {
      return a.estimatedArrival - b.estimatedArrival;
    }
    // 2. Shortest distance
    if (a.approximateDistance !== b.approximateDistance) {
      return a.approximateDistance - b.approximateDistance;
    }
    // 3. Current availability
    const aAvail = a.currentAvailability === 'Available Now' ? 0 : 1;
    const bAvail = b.currentAvailability === 'Available Now' ? 0 : 1;
    if (aAvail !== bAvail) return aAvail - bAvail;

    // 4. Verification status
    if (a.helperVerified !== b.helperVerified) {
      return a.helperVerified ? -1 : 1;
    }
    // 5. Previous successful assistance
    const aCount = a.previousHelpCount ?? 0;
    const bCount = b.previousHelpCount ?? 0;
    if (aCount !== bCount) return bCount - aCount;

    // 6. Acceptance time
    return a.acceptedAt.localeCompare(b.acceptedAt);
  });

  return sorted[0];
}

export function formatEstimatedArrival(minutes: number): string {
  return `${minutes} mins (Estimate)`;
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km away`;
}

export function generateAcceptanceId(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `ACC-${Date.now().toString(36).toUpperCase()}-${num}`;
}

export const ISSUE_STATUS_META: Record<IssueStatus, { label: string; className: string }> = {
  OPEN: {
    label: 'Open',
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    className: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  FLAGGED: {
    label: 'Flagged',
    className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-200 dark:border-red-700',
  },
};

export function generateRequestId(): string {
  const num = Math.floor(10000 + Math.random() * 89999);
  return `HC-${num}`;
}

export function generateProofId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 89999);
  return `DPH-${year}-${num}`;
}

export function generateVerificationToken(): string {
  const array = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function toPrivacySafeName(fullName?: string | null, fallback = 'Community Member'): string {
  if (!fullName || !fullName.trim()) return fallback;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

export function formatDisplayDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDisplayDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
