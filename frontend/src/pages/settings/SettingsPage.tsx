import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { clinicsApi, medicinesApi, authApi } from '../../api/client';
import { ClinicProfile, DosageForm } from '../../types';
import {
  Settings,
  Building2,
  Sliders,
  UserPlus,
  Pill,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck
} from 'lucide-react';

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

  // Custom medicine state
  const [customBrand, setCustomBrand] = useState('');
  const [customSalt, setCustomSalt] = useState('');
  const [customForm, setCustomForm] = useState<DosageForm>('Tablet');
  const [customStrength, setCustomStrength] = useState('');
  const [customMfg, setCustomMfg] = useState('');
  const [addingMed, setAddingMed] = useState(false);
  const [medSuccess, setMedSuccess] = useState(false);

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

  const handleAddCustomMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingMed(true);
    setMedSuccess(false);

    try {
      await medicinesApi.addCustom({
        brandName: customBrand.trim(),
        saltComposition: customSalt.trim(),
        form: customForm,
        strength: customStrength.trim(),
        manufacturer: customMfg.trim() || undefined,
      });

      setMedSuccess(true);
      setCustomBrand('');
      setCustomSalt('');
      setCustomStrength('');
      setCustomMfg('');
      setTimeout(() => setMedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add custom medicine');
    } finally {
      setAddingMed(false);
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
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add Custom Medicine to Formulary</h2>
            <p className="text-xs text-slate-500">
              Add specialized brands and generic salt formulations specific to your clinic.
            </p>
          </div>

          {medSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Medicine added to your clinic's autocomplete list!</span>
            </div>
          )}

          <form onSubmit={handleAddCustomMedicine} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medicine / Brand Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MySpecial Brand 500"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Generic / Salt Composition
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Paracetamol 500mg + Caffeine 30mg"
                value={customSalt}
                onChange={(e) => setCustomSalt(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Form</label>
                <select
                  value={customForm}
                  onChange={(e) => setCustomForm(e.target.value as DosageForm)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment</option>
                  <option value="Drops">Drops</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Strength</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500mg"
                  value={customStrength}
                  onChange={(e) => setCustomStrength(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Sun Pharma"
                value={customMfg}
                onChange={(e) => setCustomMfg(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={addingMed}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Pill className="w-4 h-4" />
              <span>{addingMed ? 'Adding...' : 'Add Medicine to Formulary'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
