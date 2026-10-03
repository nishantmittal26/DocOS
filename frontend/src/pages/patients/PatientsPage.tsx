import React, { useState, useEffect, useMemo } from 'react';
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
  LayoutGrid,
  Table2,
  Pencil,
} from 'lucide-react';
import { EditPatientModal } from '../../components/EditPatientModal';

type PatientListView = 'cards' | 'table';

interface PatientsPageProps {
  onOpenNewPatient: () => void;
}

type QueueContext = {
  existingQueueItem: {
    tokenNumber?: number;
    status: string;
    doctorName?: string;
  } | null;
  isWaitingOrInConsultation: boolean;
  isCompleted: boolean;
  targetDocId: string;
  targetDoc: DoctorProfile | undefined;
};

function resolveQueueContext(
  p: PatientSearchResult,
  todayQueue: VisitQueueItem[],
  cardTargetDoctors: Record<string, string>,
  selectedDoctorFilter: string,
  doctors: DoctorProfile[]
): QueueContext {
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
    !!existingQueueItem &&
    (existingQueueItem.status === 'Waiting' || existingQueueItem.status === 'InConsultation');
  const isCompleted = !!existingQueueItem && existingQueueItem.status === 'Completed';

  const targetDocId = cardTargetDoctors[p.id] || selectedDoctorFilter || doctors[0]?.userId || '';
  const targetDoc = doctors.find((d) => d.userId === targetDocId);

  return {
    existingQueueItem,
    isWaitingOrInConsultation,
    isCompleted,
    targetDocId,
    targetDoc,
  };
}

export const PatientsPage: React.FC<PatientsPageProps> = ({ onOpenNewPatient }) => {
  const { user, hasRole } = useAuth();

  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [todayQueue, setTodayQueue] = useState<VisitQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [listView, setListView] = useState<PatientListView>(() => {
    const stored = sessionStorage.getItem('docos-patients-list-view');
    return stored === 'table' ? 'table' : 'cards';
  });

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('');
  const [cardTargetDoctors, setCardTargetDoctors] = useState<Record<string, string>>({});
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  useEffect(() => {
    sessionStorage.setItem('docos-patients-list-view', listView);
  }, [listView]);

  useEffect(() => {
    authApi
      .getClinicDoctors()
      .then((docs) => {
        setDoctors(docs);
        if (docs.length > 0) {
          const isDoc = hasRole('Doctor');
          const currentDoc = docs.find((d) => d.userId === user?.userId);
          if (isDoc && currentDoc) {
            setSelectedDoctorFilter(currentDoc.userId);
          }
        }
      })
      .catch((err) => console.error('Failed to load clinic doctors in PatientsPage', err));
  }, [user, hasRole]);

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
    const targetDoc =
      doctorId || cardTargetDoctors[patientId] || selectedDoctorFilter || doctors[0]?.userId;
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

  const queueByPatient = useMemo(() => {
    const map = new Map<string, QueueContext>();
    for (const p of patients) {
      map.set(p.id, resolveQueueContext(p, todayQueue, cardTargetDoctors, selectedDoctorFilter, doctors));
    }
    return map;
  }, [patients, todayQueue, cardTargetDoctors, selectedDoctorFilter, doctors]);

  const renderQueueAction = (p: PatientSearchResult, compact = false) => {
    const ctx = queueByPatient.get(p.id)!;

    if (ctx.isWaitingOrInConsultation && ctx.existingQueueItem) {
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg border border-amber-200 ${
            compact ? 'text-[10px]' : 'text-xs'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Queue #{ctx.existingQueueItem.tokenNumber}
            {ctx.existingQueueItem.doctorName ? ` • ${ctx.existingQueueItem.doctorName}` : ''}
          </span>
        </span>
      );
    }

    if (ctx.isCompleted && ctx.existingQueueItem) {
      return (
        <span
          className={`inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200 ${
            compact ? 'text-[10px]' : 'text-xs'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Done #{ctx.existingQueueItem.tokenNumber}
            {ctx.existingQueueItem.doctorName ? ` • ${ctx.existingQueueItem.doctorName}` : ''}
          </span>
        </span>
      );
    }

    return (
      <div className={`flex items-center gap-2 ${compact ? 'justify-end' : 'w-full justify-between'}`}>
        {doctors.length > 1 && (
          <select
            value={ctx.targetDocId}
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
          onClick={() => handleAddToQueue(p.id, ctx.targetDocId)}
          className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>
            {ctx.targetDoc ? `Add • ${ctx.targetDoc.fullName.split(' ')[0]}` : 'Add to Queue'}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <EditPatientModal
        isOpen={editingPatientId !== null}
        patientId={editingPatientId}
        onClose={() => setEditingPatientId(null)}
        onPatientUpdated={() => fetchPatients(query, selectedDoctorFilter || undefined)}
      />
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

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 flex items-center space-x-3">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder={
              currentFilterDocName
                ? `Search Dr. ${currentFilterDocName}'s patients by Mobile, UID, or Name...`
                : 'Search all clinic patients by Mobile, UID, or Name...'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setListView('cards')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition ${
                listView === 'cards' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              aria-pressed={listView === 'cards'}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setListView('table')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition ${
                listView === 'table' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              aria-pressed={listView === 'table'}
            >
              <Table2 className="w-3.5 h-3.5" />
              Grid
            </button>
          </div>

          {doctors.length > 0 && (
            <>
              <Stethoscope className="w-4 h-4 text-emerald-600 flex-shrink-0 hidden sm:block" />
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
            </>
          )}
        </div>
      </div>

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
      ) : listView === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {p.patientUid}
                      </span>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{p.fullName}</h2>
                      <span className="text-xs text-slate-500">
                        {p.age} Yrs • {p.gender}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPatientId(p.id)}
                      className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg shrink-0"
                      title="Edit patient"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                <div className="mt-3 text-xs space-y-1.5 text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium">{p.mobileNumber}</span>
                  </div>

                  {(p.lastDoctorName || p.lastVisitDate) && (
                    <div className="flex items-center space-x-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Last Visit: {p.lastVisitDate ? formatDateIST(p.lastVisitDate) : '—'}
                        {p.lastDoctorName && (
                          <strong className="text-slate-700 ml-1">(Dr. {p.lastDoctorName})</strong>
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

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                {renderQueueAction(p)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">Last visit</th>
                  <th className="py-3 px-4">Allergies</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">{p.patientUid}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.fullName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.age} • {p.gender}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{p.mobileNumber}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-[10rem]">
                      {p.lastVisitDate ? formatDateIST(p.lastVisitDate) : '—'}
                      {p.lastDoctorName && (
                        <span className="block text-[10px] text-slate-500 truncate">Dr. {p.lastDoctorName}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-rose-700 max-w-[8rem] truncate" title={p.allergies || undefined}>
                      {p.allergies || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col items-end gap-2">
                        {renderQueueAction(p, true)}
                        <button
                          type="button"
                          onClick={() => setEditingPatientId(p.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
