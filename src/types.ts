export type RequestCategory =
  | 'Emergency'
  | 'Blood'
  | 'Money'
  | 'Food'
  | 'Medicine'
  | 'Transport'
  | 'Education'
  | 'Shelter'
  | 'Volunteer'
  | 'Other';

export type RequestStatus =
  | 'REQUESTED'
  | 'OPEN'
  | 'WAITING_FOR_HELPERS'
  | 'ONE_HELPER_ACCEPTED'
  | 'TWO_HELPERS_ACCEPTED'
  | 'THREE_HELPERS_FOUND'
  | 'AWAITING_RECEIVER_SELECTION'
  | 'HELPER_SELECTED'
  | 'CONFIRMED'
  | 'HELPER_UNAVAILABLE'
  | 'BACKUP_SELECTION_REQUIRED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'ASSISTANCE_IN_PROGRESS'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'AWAITING_CONFIRMATION'
  | 'COMPLETED_CONFIRMED'
  | 'COMPLETED'
  | 'COMPLETED_UNCONFIRMED'
  | 'REOPENED'
  | 'ISSUE_REPORTED'
  | 'UNDER_REVIEW'
  | 'CANCELLED';

export type HelperAcceptanceStatus =
  | 'ACCEPTED'
  | 'SELECTED'
  | 'CONFIRMED'
  | 'UNAVAILABLE'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface HelperAcceptance {
  id: string;
  acceptanceId: string;
  requestId: string;
  helperId: string;
  helperDisplayName: string;
  helperPhotoUrl?: string;
  helperVerified: boolean;
  helperBloodGroup?: string;
  acceptanceStatus: HelperAcceptanceStatus;
  acceptedAt: string;
  selectedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  approximateDistance: number; // in kilometers (e.g. 1.8)
  estimatedArrival: number; // in minutes (e.g. 10)
  isSelected: boolean;
  matchingRound: number;
  currentAvailability?: string;
  helpCategory?: string;
  previousHelpCount?: number;
  rating?: number;
  reviewsCount?: number;
  feedback?: string;
  locationSharing?: boolean;
  latitude?: number;
  longitude?: number;
  lastLocationUpdate?: string;
  isRecommended?: boolean;
}

export type RequestUrgency = 'Normal' | 'High' | 'Urgent' | 'Immediate';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  location: string;
  bloodGroup: string;
  profilePhoto: string;
  verified: boolean;
  isAdmin?: boolean;
  canProvide: string[];
  stats: {
    peopleHelped: number;
    requestsCompleted: number;
    volunteerHours: number;
  };
}

export interface HelpRequest {
  id: string;
  requestId: string;
  requesterId: string;
  requesterName: string;
  requesterVerified: boolean;
  helperId?: string | null;
  helperDisplayName?: string | null;
  helperVerified?: boolean;
  title: string;
  category: RequestCategory;
  description: string;
  location: string;
  distance: string;
  time: RequestUrgency;
  status: RequestStatus;
  bloodGroup?: string;
  units?: number;
  amountNeeded?: number;
  amountCollected?: number;
  createdAt: string;
  acceptedAt?: string | null;
  journeyStartedAt?: string | null;
  arrivedAt?: string | null;
  assistanceStartedAt?: string | null;
  completedAt?: string | null;
  confirmedAt?: string | null;
  cancellationReason?: string | null;
  updatedAt?: string;
  // Multi-helper acceptance fields
  acceptedCount?: number; // 0, 1, 2, 3
  remainingSlots?: number; // 3, 2, 1, 0
  matchingRound?: number; // starts at 1
  selectedHelperId?: string | null;
  acceptanceClosed?: boolean;
  reopenedAt?: string | null;
  activeAcceptances?: HelperAcceptance[];
}

export interface CompletionSubmission {
  id: string;
  requestId: string;
  requesterId: string;
  helperId: string;
  completionDescription?: string;
  evidenceDataUrl?: string;
  evidenceFileName?: string;
  submittedAt: string;
}

export type ConfirmationStatus = 'CONFIRMED' | 'NOT_YET_RECEIVED' | 'ISSUE_REPORTED';

