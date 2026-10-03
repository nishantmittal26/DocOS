import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitsApi, patientsApi, authApi, clinicsApi } from '../../api/client';
import { VisitQueueItem, PatientSearchResult, PrescriptionDetail, DoctorProfile, ClinicQuotaStatus, Vitals } from '../../types';
import { VitalsModal } from '../../components/VitalsModal';
import { PrescriptionPrintModal } from '../../components/PrescriptionPrintModal';
import {
  Users,
  Clock,
  CheckCircle2,
  Activity,
  Search,
  Plus,
  ArrowRight,
  Printer,
  AlertTriangle,
  RefreshCw,
  HeartPulse,
  History,
  Trash2,
  Stethoscope,
  Lock,
} from 'lucide-react';

interface OpdQueuePageProps {
  onOpenNewPatient: () => void;
}

export const OpdQueuePage: React.FC<OpdQueuePageProps> = ({ onOpenNewPatient }) => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<VisitQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'All' | 'Waiting' | 'Completed'>('All');

  // Multi-doctor state (Phase 2A)
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('');
  const [checkInDoctorId, setCheckInDoctorId] = useState<string>('');

  // Subscription Quota State (Phase 2B)
  const [quota, setQuota] = useState<ClinicQuotaStatus | null>(null);

  // Search patients to add to queue
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Modals state
  const [selectedVisitForVitals, setSelectedVisitForVitals] = useState<VisitQueueItem | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionDetail | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  // Load clinic doctors
  useEffect(() => {
    authApi
      .getClinicDoctors()
      .then((docs) => {
        setDoctors(docs);
        if (docs.length > 0) {
          const myDoc = docs.find((d) => d.userId === user?.userId);
          const defaultDocId = myDoc ? myDoc.userId : docs[0].userId;
          if (!checkInDoctorId) {
            setCheckInDoctorId(defaultDocId);
          }
          if (hasRole('Doctor') && myDoc && !selectedDoctorFilter) {
            setSelectedDoctorFilter(myDoc.userId);
          }
        }
      })
      .catch((err) => console.error('Failed to load clinic doctors', err));
  }, [user]);

  const fetchQueue = async (silent = false) => {
    try {
      const data = await visitsApi.getTodayQueue(selectedDoctorFilter || undefined, silent);
      setQueue(data);
      // Also fetch quota status in background
      clinicsApi.getCurrentSubscriptionQuota().then(setQuota).catch(() => {});
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue(false);
    // Auto-refresh queue every 20 seconds silently in background
    const interval = setInterval(() => fetchQueue(true), 20000);
    return () => clearInterval(interval);
  }, [selectedDoctorFilter]);

  // Debounced search for existing patients
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await patientsApi.search(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddToQueue = async (patientId: string, targetDoctorId?: string) => {
    if (quota && !quota.canIssueTokens) {
      alert(
        quota.isSuspended
          ? 'Cannot check in patient: Subscription is suspended.'
          : 'Cannot check in patient: Monthly visit quota (+20 buffer) exhausted. Please renew or contact platform admin.'
      );
      return;
    }

    const docId = targetDoctorId || checkInDoctorId || selectedDoctorFilter || doctors[0]?.userId;

    try {
      await visitsApi.addToQueue({
        patientId,
        doctorId: docId || undefined,
      });
      setSearchQuery('');
      setSearchResults([]);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add patient to queue');
    }
  };

  const handleRemoveFromQueue = async (visitId: string, patientName: string, tokenNumber: number) => {
    if (
      !window.confirm(
        `Remove ${patientName} (Token #${tokenNumber}) from today's queue? Token #${tokenNumber} will be released for the next patient.`
      )
    ) {
      return;
    }
    try {
      await visitsApi.removeFromQueue(visitId);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove patient from queue');
    }
  };

  const handleOpenPrescription = async (visitId: string) => {
    setLoadingPrescription(true);
    try {
      const rx = await visitsApi.getPrescription(visitId);
      setSelectedPrescription(rx);
    } catch (err) {
      alert('Prescription not found');
    } finally {
      setLoadingPrescription(false);
    }
  };

  const handleStartConsultation = async (item: VisitQueueItem) => {
    try {
      if (item.status === 'Waiting') {
        await visitsApi.updateStatus(item.id, 'InConsultation', user?.userId);
      }
      navigate(`/consultation/${item.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start consultation');
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filter === 'Waiting') return item.status === 'Waiting' || item.status === 'InConsultation';
    if (filter === 'Completed') return item.status === 'Completed';
    return true;
  });

  const waitingCount = queue.filter((i) => i.status === 'Waiting' || i.status === 'InConsultation').length;
  const completedCount = queue.filter((i) => i.status === 'Completed').length;
  const isDoctorUser = hasRole('Doctor') || hasRole('ClinicAdmin');

  const hasVitals = (vitals?: Vitals) => {
    if (!vitals) return false;
    return !!(
      (vitals.recordedVitals && vitals.recordedVitals.length > 0) ||
      vitals.systolicBp ||
      vitals.pulseBpm ||
      vitals.temperatureF ||
      vitals.sugar ||
      vitals.spo2 ||
      vitals.weightKg
    );
  };

  const renderVitalsSummary = (vitals?: Vitals) => {
    if (!vitals) return null;
    if (vitals.recordedVitals && vitals.recordedVitals.length > 0) {
      const bpItems = vitals.recordedVitals.filter((v) => v.pairGroup === 'BP');
      const nonBpItems = vitals.recordedVitals.filter((v) => v.pairGroup !== 'BP');
      const parts: string[] = [];
      if (bpItems.length > 0) {
        const sys = bpItems.find((v) => v.code.toUpperCase().includes('SYS'))?.valueNumeric ??
                    bpItems.find((v) => v.code.toUpperCase().includes('SYS'))?.valueText;
        const dia = bpItems.find((v) => v.code.toUpperCase().includes('DIA'))?.valueNumeric ??
                    bpItems.find((v) => v.code.toUpperCase().includes('DIA'))?.valueText;
        if (sys || dia) {
          parts.push(`${sys || '-'}/${dia || '-'} BP`);
        }
      }
      nonBpItems.forEach((item) => {
        const val = item.valueNumeric !== undefined ? item.valueNumeric : item.valueText;
        if (val !== undefined && val !== null && val !== '') {
          parts.push(`${item.displayName} ${val}${item.unitSnapshot ? ' ' + item.unitSnapshot : ''}`);
        }
      });
      return parts.slice(0, 4).join(' • ') + (parts.length > 4 ? ` (+${parts.length - 4})` : '');
    }

    const parts: string[] = [];
    if (vitals.systolicBp || vitals.diastolicBp) parts.push(`${vitals.systolicBp || '-'}/${vitals.diastolicBp || '-'} BP`);
    if (vitals.pulseBpm) parts.push(`${vitals.pulseBpm} bpm`);
    if (vitals.temperatureF) parts.push(`${vitals.temperatureF}°F`);
    if (vitals.sugar) parts.push(`Sugar ${vitals.sugar}`);
    if (vitals.spo2) parts.push(`${vitals.spo2}% SpO2`);
    if (vitals.weightKg) parts.push(`${vitals.weightKg} kg`);
    if (vitals.bmi) parts.push(`BMI ${vitals.bmi}`);
    return parts.slice(0, 4).join(' • ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header / Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Today's OPD Queue</h1>
            <button
              onClick={() => fetchQueue(false)}
              title="Refresh Queue"
              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })} • Multi-Doctor OPD Queue Management
          </p>
        </div>

        {/* Quick Stats & Register Patient button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-900">{waitingCount} Waiting</span>
          </div>
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">{completedCount} Completed</span>
          </div>

          <button
            onClick={() => navigate('/history')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all"
            title="View Past OPD Visit History"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            <span>Past OPDs</span>
          </button>
        </div>
      </div>

      {/* Quota Exceeded Block Banner */}
      {quota && !quota.canIssueTokens && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between text-xs text-rose-800 font-medium shadow-sm">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-rose-900">
                Check-in Paused ({quota.isSuspended ? 'Account Suspended' : 'Quota Exhausted'})
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                New tokens cannot be generated. You can still consult patients currently in queue and view all past OPD records.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-rose-800 bg-rose-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            Token Issuance Blocked
          </span>
        </div>
      )}

      {/* Quick Patient Search & Doctor Check-in Selector Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative">
        <div className="flex-1 flex items-center space-x-2">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder={
              quota && !quota.canIssueTokens
                ? "Token check-ins paused due to quota limit. Search to view records..."
                : "Search patient by Mobile, UID, or Name to check-in to OPD queue..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          {searching && <span className="text-xs text-slate-400 mr-2">Searching...</span>}
        </div>

        {/* Doctor Assignment Picker for Check-in */}
        {doctors.length > 0 && (
          <div className="flex items-center space-x-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
            <Stethoscope className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Doctor:</span>
            <select
              value={checkInDoctorId}
              onChange={(e) => setCheckInDoctorId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              {doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  Dr. {d.fullName} {d.speciality ? `(${d.speciality})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 max-h-80 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map((patient) => {
              const existingQueueItem = queue.find((q) => q.patientId === patient.id);
              const isWaitingOrInConsultation =
                patient.todayVisitStatus === 'Waiting' ||
                patient.todayVisitStatus === 'InConsultation' ||
                (existingQueueItem &&
                  (existingQueueItem.status === 'Waiting' ||
                    existingQueueItem.status === 'InConsultation'));
              const isCompleted =
                patient.todayVisitStatus === 'Completed' ||
                (existingQueueItem && existingQueueItem.status === 'Completed');

              const tokenNum = patient.todayVisitTokenNumber || existingQueueItem?.tokenNumber;
              const docName = patient.todayVisitDoctorName || existingQueueItem?.doctorName;
              const checkInDoc = doctors.find((d) => d.userId === checkInDoctorId);

              return (
                <div
                  key={patient.id}
                  className="p-3.5 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{patient.fullName}</span>
                      <span className="font-mono text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                        {patient.patientUid}
                      </span>
                      <span className="text-xs text-slate-500">
                        {patient.age} Yrs / {patient.gender}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2">
                      <span>
                        Phone: <span className="font-mono font-medium text-slate-700">{patient.mobileNumber}</span>
                      </span>
                      {patient.lastDoctorName && (
                        <span className="text-slate-500 font-medium">
                          • Last Consulted: <strong className="text-slate-700">Dr. {patient.lastDoctorName}</strong>
                        </span>
                      )}
                      {patient.allergies && (
                        <span className="text-rose-600 font-medium">• Allergies: {patient.allergies}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isWaitingOrInConsultation ? (
                      <span className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>
                          In Queue (#{tokenNum})
                          {docName ? ` • Dr. ${docName}` : ''}
                        </span>
                      </span>
                    ) : isCompleted ? (
                      <span className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Completed Today (#{tokenNum})
                          {docName ? ` • Dr. ${docName}` : ''}
                        </span>
                      </span>
                    ) : quota && !quota.canIssueTokens ? (
                      <button
                        disabled
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed"
                        title="New check-in tokens paused due to quota limit or account suspension"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Tokens Paused</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddToQueue(patient.id, checkInDoctorId)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                        title={`Issue token in Dr. ${checkInDoc?.fullName || 'Doctor'}'s queue`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          Add to Dr. {checkInDoc ? checkInDoc.fullName.split(' ')[0] : 'Queue'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Queue Filter Tabs & Doctor Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2">
          {(['All', 'Waiting', 'Completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === tab
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab} {tab === 'Waiting' ? `(${waitingCount})` : tab === 'Completed' ? `(${completedCount})` : `(${queue.length})`}
            </button>
          ))}
        </div>

        {/* Doctor Queue Filter */}
        {doctors.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Filter Queue by:</span>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDoctorFilter(val);
                if (val) {
                  setCheckInDoctorId(val);
                }
              }}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none shadow-sm cursor-pointer"
            >
              <option value="">All Doctors ({queue.length})</option>
              {doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  Dr. {d.fullName} {d.speciality ? `(${d.speciality})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Queue Table / List */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          Loading OPD queue...
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No patients in the queue</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Search for an existing patient above or register a new patient to generate their daily OPD token.
          </p>
          <button
            onClick={onOpenNewPatient}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Patient</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {filteredQueue.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
            >
              {/* Token & Patient Demographics */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center text-emerald-800">
                  <span className="text-[10px] uppercase font-bold text-emerald-600">Token</span>
                  <span className="text-lg font-black font-mono leading-none">#{item.tokenNumber}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{item.patientName}</span>
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded">
                      {item.patientUid}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {item.age} Yrs • {item.gender}
                    </span>
                    {item.status === 'Completed' ? (
                      <span className="inline-flex items-center text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Completed
                      </span>
                    ) : item.status === 'InConsultation' ? (
                      <span className="inline-flex items-center text-[11px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full animate-pulse">
                        In Consultation
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Waiting
                      </span>
                    )}

                    {/* Assigned Doctor Tag */}
                    {item.doctorName && (
                      <span className="inline-flex items-center text-[11px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md border border-indigo-200/60">
                        <Stethoscope className="w-3 h-3 mr-1 text-indigo-500" />
                        Dr. {item.doctorName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Phone: <span className="font-mono text-slate-700">{item.mobileNumber}</span></span>
                    {item.allergies && (
                      <span className="flex items-center text-rose-600 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        Allergies: {item.allergies}
                      </span>
                    )}
                    {item.diagnosis && (
                      <span className="text-emerald-700 font-semibold">
                        Diagnosis: {item.diagnosis}
                      </span>
                    )}
                  </div>

                  {/* Vitals Summary Pill */}
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    {hasVitals(item.vitals) ? (
                      <button
                        onClick={() => setSelectedVisitForVitals(item)}
                        className={`inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                          item.vitals?.hasAbnormal
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-medium shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.vitals?.hasAbnormal ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 animate-pulse" />
                        ) : (
                          <HeartPulse className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        )}
                        <span>{renderVitalsSummary(item.vitals)}</span>
                        {item.vitals?.hasAbnormal && (
                          <span className="ml-1 px-1.5 py-0.5 bg-rose-200 text-rose-900 text-[10px] font-bold rounded">
                            Abnormal
                          </span>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedVisitForVitals(item)}
                        className="inline-flex items-center space-x-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                      >
                        <Activity className="w-3.5 h-3.5 text-amber-600" />
                        <span>+ Record Vitals</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 self-end sm:self-center">
                {/* Vitals button */}
                <button
                  onClick={() => setSelectedVisitForVitals(item)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  Vitals
                </button>

                {/* Doctor Consultation or Prescription view */}
                {isDoctorUser && item.status !== 'Completed' ? (
                  <button
                    onClick={() => handleStartConsultation(item)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all"
                  >
                    <span>Start Consultation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : null}

                {/* Print / View Rx button if completed */}
                {item.hasPrescription && (
                  <button
                    onClick={() => handleOpenPrescription(item.id)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View / Print Rx</span>
                  </button>
                )}

                {/* Remove from queue button */}
                {item.status !== 'Completed' && (
                  <button
                    onClick={() => handleRemoveFromQueue(item.id, item.patientName, item.tokenNumber)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Remove patient from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vitals Modal */}
      {selectedVisitForVitals && (
        <VitalsModal
          isOpen={!!selectedVisitForVitals}
          visit={selectedVisitForVitals}
          onClose={() => setSelectedVisitForVitals(null)}
          onSaved={() => {
            setSelectedVisitForVitals(null);
            fetchQueue();
          }}
        />
      )}

      {/* Prescription Print Modal */}
      {selectedPrescription && (
        <PrescriptionPrintModal
          isOpen={!!selectedPrescription}
          prescription={selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
        />
      )}
    </div>
  );
};
