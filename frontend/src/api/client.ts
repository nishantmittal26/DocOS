import axios from 'axios';
import { showGlobalLoading, hideGlobalLoading } from '../context/LoadingContext';
import {
  AuthResponse,
  ClinicProfile,
  Medicine,
  Patient,
  PatientSearchResult,
  PrescriptionDetail,
  VisitQueueItem,
  Vitals,
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
  }) => {
    const res = await api.post<AuthResponse>('/auth/register-clinic', data);
    return res.data;
  },
  registerStaff: async (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
  }) => {
    const res = await api.post<boolean>('/auth/register-staff', data);
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
  addToQueue: async (patientId: string) => {
    const res = await api.post<VisitQueueItem>('/visits/queue', { patientId });
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
  getTodayQueue: async (silent: boolean = false) => {
    const res = await api.get<VisitQueueItem[]>('/visits/queue/today', {
      headers: silent ? { 'x-silent': 'true' } : undefined,
    });
    return res.data;
  },
  getHistory: async (params?: {
    fromDate?: string;
    toDate?: string;
    search?: string;
    status?: string;
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
    doctorName: string;
    regNumber?: string;
    qualifications?: string;
    specialization?: string;
    phone: string;
    email?: string;
    address?: string;
    logoUrl?: string;
    letterheadMarginTopMm: number;
  }) => {
    const res = await api.put<ClinicProfile>('/clinics/letterhead', data);
    return res.data;
  },
};

export default api;
