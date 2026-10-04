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
  VitalMaster,
  ClinicVitalPreference,
  UpdateVitalPreferenceItem,
  CreateCustomVitalRequest,
  CreateGlobalVitalMasterRequest,
  RecordVisitVitalItemRequest,
  VisitVitalItem,
  LabTestMaster,
  LabTestPanel,
  CreateLabTestRequest,
  UpdateLabTestRequest,
  CreateLabPanelRequest,
  UpdateLabPanelRequest,
  AdviceTemplate,
  CreateAdviceTemplateRequest,
  UpdateAdviceTemplateRequest,
  VisitPayment,
  RecordVisitPaymentRequest,
  DailyCollectionReport,
  GenerateShareTokenResponse,
  AuditLog,
  PrescriptionLabOrderRequest,
  PrescriptionAdviceRequest,
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

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!axios.isAxiosError(err)) {
    return fallback;
  }

  const data = err.response?.data;
  const message =
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof (data as { message?: string }).message === 'string'
      ? (data as { message: string }).message
      : undefined;

  const status = err.response?.status;
  if (status === 503) {
    return message ?? 'DocOS Backend API is still initializing. Please wait a few seconds and refresh.';
  }
  if (status === 401) {
    return message ?? 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return message ?? 'You do not have permission to perform this action.';
  }
  if (status === 404) {
    return message ?? 'The requested resource could not be found.';
  }

  if (err.code === 'ERR_NETWORK' || !err.response) {
    return 'Unable to connect to DocOS Backend API. Please verify the backend is running.';
  }

  return message ?? fallback;
}

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
  search: async (q: string, doctorId?: string) => {
    const res = await api.get<PatientSearchResult[]>('/patients/search', {
      params: { q, doctorId: doctorId || undefined },
    });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<Patient>(`/patients/${id}`);
    return res.data;
  },
  update: async (
    id: string,
    data: {
      fullName: string;
      age: number;
      gender: string;
      mobileNumber: string;
      email?: string;
      bloodGroup?: string;
      address?: string;
      allergies?: string;
      medicalHistory?: string;
    }
  ) => {
    const res = await api.put<Patient>(`/patients/${id}`, data);
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
    labOrders?: PrescriptionLabOrderRequest[];
    adviceItems?: PrescriptionAdviceRequest[];
  }) => {
    const res = await api.post<PrescriptionDetail>('/visits/complete', data);
    return res.data;
  },
  getPrescription: async (visitId: string) => {
    const res = await api.get<PrescriptionDetail>(`/visits/${visitId}/prescription`);
    return res.data;
  },
  generateShareToken: async (prescriptionId: string, expiryDays: number = 7) => {
    const res = await api.post<GenerateShareTokenResponse>(`/visits/prescriptions/${prescriptionId}/share-token`, null, {
      params: { expiryDays },
    });
    return res.data;
  },
  markPrinted: async (prescriptionId: string) => {
    const res = await api.post<boolean>(`/visits/prescriptions/${prescriptionId}/mark-printed`);
    return res.data;
  },
};

