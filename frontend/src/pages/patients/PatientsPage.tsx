import React, { useState, useEffect } from 'react';
import { formatDateIST } from '../../utils/dateTime';
import { patientsApi, visitsApi, authApi } from '../../api/client';
import { PatientSearchResult, VisitQueueItem, DoctorProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Plus,
  UserPlus,
  Phone,
  Calendar,
  AlertTriangle,
  Users,
  Clock,
  CheckCircle2,
  Stethoscope,
  ChevronDown,
} from 'lucide-react';

interface PatientsPageProps {
  onOpenNewPatient: () => void;
}

export const PatientsPage: React.FC<PatientsPageProps> = ({ onOpenNewPatient }) => {
  const { user, hasRole } = useAuth();

  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [todayQueue, setTodayQueue] = useState<VisitQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-doctor state
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('');
  // Target doctor selected for check-in on individual cards
  const [cardTargetDoctors, setCardTargetDoctors] = useState<Record<string, string>>({});

  // Load clinic doctors
  useEffect(() => {
    authApi
      .getClinicDoctors()
      .then((docs) => {
        setDoctors(docs);
        if (docs.length > 0) {
          // If logged-in user is a doctor, default filter to their own patients
          const isDoc = hasRole('Doctor');
          const currentDoc = docs.find((d) => d.userId === user?.userId);
          if (isDoc && currentDoc) {
            setSelectedDoctorFilter(currentDoc.userId);
          }
        }
      })
      .catch((err) => console.error('Failed to load clinic doctors in PatientsPage', err));
  }, [user]);

  const fetchTodayQueue = async () => {
    try {
      const q = await visitsApi.getTodayQueue();
      setTodayQueue(q);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatients = async (q: string = '', doctorId?: string) => {
    setLoading(true);
    try {
      const data = await patientsApi.search(q, doctorId);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayQueue();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(query, selectedDoctorFilter || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedDoctorFilter]);

  const handleAddToQueue = async (patientId: string, doctorId?: string) => {
    const targetDoc = doctorId || cardTargetDoctors[patientId] || selectedDoctorFilter || doctors[0]?.userId;
    try {
      await visitsApi.addToQueue({
        patientId,
        doctorId: targetDoc || undefined,
      });
      const docName = doctors.find((d) => d.userId === targetDoc)?.fullName;
      alert(`Patient added to ${docName ? `Dr. ${docName}'s` : "today's"} OPD Queue successfully!`);
      fetchTodayQueue();
      fetchPatients(query, selectedDoctorFilter || undefined);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add patient to queue');
    }
  };

  const currentFilterDocName = doctors.find((d) => d.userId === selectedDoctorFilter)?.fullName;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Directory</h1>
          <p className="text-xs text-slate-500 mt-1">
            Search patient records by 10-digit mobile number, Patient ID, or name
          </p>
        </div>

        <button
          onClick={onOpenNewPatient}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Input & Doctor Filter Bar */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search by Query */}
        <div className="flex-1 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder={
              currentFilterDocName
                ? `Search Dr. ${currentFilterDocName}'s patients by Mobile, UID, or Name...`
                : "Search all clinic patients by Mobile, UID, or Name..."
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Doctor Filter Selector */}
        {doctors.length > 0 && (
          <div className="flex items-center space-x-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
            <Stethoscope className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Doctor:</span>
            <select
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="">All Clinic Patients</option>
              {doctors.map((d) => (
                <option key={d.userId} value={d.userId}>
                  Dr. {d.fullName} {d.speciality ? `(${d.speciality})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Patients Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          Loading patients...
        </div>
      ) : patients.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No patients found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {selectedDoctorFilter
              ? `No patients found for Dr. ${currentFilterDocName}. Try selecting "All Clinic Patients" or register a new patient.`
              : 'Try adjusting your search criteria or register a new patient.'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => {
            // Check if patient is already queued today across the clinic
            const existingQueueItem =
              todayQueue.find((q) => q.patientId === p.id) ||
              (p.todayVisitStatus
                ? {
                    tokenNumber: p.todayVisitTokenNumber,
                    status: p.todayVisitStatus,
                    doctorName: p.todayVisitDoctorName,
                  }
                : null);

            const isWaitingOrInConsultation =
              existingQueueItem &&
              (existingQueueItem.status === 'Waiting' ||
                existingQueueItem.status === 'InConsultation');
            const isCompleted = existingQueueItem && existingQueueItem.status === 'Completed';

            // Selected check-in doctor for this specific card
            const targetDocId =
              cardTargetDoctors[p.id] || selectedDoctorFilter || doctors[0]?.userId || '';
            const targetDoc = doctors.find((d) => d.userId === targetDocId);

            return (
              <div
                key={p.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {p.patientUid}
                      </span>
                      <h2 className="text-base font-bold text-slate-900 mt-1">{p.fullName}</h2>
                      <span className="text-xs text-slate-500">
                        {p.age} Yrs • {p.gender}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-xs space-y-1.5 text-slate-600">
                    <div className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono font-medium">{p.mobileNumber}</span>
                    </div>

                    {/* Last Doctor / Last Visit Info */}
                    {(p.lastDoctorName || p.lastVisitDate) && (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Last Visit:{' '}
                          {p.lastVisitDate
                            ? formatDateIST(p.lastVisitDate)
                            : '—'}
                          {p.lastDoctorName && (
                            <strong className="text-slate-700 ml-1">
                              (Dr. {p.lastDoctorName})
                            </strong>
                          )}
                        </span>
                      </div>
                    )}

                    {p.allergies && (
                      <div className="pt-1 flex items-center space-x-1 text-rose-600 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Allergies: {p.allergies}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Queue Status / Add to Doctor Queue Action */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  {isWaitingOrInConsultation ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        In Queue (#{existingQueueItem.tokenNumber})
                        {existingQueueItem.doctorName ? ` • Dr. ${existingQueueItem.doctorName}` : ''}
                      </span>
                    </span>
                  ) : isCompleted ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Completed Today (#{existingQueueItem.tokenNumber})
                        {existingQueueItem.doctorName ? ` • Dr. ${existingQueueItem.doctorName}` : ''}
                      </span>
                    </span>
                  ) : (
                    <div className="w-full flex items-center justify-between gap-2">
                      {/* Doctor dropdown on card if multiple doctors exist */}
                      {doctors.length > 1 && (
                        <select
                          value={targetDocId}
                          onChange={(e) =>
                            setCardTargetDoctors((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                          className="text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none max-w-[130px] truncate"
                        >
                          {doctors.map((d) => (
                            <option key={d.userId} value={d.userId}>
                              Dr. {d.fullName}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={() => handleAddToQueue(p.id, targetDocId)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors ml-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>
                          {targetDoc ? `Add to Dr. ${targetDoc.fullName.split(' ')[0]}` : 'Add to Queue'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
