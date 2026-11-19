import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleAuthProvider, secondaryAuth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  generateProofId,
  generateRequestId,
  generateVerificationToken,
  toPrivacySafeName,
} from '../lib/statusHelpers';
import {
  generateBloodRequestId,
  matchEligibleBloodDonors,
  resolveCoordinatesFromLocation,
} from '../lib/bloodMatching';
import {
  generateFoodAssistanceId,
  generateFoodCertificateId,
  generateFoodCollectionRequestId,
  generateFoodDonationId,
  isDeadlineExpired,
} from '../lib/foodHelpers';
import {
  BookAppointmentInput,
  CreateFoodAssistanceInput,
  CreateFoodCollectionRequestInput,
  CreateFoodDonationInput,
  CreateHomeageAccountInput,
  CreateHospitalAccountInput,
  HomeageAssistanceUpdateInput,
  HospitalBloodUpdateInput,
  InitiateMoneyDonationInput,
  mapDocToDoctorAppointment,
  mapDocToDoctorProfile,
  mapDocToFoodAssistanceRequest,
  mapDocToFoodCertificate,
  mapDocToFoodCollectionRequest,
  mapDocToFoodContribution,
  mapDocToFoodDonation,
  mapDocToHomeageOrg,
  mapDocToHomeageUser,
  mapDocToHospitalOrg,
  mapDocToHospitalUser,
  mapDocToMoneyDonation,
  mapDocToVolunteerRegistration,
  OfferFoodContributionInput,
  SaveDoctorInput,
} from '../lib/portalMappers';
import {
  AppNotification,
  AppointmentStatus,
  AuditLogEntry,
  BloodDonationHistoryRecord,
  BloodDonorMatch,
  BloodEmergencyLevel,
  BloodGroup,
  BloodRequest,
  BloodRequestPrivateContact,
  ChatMessage,
  ChatMessageType,
  CompletionSubmission,
  DigitalProof,
  DoctorAppointment,
  DoctorProfile,
  DonationRecord,
  DonorProfile,
  FoodAssistancePrivateContact,
  FoodAssistanceRequest,
  FoodCollectionRequest,
  FoodContribution,
  FoodDonation,
  FoodDonationCertificate,
  FoodDonationPrivateContact,
  FoodVolunteerRole,
  HelpConfirmation,
  HelpIssue,
  HelpRequest,
  HomeageOrganization,
  HomeageUserAccount,
  HospitalBloodStatus,
  HospitalOrganization,
  HospitalUserAccount,
  ImpactStats,
  IssueStatus,
  MoneyDonation,
  OrganizationStatus,
  PaymentMethod,
  PortalRole,
  ProofStatus,
  RequestCategory,
  RequestStatus,
  RequestUrgency,
  User,
  VolunteerRegistration,
  HelperAcceptance,
} from '../types';
import { globalImpact, sampleOpenRequests, sampleAcceptances } from '../data/mockData';
import {
  DEMO_APPOINTMENTS,
  DEMO_BLOOD_HISTORY,
  DEMO_BLOOD_MATCHES,
  DEMO_BLOOD_NOTIFICATIONS,
  DEMO_BLOOD_REQUESTS,
  DEMO_DOCTORS,
  DEMO_DONOR_PROFILES,
  DEMO_FOOD_ASSISTANCE,
  DEMO_FOOD_DONATIONS,
  DEMO_FOOD_NOTIFICATIONS,
  DEMO_HOMEAGE_ACCOUNT,
  DEMO_HOMEAGE_ORGS,
  DEMO_HOSPITAL_ACCOUNT,
  DEMO_HOSPITAL_ORGS,
  DEMO_MONEY_DONATIONS,
  DEMO_VOLUNTEERS,
} from '../data/demoPortalData';

const ADMIN_EMAIL = 'ziamizan001@gmail.com';

function tsToIso(val: unknown): string {
  if (!val) return '';
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const s = (val as { seconds: number }).seconds;
    return new Date(s * 1000).toISOString();
  }
  return '';
}

function mapDocToRequest(id: string, d: Record<string, unknown>): HelpRequest {
  return {
    id,
    requestId: String(d.requestId || id),
    requesterId: String(d.requesterId || ''),
    requesterName: String(d.requesterDisplayName || 'Community Member'),
    requesterVerified: true,
    helperId: (d.helperId as string | null) ?? null,
    helperDisplayName: (d.helperDisplayName as string | null) ?? null,
    helperVerified: Boolean(d.helperVerified),
    title: String(d.title || d.description || 'Community Assistance'),
    category: (d.category as RequestCategory) || 'Other',
    description: String(d.description || ''),
    location: String(d.location || 'Community Area'),
    distance: 'Nearby',
    time: (d.urgency as RequestUrgency) || 'Normal',
    status: (d.status as RequestStatus) || 'REQUESTED',
    bloodGroup: typeof d.bloodGroup === 'string' ? d.bloodGroup : undefined,
    units: typeof d.units === 'number' ? d.units : undefined,
    amountNeeded: typeof d.amountNeeded === 'number' ? d.amountNeeded : undefined,
    amountCollected: typeof d.amountCollected === 'number' ? d.amountCollected : undefined,
    createdAt: tsToIso(d.createdAt) || new Date().toISOString(),
    acceptedAt: tsToIso(d.acceptedAt) || null,
    journeyStartedAt: tsToIso(d.journeyStartedAt) || null,
    arrivedAt: tsToIso(d.arrivedAt) || null,
    assistanceStartedAt: tsToIso(d.assistanceStartedAt) || null,
    completedAt: tsToIso(d.completedAt) || null,
    confirmedAt: tsToIso(d.confirmedAt) || null,
    cancellationReason: typeof d.cancellationReason === 'string' ? d.cancellationReason : undefined,
    updatedAt: tsToIso(d.updatedAt) || undefined,
    acceptedCount: typeof d.acceptedCount === 'number' ? d.acceptedCount : undefined,
    remainingSlots: typeof d.remainingSlots === 'number' ? d.remainingSlots : undefined,
    matchingRound: typeof d.matchingRound === 'number' ? d.matchingRound : 1,
    selectedHelperId: (d.selectedHelperId as string | null) ?? null,
    acceptanceClosed: Boolean(d.acceptanceClosed),
    reopenedAt: tsToIso(d.reopenedAt) || null,
  };
}

function mapDocToAcceptance(id: string, d: Record<string, unknown>): HelperAcceptance {
  return {
    id,
    acceptanceId: String(d.acceptanceId || id),
    requestId: String(d.requestId || ''),
    helperId: String(d.helperId || ''),
    helperDisplayName: String(d.helperDisplayName || 'Community Helper'),
    helperPhotoUrl: typeof d.helperPhotoUrl === 'string' ? d.helperPhotoUrl : undefined,
    helperVerified: Boolean(d.helperVerified),
    helperBloodGroup: typeof d.helperBloodGroup === 'string' ? d.helperBloodGroup : undefined,
    acceptanceStatus: (d.acceptanceStatus as HelperAcceptance['acceptanceStatus']) || 'ACCEPTED',
    acceptedAt: tsToIso(d.acceptedAt) || new Date().toISOString(),
    selectedAt: tsToIso(d.selectedAt) || null,
    rejectedAt: tsToIso(d.rejectedAt) || null,
    rejectionReason: typeof d.rejectionReason === 'string' ? d.rejectionReason : undefined,
    approximateDistance: typeof d.approximateDistance === 'number' ? d.approximateDistance : 1.8,
    estimatedArrival: typeof d.estimatedArrival === 'number' ? d.estimatedArrival : 10,
    isSelected: Boolean(d.isSelected),
    matchingRound: typeof d.matchingRound === 'number' ? d.matchingRound : 1,
    currentAvailability: typeof d.currentAvailability === 'string' ? d.currentAvailability : 'Available Now',
    helpCategory: typeof d.helpCategory === 'string' ? d.helpCategory : undefined,
    previousHelpCount: typeof d.previousHelpCount === 'number' ? d.previousHelpCount : 12,
    rating: typeof d.rating === 'number' ? d.rating : 4.9,
    reviewsCount: typeof d.reviewsCount === 'number' ? d.reviewsCount : 15,
    feedback: typeof d.feedback === 'string' ? d.feedback : undefined,
    locationSharing: typeof d.locationSharing === 'boolean' ? d.locationSharing : true,
    latitude: typeof d.latitude === 'number' ? d.latitude : undefined,
    longitude: typeof d.longitude === 'number' ? d.longitude : undefined,
    lastLocationUpdate: tsToIso(d.lastLocationUpdate) || undefined,
  };
}

function mapDocToProof(id: string, d: Record<string, unknown>): DigitalProof {
  return {
    id,
    proofId: String(d.proofId || id),
    requestId: String(d.requestId || ''),
    requesterId: String(d.requesterId || ''),
    helperId: String(d.helperId || ''),
    requestTitle: String(d.requestTitle || ''),
    category: (d.category as RequestCategory) || 'Other',
    requesterDisplayName: String(d.requesterDisplayName || 'Community Member'),
    helperDisplayName: String(d.helperDisplayName || 'Verified Community Member'),
    verificationToken: String(d.verificationToken || ''),
    proofStatus: (d.proofStatus as ProofStatus) || 'VALID',
    optionalFeedback: typeof d.optionalFeedback === 'string' ? d.optionalFeedback : undefined,
    rating: typeof d.rating === 'number' ? d.rating : undefined,
    completedAt: tsToIso(d.completedAt) || undefined,
    confirmedAt: tsToIso(d.confirmedAt) || undefined,
    generatedAt: tsToIso(d.generatedAt) || new Date().toISOString(),
  };
}

function mapDocToSubmission(id: string, d: Record<string, unknown>): CompletionSubmission {
  return {
    id,
    requestId: String(d.requestId || ''),
    requesterId: String(d.requesterId || ''),
    helperId: String(d.helperId || ''),
    completionDescription:
      typeof d.completionDescription === 'string' ? d.completionDescription : undefined,
    evidenceDataUrl: typeof d.evidenceDataUrl === 'string' ? d.evidenceDataUrl : undefined,
    evidenceFileName: typeof d.evidenceFileName === 'string' ? d.evidenceFileName : undefined,
    submittedAt: tsToIso(d.submittedAt) || new Date().toISOString(),
  };
}

function mapDocToConfirmation(id: string, d: Record<string, unknown>): HelpConfirmation {
  return {
    id,
    requestId: String(d.requestId || id),
    requesterId: String(d.requesterId || ''),
    helperId: String(d.helperId || ''),
    confirmationStatus: d.confirmationStatus as HelpConfirmation['confirmationStatus'],
    feedback: typeof d.feedback === 'string' ? d.feedback : undefined,
    rating: typeof d.rating === 'number' ? d.rating : undefined,
    appreciationMessage:
      typeof d.appreciationMessage === 'string' ? d.appreciationMessage : undefined,
    explanation: typeof d.explanation === 'string' ? d.explanation : undefined,
    confirmedAt: tsToIso(d.confirmedAt) || new Date().toISOString(),
  };
}

function mapDocToIssue(id: string, d: Record<string, unknown>): HelpIssue {
  return {
    id,
    requestId: String(d.requestId || ''),
    reportedBy: String(d.reportedBy || ''),
    requesterId: String(d.requesterId || ''),
    helperId: (d.helperId as string | null) ?? null,
    issueDescription: String(d.issueDescription || ''),
    issueStatus: (d.issueStatus as IssueStatus) || 'OPEN',
    adminNotes: typeof d.adminNotes === 'string' ? d.adminNotes : undefined,
    createdAt: tsToIso(d.createdAt) || new Date().toISOString(),
    resolvedAt: tsToIso(d.resolvedAt) || null,
  };
}

function mapDocToNotification(id: string, d: Record<string, unknown>): AppNotification {
  return {
    id,
    userId: String(d.userId || ''),
    actorId: String(d.actorId || ''),
    requestId: typeof d.requestId === 'string' ? d.requestId : undefined,
    bloodRequestId: typeof d.bloodRequestId === 'string' ? d.bloodRequestId : undefined,
    foodDonationId: typeof d.foodDonationId === 'string' ? d.foodDonationId : undefined,
    foodAssistanceId: typeof d.foodAssistanceId === 'string' ? d.foodAssistanceId : undefined,
    foodCertificateId: typeof d.foodCertificateId === 'string' ? d.foodCertificateId : undefined,
    proofId: typeof d.proofId === 'string' ? d.proofId : undefined,
    title: String(d.title || ''),
    message: String(d.message || ''),
    notificationType: d.notificationType as AppNotification['notificationType'],
    actionUrl: typeof d.actionUrl === 'string' ? d.actionUrl : undefined,
    deliveryChannels: Array.isArray(d.deliveryChannels) ? (d.deliveryChannels as string[]) : undefined,
    isRead: Boolean(d.isRead),
    createdAt: tsToIso(d.createdAt) || new Date().toISOString(),
  };
}

function mapDocToAudit(id: string, d: Record<string, unknown>): AuditLogEntry {
  return {
    id,
    actorId: String(d.actorId || ''),
    action: String(d.action || ''),
    entityType: String(d.entityType || ''),
    entityId: String(d.entityId || ''),
    previousStatus: String(d.previousStatus || ''),
    newStatus: String(d.newStatus || ''),
    details: typeof d.details === 'string' ? d.details : undefined,
    createdAt: tsToIso(d.createdAt) || new Date().toISOString(),
  };
}

function mapDocToChatMessage(id: string, d: Record<string, unknown>): ChatMessage {
  return {
    id,
    messageId: String(d.messageId || id),
    requestId: String(d.requestId || ''),
    recipientId: typeof d.recipientId === 'string' ? d.recipientId : undefined,
    senderId: String(d.senderId || ''),
    senderName: String(d.senderName || 'Community Member'),
    senderPhotoUrl: typeof d.senderPhotoUrl === 'string' ? d.senderPhotoUrl : undefined,
    text: String(d.text || ''),
    messageType: (d.messageType as ChatMessageType) || 'text',
    hospitalName: typeof d.hospitalName === 'string' ? d.hospitalName : undefined,
    hospitalAddress: typeof d.hospitalAddress === 'string' ? d.hospitalAddress : undefined,
    latitude: typeof d.latitude === 'number' ? d.latitude : undefined,
    longitude: typeof d.longitude === 'number' ? d.longitude : undefined,
    sharedContact: typeof d.sharedContact === 'string' ? d.sharedContact : undefined,
    readBy: Array.isArray(d.readBy) ? (d.readBy as string[]) : [],
    createdAt: tsToIso(d.createdAt) || new Date().toISOString(),
  };
}

function mapDocToDonorProfile(id: string, d: Record<string, unknown>): DonorProfile {
  return {
    id,
    uid: String(d.uid || id),
    displayName: String(d.displayName || 'Community Donor'),
    photoUrl: typeof d.photoUrl === 'string' ? d.photoUrl : undefined,
    bloodGroup: (typeof d.bloodGroup === 'string' ? d.bloodGroup : '') as BloodGroup | '',
    bloodGroupVerified: Boolean(d.bloodGroupVerified),
    accountStatus: d.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
    isAvailable: Boolean(d.isAvailable),
    city: String(d.city || ''),
    approximateArea: String(d.approximateArea || d.city || 'Community Area'),
    latitude: typeof d.latitude === 'number' ? d.latitude : 13.0827,
    longitude: typeof d.longitude === 'number' ? d.longitude : 80.2707,
    maxDistanceKm: typeof d.maxDistanceKm === 'number' ? d.maxDistanceKm : 25,
    notifyInApp: d.notifyInApp !== false,
    notifyPush: Boolean(d.notifyPush),
    notifyEmail: d.notifyEmail !== false,
    notifySms: Boolean(d.notifySms),
    notificationsOptOut: Boolean(d.notificationsOptOut),
    lastDonationDate: tsToIso(d.lastDonationDate) || null,
    totalDonations: typeof d.totalDonations === 'number' ? d.totalDonations : 0,
    updatedAt: tsToIso(d.updatedAt) || new Date().toISOString(),
  };
}

