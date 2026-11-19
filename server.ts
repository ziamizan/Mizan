import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// API Route for HelpConnect AI
app.post("/api/ai/parse-request", async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const schema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "Category of help needed: Emergency, Blood, Money, Food, Medicine, Transport, Education, Shelter, Volunteer, Other",
        },
        bloodGroup: {
          type: Type.STRING,
          description: "If it is a blood request, what is the blood group? (e.g. A+, O-, etc). Leave empty if not applicable.",
        },
        priority: {
          type: Type.STRING,
          description: "Priority of the request: Normal, High, or Urgent",
        },
        location: {
          type: Type.STRING,
          description: "The location mentioned in the text.",
        },
        description: {
          type: Type.STRING,
          description: "A short professional summary of the request.",
        }
      },
      required: ["category", "priority", "description"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `Parse this help request and extract structured information: "${prompt}"` }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    });

    const resultText = response.text;
    const parsed = resultText ? JSON.parse(resultText) : {};
    
    res.json(parsed);
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to parse request" });
  }
});

// ==================================================
// ATOMIC MULTI-HELPER ACCEPTANCE & SELECTION BACKEND
// ==================================================

interface ServerAcceptanceRecord {
  id: string;
  acceptanceId: string;
  requestId: string;
  helperId: string;
  helperDisplayName: string;
  helperPhotoUrl?: string;
  helperVerified: boolean;
  helperBloodGroup?: string;
  acceptanceStatus: 'ACCEPTED' | 'SELECTED' | 'CONFIRMED' | 'UNAVAILABLE' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  acceptedAt: string;
  selectedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  approximateDistance: number;
  estimatedArrival: number;
  isSelected: boolean;
  matchingRound: number;
  currentAvailability: string;
  helpCategory?: string;
  previousHelpCount: number;
  rating: number;
  reviewsCount: number;
  feedback?: string;
  locationSharing?: boolean;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string;
}

interface ServerRequestState {
  requestId: string;
  matchingRound: number;
  status: string;
  selectedHelperId: string | null;
  acceptanceClosed: boolean;
  reopenedAt: string | null;
  acceptances: ServerAcceptanceRecord[];
}

class AsyncMutex {
  private queue: (() => void)[] = [];
  private locked = false;

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      const release = () => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          next?.();
        } else {
          this.locked = false;
        }
      };

      if (!this.locked) {
        this.locked = true;
        resolve(release);
      } else {
        this.queue.push(() => resolve(release));
      }
    });
  }
}

const requestLocks = new Map<string, AsyncMutex>();
function getLock(requestId: string): AsyncMutex {
  let lock = requestLocks.get(requestId);
  if (!lock) {
    lock = new AsyncMutex();
    requestLocks.set(requestId, lock);
  }
  return lock;
}

const requestStates = new Map<string, ServerRequestState>();

function getOrCreateRequestState(requestId: string): ServerRequestState {
  let state = requestStates.get(requestId);
  if (!state) {
    state = {
      requestId,
      matchingRound: 1,
      status: 'OPEN',
      selectedHelperId: null,
      acceptanceClosed: false,
      reopenedAt: null,
      acceptances: [],
    };
    requestStates.set(requestId, state);
  }
  return state;
}