export interface HelpConfirmation {
  id: string;
  requestId: string;
  requesterId: string;
  helperId: string;
  confirmationStatus: ConfirmationStatus;
  feedback?: string;
  rating?: number;
  appreciationMessage?: string;
  explanation?: string;
  confirmedAt: string;
}

export type ProofStatus = 'VALID' | 'SUSPENDED';

export interface DigitalProof {
  id: string;
  proofId: string;
  requestId: string;
  requesterId: string;
  helperId: string;
  requestTitle: string;
  category: RequestCategory;
  requesterDisplayName: string;
  helperDisplayName: string;
  verificationToken: string;
  proofStatus: ProofStatus;
  optionalFeedback?: string;
  rating?: number;
  completedAt?: string;
  confirmedAt?: string;
  generatedAt: string;
}

export type IssueStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FLAGGED';

export interface HelpIssue {
  id: string;
  requestId: string;
  reportedBy: string;
  requesterId: string;
  helperId?: string | null;
  issueDescription: string;
  issueStatus: IssueStatus;
  adminNotes?: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export type NotificationType =
  | 'REQUEST_ACCEPTED'
  | 'HELPER_ACCEPTED_SLOT'
  | 'THREE_HELPERS_READY'
  | 'HELPER_CHOSEN'
  | 'HELPER_CONFIRMED'
  | 'HELPER_REJECTED'
  | 'BACKUP_AVAILABLE'
  | 'REQUEST_REOPENED'
  | 'JOURNEY_STARTED'
  | 'HELPER_ARRIVED'
  | 'ASSISTANCE_COMPLETED'
  | 'COMPLETION_SUBMITTED'
  | 'CONFIRMATION_NEEDED'
  | 'PROOF_GENERATED'
  | 'NOT_RECEIVED'
  | 'ISSUE_REPORTED'
  | 'ADMIN_UPDATED'
  | 'BLOOD_REQUEST_MATCH'
  | 'BLOOD_DONOR_INTERESTED'
  | 'BLOOD_DONOR_SELECTED'
  | 'BLOOD_DONATION_SCHEDULED'
  | 'BLOOD_DONATION_COMPLETED'
  | 'BLOOD_REQUEST_FULFILLED'
  | 'BLOOD_REQUEST_CLOSED'
  | 'FOOD_DONATION_POSTED'
  | 'FOOD_COLLECTION_REQUESTED'
  | 'FOOD_REQUEST_ACCEPTED'
  | 'FOOD_REQUEST_REJECTED'
  | 'FOOD_READY_FOR_PICKUP'
  | 'FOOD_HANDOVER_COMPLETED'
  | 'FOOD_LISTING_CLOSED'
  | 'FOOD_ASSISTANCE_POSTED'
  | 'FOOD_CONTRIBUTION_OFFERED'
  | 'FOOD_MONEY_DONATED'
  | 'FOOD_VOLUNTEER_JOINED';

export interface AppNotification {
  id: string;
  userId: string;
  actorId: string;
  requestId?: string;
  bloodRequestId?: string;
  foodDonationId?: string;
  foodAssistanceId?: string;
  foodCertificateId?: string;
  proofId?: string;
  title: string;
  message: string;
  notificationType: NotificationType;
  actionUrl?: string;
  deliveryChannels?: string[];
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousStatus: string;
  newStatus: string;
  details?: string;
  createdAt: string;
}

export interface ImpactStats {
  peopleHelped: number;
  bloodConnections: number;
  donations: number;
  activeHelpers: number;
  communitiesConnected: number;
}

export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking';

export interface DonationRecord {
  id: string;
  requestId: string;
  recipientName: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef: string;
  note?: string;
  timestamp: string;
}

export type ChatMessageType =
  | 'text'
  | 'hospital_location'
  | 'availability_confirm'
  | 'contact_share';

export interface ChatMessage {
  id: string;
  messageId: string;
  requestId: string;
  recipientId?: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  text: string;
  messageType?: ChatMessageType;
  hospitalName?: string;
  hospitalAddress?: string;
  latitude?: number;
  longitude?: number;
  sharedContact?: string;
  readBy?: string[];
  createdAt: string;
}

// ==================================================
// SMART BLOOD DONOR MATCHING & BROADCAST TYPES
// ==================================================

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type BloodEmergencyLevel = 'Normal' | 'Urgent' | 'Critical';

export type BloodRequestStatus =
  | 'REQUEST_SUBMITTED'
  | 'SEARCHING_FOR_DONORS'
  | 'NOTIFICATIONS_SENT'
  | 'DONORS_INTERESTED'
  | 'DONOR_SELECTED'
  | 'DONATION_SCHEDULED'
  | 'DONATION_COMPLETED'
  | 'REQUEST_FULFILLED'
  | 'REQUEST_CANCELLED';

export type DonorResponseStatus =
  | 'NOTIFIED'
  | 'INTERESTED'
  | 'SELECTED'
  | 'SCHEDULED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CLOSED_FULFILLED'
  | 'CANCELLED';

export interface DonorProfile {
  id: string;
  uid: string;
  displayName: string;
  photoUrl?: string;
  bloodGroup: BloodGroup | '';
  bloodGroupVerified: boolean;
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  isAvailable: boolean;
  city: string;
  approximateArea: string;
  latitude: number;
  longitude: number;
  maxDistanceKm: number;
  notifyInApp: boolean;
  notifyPush: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notificationsOptOut: boolean;
  lastDonationDate?: string | null;
  totalDonations: number;
  updatedAt: string;
}

export interface BloodRequest {
  id: string;
  bloodRequestId: string;
  requesterId: string;
  requesterDisplayName: string;
  patientDisplayName: string;
  requiredBloodGroup: BloodGroup;
  allowCompatibleGroups: boolean;
  requiredUnits: number;
  fulfilledUnits: number;
  confirmedUnits: number;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  requiredDateTime: string;
  emergencyLevel: BloodEmergencyLevel;
  contactPersonName: string;
  additionalMedicalInfo?: string;
  status: BloodRequestStatus;
  matchedDonorsCount: number;
  notificationsSentCount: number;
  interestedDonorsCount: number;
  selectedDonorIds: string[];
  assignedHospitalId?: string | null;
  assignedHospitalName?: string | null;
  hospitalVerified?: boolean;
  hospitalStatus?: HospitalBloodStatus;
  hospitalNotes?: string;
  fulfilledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BloodRequestPrivateContact {
  bloodRequestId: string;
  requesterId: string;
  patientFullName: string;
  contactPhoneNumber: string;
  authorizedDonorIds: string[];
  updatedAt: string;
}

export interface BloodDonorMatch {
  id: string;
  matchId: string;
  bloodRequestId: string;
  requesterId: string;
  donorId: string;
  donorDisplayName: string;
  donorPhotoUrl?: string;
  donorBloodGroup: BloodGroup;
  donorVerified: boolean;
  donorCity: string;
  donorArea?: string;
  donorPhone?: string;
  donorEmail?: string;
  donorNotes?: string;
  distanceKm: number;
  compatibilityType: 'EXACT' | 'COMPATIBLE';
  matchScore: number;
  notificationChannels: string[];
  responseStatus: DonorResponseStatus;
  rejectionReason?: string | null;
  scheduledDateTime?: string | null;
  contactSharedByDonor: boolean;
  contactSharedByRequester: boolean;
  donorConfirmedAvailable: boolean;
  fulfilledUnitsCount: number;
  notifiedAt: string;
  respondedAt?: string | null;
  selectedAt?: string | null;
  completedAt?: string | null;
  updatedAt: string;
}

export interface BloodDonationHistoryRecord {
  id: string;
  historyId: string;
  bloodRequestId: string;
  requesterId: string;
  donorId: string;
  donorDisplayName: string;
  requesterDisplayName: string;
  hospitalName: string;
  city: string;
  bloodGroup: BloodGroup;
  unitsDonated: number;
  status: 'COMPLETED' | 'VERIFIED';
  notes?: string;
  donatedAt: string;
}

// ==================================================
// SMART FOOD DONATION & FOOD RESCUE PORTAL TYPES
// ==================================================

export type FoodDonorType =
  | 'Individual'
  | 'Restaurant'
  | 'Hotel'
  | 'Bakery'
  | 'Supermarket'
  | 'Marriage Hall'
  | 'Event Organizer'
  | 'Food Shop';

export type FoodCategory =
  | 'Cooked Food'
  | 'Rice and Meals'
  | 'Vegetables'
  | 'Fruits'
  | 'Bread and Bakery'
  | 'Packed Food'
  | 'Groceries'
  | 'Other Food Items';

export type FoodDonationStatus =
  | 'Available'
  | 'Request Received'
  | 'Accepted'
  | 'Reserved'
  | 'Ready for Pickup'
  | 'Collected'
  | 'Completed'
  | 'Expired'
  | 'Cancelled';

export interface FoodDonation {
  id: string;
  donationId: string;
  donorId: string;
  donorName: string;
  donorType: FoodDonorType;
  foodName: string;
  category: FoodCategory;
  totalQuantity: number;
  availableQuantity: number;
  quantityUnit: string;
  servingsCount: number;
  preparedAt: string;
  collectionDeadline: string;
  description: string;
  imageUrl?: string;
  pickupArea: string;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  pickupInstructions?: string;
  safetyConfirmed: boolean;
  allowPartialAcceptance?: boolean;
  assignedHomeageId?: string | null;
  assignedHomeageName?: string | null;
  verified: boolean;
  isFlagged?: boolean;
  status: FoodDonationStatus;
  activeRequestsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoodDonationPrivateContact {
  donationId: string;
  donorId: string;
  mobileNumber: string;
  contactDetails: string;
  pickupAddress: string;
  authorizedReceiverIds: string[];
  updatedAt: string;
}

export type FoodCollectionRequestStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected'
  | 'Ready for Pickup'
  | 'Collected'
  | 'Completed'
  | 'Cancelled';

export interface FoodCollectionRequest {
  id: string;
  requestId: string;
  donationId: string;
  donorId: string;
  donorName: string;
  foodName: string;
  foodCategory: FoodCategory;
  receiverId: string;
  receiverName: string;
  receiverMobile: string;
  homeageId?: string | null;
  requestedQuantity: number;
  quantityUnit: string;
  peopleCount: number;
  reason?: string;
  preferredCollectionTime: string;
  pickupLocation: string;
  additionalInfo?: string;
  status: FoodCollectionRequestStatus;
  rejectionReason?: string;
  certificateId?: string;
  createdAt: string;
  acceptedAt?: string | null;
  readyAt?: string | null;
  collectedAt?: string | null;
  updatedAt: string;
}

export type FoodAssistanceStatus =
  | 'Submitted'
  | 'Searching for Donors'
  | 'Contributions Received'
  | 'Partially Fulfilled'
  | 'Fully Fulfilled'
  | 'Completed';

export interface FoodAssistanceRequest {
  id: string;
  assistanceId: string;
  requesterId: string;
  requesterDisplayName: string;
  familyMembersCount: number;
  peopleRequiringFood: number;
  foodRequirement: string;
  requiredQuantity: number;
  fulfilledQuantity: number;
  requiredUnit: string;
  amountTarget: number;
  amountRaised: number;
  foodCategory: FoodCategory;
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  requiredDate: string;
  reason?: string;
  additionalDetails?: string;
  urgencyLevel: 'Normal' | 'Urgent' | 'Critical';
  verified: boolean;
  status: FoodAssistanceStatus;
  homeageStatus?: HomeageFoodRequestStatus;
  assignedHomeageId?: string | null;
  assignedHomeageName?: string | null;
  assignedVolunteerName?: string | null;
  distributionScheduledAt?: string | null;
  contributionsCount: number;
  volunteersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FoodAssistancePrivateContact {
  assistanceId: string;
  requesterId: string;
  fullName: string;
  mobileNumber: string;
  authorizedContributorIds: string[];
  updatedAt: string;
}

export interface FoodContribution {
  id: string;
  contributionId: string;
  assistanceId: string;
  requesterId: string;
  donorId: string;
  donorName: string;
  foodCategory: FoodCategory;
  foodQuantity: number;
  quantityUnit: string;
  servings: number;
  deliveryMode: 'Pickup' | 'Delivery';
  contactDetails: string;
  status: 'Offered' | 'Accepted' | 'Delivered' | 'Completed';
  createdAt: string;
}

export type MoneyDonationTargetType = 'ASSISTANCE_REQUEST' | 'HOMEAGE' | 'GENERAL_FUND';

export interface MoneyDonation {
  id: string;
  donationTxId: string;
  orderId: string;
  razorpayPaymentId: string;
  donorId: string;
  donorName: string;
  isAnonymous: boolean;
  targetType?: MoneyDonationTargetType;
  homeageId?: string;
  assistanceId: string;
  assistanceTitle: string;
  amount: number;
  currency: 'INR';
  paymentMethod: PaymentMethod;
  status: 'VERIFIED' | 'FAILED';
  providerMode: 'RAZORPAY_TEST';
  receiptNumber: string;
  createdAt: string;
  verifiedAt: string;
}

export type FoodVolunteerRole =
  | 'Food Pickup'
  | 'Food Transportation'
  | 'Food Distribution'
  | 'Helping Elderly People'
  | 'Delivering Nearby';

export interface VolunteerRegistration {
  id: string;
  volunteerId: string;
  userId: string;
  volunteerName: string;
  mobile: string;
  city: string;
  role: FoodVolunteerRole;
  assistanceId?: string;
  availability: string;
  status: 'ACTIVE' | 'ASSIGNED' | 'COMPLETED' | 'SUSPENDED';
  createdAt: string;
}

export interface FoodDonationCertificate {
  id: string;
  certificateId: string;
  donationId: string;
  collectionRequestId: string;
  donorId: string;
  donorName: string;
  receiverId: string;
  receiverName: string;
  foodName: string;
  foodCategory: FoodCategory;
  quantityDelivered: number;
  quantityUnit: string;
  city: string;
  verificationToken: string;
  status: 'VALID' | 'SUSPENDED';
  completedAt: string;
  generatedAt: string;
}

// ==================================================
// MULTI-PORTAL ROLE-BASED ARCHITECTURE TYPES
// (ADMIN, HOSPITAL PORTAL, FOOD HOMEAGE PORTAL)
// ==================================================

export type PortalRole = 'USER' | 'ADMIN' | 'HOSPITAL' | 'HOMEAGE';

export type OrganizationStatus = 'ACTIVE' | 'INACTIVE';

export interface HospitalOrganization {
  id: string;
  hospitalId: string;
  name: string;
  hospitalType?: string;
  registrationNumber: string;
  bloodBankLicense?: string;
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  contactPerson: string;
  mobile: string;
  email: string;
  username: string;
  authUid: string;
  status: OrganizationStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalUserAccount {
  id: string;
  uid: string;
  hospitalId: string;
  hospitalName: string;
  email: string;
  username: string;
  role: 'HOSPITAL';
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HomeageOrganization {
  id: string;
  homeageId: string;
  name: string;
  organizationType?: string;
  registrationNumber?: string;
  dailyCapacity?: number;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  username: string;
  authUid: string;
  status: OrganizationStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomeageUserAccount {
  id: string;
  uid: string;
  homeageId: string;
  homeageName: string;
  email: string;
  username: string;
  role: 'HOMEAGE';
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
}

export type HospitalBloodStatus =
  | 'Submitted'
  | 'Under Hospital Verification'
  | 'Donor Search Started'
  | 'Donors Available'
  | 'Donation Scheduled'
  | 'Donation Completed'
  | 'Request Fulfilled'
  | 'Cancelled';

export type HomeageFoodRequestStatus =
  | 'Submitted'
  | 'Waiting for Homeage'
  | 'Accepted'
  | 'Food Arranged'
  | 'Distribution Scheduled'
  | 'Out for Delivery'
  | 'Successfully Delivered'
  | 'Completed'
  | 'Rejected'
  | 'Cancelled';

export interface DoctorProfile {
  id: string;
  doctorId: string;
  hospitalId: string;
  hospitalName: string;
  city: string;
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  consultationFee: number;
  bio?: string;
  availabilityDays: string[];
  availabilitySlots: string[];
  isAvailable: boolean;
  isPublished: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface DoctorAppointment {
  id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospitalId: string;
  hospitalName: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  appointmentDate: string;
  timeSlot: string;
  reason?: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}