function mapDocToBloodRequest(id: string, d: Record<string, unknown>): BloodRequest {
  return {
    id,
    bloodRequestId: String(d.bloodRequestId || id),
    requesterId: String(d.requesterId || ''),
    requesterDisplayName: String(d.requesterDisplayName || 'Community Member'),
    patientDisplayName: String(d.patientDisplayName || 'Patient'),
    requiredBloodGroup: (d.requiredBloodGroup as BloodGroup) || 'O+',
    allowCompatibleGroups: d.allowCompatibleGroups !== false,
    requiredUnits: typeof d.requiredUnits === 'number' ? d.requiredUnits : 1,
    fulfilledUnits: typeof d.fulfilledUnits === 'number' ? d.fulfilledUnits : 0,
    confirmedUnits: typeof d.confirmedUnits === 'number' ? d.confirmedUnits : 0,
    hospitalName: String(d.hospitalName || ''),
    hospitalAddress: String(d.hospitalAddress || ''),
    city: String(d.city || ''),
    location: String(d.location || ''),
    latitude: typeof d.latitude === 'number' ? d.latitude : 13.0827,
    longitude: typeof d.longitude === 'number' ? d.longitude : 80.2707,
    requiredDateTime: String(d.requiredDateTime || ''),
    emergencyLevel: (d.emergencyLevel as BloodEmergencyLevel) || 'Normal',
    contactPersonName: String(d.contactPersonName || ''),
    additionalMedicalInfo: typeof d.additionalMedicalInfo === 'string' ? d.additionalMedicalInfo : undefined,
    status: (d.status as BloodRequest['status']) || 'REQUEST_SUBMITTED',
    matchedDonorsCount: typeof d.matchedDonorsCount === 'number' ? d.matchedDonorsCount : 0,
    notificationsSentCount: typeof d.notificationsSentCount === 'number' ? d.notificationsSentCount : 0,
    interestedDonorsCount: typeof d.interestedDonorsCount === 'number' ? d.interestedDonorsCount : 0,
    selectedDonorIds: Array.isArray(d.selectedDonorIds) ? (d.selectedDonorIds as string[]) : [],
    assignedHospitalId: typeof d.assignedHospitalId === 'string' ? d.assignedHospitalId : null,
    assignedHospitalName: typeof d.assignedHospitalName === 'string' ? d.assignedHospitalName : null,
    hospitalVerified: Boolean(d.hospitalVerified),
    hospitalStatus: (d.hospitalStatus as HospitalBloodStatus) || 'Submitted',
    hospitalNotes: typeof d.hospitalNotes === 'string' ? d.hospitalNotes : undefined,
    fulfilledAt: tsToIso(d.fulfilledAt) || null,
    cancellationReason: typeof d.cancellationReason === 'string' ? d.cancellationReason : null,
    createdAt: tsToIso(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIso(d.updatedAt) || new Date().toISOString(),
  };
}

function mapDocToBloodDonorMatch(id: string, d: Record<string, unknown>): BloodDonorMatch {
  return {
    id,
    matchId: String(d.matchId || id),
    bloodRequestId: String(d.bloodRequestId || ''),
    requesterId: String(d.requesterId || ''),
    donorId: String(d.donorId || ''),
    donorDisplayName: String(d.donorDisplayName || 'Registered Donor'),
    donorPhotoUrl: typeof d.donorPhotoUrl === 'string' ? d.donorPhotoUrl : undefined,
    donorBloodGroup: (d.donorBloodGroup as BloodGroup) || 'O+',
    donorVerified: Boolean(d.donorVerified),
    donorCity: String(d.donorCity || ''),
    donorArea: typeof d.donorArea === 'string' ? d.donorArea : undefined,
    donorPhone: typeof d.donorPhone === 'string' ? d.donorPhone : undefined,
    donorEmail: typeof d.donorEmail === 'string' ? d.donorEmail : undefined,
    donorNotes: typeof d.donorNotes === 'string' ? d.donorNotes : undefined,
    distanceKm: typeof d.distanceKm === 'number' ? d.distanceKm : 5,
    compatibilityType: d.compatibilityType === 'COMPATIBLE' ? 'COMPATIBLE' : 'EXACT',
    matchScore: typeof d.matchScore === 'number' ? d.matchScore : 100,
    notificationChannels: Array.isArray(d.notificationChannels) ? (d.notificationChannels as string[]) : ['in_app'],
    responseStatus: (d.responseStatus as BloodDonorMatch['responseStatus']) || 'NOTIFIED',
    rejectionReason: typeof d.rejectionReason === 'string' ? d.rejectionReason : null,
    scheduledDateTime: typeof d.scheduledDateTime === 'string' ? d.scheduledDateTime : null,
    contactSharedByDonor: Boolean(d.contactSharedByDonor),
    contactSharedByRequester: Boolean(d.contactSharedByRequester),
    donorConfirmedAvailable: Boolean(d.donorConfirmedAvailable),
    fulfilledUnitsCount: typeof d.fulfilledUnitsCount === 'number' ? d.fulfilledUnitsCount : 0,
    notifiedAt: tsToIso(d.notifiedAt) || new Date().toISOString(),
    respondedAt: tsToIso(d.respondedAt) || null,
    selectedAt: tsToIso(d.selectedAt) || null,
    completedAt: tsToIso(d.completedAt) || null,
    updatedAt: tsToIso(d.updatedAt) || new Date().toISOString(),
  };
}

function mapDocToDonationHistory(id: string, d: Record<string, unknown>): BloodDonationHistoryRecord {
  return {
    id,
    historyId: String(d.historyId || id),
    bloodRequestId: String(d.bloodRequestId || ''),
    requesterId: String(d.requesterId || ''),
    donorId: String(d.donorId || ''),
    donorDisplayName: String(d.donorDisplayName || ''),
    requesterDisplayName: String(d.requesterDisplayName || ''),
    hospitalName: String(d.hospitalName || ''),
    city: String(d.city || ''),
    bloodGroup: (d.bloodGroup as BloodGroup) || 'O+',
    unitsDonated: typeof d.unitsDonated === 'number' ? d.unitsDonated : 1,
    status: d.status === 'VERIFIED' ? 'VERIFIED' : 'COMPLETED',
    notes: typeof d.notes === 'string' ? d.notes : undefined,
    donatedAt: tsToIso(d.donatedAt) || new Date().toISOString(),
  };
}

export interface CreateBloodRequestInput {
  patientFullName: string;
  requiredBloodGroup: BloodGroup;
  allowCompatibleGroups: boolean;
  requiredUnits: number;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  location: string;
  latitude?: number;
  longitude?: number;
  requiredDateTime: string;
  emergencyLevel: BloodEmergencyLevel;
  contactPersonName: string;
  contactPhoneNumber: string;
  additionalMedicalInfo?: string;
}

export interface CreateBloodRequestResult {
  request: BloodRequest;
  matchedCount: number;
  notificationsSentCount: number;
  channelBreakdown: { in_app: number; push: number; email: number; sms: number };
}

export interface CreateRequestInput {
  title: string;
  category: RequestCategory;
  description: string;
  location: string;
  time: RequestUrgency;
  bloodGroup?: string;
  units?: number;
  amountNeeded?: number;
}

interface AppContextType {
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  awaitingRegistrationVerification: boolean;
  setAwaitingRegistrationVerification: (val: boolean) => void;
  isAdmin: boolean;
  isDemo: boolean;
  loadingData: boolean;
  user: User;
  impact: ImpactStats;
  requests: HelpRequest[];
  proofs: DigitalProof[];
  submissions: CompletionSubmission[];
  confirmations: HelpConfirmation[];
  issues: HelpIssue[];
  notifications: AppNotification[];
  auditLogs: AuditLogEntry[];
  donations: DonationRecord[];
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  loginAsDemo: () => void;
  loginAsDemoPortal: (role: PortalRole) => Promise<void>;
  loginAsDemoMultiRole: () => Promise<void>;
  addRequest: (request: CreateRequestInput) => Promise<HelpRequest>;
  acceptRequest: (requestId: string) => Promise<void>;
  startAssistance: (requestId: string) => Promise<void>;
  startJourney: (requestId: string) => Promise<void>;
  markArrived: (requestId: string) => Promise<void>;
  startAssistanceProgress: (requestId: string) => Promise<void>;
  cancelRequestWithReason: (requestId: string, reason: string) => Promise<void>;
  submitCompletion: (
    requestId: string,
    payload: {
      completionDescription?: string;
      evidenceDataUrl?: string;
      evidenceFileName?: string;
    }
  ) => Promise<void>;
  confirmAssistance: (
    requestId: string,
    payload: {
      rating?: number;
      feedback?: string;
      appreciationMessage?: string;
    }
  ) => Promise<DigitalProof>;
  markNotYetReceived: (requestId: string, explanation?: string) => Promise<void>;
  reportIssue: (requestId: string, issueDescription: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  adminUpdateIssue: (
    issueId: string,
    payload: {
      issueStatus: IssueStatus;
      adminNotes: string;
      nextRequestStatus?: RequestStatus;
    }
  ) => Promise<void>;
  adminUpdateProofStatus: (
    proofId: string,
    proofStatus: ProofStatus,
    reason?: string
  ) => Promise<void>;
  donateToRequest: (
    requestId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    note?: string
  ) => Promise<DonationRecord | null>;
  helperAcceptances: HelperAcceptance[];
  acceptRequestSlot: (
    requestId: string,
    helperData?: Partial<HelperAcceptance>
  ) => Promise<void>;
  selectHelper: (requestId: string, helperId: string) => Promise<void>;
  confirmProvideHelp: (requestId: string, helperId: string) => Promise<void>;
  rejectProvideHelp: (requestId: string, helperId: string, reason: string) => Promise<void>;
  reopenRequestRound: (requestId: string) => Promise<void>;
  runConcurrencyTest: (requestId: string) => Promise<{ successCount: number; blockedCount: number; message: string }>;
  messages: ChatMessage[];
  sendMessage: (requestId: string, text: string) => Promise<void>;
  // Smart Blood Donor Matching & Broadcast System
  donorProfiles: DonorProfile[];
  myDonorProfile: DonorProfile | null;
  bloodRequests: BloodRequest[];
  bloodDonorMatches: BloodDonorMatch[];
  bloodDonationHistory: BloodDonationHistoryRecord[];
  updateDonorProfile: (updates: Partial<DonorProfile>) => Promise<void>;
  createBloodRequest: (input: CreateBloodRequestInput) => Promise<CreateBloodRequestResult>;
  getBloodRequestPrivateContact: (bloodRequestId: string) => Promise<BloodRequestPrivateContact | null>;
  respondToBloodRequest: (
    bloodRequestId: string,
    action: 'INTERESTED' | 'REJECTED',
    rejectionReason?: string
  ) => Promise<void>;
  selectBloodDonor: (bloodRequestId: string, donorId: string) => Promise<void>;
  scheduleBloodDonation: (
    bloodRequestId: string,
    donorId: string,
    scheduledDateTime: string
  ) => Promise<void>;
  completeBloodDonationUnits: (
    bloodRequestId: string,
    donorId: string,
    unitsDonated: number,
    notes?: string
  ) => Promise<void>;
  cancelBloodRequest: (bloodRequestId: string, reason?: string) => Promise<void>;
  sendBloodChatMessage: (
    bloodRequestId: string,
    payload: {
      recipientId: string;
      text: string;
      messageType?: ChatMessageType;
      hospitalName?: string;
      hospitalAddress?: string;
      latitude?: number;
      longitude?: number;
      sharedContact?: string;
    }
  ) => Promise<void>;
  markChatMessagesRead: (requestId: string, partnerId?: string) => Promise<void>;
  pushPermission: NotificationPermission | 'unsupported';
  requestPushPermission: () => Promise<NotificationPermission | 'unsupported'>;
  // Multi-Portal RBAC State
  portalRole: PortalRole | null;
  availableRoles: PortalRole[];
  hasMultipleRoles: boolean;
  selectPortal: (role: PortalRole) => void;
  clearSelectedPortal: () => void;
  roleResolved: boolean;
  hospitalAccount: HospitalUserAccount | null;
  homeageAccount: HomeageUserAccount | null;
  hospitals: HospitalOrganization[];
  homeageOrganizations: HomeageOrganization[];
  doctors: DoctorProfile[];
  doctorAppointments: DoctorAppointment[];
  // Smart Food Donation & Homeage State
  foodDonations: FoodDonation[];
  foodCollectionRequests: FoodCollectionRequest[];
  foodAssistanceRequests: FoodAssistanceRequest[];
  foodContributions: FoodContribution[];
  moneyDonations: MoneyDonation[];
  volunteerRegistrations: VolunteerRegistration[];
  foodCertificates: FoodDonationCertificate[];
  // Admin Portal Actions
  adminCreateHospitalAccount: (input: CreateHospitalAccountInput) => Promise<HospitalOrganization>;
  adminUpdateHospital: (
    hospitalId: string,
    updates: Partial<HospitalOrganization> & { status?: OrganizationStatus }
  ) => Promise<void>;
  adminCreateHomeageAccount: (input: CreateHomeageAccountInput) => Promise<HomeageOrganization>;
  adminUpdateHomeage: (
    homeageId: string,
    updates: Partial<HomeageOrganization> & { status?: OrganizationStatus }
  ) => Promise<void>;
  // Portal Self-Registration Actions
  registerHospitalAccount: (input: CreateHospitalAccountInput) => Promise<HospitalOrganization>;
  registerHomeageAccount: (input: CreateHomeageAccountInput) => Promise<HomeageOrganization>;
  // Hospital Portal Actions
  hospitalUpdateBloodRequest: (
    bloodRequestId: string,
    updates: HospitalBloodUpdateInput
  ) => Promise<void>;
  hospitalSaveDoctor: (input: SaveDoctorInput) => Promise<DoctorProfile>;
  hospitalUpdateDoctorFlags: (
    doctorId: string,
    flags: { isAvailable?: boolean; isPublished?: boolean }
  ) => Promise<void>;
  hospitalUpdateAppointmentStatus: (
    appointmentId: string,
    status: AppointmentStatus
  ) => Promise<void>;
  bookDoctorAppointment: (input: BookAppointmentInput) => Promise<DoctorAppointment>;
  // Food Donation & Homeage Portal Actions
  createFoodDonation: (
    input: CreateFoodDonationInput
  ) => Promise<{ donation: FoodDonation; notifiedHomeagesCount: number }>;
  getFoodDonationPrivateContact: (
    donationId: string
  ) => Promise<FoodDonationPrivateContact | null>;
  submitFoodCollectionRequest: (
    input: CreateFoodCollectionRequestInput
  ) => Promise<FoodCollectionRequest>;
  homeageAcceptFoodDonation: (
    donationId: string,
    quantity: number,
    preferredCollectionTime?: string
  ) => Promise<FoodCollectionRequest>;
  respondFoodCollectionRequest: (
    requestId: string,
    action: 'Accepted' | 'Rejected',
    rejectionReason?: string
  ) => Promise<void>;
  markFoodReadyForPickup: (requestId: string) => Promise<void>;
  confirmFoodHandover: (requestId: string) => Promise<FoodDonationCertificate>;
  createFoodAssistanceRequest: (
    input: CreateFoodAssistanceInput
  ) => Promise<{ request: FoodAssistanceRequest; notifiedHomeagesCount: number }>;
  getFoodAssistancePrivateContact: (
    assistanceId: string
  ) => Promise<FoodAssistancePrivateContact | null>;
  homeageManageFoodAssistance: (
    assistanceId: string,
    updates: HomeageAssistanceUpdateInput
  ) => Promise<void>;
  offerFoodContribution: (input: OfferFoodContributionInput) => Promise<FoodContribution>;
  initiateAndVerifyMoneyDonation: (input: InitiateMoneyDonationInput) => Promise<MoneyDonation>;
  registerFoodVolunteer: (input: {
    volunteerName: string;
    mobile: string;
    city: string;
    role: FoodVolunteerRole;
    availability: string;
    assistanceId?: string;
  }) => Promise<VolunteerRegistration>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleResolved, setRoleResolved] = useState(false);
  const [awaitingRegistrationVerification, setAwaitingRegistrationVerification] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [hospitalAccount, setHospitalAccount] = useState<HospitalUserAccount | null>(null);
  const [homeageAccount, setHomeageAccount] = useState<HomeageUserAccount | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [userProfilePublic, setUserProfilePublic] = useState<Record<string, unknown> | null>(null);
  const [userProfilePrivate, setUserProfilePrivate] = useState<Record<string, unknown> | null>(null);

  const [openRequestsMap, setOpenRequestsMap] = useState<Record<string, HelpRequest>>({});
  const [myReqMap, setMyReqMap] = useState<Record<string, HelpRequest>>({});
  const [myHelpMap, setMyHelpMap] = useState<Record<string, HelpRequest>>({});
  const [adminReqMap, setAdminReqMap] = useState<Record<string, HelpRequest>>({});

  const [reqProofMap, setReqProofMap] = useState<Record<string, DigitalProof>>({});
  const [helpProofMap, setHelpProofMap] = useState<Record<string, DigitalProof>>({});
  const [adminProofMap, setAdminProofMap] = useState<Record<string, DigitalProof>>({});

  const [subHelperMap, setSubHelperMap] = useState<Record<string, CompletionSubmission>>({});
  const [subReqMap, setSubReqMap] = useState<Record<string, CompletionSubmission>>({});

  const [confReqMap, setConfReqMap] = useState<Record<string, HelpConfirmation>>({});
  const [confHelpMap, setConfHelpMap] = useState<Record<string, HelpConfirmation>>({});

  const [issueReportedMap, setIssueReportedMap] = useState<Record<string, HelpIssue>>({});
  const [issueReqMap, setIssueReqMap] = useState<Record<string, HelpIssue>>({});
  const [issueHelpMap, setIssueHelpMap] = useState<Record<string, HelpIssue>>({});
  const [adminIssueMap, setAdminIssueMap] = useState<Record<string, HelpIssue>>({});

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [impact, setImpact] = useState<ImpactStats>(globalImpact);
  const [sampleRequests, setSampleRequests] = useState<HelpRequest[]>(sampleOpenRequests);
  const [helperAcceptances, setHelperAcceptances] = useState<HelperAcceptance[]>(sampleAcceptances);

  // Blood Donor Matching & Broadcast state
  const [donorProfilesMap, setDonorProfilesMap] = useState<Record<string, DonorProfile>>({});
  const [myDonorProfileDoc, setMyDonorProfileDoc] = useState<DonorProfile | null>(null);
  const [bloodRequestsOpenMap, setBloodRequestsOpenMap] = useState<Record<string, BloodRequest>>({});
  const [myBloodRequestsMap, setMyBloodRequestsMap] = useState<Record<string, BloodRequest>>({});
  const [bloodMatchesDonorMap, setBloodMatchesDonorMap] = useState<Record<string, BloodDonorMatch>>({});
  const [bloodMatchesReqMap, setBloodMatchesReqMap] = useState<Record<string, BloodDonorMatch>>({});
  const [bloodHistoryDonorMap, setBloodHistoryDonorMap] = useState<Record<string, BloodDonationHistoryRecord>>({});
  const [bloodHistoryReqMap, setBloodHistoryReqMap] = useState<Record<string, BloodDonationHistoryRecord>>({});
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });

  // Multi-Portal & Food Donation State
  const [hospitalsMap, setHospitalsMap] = useState<Record<string, HospitalOrganization>>({});
  const [homeagesMap, setHomeagesMap] = useState<Record<string, HomeageOrganization>>({});
  const [doctorsMap, setDoctorsMap] = useState<Record<string, DoctorProfile>>({});
  const [appointmentsMap, setAppointmentsMap] = useState<Record<string, DoctorAppointment>>({});
  const [foodDonationsMap, setFoodDonationsMap] = useState<Record<string, FoodDonation>>({});
  const [foodCollectionReqMap, setFoodCollectionReqMap] = useState<Record<string, FoodCollectionRequest>>({});
  const [foodCollectionDonorMap, setFoodCollectionDonorMap] = useState<Record<string, FoodCollectionRequest>>({});
  const [foodAssistanceMap, setFoodAssistanceMap] = useState<Record<string, FoodAssistanceRequest>>({});
  const [foodContributionsMap, setFoodContributionsMap] = useState<Record<string, FoodContribution>>({});
  const [moneyDonationsMap, setMoneyDonationsMap] = useState<Record<string, MoneyDonation>>({});
  const [volunteersMap, setVolunteersMap] = useState<Record<string, VolunteerRegistration>>({});
  const [foodCertsDonorMap, setFoodCertsDonorMap] = useState<Record<string, FoodDonationCertificate>>({});
  const [foodCertsReceiverMap, setFoodCertsReceiverMap] = useState<Record<string, FoodDonationCertificate>>({});

  const [isDemo, setIsDemo] = useState<boolean>(() => {
    return localStorage.getItem('helpconnect_demo') === 'true';
  });

  const [demoMultiRole, setDemoMultiRole] = useState<boolean>(() => {
    return localStorage.getItem('helpconnect_demo_multi_role') === 'true';
  });

  const [demoPortalRole, setDemoPortalRole] = useState<PortalRole | null>(() => {
    const saved = localStorage.getItem('helpconnect_demo_role') as PortalRole | null;
    if (saved && ['USER', 'ADMIN', 'HOSPITAL', 'HOMEAGE'].includes(saved)) return saved;
    if (localStorage.getItem('helpconnect_demo_multi_role') === 'true') return null;
    return localStorage.getItem('helpconnect_demo') === 'true' ? 'USER' : null;
  });

  const [selectedPortal, setSelectedPortal] = useState<PortalRole | null>(() => {
    const saved = sessionStorage.getItem('helpconnect_active_portal') as PortalRole | null;
    if (saved && ['USER', 'ADMIN', 'HOSPITAL', 'HOMEAGE'].includes(saved)) return saved;
    return null;
  });

  const clearHospitalOnlyState = () => {
    setBloodRequestsOpenMap({});
    setMyBloodRequestsMap({});
    setBloodMatchesDonorMap({});
    setBloodMatchesReqMap({});
    setBloodHistoryDonorMap({});
    setBloodHistoryReqMap({});
    setDonorProfilesMap({});
    setMyDonorProfileDoc(null);
    setHospitalsMap({});
    setDoctorsMap({});
    setAppointmentsMap({});
  };

  const clearHomeageOnlyState = () => {
    setHomeagesMap({});
    setFoodDonationsMap({});
    setFoodCollectionReqMap({});
    setFoodCollectionDonorMap({});
    setFoodAssistanceMap({});
    setFoodContributionsMap({});
    setMoneyDonationsMap({});
    setVolunteersMap({});
    setFoodCertsDonorMap({});
    setFoodCertsReceiverMap({});
  };

  const applyDemoRoleData = (role: PortalRole | null) => {
    // Always wipe cross-role state first to guarantee ZERO Hospital/Homeage merging
    setIsAdminDoc(false);
    setHospitalAccount(null);
    setHomeageAccount(null);
    clearHospitalOnlyState();
    clearHomeageOnlyState();
    setNotifications([]);
    setMessages([]);

    if (!role) return;

    if (role === 'HOSPITAL') {
      // STRICTLY HOSPITAL ONLY: Blood Requests, Accepted Donors & Blood History — ZERO Homeage/Food/Doctors data
      setHospitalAccount(DEMO_HOSPITAL_ACCOUNT);
      setHospitalsMap({ 'HSP-DEMO-001': DEMO_HOSPITAL_ORGS['HSP-DEMO-001'] });
      setBloodRequestsOpenMap(DEMO_BLOOD_REQUESTS);
      setBloodMatchesReqMap(DEMO_BLOOD_MATCHES);
      setDonorProfilesMap(DEMO_DONOR_PROFILES);
      setBloodHistoryReqMap(DEMO_BLOOD_HISTORY);
      setNotifications(DEMO_BLOOD_NOTIFICATIONS);
    } else if (role === 'HOMEAGE') {
      // STRICTLY FOOD HOMEAGE ONLY: Surplus Food, Food Assistance, Volunteers, Funds — ZERO Hospital/Blood data
      setHomeageAccount(DEMO_HOMEAGE_ACCOUNT);
      setHomeagesMap({ 'HMG-DEMO-001': DEMO_HOMEAGE_ORGS['HMG-DEMO-001'] });
      setFoodDonationsMap(DEMO_FOOD_DONATIONS);
      setFoodAssistanceMap(DEMO_FOOD_ASSISTANCE);
      setMoneyDonationsMap(DEMO_MONEY_DONATIONS);
      setVolunteersMap(DEMO_VOLUNTEERS);
      setNotifications(DEMO_FOOD_NOTIFICATIONS);
    } else if (role === 'ADMIN') {
      // CENTRALIZED ADMIN: Manages Hospitals & Food Homeages independently
      setIsAdminDoc(true);
      setHospitalsMap(DEMO_HOSPITAL_ORGS);
      setHomeagesMap(DEMO_HOMEAGE_ORGS);
      setBloodRequestsOpenMap(DEMO_BLOOD_REQUESTS);
      setDoctorsMap(DEMO_DOCTORS);
      setAppointmentsMap(DEMO_APPOINTMENTS);
      setFoodDonationsMap(DEMO_FOOD_DONATIONS);
      setFoodAssistanceMap(DEMO_FOOD_ASSISTANCE);
      setMoneyDonationsMap(DEMO_MONEY_DONATIONS);
      setVolunteersMap(DEMO_VOLUNTEERS);
    } else {
      // NORMAL USER DEMO
      setHospitalsMap(DEMO_HOSPITAL_ORGS);
      setHomeagesMap(DEMO_HOMEAGE_ORGS);
      setBloodRequestsOpenMap(DEMO_BLOOD_REQUESTS);
      setDoctorsMap(DEMO_DOCTORS);
      setFoodDonationsMap(DEMO_FOOD_DONATIONS);
      setFoodAssistanceMap(DEMO_FOOD_ASSISTANCE);
      setVolunteersMap(DEMO_VOLUNTEERS);
    }
  };

  const loginAsDemoPortal = async (role: PortalRole) => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // ignore signOut errors during demo switch
    }
    setFirebaseUser(null);
    setAwaitingRegistrationVerification(false);
    setIsDemo(true);
    setDemoMultiRole(false);
    setDemoPortalRole(role);
    setSelectedPortal(role);
    localStorage.setItem('helpconnect_demo', 'true');
    localStorage.setItem('helpconnect_demo_role', role);
    localStorage.removeItem('helpconnect_demo_multi_role');
    sessionStorage.setItem('helpconnect_active_portal', role);
    applyDemoRoleData(role);
    setAuthReady(true);
    setRoleResolved(true);
  };

  const loginAsDemoMultiRole = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // ignore signOut errors during demo switch
    }
    setFirebaseUser(null);
    setAwaitingRegistrationVerification(false);
    setIsDemo(true);
    setDemoMultiRole(true);
    setDemoPortalRole(null);
    setSelectedPortal(null);
    localStorage.setItem('helpconnect_demo', 'true');
    localStorage.setItem('helpconnect_demo_multi_role', 'true');
    localStorage.removeItem('helpconnect_demo_role');
    sessionStorage.removeItem('helpconnect_active_portal');
    applyDemoRoleData(null);
    setAuthReady(true);
    setRoleResolved(true);
  };

  const loginAsDemo = () => {
    void loginAsDemoPortal('USER');
  };

  const effectiveFirebaseUser = useMemo(() => {
    if (firebaseUser) return firebaseUser;
    if (isDemo) {
      const role = demoMultiRole ? selectedPortal : demoPortalRole || 'USER';
      const demoIdentity = demoMultiRole && !role
        ? {
            uid: 'demo_multi_role_001',
            displayName: 'Demo Multi-Role Coordinator',
            email: ADMIN_EMAIL,
          }
        : role === 'ADMIN'
          ? {
              uid: 'demo_admin_001',
              displayName: 'Demo System Admin',
              email: ADMIN_EMAIL,
            }
          : role === 'HOSPITAL'
            ? {
                uid: DEMO_HOSPITAL_ACCOUNT.uid,
                displayName: DEMO_HOSPITAL_ACCOUNT.hospitalName,
                email: DEMO_HOSPITAL_ACCOUNT.email,
              }
            : role === 'HOMEAGE'
              ? {
                  uid: DEMO_HOMEAGE_ACCOUNT.uid,
                  displayName: DEMO_HOMEAGE_ACCOUNT.homeageName,
                  email: DEMO_HOMEAGE_ACCOUNT.email,
                }
              : {
                  uid: 'demo_user_123',
                  displayName: 'Demo Community Member',
                  email: 'demo@helpconnect.app',
                };

      return {
        uid: demoIdentity.uid,
        displayName: demoIdentity.displayName,
        email: demoIdentity.email,
        emailVerified: true,
        photoURL: '',
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'demo_token',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({}),
      } as unknown as FirebaseUser;
    }
    return null;
  }, [firebaseUser, isDemo, demoMultiRole, selectedPortal, demoPortalRole]);

  const isAdmin = useMemo(() => {
    if (!effectiveFirebaseUser) return false;
    if (isDemo && !firebaseUser) {
      return demoMultiRole ? selectedPortal === 'ADMIN' : demoPortalRole === 'ADMIN';
    }
    return (
      isAdminDoc ||
      (effectiveFirebaseUser.email === ADMIN_EMAIL && Boolean(effectiveFirebaseUser.emailVerified))
    );
  }, [effectiveFirebaseUser, isAdminDoc, isDemo, firebaseUser, demoMultiRole, selectedPortal, demoPortalRole]);

  const availableRoles: PortalRole[] = useMemo(() => {
    if (!effectiveFirebaseUser) return [];
    if (isDemo && !firebaseUser) {
      if (demoMultiRole) return ['HOSPITAL', 'HOMEAGE'];
      if (demoPortalRole === 'HOSPITAL' || demoPortalRole === 'HOMEAGE') {
        return [demoPortalRole];
      }
      return ['USER'];
    }
    const roles: PortalRole[] = [];
    if (hospitalAccount && hospitalAccount.status === 'ACTIVE') roles.push('HOSPITAL');
    if (homeageAccount && homeageAccount.status === 'ACTIVE') roles.push('HOMEAGE');
    if (roles.length === 0) {
      roles.push('USER');
    }
    return roles;
  }, [
    effectiveFirebaseUser,
    isDemo,
    firebaseUser,
    demoMultiRole,
    demoPortalRole,
    hospitalAccount,
    homeageAccount,
  ]);

  const hasMultipleRoles = availableRoles.length > 1;

  const portalRole: PortalRole | null = useMemo(() => {
    if (!effectiveFirebaseUser) return null;
    if (!hasMultipleRoles) {
      return availableRoles[0] || 'USER';
    }
    if (selectedPortal && availableRoles.includes(selectedPortal)) {
      return selectedPortal;
    }
    return null;
  }, [effectiveFirebaseUser, hasMultipleRoles, availableRoles, selectedPortal]);

  const selectPortal = (role: PortalRole) => {
    if (!availableRoles.includes(role)) return;
    if (role === 'HOSPITAL') {
      clearHomeageOnlyState();
    } else if (role === 'HOMEAGE') {
      clearHospitalOnlyState();
    }
    setSelectedPortal(role);
    sessionStorage.setItem('helpconnect_active_portal', role);
    if (isDemo && !firebaseUser) {
      applyDemoRoleData(role);
    }
  };

  const clearSelectedPortal = () => {
    setSelectedPortal(null);
    sessionStorage.removeItem('helpconnect_active_portal');
    clearHospitalOnlyState();
    clearHomeageOnlyState();
    if (isDemo && !firebaseUser) {
      applyDemoRoleData(null);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);

      if (!fbUser) {
        const persistedDemo = localStorage.getItem('helpconnect_demo') === 'true';
        const persistedMulti = localStorage.getItem('helpconnect_demo_multi_role') === 'true';
        const persistedRole = (localStorage.getItem('helpconnect_demo_role') as PortalRole | null) || 'USER';
        const persistedActive = sessionStorage.getItem('helpconnect_active_portal') as PortalRole | null;
        if (persistedDemo) {
          setIsDemo(true);
          setDemoMultiRole(persistedMulti);
          if (persistedMulti) {
            setDemoPortalRole(null);
            setSelectedPortal(persistedActive);
            applyDemoRoleData(persistedActive);
          } else {
            setDemoPortalRole(persistedRole);
            setSelectedPortal(persistedRole);
            applyDemoRoleData(persistedRole);
          }
          setRoleResolved(true);
          return;
        }
        setIsAdminDoc(false);
        setHospitalAccount(null);
        setHomeageAccount(null);
        setSelectedPortal(null);
        setRoleResolved(true);
        setUserProfilePublic(null);
        setUserProfilePrivate(null);
        setOpenRequestsMap({});
        setMyReqMap({});
        setMyHelpMap({});
        setAdminReqMap({});
        setReqProofMap({});
        setHelpProofMap({});
        setAdminProofMap({});
        setSubHelperMap({});
        setSubReqMap({});
        setConfReqMap({});
        setConfHelpMap({});
        setIssueReportedMap({});
        setIssueReqMap({});
        setIssueHelpMap({});
        setAdminIssueMap({});
        setNotifications([]);
        setAuditLogs([]);
        setMessages([]);
        clearHospitalOnlyState();
        clearHomeageOnlyState();
        return;
      }

      // Real Firebase sign-in clears any lingering demo flags
      setIsDemo(false);
      setDemoMultiRole(false);
      setDemoPortalRole(null);
      localStorage.removeItem('helpconnect_demo');
      localStorage.removeItem('helpconnect_demo_role');
      localStorage.removeItem('helpconnect_demo_multi_role');
      setRoleResolved(false);

      // 1. Check ALL role marker docs (Admin, Hospital, Homeage) so multi-role accounts are detected accurately
      let detectedAdmin = fbUser.email === ADMIN_EMAIL && Boolean(fbUser.emailVerified);
      let detectedHospital: HospitalUserAccount | null = null;
      let detectedHomeage: HomeageUserAccount | null = null;

      await Promise.all([
        (async () => {
          try {
            const adminSnap = await getDoc(doc(db, 'admins', fbUser.uid));
            if (adminSnap.exists()) {
              detectedAdmin = true;
            }
          } catch {
            // ignore
          }
        })(),
        (async () => {
          try {
            const hospSnap = await getDoc(doc(db, 'hospital_users', fbUser.uid));
            if (hospSnap.exists()) {
              detectedHospital = mapDocToHospitalUser(
                hospSnap.id,
                hospSnap.data() as Record<string, unknown>
              );
            }
          } catch {
            // ignore
          }
        })(),
        (async () => {
          try {
            const homSnap = await getDoc(doc(db, 'homeage_users', fbUser.uid));
            if (homSnap.exists()) {
              detectedHomeage = mapDocToHomeageUser(
                homSnap.id,
                homSnap.data() as Record<string, unknown>
              );
            }
          } catch {
            // ignore
          }
        })(),
      ]);

      setIsAdminDoc(detectedAdmin);
      setHospitalAccount(detectedHospital);
      setHomeageAccount(detectedHomeage);
      const savedActivePortal = sessionStorage.getItem('helpconnect_active_portal') as PortalRole | null;
      if (
        (savedActivePortal === 'HOSPITAL' && detectedHospital?.status === 'ACTIVE') ||
        (savedActivePortal === 'HOMEAGE' && detectedHomeage?.status === 'ACTIVE')
      ) {
        setSelectedPortal(savedActivePortal);
      }
      setRoleResolved(true);

      // Skip normal donor_profiles bootstrapping for organization-only accounts
      const isOrgOnlyAccount = !detectedAdmin && Boolean(detectedHospital || detectedHomeage);

      // Ensure user profile documents exist
      const userPublicRef = doc(db, 'users', fbUser.uid);
      try {
        const snap = await getDoc(userPublicRef);
        if (!snap.exists()) {
          await setDoc(userPublicRef, {
            uid: fbUser.uid,
            displayName: toPrivacySafeName(fbUser.displayName, 'Community Member'),
            photoUrl: fbUser.photoURL || '',
            bloodGroup: '',
            approximateArea: 'Tamil Nadu',
            canProvide: ['Blood Donation', 'Food Assistance', 'Transport', 'Emergency Support'],
            verified: Boolean(fbUser.emailVerified),
            peopleHelped: 0,
            requestsCompleted: 0,
            volunteerHours: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else if (fbUser.emailVerified && snap.data()?.verified === false) {
          await updateDoc(userPublicRef, {
            verified: true,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
      }

      const userPrivateRef = doc(db, 'users', fbUser.uid, 'private', 'info');
      try {
        const pSnap = await getDoc(userPrivateRef);
        if (!pSnap.exists()) {
          await setDoc(userPrivateRef, {
            uid: fbUser.uid,
            email: fbUser.email || '',
            mobile: fbUser.phoneNumber || '',
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}/private/info`);
      }

      // Ensure donor_profiles document exists only for Normal Users / Admins (NEVER for Food Homeage accounts)
      if (!isOrgOnlyAccount) {
        const donorProfileRef = doc(db, 'donor_profiles', fbUser.uid);
        try {
          const dSnap = await getDoc(donorProfileRef);
          if (!dSnap.exists()) {
            const pubSnap = await getDoc(userPublicRef);
            const pubData = pubSnap.exists() ? (pubSnap.data() as Record<string, unknown>) : {};
            const privSnap = await getDoc(userPrivateRef);
            const privData = privSnap.exists() ? (privSnap.data() as Record<string, unknown>) : {};
            const rawBlood = typeof pubData.bloodGroup === 'string' ? pubData.bloodGroup : '';
            const validGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
            const bg = validGroups.includes(rawBlood) ? rawBlood : '';
            const cityStr =
              (typeof privData.city === 'string' && privData.city) ||
              (typeof pubData.approximateArea === 'string' && pubData.approximateArea) ||
              'Chennai';
            const coords = resolveCoordinatesFromLocation(cityStr, cityStr);
            await setDoc(donorProfileRef, {
              uid: fbUser.uid,
              displayName: toPrivacySafeName(
                (typeof pubData.displayName === 'string' && pubData.displayName) || fbUser.displayName,
                'Community Donor'
              ),
              photoUrl: (typeof pubData.photoUrl === 'string' && pubData.photoUrl) || fbUser.photoURL || '',
              bloodGroup: bg,
              bloodGroupVerified: Boolean(fbUser.emailVerified && bg),
              accountStatus: 'ACTIVE',
              isAvailable: Boolean(bg),
              city: cityStr.slice(0, 80),
              approximateArea: (
                (typeof pubData.approximateArea === 'string' && pubData.approximateArea) ||
                cityStr
              ).slice(0, 120),
              latitude: coords.lat,
              longitude: coords.lng,
              maxDistanceKm: 25,
              notifyInApp: true,
              notifyPush: true,
              notifyEmail: true,
              notifySms: false,
              notificationsOptOut: false,
              totalDonations: 0,
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn('donor_profiles init note:', err);
        }
      }
    });

    return () => unsub();
  }, []);

  // Firestore real-time subscriptions when authenticated and a portal is active
  useEffect(() => {
    if (!firebaseUser || !portalRole) return;
    if (portalRole === 'HOSPITAL') {
      clearHomeageOnlyState();
    } else if (portalRole === 'HOMEAGE') {
      clearHospitalOnlyState();
    }
    const uid = firebaseUser.uid;
    setLoadingData(true);

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid),
        (snap) => {
          setUserProfilePublic(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`)
      )
    );

    unsubs.push(
      onSnapshot(
        doc(db, 'users', uid, 'private', 'info'),
        (snap) => {
          setUserProfilePrivate(snap.exists() ? (snap.data() as Record<string, unknown>) : null);
        },
        (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}/private/info`)
      )
    );

    const toRecordMap = <T extends { id: string }>(
      docs: Array<{ id: string; data: () => Record<string, unknown> }>,
      mapper: (id: string, d: Record<string, unknown>) => T
    ): Record<string, T> => {
      const map: Record<string, T> = {};
      docs.forEach((docSnap) => {
        map[docSnap.id] = mapper(docSnap.id, docSnap.data());
      });
      return map;
    };

    unsubs.push(
      onSnapshot(
        collection(db, 'help_requests'),
        (snap) => {
          setOpenRequestsMap(toRecordMap(snap.docs, mapDocToRequest));
          setLoadingData(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_requests')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'helper_acceptances'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => mapDocToAcceptance(d.id, d.data()));
            setHelperAcceptances(list);
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'helper_acceptances')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_requests'), where('requesterId', '==', uid)),
        (snap) => setMyReqMap(toRecordMap(snap.docs, mapDocToRequest)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_requests')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_requests'), where('helperId', '==', uid)),
        (snap) => setMyHelpMap(toRecordMap(snap.docs, mapDocToRequest)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_requests')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'digital_proofs'), where('requesterId', '==', uid)),
        (snap) => setReqProofMap(toRecordMap(snap.docs, mapDocToProof)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'digital_proofs')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'digital_proofs'), where('helperId', '==', uid)),
        (snap) => setHelpProofMap(toRecordMap(snap.docs, mapDocToProof)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'digital_proofs')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_completion_submissions'), where('helperId', '==', uid)),
        (snap) => setSubHelperMap(toRecordMap(snap.docs, mapDocToSubmission)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_completion_submissions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_completion_submissions'), where('requesterId', '==', uid)),
        (snap) => setSubReqMap(toRecordMap(snap.docs, mapDocToSubmission)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_completion_submissions')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_confirmations'), where('requesterId', '==', uid)),
        (snap) => setConfReqMap(toRecordMap(snap.docs, mapDocToConfirmation)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_confirmations')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_confirmations'), where('helperId', '==', uid)),
        (snap) => setConfHelpMap(toRecordMap(snap.docs, mapDocToConfirmation)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_confirmations')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_issues'), where('reportedBy', '==', uid)),
        (snap) => setIssueReportedMap(toRecordMap(snap.docs, mapDocToIssue)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_issues')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_issues'), where('requesterId', '==', uid)),
        (snap) => setIssueReqMap(toRecordMap(snap.docs, mapDocToIssue)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_issues')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'help_issues'), where('helperId', '==', uid)),
        (snap) => setIssueHelpMap(toRecordMap(snap.docs, mapDocToIssue)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'help_issues')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'notifications'), where('userId', '==', uid)),
        (snap) => {
          const list = snap.docs
            .map((d) => mapDocToNotification(d.id, d.data()))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          setNotifications(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    unsubs.push(
      onSnapshot(
        collection(db, 'chat_messages'),
        (snap) => {
          const list = snap.docs
            .map((d) => mapDocToChatMessage(d.id, d.data()))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          setMessages(list);
        },
        (err) => {
          console.warn('chat_messages snapshot note:', err);
        }
      )
    );

    // STRICT ROLE-ISOLATED REAL-TIME SUBSCRIPTIONS
    // --------------------------------------------------
    // 1. Blood & Hospital Collections (BLOCKED for HOMEAGE role)
    if (portalRole !== 'HOMEAGE') {
      unsubs.push(
        onSnapshot(
          query(collection(db, 'donor_profiles'), where('accountStatus', '==', 'ACTIVE')),
          (snap) => setDonorProfilesMap(toRecordMap(snap.docs, mapDocToDonorProfile)),
          (err) => console.warn('donor_profiles snapshot note:', err)
        )
      );

      if (portalRole === 'USER' || portalRole === 'ADMIN') {
        unsubs.push(
          onSnapshot(
            doc(db, 'donor_profiles', uid),
            (snap) => {
              setMyDonorProfileDoc(
                snap.exists() ? mapDocToDonorProfile(snap.id, snap.data() as Record<string, unknown>) : null
              );
            },
            (err) => console.warn('my donor_profile note:', err)
          )
        );
      }

      unsubs.push(
        onSnapshot(
          portalRole === 'HOSPITAL' || portalRole === 'ADMIN'
            ? collection(db, 'blood_requests')
            : query(collection(db, 'blood_requests'), where('status', '!=', 'REQUEST_CANCELLED')),
          (snap) => setBloodRequestsOpenMap(toRecordMap(snap.docs, mapDocToBloodRequest)),
          (err) => console.warn('blood_requests snapshot note:', err)
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'blood_requests'), where('requesterId', '==', uid)),
          (snap) => setMyBloodRequestsMap(toRecordMap(snap.docs, mapDocToBloodRequest)),
          (err) => console.warn('my blood_requests note:', err)
        )
      );

      if (portalRole === 'HOSPITAL' || portalRole === 'ADMIN') {
        unsubs.push(
          onSnapshot(
            collection(db, 'blood_donor_matches'),
            (snap) => setBloodMatchesReqMap(toRecordMap(snap.docs, mapDocToBloodDonorMatch)),
            (err) => console.warn('hospital blood_donor_matches note:', err)
          )
        );
      } else {
        unsubs.push(
          onSnapshot(
            query(collection(db, 'blood_donor_matches'), where('donorId', '==', uid)),
            (snap) => setBloodMatchesDonorMap(toRecordMap(snap.docs, mapDocToBloodDonorMatch)),
            (err) => console.warn('donor matches note:', err)
          )
        );
        unsubs.push(
          onSnapshot(
            query(collection(db, 'blood_donor_matches'), where('requesterId', '==', uid)),
            (snap) => setBloodMatchesReqMap(toRecordMap(snap.docs, mapDocToBloodDonorMatch)),
            (err) => console.warn('requester matches note:', err)
          )
        );
      }

      if (portalRole === 'HOSPITAL' || portalRole === 'ADMIN') {
        unsubs.push(
          onSnapshot(
            collection(db, 'donation_history'),
            (snap) => setBloodHistoryReqMap(toRecordMap(snap.docs, mapDocToDonationHistory)),
            (err) => console.warn('hospital donation_history note:', err)
          )
        );
      } else {
        unsubs.push(
          onSnapshot(
            query(collection(db, 'donation_history'), where('donorId', '==', uid)),
            (snap) => setBloodHistoryDonorMap(toRecordMap(snap.docs, mapDocToDonationHistory)),
            (err) => console.warn('donation_history donor note:', err)
          )
        );

        unsubs.push(
          onSnapshot(
            query(collection(db, 'donation_history'), where('requesterId', '==', uid)),
            (snap) => setBloodHistoryReqMap(toRecordMap(snap.docs, mapDocToDonationHistory)),
            (err) => console.warn('donation_history req note:', err)
          )
        );
      }

      // Hospitals directory
      unsubs.push(
        onSnapshot(
          portalRole === 'ADMIN'
            ? collection(db, 'hospitals')
            : query(collection(db, 'hospitals'), where('status', '==', 'ACTIVE')),
          (snap) => setHospitalsMap(toRecordMap(snap.docs, mapDocToHospitalOrg)),
          (err) => console.warn('hospitals snapshot note:', err)
        )
      );
    }

    // 2. Food Donation & Homeage Collections (BLOCKED for HOSPITAL role)
    if (portalRole !== 'HOSPITAL') {
      unsubs.push(
        onSnapshot(
          portalRole === 'ADMIN'
            ? collection(db, 'homeage_organizations')
            : query(collection(db, 'homeage_organizations'), where('status', '==', 'ACTIVE')),
          (snap) => setHomeagesMap(toRecordMap(snap.docs, mapDocToHomeageOrg)),
          (err) => console.warn('homeage_organizations note:', err)
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'food_donations'),
          (snap) => setFoodDonationsMap(toRecordMap(snap.docs, mapDocToFoodDonation)),
          (err) => console.warn('food_donations note:', err)
        )
      );

      if (portalRole === 'HOMEAGE' || portalRole === 'ADMIN') {
        unsubs.push(
          onSnapshot(
            collection(db, 'food_collection_requests'),
            (snap) => setFoodCollectionReqMap(toRecordMap(snap.docs, mapDocToFoodCollectionRequest)),
            (err) => console.warn('food_collection_requests note:', err)
          )
        );
      } else {
        unsubs.push(
          onSnapshot(
            query(collection(db, 'food_collection_requests'), where('receiverId', '==', uid)),
            (snap) => setFoodCollectionReqMap(toRecordMap(snap.docs, mapDocToFoodCollectionRequest)),
            (err) => console.warn('food_collection_requests receiver note:', err)
          )
        );
        unsubs.push(
          onSnapshot(
            query(collection(db, 'food_collection_requests'), where('donorId', '==', uid)),
            (snap) => setFoodCollectionDonorMap(toRecordMap(snap.docs, mapDocToFoodCollectionRequest)),
            (err) => console.warn('food_collection_requests donor note:', err)
          )
        );
      }

      unsubs.push(
        onSnapshot(
          collection(db, 'food_assistance_requests'),
          (snap) => setFoodAssistanceMap(toRecordMap(snap.docs, mapDocToFoodAssistanceRequest)),
          (err) => console.warn('food_assistance_requests note:', err)
        )
      );

      const contribQuery =
        portalRole === 'HOMEAGE' || portalRole === 'ADMIN'
          ? collection(db, 'food_contributions')
          : query(collection(db, 'food_contributions'), where('donorId', '==', uid));
      unsubs.push(
        onSnapshot(
          contribQuery,
          (snap) => setFoodContributionsMap(toRecordMap(snap.docs, mapDocToFoodContribution)),
          (err) => console.warn('food_contributions note:', err)
        )
      );

      const moneyQuery =
        portalRole === 'ADMIN'
          ? collection(db, 'money_donations')
          : portalRole === 'HOMEAGE' && homeageAccount?.homeageId
          ? query(collection(db, 'money_donations'), where('homeageId', '==', homeageAccount.homeageId))
          : query(collection(db, 'money_donations'), where('donorId', '==', uid));
      unsubs.push(
        onSnapshot(
          moneyQuery,
          (snap) => setMoneyDonationsMap(toRecordMap(snap.docs, mapDocToMoneyDonation)),
          (err) => console.warn('money_donations note:', err)
        )
      );

      unsubs.push(
        onSnapshot(
          collection(db, 'volunteer_registrations'),
          (snap) => setVolunteersMap(toRecordMap(snap.docs, mapDocToVolunteerRegistration)),
          (err) => console.warn('volunteer_registrations note:', err)
        )
      );

      if (portalRole === 'HOMEAGE' || portalRole === 'ADMIN') {
        unsubs.push(
          onSnapshot(
            collection(db, 'food_donation_certificates'),
            (snap) => setFoodCertsDonorMap(toRecordMap(snap.docs, mapDocToFoodCertificate)),
            (err) => console.warn('food_donation_certificates note:', err)
          )
        );
      } else {
        unsubs.push(
          onSnapshot(
            query(collection(db, 'food_donation_certificates'), where('donorId', '==', uid)),
            (snap) => setFoodCertsDonorMap(toRecordMap(snap.docs, mapDocToFoodCertificate)),
            (err) => console.warn('food_donation_certificates donor note:', err)
          )
        );
        unsubs.push(
          onSnapshot(
            query(collection(db, 'food_donation_certificates'), where('receiverId', '==', uid)),
            (snap) => setFoodCertsReceiverMap(toRecordMap(snap.docs, mapDocToFoodCertificate)),
            (err) => console.warn('food_donation_certificates receiver note:', err)
          )
        );
      }
    }

    if (isAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'help_requests'),
          (snap) => setAdminReqMap(toRecordMap(snap.docs, mapDocToRequest)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'help_requests')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'digital_proofs'),
          (snap) => setAdminProofMap(toRecordMap(snap.docs, mapDocToProof)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'digital_proofs')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'help_issues'),
          (snap) => setAdminIssueMap(toRecordMap(snap.docs, mapDocToIssue)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'help_issues')
        )
      );
      unsubs.push(
        onSnapshot(
          collection(db, 'audit_logs'),
          (snap) => {
            const list = snap.docs
              .map((d) => mapDocToAudit(d.id, d.data()))
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            setAuditLogs(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
        )
      );
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [firebaseUser, isAdmin, portalRole, hospitalAccount?.hospitalId, homeageAccount?.homeageId]);

  const requests = useMemo(() => {
    const baseList: HelpRequest[] = !firebaseUser
      ? sampleRequests
      : Object.values({
          ...openRequestsMap,
          ...myReqMap,
          ...myHelpMap,
          ...(isAdmin ? adminReqMap : {}),
        });

    const enriched = baseList.map((r) => {
      const round = r.matchingRound || 1;
      const reqAcceptances = helperAcceptances.filter(
        (a) => a.requestId === r.requestId && (a.matchingRound || 1) === round
      );
      const activeHelpers = reqAcceptances.filter(
        (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
      );
      const acceptedCount = activeHelpers.length > 0
        ? Math.min(3, activeHelpers.length)
        : (r.acceptedCount ?? (r.status === 'ACCEPTED' ? 1 : 0));
      const remainingSlots = Math.max(0, 3 - acceptedCount);
      const acceptanceClosed = acceptedCount >= 3 || Boolean(r.acceptanceClosed);

      let status = r.status;
      if (!['COMPLETED_CONFIRMED', 'COMPLETED', 'CANCELLED', 'ISSUE_REPORTED', 'UNDER_REVIEW'].includes(status)) {
        if (r.status === 'CONFIRMED' || activeHelpers.some((h) => h.acceptanceStatus === 'CONFIRMED')) {
          status = 'CONFIRMED';
        } else if (r.status === 'HELPER_SELECTED' || activeHelpers.some((h) => h.isSelected)) {
          status = 'HELPER_SELECTED';
        } else if (activeHelpers.length === 0 && reqAcceptances.some((h) => ['UNAVAILABLE', 'REJECTED'].includes(h.acceptanceStatus))) {
          status = 'REOPENED';
        } else if (acceptedCount === 3) {
          status = 'THREE_HELPERS_FOUND';
        } else if (acceptedCount === 2) {
          status = 'TWO_HELPERS_ACCEPTED';
        } else if (acceptedCount === 1) {
          status = 'ONE_HELPER_ACCEPTED';
        }
      }

      return {
        ...r,
        acceptedCount,
        remainingSlots,
        matchingRound: round,
        acceptanceClosed,
        activeAcceptances: reqAcceptances,
        status,
      };
    });

    return enriched.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [firebaseUser, sampleRequests, openRequestsMap, myReqMap, myHelpMap, adminReqMap, isAdmin, helperAcceptances]);

  const proofs = useMemo(() => {
    const merged: Record<string, DigitalProof> = {
      ...reqProofMap,
      ...helpProofMap,
      ...(isAdmin ? adminProofMap : {}),
    };
    return Object.values(merged).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }, [reqProofMap, helpProofMap, adminProofMap, isAdmin]);

  const submissions = useMemo(() => {
    const merged: Record<string, CompletionSubmission> = {
      ...subHelperMap,
      ...subReqMap,
    };
    return Object.values(merged).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [subHelperMap, subReqMap]);

  const confirmations = useMemo(() => {
    const merged: Record<string, HelpConfirmation> = {
      ...confReqMap,
      ...confHelpMap,
    };
    return Object.values(merged).sort((a, b) => b.confirmedAt.localeCompare(a.confirmedAt));
  }, [confReqMap, confHelpMap]);

  const issues = useMemo(() => {
    const merged: Record<string, HelpIssue> = {
      ...issueReportedMap,
      ...issueReqMap,
      ...issueHelpMap,
      ...(isAdmin ? adminIssueMap : {}),
    };
    return Object.values(merged).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [issueReportedMap, issueReqMap, issueHelpMap, adminIssueMap, isAdmin]);

  // Verified user stats computed strictly from confirmed Digital Proofs
  const user: User = useMemo(() => {
    const uid = effectiveFirebaseUser?.uid || 'guest';
    const confirmedHelperProofs = proofs.filter(
      (p) => p.helperId === uid && p.proofStatus === 'VALID'
    );
    const confirmedRequesterProofs = proofs.filter(
      (p) => p.requesterId === uid && p.proofStatus === 'VALID'
    );

    const savedCategories = Array.isArray(userProfilePrivate?.helpCategories)
      ? (userProfilePrivate.helpCategories as string[])
      : Array.isArray(userProfilePublic?.canProvide)
      ? (userProfilePublic.canProvide as string[])
      : ['Blood Donation', 'Food Assistance', 'Transport', 'Emergency Support'];

    return {
      id: uid,
      name:
        (typeof userProfilePublic?.displayName === 'string' && userProfilePublic.displayName) ||
        effectiveFirebaseUser?.displayName ||
        'Community Member',
      email:
        (typeof userProfilePrivate?.email === 'string' && userProfilePrivate.email) ||
        effectiveFirebaseUser?.email ||
        '',
      mobile:
        (typeof userProfilePrivate?.mobile === 'string' && userProfilePrivate.mobile) ||
        effectiveFirebaseUser?.phoneNumber ||
        '',
      location:
        (typeof userProfilePublic?.approximateArea === 'string' && userProfilePublic.approximateArea) ||
        'Tamil Nadu, India',
      bloodGroup:
        (typeof userProfilePublic?.bloodGroup === 'string' && userProfilePublic.bloodGroup) ||
        'O+',
      profilePhoto:
        (typeof userProfilePublic?.photoUrl === 'string' && userProfilePublic.photoUrl) ||
        effectiveFirebaseUser?.photoURL ||
        '',
      verified: Boolean(
        effectiveFirebaseUser?.emailVerified || userProfilePublic?.verified
      ),
      isAdmin,
      canProvide: savedCategories,
      stats: {
        peopleHelped: confirmedHelperProofs.length + confirmedRequesterProofs.length,
        requestsCompleted: confirmedHelperProofs.length,
        volunteerHours: confirmedHelperProofs.length * 2,
      },
    };
  }, [effectiveFirebaseUser, isAdmin, proofs, userProfilePublic, userProfilePrivate]);

  const signInWithGoogle = async () => {
    setAwaitingRegistrationVerification(false);
    await signInWithPopup(auth, googleAuthProvider);
  };

  const signOutUser = async () => {
    setAwaitingRegistrationVerification(false);
    setIsDemo(false);
    setDemoMultiRole(false);
    setDemoPortalRole(null);
    setSelectedPortal(null);
    setIsAdminDoc(false);
    setHospitalAccount(null);
    setHomeageAccount(null);
    setUserProfilePublic(null);
    setUserProfilePrivate(null);
    clearHospitalOnlyState();
    clearHomeageOnlyState();
    localStorage.removeItem('helpconnect_demo');
    localStorage.removeItem('helpconnect_demo_role');
    localStorage.removeItem('helpconnect_demo_multi_role');
    sessionStorage.removeItem('helpconnect_active_portal');
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  };

  const requireSignedIn = (): FirebaseUser => {
    if (effectiveFirebaseUser) {
      return effectiveFirebaseUser;
    }
    if (!auth.currentUser) {
      throw new Error('Please sign in or use Demo Login first to perform this action.');
    }
    return auth.currentUser;
  };

  const addRequest = async (input: CreateRequestInput): Promise<HelpRequest> => {
    const fbUser = requireSignedIn();
    const requestId = generateRequestId();
    const displayName = toPrivacySafeName(fbUser.displayName, 'Community Member');

    const payload: Record<string, unknown> = {
      requestId,
      requesterId: fbUser.uid,
      requesterDisplayName: displayName,
      helperId: null,
      title: input.title.trim().slice(0, 140),
      description: input.description.trim().slice(0, 1000),
      category: input.category,
      location: input.location.trim().slice(0, 140) || 'Community Area',
      urgency: input.time,
      status: 'REQUESTED',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.bloodGroup) payload.bloodGroup = input.bloodGroup;
    if (typeof input.units === 'number' && input.units > 0) payload.units = input.units;
    if (typeof input.amountNeeded === 'number' && input.amountNeeded > 0) {
      payload.amountNeeded = input.amountNeeded;
      payload.amountCollected = 0;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'help_requests', requestId), payload);
    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: 'REQUEST_CREATED',
      entityType: 'help_request',
      entityId: requestId,
      previousStatus: 'NONE',
      newStatus: 'REQUESTED',
      details: `${input.category} request created`,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `help_requests/${requestId}`);
    }

    return {
      id: requestId,
      requestId,
      requesterId: fbUser.uid,
      requesterName: displayName,
      requesterVerified: Boolean(fbUser.emailVerified),
      helperId: null,
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      location: input.location.trim(),
      distance: 'Nearby',
      time: input.time,
      status: 'REQUESTED',
      bloodGroup: input.bloodGroup,
      units: input.units,
      amountNeeded: input.amountNeeded,
      amountCollected: input.amountNeeded ? 0 : undefined,
      createdAt: new Date().toISOString(),
    };
  };

  const acceptRequestSlot = async (
    requestId: string,
    helperData?: Partial<HelperAcceptance>
  ) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.requesterId === fbUser.uid && !helperData?.helperId) {
      throw new Error('You cannot accept your own help request.');
    }

    const currentRound = target.matchingRound || 1;
    const helperId = helperData?.helperId || fbUser.uid;
    const helperName =
      helperData?.helperDisplayName || toPrivacySafeName(fbUser.displayName, 'Verified Community Member');
    const helperPhoto = helperData?.helperPhotoUrl || fbUser.photoURL || undefined;
    const helperVerified = helperData?.helperVerified ?? Boolean(fbUser.emailVerified);

    // Call atomic backend operation (enforcing atomic concurrency lock)
    try {
      const res = await fetch(`/api/requests/${target.requestId}/accept-helper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          helperId,
          helperDisplayName: helperName,
          helperPhotoUrl: helperPhoto,
          helperVerified,
          helperBloodGroup: helperData?.helperBloodGroup || target.bloodGroup,
          approximateDistance: helperData?.approximateDistance,
          estimatedArrival: helperData?.estimatedArrival,
          currentAvailability: helperData?.currentAvailability || 'Available Now',
          previousHelpCount: helperData?.previousHelpCount || 14,
          rating: helperData?.rating || 4.9,
          reviewsCount: helperData?.reviewsCount || 16,
          helpCategory: target.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Backend limit check failed.');
      }
    } catch (apiErr) {
      if (apiErr instanceof Error && (apiErr.message.includes('LIMIT REACHED') || apiErr.message.includes('Duplicate'))) {
        throw apiErr;
      }
    }

    // Check current state in memory
    const roundAcceptances = helperAcceptances.filter(
      (a) => a.requestId === target.requestId && (a.matchingRound || 1) === currentRound
    );
    const activeHelpers = roundAcceptances.filter(
      (a) => !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
    );

    if (activeHelpers.some((h) => h.helperId === helperId)) {
      throw new Error('You have already accepted this request in matching round ' + currentRound);
    }
    if (activeHelpers.length >= 3) {
      throw new Error('ACCEPTANCE LIMIT REACHED: 3/3 Helpers already accepted for this round.');
    }

    const newActiveCount = activeHelpers.length + 1;
    const distanceVal = helperData?.approximateDistance ?? Number((1.2 + activeHelpers.length * 0.9).toFixed(1));
    const etaVal = helperData?.estimatedArrival ?? (8 + activeHelpers.length * 5);

    const acceptanceDocId = `acc_${target.requestId}_r${currentRound}_${helperId}`;
    const acceptanceRef = doc(db, 'helper_acceptances', acceptanceDocId);

    const newAcceptanceRecord: HelperAcceptance = {
      id: acceptanceDocId,
      acceptanceId: `ACC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      requestId: target.requestId,
      helperId,
      helperDisplayName: helperName,
      helperPhotoUrl: helperPhoto,
      helperVerified,
      helperBloodGroup: helperData?.helperBloodGroup || target.bloodGroup,
      acceptanceStatus: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
      approximateDistance: distanceVal,
      estimatedArrival: etaVal,
      isSelected: false,
      matchingRound: currentRound,
      currentAvailability: helperData?.currentAvailability || 'Available Now',
      helpCategory: target.category,
      previousHelpCount: helperData?.previousHelpCount || 14,
      rating: helperData?.rating || 4.9,
      reviewsCount: helperData?.reviewsCount || 16,
    };

    setHelperAcceptances((prev) => {
      const filtered = prev.filter(
        (a) => !(a.requestId === target.requestId && a.helperId === helperId && a.matchingRound === currentRound)
      );
      return [...filtered, newAcceptanceRecord];
    });

    const newStatus: RequestStatus =
      newActiveCount === 3
        ? 'THREE_HELPERS_FOUND'
        : newActiveCount === 2
        ? 'TWO_HELPERS_ACCEPTED'
        : 'ONE_HELPER_ACCEPTED';

    const batch = writeBatch(db);
    batch.set(acceptanceRef, {
      acceptanceId: newAcceptanceRecord.acceptanceId,
      requestId: target.requestId,
      helperId,
      helperDisplayName: helperName,
      helperPhotoUrl: helperPhoto || null,
      helperVerified,
      helperBloodGroup: helperData?.helperBloodGroup || target.bloodGroup || null,
      acceptanceStatus: 'ACCEPTED',
      acceptedAt: serverTimestamp(),
      approximateDistance: distanceVal,
      estimatedArrival: etaVal,
      isSelected: false,
      matchingRound: currentRound,
      currentAvailability: helperData?.currentAvailability || 'Available Now',
      helpCategory: target.category,
      previousHelpCount: helperData?.previousHelpCount || 14,
      rating: helperData?.rating || 4.9,
      reviewsCount: helperData?.reviewsCount || 16,
    });

    const reqRef = doc(db, 'help_requests', target.requestId);
    const reqSnap = await getDoc(reqRef);
    if (reqSnap.exists()) {
      batch.update(reqRef, {
        acceptedCount: newActiveCount,
        remainingSlots: Math.max(0, 3 - newActiveCount),
        status: newStatus,
        acceptanceClosed: newActiveCount >= 3,
        updatedAt: serverTimestamp(),
      });
    }

    const notifTitle =
      newActiveCount === 3
        ? 'Three Helpers Ready for Your Request!'
        : `Helper Accepted Your Request (${newActiveCount}/3)`;
    const notifMsg =
      newActiveCount === 3
        ? '3/3 Helpers found! Please review their profiles and choose the most suitable helper.'
        : `${helperName} accepted your request. ${3 - newActiveCount} slots remaining.`;

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'notifications', notifId), {
      userId: target.requesterId,
      actorId: helperId,
      requestId: target.requestId,
      title: notifTitle,
      message: notifMsg,
      notificationType: newActiveCount === 3 ? 'THREE_HELPERS_READY' : 'HELPER_ACCEPTED_SLOT',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    const helperNotifId = `notif_h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'notifications', helperNotifId), {
      userId: helperId,
      actorId: fbUser.uid,
      requestId: target.requestId,
      title: 'Acceptance Confirmed',
      message: `You accepted slot ${newActiveCount}/3 for request ${target.requestId}. Waiting for receiver selection.`,
      notificationType: 'REQUEST_ACCEPTED',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore commit note:', err);
    }
  };

  const acceptRequest = async (requestId: string) => {
    await acceptRequestSlot(requestId);
  };

  const selectHelper = async (requestId: string, helperId: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');

    try {
      await fetch(`/api/requests/${target.requestId}/select-helper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helperId }),
      });
    } catch (err) {
      console.warn('Backend select-helper error:', err);
    }

    const currentRound = target.matchingRound || 1;
    const batch = writeBatch(db);

    const roundAcceptances = helperAcceptances.filter(
      (a) => a.requestId === target.requestId && (a.matchingRound || 1) === currentRound
    );

    const chosen = roundAcceptances.find((a) => a.helperId === helperId);
    const chosenName = chosen?.helperDisplayName || 'Community Helper';

    // Optimistic state update
    setHelperAcceptances((prev) =>
      prev.map((a) => {
        if (a.requestId === target.requestId && (a.matchingRound || 1) === currentRound) {
          if (a.helperId === helperId) {
            return { ...a, acceptanceStatus: 'SELECTED', isSelected: true, selectedAt: new Date().toISOString() };
          }
          if (a.isSelected) {
            return { ...a, acceptanceStatus: 'ACCEPTED', isSelected: false };
          }
        }
        return a;
      })
    );

    roundAcceptances.forEach((h) => {
      const docId = h.id || `acc_${target.requestId}_r${currentRound}_${h.helperId}`;
      const hRef = doc(db, 'helper_acceptances', docId);
      if (h.helperId === helperId) {
        batch.update(hRef, {
          acceptanceStatus: 'SELECTED',
          isSelected: true,
          selectedAt: serverTimestamp(),
        });
      } else if (h.isSelected) {
        batch.update(hRef, {
          acceptanceStatus: 'ACCEPTED',
          isSelected: false,
        });
      }
    });

    batch.update(doc(db, 'help_requests', target.requestId), {
      helperId,
      selectedHelperId: helperId,
      helperDisplayName: chosenName,
      helperVerified: Boolean(chosen?.helperVerified),
      status: 'HELPER_SELECTED',
      updatedAt: serverTimestamp(),
    });

    // Notify selected helper (Section 5 & 10)
    const notifSelected = `notif_sel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'notifications', notifSelected), {
      userId: helperId,
      actorId: fbUser.uid,
      requestId: target.requestId,
      title: 'You Were Chosen by the Requester!',
      message: 'The requester chose you as the primary helper! Please confirm or decline.',
      notificationType: 'HELPER_CHOSEN',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // Notify other helpers (Section 5 & 10)
    const otherHelpers = roundAcceptances.filter(
      (h) => h.helperId !== helperId && !['UNAVAILABLE', 'REJECTED'].includes(h.acceptanceStatus)
    );
    otherHelpers.forEach((oh) => {
      const notifBackup = `notif_bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      batch.set(doc(db, 'notifications', notifBackup), {
        userId: oh.helperId,
        actorId: fbUser.uid,
        requestId: target.requestId,
        title: 'Status Update: On Backup Standby',
        message: 'Another helper was selected for this request. You are currently on standby as a backup helper.',
        notificationType: 'BACKUP_AVAILABLE',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore commit note:', err);
    }
  };

  const confirmProvideHelp = async (requestId: string, helperId: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');

    try {
      await fetch(`/api/requests/${target.requestId}/helper-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helperId }),
      });
    } catch (err) {
      console.warn('Backend confirm error:', err);
    }

    const currentRound = target.matchingRound || 1;
    setHelperAcceptances((prev) =>
      prev.map((a) =>
        a.requestId === target.requestId && (a.matchingRound || 1) === currentRound && a.helperId === helperId
          ? { ...a, acceptanceStatus: 'CONFIRMED', isSelected: true }
          : a
      )
    );

    const batch = writeBatch(db);
    const docId = `acc_${target.requestId}_r${currentRound}_${helperId}`;
    batch.update(doc(db, 'helper_acceptances', docId), {
      acceptanceStatus: 'CONFIRMED',
      isSelected: true,
    });

    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'CONFIRMED',
      updatedAt: serverTimestamp(),
    });

    const notifId = `notif_conf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'notifications', notifId), {
      userId: target.requesterId,
      actorId: helperId,
      requestId: target.requestId,
      title: 'Helper Confirmed Assistance',
      message: `${target.helperDisplayName || 'Your helper'} confirmed and is preparing to help!`,
      notificationType: 'HELPER_CONFIRMED',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore commit note:', err);
    }
  };

  const rejectProvideHelp = async (requestId: string, helperId: string, reason: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');

    try {
      await fetch(`/api/requests/${target.requestId}/helper-reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helperId, rejectionReason: reason }),
      });
    } catch (err) {
      console.warn('Backend reject error:', err);
    }

    const currentRound = target.matchingRound || 1;
    const nowIso = new Date().toISOString();

    setHelperAcceptances((prev) =>
      prev.map((a) =>
        a.requestId === target.requestId && (a.matchingRound || 1) === currentRound && a.helperId === helperId
          ? { ...a, acceptanceStatus: 'UNAVAILABLE', isSelected: false, rejectedAt: nowIso, rejectionReason: reason }
          : a
      )
    );

    const roundAcceptances = helperAcceptances.filter(
      (a) => a.requestId === target.requestId && (a.matchingRound || 1) === currentRound
    );
    const remainingHelpers = roundAcceptances.filter(
      (a) => a.helperId !== helperId && !['UNAVAILABLE', 'REJECTED', 'CANCELLED'].includes(a.acceptanceStatus)
    );

    const batch = writeBatch(db);
    const docId = `acc_${target.requestId}_r${currentRound}_${helperId}`;
    batch.update(doc(db, 'helper_acceptances', docId), {
      acceptanceStatus: 'UNAVAILABLE',
      isSelected: false,
      rejectedAt: serverTimestamp(),
      rejectionReason: reason,
    });

    if (remainingHelpers.length > 0) {
      // RULE 5: Immediately show backup helpers
      batch.update(doc(db, 'help_requests', target.requestId), {
        helperId: null,
        selectedHelperId: null,
        status: 'BACKUP_SELECTION_REQUIRED',
        updatedAt: serverTimestamp(),
      });

      const notifId = `notif_bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      batch.set(doc(db, 'notifications', notifId), {
        userId: target.requesterId,
        actorId: helperId,
        requestId: target.requestId,
        title: 'Selected Helper Unavailable',
        message: "Your selected helper is unable to come. Don't worry! Other helpers are still available.",
        notificationType: 'BACKUP_AVAILABLE',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    } else {
      // RULE 7: All three helpers unavailable -> Reopen request and start new matching round!
      const nextRound = currentRound + 1;
      batch.update(doc(db, 'help_requests', target.requestId), {
        helperId: null,
        selectedHelperId: null,
        status: 'REOPENED',
        matchingRound: nextRound,
        acceptedCount: 0,
        remainingSlots: 3,
        acceptanceClosed: false,
        reopenedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const notifId = `notif_reopen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      batch.set(doc(db, 'notifications', notifId), {
        userId: target.requesterId,
        actorId: helperId,
        requestId: target.requestId,
        title: 'Request Automatically Reopened',
        message: `All helpers from Round ${currentRound} were unavailable. Your request has been reopened for new helpers.`,
        notificationType: 'REQUEST_REOPENED',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore commit note:', err);
    }
  };

  const reopenRequestRound = async (requestId: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');

    const nextRound = (target.matchingRound || 1) + 1;
    const batch = writeBatch(db);

    batch.update(doc(db, 'help_requests', target.requestId), {
      helperId: null,
      selectedHelperId: null,
      status: 'REOPENED',
      matchingRound: nextRound,
      acceptedCount: 0,
      remainingSlots: 3,
      acceptanceClosed: false,
      reopenedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      console.warn('Firestore commit note:', err);
    }
  };

  const runConcurrencyTest = async (requestId: string) => {
    const res = await fetch(`/api/requests/${requestId}/test-concurrency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return {
      successCount: data.successCount || 0,
      blockedCount: data.blockedCount || 0,
      message: data.verdict || 'Concurrency test completed.',
    };
  };

  const startAssistance = async (requestId: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.helperId !== fbUser.uid) {
      throw new Error('Only the assigned helper can start progress.');
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'IN_PROGRESS',
      updatedAt: serverTimestamp(),
    });

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: 'ASSISTANCE_IN_PROGRESS',
      entityType: 'help_request',
      entityId: target.requestId,
      previousStatus: target.status,
      newStatus: 'IN_PROGRESS',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `help_requests/${target.requestId}`);
    }
  };

  const startJourney = async (requestId: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.helperId !== fbUser.uid) throw new Error('Only the assigned helper can update journey status.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'IN_PROGRESS',
      journeyStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`), {
      actorId: fbUser.uid,
      action: 'HELPER_JOURNEY_STARTED',
      entityType: 'help_request',
      entityId: target.requestId,
      previousStatus: target.status,
      newStatus: 'IN_PROGRESS',
      details: 'Helper started journey (on the way)',
      createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `help_requests/${target.requestId}`);
      throw err;
    }
  };

  const markArrived = async (requestId: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.helperId !== fbUser.uid) throw new Error('Only the assigned helper can update arrival status.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'help_requests', target.requestId), {
      arrivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`), {
      actorId: fbUser.uid,
      action: 'HELPER_ARRIVED',
      entityType: 'help_request',
      entityId: target.requestId,
      previousStatus: target.status,
      newStatus: target.status,
      details: 'Helper arrived at location',
      createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `help_requests/${target.requestId}`);
      throw err;
    }
  };

  const startAssistanceProgress = async (requestId: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.helperId !== fbUser.uid) throw new Error('Only the assigned helper can start assistance.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'help_requests', target.requestId), {
      assistanceStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`), {
      actorId: fbUser.uid,
      action: 'ASSISTANCE_STARTED',
      entityType: 'help_request',
      entityId: target.requestId,
      previousStatus: target.status,
      newStatus: target.status,
      details: 'Assistance in progress started',
      createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `help_requests/${target.requestId}`);
      throw err;
    }
  };

  const cancelRequestWithReason = async (requestId: string, reason: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.requesterId !== fbUser.uid && target.helperId !== fbUser.uid && !isAdmin) {
      throw new Error('Unauthorized to cancel this request.');
    }
    const trimmed = reason.trim();
    if (!trimmed) throw new Error('Cancellation reason is required.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'CANCELLED',
      cancellationReason: trimmed,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`), {
      actorId: fbUser.uid,
      action: 'REQUEST_CANCELLED',
      entityType: 'help_request',
      entityId: target.requestId,
      previousStatus: target.status,
      newStatus: 'CANCELLED',
      details: `Cancelled with reason: ${trimmed}`,
      createdAt: serverTimestamp(),
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `help_requests/${target.requestId}`);
      throw err;
    }
  };

  const submitCompletion = async (
    requestId: string,
    payload: {
      completionDescription?: string;
      evidenceDataUrl?: string;
      evidenceFileName?: string;
    }
  ) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.helperId !== fbUser.uid) {
      throw new Error('Only the assigned helper can mark this request as completed.');
    }
    if (!['ACCEPTED', 'IN_PROGRESS', 'COMPLETED_UNCONFIRMED'].includes(target.status)) {
      throw new Error('This request cannot be marked as completed in its current state.');
    }

    const batch = writeBatch(db);
    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const subDoc: Record<string, unknown> = {
      requestId: target.requestId,
      requesterId: target.requesterId,
      helperId: fbUser.uid,
      submittedAt: serverTimestamp(),
    };
    if (payload.completionDescription?.trim()) {
      subDoc.completionDescription = payload.completionDescription.trim().slice(0, 1000);
    }
    if (payload.evidenceDataUrl) {
      subDoc.evidenceDataUrl = payload.evidenceDataUrl;
    }
    if (payload.evidenceFileName) {
      subDoc.evidenceFileName = payload.evidenceFileName.slice(0, 120);
    }

    batch.set(doc(db, 'help_completion_submissions', subId), subDoc);

    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'AWAITING_CONFIRMATION',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'notifications', notifId), {
      userId: target.requesterId,
      actorId: fbUser.uid,
      requestId: target.requestId,
      title: 'Confirm Completed Assistance',
      message:
        'Your helper has marked the assistance as completed. Please confirm if you received the help.',
      notificationType: 'CONFIRMATION_NEEDED',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: 'COMPLETION_SUBMITTED',
      entityType: 'help_request',
      entityId: target.requestId,
      previousStatus: target.status,
      newStatus: 'AWAITING_CONFIRMATION',
      details: payload.evidenceFileName ? 'Included supporting photo' : 'Marked completed',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `help_requests/${target.requestId}`);
    }
  };

  const confirmAssistance = async (
    requestId: string,
    payload: {
      rating?: number;
      feedback?: string;
      appreciationMessage?: string;
    }
  ): Promise<DigitalProof> => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.requesterId !== fbUser.uid) {
      throw new Error('Only the requester can confirm receipt of assistance.');
    }
    if (!target.helperId || target.helperId === fbUser.uid) {
      throw new Error('A helper cannot confirm their own assistance.');
    }
    if (target.status !== 'AWAITING_CONFIRMATION') {
      throw new Error('This assistance is not awaiting confirmation.');
    }

    const existingConfirmed = confirmations.find(
      (c) => c.requestId === target.requestId && c.confirmationStatus === 'CONFIRMED'
    );
    if (existingConfirmed) {
      throw new Error('Duplicate confirmation is not allowed. Assistance is already confirmed.');
    }

    const proofId = generateProofId();
    const verificationToken = generateVerificationToken();
    const helperDisplayName = target.helperDisplayName || 'Verified Community Member';
    const requesterDisplayName = target.requesterName || 'Community Member';

    const batch = writeBatch(db);

    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'COMPLETED_CONFIRMED',
      confirmedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const confDoc: Record<string, unknown> = {
      requestId: target.requestId,
      requesterId: fbUser.uid,
      helperId: target.helperId,
      confirmationStatus: 'CONFIRMED',
      confirmedAt: serverTimestamp(),
    };
    if (payload.feedback?.trim()) confDoc.feedback = payload.feedback.trim().slice(0, 600);
    if (typeof payload.rating === 'number' && payload.rating >= 1 && payload.rating <= 5) {
      confDoc.rating = payload.rating;
    }
    if (payload.appreciationMessage?.trim()) {
      confDoc.appreciationMessage = payload.appreciationMessage.trim().slice(0, 300);
    }

    batch.set(doc(db, 'help_confirmations', target.requestId), confDoc);

    const proofDoc: Record<string, unknown> = {
      proofId,
      requestId: target.requestId,
      requesterId: fbUser.uid,
      helperId: target.helperId,
      requestTitle: target.title.slice(0, 140),
      category: target.category,
      requesterDisplayName,
      helperDisplayName,
      verificationToken,
      proofStatus: 'VALID',
      confirmedAt: serverTimestamp(),
      generatedAt: serverTimestamp(),
    };
    if (payload.feedback?.trim()) {
      proofDoc.optionalFeedback = payload.feedback.trim().slice(0, 600);
    } else if (payload.appreciationMessage?.trim()) {
      proofDoc.optionalFeedback = payload.appreciationMessage.trim().slice(0, 300);
    }
    if (typeof payload.rating === 'number' && payload.rating >= 1 && payload.rating <= 5) {
      proofDoc.rating = payload.rating;
    }

    batch.set(doc(db, 'digital_proofs', proofId), proofDoc);

    const notifHelperId = `notif_${Date.now()}_h_${Math.random().toString(36).slice(2, 6)}`;
    batch.set(doc(db, 'notifications', notifHelperId), {
      userId: target.helperId,
      actorId: fbUser.uid,
      requestId: target.requestId,
      proofId,
      title: 'Digital Proof of Help Ready',
      message:
        'Your assistance has been successfully confirmed. Your Digital Proof of Help is ready.',
      notificationType: 'PROOF_GENERATED',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    const notifReqId = `notif_${Date.now()}_r_${Math.random().toString(36).slice(2, 6)}`;
    batch.set(doc(db, 'notifications', notifReqId), {
      userId: fbUser.uid,
      actorId: fbUser.uid,
      requestId: target.requestId,
      proofId,
      title: 'Digital Proof Generated',
      message: 'Your Digital Proof of Help is now available.',
      notificationType: 'PROOF_GENERATED',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: 'PROOF_GENERATED',
      entityType: 'digital_proof',
      entityId: proofId,
      previousStatus: target.status,
      newStatus: 'COMPLETED_CONFIRMED',
      details: `Confirmed request ${target.requestId} -> ${proofId}`,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `digital_proofs/${proofId}`);
    }

    return {
      id: proofId,
      proofId,
      requestId: target.requestId,
      requesterId: fbUser.uid,
      helperId: target.helperId,
      requestTitle: target.title,
      category: target.category,
      requesterDisplayName,
      helperDisplayName,
      verificationToken,
      proofStatus: 'VALID',
      optionalFeedback:
        payload.feedback?.trim() || payload.appreciationMessage?.trim() || undefined,
      rating: payload.rating,
      completedAt: target.completedAt || new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      generatedAt: new Date().toISOString(),
    };
  };

  const markNotYetReceived = async (requestId: string, explanation?: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.requesterId !== fbUser.uid) {
      throw new Error('Only the requester can update confirmation status.');
    }
    if (!target.helperId) throw new Error('No helper assigned.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'COMPLETED_UNCONFIRMED',
      updatedAt: serverTimestamp(),
    });

    const confDoc: Record<string, unknown> = {
      requestId: target.requestId,
      requesterId: fbUser.uid,
      helperId: target.helperId,
      confirmationStatus: 'NOT_YET_RECEIVED',
      confirmedAt: serverTimestamp(),
    };
    if (explanation?.trim()) confDoc.explanation = explanation.trim().slice(0, 600);
    batch.set(doc(db, 'help_confirmations', target.requestId), confDoc);

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'notifications', notifId), {
      userId: target.helperId,
      actorId: fbUser.uid,
      requestId: target.requestId,
      title: 'Assistance Not Yet Received',
      message: explanation?.trim()
        ? `Requester noted for ${target.requestId}: "${explanation.trim()}"`
        : `Requester marked ${target.requestId} as not yet received.`,
      notificationType: 'NOT_RECEIVED',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: 'NOT_YET_RECEIVED',
      entityType: 'help_request',
      entityId: target.requestId,
      previousStatus: target.status,
      newStatus: 'COMPLETED_UNCONFIRMED',
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `help_requests/${target.requestId}`);
    }
  };

  const reportIssue = async (requestId: string, issueDescription: string) => {
    const fbUser = requireSignedIn();
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target) throw new Error('Request not found.');
    if (target.requesterId !== fbUser.uid && target.helperId !== fbUser.uid) {
      throw new Error('Only involved participants can report an issue on this request.');
    }

    const issueId = `ISS-${Math.floor(10000 + Math.random() * 89999)}`;
    const batch = writeBatch(db);

    batch.update(doc(db, 'help_requests', target.requestId), {
      status: 'UNDER_REVIEW',
      updatedAt: serverTimestamp(),
    });

    const issueDoc: Record<string, unknown> = {
      requestId: target.requestId,
      reportedBy: fbUser.uid,
      requesterId: target.requesterId,
      issueDescription: issueDescription.trim().slice(0, 1000),
      issueStatus: 'UNDER_REVIEW',
      createdAt: serverTimestamp(),
    };
    if (target.helperId) issueDoc.helperId = target.helperId;

    batch.set(doc(db, 'help_issues', issueId), issueDoc);

    const otherUserId =
      fbUser.uid === target.requesterId ? target.helperId : target.requesterId;
    if (otherUserId) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      batch.set(doc(db, 'notifications', notifId), {
        userId: otherUserId,
        actorId: fbUser.uid,
        requestId: target.requestId,
        title: 'Case Under Review',
        message: `An issue was reported on ${target.requestId} and sent for administrative review.`,
        notificationType: 'ISSUE_REPORTED',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: 'ISSUE_REPORTED',
      entityType: 'help_issue',
      entityId: issueId,
      previousStatus: target.status,
      newStatus: 'UNDER_REVIEW',
      details: issueDescription.trim().slice(0, 200),
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `help_issues/${issueId}`);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${notificationId}`);
    }
  };

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true });
    });
    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  };

  const adminUpdateIssue = async (
    issueId: string,
    payload: {
      issueStatus: IssueStatus;
      adminNotes: string;
      nextRequestStatus?: RequestStatus;
    }
  ) => {
    const fbUser = requireSignedIn();
    if (!isAdmin) throw new Error('Administrator privileges required.');
    const issue = issues.find((i) => i.id === issueId);
    if (!issue) throw new Error('Issue record not found.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'help_issues', issueId), {
      issueStatus: payload.issueStatus,
      adminNotes: payload.adminNotes.trim().slice(0, 1000),
      resolvedAt: payload.issueStatus === 'RESOLVED' ? serverTimestamp() : null,
    });

    if (payload.nextRequestStatus) {
      batch.update(doc(db, 'help_requests', issue.requestId), {
        status: payload.nextRequestStatus,
        updatedAt: serverTimestamp(),
      });
    }

    const targets = [issue.requesterId, issue.helperId].filter(Boolean) as string[];
    targets.forEach((uid, idx) => {
      const notifId = `notif_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`;
      batch.set(doc(db, 'notifications', notifId), {
        userId: uid,
        actorId: fbUser.uid,
        requestId: issue.requestId,
        title: 'Admin Updated Review Status',
        message: `Admin updated issue on ${issue.requestId} to ${payload.issueStatus}.`,
        notificationType: 'ADMIN_UPDATED',
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: 'ADMIN_ISSUE_UPDATED',
      entityType: 'help_issue',
      entityId: issueId,
      previousStatus: issue.issueStatus,
      newStatus: payload.issueStatus,
      details: payload.adminNotes.trim().slice(0, 200),
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `help_issues/${issueId}`);
    }
  };

  const adminUpdateProofStatus = async (
    proofId: string,
    proofStatus: ProofStatus,
    reason?: string
  ) => {
    const fbUser = requireSignedIn();
    if (!isAdmin) throw new Error('Administrator privileges required.');
    const proof = proofs.find((p) => p.proofId === proofId || p.id === proofId);
    if (!proof) throw new Error('Digital proof record not found.');

    const batch = writeBatch(db);
    batch.update(doc(db, 'digital_proofs', proof.proofId), {
      proofStatus,
    });

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: proofStatus === 'SUSPENDED' ? 'ADMIN_PROOF_SUSPENDED' : 'ADMIN_PROOF_RESTORED',
      entityType: 'digital_proof',
      entityId: proof.proofId,
      previousStatus: proof.proofStatus,
      newStatus: proofStatus,
      details: reason?.trim().slice(0, 200) || `Proof status set to ${proofStatus}`,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `digital_proofs/${proof.proofId}`);
    }
  };

  const donateToRequest = async (
    requestId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    note?: string
  ): Promise<DonationRecord | null> => {
    const target = requests.find((r) => r.id === requestId || r.requestId === requestId);
    if (!target || amount <= 0) return null;

    const transactionRef = `HC-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const record: DonationRecord = {
      id: `don_${Math.random().toString(36).substring(2, 10)}`,
      requestId: target.requestId,
      recipientName: target.requesterName,
      description: target.description,
      amount,
      paymentMethod,
      transactionRef,
      note: note?.trim() || undefined,
      timestamp: new Date().toISOString(),
    };

    const nextCollected = (target.amountCollected ?? 0) + amount;
    const isGoalReached =
      target.amountNeeded !== undefined && nextCollected >= target.amountNeeded;

    if (firebaseUser && !target.requesterId.startsWith('sample_')) {
      try {
        await updateDoc(doc(db, 'help_requests', target.requestId), {
          amountCollected: nextCollected,
          status: isGoalReached ? 'COMPLETED_CONFIRMED' : target.status,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `help_requests/${target.requestId}`);
      }
    } else {
      setSampleRequests((prev) =>
        prev.map((req) =>
          req.id === target.id
            ? {
                ...req,
                amountCollected: nextCollected,
                status: isGoalReached ? 'COMPLETED_CONFIRMED' : req.status,
              }
            : req
        )
      );
    }

    setImpact((prev) => ({
      ...prev,
      donations: prev.donations + amount,
      peopleHelped: prev.peopleHelped + 1,
    }));

    setDonations((prev) => [record, ...prev]);
    return record;
  };

  const sendMessage = async (requestId: string, text: string) => {
    const fUser = effectiveFirebaseUser;
    if (!fUser) throw new Error('Must be signed in to chat.');
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 1000) throw new Error('Message is too long (max 1000 characters).');

    const messageId = `MSG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (!firebaseUser && isDemo) {
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          messageId,
          requestId,
          senderId: fUser.uid,
          senderName: fUser.displayName || user.name,
          text: trimmed,
          messageType: 'text',
          readBy: [fUser.uid],
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }
    const msgRef = doc(db, 'chat_messages', messageId);
    try {
      await setDoc(msgRef, {
        messageId,
        requestId,
        senderId: fUser.uid,
        senderName: fUser.displayName || 'Community Member',
        senderPhotoUrl: fUser.photoURL || null,
        text: trimmed,
        messageType: 'text',
        readBy: [fUser.uid],
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chat_messages/${messageId}`);
      throw err;
    }
  };

  // ==================================================
  // SMART BLOOD DONOR MATCHING & BROADCAST WORKFLOW
  // ==================================================

  const donorProfiles = useMemo(() => {
    return Object.values(donorProfilesMap).sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  }, [donorProfilesMap]);

  const bloodRequests = useMemo(() => {
    const merged: Record<string, BloodRequest> = {
      ...bloodRequestsOpenMap,
      ...myBloodRequestsMap,
    };
    return Object.values(merged).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bloodRequestsOpenMap, myBloodRequestsMap]);

  const bloodDonorMatches = useMemo(() => {
    const merged: Record<string, BloodDonorMatch> = {
      ...bloodMatchesDonorMap,
      ...bloodMatchesReqMap,
    };
    return Object.values(merged).sort((a, b) => b.matchScore - a.matchScore);
  }, [bloodMatchesDonorMap, bloodMatchesReqMap]);

  const bloodDonationHistory = useMemo(() => {
    const merged: Record<string, BloodDonationHistoryRecord> = {
      ...bloodHistoryDonorMap,
      ...bloodHistoryReqMap,
    };
    return Object.values(merged).sort((a, b) => b.donatedAt.localeCompare(a.donatedAt));
  }, [bloodHistoryDonorMap, bloodHistoryReqMap]);

  const myDonorProfile = useMemo(() => {
    if (!effectiveFirebaseUser) return null;
    if (myDonorProfileDoc) {
      const completedCount = bloodDonationHistory.filter(
        (h) => h.donorId === effectiveFirebaseUser.uid
      ).length;
      return {
        ...myDonorProfileDoc,
        totalDonations: Math.max(myDonorProfileDoc.totalDonations, completedCount),
      };
    }
    return donorProfilesMap[effectiveFirebaseUser.uid] || null;
  }, [effectiveFirebaseUser, myDonorProfileDoc, donorProfilesMap, bloodDonationHistory]);

  const requestPushPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushPermission('unsupported');
      return 'unsupported';
    }
    try {
      const result = await window.Notification.requestPermission();
      setPushPermission(result);
      return result;
    } catch {
      return pushPermission;
    }
  };

  // Trigger browser Push Notification for incoming unread blood alerts when permission granted & opted in
  const seenPushNotifIdsRef = React.useRef<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (window.Notification.permission !== 'granted') return;
    if (myDonorProfile && (!myDonorProfile.notifyPush || myDonorProfile.notificationsOptOut)) return;

    const freshBloodNotifs = notifications.filter(
      (n) =>
        !n.isRead &&
        n.notificationType === 'BLOOD_REQUEST_MATCH' &&
        !seenPushNotifIdsRef.current.has(n.id)
    );

    freshBloodNotifs.forEach((n) => {
      seenPushNotifIdsRef.current.add(n.id);
      try {
        new window.Notification(n.title, {
          body: n.message,
          tag: n.bloodRequestId || n.id,
        });
      } catch {
        // Ignore browser notification blocked errors
      }
    });
  }, [notifications, myDonorProfile]);

  const updateDonorProfile = async (updates: Partial<DonorProfile>) => {
    const fbUser = requireSignedIn();
    const current = myDonorProfile;
    const nextCity = (updates.city ?? current?.city ?? 'Chennai').trim().slice(0, 80);
    const nextArea = (updates.approximateArea ?? current?.approximateArea ?? nextCity).trim().slice(0, 120);
    const coords =
      typeof updates.latitude === 'number' && typeof updates.longitude === 'number'
        ? { lat: updates.latitude, lng: updates.longitude }
        : resolveCoordinatesFromLocation(nextCity, nextArea);

    const payload = {
      uid: fbUser.uid,
      displayName: (updates.displayName ?? current?.displayName ?? user.name ?? 'Community Donor').trim().slice(0, 80),
      photoUrl: updates.photoUrl ?? current?.photoUrl ?? user.profilePhoto ?? '',
      bloodGroup: updates.bloodGroup ?? current?.bloodGroup ?? '',
      bloodGroupVerified: current?.bloodGroupVerified ?? Boolean(fbUser.emailVerified && (updates.bloodGroup ?? current?.bloodGroup)),
      accountStatus: current?.accountStatus ?? 'ACTIVE',
      isAvailable: updates.isAvailable ?? current?.isAvailable ?? false,
      city: nextCity,
      approximateArea: nextArea,
      latitude: coords.lat,
      longitude: coords.lng,
      maxDistanceKm: Math.min(500, Math.max(1, updates.maxDistanceKm ?? current?.maxDistanceKm ?? 25)),
      notifyInApp: updates.notifyInApp ?? current?.notifyInApp ?? true,
      notifyPush: updates.notifyPush ?? current?.notifyPush ?? true,
      notifyEmail: updates.notifyEmail ?? current?.notifyEmail ?? true,
      notifySms: updates.notifySms ?? current?.notifySms ?? false,
      notificationsOptOut: updates.notificationsOptOut ?? current?.notificationsOptOut ?? false,
      totalDonations: current?.totalDonations ?? 0,
      updatedAt: serverTimestamp(),
    };

    // Demo mode guard: never hit Firestore with unauthenticated demo_user_123
    if (!firebaseUser) {
      const localProfile: DonorProfile = {
        id: fbUser.uid,
        uid: fbUser.uid,
        displayName: payload.displayName,
        photoUrl: payload.photoUrl,
        bloodGroup: payload.bloodGroup as BloodGroup | '',
        bloodGroupVerified: payload.bloodGroupVerified,
        accountStatus: payload.accountStatus,
        isAvailable: payload.isAvailable,
        city: payload.city,
        approximateArea: payload.approximateArea,
        latitude: payload.latitude,
        longitude: payload.longitude,
        maxDistanceKm: payload.maxDistanceKm,
        notifyInApp: payload.notifyInApp,
        notifyPush: payload.notifyPush,
        notifyEmail: payload.notifyEmail,
        notifySms: payload.notifySms,
        notificationsOptOut: payload.notificationsOptOut,
        totalDonations: payload.totalDonations,
        updatedAt: new Date().toISOString(),
      };
      setMyDonorProfileDoc(localProfile);
      setDonorProfilesMap((prev) => ({ ...prev, [fbUser.uid]: localProfile }));
      return;
    }

    try {
      await setDoc(doc(db, 'donor_profiles', fbUser.uid), payload, { merge: true });
      if (typeof updates.bloodGroup === 'string' || typeof updates.approximateArea === 'string') {
        await updateDoc(doc(db, 'users', fbUser.uid), {
          ...(typeof updates.bloodGroup === 'string' ? { bloodGroup: updates.bloodGroup } : {}),
          ...(typeof updates.approximateArea === 'string'
            ? { approximateArea: updates.approximateArea.trim().slice(0, 120) }
            : {}),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `donor_profiles/${fbUser.uid}`);
    }
  };

  const createBloodRequest = async (
    input: CreateBloodRequestInput
  ): Promise<CreateBloodRequestResult> => {
    const isHospitalOrigin = portalRole === 'HOSPITAL' && Boolean(hospitalAccount);
    const bloodRequestId = generateBloodRequestId();
    const resolvedCoords =
      typeof input.latitude === 'number' && typeof input.longitude === 'number'
        ? { lat: input.latitude, lng: input.longitude }
        : resolveCoordinatesFromLocation(input.city, input.location);

    // Demo Mode support (Hospital Demo & Community Demo)
    if (!firebaseUser && isDemo) {
      const demoUid = effectiveFirebaseUser?.uid || hospitalAccount?.uid || 'demo_hospital_001';
      const nowIso = new Date().toISOString();
      const requesterDisplayName = isHospitalOrigin
        ? hospitalAccount!.hospitalName
        : toPrivacySafeName(effectiveFirebaseUser?.displayName, 'Community Member');
      const patientDisplayName = input.patientFullName.trim().slice(0, 80) || 'Patient';
      const createdReq: BloodRequest = {
        id: bloodRequestId,
        bloodRequestId,
        requesterId: demoUid,
        requesterDisplayName,
        patientDisplayName,
        requiredBloodGroup: input.requiredBloodGroup,
        allowCompatibleGroups: Boolean(input.allowCompatibleGroups),
        requiredUnits: Math.max(1, Math.min(20, Number(input.requiredUnits) || 1)),
        fulfilledUnits: 0,
        confirmedUnits: 0,
        hospitalName: input.hospitalName.trim(),
        hospitalAddress: input.hospitalAddress.trim(),
        city: input.city.trim(),
        location: input.location.trim(),
        latitude: resolvedCoords.lat,
        longitude: resolvedCoords.lng,
        requiredDateTime: input.requiredDateTime.trim(),
        emergencyLevel: input.emergencyLevel,
        contactPersonName: input.contactPersonName.trim(),
        additionalMedicalInfo: input.additionalMedicalInfo?.trim() || undefined,
        status: 'NOTIFICATIONS_SENT',
        matchedDonorsCount: 4,
        notificationsSentCount: 4,
        interestedDonorsCount: 0,
        selectedDonorIds: [],
        assignedHospitalId: isHospitalOrigin ? hospitalAccount!.hospitalId : null,
        assignedHospitalName: isHospitalOrigin ? hospitalAccount!.hospitalName : null,
        hospitalVerified: isHospitalOrigin,
        hospitalStatus: isHospitalOrigin ? 'Donor Search Started' : 'Submitted',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setBloodRequestsOpenMap((prev) => ({ [bloodRequestId]: createdReq, ...prev }));
      return {
        request: createdReq,
        matchedCount: 4,
        notificationsSentCount: 4,
        channelBreakdown: { in_app: 4, push: 3, email: 2, sms: 1 },
      };
    }

    const fbUser = requireSignedIn();
    const requesterDisplayName = isHospitalOrigin
      ? hospitalAccount!.hospitalName.slice(0, 80)
      : toPrivacySafeName(fbUser.displayName, 'Community Member');
    const patientDisplayName = isHospitalOrigin
      ? input.patientFullName.trim().slice(0, 80)
      : toPrivacySafeName(input.patientFullName, 'Patient');

    // Fetch latest active donor profiles from Firestore to broadcast to ALL eligible donors
    let liveDonors: DonorProfile[] = donorProfiles;
    try {
      const snap = await getDocs(
        query(collection(db, 'donor_profiles'), where('accountStatus', '==', 'ACTIVE'))
      );
      if (!snap.empty) {
        liveDonors = snap.docs.map((d) =>
          mapDocToDonorProfile(d.id, d.data() as Record<string, unknown>)
        );
      }
    } catch {
      // Fallback to subscribed donorProfiles
    }

    // Also run server matching/dedup broadcast ledger API
    let channelBreakdown = { in_app: 0, push: 0, email: 0, sms: 0 };
    const matchedList = matchEligibleBloodDonors({
      requesterId: fbUser.uid,
      requiredBloodGroup: input.requiredBloodGroup,
      allowCompatibleGroups: input.allowCompatibleGroups,
      city: input.city,
      latitude: resolvedCoords.lat,
      longitude: resolvedCoords.lng,
      emergencyLevel: input.emergencyLevel,
      donors: liveDonors,
    });

    try {
      const apiRes = await fetch('/api/blood/match-and-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bloodRequestId,
          requesterId: fbUser.uid,
          requiredBloodGroup: input.requiredBloodGroup,
          allowCompatibleGroups: input.allowCompatibleGroups,
          city: input.city,
          latitude: resolvedCoords.lat,
          longitude: resolvedCoords.lng,
          donors: liveDonors,
        }),
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.channelBreakdown) {
          channelBreakdown = apiData.channelBreakdown;
        }
      }
    } catch {
      // Local matching fallback already computed above
      matchedList.forEach((m) => {
        m.notificationChannels.forEach((ch) => {
          if (ch in channelBreakdown) {
            channelBreakdown[ch as keyof typeof channelBreakdown] += 1;
          }
        });
      });
    }

    const initialStatus: BloodRequest['status'] =
      matchedList.length > 0 ? 'NOTIFICATIONS_SENT' : 'SEARCHING_FOR_DONORS';

    const reqDocPayload: Record<string, unknown> = {
      bloodRequestId,
      requesterId: fbUser.uid,
      requesterDisplayName,
      patientDisplayName,
      requiredBloodGroup: input.requiredBloodGroup,
      allowCompatibleGroups: Boolean(input.allowCompatibleGroups),
      requiredUnits: Math.max(1, Math.min(20, Number(input.requiredUnits) || 1)),
      fulfilledUnits: 0,
      confirmedUnits: 0,
      hospitalName: input.hospitalName.trim().slice(0, 140),
      hospitalAddress: input.hospitalAddress.trim().slice(0, 240),
      city: input.city.trim().slice(0, 80),
      location: input.location.trim().slice(0, 140),
      latitude: resolvedCoords.lat,
      longitude: resolvedCoords.lng,
      requiredDateTime: input.requiredDateTime.trim().slice(0, 60),
      emergencyLevel: input.emergencyLevel,
      contactPersonName: input.contactPersonName.trim().slice(0, 80),
      status: initialStatus,
      matchedDonorsCount: matchedList.length,
      notificationsSentCount: matchedList.length,
      interestedDonorsCount: 0,
      selectedDonorIds: [],
      ...(isHospitalOrigin && hospitalAccount
        ? {
            assignedHospitalId: hospitalAccount.hospitalId,
            assignedHospitalName: hospitalAccount.hospitalName.slice(0, 140),
            hospitalVerified: true,
            hospitalStatus: 'Donor Search Started' as HospitalBloodStatus,
          }
        : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.additionalMedicalInfo?.trim()) {
      reqDocPayload.additionalMedicalInfo = input.additionalMedicalInfo.trim().slice(0, 600);
    }

    const privateContactPayload: Record<string, unknown> = {
      bloodRequestId,
      requesterId: fbUser.uid,
      patientFullName: input.patientFullName.trim().slice(0, 100),
      contactPhoneNumber: input.contactPhoneNumber.trim().slice(0, 30),
      authorizedDonorIds: [],
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'blood_requests', bloodRequestId), reqDocPayload);
    batch.set(doc(db, 'blood_requests', bloodRequestId, 'private', 'contact'), privateContactPayload);

    // Broadcast deduplicated match + individual notification to EVERY eligible matched donor
    matchedList.forEach((m) => {
      const matchId = `${bloodRequestId}_${m.donor.uid}`;
      batch.set(doc(db, 'blood_donor_matches', matchId), {
        matchId,
        bloodRequestId,
        requesterId: fbUser.uid,
        donorId: m.donor.uid,
        donorDisplayName: m.donor.displayName.slice(0, 80),
        donorPhotoUrl: m.donor.photoUrl || null,
        donorBloodGroup: m.donor.bloodGroup,
        donorVerified: m.donor.bloodGroupVerified,
        donorCity: (m.donor.city || m.donor.approximateArea || 'Community').slice(0, 80),
        donorArea: (m.donor.approximateArea || m.donor.city || '').slice(0, 140) || null,
        distanceKm: m.distanceKm,
        compatibilityType: m.compatibilityType,
        matchScore: m.matchScore,
        notificationChannels: m.notificationChannels,
        responseStatus: 'NOTIFIED',
        contactSharedByDonor: false,
        contactSharedByRequester: false,
        donorConfirmedAvailable: false,
        fulfilledUnitsCount: 0,
        notifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const notifId = `blood_notif_${bloodRequestId}_${m.donor.uid}`;
      batch.set(doc(db, 'notifications', notifId), {
        userId: m.donor.uid,
        actorId: fbUser.uid,
        bloodRequestId,
        title: `${input.emergencyLevel === 'Critical' ? 'CRITICAL ' : ''}Hospital Blood Request: ${input.requiredBloodGroup} Needed`,
        message: `${input.requiredBloodGroup} (${input.requiredUnits} unit${input.requiredUnits > 1 ? 's' : ''}) urgently needed at ${input.hospitalName.trim()}, ${input.city.trim()} (${m.distanceKm} km away).`,
        notificationType: 'BLOOD_REQUEST_MATCH',
        actionUrl: `/blood?requestId=${bloodRequestId}`,
        deliveryChannels: m.notificationChannels,
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    // Notify matching active Hospitals in the same city or hospital name (skip self if hospital created it)
    if (!isHospitalOrigin) {
      const reqCityLower = input.city.trim().toLowerCase();
      const reqHospLower = input.hospitalName.trim().toLowerCase();
      const matchingHospitals = Object.values(hospitalsMap).filter(
        (h) =>
          h.status === 'ACTIVE' &&
          h.authUid !== fbUser.uid &&
          (h.city.toLowerCase() === reqCityLower ||
            reqHospLower.includes(h.name.toLowerCase()) ||
            h.name.toLowerCase().includes(reqHospLower))
      );
      matchingHospitals.forEach((h) => {
        batch.set(doc(db, 'notifications', `hosp_blood_${bloodRequestId}_${h.hospitalId}`), {
          userId: h.authUid,
          actorId: fbUser.uid,
          bloodRequestId,
          title: `New Blood Request (${input.requiredBloodGroup}) - ${input.emergencyLevel}`,
          message: `${input.requiredUnits} unit(s) of ${input.requiredBloodGroup} requested at ${input.hospitalName.trim()}, ${input.city.trim()}.`,
          notificationType: 'BLOOD_REQUEST_MATCH',
          actionUrl: `/hospital`,
          deliveryChannels: ['in_app'],
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });
    }

    const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    batch.set(doc(db, 'audit_logs', logId), {
      actorId: fbUser.uid,
      action: isHospitalOrigin ? 'HOSPITAL_BLOOD_REQUEST_BROADCAST' : 'BLOOD_REQUEST_BROADCAST',
      entityType: 'blood_request',
      entityId: bloodRequestId,
      previousStatus: 'REQUEST_SUBMITTED',
      newStatus: initialStatus,
      details: `${input.requiredBloodGroup} x${input.requiredUnits} matched & broadcast to ${matchedList.length} eligible donor(s)`,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `blood_requests/${bloodRequestId}`);
    }

    const nowIso = new Date().toISOString();
    const createdReq: BloodRequest = {
      id: bloodRequestId,
      bloodRequestId,
      requesterId: fbUser.uid,
      requesterDisplayName,
      patientDisplayName,
      requiredBloodGroup: input.requiredBloodGroup,
      allowCompatibleGroups: Boolean(input.allowCompatibleGroups),
      requiredUnits: Math.max(1, Math.min(20, Number(input.requiredUnits) || 1)),
      fulfilledUnits: 0,
      confirmedUnits: 0,
      hospitalName: input.hospitalName.trim(),
      hospitalAddress: input.hospitalAddress.trim(),
      city: input.city.trim(),
      location: input.location.trim(),
      latitude: resolvedCoords.lat,
      longitude: resolvedCoords.lng,
      requiredDateTime: input.requiredDateTime.trim(),
      emergencyLevel: input.emergencyLevel,
      contactPersonName: input.contactPersonName.trim(),
      additionalMedicalInfo: input.additionalMedicalInfo?.trim() || undefined,
      status: initialStatus,
      matchedDonorsCount: matchedList.length,
      notificationsSentCount: matchedList.length,
      interestedDonorsCount: 0,
      selectedDonorIds: [],
      assignedHospitalId: isHospitalOrigin ? hospitalAccount!.hospitalId : null,
      assignedHospitalName: isHospitalOrigin ? hospitalAccount!.hospitalName : null,
      hospitalVerified: isHospitalOrigin,
      hospitalStatus: isHospitalOrigin ? 'Donor Search Started' : 'Submitted',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return {
      request: createdReq,
      matchedCount: matchedList.length,
      notificationsSentCount: matchedList.length,
      channelBreakdown,
    };
  };

  const getBloodRequestPrivateContact = async (
    bloodRequestId: string
  ): Promise<BloodRequestPrivateContact | null> => {
    if (!effectiveFirebaseUser) return null;
    if (!firebaseUser && isDemo) {
      const target = bloodRequests.find((r) => r.bloodRequestId === bloodRequestId);
      return {
        bloodRequestId,
        requesterId: target?.requesterId || 'demo_req_1',
        patientFullName: target?.patientDisplayName || 'Demo Patient',
        contactPhoneNumber: '+91 98401 55001',
        authorizedDonorIds: [effectiveFirebaseUser.uid],
        updatedAt: new Date().toISOString(),
      };
    }
    try {
      const snap = await getDoc(doc(db, 'blood_requests', bloodRequestId, 'private', 'contact'));
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        bloodRequestId: String(d.bloodRequestId || bloodRequestId),
        requesterId: String(d.requesterId || ''),
        patientFullName: String(d.patientFullName || ''),
        contactPhoneNumber: String(d.contactPhoneNumber || ''),
        authorizedDonorIds: Array.isArray(d.authorizedDonorIds)
          ? (d.authorizedDonorIds as string[])
          : [],
        updatedAt: tsToIso(d.updatedAt) || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  };

  const respondToBloodRequest = async (
    bloodRequestId: string,
    action: 'INTERESTED' | 'REJECTED',
    rejectionReason?: string
  ) => {
    const reqTarget = bloodRequests.find((r) => r.bloodRequestId === bloodRequestId);
    if (!reqTarget) throw new Error('Blood request not found.');
    if (['REQUEST_FULFILLED', 'REQUEST_CANCELLED'].includes(reqTarget.status)) {
      throw new Error('This blood request is already closed.');
    }

    const donorUid = effectiveFirebaseUser?.uid || user.id;
    if (reqTarget.requesterId === donorUid) {
      throw new Error('You cannot respond as a donor to your own blood request.');
    }

    const matchId = `${bloodRequestId}_${donorUid}`;
    const existingMatch = bloodDonorMatches.find((m) => m.matchId === matchId);

    if (
      existingMatch &&
      action === 'INTERESTED' &&
      ['INTERESTED', 'SELECTED', 'SCHEDULED', 'COMPLETED'].includes(existingMatch.responseStatus)
    ) {
      throw new Error('Duplicate acceptance blocked: You have already accepted this blood request.');
    }

    const donorDisplayName = (
      myDonorProfile?.displayName ||
      user.name ||
      effectiveFirebaseUser?.displayName ||
      'Registered Donor'
    ).slice(0, 80);
    const donorBloodGroup: BloodGroup =
      myDonorProfile?.bloodGroup || reqTarget.requiredBloodGroup;
    const donorCity = (myDonorProfile?.city || reqTarget.city || 'Community').slice(0, 80);
    const donorArea = (
      myDonorProfile?.approximateArea ||
      myDonorProfile?.city ||
      user.location ||
      ''
    ).slice(0, 140);
    const donorPhone = (user.mobile || effectiveFirebaseUser?.phoneNumber || '').trim().slice(0, 30);
    const donorEmail = (effectiveFirebaseUser?.email || user.email || '').trim().slice(0, 160);

    if (!firebaseUser && isDemo) {
      const nowIso = new Date().toISOString();
      const nextMatch: BloodDonorMatch = existingMatch
        ? {
            ...existingMatch,
            responseStatus: action,
            donorConfirmedAvailable: action === 'INTERESTED',
            contactSharedByDonor: action === 'INTERESTED',
            donorPhone: donorPhone || existingMatch.donorPhone,
            donorEmail: donorEmail || existingMatch.donorEmail,
            donorArea: donorArea || existingMatch.donorArea,
            respondedAt: nowIso,
            updatedAt: nowIso,
          }
        : {
            id: matchId,
            matchId,
            bloodRequestId,
            requesterId: reqTarget.requesterId,
            donorId: donorUid,
            donorDisplayName,
            donorBloodGroup,
            donorVerified: Boolean(myDonorProfile?.bloodGroupVerified),
            donorCity,
            donorArea: donorArea || undefined,
            donorPhone: donorPhone || undefined,
            donorEmail: donorEmail || undefined,
            distanceKm: 3.5,
            compatibilityType: donorBloodGroup === reqTarget.requiredBloodGroup ? 'EXACT' : 'COMPATIBLE',
            matchScore: 90,
            notificationChannels: ['in_app'],
            responseStatus: action,
            contactSharedByDonor: action === 'INTERESTED',
            contactSharedByRequester: false,
            donorConfirmedAvailable: action === 'INTERESTED',
            fulfilledUnitsCount: 0,
            notifiedAt: nowIso,
            respondedAt: nowIso,
            updatedAt: nowIso,
          };
      setBloodMatchesDonorMap((prev) => ({ ...prev, [matchId]: nextMatch }));
      setBloodMatchesReqMap((prev) => ({ ...prev, [matchId]: nextMatch }));
      if (action === 'INTERESTED') {
        setBloodRequestsOpenMap((prev) =>
          prev[bloodRequestId]
            ? {
                ...prev,
                [bloodRequestId]: {
                  ...prev[bloodRequestId],
                  interestedDonorsCount: (prev[bloodRequestId].interestedDonorsCount || 0) + 1,
                  status: 'DONORS_INTERESTED',
                  updatedAt: nowIso,
                },
              }
            : prev
        );
      }
      return;
    }

    const fbUser = requireSignedIn();
    if (!existingMatch && action === 'REJECTED') {
      throw new Error('No eligible match record found for your donor account on this request.');
    }

    const batch = writeBatch(db);
    if (existingMatch) {
      batch.update(doc(db, 'blood_donor_matches', matchId), {
        responseStatus: action,
        donorConfirmedAvailable: action === 'INTERESTED',
        contactSharedByDonor: action === 'INTERESTED',
        ...(action === 'INTERESTED' && donorPhone ? { donorPhone } : {}),
        ...(action === 'INTERESTED' && donorEmail ? { donorEmail } : {}),
        ...(action === 'INTERESTED' && donorArea ? { donorArea } : {}),
        ...(action === 'REJECTED' && rejectionReason?.trim()
          ? { rejectionReason: rejectionReason.trim().slice(0, 400) }
          : {}),
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'blood_donor_matches', matchId), {
        matchId,
        bloodRequestId,
        requesterId: reqTarget.requesterId,
        donorId: fbUser.uid,
        donorDisplayName,
        donorPhotoUrl: fbUser.photoURL || null,
        donorBloodGroup,
        donorVerified: Boolean(myDonorProfile?.bloodGroupVerified),
        donorCity,
        donorArea: donorArea || null,
        donorPhone: donorPhone || null,
        donorEmail: donorEmail || null,
        distanceKm: 5,
        compatibilityType: donorBloodGroup === reqTarget.requiredBloodGroup ? 'EXACT' : 'COMPATIBLE',
        matchScore: 90,
        notificationChannels: ['in_app'],
        responseStatus: 'INTERESTED',
        contactSharedByDonor: true,
        contactSharedByRequester: false,
        donorConfirmedAvailable: true,
        fulfilledUnitsCount: 0,
        notifiedAt: serverTimestamp(),
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    if (action === 'INTERESTED') {
      const currentInterested =
        bloodDonorMatches.filter(
          (m) =>
            m.bloodRequestId === bloodRequestId &&
            ['INTERESTED', 'SELECTED', 'SCHEDULED', 'COMPLETED'].includes(m.responseStatus) &&
            m.donorId !== fbUser.uid
        ).length + 1;

      const nextStatus: BloodRequest['status'] =
        ['REQUEST_SUBMITTED', 'SEARCHING_FOR_DONORS', 'NOTIFICATIONS_SENT'].includes(reqTarget.status)
          ? 'DONORS_INTERESTED'
          : reqTarget.status;

      batch.update(doc(db, 'blood_requests', bloodRequestId), {
        interestedDonorsCount: currentInterested,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      const notifId = `blood_int_${bloodRequestId}_${fbUser.uid}`;
      batch.set(doc(db, 'notifications', notifId), {
        userId: reqTarget.requesterId,
        actorId: fbUser.uid,
        bloodRequestId,
        title: `Donor Accepted: ${donorDisplayName} (${donorBloodGroup})`,
        message: `${donorDisplayName} (${donorBloodGroup}) accepted the blood request at ${reqTarget.hospitalName}. Donor details are now visible in the portal.`,
        notificationType: 'BLOOD_DONOR_INTERESTED',
        actionUrl: reqTarget.assignedHospitalId ? `/hospital` : `/blood?requestId=${bloodRequestId}`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });

      // Also notify assigned hospital if requester was a patient/community member
      if (reqTarget.assignedHospitalId) {
        const assignedHospital = hospitalsMap[reqTarget.assignedHospitalId];
        if (assignedHospital && assignedHospital.authUid && assignedHospital.authUid !== reqTarget.requesterId) {
          batch.set(
            doc(db, 'notifications', `hosp_donor_acc_${bloodRequestId}_${fbUser.uid}`),
            {
              userId: assignedHospital.authUid,
              actorId: fbUser.uid,
              bloodRequestId,
              title: `Donor Accepted: ${donorDisplayName} (${donorBloodGroup})`,
              message: `${donorDisplayName} (${donorBloodGroup}) accepted to donate blood for ${reqTarget.bloodRequestId}. View full donor details in Accepted Donors.`,
              notificationType: 'BLOOD_DONOR_INTERESTED',
              actionUrl: `/hospital`,
              deliveryChannels: ['in_app'],
              isRead: false,
              createdAt: serverTimestamp(),
            }
          );
        }
      }
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `blood_donor_matches/${matchId}`);
    }
  };

  const selectBloodDonor = async (bloodRequestId: string, donorId: string) => {
    const reqTarget = bloodRequests.find((r) => r.bloodRequestId === bloodRequestId);
    if (!reqTarget) throw new Error('Blood request not found.');

    const matchId = `${bloodRequestId}_${donorId}`;
    const matchTarget = bloodDonorMatches.find((m) => m.matchId === matchId);
    if (!matchTarget) throw new Error('Matched donor record not found.');

    const nextSelected = Array.from(new Set([...reqTarget.selectedDonorIds, donorId]));
    const nextStatus: BloodRequest['status'] =
      ['DONATION_SCHEDULED', 'DONATION_COMPLETED', 'REQUEST_FULFILLED'].includes(reqTarget.status)
        ? reqTarget.status
        : 'DONOR_SELECTED';

    if (!firebaseUser && isDemo) {
      const nowIso = new Date().toISOString();
      setBloodMatchesReqMap((prev) => ({
        ...prev,
        [matchId]: {
          ...matchTarget,
          responseStatus: 'SELECTED',
          contactSharedByRequester: true,
          selectedAt: nowIso,
          updatedAt: nowIso,
        },
      }));
      setBloodRequestsOpenMap((prev) =>
        prev[bloodRequestId]
          ? {
              ...prev,
              [bloodRequestId]: {
                ...prev[bloodRequestId],
                selectedDonorIds: nextSelected,
                status: nextStatus,
                hospitalStatus: portalRole === 'HOSPITAL' ? 'Donors Available' : prev[bloodRequestId].hospitalStatus,
                updatedAt: nowIso,
              },
            }
          : prev
      );
      return;
    }

    const fbUser = requireSignedIn();
    const isAuthorizedHospital = portalRole === 'HOSPITAL' && Boolean(hospitalAccount);
    if (reqTarget.requesterId !== fbUser.uid && !isAuthorizedHospital) {
      throw new Error('Only the requester or managing hospital can select donors.');
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'blood_donor_matches', matchId), {
      responseStatus: 'SELECTED',
      contactSharedByRequester: true,
      selectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'blood_requests', bloodRequestId), {
      selectedDonorIds: nextSelected,
      status: nextStatus,
      ...(isAuthorizedHospital && hospitalAccount
        ? {
            assignedHospitalId: hospitalAccount.hospitalId,
            assignedHospitalName: hospitalAccount.hospitalName.slice(0, 140),
            hospitalVerified: true,
            hospitalStatus: 'Donors Available' as HospitalBloodStatus,
          }
        : {}),
      updatedAt: serverTimestamp(),
    });

    // Grant donor authorized access to patient full name & contact phone number
    batch.update(doc(db, 'blood_requests', bloodRequestId, 'private', 'contact'), {
      authorizedDonorIds: nextSelected,
      updatedAt: serverTimestamp(),
    });

    const notifId = `blood_sel_${bloodRequestId}_${donorId}`;
    batch.set(doc(db, 'notifications', notifId), {
      userId: donorId,
      actorId: fbUser.uid,
      bloodRequestId,
      title: 'You Were Selected as Blood Donor!',
      message: `${isAuthorizedHospital ? hospitalAccount!.hospitalName : 'Requester'} selected you for ${reqTarget.requiredBloodGroup} donation at ${reqTarget.hospitalName}. Contact details and chat are now unlocked.`,
      notificationType: 'BLOOD_DONOR_SELECTED',
      actionUrl: `/blood?requestId=${bloodRequestId}`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `blood_requests/${bloodRequestId}`);
    }
  };

  const scheduleBloodDonation = async (
    bloodRequestId: string,
    donorId: string,
    scheduledDateTime: string
  ) => {
    const reqTarget = bloodRequests.find((r) => r.bloodRequestId === bloodRequestId);
    if (!reqTarget) throw new Error('Blood request not found.');
    const matchId = `${bloodRequestId}_${donorId}`;

    if (!firebaseUser && isDemo) {
      const nowIso = new Date().toISOString();
      setBloodMatchesReqMap((prev) =>
        prev[matchId]
          ? {
              ...prev,
              [matchId]: {
                ...prev[matchId],
                responseStatus: 'SCHEDULED',
                scheduledDateTime: scheduledDateTime.trim().slice(0, 60),
                updatedAt: nowIso,
              },
            }
          : prev
      );
      setBloodRequestsOpenMap((prev) =>
        prev[bloodRequestId]
          ? {
              ...prev,
              [bloodRequestId]: {
                ...prev[bloodRequestId],
                status: 'DONATION_SCHEDULED',
                hospitalStatus: portalRole === 'HOSPITAL' ? 'Donation Scheduled' : prev[bloodRequestId].hospitalStatus,
                updatedAt: nowIso,
              },
            }
          : prev
      );
      return;
    }

    const fbUser = requireSignedIn();
    const isAuthorizedHospital = portalRole === 'HOSPITAL' && Boolean(hospitalAccount);
    if (reqTarget.requesterId !== fbUser.uid && !isAuthorizedHospital) {
      throw new Error('Only the requester or managing hospital can schedule the donation time.');
    }

    const batch = writeBatch(db);

    batch.update(doc(db, 'blood_donor_matches', matchId), {
      responseStatus: 'SCHEDULED',
      scheduledDateTime: scheduledDateTime.trim().slice(0, 60),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'blood_requests', bloodRequestId), {
      status: 'DONATION_SCHEDULED',
      ...(isAuthorizedHospital && hospitalAccount
        ? {
            assignedHospitalId: hospitalAccount.hospitalId,
            assignedHospitalName: hospitalAccount.hospitalName.slice(0, 140),
            hospitalStatus: 'Donation Scheduled' as HospitalBloodStatus,
          }
        : {}),
      updatedAt: serverTimestamp(),
    });

    const notifId = `blood_sch_${bloodRequestId}_${donorId}_${Date.now()}`;
    batch.set(doc(db, 'notifications', notifId), {
      userId: donorId,
      actorId: fbUser.uid,
      bloodRequestId,
      title: 'Blood Donation Scheduled',
      message: `Your donation at ${reqTarget.hospitalName} is scheduled for ${scheduledDateTime}.`,
      notificationType: 'BLOOD_DONATION_SCHEDULED',
      actionUrl: `/blood?requestId=${bloodRequestId}`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `blood_donor_matches/${matchId}`);
    }
  };

  const completeBloodDonationUnits = async (
    bloodRequestId: string,
    donorId: string,
    unitsDonated: number,
    notes?: string
  ) => {
    const reqTarget = bloodRequests.find((r) => r.bloodRequestId === bloodRequestId);
    if (!reqTarget) throw new Error('Blood request not found.');

    const matchId = `${bloodRequestId}_${donorId}`;
    const matchTarget = bloodDonorMatches.find((m) => m.matchId === matchId);
    if (!matchTarget) throw new Error('Donor match record not found.');

    const unitsToAdd = Math.max(1, Math.min(20, Number(unitsDonated) || 1));
    const nextConfirmed = Math.min(20, reqTarget.confirmedUnits + unitsToAdd);
    const nextFulfilled = Math.min(20, reqTarget.fulfilledUnits + unitsToAdd);
    const isNowFulfilled = nextConfirmed >= reqTarget.requiredUnits;
    const nextReqStatus: BloodRequest['status'] = isNowFulfilled
      ? 'REQUEST_FULFILLED'
      : 'DONATION_COMPLETED';

    if (!firebaseUser && isDemo) {
      const nowIso = new Date().toISOString();
      const historyId = `DH-${Date.now().toString(36).toUpperCase()}-${donorId.slice(0, 6)}`;
      setBloodMatchesReqMap((prev) => ({
        ...prev,
        [matchId]: {
          ...matchTarget,
          responseStatus: 'COMPLETED',
          fulfilledUnitsCount: (matchTarget.fulfilledUnitsCount || 0) + unitsToAdd,
          completedAt: nowIso,
          updatedAt: nowIso,
        },
      }));
      setBloodRequestsOpenMap((prev) =>
        prev[bloodRequestId]
          ? {
              ...prev,
              [bloodRequestId]: {
                ...prev[bloodRequestId],
                fulfilledUnits: nextFulfilled,
                confirmedUnits: nextConfirmed,
                status: nextReqStatus,
                hospitalStatus: isNowFulfilled ? 'Request Fulfilled' : 'Donation Completed',
                fulfilledAt: isNowFulfilled ? nowIso : prev[bloodRequestId].fulfilledAt,
                updatedAt: nowIso,
              },
            }
          : prev
      );
      setBloodHistoryReqMap((prev) => ({
        [historyId]: {
          id: historyId,
          historyId,
          bloodRequestId,
          requesterId: reqTarget.requesterId,
          donorId,
          donorDisplayName: matchTarget.donorDisplayName,
          requesterDisplayName: reqTarget.requesterDisplayName,
          hospitalName: reqTarget.hospitalName,
          city: reqTarget.city,
          bloodGroup: matchTarget.donorBloodGroup,
          unitsDonated: unitsToAdd,
          status: 'VERIFIED',
          notes: notes?.trim() || undefined,
          donatedAt: nowIso,
        },
        ...prev,
      }));
      return;
    }

    const fbUser = requireSignedIn();
    const isAuthorizedHospital = portalRole === 'HOSPITAL' && Boolean(hospitalAccount);
    if (reqTarget.requesterId !== fbUser.uid && !isAuthorizedHospital) {
      throw new Error('Only the requester or managing hospital can verify and confirm blood units received.');
    }

    const batch = writeBatch(db);

    batch.update(doc(db, 'blood_donor_matches', matchId), {
      responseStatus: 'COMPLETED',
      fulfilledUnitsCount: (matchTarget.fulfilledUnitsCount || 0) + unitsToAdd,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.update(doc(db, 'blood_requests', bloodRequestId), {
      fulfilledUnits: nextFulfilled,
      confirmedUnits: nextConfirmed,
      status: nextReqStatus,
      ...(isAuthorizedHospital && hospitalAccount
        ? {
            assignedHospitalId: hospitalAccount.hospitalId,
            assignedHospitalName: hospitalAccount.hospitalName.slice(0, 140),
            hospitalVerified: true,
            hospitalStatus: (isNowFulfilled ? 'Request Fulfilled' : 'Donation Completed') as HospitalBloodStatus,
          }
        : {}),
      ...(isNowFulfilled ? { fulfilledAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    });

    const historyId = `DH-${Date.now().toString(36).toUpperCase()}-${donorId.slice(0, 6)}`;
    batch.set(doc(db, 'donation_history', historyId), {
      historyId,
      bloodRequestId,
      requesterId: reqTarget.requesterId,
      donorId,
      donorDisplayName: matchTarget.donorDisplayName,
      requesterDisplayName: reqTarget.requesterDisplayName,
      hospitalName: reqTarget.hospitalName,
      city: reqTarget.city,
      bloodGroup: matchTarget.donorBloodGroup,
      unitsDonated: unitsToAdd,
      status: 'VERIFIED',
      ...(notes?.trim() ? { notes: notes.trim().slice(0, 500) } : {}),
      donatedAt: serverTimestamp(),
    });

    // Notify completed donor
    batch.set(doc(db, 'notifications', `blood_done_${bloodRequestId}_${donorId}_${Date.now()}`), {
      userId: donorId,
      actorId: fbUser.uid,
      bloodRequestId,
      title: 'Blood Donation Confirmed & Verified',
      message: `Thank you! ${unitsToAdd} unit(s) of ${matchTarget.donorBloodGroup} donation at ${reqTarget.hospitalName} was confirmed.`,
      notificationType: 'BLOOD_DONATION_COMPLETED',
      actionUrl: `/blood?requestId=${bloodRequestId}`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // If all required units are fulfilled, auto-close remaining open matches & notify remaining donors
    const closedDonorIds: string[] = [];
    if (isNowFulfilled) {
      const remainingOpenMatches = bloodDonorMatches.filter(
        (m) =>
          m.bloodRequestId === bloodRequestId &&
          m.donorId !== donorId &&
          ['NOTIFIED', 'INTERESTED'].includes(m.responseStatus)
      );

      remainingOpenMatches.forEach((rm) => {
        closedDonorIds.push(rm.donorId);
        batch.update(doc(db, 'blood_donor_matches', rm.matchId), {
          responseStatus: 'CLOSED_FULFILLED',
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'notifications', `blood_closed_${bloodRequestId}_${rm.donorId}`), {
          userId: rm.donorId,
          actorId: fbUser.uid,
          bloodRequestId,
          title: `Blood Request ${bloodRequestId} Fulfilled & Closed`,
          message: `Thank you for your readiness! The ${reqTarget.requiredBloodGroup} blood request at ${reqTarget.hospitalName} has now been fulfilled.`,
          notificationType: 'BLOOD_REQUEST_CLOSED',
          actionUrl: `/blood`,
          deliveryChannels: ['in_app'],
          isRead: false,
          createdAt: serverTimestamp(),
        });
      });
    }

    try {
      await batch.commit();
      if (isNowFulfilled && closedDonorIds.length > 0) {
        void fetch(`/api/blood/requests/${bloodRequestId}/notify-closure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ closedDonorIds }),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `blood_requests/${bloodRequestId}`);
    }
  };

  const cancelBloodRequest = async (bloodRequestId: string, reason?: string) => {
    const fbUser = requireSignedIn();
    const reqTarget = bloodRequests.find((r) => r.bloodRequestId === bloodRequestId);
    if (!reqTarget) throw new Error('Blood request not found.');
    if (reqTarget.requesterId !== fbUser.uid) {
      throw new Error('Only the requester can cancel this blood request.');
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'blood_requests', bloodRequestId), {
      status: 'REQUEST_CANCELLED',
      cancellationReason: (reason?.trim() || 'Cancelled by requester').slice(0, 400),
      updatedAt: serverTimestamp(),
    });

    const activeMatches = bloodDonorMatches.filter(
      (m) =>
        m.bloodRequestId === bloodRequestId &&
        ['NOTIFIED', 'INTERESTED', 'SELECTED', 'SCHEDULED'].includes(m.responseStatus)
    );

    activeMatches.forEach((m) => {
      batch.update(doc(db, 'blood_donor_matches', m.matchId), {
        responseStatus: 'CANCELLED',
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', `blood_can_${bloodRequestId}_${m.donorId}`), {
        userId: m.donorId,
        actorId: fbUser.uid,
        bloodRequestId,
        title: `Blood Request ${bloodRequestId} Cancelled`,
        message: `The blood request at ${reqTarget.hospitalName} has been cancelled by the requester.`,
        notificationType: 'BLOOD_REQUEST_CLOSED',
        actionUrl: `/blood`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `blood_requests/${bloodRequestId}`);
    }
  };

  const sendBloodChatMessage = async (
    bloodRequestId: string,
    payload: {
      recipientId: string;
      text: string;
      messageType?: ChatMessageType;
      hospitalName?: string;
      hospitalAddress?: string;
      latitude?: number;
      longitude?: number;
      sharedContact?: string;
    }
  ) => {
    const fUser = requireSignedIn();
    const trimmed = payload.text.trim();
    if (!trimmed) return;
    if (trimmed.length > 1000) throw new Error('Message is too long (max 1000 characters).');

    const messageId = `BMSG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    if (!firebaseUser && isDemo) {
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          messageId,
          requestId: bloodRequestId,
          recipientId: payload.recipientId,
          senderId: fUser.uid,
          senderName: fUser.displayName || 'Hospital Desk',
          text: trimmed,
          messageType: payload.messageType || 'text',
          readBy: [fUser.uid],
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }
    const msgDoc: Record<string, unknown> = {
      messageId,
      requestId: bloodRequestId,
      recipientId: payload.recipientId,
      senderId: fUser.uid,
      senderName: toPrivacySafeName(fUser.displayName, 'Community Member'),
      senderPhotoUrl: fUser.photoURL || null,
      text: trimmed,
      messageType: payload.messageType || 'text',
      readBy: [fUser.uid],
      createdAt: serverTimestamp(),
    };
    if (payload.hospitalName) msgDoc.hospitalName = payload.hospitalName.slice(0, 140);
    if (payload.hospitalAddress) msgDoc.hospitalAddress = payload.hospitalAddress.slice(0, 240);
    if (typeof payload.latitude === 'number') msgDoc.latitude = payload.latitude;
    if (typeof payload.longitude === 'number') msgDoc.longitude = payload.longitude;
    if (payload.sharedContact) msgDoc.sharedContact = payload.sharedContact.slice(0, 40);

    try {
      await setDoc(doc(db, 'chat_messages', messageId), msgDoc);

      // If donor shares contact or confirms availability via chat, also mirror flags on match doc
      const matchIdCandidateA = `${bloodRequestId}_${fUser.uid}`;
      const matchIdCandidateB = `${bloodRequestId}_${payload.recipientId}`;
      const activeMatch = bloodDonorMatches.find(
        (m) => m.matchId === matchIdCandidateA || m.matchId === matchIdCandidateB
      );
      if (activeMatch) {
        if (payload.messageType === 'availability_confirm' && activeMatch.donorId === fUser.uid) {
          await updateDoc(doc(db, 'blood_donor_matches', activeMatch.matchId), {
            donorConfirmedAvailable: true,
            updatedAt: serverTimestamp(),
          });
        } else if (payload.messageType === 'contact_share') {
          if (activeMatch.donorId === fUser.uid) {
            await updateDoc(doc(db, 'blood_donor_matches', activeMatch.matchId), {
              contactSharedByDonor: true,
              updatedAt: serverTimestamp(),
            });
          } else if (activeMatch.requesterId === fUser.uid) {
            await updateDoc(doc(db, 'blood_donor_matches', activeMatch.matchId), {
              contactSharedByRequester: true,
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chat_messages/${messageId}`);
      throw err;
    }
  };

  const markChatMessagesRead = async (requestId: string, partnerId?: string) => {
    const fUser = effectiveFirebaseUser;
    if (!fUser) return;
    const unread = messages.filter(
      (m) =>
        m.requestId === requestId &&
        m.senderId !== fUser.uid &&
        (!partnerId || m.senderId === partnerId || m.recipientId === partnerId) &&
        !(m.readBy || []).includes(fUser.uid)
    );
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.slice(0, 25).forEach((m) => {
      batch.update(doc(db, 'chat_messages', m.messageId || m.id), {
        readBy: arrayUnion(fUser.uid),
      });
    });
    try {
      await batch.commit();
    } catch {
      // Ignore read receipt sync edge errors
    }
  };

  // ==================================================
  // DERIVED MULTI-PORTAL & FOOD PORTAL COLLECTIONS
  // ==================================================
  const hospitals = useMemo(
    () => Object.values(hospitalsMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [hospitalsMap]
  );

  const homeageOrganizations = useMemo(
    () => Object.values(homeagesMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [homeagesMap]
  );

  const doctors = useMemo(
    () => Object.values(doctorsMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [doctorsMap]
  );

  const doctorAppointments = useMemo(
    () => Object.values(appointmentsMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [appointmentsMap]
  );

  const foodDonations = useMemo(
    () =>
      Object.values(foodDonationsMap)
        .map((fd) => {
          if (
            !['Completed', 'Cancelled', 'Expired'].includes(fd.status) &&
            isDeadlineExpired(fd.collectionDeadline)
          ) {
            return { ...fd, status: 'Expired' as const };
          }
          return fd;
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [foodDonationsMap]
  );

  const foodCollectionRequests = useMemo(() => {
    const merged: Record<string, FoodCollectionRequest> = {
      ...foodCollectionReqMap,
      ...foodCollectionDonorMap,
    };
    return Object.values(merged).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [foodCollectionReqMap, foodCollectionDonorMap]);

  const foodAssistanceRequests = useMemo(
    () => Object.values(foodAssistanceMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [foodAssistanceMap]
  );

  const foodContributions = useMemo(
    () => Object.values(foodContributionsMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [foodContributionsMap]
  );

  const moneyDonations = useMemo(
    () => Object.values(moneyDonationsMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [moneyDonationsMap]
  );

  const volunteerRegistrations = useMemo(
    () => Object.values(volunteersMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [volunteersMap]
  );

  const foodCertificates = useMemo(() => {
    const merged: Record<string, FoodDonationCertificate> = {
      ...foodCertsDonorMap,
      ...foodCertsReceiverMap,
    };
    return Object.values(merged).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }, [foodCertsDonorMap, foodCertsReceiverMap]);

  // ==================================================
  // SELF-REGISTRATION: HOSPITAL & FOOD HOMEAGE PORTALS
  // ==================================================
  const registerHospitalAccount = async (
    input: CreateHospitalAccountInput
  ): Promise<HospitalOrganization> => {
    const useGoogleUser = Boolean(input.useCurrentAuthUser);
    const currentAuthUser = useGoogleUser ? auth.currentUser : null;
    if (useGoogleUser && !currentAuthUser) {
      throw new Error('Google sign-in session expired. Please click Continue with Google again.');
    }

    const cleanName = input.name.trim().slice(0, 140);
    const cleanRegNo = input.registrationNumber.trim().slice(0, 80);
    const cleanAddress = input.address.trim().slice(0, 240);
    const cleanCity = input.city.trim().slice(0, 80);
    const cleanState = input.state.trim().slice(0, 80);
    const cleanContact = input.contactPerson.trim().slice(0, 100);
    const cleanMobile = input.mobile.trim().slice(0, 30);
    const cleanEmail = (useGoogleUser && currentAuthUser?.email ? currentAuthUser.email : input.email)
      .trim()
      .toLowerCase()
      .slice(0, 160);
    const cleanUsername = input.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60);

    if (cleanName.length < 2) throw new Error('Hospital name must be at least 2 characters.');
    if (cleanRegNo.length < 2) throw new Error('Official hospital registration / license number is required.');
    if (cleanAddress.length < 3) throw new Error('Please enter the complete hospital street address.');
    if (cleanCity.length < 2 || cleanState.length < 2) throw new Error('City and State are required.');
    if (cleanContact.length < 2) throw new Error('Contact person / blood bank officer name is required.');
    if (cleanMobile.length < 6) throw new Error('Please enter a valid official contact phone number.');
    if (!cleanEmail.includes('@')) throw new Error('Please enter a valid official hospital email address.');
    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 letters, numbers, dashes, or underscores.');
    }
    if (!useGoogleUser && (input.password || '').length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (useGoogleUser && currentAuthUser) {
      const [existingHosp, existingHom] = await Promise.all([
        getDoc(doc(db, 'hospital_users', currentAuthUser.uid)),
        getDoc(doc(db, 'homeage_users', currentAuthUser.uid)),
      ]);
      if (existingHosp.exists()) {
        throw new Error('This Google account is already registered as a Hospital account. Please sign in instead.');
      }
      if (existingHom.exists()) {
        throw new Error(
          'This Google account is already registered for the Orphanage Portal. Please use a separate Google account for the Hospital Portal.'
        );
      }
    }

    // Check username availability first
    const existingUname = await getDoc(doc(db, 'org_usernames', cleanUsername));
    if (existingUname.exists()) {
      throw new Error(`Username "${cleanUsername}" is already registered. Please choose another.`);
    }

    // Clear any demo state before creating live account
    setIsDemo(false);
    setDemoMultiRole(false);
    setDemoPortalRole(null);
    localStorage.removeItem('helpconnect_demo');
    localStorage.removeItem('helpconnect_demo_role');
    localStorage.removeItem('helpconnect_demo_multi_role');

    let uid = '';
    if (useGoogleUser && currentAuthUser) {
      uid = currentAuthUser.uid;
    } else {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password || '');
      uid = cred.user.uid;
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch {
        // non-blocking
      }
    }

    const hospitalId = `HSP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    const hospDoc: Record<string, unknown> = {
      hospitalId,
      name: cleanName,
      registrationNumber: cleanRegNo,
      address: cleanAddress,
      city: cleanCity,
      state: cleanState,
      contactPerson: cleanContact,
      mobile: cleanMobile,
      email: cleanEmail,
      username: cleanUsername,
      authUid: uid,
      status: 'ACTIVE',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.hospitalType?.trim()) {
      hospDoc.hospitalType = input.hospitalType.trim().slice(0, 80);
    }
    if (input.bloodBankLicense?.trim()) {
      hospDoc.bloodBankLicense = input.bloodBankLicense.trim().slice(0, 80);
    }
    if (input.postalCode?.trim()) {
      hospDoc.postalCode = input.postalCode.trim().slice(0, 20);
    }

    const hospUserDoc = {
      uid,
      hospitalId,
      hospitalName: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      role: 'HOSPITAL' as const,
      status: 'ACTIVE' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'hospitals', hospitalId), hospDoc);
    batch.set(doc(db, 'hospital_users', uid), hospUserDoc);
    batch.set(doc(db, 'org_usernames', cleanUsername), {
      username: cleanUsername,
      email: cleanEmail,
      role: 'HOSPITAL',
      orgId: hospitalId,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${hospitalId}`), {
      actorId: uid,
      action: 'HOSPITAL_SELF_REGISTER',
      entityType: 'hospital',
      entityId: hospitalId,
      previousStatus: 'NONE',
      newStatus: 'ACTIVE',
      details: `Hospital self-registered: ${cleanName} (${cleanCity})`,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      if (!useGoogleUser) {
        await signOut(auth).catch(() => {});
      }
      throw err;
    }

    const createdOrg: HospitalOrganization = {
      id: hospitalId,
      hospitalId,
      name: cleanName,
      hospitalType: input.hospitalType?.trim() || undefined,
      registrationNumber: cleanRegNo,
      bloodBankLicense: input.bloodBankLicense?.trim() || undefined,
      address: cleanAddress,
      city: cleanCity,
      state: cleanState,
      postalCode: input.postalCode?.trim() || undefined,
      contactPerson: cleanContact,
      mobile: cleanMobile,
      email: cleanEmail,
      username: cleanUsername,
      authUid: uid,
      status: 'ACTIVE',
      createdBy: uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setHospitalAccount({
      id: uid,
      uid,
      hospitalId,
      hospitalName: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      role: 'HOSPITAL',
      status: 'ACTIVE',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setHospitalsMap((prev) => ({ ...prev, [hospitalId]: createdOrg }));
    sessionStorage.setItem('helpconnect_active_portal', 'HOSPITAL');
    setSelectedPortal('HOSPITAL');
    setRoleResolved(true);
    return createdOrg;
  };

  const registerHomeageAccount = async (
    input: CreateHomeageAccountInput
  ): Promise<HomeageOrganization> => {
    const useGoogleUser = Boolean(input.useCurrentAuthUser);
    const currentAuthUser = useGoogleUser ? auth.currentUser : null;
    if (useGoogleUser && !currentAuthUser) {
      throw new Error('Google sign-in session expired. Please click Continue with Google again.');
    }

    const cleanName = input.name.trim().slice(0, 140);
    const cleanAddress = input.address.trim().slice(0, 240);
    const cleanCity = input.city.trim().slice(0, 80);
    const cleanState = input.state.trim().slice(0, 80);
    const cleanContact = input.contactPerson.trim().slice(0, 100);
    const cleanMobile = input.mobile.trim().slice(0, 30);
    const cleanEmail = (useGoogleUser && currentAuthUser?.email ? currentAuthUser.email : input.email)
      .trim()
      .toLowerCase()
      .slice(0, 160);
    const cleanUsername = input.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 60);

    if (cleanName.length < 2) throw new Error('Orphanage / organization name must be at least 2 characters.');
    if (cleanAddress.length < 3) throw new Error('Please enter the complete organization street address.');
    if (cleanCity.length < 2 || cleanState.length < 2) throw new Error('City and State are required.');
    if (cleanContact.length < 2) throw new Error('Coordinator / contact person name is required.');
    if (cleanMobile.length < 6) throw new Error('Please enter a valid contact mobile number.');
    if (!cleanEmail.includes('@')) throw new Error('Please enter a valid organization email address.');
    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 letters, numbers, dashes, or underscores.');
    }
    if (!useGoogleUser && (input.password || '').length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (useGoogleUser && currentAuthUser) {
      const [existingHom, existingHosp] = await Promise.all([
        getDoc(doc(db, 'homeage_users', currentAuthUser.uid)),
        getDoc(doc(db, 'hospital_users', currentAuthUser.uid)),
      ]);
      if (existingHom.exists()) {
        throw new Error('This Google account is already registered as an Orphanage account. Please sign in instead.');
      }
      if (existingHosp.exists()) {
        throw new Error(
          'This Google account is already registered for the Hospital Portal. Please use a separate Google account for the Orphanage Portal.'
        );
      }
    }

    const existingUname = await getDoc(doc(db, 'org_usernames', cleanUsername));
    if (existingUname.exists()) {
      throw new Error(`Username "${cleanUsername}" is already registered. Please choose another.`);
    }

    setIsDemo(false);
    setDemoMultiRole(false);
    setDemoPortalRole(null);
    localStorage.removeItem('helpconnect_demo');
    localStorage.removeItem('helpconnect_demo_role');
    localStorage.removeItem('helpconnect_demo_multi_role');

    let uid = '';
    if (useGoogleUser && currentAuthUser) {
      uid = currentAuthUser.uid;
    } else {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password || '');
      uid = cred.user.uid;
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch {
        // non-blocking
      }
    }

    const homeageId = `HMG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    const homeageDoc: Record<string, unknown> = {
      homeageId,
      name: cleanName,
      contactPerson: cleanContact,
      mobile: cleanMobile,
      email: cleanEmail,
      address: cleanAddress,
      city: cleanCity,
      state: cleanState,
      username: cleanUsername,
      authUid: uid,
      status: 'ACTIVE',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.organizationType?.trim()) {
      homeageDoc.organizationType = input.organizationType.trim().slice(0, 80);
    }
    if (input.registrationNumber?.trim()) {
      homeageDoc.registrationNumber = input.registrationNumber.trim().slice(0, 80);
    }
    if (typeof input.dailyCapacity === 'number' && Number.isFinite(input.dailyCapacity) && input.dailyCapacity >= 1) {
      homeageDoc.dailyCapacity = Math.min(50000, Math.round(input.dailyCapacity));
    }
    if (input.postalCode?.trim()) {
      homeageDoc.postalCode = input.postalCode.trim().slice(0, 20);
    }

    const homeageUserDoc = {
      uid,
      homeageId,
      homeageName: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      role: 'HOMEAGE' as const,
      status: 'ACTIVE' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'homeage_organizations', homeageId), homeageDoc);
    batch.set(doc(db, 'homeage_users', uid), homeageUserDoc);
    batch.set(doc(db, 'org_usernames', cleanUsername), {
      username: cleanUsername,
      email: cleanEmail,
      role: 'HOMEAGE',
      orgId: homeageId,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${homeageId}`), {
      actorId: uid,
      action: 'HOMEAGE_SELF_REGISTER',
      entityType: 'homeage',
      entityId: homeageId,
      previousStatus: 'NONE',
      newStatus: 'ACTIVE',
      details: `Food Homeage self-registered: ${cleanName} (${cleanCity})`,
      createdAt: serverTimestamp(),
    });

    try {
      await batch.commit();
    } catch (err) {
      if (!useGoogleUser) {
        await signOut(auth).catch(() => {});
      }
      throw err;
    }

    const createdOrg: HomeageOrganization = {
      id: homeageId,
      homeageId,
      name: cleanName,
      organizationType: input.organizationType?.trim() || undefined,
      registrationNumber: input.registrationNumber?.trim() || undefined,
      dailyCapacity:
        typeof input.dailyCapacity === 'number' && input.dailyCapacity >= 1
          ? Math.round(input.dailyCapacity)
          : undefined,
      contactPerson: cleanContact,
      mobile: cleanMobile,
      email: cleanEmail,
      address: cleanAddress,
      city: cleanCity,
      state: cleanState,
      postalCode: input.postalCode?.trim() || undefined,
      username: cleanUsername,
      authUid: uid,
      status: 'ACTIVE',
      createdBy: uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setHomeageAccount({
      id: uid,
      uid,
      homeageId,
      homeageName: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      role: 'HOMEAGE',
      status: 'ACTIVE',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setHomeagesMap((prev) => ({ ...prev, [homeageId]: createdOrg }));
    sessionStorage.setItem('helpconnect_active_portal', 'HOMEAGE');
    setSelectedPortal('HOMEAGE');
    setRoleResolved(true);
    return createdOrg;
  };

  // ==================================================
  // ADMIN PORTAL: HOSPITAL & HOMEAGE ACCOUNT PROVISIONING
  // ==================================================
  const adminCreateHospitalAccount = async (
    input: CreateHospitalAccountInput
  ): Promise<HospitalOrganization> => {
    if (!effectiveFirebaseUser || !isAdmin) {
      throw new Error('Only authorized administrators can register hospital accounts.');
    }
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanUsername = input.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 alphanumeric characters.');
    }
    if ((input.password || '').length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (!firebaseUser && isDemo) {
      const hospitalId = `HSP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const nowIso = new Date().toISOString();
      const created: HospitalOrganization = {
        id: hospitalId,
        hospitalId,
        name: input.name.trim(),
        registrationNumber: input.registrationNumber.trim(),
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        contactPerson: input.contactPerson.trim(),
        mobile: input.mobile.trim(),
        email: cleanEmail,
        username: cleanUsername,
        authUid: `demo_hosp_${Date.now()}`,
        status: 'ACTIVE',
        createdBy: effectiveFirebaseUser.uid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setHospitalsMap((prev) => ({ ...prev, [hospitalId]: created }));
      return created;
    }

    // Check username availability
    const existingUname = await getDoc(doc(db, 'org_usernames', cleanUsername));
    if (existingUname.exists()) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }

    // Create real Firebase Auth user on secondaryAuth so Admin stays logged in!
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, input.password || '');
    const newUid = cred.user.uid;
    await signOut(secondaryAuth);

    const hospitalId = `HSP-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    const hospDoc = {
      hospitalId,
      name: input.name.trim().slice(0, 140),
      registrationNumber: input.registrationNumber.trim().slice(0, 80),
      address: input.address.trim().slice(0, 240),
      city: input.city.trim().slice(0, 80),
      state: input.state.trim().slice(0, 80),
      contactPerson: input.contactPerson.trim().slice(0, 100),
      mobile: input.mobile.trim().slice(0, 30),
      email: cleanEmail.slice(0, 160),
      username: cleanUsername.slice(0, 60),
      authUid: newUid,
      status: 'ACTIVE' as const,
      createdBy: firebaseUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'hospitals', hospitalId), hospDoc);
    batch.set(doc(db, 'hospital_users', newUid), {
      uid: newUid,
      hospitalId,
      hospitalName: hospDoc.name,
      email: cleanEmail,
      username: cleanUsername,
      role: 'HOSPITAL',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'org_usernames', cleanUsername), {
      username: cleanUsername,
      email: cleanEmail,
      role: 'HOSPITAL',
      orgId: hospitalId,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${hospitalId}`), {
      actorId: firebaseUser.uid,
      action: 'ADMIN_CREATE_HOSPITAL',
      entityType: 'hospital',
      entityId: hospitalId,
      previousStatus: 'NONE',
      newStatus: 'ACTIVE',
      details: `Registered hospital ${hospDoc.name} (${cleanEmail})`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return {
      id: hospitalId,
      ...hospDoc,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const adminUpdateHospital = async (
    hospitalId: string,
    updates: Partial<HospitalOrganization> & { status?: OrganizationStatus }
  ) => {
    if (!effectiveFirebaseUser || !isAdmin) {
      throw new Error('Only authorized administrators can update hospital accounts.');
    }
    const existing = hospitals.find((h) => h.hospitalId === hospitalId);
    if (!existing) throw new Error('Hospital not found.');
    if (!firebaseUser && isDemo) {
      setHospitalsMap((prev) => ({
        ...prev,
        [hospitalId]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      }));
      return;
    }

    const nextName = (updates.name ?? existing.name).trim().slice(0, 140);
    const nextStatus = updates.status ?? existing.status;

    const batch = writeBatch(db);
    batch.update(doc(db, 'hospitals', hospitalId), {
      name: nextName,
      registrationNumber: (updates.registrationNumber ?? existing.registrationNumber).trim().slice(0, 80),
      address: (updates.address ?? existing.address).trim().slice(0, 240),
      city: (updates.city ?? existing.city).trim().slice(0, 80),
      state: (updates.state ?? existing.state).trim().slice(0, 80),
      contactPerson: (updates.contactPerson ?? existing.contactPerson).trim().slice(0, 100),
      mobile: (updates.mobile ?? existing.mobile).trim().slice(0, 30),
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'hospital_users', existing.authUid), {
      hospitalName: nextName,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${hospitalId}`), {
      actorId: firebaseUser.uid,
      action: 'ADMIN_UPDATE_HOSPITAL',
      entityType: 'hospital',
      entityId: hospitalId,
      previousStatus: existing.status,
      newStatus: nextStatus,
      details: `Updated hospital ${nextName}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  };

  const adminCreateHomeageAccount = async (
    input: CreateHomeageAccountInput
  ): Promise<HomeageOrganization> => {
    if (!effectiveFirebaseUser || !isAdmin) {
      throw new Error('Only authorized administrators can register food homeage accounts.');
    }
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanUsername = input.username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 alphanumeric characters.');
    }
    if ((input.password || '').length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    if (!firebaseUser && isDemo) {
      const homeageId = `HMG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
      const nowIso = new Date().toISOString();
      const created: HomeageOrganization = {
        id: homeageId,
        homeageId,
        name: input.name.trim(),
        registrationNumber: input.registrationNumber?.trim() || undefined,
        contactPerson: input.contactPerson.trim(),
        mobile: input.mobile.trim(),
        email: cleanEmail,
        address: input.address.trim(),
        city: input.city.trim(),
        state: input.state.trim(),
        username: cleanUsername,
        authUid: `demo_hmg_${Date.now()}`,
        status: 'ACTIVE',
        createdBy: effectiveFirebaseUser.uid,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setHomeagesMap((prev) => ({ ...prev, [homeageId]: created }));
      return created;
    }

    const existingUname = await getDoc(doc(db, 'org_usernames', cleanUsername));
    if (existingUname.exists()) {
      throw new Error(`Username "${cleanUsername}" is already taken.`);
    }

    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, input.password || '');
    const newUid = cred.user.uid;
    await signOut(secondaryAuth);

    const homeageId = `HMG-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();

    const homeageDoc: Record<string, unknown> = {
      homeageId,
      name: input.name.trim().slice(0, 140),
      contactPerson: input.contactPerson.trim().slice(0, 100),
      mobile: input.mobile.trim().slice(0, 30),
      email: cleanEmail.slice(0, 160),
      address: input.address.trim().slice(0, 240),
      city: input.city.trim().slice(0, 80),
      state: input.state.trim().slice(0, 80),
      username: cleanUsername.slice(0, 60),
      authUid: newUid,
      status: 'ACTIVE',
      createdBy: firebaseUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.registrationNumber?.trim()) {
      homeageDoc.registrationNumber = input.registrationNumber.trim().slice(0, 80);
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'homeage_organizations', homeageId), homeageDoc);
    batch.set(doc(db, 'homeage_users', newUid), {
      uid: newUid,
      homeageId,
      homeageName: String(homeageDoc.name),
      email: cleanEmail,
      username: cleanUsername,
      role: 'HOMEAGE',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'org_usernames', cleanUsername), {
      username: cleanUsername,
      email: cleanEmail,
      role: 'HOMEAGE',
      orgId: homeageId,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${homeageId}`), {
      actorId: firebaseUser.uid,
      action: 'ADMIN_CREATE_HOMEAGE',
      entityType: 'homeage',
      entityId: homeageId,
      previousStatus: 'NONE',
      newStatus: 'ACTIVE',
      details: `Registered food homeage ${homeageDoc.name} (${cleanEmail})`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
    return {
      id: homeageId,
      homeageId,
      name: String(homeageDoc.name),
      registrationNumber: input.registrationNumber?.trim() || undefined,
      contactPerson: String(homeageDoc.contactPerson),
      mobile: String(homeageDoc.mobile),
      email: cleanEmail,
      address: String(homeageDoc.address),
      city: String(homeageDoc.city),
      state: String(homeageDoc.state),
      username: cleanUsername,
      authUid: newUid,
      status: 'ACTIVE',
      createdBy: firebaseUser.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const adminUpdateHomeage = async (
    homeageId: string,
    updates: Partial<HomeageOrganization> & { status?: OrganizationStatus }
  ) => {
    if (!effectiveFirebaseUser || !isAdmin) {
      throw new Error('Only authorized administrators can update food homeage accounts.');
    }
    const existing = homeageOrganizations.find((h) => h.homeageId === homeageId);
    if (!existing) throw new Error('Homeage organization not found.');
    if (!firebaseUser && isDemo) {
      setHomeagesMap((prev) => ({
        ...prev,
        [homeageId]: { ...existing, ...updates, updatedAt: new Date().toISOString() },
      }));
      return;
    }

    const nextName = (updates.name ?? existing.name).trim().slice(0, 140);
    const nextStatus = updates.status ?? existing.status;

    const updatePayload: Record<string, unknown> = {
      name: nextName,
      contactPerson: (updates.contactPerson ?? existing.contactPerson).trim().slice(0, 100),
      mobile: (updates.mobile ?? existing.mobile).trim().slice(0, 30),
      address: (updates.address ?? existing.address).trim().slice(0, 240),
      city: (updates.city ?? existing.city).trim().slice(0, 80),
      state: (updates.state ?? existing.state).trim().slice(0, 80),
      status: nextStatus,
      updatedAt: serverTimestamp(),
    };
    if (typeof updates.registrationNumber === 'string') {
      updatePayload.registrationNumber = updates.registrationNumber.trim().slice(0, 80);
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'homeage_organizations', homeageId), updatePayload);
    batch.update(doc(db, 'homeage_users', existing.authUid), {
      homeageName: nextName,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'audit_logs', `log_${Date.now()}_${homeageId}`), {
      actorId: firebaseUser.uid,
      action: 'ADMIN_UPDATE_HOMEAGE',
      entityType: 'homeage',
      entityId: homeageId,
      previousStatus: existing.status,
      newStatus: nextStatus,
      details: `Updated homeage ${nextName}`,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  };

  // ==================================================
  // HOSPITAL PORTAL: BLOOD REQUEST & DOCTOR WORKFLOWS
  // ==================================================
  const hospitalUpdateBloodRequest = async (
    bloodRequestId: string,
    updates: HospitalBloodUpdateInput
  ) => {
    if (!effectiveFirebaseUser || (portalRole !== 'HOSPITAL' && !isAdmin)) {
      throw new Error('Hospital portal authorization required.');
    }
    const target = bloodRequests.find((r) => r.bloodRequestId === bloodRequestId);
    if (!target) throw new Error('Blood request not found.');

    const statusMap: Record<HospitalBloodStatus, BloodRequest['status']> = {
      Submitted: 'REQUEST_SUBMITTED',
      'Under Hospital Verification': 'SEARCHING_FOR_DONORS',
      'Donor Search Started': 'NOTIFICATIONS_SENT',
      'Donors Available': 'DONORS_INTERESTED',
      'Donation Scheduled': 'DONATION_SCHEDULED',
      'Donation Completed': 'DONATION_COMPLETED',
      'Request Fulfilled': 'REQUEST_FULFILLED',
      Cancelled: 'REQUEST_CANCELLED',
    };

    const nextStatus = statusMap[updates.hospitalStatus] || target.status;
    const payload: Record<string, unknown> = {
      hospitalStatus: updates.hospitalStatus,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    };
    if (typeof updates.hospitalVerified === 'boolean') {
      payload.hospitalVerified = updates.hospitalVerified;
    }
    if (typeof updates.hospitalNotes === 'string') {
      payload.hospitalNotes = updates.hospitalNotes.trim().slice(0, 600);
    }
    if (updates.assignToSelf && hospitalAccount) {
      payload.assignedHospitalId = hospitalAccount.hospitalId;
      payload.assignedHospitalName = hospitalAccount.hospitalName;
    }
    if (updates.hospitalStatus === 'Request Fulfilled') {
      payload.fulfilledAt = serverTimestamp();
      payload.fulfilledUnits = target.requiredUnits;
      payload.confirmedUnits = target.requiredUnits;
    }

    if (!firebaseUser && isDemo) {
      setBloodRequestsOpenMap((prev) => ({
        ...prev,
        [bloodRequestId]: {
          ...target,
          hospitalStatus: updates.hospitalStatus,
          status: nextStatus,
          hospitalVerified:
            typeof updates.hospitalVerified === 'boolean'
              ? updates.hospitalVerified
              : target.hospitalVerified,
          hospitalNotes:
            typeof updates.hospitalNotes === 'string'
              ? updates.hospitalNotes.trim()
              : target.hospitalNotes,
          assignedHospitalId: updates.assignToSelf
            ? hospitalAccount?.hospitalId || target.assignedHospitalId
            : target.assignedHospitalId,
          assignedHospitalName: updates.assignToSelf
            ? hospitalAccount?.hospitalName || target.assignedHospitalName
            : target.assignedHospitalName,
          fulfilledUnits:
            updates.hospitalStatus === 'Request Fulfilled'
              ? target.requiredUnits
              : target.fulfilledUnits,
          updatedAt: new Date().toISOString(),
        },
      }));
      return;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'blood_requests', bloodRequestId), payload);
    batch.set(doc(db, 'notifications', `hosp_upd_${bloodRequestId}_${Date.now()}`), {
      userId: target.requesterId,
      actorId: firebaseUser!.uid,
      bloodRequestId,
      title: `Hospital Update: ${updates.hospitalStatus}`,
      message: `${hospitalAccount?.hospitalName || target.hospitalName} updated blood request ${bloodRequestId} to "${updates.hospitalStatus}".`,
      notificationType: 'BLOOD_DONATION_SCHEDULED',
      actionUrl: `/blood?requestId=${bloodRequestId}`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  };

  const hospitalSaveDoctor = async (input: SaveDoctorInput): Promise<DoctorProfile> => {
    if (!effectiveFirebaseUser || (!hospitalAccount && !isAdmin)) {
      throw new Error('Hospital portal authorization required to manage doctors.');
    }
    const org = hospitals.find((h) => h.hospitalId === hospitalAccount?.hospitalId);
    const hospitalId = hospitalAccount?.hospitalId || org?.hospitalId || 'HSP-ADMIN';
    const hospitalName = hospitalAccount?.hospitalName || org?.name || 'HelpConnect Partner Hospital';
    const city = org?.city || 'Chennai';

    const doctorId =
      input.doctorId || `DOC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();
    const existing = doctors.find((d) => d.doctorId === doctorId);

    const docPayload = {
      doctorId,
      hospitalId,
      hospitalName,
      city,
      name: input.name.trim().slice(0, 100),
      specialty: input.specialty.trim().slice(0, 100),
      qualification: input.qualification.trim().slice(0, 120),
      experienceYears: Math.max(0, Math.min(80, Number(input.experienceYears) || 0)),
      consultationFee: Math.max(0, Math.min(100000, Number(input.consultationFee) || 0)),
      bio: (input.bio || '').trim().slice(0, 600),
      availabilityDays: input.availabilityDays.slice(0, 7),
      availabilitySlots: input.availabilitySlots.slice(0, 20),
      isAvailable: Boolean(input.isAvailable),
      isPublished: Boolean(input.isPublished),
      verified: true,
      createdAt: existing ? Timestamp.fromDate(new Date(existing.createdAt)) : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!firebaseUser && isDemo) {
      const demoDoc: DoctorProfile = {
        id: doctorId,
        doctorId,
        hospitalId,
        hospitalName,
        city,
        name: docPayload.name,
        specialty: docPayload.specialty,
        qualification: docPayload.qualification,
        experienceYears: docPayload.experienceYears,
        consultationFee: docPayload.consultationFee,
        bio: docPayload.bio,
        availabilityDays: docPayload.availabilityDays,
        availabilitySlots: docPayload.availabilitySlots,
        isAvailable: docPayload.isAvailable,
        isPublished: docPayload.isPublished,
        verified: true,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
      };
      setDoctorsMap((prev) => ({ ...prev, [doctorId]: demoDoc }));
      return demoDoc;
    }

    if (existing) {
      await updateDoc(doc(db, 'doctors', doctorId), {
        name: docPayload.name,
        specialty: docPayload.specialty,
        qualification: docPayload.qualification,
        experienceYears: docPayload.experienceYears,
        consultationFee: docPayload.consultationFee,
        bio: docPayload.bio,
        availabilityDays: docPayload.availabilityDays,
        availabilitySlots: docPayload.availabilitySlots,
        isAvailable: docPayload.isAvailable,
        isPublished: docPayload.isPublished,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'doctors', doctorId), docPayload);
    }

    return {
      id: doctorId,
      doctorId,
      hospitalId,
      hospitalName,
      city,
      name: docPayload.name,
      specialty: docPayload.specialty,
      qualification: docPayload.qualification,
      experienceYears: docPayload.experienceYears,
      consultationFee: docPayload.consultationFee,
      bio: docPayload.bio,
      availabilityDays: docPayload.availabilityDays,
      availabilitySlots: docPayload.availabilitySlots,
      isAvailable: docPayload.isAvailable,
      isPublished: docPayload.isPublished,
      verified: true,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    };
  };

  const hospitalUpdateDoctorFlags = async (
    doctorId: string,
    flags: { isAvailable?: boolean; isPublished?: boolean }
  ) => {
    if (!effectiveFirebaseUser || (portalRole !== 'HOSPITAL' && !isAdmin)) {
      throw new Error('Hospital authorization required.');
    }
    if (!firebaseUser && isDemo) {
      setDoctorsMap((prev) => {
        const cur = prev[doctorId];
        if (!cur) return prev;
        return {
          ...prev,
          [doctorId]: {
            ...cur,
            ...(typeof flags.isAvailable === 'boolean' ? { isAvailable: flags.isAvailable } : {}),
            ...(typeof flags.isPublished === 'boolean' ? { isPublished: flags.isPublished } : {}),
            updatedAt: new Date().toISOString(),
          },
        };
      });
      return;
    }
    await updateDoc(doc(db, 'doctors', doctorId), {
      ...(typeof flags.isAvailable === 'boolean' ? { isAvailable: flags.isAvailable } : {}),
      ...(typeof flags.isPublished === 'boolean' ? { isPublished: flags.isPublished } : {}),
      updatedAt: serverTimestamp(),
    });
  };

  const hospitalUpdateAppointmentStatus = async (
    appointmentId: string,
    status: AppointmentStatus
  ) => {
    if (!effectiveFirebaseUser || (portalRole !== 'HOSPITAL' && !isAdmin)) {
      throw new Error('Hospital authorization required.');
    }
    const appt = doctorAppointments.find((a) => a.appointmentId === appointmentId);
    if (!firebaseUser && isDemo) {
      setAppointmentsMap((prev) => {
        const cur = prev[appointmentId];
        if (!cur) return prev;
        return {
          ...prev,
          [appointmentId]: { ...cur, status, updatedAt: new Date().toISOString() },
        };
      });
      return;
    }
    const batch = writeBatch(db);
    batch.update(doc(db, 'doctor_appointments', appointmentId), {
      status,
      updatedAt: serverTimestamp(),
    });
    if (appt) {
      batch.set(doc(db, 'notifications', `appt_${appointmentId}_${Date.now()}`), {
        userId: appt.patientId,
        actorId: firebaseUser.uid,
        title: `Doctor Appointment ${status}`,
        message: `Your appointment with Dr. ${appt.doctorName} (${appt.hospitalName}) on ${appt.appointmentDate} at ${appt.timeSlot} is now ${status}.`,
        notificationType: 'ADMIN_UPDATED',
        actionUrl: `/doctors`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  };

  const bookDoctorAppointment = async (
    input: BookAppointmentInput
  ): Promise<DoctorAppointment> => {
    const fbUser = requireSignedIn();
    const doctor = doctors.find((d) => d.doctorId === input.doctorId);
    if (!doctor) throw new Error('Doctor not found.');

    const appointmentId = `APT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const nowIso = new Date().toISOString();
    const docPayload: Record<string, unknown> = {
      appointmentId,
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      hospitalId: doctor.hospitalId,
      hospitalName: doctor.hospitalName,
      patientId: fbUser.uid,
      patientName: input.patientName.trim().slice(0, 100),
      patientMobile: input.patientMobile.trim().slice(0, 30),
      appointmentDate: input.appointmentDate.trim().slice(0, 40),
      timeSlot: input.timeSlot.trim().slice(0, 40),
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.reason?.trim()) {
      docPayload.reason = input.reason.trim().slice(0, 500);
    }

    if (!firebaseUser) {
      const localAppt: DoctorAppointment = {
        id: appointmentId,
        appointmentId,
        doctorId: doctor.doctorId,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        hospitalId: doctor.hospitalId,
        hospitalName: doctor.hospitalName,
        patientId: fbUser.uid,
        patientName: String(docPayload.patientName),
        patientMobile: String(docPayload.patientMobile),
        appointmentDate: String(docPayload.appointmentDate),
        timeSlot: String(docPayload.timeSlot),
        reason: input.reason?.trim(),
        status: 'PENDING',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setAppointmentsMap((prev) => ({ ...prev, [appointmentId]: localAppt }));
      return localAppt;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'doctor_appointments', appointmentId), docPayload);
    const targetHospital = hospitals.find((h) => h.hospitalId === doctor.hospitalId);
    if (targetHospital?.authUid) {
      batch.set(doc(db, 'notifications', `hosp_apt_${appointmentId}`), {
        userId: targetHospital.authUid,
        actorId: fbUser.uid,
        title: `New Appointment: Dr. ${doctor.name}`,
        message: `${docPayload.patientName} requested an appointment on ${docPayload.appointmentDate} (${docPayload.timeSlot}).`,
        notificationType: 'ADMIN_UPDATED',
        actionUrl: `/hospital`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();

    return {
      id: appointmentId,
      appointmentId,
      doctorId: doctor.doctorId,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      hospitalId: doctor.hospitalId,
      hospitalName: doctor.hospitalName,
      patientId: fbUser.uid,
      patientName: String(docPayload.patientName),
      patientMobile: String(docPayload.patientMobile),
      appointmentDate: String(docPayload.appointmentDate),
      timeSlot: String(docPayload.timeSlot),
      reason: input.reason?.trim(),
      status: 'PENDING',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  };

  // ==================================================
  // SMART FOOD DONATION & FOOD HOMEAGE WORKFLOWS
  // ==================================================
  const createFoodDonation = async (
    input: CreateFoodDonationInput
  ): Promise<{ donation: FoodDonation; notifiedHomeagesCount: number }> => {
    const fbUser = requireSignedIn();
    if (!input.safetyConfirmed) {
      throw new Error('Please confirm that the donated food is fresh, hygienic, and safe to consume.');
    }
    if (isDeadlineExpired(input.collectionDeadline)) {
      throw new Error('Collection deadline must be in the future. Expired food cannot be listed.');
    }

    const donationId = generateFoodDonationId();
    const coords = resolveCoordinatesFromLocation(input.city, input.location);
    const totalQty = Math.max(1, Math.min(100000, Number(input.totalQuantity) || 1));
    const servings = Math.max(1, Math.min(100000, Number(input.servingsCount) || 1));
    const nowIso = new Date().toISOString();

    const docPayload: Record<string, unknown> = {
      donationId,
      donorId: fbUser.uid,
      donorName: toPrivacySafeName(input.donorName, 'Community Donor'),
      donorType: input.donorType,
      foodName: input.foodName.trim().slice(0, 120),
      category: input.category,
      totalQuantity: totalQty,
      availableQuantity: totalQty,
      quantityUnit: input.quantityUnit.trim().slice(0, 40) || 'meals',
      servingsCount: servings,
      preparedAt: input.preparedAt.trim().slice(0, 60),
      collectionDeadline: input.collectionDeadline.trim().slice(0, 60),
      description: input.description.trim().slice(0, 1000),
      pickupArea: input.location.trim().slice(0, 140),
      city: input.city.trim().slice(0, 80),
      location: input.location.trim().slice(0, 140),
      latitude: coords.lat,
      longitude: coords.lng,
      safetyConfirmed: true,
      allowPartialAcceptance: input.allowPartialAcceptance !== false,
      verified: Boolean(fbUser.emailVerified),
      status: 'Available',
      activeRequestsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.imageUrl) docPayload.imageUrl = input.imageUrl;
    if (input.pickupInstructions?.trim()) {
      docPayload.pickupInstructions = input.pickupInstructions.trim().slice(0, 500);
    }

    // Find matching active Homeages in same city (or all active Homeages if city has none)
    const activeHomeages = homeageOrganizations.filter((h) => h.status === 'ACTIVE');
    const cityMatches = activeHomeages.filter(
      (h) => h.city.trim().toLowerCase() === input.city.trim().toLowerCase()
    );
    const targetHomeages = cityMatches.length > 0 ? cityMatches : activeHomeages;

    const createdDonation: FoodDonation = {
      id: donationId,
      donationId,
      donorId: fbUser.uid,
      donorName: String(docPayload.donorName),
      donorType: input.donorType,
      foodName: String(docPayload.foodName),
      category: input.category,
      totalQuantity: totalQty,
      availableQuantity: totalQty,
      quantityUnit: String(docPayload.quantityUnit),
      servingsCount: servings,
      preparedAt: String(docPayload.preparedAt),
      collectionDeadline: String(docPayload.collectionDeadline),
      description: String(docPayload.description),
      imageUrl: input.imageUrl,
      pickupArea: String(docPayload.pickupArea),
      city: String(docPayload.city),
      location: String(docPayload.location),
      latitude: coords.lat,
      longitude: coords.lng,
      pickupInstructions: input.pickupInstructions?.trim(),
      safetyConfirmed: true,
      allowPartialAcceptance: input.allowPartialAcceptance !== false,
      verified: Boolean(fbUser.emailVerified),
      status: 'Available',
      activeRequestsCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (!firebaseUser) {
      setFoodDonationsMap((prev) => ({ ...prev, [donationId]: createdDonation }));
      return { donation: createdDonation, notifiedHomeagesCount: targetHomeages.length };
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'food_donations', donationId), docPayload);
    batch.set(doc(db, 'food_donations', donationId, 'private', 'contact'), {
      donationId,
      donorId: fbUser.uid,
      mobileNumber: input.mobileNumber.trim().slice(0, 30),
      contactDetails: (input.contactDetails || input.mobileNumber).trim().slice(0, 240),
      pickupAddress: input.pickupAddress.trim().slice(0, 240),
      authorizedReceiverIds: [],
      updatedAt: serverTimestamp(),
    });

    targetHomeages.forEach((h) => {
      batch.set(doc(db, 'notifications', `food_hmg_${donationId}_${h.homeageId}`), {
        userId: h.authUid,
        actorId: fbUser.uid,
        foodDonationId: donationId,
        title: `Surplus Food Available in ${input.city.trim()}`,
        message: `${input.foodName.trim()} (${totalQty} ${docPayload.quantityUnit}, serves ${servings}) posted by ${docPayload.donorName}.`,
        notificationType: 'FOOD_DONATION_POSTED',
        actionUrl: `/orphanage`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { donation: createdDonation, notifiedHomeagesCount: targetHomeages.length };
  };

  const getFoodDonationPrivateContact = async (
    donationId: string
  ): Promise<FoodDonationPrivateContact | null> => {
    if (!effectiveFirebaseUser) return null;
    if (!firebaseUser && isDemo) {
      const don = foodDonations.find((d) => d.donationId === donationId);
      return {
        donationId,
        donorId: don?.donorId || 'demo_donor_1',
        mobileNumber: '+91 98409 77011',
        contactDetails: `${don?.donorName || 'Food Donor'} Reception Desk`,
        pickupAddress: `14 Main Road, ${don?.pickupArea || 'Adyar'}, ${don?.city || 'Chennai'}`,
        authorizedReceiverIds: [effectiveFirebaseUser.uid],
        updatedAt: new Date().toISOString(),
      };
    }
    try {
      const snap = await getDoc(doc(db, 'food_donations', donationId, 'private', 'contact'));
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        donationId: String(d.donationId || donationId),
        donorId: String(d.donorId || ''),
        mobileNumber: String(d.mobileNumber || ''),
        contactDetails: String(d.contactDetails || ''),
        pickupAddress: String(d.pickupAddress || ''),
        authorizedReceiverIds: Array.isArray(d.authorizedReceiverIds)
          ? (d.authorizedReceiverIds as string[])
          : [],
        updatedAt: tsToIso(d.updatedAt) || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  };

  const submitFoodCollectionRequest = async (
    input: CreateFoodCollectionRequestInput
  ): Promise<FoodCollectionRequest> => {
    const fbUser = requireSignedIn();
    const donation = foodDonations.find((d) => d.donationId === input.donationId);
    if (!donation) throw new Error('Food donation listing not found.');
    if (donation.donorId === fbUser.uid) {
      throw new Error('You cannot request food from your own donation listing.');
    }
    if (isDeadlineExpired(donation.collectionDeadline) || donation.status === 'Expired') {
      throw new Error('This food donation listing has expired.');
    }
    if (input.requestedQuantity > donation.availableQuantity) {
      throw new Error(
        `Only ${donation.availableQuantity} ${donation.quantityUnit} currently available.`
      );
    }

    const requestId = generateFoodCollectionRequestId();
    const nowIso = new Date().toISOString();
    const payload: Record<string, unknown> = {
      requestId,
      donationId: donation.donationId,
      donorId: donation.donorId,
      donorName: donation.donorName,
      foodName: donation.foodName,
      foodCategory: donation.category,
      receiverId: fbUser.uid,
      receiverName: input.receiverName.trim().slice(0, 80),
      receiverMobile: input.receiverMobile.trim().slice(0, 30),
      requestedQuantity: Math.max(1, Number(input.requestedQuantity) || 1),
      quantityUnit: donation.quantityUnit,
      peopleCount: Math.max(1, Number(input.peopleCount) || 1),
      preferredCollectionTime: input.preferredCollectionTime.trim().slice(0, 60),
      pickupLocation: input.pickupLocation.trim().slice(0, 140),
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.reason?.trim()) payload.reason = input.reason.trim().slice(0, 400);
    if (input.additionalInfo?.trim()) payload.additionalInfo = input.additionalInfo.trim().slice(0, 400);

    const created: FoodCollectionRequest = {
      id: requestId,
      requestId,
      donationId: donation.donationId,
      donorId: donation.donorId,
      donorName: donation.donorName,
      foodName: donation.foodName,
      foodCategory: donation.category,
      receiverId: fbUser.uid,
      receiverName: String(payload.receiverName),
      receiverMobile: String(payload.receiverMobile),
      requestedQuantity: Number(payload.requestedQuantity),
      quantityUnit: donation.quantityUnit,
      peopleCount: Number(payload.peopleCount),
      reason: input.reason?.trim(),
      preferredCollectionTime: String(payload.preferredCollectionTime),
      pickupLocation: String(payload.pickupLocation),
      additionalInfo: input.additionalInfo?.trim(),
      status: 'Pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (!firebaseUser) {
      setFoodCollectionReqMap((prev) => ({ ...prev, [requestId]: created }));
      return created;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'food_collection_requests', requestId), payload);
    batch.update(doc(db, 'food_donations', donation.donationId), {
      activeRequestsCount: (donation.activeRequestsCount || 0) + 1,
      status: donation.status === 'Available' ? 'Request Received' : donation.status,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'notifications', `food_req_${requestId}`), {
      userId: donation.donorId,
      actorId: fbUser.uid,
      foodDonationId: donation.donationId,
      title: `New Food Request: ${donation.foodName}`,
      message: `${payload.receiverName} requested ${payload.requestedQuantity} ${donation.quantityUnit} (for ${payload.peopleCount} people).`,
      notificationType: 'FOOD_COLLECTION_REQUESTED',
      actionUrl: `/food-donate`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
    return created;
  };

  // Homeage accepts full or partial surplus food donation with atomic anti-overbooking lock
  const homeageAcceptFoodDonation = async (
    donationId: string,
    quantity: number,
    preferredCollectionTime?: string
  ): Promise<FoodCollectionRequest> => {
    if (!effectiveFirebaseUser || !homeageAccount) {
      throw new Error('Active Orphanage Portal session required.');
    }
    const donation = foodDonations.find((d) => d.donationId === donationId);
    if (!donation) throw new Error('Food donation not found.');
    if (isDeadlineExpired(donation.collectionDeadline) || donation.status === 'Expired') {
      throw new Error('This food donation has expired.');
    }
    const reqQty = Math.max(1, Number(quantity) || donation.availableQuantity);
    if (reqQty > donation.availableQuantity) {
      throw new Error(`Requested quantity exceeds available ${donation.availableQuantity} ${donation.quantityUnit}.`);
    }
    if (reqQty < donation.availableQuantity && donation.allowPartialAcceptance === false) {
      throw new Error('Donor requires full quantity pickup for this surplus listing.');
    }

    const requestId = generateFoodCollectionRequestId();
    // Atomic server-side mutex reservation guard
    const lockRes = await fetch('/api/food/reserve-quantity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donationId,
        requestId,
        receiverId: effectiveFirebaseUser.uid,
        requestedQuantity: reqQty,
        totalQuantity: donation.totalQuantity,
        currentAvailableQuantity: donation.availableQuantity,
      }),
    });
    const lockData = await lockRes.json();
    if (!lockRes.ok || !lockData.success) {
      throw new Error(lockData.error || 'Quantity already reserved by another Orphanage.');
    }

    const nextAvailable = Math.max(0, donation.availableQuantity - reqQty);
    const nextDonationStatus = nextAvailable === 0 ? 'Reserved' : 'Accepted';
    if (!firebaseUser && isDemo) {
      const nowIso = new Date().toISOString();
      const created: FoodCollectionRequest = {
        id: requestId,
        requestId,
        donationId,
        donorId: donation.donorId,
        donorName: donation.donorName,
        foodName: donation.foodName,
        foodCategory: donation.category,
        receiverId: effectiveFirebaseUser.uid,
        receiverName: homeageAccount.homeageName,
        receiverMobile: DEMO_HOMEAGE_ORGS[homeageAccount.homeageId]?.mobile || '+91 98409 33112',
        homeageId: homeageAccount.homeageId,
        requestedQuantity: reqQty,
        quantityUnit: donation.quantityUnit,
        peopleCount: Math.max(1, Math.round((reqQty / Math.max(1, donation.totalQuantity)) * donation.servingsCount)),
        preferredCollectionTime: preferredCollectionTime || 'Within 45 mins',
        pickupLocation: donation.city,
        status: 'Accepted',
        createdAt: nowIso,
        acceptedAt: nowIso,
        updatedAt: nowIso,
      };
      setFoodCollectionReqMap((prev) => ({ ...prev, [requestId]: created }));
      setFoodDonationsMap((prev) => ({
        ...prev,
        [donationId]: {
          ...donation,
          availableQuantity: nextAvailable,
          status: nextDonationStatus,
          assignedHomeageId: homeageAccount.homeageId,
          assignedHomeageName: homeageAccount.homeageName,
          updatedAt: nowIso,
        },
      }));
      return created;
    }
    const homeageOrg = homeageOrganizations.find((h) => h.homeageId === homeageAccount.homeageId);
    const nowIso = new Date().toISOString();

    const colPayload = {
      requestId,
      donationId,
      donorId: donation.donorId,
      donorName: donation.donorName,
      foodName: donation.foodName,
      foodCategory: donation.category,
      receiverId: firebaseUser.uid,
      receiverName: homeageAccount.homeageName.slice(0, 80),
      receiverMobile: (homeageOrg?.mobile || 'Verified Orphanage').slice(0, 30),
      homeageId: homeageAccount.homeageId,
      requestedQuantity: reqQty,
      quantityUnit: donation.quantityUnit,
      peopleCount: Math.max(1, Math.round((reqQty / donation.totalQuantity) * donation.servingsCount)),
      preferredCollectionTime: (preferredCollectionTime || 'Immediate Pickup').slice(0, 60),
      pickupLocation: `${homeageOrg?.city || donation.city}`.slice(0, 140),
      status: 'Accepted' as const,
      createdAt: serverTimestamp(),
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'food_collection_requests', requestId), colPayload);
    batch.update(doc(db, 'food_donations', donationId), {
      availableQuantity: nextAvailable,
      status: nextDonationStatus,
      activeRequestsCount: (donation.activeRequestsCount || 0) + 1,
      assignedHomeageId: homeageAccount.homeageId,
      assignedHomeageName: homeageAccount.homeageName,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'food_donations', donationId, 'private', 'contact'), {
      authorizedReceiverIds: arrayUnion(firebaseUser.uid),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'notifications', `hmg_acc_${requestId}`), {
      userId: donation.donorId,
      actorId: firebaseUser.uid,
      foodDonationId: donationId,
      title: `Food Accepted by ${homeageAccount.homeageName}`,
      message: `${homeageAccount.homeageName} accepted ${reqQty} ${donation.quantityUnit} of ${donation.foodName} and will coordinate pickup.`,
      notificationType: 'FOOD_REQUEST_ACCEPTED',
      actionUrl: `/food-donate`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });

    // If fully reserved, notify other active Homeages in same city that listing is closed
    if (nextAvailable === 0) {
      homeageOrganizations
        .filter(
          (h) =>
            h.status === 'ACTIVE' &&
            h.homeageId !== homeageAccount.homeageId &&
            h.city.toLowerCase() === donation.city.toLowerCase()
        )
        .forEach((other) => {
          batch.set(doc(db, 'notifications', `hmg_closed_${donationId}_${other.homeageId}`), {
            userId: other.authUid,
            actorId: firebaseUser.uid,
            foodDonationId: donationId,
            title: `Surplus Food Already Accepted`,
            message: `${donation.foodName} (${donation.donationId}) has been fully accepted and reserved.`,
            notificationType: 'FOOD_LISTING_CLOSED',
            actionUrl: `/orphanage`,
            deliveryChannels: ['in_app'],
            isRead: false,
            createdAt: serverTimestamp(),
          });
        });
    }

    await batch.commit();

    return {
      id: requestId,
      ...colPayload,
      createdAt: nowIso,
      acceptedAt: nowIso,
      updatedAt: nowIso,
    };
  };

  const respondFoodCollectionRequest = async (
    requestId: string,
    action: 'Accepted' | 'Rejected',
    rejectionReason?: string
  ) => {
    const fbUser = requireSignedIn();
    const reqTarget = foodCollectionRequests.find((r) => r.requestId === requestId);
    if (!reqTarget) throw new Error('Food collection request not found.');
    if (reqTarget.donorId !== fbUser.uid) {
      throw new Error('Only the food donor can accept or reject collection requests.');
    }
    const donation = foodDonations.find((d) => d.donationId === reqTarget.donationId);
    if (!donation) throw new Error('Associated food donation not found.');

    if (action === 'Accepted') {
      const lockRes = await fetch('/api/food/reserve-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donationId: donation.donationId,
          requestId,
          receiverId: reqTarget.receiverId,
          requestedQuantity: reqTarget.requestedQuantity,
          totalQuantity: donation.totalQuantity,
          currentAvailableQuantity: donation.availableQuantity,
        }),
      });
      const lockData = await lockRes.json();
      if (!lockRes.ok || !lockData.success) {
        throw new Error(lockData.error || 'Insufficient remaining quantity.');
      }

      const nextAvailable = Math.max(0, donation.availableQuantity - reqTarget.requestedQuantity);
      const batch = writeBatch(db);
      batch.update(doc(db, 'food_collection_requests', requestId), {
        status: 'Accepted',
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'food_donations', donation.donationId), {
        availableQuantity: nextAvailable,
        status: nextAvailable === 0 ? 'Reserved' : 'Accepted',
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'food_donations', donation.donationId, 'private', 'contact'), {
        authorizedReceiverIds: arrayUnion(reqTarget.receiverId),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', `food_acc_${requestId}`), {
        userId: reqTarget.receiverId,
        actorId: fbUser.uid,
        foodDonationId: donation.donationId,
        title: `Food Request Accepted!`,
        message: `${donation.donorName} approved your request for ${reqTarget.requestedQuantity} ${reqTarget.quantityUnit} of ${donation.foodName}. Pickup address unlocked.`,
        notificationType: 'FOOD_REQUEST_ACCEPTED',
        actionUrl: `/food`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    } else {
      const batch = writeBatch(db);
      batch.update(doc(db, 'food_collection_requests', requestId), {
        status: 'Rejected',
        rejectionReason: (rejectionReason?.trim() || 'Unavailable at requested time').slice(0, 400),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', `food_rej_${requestId}`), {
        userId: reqTarget.receiverId,
        actorId: fbUser.uid,
        foodDonationId: donation.donationId,
        title: `Food Request Declined`,
        message: `Your request for ${donation.foodName} was declined. Please browse other available food nearby.`,
        notificationType: 'FOOD_REQUEST_REJECTED',
        actionUrl: `/food`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    }
  };

  const markFoodReadyForPickup = async (requestId: string) => {
    const fbUser = requireSignedIn();
    const reqTarget = foodCollectionRequests.find((r) => r.requestId === requestId);
    if (!reqTarget) throw new Error('Collection request not found.');
    if (!firebaseUser && isDemo) {
      const nowIso = new Date().toISOString();
      setFoodCollectionReqMap((prev) => ({
        ...prev,
        [requestId]: { ...reqTarget, status: 'Ready for Pickup', readyAt: nowIso, updatedAt: nowIso },
      }));
      return;
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'food_collection_requests', requestId), {
      status: 'Ready for Pickup',
      readyAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'food_donations', reqTarget.donationId), {
      status: 'Ready for Pickup',
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'notifications', `food_rdy_${requestId}_${Date.now()}`), {
      userId: reqTarget.receiverId === fbUser.uid ? reqTarget.donorId : reqTarget.receiverId,
      actorId: fbUser.uid,
      foodDonationId: reqTarget.donationId,
      title: `Food Ready for Pickup`,
      message: `${reqTarget.foodName} (${reqTarget.requestedQuantity} ${reqTarget.quantityUnit}) is ready for handover.`,
      notificationType: 'FOOD_READY_FOR_PICKUP',
      actionUrl: portalRole === 'HOMEAGE' ? `/food-donate` : `/food`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  };

  const confirmFoodHandover = async (requestId: string): Promise<FoodDonationCertificate> => {
    const fbUser = requireSignedIn();
    const reqTarget = foodCollectionRequests.find((r) => r.requestId === requestId);
    if (!reqTarget) throw new Error('Collection request not found.');
    const donation = foodDonations.find((d) => d.donationId === reqTarget.donationId);

    const certificateId = generateFoodCertificateId();
    const verificationToken = generateVerificationToken();
    const nowIso = new Date().toISOString();

    if (!firebaseUser && isDemo) {
      const cert: FoodDonationCertificate = {
        id: certificateId,
        certificateId,
        donationId: reqTarget.donationId,
        collectionRequestId: requestId,
        donorId: reqTarget.donorId,
        donorName: reqTarget.donorName,
        receiverId: reqTarget.receiverId,
        receiverName: reqTarget.receiverName,
        foodName: reqTarget.foodName,
        foodCategory: reqTarget.foodCategory,
        quantityDelivered: reqTarget.requestedQuantity,
        quantityUnit: reqTarget.quantityUnit,
        city: donation?.city || reqTarget.pickupLocation || 'Chennai',
        verificationToken,
        status: 'VALID',
        completedAt: nowIso,
        generatedAt: nowIso,
      };
      setFoodCollectionReqMap((prev) => ({
        ...prev,
        [requestId]: { ...reqTarget, status: 'Completed', certificateId, collectedAt: nowIso, updatedAt: nowIso },
      }));
      setFoodCertsReceiverMap((prev) => ({ ...prev, [certificateId]: cert }));
      return cert;
    }

    const certDoc = {
      certificateId,
      donationId: reqTarget.donationId,
      collectionRequestId: requestId,
      donorId: reqTarget.donorId,
      donorName: reqTarget.donorName,
      receiverId: reqTarget.receiverId,
      receiverName: reqTarget.receiverName,
      foodName: reqTarget.foodName,
      foodCategory: reqTarget.foodCategory,
      quantityDelivered: reqTarget.requestedQuantity,
      quantityUnit: reqTarget.quantityUnit,
      city: donation?.city || reqTarget.pickupLocation || 'Community',
      verificationToken,
      status: 'VALID' as const,
      completedAt: serverTimestamp(),
      generatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.update(doc(db, 'food_collection_requests', requestId), {
      status: 'Completed',
      certificateId,
      collectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (donation && donation.availableQuantity === 0) {
      batch.update(doc(db, 'food_donations', reqTarget.donationId), {
        status: 'Completed',
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'food_donation_certificates', certificateId), certDoc);

    const notifyTarget = reqTarget.donorId === fbUser.uid ? reqTarget.receiverId : reqTarget.donorId;
    batch.set(doc(db, 'notifications', `food_cert_${certificateId}`), {
      userId: notifyTarget,
      actorId: fbUser.uid,
      foodDonationId: reqTarget.donationId,
      foodCertificateId: certificateId,
      title: `Food Handover Completed & Certificate Issued`,
      message: `Digital Certificate ${certificateId} generated for ${reqTarget.requestedQuantity} ${reqTarget.quantityUnit} of ${reqTarget.foodName}.`,
      notificationType: 'FOOD_HANDOVER_COMPLETED',
      actionUrl: `/food-donate`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      id: certificateId,
      ...certDoc,
      completedAt: nowIso,
      generatedAt: nowIso,
    };
  };

  const createFoodAssistanceRequest = async (
    input: CreateFoodAssistanceInput
  ): Promise<{ request: FoodAssistanceRequest; notifiedHomeagesCount: number }> => {
    const fbUser = requireSignedIn();
    const assistanceId = generateFoodAssistanceId();
    const coords = resolveCoordinatesFromLocation(input.city, input.location);
    const nowIso = new Date().toISOString();

    const docPayload: Record<string, unknown> = {
      assistanceId,
      requesterId: fbUser.uid,
      requesterDisplayName: toPrivacySafeName(input.fullName, 'Community Member'),
      familyMembersCount: Math.max(1, Number(input.familyMembersCount) || 1),
      peopleRequiringFood: Math.max(1, Number(input.peopleRequiringFood) || 1),
      foodRequirement: input.foodRequirement.trim().slice(0, 160),
      requiredQuantity: Math.max(1, Number(input.requiredQuantity) || 1),
      fulfilledQuantity: 0,
      requiredUnit: input.requiredUnit.trim().slice(0, 40) || 'meals',
      amountTarget: Math.max(0, Number(input.amountTarget) || 0),
      amountRaised: 0,
      foodCategory: input.foodCategory,
      city: input.city.trim().slice(0, 80),
      location: input.location.trim().slice(0, 140),
      latitude: coords.lat,
      longitude: coords.lng,
      requiredDate: input.requiredDate.trim().slice(0, 60),
      urgencyLevel: input.urgencyLevel,
      verified: Boolean(fbUser.emailVerified),
      status: 'Submitted',
      homeageStatus: 'Waiting for Homeage',
      contributionsCount: 0,
      volunteersCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (input.reason?.trim()) docPayload.reason = input.reason.trim().slice(0, 400);
    if (input.additionalDetails?.trim()) {
      docPayload.additionalDetails = input.additionalDetails.trim().slice(0, 600);
    }

    const activeHomeages = homeageOrganizations.filter((h) => h.status === 'ACTIVE');
    const cityMatches = activeHomeages.filter(
      (h) => h.city.trim().toLowerCase() === input.city.trim().toLowerCase()
    );
    const targetHomeages = cityMatches.length > 0 ? cityMatches : activeHomeages;

    const created: FoodAssistanceRequest = {
      id: assistanceId,
      assistanceId,
      requesterId: fbUser.uid,
      requesterDisplayName: String(docPayload.requesterDisplayName),
      familyMembersCount: Number(docPayload.familyMembersCount),
      peopleRequiringFood: Number(docPayload.peopleRequiringFood),
      foodRequirement: String(docPayload.foodRequirement),
      requiredQuantity: Number(docPayload.requiredQuantity),
      fulfilledQuantity: 0,
      requiredUnit: String(docPayload.requiredUnit),
      amountTarget: Number(docPayload.amountTarget),
      amountRaised: 0,
      foodCategory: input.foodCategory,
      city: String(docPayload.city),
      location: String(docPayload.location),
      latitude: coords.lat,
      longitude: coords.lng,
      requiredDate: String(docPayload.requiredDate),
      reason: input.reason?.trim(),
      additionalDetails: input.additionalDetails?.trim(),
      urgencyLevel: input.urgencyLevel,
      verified: Boolean(fbUser.emailVerified),
      status: 'Submitted',
      homeageStatus: 'Waiting for Homeage',
      contributionsCount: 0,
      volunteersCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (!firebaseUser) {
      setFoodAssistanceMap((prev) => ({ ...prev, [assistanceId]: created }));
      return { request: created, notifiedHomeagesCount: targetHomeages.length };
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'food_assistance_requests', assistanceId), docPayload);
    batch.set(doc(db, 'food_assistance_requests', assistanceId, 'private', 'contact'), {
      assistanceId,
      requesterId: fbUser.uid,
      fullName: input.fullName.trim().slice(0, 100),
      mobileNumber: input.mobileNumber.trim().slice(0, 30),
      authorizedContributorIds: [],
      updatedAt: serverTimestamp(),
    });

    targetHomeages.forEach((h) => {
      batch.set(doc(db, 'notifications', `far_hmg_${assistanceId}_${h.homeageId}`), {
        userId: h.authUid,
        actorId: fbUser.uid,
        foodAssistanceId: assistanceId,
        title: `Food Assistance Request (${input.urgencyLevel})`,
        message: `${docPayload.peopleRequiringFood} people need ${docPayload.requiredQuantity} ${docPayload.requiredUnit} (${input.foodCategory}) in ${input.city.trim()}.`,
        notificationType: 'FOOD_ASSISTANCE_POSTED',
        actionUrl: `/orphanage`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return { request: created, notifiedHomeagesCount: targetHomeages.length };
  };

  const getFoodAssistancePrivateContact = async (
    assistanceId: string
  ): Promise<FoodAssistancePrivateContact | null> => {
    if (!effectiveFirebaseUser) return null;
    if (!firebaseUser && isDemo) {
      const req = foodAssistanceRequests.find((r) => r.assistanceId === assistanceId);
      return {
        assistanceId,
        requesterId: req?.requesterId || 'demo_food_req_1',
        fullName: req?.requesterDisplayName || 'Community Requester',
        mobileNumber: '+91 98409 55109',
        authorizedContributorIds: [effectiveFirebaseUser.uid],
        updatedAt: new Date().toISOString(),
      };
    }
    try {
      const snap = await getDoc(
        doc(db, 'food_assistance_requests', assistanceId, 'private', 'contact')
      );
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        assistanceId: String(d.assistanceId || assistanceId),
        requesterId: String(d.requesterId || ''),
        fullName: String(d.fullName || ''),
        mobileNumber: String(d.mobileNumber || ''),
        authorizedContributorIds: Array.isArray(d.authorizedContributorIds)
          ? (d.authorizedContributorIds as string[])
          : [],
        updatedAt: tsToIso(d.updatedAt) || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  };

  const homeageManageFoodAssistance = async (
    assistanceId: string,
    updates: HomeageAssistanceUpdateInput
  ) => {
    if (!effectiveFirebaseUser || (portalRole !== 'HOMEAGE' && !isAdmin)) {
      throw new Error('Orphanage authorization required.');
    }
    const target = foodAssistanceRequests.find((r) => r.assistanceId === assistanceId);
    if (!target) throw new Error('Food assistance request not found.');

    const nextFulfilled =
      target.fulfilledQuantity + (updates.fulfilledQuantityIncrement || 0);
    const nextPublicStatus: FoodAssistanceRequest['status'] =
      updates.homeageStatus === 'Completed' || updates.homeageStatus === 'Successfully Delivered'
        ? 'Completed'
        : nextFulfilled >= target.requiredQuantity
        ? 'Fully Fulfilled'
        : updates.homeageStatus === 'Food Arranged' ||
          updates.homeageStatus === 'Distribution Scheduled' ||
          updates.homeageStatus === 'Out for Delivery'
        ? 'Partially Fulfilled'
        : updates.homeageStatus === 'Accepted'
        ? 'Contributions Received'
        : target.status;

    if (!firebaseUser && isDemo) {
      setFoodAssistanceMap((prev) => ({
        ...prev,
        [assistanceId]: {
          ...target,
          homeageStatus: updates.homeageStatus,
          status: nextPublicStatus,
          fulfilledQuantity: Math.min(100000, nextFulfilled),
          assignedHomeageId: homeageAccount?.homeageId || target.assignedHomeageId,
          assignedHomeageName: homeageAccount?.homeageName || target.assignedHomeageName,
          assignedVolunteerName:
            updates.assignedVolunteerName !== undefined
              ? updates.assignedVolunteerName.trim()
              : target.assignedVolunteerName,
          distributionScheduledAt:
            updates.distributionScheduledAt !== undefined
              ? updates.distributionScheduledAt.trim()
              : target.distributionScheduledAt,
          updatedAt: new Date().toISOString(),
        },
      }));
      return;
    }

    const payload: Record<string, unknown> = {
      homeageStatus: updates.homeageStatus,
      status: nextPublicStatus,
      fulfilledQuantity: Math.min(100000, nextFulfilled),
      updatedAt: serverTimestamp(),
    };
    if (homeageAccount) {
      payload.assignedHomeageId = homeageAccount.homeageId;
      payload.assignedHomeageName = homeageAccount.homeageName;
    }
    if (updates.assignedVolunteerName !== undefined) {
      payload.assignedVolunteerName = updates.assignedVolunteerName.trim().slice(0, 100);
      if (updates.assignedVolunteerName.trim()) {
        payload.volunteersCount = (target.volunteersCount || 0) + 1;
      }
    }
    if (updates.distributionScheduledAt !== undefined) {
      payload.distributionScheduledAt = updates.distributionScheduledAt.trim().slice(0, 80);
    }

    const batch = writeBatch(db);
    batch.update(doc(db, 'food_assistance_requests', assistanceId), payload);
    batch.set(doc(db, 'notifications', `far_upd_${assistanceId}_${Date.now()}`), {
      userId: target.requesterId,
      actorId: firebaseUser.uid,
      foodAssistanceId: assistanceId,
      title: `Food Request Update: ${updates.homeageStatus === 'Waiting for Homeage' ? 'Waiting for Orphanage' : updates.homeageStatus}`,
      message: `${homeageAccount?.homeageName || 'Orphanage'} updated your food request (${assistanceId}) to "${updates.homeageStatus === 'Waiting for Homeage' ? 'Waiting for Orphanage' : updates.homeageStatus}".`,
      notificationType: 'FOOD_CONTRIBUTION_OFFERED',
      actionUrl: `/food-assistance`,
      deliveryChannels: ['in_app'],
      isRead: false,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  };

  const offerFoodContribution = async (
    input: OfferFoodContributionInput
  ): Promise<FoodContribution> => {
    const fbUser = requireSignedIn();
    const target = foodAssistanceRequests.find((r) => r.assistanceId === input.assistanceId);
    if (!target) throw new Error('Food assistance request not found.');

    const contributionId = `FCT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const qty = Math.max(1, Number(input.foodQuantity) || 1);
    const nextFulfilled = target.fulfilledQuantity + qty;
    const nextStatus: FoodAssistanceRequest['status'] =
      nextFulfilled >= target.requiredQuantity ? 'Fully Fulfilled' : 'Partially Fulfilled';
    const nowIso = new Date().toISOString();

    const contribDoc = {
      contributionId,
      assistanceId: target.assistanceId,
      requesterId: target.requesterId,
      donorId: fbUser.uid,
      donorName: input.donorName.trim().slice(0, 80),
      foodCategory: input.foodCategory,
      foodQuantity: qty,
      quantityUnit: input.quantityUnit.trim().slice(0, 40) || target.requiredUnit,
      servings: Math.max(1, Number(input.servings) || 1),
      deliveryMode: input.deliveryMode,
      contactDetails: input.contactDetails.trim().slice(0, 200),
      status: 'Offered' as const,
      createdAt: serverTimestamp(),
    };

    if (firebaseUser) {
      const batch = writeBatch(db);
      batch.set(doc(db, 'food_contributions', contributionId), contribDoc);
      batch.update(doc(db, 'food_assistance_requests', target.assistanceId), {
        fulfilledQuantity: nextFulfilled,
        contributionsCount: (target.contributionsCount || 0) + 1,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'notifications', `fct_${contributionId}`), {
        userId: target.requesterId,
        actorId: fbUser.uid,
        foodAssistanceId: target.assistanceId,
        title: `Food Contribution Offered!`,
        message: `${contribDoc.donorName} pledged ${qty} ${contribDoc.quantityUnit} (${input.deliveryMode}) for your food request.`,
        notificationType: 'FOOD_CONTRIBUTION_OFFERED',
        actionUrl: `/food-assistance`,
        deliveryChannels: ['in_app'],
        isRead: false,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    }

    return {
      id: contributionId,
      ...contribDoc,
      createdAt: nowIso,
    };
  };

  // Verified Razorpay Test Mode Money Donation (NEVER counts unverified payments)
  const initiateAndVerifyMoneyDonation = async (
    input: InitiateMoneyDonationInput
  ): Promise<MoneyDonation> => {
    const fbUser = requireSignedIn();
    const numericAmount = Math.round(Number(input.amount));
    if (!numericAmount || numericAmount < 10) {
      throw new Error('Please enter a valid donation amount (minimum ₹10).');
    }

    // Step 1: Create signed Razorpay Test Order on backend
    const createRes = await fetch('/api/payments/razorpay/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: numericAmount,
        donorId: fbUser.uid,
        assistanceId: input.assistanceId || 'GENERAL',
        assistanceTitle: input.targetTitle.trim().slice(0, 160),
        targetType: input.targetType,
        homeageId: input.homeageId,
        donorName: input.isAnonymous ? 'Anonymous Supporter' : input.donorName,
        isAnonymous: Boolean(input.isAnonymous),
        paymentMethod: input.paymentMethod,
      }),
    });
    const orderData = await createRes.json();
    if (!createRes.ok || !orderData.success) {
      throw new Error(orderData.error || 'Failed to initiate Razorpay payment order.');
    }

    // Step 2: Verify cryptographic payment signature on backend before persisting anything
    const verifyRes = await fetch('/api/payments/razorpay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderData.orderId,
        paymentId: orderData.suggestedTestPaymentId,
        signature: orderData.testCheckoutSignature,
      }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.verified) {
      throw new Error(verifyData.error || 'Payment verification failed. Donation was not counted.');
    }

    const donationTxId = `MTX-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString();
    const assistanceId =
      input.targetType === 'ASSISTANCE_REQUEST' && input.assistanceId
        ? input.assistanceId
        : input.targetType === 'HOMEAGE' && input.homeageId
        ? input.homeageId
        : 'GENERAL';

    const txDoc: Record<string, unknown> = {
      donationTxId,
      orderId: String(orderData.orderId),
      razorpayPaymentId: String(verifyData.razorpayPaymentId || orderData.suggestedTestPaymentId),
      donorId: fbUser.uid,
      donorName: input.isAnonymous
        ? 'Anonymous Supporter'
        : (input.donorName.trim() || user.name).slice(0, 80),
      isAnonymous: Boolean(input.isAnonymous),
      targetType: input.targetType,
      assistanceId,
      assistanceTitle: input.targetTitle.trim().slice(0, 160),
      amount: numericAmount,
      currency: 'INR',
      paymentMethod: input.paymentMethod,
      status: 'VERIFIED',
      providerMode: 'RAZORPAY_TEST',
      receiptNumber: String(verifyData.receiptNumber),
      createdAt: serverTimestamp(),
      verifiedAt: serverTimestamp(),
    };
    if (input.homeageId) txDoc.homeageId = input.homeageId;

    const resultObj: MoneyDonation = {
      id: donationTxId,
      donationTxId,
      orderId: String(orderData.orderId),
      razorpayPaymentId: String(orderData.simulatedPaymentId),
      donorId: fbUser.uid,
      donorName: String(txDoc.donorName),
      isAnonymous: Boolean(input.isAnonymous),
      targetType: input.targetType,
      homeageId: input.homeageId,
      assistanceId,
      assistanceTitle: String(txDoc.assistanceTitle),
      amount: numericAmount,
      currency: 'INR',
      paymentMethod: input.paymentMethod,
      status: 'VERIFIED',
      providerMode: 'RAZORPAY_TEST',
      receiptNumber: String(verifyData.receiptNumber),
      createdAt: nowIso,
      verifiedAt: nowIso,
    };

    if (!firebaseUser) {
      setMoneyDonationsMap((prev) => ({ ...prev, [donationTxId]: resultObj }));
      return resultObj;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'money_donations', donationTxId), txDoc);

    if (input.targetType === 'ASSISTANCE_REQUEST' && input.assistanceId) {
      const targetReq = foodAssistanceRequests.find((r) => r.assistanceId === input.assistanceId);
      if (targetReq) {
        const nextRaised = (targetReq.amountRaised || 0) + numericAmount;
        batch.update(doc(db, 'food_assistance_requests', targetReq.assistanceId), {
          amountRaised: nextRaised,
          contributionsCount: (targetReq.contributionsCount || 0) + 1,
          status:
            targetReq.amountTarget > 0 && nextRaised >= targetReq.amountTarget
              ? 'Fully Fulfilled'
              : 'Contributions Received',
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'notifications', `money_${donationTxId}`), {
          userId: targetReq.requesterId,
          actorId: fbUser.uid,
          foodAssistanceId: targetReq.assistanceId,
          title: `Verified ₹${numericAmount.toLocaleString()} Food Donation Received`,
          message: `${txDoc.donorName} contributed ₹${numericAmount.toLocaleString()} (Receipt ${verifyData.receiptNumber}).`,
          notificationType: 'FOOD_MONEY_DONATED',
          actionUrl: `/food-assistance`,
          deliveryChannels: ['in_app'],
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    } else if (input.targetType === 'HOMEAGE' && input.homeageId) {
      const targetHomeage = homeageOrganizations.find((h) => h.homeageId === input.homeageId);
      if (targetHomeage?.authUid) {
        batch.set(doc(db, 'notifications', `money_hmg_${donationTxId}`), {
          userId: targetHomeage.authUid,
          actorId: fbUser.uid,
          title: `Verified ₹${numericAmount.toLocaleString()} Orphanage Donation`,
          message: `${txDoc.donorName} donated ₹${numericAmount.toLocaleString()} to ${targetHomeage.name} (Receipt ${verifyData.receiptNumber}).`,
          notificationType: 'FOOD_MONEY_DONATED',
          actionUrl: `/orphanage`,
          deliveryChannels: ['in_app'],
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
    return resultObj;
  };

  const registerFoodVolunteer = async (input: {
    volunteerName: string;
    mobile: string;
    city: string;
    role: FoodVolunteerRole;
    availability: string;
    assistanceId?: string;
  }): Promise<VolunteerRegistration> => {
    const fbUser = requireSignedIn();
    const volunteerId = `VOL-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString();

    const payload: Record<string, unknown> = {
      volunteerId,
      userId: fbUser.uid,
      volunteerName: input.volunteerName.trim().slice(0, 80),
      mobile: input.mobile.trim().slice(0, 30),
      city: input.city.trim().slice(0, 80),
      role: input.role,
      availability: input.availability.trim().slice(0, 120),
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
    };
    if (input.assistanceId) payload.assistanceId = input.assistanceId;

    const created: VolunteerRegistration = {
      id: volunteerId,
      volunteerId,
      userId: fbUser.uid,
      volunteerName: String(payload.volunteerName),
      mobile: String(payload.mobile),
      city: String(payload.city),
      role: input.role,
      assistanceId: input.assistanceId,
      availability: String(payload.availability),
      status: 'ACTIVE',
      createdAt: nowIso,
    };

    if (!firebaseUser) {
      setVolunteersMap((prev) => ({ ...prev, [volunteerId]: created }));
      return created;
    }

    const batch = writeBatch(db);
    batch.set(doc(db, 'volunteer_registrations', volunteerId), payload);
    if (input.assistanceId) {
      const target = foodAssistanceRequests.find((r) => r.assistanceId === input.assistanceId);
      if (target) {
        batch.update(doc(db, 'food_assistance_requests', target.assistanceId), {
          volunteersCount: (target.volunteersCount || 0) + 1,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db, 'notifications', `vol_${volunteerId}`), {
          userId: target.requesterId,
          actorId: fbUser.uid,
          foodAssistanceId: target.assistanceId,
          title: `Volunteer Joined for Food Delivery`,
          message: `${payload.volunteerName} volunteered for "${input.role}" (${payload.availability}).`,
          notificationType: 'FOOD_VOLUNTEER_JOINED',
          actionUrl: `/food-assistance`,
          deliveryChannels: ['in_app'],
          isRead: false,
          createdAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();
    return created;
  };

  return (
    <AppContext.Provider
      value={{
        firebaseUser: effectiveFirebaseUser,
        authReady,
        awaitingRegistrationVerification,
        setAwaitingRegistrationVerification,
        isAdmin,
        isDemo,
        loadingData,
        user,
        impact,
        requests,
        proofs,
        submissions,
        confirmations,
        issues,
        notifications,
        auditLogs,
        donations,
        messages,
        signInWithGoogle,
        signOutUser,
        loginAsDemo,
        loginAsDemoPortal,
        loginAsDemoMultiRole,
        addRequest,
        acceptRequest,
        startAssistance,
        startJourney,
        markArrived,
        startAssistanceProgress,
        cancelRequestWithReason,
        submitCompletion,
        confirmAssistance,
        markNotYetReceived,
        reportIssue,
        markNotificationRead,
        markAllNotificationsRead,
        adminUpdateIssue,
        adminUpdateProofStatus,
        donateToRequest,
        sendMessage,
        helperAcceptances,
        acceptRequestSlot,
        selectHelper,
        confirmProvideHelp,
        rejectProvideHelp,
        reopenRequestRound,
        runConcurrencyTest,
        donorProfiles,
        myDonorProfile,
        bloodRequests,
        bloodDonorMatches,
        bloodDonationHistory,
        updateDonorProfile,
        createBloodRequest,
        getBloodRequestPrivateContact,
        respondToBloodRequest,
        selectBloodDonor,
        scheduleBloodDonation,
        completeBloodDonationUnits,
        cancelBloodRequest,
        sendBloodChatMessage,
        markChatMessagesRead,
        pushPermission,
        requestPushPermission,
        portalRole,
        availableRoles,
        hasMultipleRoles,
        selectPortal,
        clearSelectedPortal,
        roleResolved,
        hospitalAccount,
        homeageAccount,
        hospitals,
        homeageOrganizations,
        doctors,
        doctorAppointments,
        foodDonations,
        foodCollectionRequests,
        foodAssistanceRequests,
        foodContributions,
        moneyDonations,
        volunteerRegistrations,
        foodCertificates,
        adminCreateHospitalAccount,
        adminUpdateHospital,
        adminCreateHomeageAccount,
        adminUpdateHomeage,
        registerHospitalAccount,
        registerHomeageAccount,
        hospitalUpdateBloodRequest,
        hospitalSaveDoctor,
        hospitalUpdateDoctorFlags,
        hospitalUpdateAppointmentStatus,
        bookDoctorAppointment,
        createFoodDonation,
        getFoodDonationPrivateContact,
        submitFoodCollectionRequest,
        homeageAcceptFoodDonation,
        respondFoodCollectionRequest,
        markFoodReadyForPickup,
        confirmFoodHandover,
        createFoodAssistanceRequest,
        getFoodAssistancePrivateContact,
        homeageManageFoodAssistance,
        offerFoodContribution,
        initiateAndVerifyMoneyDonation,
        registerFoodVolunteer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