// 1. Get current helper state
app.get("/api/requests/:requestId/helper-state", (req, res) => {
  const { requestId } = req.params;
  const state = getOrCreateRequestState(requestId);
  const currentRoundAcceptances = state.acceptances.filter(
    (a) => a.matchingRound === state.matchingRound
  );
  const activeAccepted = currentRoundAcceptances.filter(
    (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
  );
  res.json({
    requestId,
    matchingRound: state.matchingRound,
    status: state.status,
    selectedHelperId: state.selectedHelperId,
    acceptedCount: activeAccepted.length,
    remainingSlots: Math.max(0, 3 - activeAccepted.length),
    acceptanceClosed: state.acceptanceClosed || activeAccepted.length >= 3,
    activeAcceptances: currentRoundAcceptances,
    allHistory: state.acceptances,
  });
});

// 2. Atomic Helper Acceptance (Enforces Max 3 Limit per matching round & concurrency lock)
app.post("/api/requests/:requestId/accept-helper", async (req, res) => {
  const { requestId } = req.params;
  const lock = getLock(requestId);
  const release = await lock.acquire();

  try {
    const state = getOrCreateRequestState(requestId);
    const {
      helperId,
      helperDisplayName = "Community Helper",
      helperPhotoUrl,
      helperVerified = true,
      helperBloodGroup,
      approximateDistance,
      estimatedArrival,
      currentAvailability = "Available Now",
      previousHelpCount = 12,
      rating = 4.9,
      reviewsCount = 15,
      helpCategory = "Community Assistance",
    } = req.body;

    if (!helperId) {
      return res.status(400).json({ error: "helperId is required." });
    }

    if (state.status === "COMPLETED_CONFIRMED" || state.status === "CANCELLED") {
      return res.status(400).json({ error: "Cannot accept a completed or cancelled request." });
    }

    const currentRoundAcceptances = state.acceptances.filter(
      (a) => a.matchingRound === state.matchingRound
    );

    // Prevent duplicate acceptance by same helper in this matching round
    const duplicate = currentRoundAcceptances.find(
      (a) => a.helperId === helperId && !['UNAVAILABLE', 'REJECTED'].includes(a.acceptanceStatus)
    );
    if (duplicate) {
      return res.status(400).json({
        error: "Duplicate acceptance: You have already accepted this request in matching round " + state.matchingRound,
      });
    }

    // Active accepted count
    const activeAccepted = currentRoundAcceptances.filter(
      (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
    );

    // RULE 1: STRICT MAXIMUM THREE ACTIVE ACCEPTED HELPERS PER MATCHING ROUND
    if (activeAccepted.length >= 3 || state.acceptanceClosed) {
      return res.status(409).json({
        error: "ACCEPTANCE LIMIT REACHED: Maximum 3 helpers found for matching round " + state.matchingRound,
        acceptedCount: 3,
        remainingSlots: 0,
        acceptanceClosed: true,
      });
    }

    // Realistic distance & ETA defaults if not supplied
    const distanceVal = typeof approximateDistance === 'number'
      ? approximateDistance
      : Number((1.2 + activeAccepted.length * 0.9).toFixed(1));
    const etaVal = typeof estimatedArrival === 'number'
      ? estimatedArrival
      : 8 + activeAccepted.length * 5;

    const newAcceptance: ServerAcceptanceRecord = {
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      acceptanceId: `ACC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      requestId,
      helperId,
      helperDisplayName,
      helperPhotoUrl,
      helperVerified: Boolean(helperVerified),
      helperBloodGroup,
      acceptanceStatus: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
      approximateDistance: distanceVal,
      estimatedArrival: etaVal,
      isSelected: false,
      matchingRound: state.matchingRound,
      currentAvailability,
      helpCategory,
      previousHelpCount,
      rating,
      reviewsCount,
    };

    state.acceptances.push(newAcceptance);
    const updatedActiveCount = activeAccepted.length + 1;
    const remainingSlots = Math.max(0, 3 - updatedActiveCount);

    if (updatedActiveCount === 1) {
      state.status = 'ONE_HELPER_ACCEPTED';
    } else if (updatedActiveCount === 2) {
      state.status = 'TWO_HELPERS_ACCEPTED';
    } else if (updatedActiveCount === 3) {
      state.status = 'THREE_HELPERS_FOUND';
      state.acceptanceClosed = true;
    }

    return res.status(201).json({
      success: true,
      message: `Helper accepted slot ${updatedActiveCount}/3 in matching round ${state.matchingRound}.`,
      acceptance: newAcceptance,
      acceptedCount: updatedActiveCount,
      remainingSlots,
      acceptanceClosed: state.acceptanceClosed,
      status: state.status,
    });
  } catch (err) {
    console.error("Acceptance error:", err);
    return res.status(500).json({ error: "Internal server error during acceptance." });
  } finally {
    release();
  }
});

// 3. Receiver Selects One of the Three Helpers
app.post("/api/requests/:requestId/select-helper", async (req, res) => {
  const { requestId } = req.params;
  const lock = getLock(requestId);
  const release = await lock.acquire();

  try {
    const state = getOrCreateRequestState(requestId);
    const { helperId } = req.body;
    if (!helperId) {
      return res.status(400).json({ error: "helperId is required." });
    }

    const currentRoundAcceptances = state.acceptances.filter(
      (a) => a.matchingRound === state.matchingRound && !['UNAVAILABLE', 'REJECTED'].includes(a.acceptanceStatus)
    );

    const targetHelper = currentRoundAcceptances.find((a) => a.helperId === helperId);
    if (!targetHelper) {
      return res.status(404).json({ error: "Helper not found in active acceptances for this round." });
    }

    // Mark target helper as SELECTED, others remain ACCEPTED (backup standby)
    state.acceptances.forEach((a) => {
      if (a.matchingRound === state.matchingRound) {
        if (a.helperId === helperId) {
          a.acceptanceStatus = 'SELECTED';
          a.isSelected = true;
          a.selectedAt = new Date().toISOString();
        } else if (a.acceptanceStatus === 'SELECTED') {
          a.acceptanceStatus = 'ACCEPTED';
          a.isSelected = false;
        }
      }
    });

    state.selectedHelperId = helperId;
    state.status = 'HELPER_SELECTED';

    return res.json({
      success: true,
      message: `Helper ${targetHelper.helperDisplayName} selected by receiver.`,
      selectedHelperId: helperId,
      status: 'HELPER_SELECTED',
      helper: targetHelper,
    });
  } catch (err) {
    console.error("Selection error:", err);
    return res.status(500).json({ error: "Internal server error during selection." });
  } finally {
    release();
  }
});

// 4. Selected Helper Confirms (Provide Help)
app.post("/api/requests/:requestId/helper-confirm", async (req, res) => {
  const { requestId } = req.params;
  const lock = getLock(requestId);
  const release = await lock.acquire();

  try {
    const state = getOrCreateRequestState(requestId);
    const { helperId } = req.body;

    const targetHelper = state.acceptances.find(
      (a) => a.matchingRound === state.matchingRound && a.helperId === helperId && a.isSelected
    );
    if (!targetHelper) {
      return res.status(404).json({ error: "Selected helper not found." });
    }

    targetHelper.acceptanceStatus = 'CONFIRMED';
    state.status = 'CONFIRMED';

    return res.json({
      success: true,
      message: "Helper confirmed assistance.",
      status: 'CONFIRMED',
      helper: targetHelper,
    });
  } finally {
    release();
  }
});

// 5. Selected Helper Rejects ("I CANNOT COME" -> Automatic Backup Trigger or Reopening)
app.post("/api/requests/:requestId/helper-reject", async (req, res) => {
  const { requestId } = req.params;
  const lock = getLock(requestId);
  const release = await lock.acquire();

  try {
    const state = getOrCreateRequestState(requestId);
    const { helperId, rejectionReason = "No longer available" } = req.body;

    const targetHelper = state.acceptances.find(
      (a) => a.matchingRound === state.matchingRound && a.helperId === helperId
    );
    if (!targetHelper) {
      return res.status(404).json({ error: "Helper not found." });
    }

    // Update rejected helper record
    targetHelper.acceptanceStatus = 'UNAVAILABLE';
    targetHelper.isSelected = false;
    targetHelper.rejectedAt = new Date().toISOString();
    targetHelper.rejectionReason = rejectionReason;

    state.selectedHelperId = null;

    // Check remaining available helpers in this matching round
    const remainingHelpers = state.acceptances.filter(
      (a) => a.matchingRound === state.matchingRound && !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
    );

    if (remainingHelpers.length > 0) {
      // RULE 5 & 6: Backup helpers are immediately ready for selection
      state.status = 'BACKUP_SELECTION_REQUIRED';
      return res.json({
        success: true,
        reopened: false,
        message: "Your selected helper is unable to come. Don't worry! Other helpers are still available.",
        remainingHelpers,
        remainingCount: remainingHelpers.length,
        status: 'BACKUP_SELECTION_REQUIRED',
        rejectedHelper: targetHelper,
      });
    } else {
      // RULE 7: If all three become unavailable, reopen original request and start new matching round!
      state.matchingRound += 1;
      state.acceptanceClosed = false;
      state.status = 'REOPENED';
      state.reopenedAt = new Date().toISOString();

      return res.json({
        success: true,
        reopened: true,
        newMatchingRound: state.matchingRound,
        acceptedCount: 0,
        remainingSlots: 3,
        status: 'REOPENED',
        message: "All 3 helpers became unavailable. Request reopened for matching round " + state.matchingRound,
        rejectedHelper: targetHelper,
      });
    }
  } finally {
    release();
  }
});

// 6. Concurrency Test Endpoint (Simulates two simultaneous acceptances racing for final slot - Test 15)
app.post("/api/requests/:requestId/test-concurrency", async (req, res) => {
  const { requestId } = req.params;
  const state = getOrCreateRequestState(requestId);
  // Test 15: Concurrency race condition validation
  // Ensure request has exactly 2 existing active helpers so Helper A and B race for the final 3rd slot
  const currentActive = () =>
    state.acceptances.filter(
      (a) =>
        a.matchingRound === state.matchingRound &&
        !['UNAVAILABLE', 'REJECTED'].includes(a.acceptanceStatus)
    );

  // If request has 3 or is closed, reset to round 1 with 2 seed helpers
  if (currentActive().length >= 3 || state.acceptanceClosed) {
    state.acceptances = [];
    state.acceptanceClosed = false;
    state.status = 'OPEN';
  }

  while (currentActive().length < 2) {
    const idx = currentActive().length + 1;
    state.acceptances.push({
      id: `acc_seed_${Date.now()}_${idx}`,
      acceptanceId: `ACC-SEED-${idx}`,
      requestId,
      helperId: `seed_helper_${idx}`,
      helperDisplayName: `Existing Helper ${idx}`,
      helperVerified: true,
      acceptanceStatus: 'ACCEPTED',
      acceptedAt: new Date(Date.now() - 60000 * (3 - idx)).toISOString(),
      approximateDistance: 1.2 + idx * 0.4,
      estimatedArrival: 8 + idx * 2,
      isSelected: false,
      matchingRound: state.matchingRound,
      currentAvailability: 'Available Now',
      previousHelpCount: 10,
      rating: 4.9,
      reviewsCount: 12,
    });
  }
  state.status = 'TWO_HELPERS_ACCEPTED';
  state.acceptanceClosed = false;

  // Helper 4 and Helper 5 attempt concurrent acceptance
  const helperA = {
    helperId: `concurrent_user_A_${Date.now()}`,
    helperDisplayName: "Concurrent Helper A",
    helperVerified: true,
    approximateDistance: 1.5,
    estimatedArrival: 10,
  };
  const helperB = {
    helperId: `concurrent_user_B_${Date.now()}`,
    helperDisplayName: "Concurrent Helper B",
    helperVerified: true,
    approximateDistance: 1.8,
    estimatedArrival: 12,
  };

  // Launch both requests simultaneously
  const acceptFn = async (h: typeof helperA) => {
    const lock = getLock(requestId);
    const release = await lock.acquire();
    try {
      const active = state.acceptances.filter(
        (a) => a.matchingRound === state.matchingRound && !['UNAVAILABLE', 'REJECTED'].includes(a.acceptanceStatus)
      );
      if (active.length >= 3 || state.acceptanceClosed) {
        return { success: false, helper: h.helperDisplayName, error: "409 Conflict: Limit reached (3/3)" };
      }
      const record: ServerAcceptanceRecord = {
        id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        acceptanceId: `ACC-TEST-${Date.now().toString(36).toUpperCase()}`,
        requestId,
        helperId: h.helperId,
        helperDisplayName: h.helperDisplayName,
        helperVerified: h.helperVerified,
        acceptanceStatus: 'ACCEPTED',
        acceptedAt: new Date().toISOString(),
        approximateDistance: h.approximateDistance,
        estimatedArrival: h.estimatedArrival,
        isSelected: false,
        matchingRound: state.matchingRound,
        currentAvailability: "Available Now",
        previousHelpCount: 15,
        rating: 5.0,
        reviewsCount: 20,
      };
      state.acceptances.push(record);
      if (active.length + 1 >= 3) {
        state.acceptanceClosed = true;
        state.status = 'THREE_HELPERS_FOUND';
      }
      return { success: true, helper: h.helperDisplayName, acceptedCount: active.length + 1 };
    } finally {
      release();
    }
  };

  const [resA, resB] = await Promise.all([acceptFn(helperA), acceptFn(helperB)]);
  const succeeded = [resA, resB].filter((r) => r.success);
  const blocked = [resA, resB].filter((r) => !r.success);

  res.json({
    testName: "TEST 15: Concurrency Race Condition Validation",
    totalAttempts: 2,
    successCount: succeeded.length,
    blockedCount: blocked.length,
    results: { attemptA: resA, attemptB: resB },
    finalStatus: state.status,
    acceptanceClosed: state.acceptanceClosed,
    verdict: succeeded.length <= 1
      ? "PASSED: Atomic locking strictly prevented slot overflow."
      : "FAILED: Multiple acceptances slipped through.",
  });
});

// ==================================================
// SMART BLOOD DONOR MATCHING & BROADCAST ENGINE
// ==================================================

type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

const SERVER_COMPATIBLE_DONORS: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'O+', 'A-', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'O+', 'B-', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'O+', 'A+', 'B+', 'AB-', 'O-', 'A-', 'B-'],
};

interface ServerDonorInput {
  uid: string;
  displayName: string;
  photoUrl?: string;
  bloodGroup: string;
  bloodGroupVerified?: boolean;
  accountStatus?: string;
  isAvailable?: boolean;
  city?: string;
  approximateArea?: string;
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
  notifyInApp?: boolean;
  notifyPush?: boolean;
  notifyEmail?: boolean;
  notifySms?: boolean;
  notificationsOptOut?: boolean;
  lastDonationDate?: string | null;
  totalDonations?: number;
}

interface BloodDispatchRecord {
  bloodRequestId: string;
  donorId: string;
  donorDisplayName: string;
  channels: string[];
  dispatchedAt: string;
  type: 'MATCH_BROADCAST' | 'REQUEST_FULFILLED_CLOSURE';
}

const dispatchedBloodNotifications = new Set<string>();
const bloodDispatchLedger = new Map<string, BloodDispatchRecord[]>();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

app.post("/api/blood/match-and-broadcast", async (req, res) => {
  const {
    bloodRequestId,
    requesterId,
    requiredBloodGroup,
    allowCompatibleGroups = true,
    city = '',
    latitude = 13.0827,
    longitude = 80.2707,
    donors = [],
  } = req.body as {
    bloodRequestId?: string;
    requesterId?: string;
    requiredBloodGroup?: BloodGroup;
    allowCompatibleGroups?: boolean;
    city?: string;
    latitude?: number;
    longitude?: number;
    donors?: ServerDonorInput[];
  };

  if (!bloodRequestId || !requesterId || !requiredBloodGroup || !(requiredBloodGroup in SERVER_COMPATIBLE_DONORS)) {
    return res.status(400).json({ error: "Valid bloodRequestId, requesterId, and requiredBloodGroup are required." });
  }

  const lock = getLock(`blood_${bloodRequestId}`);
  const release = await lock.acquire();

  try {
    const allowedGroups = allowCompatibleGroups
      ? SERVER_COMPATIBLE_DONORS[requiredBloodGroup]
      : [requiredBloodGroup];
    const reqCityLower = city.trim().toLowerCase();

    const matched: Array<{
      donorId: string;
      donorDisplayName: string;
      donorPhotoUrl?: string;
      donorBloodGroup: BloodGroup;
      donorVerified: boolean;
      donorCity: string;
      distanceKm: number;
      compatibilityType: 'EXACT' | 'COMPATIBLE';
      matchScore: number;
      notificationChannels: string[];
      deduplicatedSkip: boolean;
    }> = [];

    const ledger = bloodDispatchLedger.get(bloodRequestId) || [];
    const channelTotals = { in_app: 0, push: 0, email: 0, sms: 0 };

    for (const donor of donors) {
      if (!donor.uid || donor.uid === requesterId) continue;
      if (donor.accountStatus !== 'ACTIVE') continue;
      if (!donor.isAvailable) continue;
      if (donor.notificationsOptOut) continue;
      if (!donor.bloodGroup || !allowedGroups.includes(donor.bloodGroup as BloodGroup)) continue;

      if (donor.lastDonationDate) {
        const dt = new Date(donor.lastDonationDate);
        if (!Number.isNaN(dt.getTime())) {
          const days = Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
          if (days < 56) continue;
        }
      }

      const channels: string[] = [];
      if (donor.notifyInApp !== false) channels.push('in_app');
      if (donor.notifyPush) channels.push('push');
      if (donor.notifyEmail) channels.push('email');
      if (donor.notifySms) channels.push('sms');
      if (channels.length === 0) continue;

      const dLat = typeof donor.latitude === 'number' ? donor.latitude : latitude;
      const dLng = typeof donor.longitude === 'number' ? donor.longitude : longitude;
      const distanceKm = haversineKm(latitude, longitude, dLat, dLng);
      const donorCity = donor.city || donor.approximateArea || '';
      const sameCity =
        Boolean(reqCityLower) &&
        (donorCity.toLowerCase().includes(reqCityLower) || reqCityLower.includes(donorCity.toLowerCase()));
      const maxDist = donor.maxDistanceKm && donor.maxDistanceKm > 0 ? donor.maxDistanceKm : 25;

      if (!sameCity && distanceKm > maxDist) continue;

      const dedupKey = `${bloodRequestId}_${donor.uid}`;
      const alreadySent = dispatchedBloodNotifications.has(dedupKey);
      if (!alreadySent) {
        dispatchedBloodNotifications.add(dedupKey);
        ledger.push({
          bloodRequestId,
          donorId: donor.uid,
          donorDisplayName: donor.displayName,
          channels,
          dispatchedAt: new Date().toISOString(),
          type: 'MATCH_BROADCAST',
        });
        channels.forEach((ch) => {
          if (ch in channelTotals) {
            channelTotals[ch as keyof typeof channelTotals] += 1;
          }
        });
      }

      const compatibilityType: 'EXACT' | 'COMPATIBLE' =
        donor.bloodGroup === requiredBloodGroup ? 'EXACT' : 'COMPATIBLE';
      let matchScore = compatibilityType === 'EXACT' ? 100 : 75;
      if (sameCity) matchScore += 20;
      matchScore += Math.max(0, 25 - Math.min(25, Math.round(distanceKm)));
      if (donor.bloodGroupVerified) matchScore += 15;
      matchScore += Math.min(10, donor.totalDonations || 0);

      matched.push({
        donorId: donor.uid,
        donorDisplayName: donor.displayName,
        donorPhotoUrl: donor.photoUrl,
        donorBloodGroup: donor.bloodGroup as BloodGroup,
        donorVerified: Boolean(donor.bloodGroupVerified),
        donorCity: donorCity || 'Nearby Area',
        distanceKm: sameCity && distanceKm > maxDist ? Math.min(distanceKm, 12.0) : distanceKm,
        compatibilityType,
        matchScore,
        notificationChannels: channels,
        deduplicatedSkip: alreadySent,
      });
    }

    bloodDispatchLedger.set(bloodRequestId, ledger);
    matched.sort((a, b) => b.matchScore - a.matchScore);

    return res.json({
      success: true,
      bloodRequestId,
      requiredBloodGroup,
      matchedDonorsCount: matched.length,
      notificationsSentCount: matched.filter((m) => !m.deduplicatedSkip).length,
      channelBreakdown: channelTotals,
      matches: matched,
    });
  } finally {
    release();
  }
});

app.get("/api/blood/requests/:bloodRequestId/dispatch-summary", (req, res) => {
  const { bloodRequestId } = req.params;
  const records = bloodDispatchLedger.get(bloodRequestId) || [];
  res.json({
    bloodRequestId,
    totalDispatched: records.length,
    records,
  });
});

app.post("/api/blood/requests/:bloodRequestId/notify-closure", (req, res) => {
  const { bloodRequestId } = req.params;
  const { closedDonorIds = [] } = req.body as { closedDonorIds?: string[] };
  const ledger = bloodDispatchLedger.get(bloodRequestId) || [];
  closedDonorIds.forEach((donorId) => {
    const key = `${bloodRequestId}_closed_${donorId}`;
    if (!dispatchedBloodNotifications.has(key)) {
      dispatchedBloodNotifications.add(key);
      ledger.push({
        bloodRequestId,
        donorId,
        donorDisplayName: 'Matched Donor',
        channels: ['in_app'],
        dispatchedAt: new Date().toISOString(),
        type: 'REQUEST_FULFILLED_CLOSURE',
      });
    }
  });
  bloodDispatchLedger.set(bloodRequestId, ledger);
  res.json({ success: true, notifiedCount: closedDonorIds.length });
});

// ==================================================
// SMART FOOD RESCUE: ATOMIC QUANTITY LOCK & RAZORPAY TEST VERIFICATION
// ==================================================

interface ServerFoodReservationLedger {
  donationId: string;
  remainingQuantity: number;
  reservations: Array<{ requestId: string; receiverId: string; qty: number; reservedAt: string }>;
}

const foodQuantityLedgers = new Map<string, ServerFoodReservationLedger>();

app.post("/api/food/reserve-quantity", async (req, res) => {
  const {
    donationId,
    requestId,
    receiverId,
    requestedQuantity,
    currentAvailableQuantity,
  } = req.body as {
    donationId?: string;
    requestId?: string;
    receiverId?: string;
    requestedQuantity?: number;
    currentAvailableQuantity?: number;
  };

  if (!donationId || !requestId || !receiverId || typeof requestedQuantity !== 'number' || requestedQuantity <= 0) {
    return res.status(400).json({ error: "Valid donationId, requestId, receiverId, and positive requestedQuantity are required." });
  }

  const lock = getLock(`food_${donationId}`);
  const release = await lock.acquire();

  try {
    let ledger = foodQuantityLedgers.get(donationId);
    if (!ledger) {
      ledger = {
        donationId,
        remainingQuantity: typeof currentAvailableQuantity === 'number' ? currentAvailableQuantity : requestedQuantity,
        reservations: [],
      };
      foodQuantityLedgers.set(donationId, ledger);
    } else if (
      typeof currentAvailableQuantity === 'number' &&
      ledger.reservations.length === 0
    ) {
      ledger.remainingQuantity = currentAvailableQuantity;
    }

    if (ledger.reservations.some((r) => r.requestId === requestId)) {
      return res.status(409).json({ error: "This food collection request has already been accepted and reserved." });
    }

    const effectiveAvailable =
      typeof currentAvailableQuantity === 'number'
        ? Math.min(currentAvailableQuantity, ledger.remainingQuantity)
        : ledger.remainingQuantity;

    if (requestedQuantity > effectiveAvailable) {
      return res.status(409).json({
        error: `Insufficient food quantity available (${effectiveAvailable} remaining, requested ${requestedQuantity}).`,
        remainingQuantity: effectiveAvailable,
      });
    }

    const nextRemaining = Math.max(0, effectiveAvailable - requestedQuantity);
    ledger.remainingQuantity = nextRemaining;
    ledger.reservations.push({
      requestId,
      receiverId,
      qty: requestedQuantity,
      reservedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      donationId,
      requestId,
      reservedQuantity: requestedQuantity,
      remainingQuantity: nextRemaining,
      closed: nextRemaining === 0,
    });
  } finally {
    release();
  }
});

interface RazorpayOrderRecord {
  orderId: string;
  amount: number;
  amountPaise: number;
  currency: 'INR';
  targetType: 'ASSISTANCE_REQUEST' | 'HOMEAGE' | 'GENERAL_FUND';
  homeageId?: string;
  assistanceId: string;
  assistanceTitle: string;
  donorId: string;
  donorName: string;
  isAnonymous: boolean;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking';
  status: 'CREATED' | 'PAID';
  createdAt: string;
}

const razorpayTestOrders = new Map<string, RazorpayOrderRecord>();
const TEST_HMAC_SECRET = process.env.RAZORPAY_KEY_SECRET || 'helpconnect_rzp_test_hmac_key';

app.post("/api/payments/razorpay/create-order", async (req, res) => {
  try {
    const {
      amount,
      targetType = 'ASSISTANCE_REQUEST',
      homeageId,
      assistanceId = 'general_food_fund',
      assistanceTitle = 'Food Rescue Community Fund',
      donorId,
      donorName = 'Community Supporter',
      isAnonymous = false,
      paymentMethod = 'UPI',
    } = req.body as {
      amount?: number;
      targetType?: 'ASSISTANCE_REQUEST' | 'HOMEAGE' | 'GENERAL_FUND';
      homeageId?: string;
      assistanceId?: string;
      assistanceTitle?: string;
      donorId?: string;
      donorName?: string;
      isAnonymous?: boolean;
      paymentMethod?: 'UPI' | 'Card' | 'NetBanking';
    };

    if (!donorId || typeof amount !== 'number' || Number.isNaN(amount) || amount < 10 || amount > 500000) {
      return res.status(400).json({ error: "Please enter a valid contribution amount between ₹10 and ₹5,00,000." });
    }

    const amountPaise = Math.round(amount * 100);
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_helpconnect_sandbox';
    let orderId = `order_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && !process.env.RAZORPAY_KEY_ID.includes('placeholder')) {
      try {
        const authToken = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: { targetType, homeageId: homeageId || '', assistanceId, donorId },
          }),
        });
        if (rzpRes.ok) {
          const rzpJson = await rzpRes.json() as { id?: string };
          if (rzpJson.id) orderId = rzpJson.id;
        }
      } catch (rzpErr) {
        console.warn('Razorpay API fallback to signed local test order:', rzpErr);
      }
    }

    const record: RazorpayOrderRecord = {
      orderId,
      amount,
      amountPaise,
      currency: 'INR',
      targetType,
      homeageId,
      assistanceId,
      assistanceTitle,
      donorId,
      donorName: isAnonymous ? 'Anonymous Kind Soul' : donorName,
      isAnonymous: Boolean(isAnonymous),
      paymentMethod,
      status: 'CREATED',
      createdAt: new Date().toISOString(),
    };
    razorpayTestOrders.set(orderId, record);

    const paymentId = `pay_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const expectedSignature = crypto
      .createHmac('sha256', TEST_HMAC_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return res.status(201).json({
      success: true,
      providerMode: 'RAZORPAY_TEST',
      keyId,
      orderId,
      amount: record.amount,
      amountPaise,
      currency: 'INR',
      suggestedTestPaymentId: paymentId,
      testCheckoutSignature: expectedSignature,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Unable to initialize payment order.' });
  }
});

app.post("/api/payments/razorpay/verify", (req, res) => {
  const { orderId, paymentId, signature } = req.body as {
    orderId?: string;
    paymentId?: string;
    signature?: string;
  };

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: "orderId, paymentId, and signature are required for verification." });
  }

  const order = razorpayTestOrders.get(orderId);
  if (!order) {
    return res.status(404).json({ error: "Payment order not found or expired." });
  }

  const expectedSignature = crypto
    .createHmac('sha256', TEST_HMAC_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const sigBufA = Buffer.from(signature, 'utf8');
  const sigBufB = Buffer.from(expectedSignature, 'utf8');
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return res.status(400).json({ error: "Payment signature verification failed. Transaction was not marked successful." });
  }

  order.status = 'PAID';
  const receiptNumber = `RCPT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  return res.json({
    verified: true,
    providerMode: 'RAZORPAY_TEST',
    orderId,
    razorpayPaymentId: paymentId,
    receiptNumber,
    amount: order.amount,
    currency: order.currency,
    targetType: order.targetType,
    homeageId: order.homeageId,
    assistanceId: order.assistanceId,
    assistanceTitle: order.assistanceTitle,
    donorId: order.donorId,
    donorName: order.donorName,
    isAnonymous: order.isAnonymous,
    paymentMethod: order.paymentMethod,
    verifiedAt: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
