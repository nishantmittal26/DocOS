import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitsApi } from '../../api/client';
import { VisitQueueItem, PrescriptionDetail } from '../../types';
import { VitalsModal } from '../../components/VitalsModal';
import { PrescriptionPrintModal } from '../../components/PrescriptionPrintModal';
import {
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  HeartPulse,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Filter,
  FileText,
  Users,
  Activity,
  Trash2
} from 'lucide-react';

type DatePreset = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';
type StatusFilter = 'ALL' | 'Completed' | 'Waiting' | 'Cancelled';

export const OpdHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters
  const [datePreset, setDatePreset] = useState<DatePreset>('7days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [visits, setVisits] = useState<VisitQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [selectedVisitForVitals, setSelectedVisitForVitals] = useState<VisitQueueItem | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionDetail | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  // Helper to compute fromDate and toDate based on preset
  const getDateRange = () => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (datePreset === 'today') {
      const dStr = formatDate(today);
      return { fromDate: dStr, toDate: dStr };
    }
    if (datePreset === 'yesterday') {
      const y = new Date();
      y.setDate(today.getDate() - 1);
      const dStr = formatDate(y);
      return { fromDate: dStr, toDate: dStr };
    }
    if (datePreset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      return { fromDate: formatDate(past), toDate: formatDate(today) };
    }
    if (datePreset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      return { fromDate: formatDate(past), toDate: formatDate(today) };
    }
    if (datePreset === 'custom') {
      return {
        fromDate: customFrom || undefined,
        toDate: customTo || undefined,
      };
    }
    return { fromDate: undefined, toDate: undefined };
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { fromDate, toDate } = getDateRange();
      const statusParam =
        statusFilter === 'ALL'
          ? undefined
          : statusFilter;

      const data = await visitsApi.getHistory({
        fromDate,
        toDate,
        search: searchQuery.trim() || undefined,
        status: statusParam,
        pageSize: 100,
      });

      setVisits(data);
    } catch (err) {
      console.error('Failed to fetch visit history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [datePreset, customFrom, customTo, statusFilter]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const handleDeleteVisit = async (visitId: string, patientName: string, dateStr: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete the OPD record for ${patientName} (${dateStr})? This will also remove any attached prescription and cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await visitsApi.deleteVisit(visitId);
      fetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete visit record');
    }
  };

  const completedCount = visits.filter((v) => v.status === 'Completed').length;
  const waitingCount = visits.filter(
    (v) => v.status === 'Waiting' || v.status === 'InConsultation'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">OPD Visit History</h1>
            <button
              onClick={fetchHistory}
              title="Refresh Records"
              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, and review past outpatient consultations, vitals, and prescriptions
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <FileText className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-bold text-slate-900">{visits.length} Total</span>
          </div>
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">{completedCount} Completed</span>
          </div>
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200/80 rounded-xl">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-900">{waitingCount} Waiting</span>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-slate-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-50">
            <Search className="w-4 h-4 text-slate-400 mr-2.5" />
            <input
              type="text"
              placeholder="Search by Patient Name, Mobile Number, Patient UID, Diagnosis, or Chief Complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm outline-none text-slate-900 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Date Presets and Status Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Date Range Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </span>
            {(
              [
                { id: '7days', label: 'Last 7 Days' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  datePreset === preset.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'Completed', label: 'Completed' },
                { id: 'Waiting', label: 'Waiting / In Progress' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as StatusFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Picker Inputs if 'custom' is selected */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">From:</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-semibold text-slate-600">To:</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* Visits List */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          Loading past OPD records...
        </div>
      ) : visits.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No OPD visits found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No past visits matched your selected date range and filter criteria. Try adjusting your search or date selection.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {visits.map((item) => {
            const vDate = new Date(item.visitDate);
            return (
              <div
                key={item.id}
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                {/* Left: Date, Token & Demographics */}
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-14 text-center">
                    <div className="rounded-xl bg-slate-100 border border-slate-200 p-2 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold text-slate-500">Token</span>
                      <span className="text-base font-black font-mono leading-none text-slate-800">
                        #{item.tokenNumber}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{item.patientName}</span>
                      <span className="font-mono text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
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
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="text-slate-600 font-medium">
                        Visit Date:{' '}
                        <span className="text-slate-900 font-semibold">
                          {vDate.toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          at{' '}
                          {vDate.toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                      <span>
                        Phone: <span className="font-mono text-slate-700">{item.mobileNumber}</span>
                      </span>
                      {item.allergies && (
                        <span className="flex items-center text-rose-600 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          Allergies: {item.allergies}
                        </span>
                      )}
                    </div>

                    {/* Clinical Summary */}
                    {(item.diagnosis || item.chiefComplaints) && (
                      <div className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1">
                        {item.diagnosis && (
                          <div>
                            <span className="font-bold text-emerald-800">Diagnosis: </span>
                            <span className="font-medium text-slate-900">{item.diagnosis}</span>
                          </div>
                        )}
                        {item.chiefComplaints && (
                          <div>
                            <span className="font-bold text-slate-700">Complaints: </span>
                            <span>{item.chiefComplaints}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Vitals Summary Pill */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {item.vitals &&
                      (item.vitals.systolicBp ||
                        item.vitals.pulseBpm ||
                        item.vitals.temperatureF ||
                        item.vitals.weightKg) ? (
                        <button
                          onClick={() => setSelectedVisitForVitals(item)}
                          className="inline-flex items-center space-x-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                          <span>
                            {item.vitals.systolicBp
                              ? `${item.vitals.systolicBp}/${item.vitals.diastolicBp} BP`
                              : ''}
                            {item.vitals.pulseBpm ? ` • ${item.vitals.pulseBpm} bpm` : ''}
                            {item.vitals.temperatureF ? ` • ${item.vitals.temperatureF}°F` : ''}
                            {item.vitals.bmi ? ` • BMI ${item.vitals.bmi}` : ''}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No vitals recorded</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 self-end lg:self-center">
                  <button
                    onClick={() => setSelectedVisitForVitals(item)}
                    className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                  >
                    Vitals
                  </button>

                  {user?.role === 'Doctor' && item.status !== 'Completed' ? (
                    <button
                      onClick={() => navigate(`/consultation/${item.id}`)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <span>Resume Consultation</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : null}

                  {item.hasPrescription && (
                    <button
                      onClick={() => handleOpenPrescription(item.id)}
                      disabled={loadingPrescription}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View / Print Rx</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteVisit(item.id, item.patientName, vDate.toLocaleDateString())}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors"
                    title="Delete OPD record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <VitalsModal
        isOpen={!!selectedVisitForVitals}
        visit={selectedVisitForVitals}
        onClose={() => setSelectedVisitForVitals(null)}
        onSaved={fetchHistory}
      />

      <PrescriptionPrintModal
        isOpen={!!selectedPrescription}
        prescription={selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
      />
    </div>
  );
};
