export type UserRole =
  | 'PlatformAdmin'
  | 'SalesAgent'
  | 'ClinicAdmin'
  | 'Doctor'
  | 'Nurse'
  | 'Receptionist';

export type Gender = 'Male' | 'Female' | 'Other';
export type VisitStatus = 'Waiting' | 'InConsultation' | 'Completed' | 'Cancelled';
export type DosageTiming = 'AfterFood' | 'BeforeFood' | 'WithFood' | 'Bedtime' | 'EmptyStomach';
export type DosageForm =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Ointment'
  | 'Drops'
  | 'Inhaler'
  | 'Powder'
  | 'Lotion'
  | 'Other';

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  clinicId?: string;
  clinicName?: string;
  doctorName?: string;
  regNumber?: string;
  qualifications?: string;
  speciality?: string;
  letterheadMarginTopMm: number;
  printBottomMarginMm: number;
  hideLetterheadOnPrint: boolean;
  clinicTimings?: string;
}

export interface DoctorProfile {
  userId: string;
  fullName: string;
  qualifications?: string;
  medicalCouncilRegistrationNumber?: string;
  speciality?: string;
  consultationFee?: number;
}

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  qualifications?: string;
  medicalCouncilRegistrationNumber?: string;
  speciality?: string;
  consultationFee?: number;
}

export interface Patient {
  id: string;
  clinicId: string;
  patientUid: string;
  fullName: string;
  age: number;
  gender: Gender;
  mobileNumber: string;
  email?: string;
  bloodGroup?: string;
  address?: string;
  allergies?: string;
  medicalHistory?: string;
  createdAt: string;
}

export interface PatientSearchResult {
  id: string;
  patientUid: string;
  fullName: string;
  age: number;
  gender: Gender;
  mobileNumber: string;
  allergies?: string;
  lastVisitDate?: string;
  lastDoctorId?: string;
  lastDoctorName?: string;
  todayVisitDoctorId?: string;
  todayVisitDoctorName?: string;
  todayVisitTokenNumber?: number;
  todayVisitStatus?: VisitStatus;
}

export interface VisitVitalItem {
  vitalMasterId: string;
  code: string;
  displayName: string;
  valueText: string;
  valueNumeric?: number;
  unitSnapshot: string;
  isAbnormal: boolean;
  inputType: string;
  pairGroup?: string;
  recordedAt: string;
}

export interface Vitals {
  systolicBp?: number;
  diastolicBp?: number;
  pulseBpm?: number;
  temperatureF?: number;
  spo2?: number;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  sugar?: string;
  recordedVitals?: VisitVitalItem[];
  hasAbnormal?: boolean;
}

export interface VitalMaster {
  id: string;
  clinicId?: string;
  code: string;
  displayName: string;
  unit: string;
  inputType: 'Number' | 'Decimal' | 'Text' | 'Select' | 'Computed' | 'Paired';
  pairGroup?: string;
  normalRangeMin?: number;
  normalRangeMax?: number;
  defaultDisplayOrder: number;
  isActive: boolean;
  isCustom: boolean;
}

export interface ClinicVitalPreference {
  id: string;
  vitalMasterId: string;
  code: string;
  displayName: string;
  unit: string;
  inputType: 'Number' | 'Decimal' | 'Text' | 'Select' | 'Computed' | 'Paired';
  pairGroup?: string;
  masterRangeMin?: number;
  masterRangeMax?: number;
  normalRangeMinOverride?: number;
  normalRangeMaxOverride?: number;
  effectiveRangeMin?: number;
  effectiveRangeMax?: number;
  isEnabled: boolean;
  isMandatory: boolean;
  displayOrder: number;
  isCustom: boolean;
}

export interface UpdateVitalPreferenceItem {
  vitalMasterId: string;
  isEnabled: boolean;
  isMandatory: boolean;
  displayOrder: number;
  normalRangeMinOverride?: number | null;
  normalRangeMaxOverride?: number | null;
}

export interface CreateCustomVitalRequest {
  code: string;
  displayName: string;
  unit: string;
  inputType: string;
  pairGroup?: string;
  normalRangeMin?: number;
  normalRangeMax?: number;
  displayOrder?: number;
  isMandatory?: boolean;
}

export interface CreateGlobalVitalMasterRequest {
  code: string;
  displayName: string;
  unit: string;
  inputType: string;
  pairGroup?: string;
  normalRangeMin?: number;
  normalRangeMax?: number;
  defaultDisplayOrder: number;
}

export interface RecordVisitVitalItemRequest {
  vitalMasterId?: string;
  code?: string;
  valueText?: string;
  valueNumeric?: number;
}

export interface PrescriptionItem {
  medicineName: string;
  saltComposition: string;
  form: DosageForm;
  dosage: string;
  timing: DosageTiming;
  durationDays: number;
  instructions?: string;
}

