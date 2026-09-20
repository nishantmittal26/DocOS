export type UserRole = 'Doctor' | 'Receptionist';
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
  role: UserRole;
  clinicId: string;
  clinicName: string;
  doctorName: string;
  regNumber?: string;
  qualifications?: string;
  letterheadMarginTopMm: number;
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
  tokenNumber: number;
  status: VisitStatus;
  visitDate: string;
  vitals?: Vitals;
  chiefComplaints?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  hasPrescription: boolean;
}

export interface ClinicLetterhead {
  clinicName: string;
  doctorName: string;
  regNumber?: string;
  qualifications?: string;
  specialization?: string;
  phone: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  letterheadMarginTopMm: number;
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
  prescribedAt: string;
  followUpDate?: string;
  vitals?: Vitals;
  chiefComplaints?: string;
  diagnosis?: string;
  clinicalNotes?: string;
  generalAdvice?: string;
  items: PrescriptionItem[];
  clinic: ClinicLetterhead;
}

export interface Medicine {
  id: string;
  brandName: string;
  saltComposition: string;
  form: DosageForm;
  strength: string;
  manufacturer?: string;
  isCustom: boolean;
}

export interface ClinicProfile {
  id: string;
  name: string;
  doctorName: string;
  regNumber?: string;
  qualifications?: string;
  specialization?: string;
  phone: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  letterheadMarginTopMm: number;
  patientIdPrefix: string;
  totalPatientsRegistered: number;
}
