import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { clinicsApi, medicinesApi, authApi } from '../../api/client';
import { ClinicProfile, DosageForm, Medicine } from '../../types';
import {
  Settings,
  Building2,
  Sliders,
  UserPlus,
  Pill,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Plus,
  Search,
  Trash2,
  Filter
} from 'lucide-react';
import { AddCustomMedicineModal } from '../../components/AddCustomMedicineModal';

export const SettingsPage: React.FC = () => {
  const { user, updateUserClinicInfo } = useAuth();

  const [activeTab, setActiveTab] = useState<'letterhead' | 'staff' | 'medicines'>('letterhead');

  // Letterhead config state
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [letterheadMarginTopMm, setLetterheadMarginTopMm] = useState<number>(60);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Staff creation state
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Custom medicines state
  const [customMedicines, setCustomMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medFormFilter, setMedFormFilter] = useState('All');
  const [medSuccessMsg, setMedSuccessMsg] = useState<string | null>(null);

  const loadCustomMedicines = async () => {
    setLoadingMedicines(true);
    try {
      const data = await medicinesApi.getCustom();
      setCustomMedicines(data);
    } catch (err) {
      console.error('Failed to load custom medicines', err);
    } finally {
      setLoadingMedicines(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await clinicsApi.getProfile();
        setProfile(data);
        setClinicName(data.name);
        setDoctorName(data.doctorName);
        setRegNumber(data.regNumber || '');
        setQualifications(data.qualifications || '');
        setSpecialization(data.specialization || '');
        setPhone(data.phone);
        setEmail(data.email || '');
        setAddress(data.address || '');
        setLetterheadMarginTopMm(data.letterheadMarginTopMm);
      } catch (err) {
        console.error(err);
      }
    };

    loadProfile();
    loadCustomMedicines();
  }, []);

  const handleSaveLetterhead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);

    try {
      const updated = await clinicsApi.updateLetterhead({
        clinicName: clinicName.trim(),
        doctorName: doctorName.trim(),
        regNumber: regNumber.trim() || undefined,
        qualifications: qualifications.trim() || undefined,
        specialization: specialization.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        letterheadMarginTopMm,
      });

      updateUserClinicInfo({
        clinicName: updated.name,
        doctorName: updated.doctorName,
        regNumber: updated.regNumber,
        qualifications: updated.qualifications,
        letterheadMarginTopMm: updated.letterheadMarginTopMm,
      });

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err) {
      alert('Failed to update letterhead settings');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingStaff(true);
    setStaffError(null);
    setStaffSuccess(false);

    try {
      await authApi.registerStaff({
        fullName: staffName.trim(),
        email: staffEmail.trim(),
        phone: staffPhone.trim(),
        password: staffPassword,
        role: 'Receptionist',
      });

      setStaffSuccess(true);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('');
      setTimeout(() => setStaffSuccess(false), 5000);
    } catch (err: any) {
      setStaffError(err.response?.data?.message || 'Failed to create staff account');
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleDeleteMedicine = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from your clinic formulary?`)) {
      return;
    }
    try {
      await medicinesApi.deleteCustom(id);
      setCustomMedicines((prev) => prev.filter((m) => m.id !== id));
      setMedSuccessMsg(`Medicine "${name}" was removed from your formulary.`);
      setTimeout(() => setMedSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete medicine');
    }
  };

  const filteredMedicines = customMedicines.filter((m) => {
    const q = medSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      m.brandName.toLowerCase().includes(q) ||
      m.saltComposition.toLowerCase().includes(q) ||
      (m.manufacturer && m.manufacturer.toLowerCase().includes(q));

    const matchesForm = medFormFilter === 'All' || m.form === medFormFilter;
    return matchesSearch && matchesForm;
  });

  const getFormBadgeClass = (form: DosageForm) => {
    switch (form) {
      case 'Tablet':
        return 'bg-blue-50 text-blue-700 border border-blue-200/60';
      case 'Capsule':
        return 'bg-purple-50 text-purple-700 border border-purple-200/60';
      case 'Syrup':
        return 'bg-amber-50 text-amber-700 border border-amber-200/60';
      case 'Injection':
        return 'bg-rose-50 text-rose-700 border border-rose-200/60';
      case 'Ointment':
        return 'bg-teal-50 text-teal-700 border border-teal-200/60';
      case 'Drops':
        return 'bg-cyan-50 text-cyan-700 border border-cyan-200/60';
      case 'Inhaler':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200/60';
      default:
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinic Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure letterhead margins, staff roles, and custom generic drug database
        </p>

        {/* Tab switcher */}
        <div className="mt-5 flex items-center space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('letterhead')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'letterhead'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Letterhead & Margin Offset
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'staff'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Clinic Staff (Receptionist / Assistant)
          </button>
          <button
            onClick={() => setActiveTab('medicines')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'medicines'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Custom Medicine Master
          </button>
        </div>
      </div>

      {/* Tab 1: Letterhead Config */}
      {activeTab === 'letterhead' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSaveLetterhead} className="space-y-4 max-w-2xl">
            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>Letterhead settings updated successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Name</label>
                <input
                  type="text"
                  required
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Reg. Number</label>
                <input
                  type="text"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qualifications</label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* PRE-PRINTED LETTERHEAD MARGIN OFFSET (Requirement 5) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="flex items-center text-xs font-bold text-slate-900">
                <Sliders className="w-4 h-4 mr-1.5 text-emerald-600" />
                Pre-printed Letterhead Pad Top Margin ({letterheadMarginTopMm} mm)
              </label>
              <p className="text-[11px] text-slate-500">
                Adjust the blank margin reserved at the top of the prescription when printing on your clinic's physical letterhead pad.
              </p>
              <input
                type="range"
                min="0"
                max="120"
                step="5"
                value={letterheadMarginTopMm}
                onChange={(e) => setLetterheadMarginTopMm(parseInt(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0 mm (Top of page)</span>
                <span>60 mm (Standard Letterhead)</span>
                <span>120 mm (Deep header)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Letterhead Settings'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Staff Management */}
      {activeTab === 'staff' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add Receptionist / Clinic Assistant</h2>
            <p className="text-xs text-slate-500">
              Receptionists can register patients, take preliminary vitals, and manage the OPD queue.
            </p>
          </div>

          {staffSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Staff account created! They can now sign in using their email and password.</span>
            </div>
          )}

          {staffError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-red-700">
              <AlertCircle className="w-4 h-4" />
              <span>{staffError}</span>
            </div>
          )}

          <form onSubmit={handleCreateStaff} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Priya Verma"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Login Email</label>
              <input
                type="email"
                required
                placeholder="receptionist@clinic.com"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingStaff}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>{creatingStaff ? 'Creating...' : 'Create Assistant Account'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Custom Medicine Master */}
      {activeTab === 'medicines' && (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-slate-900">Custom Medicine Master</h2>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                    {customMedicines.length} {customMedicines.length === 1 ? 'Medicine' : 'Medicines'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage custom brands, specialized salt formulations, and clinic-specific drugs.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddMedModalOpen(true)}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Medicine</span>
              </button>
            </div>

            {/* Notification Banner if recently added/removed */}
            {medSuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{medSuccessMsg}</span>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by brand name, generic salt, or manufacturer..."
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>

              {/* Form Filter Selector */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
                <select
                  value={medFormFilter}
                  onChange={(e) => setMedFormFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="All">All Forms</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Drops">Drops</option>
                  <option value="Inhaler">Inhaler</option>
                  <option value="Powder">Powder</option>
                  <option value="Lotion">Lotion</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Medicines Grid / Table */}
          {filteredMedicines.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Pill className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {customMedicines.length === 0 ? 'No custom medicines added yet' : 'No matching medicines found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                {customMedicines.length === 0
                  ? 'Add your clinic’s custom brand names, dosage formulations, and specialized salts to use them in OPD prescriptions.'
                  : 'Try adjusting your search query or form filter to find the medicine you are looking for.'}
              </p>
              {customMedicines.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsAddMedModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Medicine</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMedSearchQuery('');
                    setMedFormFilter('All');
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Brand / Medicine</th>
                      <th className="px-4 py-3.5">Form</th>
                      <th className="px-4 py-3.5">Strength</th>
                      <th className="px-5 py-3.5">Generic / Salt Composition</th>
                      <th className="px-4 py-3.5">Manufacturer</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMedicines.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                              <Pill className="w-3.5 h-3.5" />
                            </div>
                            <span className="truncate max-w-[200px]">{med.brandName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getFormBadgeClass(med.form)}`}>
                            {med.form}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700 font-mono">
                          {med.strength}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate font-medium">
                          {med.saltComposition}
                        </td>
                        <td className="px-4 py-3.5 text-slate-50">
                          <span className="text-slate-600">{med.manufacturer || '—'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteMedicine(med.id, med.brandName)}
                            title="Delete custom medicine"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Custom Medicine Popup Modal */}
          <AddCustomMedicineModal
            isOpen={isAddMedModalOpen}
            onClose={() => setIsAddMedModalOpen(false)}
            onMedicineAdded={(newMed) => {
              setCustomMedicines((prev) => [newMed, ...prev]);
              setMedSuccessMsg(`Medicine "${newMed.brandName}" was added successfully to your clinic formulary!`);
              setTimeout(() => setMedSuccessMsg(null), 4000);
            }}
          />
        </div>
      )}
    </div>
  );
};
