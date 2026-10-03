import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitsApi, patientsApi, authApi, clinicsApi, paymentsApi } from '../../api/client';
import {
  VisitQueueItem,
  PatientSearchResult,
  PrescriptionDetail,
  DoctorProfile,
  ClinicQuotaStatus,
  Vitals,
  VisitPayment,
  DailyCollectionReport,
} from '../../types';
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
  IndianRupee,
  Receipt,
  CreditCard,
  Calendar,
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

  // OPD Fee Collection State (Phase 2D)
  const [paymentVisit, setPaymentVisit] = useState<VisitQueueItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(500);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [recordingPayment, setRecordingPayment] = useState<boolean>(false);

  // Daily Collection Report State (Phase 2D)
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dailyReport, setDailyReport] = useState<DailyCollectionReport | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

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

  // Fee Collection Handlers (Phase 2D)
  const handleOpenFeeModal = (item: VisitQueueItem) => {
    setPaymentVisit(item);
    // Find doctor's consultation fee if available
    const doc = doctors.find((d) => d.userId === item.doctorId);
    setPaymentAmount(doc?.consultationFee || 500);
    setPaymentMethod('Cash');
    setPaymentRef('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentVisit) return;
    setRecordingPayment(true);
    try {
      const payment = await paymentsApi.recordPayment(paymentVisit.id, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        reference: paymentRef.trim() || undefined,
      });

      // Update queue locally
      setQueue((prev) =>
        prev.map((item) => (item.id === paymentVisit.id ? { ...item, payment } : item))
      );
      setPaymentVisit(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record fee payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Daily Collection Report Loader (Phase 2D)
  const handleOpenReport = async (dateToLoad?: string) => {
    const targetDate = dateToLoad || reportDate;
    setIsReportOpen(true);
    setLoadingReport(true);
    try {
      const report = await paymentsApi.getDailyReport(targetDate);
      setDailyReport(report);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load daily collection report');
    } finally {
      setLoadingReport(false);
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
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            • Real-time Clinic Patient Flow
          </p>
        </div>

        {/* Action Controls & Report Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Daily Collection Report Button (Phase 2D) */}
          <button
            onClick={() => handleOpenReport()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <Receipt className="w-4 h-4 text-emerald-700" />
            <span>Collection Report</span>
          </button>

          <button
            onClick={onOpenNewPatient}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Patient Registration</span>
          </button>
        </div>
      </div>

      {/* Patient Search & Quick Check-in Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search existing patients by Name, Mobile, or Patient UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Quick Doctor Picker for Check-in */}
          {doctors.length > 0 && (
            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-400">Queue To:</span>
              <select
                value={checkInDoctorId}
                onChange={(e) => setCheckInDoctorId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none"
              >
                {doctors.map((d) => (
                  <option key={d.userId} value={d.userId}>
                    Dr. {d.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Autocomplete Patient Search Results */}
        {searchResults.length > 0 && (
          <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {searchResults.map((p) => {
              const checkInDoc = doctors.find((d) => d.userId === checkInDoctorId);
              return (
                <div
                  key={p.id}
                  className="p-3 hover:bg-slate-50 flex items-center justify-between transition-colors text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{p.fullName}</span>
                      <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                        {p.patientUid}
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {p.age}y / {p.gender} • {p.mobileNumber}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddToQueue(p.id)}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Dr. {checkInDoc?.fullName?.split(' ')[0] || 'Queue'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter Tabs & Doctor Filter */}
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
              {tab}{' '}
              {tab === 'Waiting'
                ? `(${waitingCount})`
                : tab === 'Completed'
                ? `(${completedCount})`
                : `(${queue.length})`}
            </button>
          ))}
        </div>

        {/* Doctor Queue Filter */}
        {doctors.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Filter Queue:</span>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-1.5 outline-none shadow-sm cursor-pointer"
            >
              <option value="">All Doctors ({queue.length})</option>
              {doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  Dr. {d.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Queue Cards */}
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

                    {/* Fee Payment Badge (Phase 2D) */}
                    {item.payment ? (
                      <span className="inline-flex items-center text-[11px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md border border-emerald-300">
                        <IndianRupee className="w-3 h-3 mr-0.5" />
                        <span>
                          Paid: ₹{item.payment.amount} ({item.payment.method})
                        </span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenFeeModal(item)}
                        className="inline-flex items-center text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md border border-amber-200 transition-colors"
                      >
                        <IndianRupee className="w-3 h-3 mr-0.5 text-amber-600" />
                        <span>Collect Fee</span>
                      </button>
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

                  {/* Vitals Summary */}
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
                <button
                  onClick={() => setSelectedVisitForVitals(item)}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  Vitals
                </button>

                {isDoctorUser && item.status !== 'Completed' ? (
                  <button
                    onClick={() => handleStartConsultation(item)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all"
                  >
                    <span>Start Consultation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : null}

                {item.hasPrescription && (
                  <button
                    onClick={() => handleOpenPrescription(item.id)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>View / Print Rx</span>
                  </button>
                )}

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

      {/* Collect Fee Modal (Phase 2D) */}
      {paymentVisit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-emerald-800">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Record OPD Consultation Fee</h3>
              </div>
              <button
                onClick={() => setPaymentVisit(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 border border-slate-100">
              <div className="font-bold text-slate-900">{paymentVisit.patientName}</div>
              <div className="text-slate-500 font-mono">
                Token #{paymentVisit.tokenNumber} • {paymentVisit.patientUid}
              </div>
              {paymentVisit.doctorName && (
                <div className="text-emerald-700 font-semibold">
                  Consulting: Dr. {paymentVisit.doctorName}
                </div>
              )}
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee Amount (INR ₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-all ${
                      paymentMethod === 'Cash'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition-all ${
                      paymentMethod === 'UPI'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    UPI / QR
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reference / UTR / Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder={paymentMethod === 'UPI' ? 'e.g. UPI Ref / GooglePay 12-digit UTR' : 'e.g. Receipt memo'}
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentVisit(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {recordingPayment ? 'Recording...' : 'Confirm Paid ₹' + paymentAmount}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Collection Report Modal (Phase 2D) */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 space-y-5 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Daily OPD Collection Report</h3>
                  <p className="text-xs text-slate-500">Receptionist Cash & UPI Settlement Log</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setReportDate(newDate);
                    handleOpenReport(newDate);
                  }}
                  className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 outline-none"
                />
                <button
                  onClick={() => setIsReportOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {loadingReport ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Generating daily collection report...
              </div>
            ) : dailyReport ? (
              <div className="overflow-y-auto space-y-5 flex-1 pr-1 text-xs">
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Grand Total</span>
                    <span className="text-xl font-black font-mono text-emerald-900">
                      ₹{dailyReport.grandTotal}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Cash Collected</span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                      ₹{dailyReport.totalCash}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">UPI Collected</span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                      ₹{dailyReport.totalUpi}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Transactions</span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                      {dailyReport.totalTransactions}
                    </span>
                  </div>
                </div>

                {/* Staff Summary Table */}
                {dailyReport.staffSummaries && dailyReport.staffSummaries.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Staff Member Collection Breakdown
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Staff Name</th>
                            <th className="py-2.5 px-3">Cash</th>
                            <th className="py-2.5 px-3">UPI</th>
                            <th className="py-2.5 px-3">Total</th>
                            <th className="py-2.5 px-3 text-right">Transactions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dailyReport.staffSummaries.map((s) => (
                            <tr key={s.staffId} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-900">{s.staffName}</td>
                              <td className="py-2 px-3 font-mono">₹{s.cashCollected}</td>
                              <td className="py-2 px-3 font-mono">₹{s.upiCollected}</td>
                              <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                                ₹{s.totalCollected}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {s.transactionsCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Individual Transactions Log */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Today's OPD Transactions Log ({dailyReport.payments.length})
                  </h4>
                  {dailyReport.payments.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No OPD fee collections recorded for this date.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Time</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Method</th>
                            <th className="py-2.5 px-3">Reference / UTR</th>
                            <th className="py-2.5 px-3">Collected By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dailyReport.payments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                                {new Date(p.collectedAt).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-emerald-800">
                                ₹{p.amount}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    p.method === 'Cash'
                                      ? 'bg-amber-100 text-amber-900'
                                      : 'bg-blue-100 text-blue-900'
                                  }`}
                                >
                                  {p.method}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                                {p.reference || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-700 font-medium">
                                {p.collectedByName}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
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

export default OpdQueuePage;
