import axios from 'axios';
import { showGlobalLoading, hideGlobalLoading } from '../context/LoadingContext';
import {
  AuthResponse,
  ClinicProfile,
  DoctorProfile,
  Medicine,
  Patient,
  PatientSearchResult,
  PrescriptionDetail,
  StaffMember,
  VisitQueueItem,
  Vitals,
  SubscriptionPlan,
  OnboardClinicRequest,
  OnboardClinicResponse,
  AdminClinicItem,
  ClinicSubscriptionDetail,
  UpdateClinicSubscriptionRequest,
  ClinicQuotaStatus,
  SubscriptionPayment,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('docos_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isSilent = config.headers['x-silent'] === 'true' || (config as any).silent;
    if (!isSilent) {
      showGlobalLoading();
    }

    return config;
  },
  (error) => {
    hideGlobalLoading();
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const isSilent =
      response.config.headers['x-silent'] === 'true' || (response.config as any).silent;
    if (!isSilent) {
      hideGlobalLoading();
    }
    return response;
  },
  (error) => {
    const isSilent = error.config?.headers?.['x-silent'] === 'true' || error.config?.silent;
    if (!isSilent) {
      hideGlobalLoading();
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },
  registerClinic: async (data: {
    clinicName: string;
    doctorName: string;
    regNumber?: string;
    qualifications?: string;
    specialization?: string;
    phone: string;
    email: string;
    password: string;
    address?: string;
    clinicTimings?: string;
    consultationFee?: number;
  }) => {
    const res = await api.post<AuthResponse>('/auth/register-clinic', data);
    return res.data;
  },
  inviteStaff: async (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role: string;
    qualifications?: string;
    regNumber?: string;
    specialization?: string;
    consultationFee?: number;
  }) => {
    const res = await api.post<boolean>('/auth/staff/invite', data);
    return res.data;
  },
  toggleStaffActive: async (data: { userId: string; isActive: boolean }) => {
    const res = await api.post<boolean>('/auth/staff/toggle-active', data);
    return res.data;
  },
  getClinicStaff: async () => {
    const res = await api.get<StaffMember[]>('/auth/staff');
    return res.data;
  },
  getClinicDoctors: async () => {
    const res = await api.get<DoctorProfile[]>('/auth/doctors');
    return res.data;
  },
  getDoctorProfile: async (userId?: string) => {
    const res = await api.get<DoctorProfile>('/auth/doctor-profile', {
      params: userId ? { userId } : undefined,
    });
    return res.data;
  },
  updateDoctorProfile: async (data: {
    fullName: string;
    qualifications?: string;
    medicalCouncilRegistrationNumber?: string;
    speciality?: string;
    consultationFee?: number;
  }) => {
    const res = await api.put<boolean>('/auth/doctor-profile', data);
    return res.data;
  },
  changePassword: async (data: { currentPassword: string; newPassword: string }) => {
    const res = await api.post<boolean>('/auth/change-password', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const patientsApi = {
  create: async (data: {
    fullName: string;
    age: number;
    gender: string;
    mobileNumber: string;
    email?: string;
    bloodGroup?: string;
    address?: string;
    allergies?: string;
    medicalHistory?: string;
  }) => {
    const res = await api.post<Patient>('/patients', data);
    return res.data;
  },
  search: async (q: string) => {
    const res = await api.get<PatientSearchResult[]>('/patients/search', {
      params: { q },
    });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<Patient>(`/patients/${id}`);
    return res.data;
  },
};

export const visitsApi = {
  addToQueue: async (param: string | { patientId: string; doctorId?: string }) => {
    const payload = typeof param === 'string' ? { patientId: param } : param;
    const res = await api.post<VisitQueueItem>('/visits/queue', payload);
    return res.data;
  },
  updateStatus: async (visitId: string, status: string, doctorId?: string) => {
    const res = await api.put<boolean>(`/visits/${visitId}/status`, { status, doctorId });
    return res.data;
  },
  assignDoctor: async (visitId: string, doctorId: string) => {
    const res = await api.put<boolean>(`/visits/${visitId}/assign-doctor`, { doctorId });
    return res.data;
  },
  removeFromQueue: async (visitId: string) => {
    const res = await api.delete<boolean>(`/visits/queue/${visitId}`);
    return res.data;
  },
  deleteVisit: async (visitId: string) => {
    const res = await api.delete<boolean>(`/visits/${visitId}`);
    return res.data;
  },
  getTodayQueue: async (doctorId?: string, silent: boolean = false) => {
    const res = await api.get<VisitQueueItem[]>('/visits/queue/today', {
      params: doctorId ? { doctorId } : undefined,
      headers: silent ? { 'x-silent': 'true' } : undefined,
    });
    return res.data;
  },
  getHistory: async (params?: {
    fromDate?: string;
    toDate?: string;
    search?: string;
    status?: string;
    doctorId?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const res = await api.get<VisitQueueItem[]>('/visits/history', { params });
    return res.data;
  },
  recordVitals: async (data: { visitId: string } & Vitals) => {
    const res = await api.put<boolean>('/visits/vitals', data);
    return res.data;
  },
  completeConsultation: async (data: {
    visitId: string;
    doctorId?: string;
    chiefComplaints?: string;
    diagnosis?: string;
    clinicalNotes?: string;
    followUpDate?: string;
    generalAdvice?: string;
    items: any[];
  }) => {
    const res = await api.post<PrescriptionDetail>('/visits/complete', data);
    return res.data;
  },
  getPrescription: async (visitId: string) => {
    const res = await api.get<PrescriptionDetail>(`/visits/${visitId}/prescription`);
    return res.data;
  },
};

export const medicinesApi = {
  search: async (q: string) => {
    const res = await api.get<Medicine[]>('/medicines/search', {
      params: { q },
    });
    return res.data;
  },
  addCustom: async (data: {
    brandName: string;
    saltComposition: string;
    form: string;
    strength: string;
    manufacturer?: string;
  }) => {
    const res = await api.post<Medicine>('/medicines/custom', data);
    return res.data;
  },
  getCustom: async () => {
    const res = await api.get<Medicine[]>('/medicines/custom');
    return res.data;
  },
  updateCustom: async (
    id: string,
    data: {
      brandName: string;
      saltComposition: string;
      form: string;
      strength: string;
      manufacturer?: string;
    }
  ) => {
    const res = await api.put<Medicine>(`/medicines/custom/${id}`, data);
    return res.data;
  },
  deleteCustom: async (id: string) => {
    const res = await api.delete<boolean>(`/medicines/custom/${id}`);
    return res.data;
  },
};

export const clinicsApi = {
  getProfile: async () => {
    const res = await api.get<ClinicProfile>('/clinics/profile');
    return res.data;
  },
  updateLetterhead: async (data: {
    clinicName: string;
    phone: string;
    email?: string;
    address?: string;
    logoUrl?: string;
    letterheadMarginTopMm: number;
    printBottomMarginMm?: number;
    hideLetterheadOnPrint?: boolean;
    clinicTimings?: string;
  }) => {
    const res = await api.put<ClinicProfile>('/clinics/letterhead', data);
    return res.data;
  },
  getCurrentSubscriptionQuota: async () => {
    const res = await api.get<ClinicQuotaStatus>('/clinics/subscription/current');
    return res.data;
  },
};

export const adminApi = {
  getPlans: async () => {
    const res = await api.get<SubscriptionPlan[]>('/admin/plans');
    return res.data;
  },
  onboardClinic: async (data: OnboardClinicRequest) => {
    const res = await api.post<OnboardClinicResponse>('/admin/onboard', data);
    return res.data;
  },
  getClinics: async () => {
    const res = await api.get<AdminClinicItem[]>('/admin/clinics');
    return res.data;
  },
  getClinicSubscription: async (clinicId: string) => {
    const res = await api.get<ClinicSubscriptionDetail>(`/admin/clinics/${clinicId}/subscription`);
    return res.data;
  },
  updateClinicSubscription: async (clinicId: string, data: UpdateClinicSubscriptionRequest) => {
    const res = await api.put<boolean>(`/admin/clinics/${clinicId}/subscription`, data);
    return res.data;
  },
  addTopUpVisits: async (clinicId: string, additionalVisits: number) => {
    const res = await api.post<boolean>(`/admin/clinics/${clinicId}/subscription/topup`, {
      additionalVisits,
    });
    return res.data;
  },
  recordPayment: async (
    clinicId: string,
    data: {
      invoiceNumber: string;
      amount: number;
      paymentMethod: string;
      transactionReference?: string;
      paymentDate: string;
      status: string;
    }
  ) => {
    const res = await api.post<boolean>(`/admin/clinics/${clinicId}/subscription/payments`, data);
    return res.data;
  },
};

export default api;
