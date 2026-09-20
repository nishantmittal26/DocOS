import React, { useState, useEffect } from 'react';
import { patientsApi, visitsApi } from '../../api/client';
import { PatientSearchResult } from '../../types';
import { Search, Plus, UserPlus, Phone, Calendar, AlertTriangle, Users } from 'lucide-react';

interface PatientsPageProps {
  onOpenNewPatient: () => void;
}

export const PatientsPage: React.FC<PatientsPageProps> = ({ onOpenNewPatient }) => {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async (q: string = '') => {
    setLoading(true);
    try {
      const data = await patientsApi.search(q);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleAddToQueue = async (patientId: string) => {
    try {
      await visitsApi.addToQueue(patientId);
      alert('Patient added to today OPD Queue successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add patient to queue');
    }
  };

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

      {/* Search Input */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex items-center space-x-3">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search by Mobile Number, Patient UID, or Name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 text-sm outline-none text-slate-900 placeholder:text-slate-400"
        />
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
            Try adjusting your search criteria or register a new patient.
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
          {patients.map((p) => (
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

                <div className="mt-3 text-xs space-y-1 text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-medium">{p.mobileNumber}</span>
                  </div>
                  {p.lastVisitDate && (
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Last Visit: {new Date(p.lastVisitDate).toLocaleDateString()}</span>
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

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  onClick={() => handleAddToQueue(p.id)}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Today's Queue</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