export const medicinesApi = {
  search: async (q: string, onlyFavorites: boolean = false) => {
    const res = await api.get<Medicine[]>('/medicines/search', {
      params: { q, onlyFavorites },
    });
    return res.data;
  },
  getFavorites: async () => {
    const res = await api.get<Medicine[]>('/medicines/favorites');
    return res.data;
  },
  toggleFavorite: async (id: string) => {
    const res = await api.post<{ medicineId: string; isFavorite: boolean }>(`/medicines/${id}/toggle-favorite`);
    return res.data;
  },
  addCustom: async (data: {
    brandName: string;
    saltComposition: string;
    form: string;
    strength: string;
    manufacturer?: string;
    defaultDosage?: string;
    defaultTiming?: string;
  }) => {
    const res = await api.post<Medicine>('/medicines/custom', data);
    return res.data;
  },
  getCustom: async (includeGlobalCatalog = false) => {
    const res = await api.get<Medicine[]>('/medicines/custom', {
      params: { includeGlobalCatalog },
    });
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
      defaultDosage?: string;
      defaultTiming?: string;
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
    phone?: string;
    landline?: string;
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
  getGlobalVitals: async () => {
    const res = await api.get<VitalMaster[]>('/admin/masters/vitals');
    return res.data;
  },
  createGlobalVital: async (data: CreateGlobalVitalMasterRequest) => {
    const res = await api.post<VitalMaster>('/admin/masters/vitals', data);
    return res.data;
  },
  updateGlobalVital: async (id: string, data: Partial<VitalMaster>) => {
    const res = await api.put<VitalMaster>(`/admin/masters/vitals/${id}`, data);
    return res.data;
  },
  getGlobalLabs: async () => {
    const res = await api.get<LabTestMaster[]>('/admin/masters/labs');
    return res.data;
  },
  createGlobalLab: async (data: CreateLabTestRequest) => {
    const res = await api.post<LabTestMaster>('/admin/masters/labs', data);
    return res.data;
  },
  updateGlobalLab: async (id: string, data: UpdateLabTestRequest) => {
    const res = await api.put<LabTestMaster>(`/admin/masters/labs/${id}`, data);
    return res.data;
  },
  getGlobalAdvice: async () => {
    const res = await api.get<AdviceTemplate[]>('/admin/masters/advice');
    return res.data;
  },
  createGlobalAdvice: async (data: CreateAdviceTemplateRequest) => {
    const res = await api.post<AdviceTemplate>('/admin/masters/advice', data);
    return res.data;
  },
  updateGlobalAdvice: async (id: string, data: UpdateAdviceTemplateRequest) => {
    const res = await api.put<AdviceTemplate>(`/admin/masters/advice/${id}`, data);
    return res.data;
  },
  getAuditLogs: async (params?: { clinicId?: string; action?: string; limit?: number }) => {
    const res = await api.get<AuditLog[]>('/admin/audit-logs', { params });
    return res.data;
  },
};

export const labsApi = {
  getTests: async () => {
    const res = await api.get<LabTestMaster[]>('/labs/tests');
    return res.data;
  },
  createTest: async (data: CreateLabTestRequest) => {
    const res = await api.post<LabTestMaster>('/labs/tests', data);
    return res.data;
  },
  updateTest: async (id: string, data: UpdateLabTestRequest) => {
    const res = await api.put<LabTestMaster>(`/labs/tests/${id}`, data);
    return res.data;
  },
  getPanels: async () => {
    const res = await api.get<LabTestPanel[]>('/labs/panels');
    return res.data;
  },
  createPanel: async (data: CreateLabPanelRequest) => {
    const res = await api.post<LabTestPanel>('/labs/panels', data);
    return res.data;
  },
  updatePanel: async (id: string, data: UpdateLabPanelRequest) => {
    const res = await api.put<LabTestPanel>(`/labs/panels/${id}`, data);
    return res.data;
  },
  deletePanel: async (id: string) => {
    const res = await api.delete<boolean>(`/labs/panels/${id}`);
    return res.data;
  },
};

export const adviceApi = {
  getTemplates: async (category?: string) => {
    const res = await api.get<AdviceTemplate[]>('/advice/templates', { params: { category } });
    return res.data;
  },
  createTemplate: async (data: CreateAdviceTemplateRequest) => {
    const res = await api.post<AdviceTemplate>('/advice/templates', data);
    return res.data;
  },
  updateTemplate: async (id: string, data: UpdateAdviceTemplateRequest) => {
    const res = await api.put<AdviceTemplate>(`/advice/templates/${id}`, data);
    return res.data;
  },
  deleteTemplate: async (id: string) => {
    const res = await api.delete<boolean>(`/advice/templates/${id}`);
    return res.data;
  },
};

export const paymentsApi = {
  recordPayment: async (visitId: string, data: RecordVisitPaymentRequest) => {
    const res = await api.post<VisitPayment>(`/payments/visit/${visitId}`, data);
    return res.data;
  },
  getPayment: async (visitId: string) => {
    const res = await api.get<VisitPayment>(`/payments/visit/${visitId}`);
    return res.data;
  },
  getDailyReport: async (date?: string) => {
    const res = await api.get<DailyCollectionReport>('/payments/daily-report', { params: { date } });
    return res.data;
  },
};

export const publicRxApi = {
  getPrescription: async (token: string) => {
    const res = await api.get<PrescriptionDetail>(`/public/rx/${token}`);
    return res.data;
  },
};

export const vitalsApi = {
  getPreferences: async () => {
    const res = await api.get<ClinicVitalPreference[]>('/vitals/preferences');
    return res.data;
  },
  updatePreferences: async (preferences: UpdateVitalPreferenceItem[]) => {
    const res = await api.put<boolean>('/vitals/preferences', { preferences });
    return res.data;
  },
  createCustomVital: async (data: CreateCustomVitalRequest) => {
    const res = await api.post<ClinicVitalPreference>('/vitals/masters/custom', data);
    return res.data;
  },
  getVisitVitals: async (visitId: string) => {
    const res = await api.get<VisitVitalItem[]>(`/visits/${visitId}/vitals`);
    return res.data;
  },
  recordVisitVitals: async (visitId: string, vitals: RecordVisitVitalItemRequest[]) => {
    const res = await api.put<Vitals>(`/visits/${visitId}/vitals`, { vitals });
    return res.data;
  },
};

export default api;