export interface VisitQueueItem {
  id: string;
  patientId: string;
  patientUid: string;
  patientName: string;
  age: number;
  gender: Gender;
  mobileNumber: string;
  allergies?: string;
  medicalHistory?: string;
  doctorId?: string;
  doctorName?: string;
  tokenNumber: number;
  status: VisitStatus;
  visitDate: string;
  vitals?: Vitals;
  chiefComplaints?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  hasPrescription: boolean;
  payment?: VisitPayment;
}

export interface ClinicLetterhead {
  clinicName: string;
  doctorName: string;
  regNumber?: string;
  qualifications?: string;
  specialization?: string;
  phone?: string;
  landline?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  letterheadMarginTopMm: number;
  printBottomMarginMm: number;
  hideLetterheadOnPrint: boolean;
  clinicTimings?: string;
}

export interface PrescriptionLabOrder {
  id: string;
  labTestMasterId: string;
  testCode: string;
  testName: string;
  category: string;
  sampleType?: string;
  fastingRequired: boolean;
  specialInstructions?: string;
  status: string;
}

export interface PrescriptionLabOrderRequest {
  labTestMasterId: string;
  specialInstructions?: string;
}

export interface PrescriptionAdvice {
  id: string;
  adviceTemplateId?: string;
  adviceText: string;
  displayOrder: number;
}

export interface PrescriptionAdviceRequest {
  adviceTemplateId?: string;
  adviceText: string;
  displayOrder?: number;
}

export interface PrescriptionDetail {
  id: string;
  visitId: string;
  patientId: string;
  patientUid: string;
  patientName: string;
  age: number;
  gender: Gender;
  mobileNumber: string;
  bloodGroup?: string;
  allergies?: string;
  doctorId: string;
  doctorName: string;
  prescribedAt: string;
  followUpDate?: string;
  vitals?: Vitals;
  chiefComplaints?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  generalAdvice?: string;
  items: PrescriptionItem[];
  clinic: ClinicLetterhead;
  labOrders: PrescriptionLabOrder[];
  adviceItems: PrescriptionAdvice[];
  pdfShareToken?: string;
  expiresAt?: string;
  isPrinted: boolean;
  isCurrent: boolean;
  previousPrescriptionId?: string;
}

export interface LabTestMaster {
  id: string;
  clinicId?: string;
  testCode: string;
  testName: string;
  category: string;
  sampleType?: string;
  fastingRequired: boolean;
  isActive: boolean;
  isCustom: boolean;
}

export interface LabTestPanel {
  id: string;
  clinicId: string;
  name: string;
  isActive: boolean;
  tests: LabTestMaster[];
}

export interface CreateLabTestRequest {
  testCode: string;
  testName: string;
  category: string;
  sampleType?: string;
  fastingRequired: boolean;
}

export interface UpdateLabTestRequest {
  testCode: string;
  testName: string;
  category: string;
  sampleType?: string;
  fastingRequired: boolean;
  isActive: boolean;
}

export interface CreateLabPanelRequest {
  name: string;
  testIds: string[];
}

export interface UpdateLabPanelRequest {
  name: string;
  isActive: boolean;
  testIds: string[];
}

export interface AdviceTemplate {
  id: string;
  clinicId?: string;
  category: string;
  title: string;
  instructionsText: string;
  isActive: boolean;
  isCustom: boolean;
}

export interface CreateAdviceTemplateRequest {
  category: string;
  title: string;
  instructionsText: string;
}

export interface UpdateAdviceTemplateRequest {
  category: string;
  title: string;
  instructionsText: string;
  isActive: boolean;
}

export interface VisitPayment {
  id: string;
  visitId: string;
  clinicId: string;
  amount: number;
  method: string;
  reference?: string;
  collectedByUserId: string;
  collectedByName: string;
  collectedAt: string;
}

export interface RecordVisitPaymentRequest {
  amount: number;
  method: string;
  reference?: string;
}

export interface DailyCollectionStaffSummary {
  staffId: string;
  staffName: string;
  totalCollected: number;
  cashCollected: number;
  upiCollected: number;
  transactionsCount: number;
}

export interface DailyCollectionReport {
  date: string;
  totalCash: number;
  totalUpi: number;
  grandTotal: number;
  totalTransactions: number;
  staffSummaries: DailyCollectionStaffSummary[];
  payments: VisitPayment[];
}

export interface GenerateShareTokenResponse {
  token: string;
  expiresAt: string;
  shareUrl: string;
}

export interface AuditLog {
  id: string;
  clinicId?: string;
  userId?: string;
  action: string;
  entityName: string;
  entityId: string;
  timestamp: string;
  ipAddress?: string;
  changesJson?: string;
}

export interface Medicine {
  id: string;
  brandName: string;
  saltComposition: string;
  form: DosageForm;
  strength: string;
  manufacturer?: string;
  isCustom: boolean;
  defaultDosage?: string;
  defaultTiming?: DosageTiming;
  isFavorite?: boolean;
  clinicId?: string;
}

export interface ClinicProfile {
  id: string;
  name: string;
  phone?: string;
  landline?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  letterheadMarginTopMm: number;
  printBottomMarginMm: number;
  hideLetterheadOnPrint: boolean;
  clinicTimings?: string;
  patientIdPrefix: string;
  totalPatientsRegistered: number;
}

