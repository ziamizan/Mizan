import {
  BloodEmergencyLevel,
  BloodGroup,
  BloodRequestStatus,
  DonorProfile,
  DonorResponseStatus,
} from '../types';

export const BLOOD_GROUPS: BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

/**
 * Medically standard Red Blood Cell (RBC) compatibility matrix.
 * Key = Recipient's required blood group.
 * Value = Ordered array of compatible Donor blood groups (exact match first).
 */
export const COMPATIBLE_DONOR_GROUPS_FOR_RECIPIENT: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'O+', 'A-', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'O+', 'B-', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'O+', 'A+', 'B+', 'AB-', 'O-', 'A-', 'B-'],
};

/**
 * Key = Donor's blood group.
 * Value = Recipient blood groups this donor can safely donate RBCs to.
 */
export const COMPATIBLE_RECIPIENTS_FOR_DONOR: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export interface GeoPoint {
  lat: number;
  lng: number;
}

const CITY_COORDINATES: Record<string, GeoPoint> = {
  chennai: { lat: 13.0827, lng: 80.2707 },
  madurai: { lat: 9.9252, lng: 78.1198 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  trichy: { lat: 10.7905, lng: 78.7047 },
  tiruchirappalli: { lat: 10.7905, lng: 78.7047 },
  salem: { lat: 11.6643, lng: 78.146 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  pune: { lat: 18.5204, lng: 73.8567 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  vellore: { lat: 12.9165, lng: 79.1325 },
  'tamil nadu': { lat: 11.1271, lng: 78.6569 },
};

export function resolveCoordinatesFromLocation(
  city?: string,
  area?: string
): GeoPoint {
  const combined = `${city || ''} ${area || ''}`.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (combined.includes(key)) {
      return coords;
    }
  }
  // Deterministic gentle offset around Chennai/Tamil Nadu default if unknown city
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 31 + combined.charCodeAt(i)) % 1000;
  }
  return {
    lat: 13.0827 + ((hash % 40) - 20) * 0.004,
    lng: 80.2707 + ((Math.floor(hash / 40) % 40) - 20) * 0.004,
  };
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export function generateBloodRequestId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 89999);
  return `BLD-${year}-${num}`;
}

