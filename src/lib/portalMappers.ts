import { Timestamp } from 'firebase/firestore';
import {
  AppointmentStatus,
  DoctorAppointment,
  DoctorProfile,
  FoodAssistanceRequest,
  FoodAssistanceStatus,
  FoodCategory,
  FoodCollectionRequest,
  FoodCollectionRequestStatus,
  FoodContribution,
  FoodDonation,
  FoodDonationCertificate,
  FoodDonationStatus,
  FoodDonorType,
  FoodVolunteerRole,
  HomeageFoodRequestStatus,
  HomeageOrganization,
  HomeageUserAccount,
  HospitalBloodStatus,
  HospitalOrganization,
  HospitalUserAccount,
  MoneyDonation,
  MoneyDonationTargetType,
  OrganizationStatus,
  PaymentMethod,
  VolunteerRegistration,
} from '../types';

export function tsToIsoSafe(val: unknown): string {
  if (!val) return '';
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    const s = (val as { seconds: number }).seconds;
    return new Date(s * 1000).toISOString();
  }
  return '';
}

export function mapDocToFoodDonation(id: string, d: Record<string, unknown>): FoodDonation {
  return {
    id,
    donationId: String(d.donationId || id),
    donorId: String(d.donorId || ''),
    donorName: String(d.donorName || 'Community Donor'),
    donorType: (d.donorType as FoodDonorType) || 'Individual',
    foodName: String(d.foodName || ''),
    category: (d.category as FoodCategory) || 'Cooked Food',
    totalQuantity: typeof d.totalQuantity === 'number' ? d.totalQuantity : 1,
    availableQuantity: typeof d.availableQuantity === 'number' ? d.availableQuantity : 0,
    quantityUnit: String(d.quantityUnit || 'meals'),
    servingsCount: typeof d.servingsCount === 'number' ? d.servingsCount : 1,
    preparedAt: String(d.preparedAt || ''),
    collectionDeadline: String(d.collectionDeadline || ''),
    description: String(d.description || ''),
    imageUrl: typeof d.imageUrl === 'string' ? d.imageUrl : undefined,
    pickupArea: String(d.pickupArea || ''),
    city: String(d.city || ''),
    location: String(d.location || ''),
    latitude: typeof d.latitude === 'number' ? d.latitude : 13.0827,
    longitude: typeof d.longitude === 'number' ? d.longitude : 80.2707,
    pickupInstructions: typeof d.pickupInstructions === 'string' ? d.pickupInstructions : undefined,
    safetyConfirmed: Boolean(d.safetyConfirmed),
    allowPartialAcceptance: d.allowPartialAcceptance !== false,
    assignedHomeageId: typeof d.assignedHomeageId === 'string' ? d.assignedHomeageId : null,
    assignedHomeageName: typeof d.assignedHomeageName === 'string' ? d.assignedHomeageName : null,
    verified: Boolean(d.verified),
    isFlagged: Boolean(d.isFlagged),
    status: (d.status as FoodDonationStatus) || 'Available',
    activeRequestsCount: typeof d.activeRequestsCount === 'number' ? d.activeRequestsCount : 0,
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToFoodCollectionRequest(
  id: string,
  d: Record<string, unknown>
): FoodCollectionRequest {
  return {
    id,
    requestId: String(d.requestId || id),
    donationId: String(d.donationId || ''),
    donorId: String(d.donorId || ''),
    donorName: String(d.donorName || ''),
    foodName: String(d.foodName || ''),
    foodCategory: (d.foodCategory as FoodCategory) || 'Cooked Food',
    receiverId: String(d.receiverId || ''),
    receiverName: String(d.receiverName || ''),
    receiverMobile: String(d.receiverMobile || ''),
    homeageId: typeof d.homeageId === 'string' ? d.homeageId : null,
    requestedQuantity: typeof d.requestedQuantity === 'number' ? d.requestedQuantity : 1,
    quantityUnit: String(d.quantityUnit || 'meals'),
    peopleCount: typeof d.peopleCount === 'number' ? d.peopleCount : 1,
    reason: typeof d.reason === 'string' ? d.reason : undefined,
    preferredCollectionTime: String(d.preferredCollectionTime || ''),
    pickupLocation: String(d.pickupLocation || ''),
    additionalInfo: typeof d.additionalInfo === 'string' ? d.additionalInfo : undefined,
    status: (d.status as FoodCollectionRequestStatus) || 'Pending',
    rejectionReason: typeof d.rejectionReason === 'string' ? d.rejectionReason : undefined,
    certificateId: typeof d.certificateId === 'string' ? d.certificateId : undefined,
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    acceptedAt: tsToIsoSafe(d.acceptedAt) || null,
    readyAt: tsToIsoSafe(d.readyAt) || null,
    collectedAt: tsToIsoSafe(d.collectedAt) || null,
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToFoodAssistanceRequest(
  id: string,
  d: Record<string, unknown>
): FoodAssistanceRequest {
  return {
    id,
    assistanceId: String(d.assistanceId || id),
    requesterId: String(d.requesterId || ''),
    requesterDisplayName: String(d.requesterDisplayName || 'Community Member'),
    familyMembersCount: typeof d.familyMembersCount === 'number' ? d.familyMembersCount : 1,
    peopleRequiringFood: typeof d.peopleRequiringFood === 'number' ? d.peopleRequiringFood : 1,
    foodRequirement: String(d.foodRequirement || ''),
    requiredQuantity: typeof d.requiredQuantity === 'number' ? d.requiredQuantity : 1,
    fulfilledQuantity: typeof d.fulfilledQuantity === 'number' ? d.fulfilledQuantity : 0,
    requiredUnit: String(d.requiredUnit || 'meals'),
    amountTarget: typeof d.amountTarget === 'number' ? d.amountTarget : 0,
    amountRaised: typeof d.amountRaised === 'number' ? d.amountRaised : 0,
    foodCategory: (d.foodCategory as FoodCategory) || 'Rice and Meals',
    city: String(d.city || ''),
    location: String(d.location || ''),
    latitude: typeof d.latitude === 'number' ? d.latitude : 13.0827,
    longitude: typeof d.longitude === 'number' ? d.longitude : 80.2707,
    requiredDate: String(d.requiredDate || ''),
    reason: typeof d.reason === 'string' ? d.reason : undefined,
    additionalDetails: typeof d.additionalDetails === 'string' ? d.additionalDetails : undefined,
    urgencyLevel: (d.urgencyLevel as FoodAssistanceRequest['urgencyLevel']) || 'Normal',
    verified: Boolean(d.verified),
    status: (d.status as FoodAssistanceStatus) || 'Submitted',
    homeageStatus: (d.homeageStatus as HomeageFoodRequestStatus) || 'Waiting for Homeage',
    assignedHomeageId: typeof d.assignedHomeageId === 'string' ? d.assignedHomeageId : null,
    assignedHomeageName: typeof d.assignedHomeageName === 'string' ? d.assignedHomeageName : null,
    assignedVolunteerName:
      typeof d.assignedVolunteerName === 'string' ? d.assignedVolunteerName : null,
    distributionScheduledAt:
      typeof d.distributionScheduledAt === 'string' ? d.distributionScheduledAt : null,
    contributionsCount: typeof d.contributionsCount === 'number' ? d.contributionsCount : 0,
    volunteersCount: typeof d.volunteersCount === 'number' ? d.volunteersCount : 0,
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToFoodContribution(id: string, d: Record<string, unknown>): FoodContribution {
  return {
    id,
    contributionId: String(d.contributionId || id),
    assistanceId: String(d.assistanceId || ''),
    requesterId: String(d.requesterId || ''),
    donorId: String(d.donorId || ''),
    donorName: String(d.donorName || ''),
    foodCategory: (d.foodCategory as FoodCategory) || 'Cooked Food',
    foodQuantity: typeof d.foodQuantity === 'number' ? d.foodQuantity : 1,
    quantityUnit: String(d.quantityUnit || 'meals'),
    servings: typeof d.servings === 'number' ? d.servings : 1,
    deliveryMode: d.deliveryMode === 'Delivery' ? 'Delivery' : 'Pickup',
    contactDetails: String(d.contactDetails || ''),
    status: (d.status as FoodContribution['status']) || 'Offered',
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
  };
}

export function mapDocToMoneyDonation(id: string, d: Record<string, unknown>): MoneyDonation {
  return {
    id,
    donationTxId: String(d.donationTxId || id),
    orderId: String(d.orderId || ''),
    razorpayPaymentId: String(d.razorpayPaymentId || ''),
    donorId: String(d.donorId || ''),
    donorName: String(d.donorName || 'Anonymous Supporter'),
    isAnonymous: Boolean(d.isAnonymous),
    targetType: (d.targetType as MoneyDonationTargetType) || 'ASSISTANCE_REQUEST',
    homeageId: typeof d.homeageId === 'string' ? d.homeageId : undefined,
    assistanceId: String(d.assistanceId || 'GENERAL'),
    assistanceTitle: String(d.assistanceTitle || 'Food Assistance Fund'),
    amount: typeof d.amount === 'number' ? d.amount : 0,
    currency: 'INR',
    paymentMethod: (d.paymentMethod as PaymentMethod) || 'UPI',
    status: d.status === 'FAILED' ? 'FAILED' : 'VERIFIED',
    providerMode: 'RAZORPAY_TEST',
    receiptNumber: String(d.receiptNumber || ''),
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    verifiedAt: tsToIsoSafe(d.verifiedAt) || new Date().toISOString(),
  };
}

export function mapDocToVolunteerRegistration(
  id: string,
  d: Record<string, unknown>
): VolunteerRegistration {
  return {
    id,
    volunteerId: String(d.volunteerId || id),
    userId: String(d.userId || ''),
    volunteerName: String(d.volunteerName || ''),
    mobile: String(d.mobile || ''),
    city: String(d.city || ''),
    role: (d.role as FoodVolunteerRole) || 'Food Distribution',
    assistanceId: typeof d.assistanceId === 'string' ? d.assistanceId : undefined,
    availability: String(d.availability || ''),
    status: (d.status as VolunteerRegistration['status']) || 'ACTIVE',
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
  };
}

export function mapDocToFoodCertificate(
  id: string,
  d: Record<string, unknown>
): FoodDonationCertificate {
  return {
    id,
    certificateId: String(d.certificateId || id),
    donationId: String(d.donationId || ''),
    collectionRequestId: String(d.collectionRequestId || ''),
    donorId: String(d.donorId || ''),
    donorName: String(d.donorName || ''),
    receiverId: String(d.receiverId || ''),
    receiverName: String(d.receiverName || ''),
    foodName: String(d.foodName || ''),
    foodCategory: (d.foodCategory as FoodCategory) || 'Cooked Food',
    quantityDelivered: typeof d.quantityDelivered === 'number' ? d.quantityDelivered : 1,
    quantityUnit: String(d.quantityUnit || 'meals'),
    city: String(d.city || ''),
    verificationToken: String(d.verificationToken || ''),
    status: d.status === 'SUSPENDED' ? 'SUSPENDED' : 'VALID',
    completedAt: tsToIsoSafe(d.completedAt) || new Date().toISOString(),
    generatedAt: tsToIsoSafe(d.generatedAt) || new Date().toISOString(),
  };
}

export function mapDocToHospitalOrg(id: string, d: Record<string, unknown>): HospitalOrganization {
  return {
    id,
    hospitalId: String(d.hospitalId || id),
    name: String(d.name || ''),
    hospitalType: typeof d.hospitalType === 'string' ? d.hospitalType : undefined,
    registrationNumber: String(d.registrationNumber || ''),
    bloodBankLicense: typeof d.bloodBankLicense === 'string' ? d.bloodBankLicense : undefined,
    address: String(d.address || ''),
    city: String(d.city || ''),
    state: String(d.state || ''),
    postalCode: typeof d.postalCode === 'string' ? d.postalCode : undefined,
    contactPerson: String(d.contactPerson || ''),
    mobile: String(d.mobile || ''),
    email: String(d.email || ''),
    username: String(d.username || ''),
    authUid: String(d.authUid || ''),
    status: (d.status as OrganizationStatus) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdBy: String(d.createdBy || ''),
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToHospitalUser(id: string, d: Record<string, unknown>): HospitalUserAccount {
  return {
    id,
    uid: String(d.uid || id),
    hospitalId: String(d.hospitalId || ''),
    hospitalName: String(d.hospitalName || ''),
    email: String(d.email || ''),
    username: String(d.username || ''),
    role: 'HOSPITAL',
    status: (d.status as OrganizationStatus) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToHomeageOrg(id: string, d: Record<string, unknown>): HomeageOrganization {
  return {
    id,
    homeageId: String(d.homeageId || id),
    name: String(d.name || ''),
    organizationType: typeof d.organizationType === 'string' ? d.organizationType : undefined,
    registrationNumber: typeof d.registrationNumber === 'string' ? d.registrationNumber : undefined,
    dailyCapacity: typeof d.dailyCapacity === 'number' ? d.dailyCapacity : undefined,
    contactPerson: String(d.contactPerson || ''),
    mobile: String(d.mobile || ''),
    email: String(d.email || ''),
    address: String(d.address || ''),
    city: String(d.city || ''),
    state: String(d.state || ''),
    postalCode: typeof d.postalCode === 'string' ? d.postalCode : undefined,
    username: String(d.username || ''),
    authUid: String(d.authUid || ''),
    status: (d.status as OrganizationStatus) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdBy: String(d.createdBy || ''),
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToHomeageUser(id: string, d: Record<string, unknown>): HomeageUserAccount {
  return {
    id,
    uid: String(d.uid || id),
    homeageId: String(d.homeageId || ''),
    homeageName: String(d.homeageName || ''),
    email: String(d.email || ''),
    username: String(d.username || ''),
    role: 'HOMEAGE',
    status: (d.status as OrganizationStatus) === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToDoctorProfile(id: string, d: Record<string, unknown>): DoctorProfile {
  return {
    id,
    doctorId: String(d.doctorId || id),
    hospitalId: String(d.hospitalId || ''),
    hospitalName: String(d.hospitalName || ''),
    city: String(d.city || ''),
    name: String(d.name || ''),
    specialty: String(d.specialty || ''),
    qualification: String(d.qualification || ''),
    experienceYears: typeof d.experienceYears === 'number' ? d.experienceYears : 0,
    consultationFee: typeof d.consultationFee === 'number' ? d.consultationFee : 0,
    bio: typeof d.bio === 'string' ? d.bio : undefined,
    availabilityDays: Array.isArray(d.availabilityDays) ? (d.availabilityDays as string[]) : [],
    availabilitySlots: Array.isArray(d.availabilitySlots) ? (d.availabilitySlots as string[]) : [],
    isAvailable: d.isAvailable !== false,
    isPublished: Boolean(d.isPublished),
    verified: d.verified !== false,
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

export function mapDocToDoctorAppointment(
  id: string,
  d: Record<string, unknown>
): DoctorAppointment {
  return {
    id,
    appointmentId: String(d.appointmentId || id),
    doctorId: String(d.doctorId || ''),
    doctorName: String(d.doctorName || ''),
    specialty: String(d.specialty || ''),
    hospitalId: String(d.hospitalId || ''),
    hospitalName: String(d.hospitalName || ''),
    patientId: String(d.patientId || ''),
    patientName: String(d.patientName || ''),
    patientMobile: String(d.patientMobile || ''),
    appointmentDate: String(d.appointmentDate || ''),
    timeSlot: String(d.timeSlot || ''),
    reason: typeof d.reason === 'string' ? d.reason : undefined,
    status: (d.status as AppointmentStatus) || 'PENDING',
    createdAt: tsToIsoSafe(d.createdAt) || new Date().toISOString(),
    updatedAt: tsToIsoSafe(d.updatedAt) || new Date().toISOString(),
  };
}

// Input Interfaces for Context Actions
export interface CreateHospitalAccountInput {
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
  password?: string;
  useCurrentAuthUser?: boolean;
}

export interface CreateHomeageAccountInput {
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
  password?: string;
  useCurrentAuthUser?: boolean;
}

export interface CreateFoodDonationInput {
  donorName: string;
  donorType: FoodDonorType;
  mobileNumber: string;
  foodName: string;
  category: FoodCategory;
  totalQuantity: number;
  quantityUnit: string;
  servingsCount: number;
  preparedAt: string;
  collectionDeadline: string;
  description: string;
  imageUrl?: string;
  pickupAddress: string;
  city: string;
  location: string;
  pickupInstructions?: string;
  contactDetails?: string;
  safetyConfirmed: boolean;
  allowPartialAcceptance?: boolean;
}

export interface CreateFoodCollectionRequestInput {
  donationId: string;
  receiverName: string;
  receiverMobile: string;
  requestedQuantity: number;
  peopleCount: number;
  reason?: string;
  preferredCollectionTime: string;
  pickupLocation: string;
  additionalInfo?: string;
}

export interface CreateFoodAssistanceInput {
  fullName: string;
  mobileNumber: string;
  familyMembersCount: number;
  peopleRequiringFood: number;
  foodRequirement: string;
  requiredQuantity: number;
  requiredUnit: string;
  amountTarget?: number;
  foodCategory: FoodCategory;
  city: string;
  location: string;
  requiredDate: string;
  reason?: string;
  additionalDetails?: string;
  urgencyLevel: 'Normal' | 'Urgent' | 'Critical';
}

export interface OfferFoodContributionInput {
  assistanceId: string;
  donorName: string;
  foodCategory: FoodCategory;
  foodQuantity: number;
  quantityUnit: string;
  servings: number;
  deliveryMode: 'Pickup' | 'Delivery';
  contactDetails: string;
}

export interface InitiateMoneyDonationInput {
  targetType: MoneyDonationTargetType;
  assistanceId?: string;
  homeageId?: string;
  targetTitle: string;
  amount: number;
  donorName: string;
  isAnonymous: boolean;
  paymentMethod: PaymentMethod;
}

export interface SaveDoctorInput {
  doctorId?: string;
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
}

export interface BookAppointmentInput {
  doctorId: string;
  patientName: string;
  patientMobile: string;
  appointmentDate: string;
  timeSlot: string;
  reason?: string;
}

export type HospitalBloodUpdateInput = {
  hospitalStatus: HospitalBloodStatus;
  hospitalVerified?: boolean;
  hospitalNotes?: string;
  assignToSelf?: boolean;
};

export type HomeageAssistanceUpdateInput = {
  homeageStatus: HomeageFoodRequestStatus;
  assignedVolunteerName?: string;
  distributionScheduledAt?: string;
  fulfilledQuantityIncrement?: number;
};