export type SubscriptionTier = 'Starter' | 'MultiDoctor' | 'Enterprise';
export type BillingCycle = 'Monthly' | 'Quarterly' | 'Annual';
export type SubscriptionStatus = 'Trial' | 'Active' | 'GracePeriod' | 'QuotaExceeded' | 'Suspended';
export type PaymentMethod = 'UPI' | 'Card' | 'NetBanking' | 'Cash' | 'Cheque';
export type PaymentStatus = 'Success' | 'Pending' | 'Failed';

export interface SubscriptionPlan {
  id: string;
  planCode: string;
  planName: string;
  tier: SubscriptionTier;
  isUnlimitedVisits: boolean;
  defaultMonthlyVisits: number | null;
  maxDoctors: number;
  maxStaff: number;
  priceINR: number;
  billingCycle: BillingCycle;
  hasCustomVitals: boolean;
  hasLabModule: boolean;
  isActive: boolean;
}

export interface OnboardClinicRequest {
  clinicName: string;
  phone: string;
  email: string;
  address?: string;
  doctorName: string;
  regNumber?: string;
  qualifications?: string;
  specialization?: string;
  consultationFee?: number;
  clinicTimings?: string;
  doctorPassword?: string;
  planId: string;
  isTrial: boolean;
  monthlyVisitQuotaOverride?: number;
  isUnlimitedOverride: boolean;
  letterheadMarginTopMm: number;
  printBottomMarginMm: number;
  hideLetterheadOnPrint: boolean;
  salesNotes?: string;
  patientIdPrefix?: string;
}

export interface OnboardClinicResponse {
  clinicId: string;
  clinicName: string;
  doctorUserId: string;
  doctorName: string;
  doctorEmail: string;
  initialPassword: string;
  loginUrl: string;
  subscriptionStatus: SubscriptionStatus;
  planName: string;
  periodStart: string;
  periodEnd: string;
  monthlyVisitQuota?: number;
  isUnlimited: boolean;
  patientIdPrefix: string;
}

export interface AdminClinicItem {
  clinicId: string;
  clinicName: string;
  phone: string;
  email?: string;
  primaryDoctorName?: string;
  doctorCount: number;
  onboardedByUserId?: string;
  onboardedByName?: string;
  salesNotes?: string;
  createdAt: string;
  subscriptionId?: string;
  planName?: string;
  planTier?: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  visitsConducted: number;
  totalAllowedVisits?: number;
  isUnlimited: boolean;
  gracePeriodDays: number;
  usedPrescriptions?: number;
  remainingPrescriptions?: number;
  totalAllowedPrescriptions?: number;
}

export interface SubscriptionPayment {
  id: string;
  invoiceNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  paymentDate: string;
  status: PaymentStatus;
}

export interface ClinicSubscriptionDetail {
  subscriptionId: string;
  clinicId: string;
  clinicName: string;
  planId: string;
  planName: string;
  planTier: SubscriptionTier;
  billingCycle: BillingCycle;
  priceINR: number;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodDays: number;
  isUnlimitedVisits: boolean;
  monthlyVisitQuota?: number;
  additionalTopUpVisits: number;
  totalAllowedVisits?: number;
  maxDoctorsOverride?: number;
  effectiveMaxDoctors: number;
  visitsConducted: number;
  remainingVisits?: number;
  lastVisitRecordedAt?: string;
  notes?: string;
  labModuleOverride?: boolean | null;
  planHasLabModule: boolean;
  effectiveHasLabModule: boolean;
  paymentHistory: SubscriptionPayment[];
  usedPrescriptions?: number;
  remainingPrescriptions?: number;
  totalAllowedPrescriptions?: number;
}

/** inherit = use plan default; enabled/disabled = per-clinic override */
export type LabModuleSetting = 'inherit' | 'enabled' | 'disabled';

export interface UpdateClinicSubscriptionRequest {
  isUnlimitedVisits: boolean;
  monthlyVisitQuota?: number;
  maxDoctorsOverride?: number;
  status: SubscriptionStatus;
  gracePeriodDays: number;
  notes?: string;
  labModuleOverride?: boolean | null;
}

export interface ClinicQuotaStatus {
  clinicId: string;
  status: SubscriptionStatus;
  planName: string;
  planTier: SubscriptionTier;
  isUnlimited: boolean;
  visitsConducted: number;
  monthlyQuota?: number;
  additionalTopUpVisits: number;
  totalAllowed?: number;
  remainingVisits?: number;
  isWithinBuffer: boolean;
  remainingBufferVisits: number;
  isQuotaExceeded: boolean;
  isGracePeriod: boolean;
  isSuspended: boolean;
  periodEnd: string;
  canIssueTokens: boolean;
  hasLabModule: boolean;
  hasCustomVitals: boolean;
  effectiveMaxDoctors?: number;
  usedPrescriptions?: number;
  remainingPrescriptions?: number;
  totalAllowedPrescriptions?: number;
}

