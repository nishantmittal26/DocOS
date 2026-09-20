import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { visitsApi, patientsApi } from '../../api/client';
import { VisitQueueItem, PatientSearchResult, PrescriptionDetail } from '../../types';
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
  HeartPulse
} from 'lucide-react';

interface OpdQueuePageProps {
  onOpenNewPatient: () => void;
}

export const OpdQueuePage: React.FC<OpdQueuePageProps> = ({ onOpenNewPatient }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [queue, setQueue] = useState<VisitQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'All' | 'Waiting' | 'Completed'>('All');

  // Search patients to add to queue
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Modals state
  const [selectedVisitForVitals, setSelectedVisitForVitals] = useState<VisitQueueItem | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionDetail | null>(null);
  const [loadingPrescription, setLoadingPrescription] = useState(false);

  const fetchQueue = async () => {
    try {
      const data = await visitsApi.getTodayQueue();
      setQueue(data);
    } catch (err) {
      console.error('Failed to fetch queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh queue every 20 seconds
    const interval = setInterval(fetchQueue, 20000);
    return () => clearInterval(interval);
  }, []);

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

  const handleAddToQueue = async (patientId: string) => {
    try {
      await visitsApi.addToQueue(patientId);
      setSearchQuery('');
      setSearchResults([]);
      fetchQueue();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add patient to queue');
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

  const filteredQueue = queue.filter((item) => {
    if (filter === 'Waiting') return item.status === 'Waiting' || item.status === 'InConsultation';
    if (filter === 'Completed') return item.status === 'Completed';
    return true;
  });

  const waitingCount = queue.filter((i) => i.status === 'Waiting' || i.status === 'InConsultation').length;
  const completedCount = queue.filter((i) => i.status === 'Completed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header / Stats Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Today's OPD Queue</h1>
            <button
              onClick={fetchQueue}
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
            })} • Manage patient consultations and vitals
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
            onClick={onOpenNewPatient}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
        </div>
      </div>

      {/* Quick Patient Search & Add to Queue Bar */}
      <div className="relative">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="Search existing patients by Mobile Number, Patient UID, or Name to add to queue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-sm outline-none placeholder:text-slate-400"
          />
          {searching && <span className="text-xs text-slate-400 mr-2">Searching...</span>}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-20 max-h-72 overflow-y-auto divide-y divide-slate-100">
            {searchResults.map((patient) => (
              <div
                key={patient.id}
                className="p-3.5 hover:bg-slate-50 flex items-center justify-between transition-colors"
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
                  <div className="text-xs text-slate-500 mt-0.5">
                    Phone: <span className="font-mono font-medium text-slate-700">{patient.mobileNumber}</span>
                    {patient.allergies && (
                      <span className="ml-2 text-rose-600 font-medium">• Allergies: {patient.allergies}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAddToQueue(patient.id)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Queue</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Queue Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
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
                    {item.vitals && (item.vitals.systolicBp || item.vitals.pulseBpm || item.vitals.temperatureF) ? (
                      <button
                        onClick={() => setSelectedVisitForVitals(item)}
                        className="inline-flex items-center space-x-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                        <span>
                          {item.vitals.systolicBp ? `${item.vitals.systolicBp}/${item.vitals.diastolicBp} BP` : ''}
                          {item.vitals.pulseBpm ? ` • ${item.vitals.pulseBpm} bpm` : ''}
                          {item.vitals.temperatureF ? ` • ${item.vitals.temperatureF}°F` : ''}
                          {item.vitals.bmi ? ` • BMI ${item.vitals.bmi}` : ''}
                        </span>
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
                {user?.role === 'Doctor' && item.status !== 'Completed' ? (
                  <button
                    onClick={() => navigate(`/consultation/${item.id}`)}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vitals Recording Modal */}
      <VitalsModal
        isOpen={!!selectedVisitForVitals}
        visit={selectedVisitForVitals}
        onClose={() => setSelectedVisitForVitals(null)}
        onSaved={fetchQueue}
      />

      {/* Prescription Print Modal */}
      <PrescriptionPrintModal
        isOpen={!!selectedPrescription}
        prescription={selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
      />
    </div>
  );
};