export function daysSinceLastDonation(lastDonationDate?: string | null): number | null {
  if (!lastDonationDate) return null;
  const dt = new Date(lastDonationDate);
  if (Number.isNaN(dt.getTime())) return null;
  const diffMs = Date.now() - dt.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

export function isDonorCooldownClear(lastDonationDate?: string | null): boolean {
  const days = daysSinceLastDonation(lastDonationDate);
  if (days === null) return true;
  return days >= 56; // Standard 8-week whole blood interval
}

export interface MatchedDonorCandidate {
  donor: DonorProfile;
  compatibilityType: 'EXACT' | 'COMPATIBLE';
  distanceKm: number;
  matchScore: number;
  notificationChannels: string[];
}

export function matchEligibleBloodDonors(params: {
  requesterId: string;
  requiredBloodGroup: BloodGroup;
  allowCompatibleGroups: boolean;
  city: string;
  latitude: number;
  longitude: number;
  emergencyLevel: BloodEmergencyLevel;
  donors: DonorProfile[];
}): MatchedDonorCandidate[] {
  const {
    requesterId,
    requiredBloodGroup,
    allowCompatibleGroups,
    city,
    latitude,
    longitude,
    donors,
  } = params;

  const allowedGroups = allowCompatibleGroups
    ? COMPATIBLE_DONOR_GROUPS_FOR_RECIPIENT[requiredBloodGroup]
    : [requiredBloodGroup];

  const reqCityLower = city.trim().toLowerCase();

  const matches: MatchedDonorCandidate[] = [];

  for (const donor of donors) {
    // Exclude requester self
    if (!donor.uid || donor.uid === requesterId) continue;
    // Account status & availability checks
    if (donor.accountStatus !== 'ACTIVE') continue;
    if (!donor.isAvailable) continue;
    // Cooldown check (56-day safety interval)
    if (!isDonorCooldownClear(donor.lastDonationDate)) continue;
    // Notification opt-out check
    if (donor.notificationsOptOut) continue;

    const channels: string[] = [];
    if (donor.notifyInApp) channels.push('in_app');
    if (donor.notifyPush) channels.push('push');
    if (donor.notifyEmail) channels.push('email');
    if (donor.notifySms) channels.push('sms');
    if (channels.length === 0) continue;

    // Blood group compatibility check
    if (!donor.bloodGroup || !allowedGroups.includes(donor.bloodGroup as BloodGroup)) {
      continue;
    }

    const compatibilityType: 'EXACT' | 'COMPATIBLE' =
      donor.bloodGroup === requiredBloodGroup ? 'EXACT' : 'COMPATIBLE';

    // Distance & preferred donation location check
    const donorLat = donor.latitude || resolveCoordinatesFromLocation(donor.city, donor.approximateArea).lat;
    const donorLng = donor.longitude || resolveCoordinatesFromLocation(donor.city, donor.approximateArea).lng;
    const distanceKm = calculateDistanceKm(latitude, longitude, donorLat, donorLng);

    const sameCity =
      reqCityLower &&
      (donor.city.toLowerCase().includes(reqCityLower) ||
        reqCityLower.includes(donor.city.toLowerCase()) ||
        donor.approximateArea.toLowerCase().includes(reqCityLower));

    const maxDist = donor.maxDistanceKm > 0 ? donor.maxDistanceKm : 25;
    if (!sameCity && distanceKm > maxDist) {
      continue;
    }

    // Score prioritizes: Exact group > Same city/short distance > Verified > Donation track record
    let score = compatibilityType === 'EXACT' ? 100 : 75;
    if (sameCity) score += 20;
    score += Math.max(0, 25 - Math.min(25, Math.round(distanceKm)));
    if (donor.bloodGroupVerified) score += 15;
    score += Math.min(10, donor.totalDonations || 0);

    matches.push({
      donor,
      compatibilityType,
      distanceKm: sameCity && distanceKm > maxDist ? Math.min(distanceKm, 12.0) : distanceKm,
      matchScore: score,
      notificationChannels: channels,
    });
  }

  // Sort highest matchScore first (exact match & closest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

export const BLOOD_STATUS_TIMELINE: Array<{
  key: BloodRequestStatus;
  label: string;
  shortLabel: string;
}> = [
  { key: 'REQUEST_SUBMITTED', label: 'Request Submitted', shortLabel: 'Submitted' },
  { key: 'SEARCHING_FOR_DONORS', label: 'Searching for Donors', shortLabel: 'Searching' },
  { key: 'NOTIFICATIONS_SENT', label: 'Notifications Sent', shortLabel: 'Notified' },
  { key: 'DONORS_INTERESTED', label: 'Donors Interested', shortLabel: 'Interested' },
  { key: 'DONOR_SELECTED', label: 'Donor Selected', shortLabel: 'Selected' },
  { key: 'DONATION_SCHEDULED', label: 'Donation Scheduled', shortLabel: 'Scheduled' },
  { key: 'DONATION_COMPLETED', label: 'Donation Completed', shortLabel: 'Completed' },
  { key: 'REQUEST_FULFILLED', label: 'Request Fulfilled', shortLabel: 'Fulfilled' },
];

export const BLOOD_STATUS_META: Record<
  BloodRequestStatus,
  { label: string; badgeClass: string; stepIndex: number }
> = {
  REQUEST_SUBMITTED: {
    label: 'Request Submitted',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    stepIndex: 0,
  },
  SEARCHING_FOR_DONORS: {
    label: 'Searching for Donors',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    stepIndex: 1,
  },
  NOTIFICATIONS_SENT: {
    label: 'Notifications Sent',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    stepIndex: 2,
  },
  DONORS_INTERESTED: {
    label: 'Donors Interested',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    stepIndex: 3,
  },
  DONOR_SELECTED: {
    label: 'Donor Selected',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    stepIndex: 4,
  },
  DONATION_SCHEDULED: {
    label: 'Donation Scheduled',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
    stepIndex: 5,
  },
  DONATION_COMPLETED: {
    label: 'Donation Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    stepIndex: 6,
  },
  REQUEST_FULFILLED: {
    label: 'Request Fulfilled',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700',
    stepIndex: 7,
  },
  REQUEST_CANCELLED: {
    label: 'Request Cancelled',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    stepIndex: -1,
  },
};

export const DONOR_RESPONSE_META: Record<
  DonorResponseStatus,
  { label: string; badgeClass: string }
> = {
  NOTIFIED: {
    label: 'Notified',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  INTERESTED: {
    label: 'Interested / Accepted',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  },
  SELECTED: {
    label: 'Selected by Requester',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  },
  SCHEDULED: {
    label: 'Donation Scheduled',
    badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
  },
  COMPLETED: {
    label: 'Donation Completed',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  },
  REJECTED: {
    label: 'Declined',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  },
  CLOSED_FULFILLED: {
    label: 'Closed (Request Fulfilled)',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
  CANCELLED: {
    label: 'Request Cancelled',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  },
};

export const EMERGENCY_LEVEL_META: Record<
  BloodEmergencyLevel,
  { label: string; badgeClass: string }
> = {
  Normal: {
    label: 'Normal',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  Urgent: {
    label: 'Urgent',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  Critical: {
    label: 'Critical Emergency',
    badgeClass: 'bg-red-600 text-white border-red-700 dark:bg-red-600 dark:text-white dark:border-red-500',
  },
};
