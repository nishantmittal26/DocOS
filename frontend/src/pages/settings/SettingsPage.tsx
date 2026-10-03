import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { clinicsApi, medicinesApi, authApi } from '../../api/client';
import { ClinicProfile, DosageForm, Medicine, StaffMember, DoctorProfile } from '../../types';
import {
  Building2,
  Sliders,
  UserPlus,
  Pill,
  CheckCircle2,
  AlertCircle,
  Save,
  Plus,
  Search,
  Trash2,
  Edit2,
  Stethoscope,
  Users,
  Shield,
  Clock,
  ToggleLeft,
  ToggleRight,
  Activity,
} from 'lucide-react';
import { AddCustomMedicineModal } from '../../components/AddCustomMedicineModal';
import { VitalsSettingsPage } from './VitalsSettingsPage';

export const SettingsPage: React.FC = () => {
  const { user, updateUserClinicInfo, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<'clinic' | 'doctor' | 'staff' | 'medicines' | 'vitals'>('clinic');

  // Clinic config state
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [clinicName, setClinicName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [clinicTimings, setClinicTimings] = useState('');
  const [letterheadMarginTopMm, setLetterheadMarginTopMm] = useState<number>(60);
  const [printBottomMarginMm, setPrintBottomMarginMm] = useState<number>(0);
  const [hideLetterheadOnPrint, setHideLetterheadOnPrint] = useState<boolean>(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicSuccess, setClinicSuccess] = useState(false);

  // Doctor profile state
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [docFullName, setDocFullName] = useState('');
  const [docQualifications, setDocQualifications] = useState('');
  const [docRegNumber, setDocRegNumber] = useState('');
  const [docSpeciality, setDocSpeciality] = useState('');
  const [docConsultationFee, setDocConsultationFee] = useState<number | ''>('');
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [doctorSuccess, setDoctorSuccess] = useState(false);

  // Staff management state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'Doctor' | 'Nurse' | 'Receptionist'>('Receptionist');
  const [staffQualifications, setStaffQualifications] = useState('');
  const [staffRegNumber, setStaffRegNumber] = useState('');
  const [staffSpeciality, setStaffSpeciality] = useState('');
  const [staffFee, setStaffFee] = useState<number | ''>('');
  const [invitingStaff, setInvitingStaff] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Custom medicines state
  const [customMedicines, setCustomMedicines] = useState<Medicine[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [isAddMedModalOpen, setIsAddMedModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medFormFilter, setMedFormFilter] = useState('All');
  const [medSuccessMsg, setMedSuccessMsg] = useState<string | null>(null);

  const loadClinicProfile = async () => {
    try {
      const data = await clinicsApi.getProfile();
      setProfile(data);
      setClinicName(data.name);
      setPhone(data.phone);
      setEmail(data.email || '');
      setAddress(data.address || '');
      setClinicTimings(data.clinicTimings || '');
      setLetterheadMarginTopMm(data.letterheadMarginTopMm);
      setPrintBottomMarginMm(data.printBottomMarginMm || 0);
      setHideLetterheadOnPrint(data.hideLetterheadOnPrint || false);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDoctorProfile = async () => {
    try {
      const data = await authApi.getDoctorProfile();
      if (data) {
        setDoctorProfile(data);
        setDocFullName(data.fullName);
        setDocQualifications(data.qualifications || '');
        setDocRegNumber(data.medicalCouncilRegistrationNumber || '');
        setDocSpeciality(data.speciality || '');
        setDocConsultationFee(data.consultationFee ?? '');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStaffList = async () => {
    setLoadingStaff(true);
    try {
      const data = await authApi.getClinicStaff();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load clinic staff', err);
    } finally {
      setLoadingStaff(false);
    }
  };

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
    loadClinicProfile();
    loadDoctorProfile();
    loadStaffList();
    loadCustomMedicines();
  }, []);

  const handleSaveClinicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingClinic(true);
    setClinicSuccess(false);

    try {
      const updated = await clinicsApi.updateLetterhead({
        clinicName: clinicName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        letterheadMarginTopMm,
        printBottomMarginMm,
        hideLetterheadOnPrint,
        clinicTimings: clinicTimings.trim() || undefined,
      });

      updateUserClinicInfo({
        clinicName: updated.name,
        letterheadMarginTopMm: updated.letterheadMarginTopMm,
        printBottomMarginMm: updated.printBottomMarginMm,
        hideLetterheadOnPrint: updated.hideLetterheadOnPrint,
        clinicTimings: updated.clinicTimings,
      });

      setClinicSuccess(true);
      setTimeout(() => setClinicSuccess(false), 4000);
    } catch (err) {
      alert('Failed to update clinic settings');
    } finally {
      setSavingClinic(false);
    }
  };

  const handleSaveDoctorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDoctor(true);
    setDoctorSuccess(false);

    try {
      await authApi.updateDoctorProfile({
        fullName: docFullName.trim(),
        qualifications: docQualifications.trim() || undefined,
        medicalCouncilRegistrationNumber: docRegNumber.trim() || undefined,
        speciality: docSpeciality.trim() || undefined,
        consultationFee: docConsultationFee === '' ? undefined : Number(docConsultationFee),
      });

      updateUserClinicInfo({
        doctorName: docFullName.trim(),
        qualifications: docQualifications.trim() || undefined,
        regNumber: docRegNumber.trim() || undefined,
        speciality: docSpeciality.trim() || undefined,
      });

      setDoctorSuccess(true);
      setTimeout(() => setDoctorSuccess(false), 4000);
    } catch (err) {
      alert('Failed to update doctor profile');
    } finally {
      setSavingDoctor(false);
    }
  };

  const handleToggleStaffActive = async (staff: StaffMember) => {
    try {
      await authApi.toggleStaffActive({
        userId: staff.id,
        isActive: !staff.isActive,
      });
      loadStaffList();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update staff status');
    }
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvitingStaff(true);
    setStaffError(null);

    try {
      await authApi.inviteStaff({
        fullName: staffName.trim(),
        email: staffEmail.trim(),
        phone: staffPhone.trim() || undefined,
        password: staffPassword,
        role: staffRole,
        qualifications: staffRole === 'Doctor' ? staffQualifications.trim() || undefined : undefined,
        regNumber: staffRole === 'Doctor' ? staffRegNumber.trim() || undefined : undefined,
        specialization: staffRole === 'Doctor' ? staffSpeciality.trim() || undefined : undefined,
        consultationFee: staffRole === 'Doctor' && staffFee !== '' ? Number(staffFee) : undefined,
      });

      setStaffSuccess(true);
      setIsInviteModalOpen(false);
      setStaffName('');
      setStaffEmail('');
      setStaffPhone('');
      setStaffPassword('');
      setStaffQualifications('');
      setStaffRegNumber('');
      setStaffSpeciality('');
      setStaffFee('');
      loadStaffList();
      setTimeout(() => setStaffSuccess(false), 4000);
    } catch (err: any) {
      setStaffError(err.response?.data?.message || 'Failed to invite staff member');
    } finally {
      setInvitingStaff(false);
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

  const isClinicAdmin = hasRole('ClinicAdmin');
  const isDoctor = hasRole('Doctor');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinic & Practice Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure clinic branding, doctor credentials, team staff accounts, and custom medicines.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('clinic')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'clinic'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Clinic & Print Margins</span>
        </button>

        {isDoctor && (
          <button
            onClick={() => setActiveTab('doctor')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'doctor'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Profile & Credentials</span>
          </button>
        )}

        {isClinicAdmin && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'staff'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Management</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('medicines')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'medicines'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Clinic Medicines ({customMedicines.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vitals')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'vitals'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Vitals Setup</span>
        </button>
      </div>

      {/* Tab 1: Clinic & Print Margins */}
      {activeTab === 'clinic' && (
        <form onSubmit={handleSaveClinicSettings} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Clinic Information & Print Portal Setup</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Set trade name, contact information, timings, and dual-mode print alignment options.
              </p>
            </div>
            {clinicSuccess && (
              <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved Successfully!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinic Name *</label>
              <input
                type="text"
                required
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinic Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinic Timings</label>
              <input
                type="text"
                placeholder="e.g. Mon-Sat: 10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM"
                value={clinicTimings}
                onChange={(e) => setClinicTimings(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinic Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Dual-Mode Print Settings */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Letterhead Print Portal Engine</h3>
            <p className="text-xs text-slate-500">
              Configure how prescriptions print on blank A4 paper versus physical pre-printed doctor letterhead pads.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pad Top Margin (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  value={letterheadMarginTopMm}
                  onChange={(e) => setLetterheadMarginTopMm(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Top spacing before content starts on pre-printed pads.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pad Bottom Margin (mm)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={printBottomMarginMm}
                  onChange={(e) => setPrintBottomMarginMm(parseInt(e.target.value) || 0)}
                  className="w-full text-xs font-mono font-bold px-3.5 py-2 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Bottom spacing to avoid pre-printed pad footers.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Print Mode
                </label>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="hideLetterheadToggle"
                    checked={hideLetterheadOnPrint}
                    onChange={(e) => setHideLetterheadOnPrint(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                  />
                  <label htmlFor="hideLetterheadToggle" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Hide digital letterhead on print (use pre-printed pad by default)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingClinic}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingClinic ? 'Saving...' : 'Save Clinic Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Doctor Profile & Credentials */}
      {activeTab === 'doctor' && isDoctor && (
        <form onSubmit={handleSaveDoctorProfile} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Doctor Profile & Medical Credentials</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                These credentials print on prescriptions and digital letterheads for your OPD consultations.
              </p>
            </div>
            {doctorSuccess && (
              <span className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Doctor Profile Updated!</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name (with Dr. prefix) *</label>
              <input
                type="text"
                required
                value={docFullName}
                onChange={(e) => setDocFullName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Medical Council Registration No. (NMC / State)
              </label>
              <input
                type="text"
                placeholder="e.g. MCI-2018-98765 or DMC/R/12345"
                value={docRegNumber}
                onChange={(e) => setDocRegNumber(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Qualifications</label>
              <input
                type="text"
                placeholder="e.g. MBBS, MD (General Medicine)"
                value={docQualifications}
                onChange={(e) => setDocQualifications(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Speciality</label>
              <input
                type="text"
                placeholder="e.g. Consultant Physician, Pediatrician"
                value={docSpeciality}
                onChange={(e) => setDocSpeciality(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Consultation Fee (INR ₹)</label>
              <input
                type="number"
                min="0"
                step="50"
                placeholder="e.g. 500"
                value={docConsultationFee}
                onChange={(e) => setDocConsultationFee(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingDoctor}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingDoctor ? 'Saving...' : 'Update Doctor Credentials'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Staff Management */}
      {activeTab === 'staff' && isClinicAdmin && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Clinic Staff Members</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage doctors, nurses, and receptionists for your clinic. Deactivated staff cannot sign in.
                </p>
              </div>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Invite Staff Member</span>
              </button>
            </div>

            {staffSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Staff member invited successfully!</span>
              </div>
            )}

            {loadingStaff ? (
              <div className="text-center py-10 text-xs text-slate-500">Loading staff accounts...</div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">No staff members found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Credentials</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{member.fullName}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono">{member.email}</td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map((r) => (
                              <span
                                key={r}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  r === 'Doctor'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : r === 'ClinicAdmin'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : r === 'Nurse'
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {member.qualifications || member.speciality ? (
                            <span>
                              {member.qualifications} {member.speciality ? `(${member.speciality})` : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {member.isActive ? (
                            <span className="inline-flex items-center text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                              Deactivated
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleToggleStaffActive(member)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              member.isActive
                                ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                            }`}
                          >
                            <span>{member.isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Invite Staff Modal */}
          {isInviteModalOpen && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base">Invite Staff Member</h3>
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    ✕
                  </button>
                </div>

                {staffError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                    {staffError}
                  </div>
                )}

                <form onSubmit={handleInviteStaff} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Sharma or Priya Singh"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email (Login) *</label>
                      <input
                        type="email"
                        required
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Password *</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Role *</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 bg-white"
                      >
                        <option value="Receptionist">Receptionist</option>
                        <option value="Nurse">Nurse</option>
                        <option value="Doctor">Doctor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                      <input
                        type="text"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {staffRole === 'Doctor' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                        Doctor Credentials
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">Council Reg No.</label>
                          <input
                            type="text"
                            placeholder="e.g. MCI-2019-1234"
                            value={staffRegNumber}
                            onChange={(e) => setStaffRegNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">Qualifications</label>
                          <input
                            type="text"
                            placeholder="e.g. MBBS, DNB"
                            value={staffQualifications}
                            onChange={(e) => setStaffQualifications(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">Speciality</label>
                          <input
                            type="text"
                            placeholder="e.g. General Medicine"
                            value={staffSpeciality}
                            onChange={(e) => setStaffSpeciality(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-slate-600 mb-1">Fee (₹)</label>
                          <input
                            type="number"
                            placeholder="500"
                            value={staffFee}
                            onChange={(e) => setStaffFee(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsInviteModalOpen(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={invitingStaff}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                    >
                      {invitingStaff ? 'Inviting...' : 'Invite Staff'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Clinic Custom Medicines */}
      {activeTab === 'medicines' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Custom Clinic Formulary</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pre-seeded with 400+ Indian generic medicines. Add clinic-specific brands or special formulations here.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingMedicine(null);
                  setIsAddMedModalOpen(true);
                }}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Custom Medicine</span>
              </button>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter custom medicines by brand or salt..."
                  value={medSearchQuery}
                  onChange={(e) => setMedSearchQuery(e.target.value)}
                  className="bg-transparent text-xs outline-none flex-1"
                />
              </div>

              <select
                value={medFormFilter}
                onChange={(e) => setMedFormFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs px-3 py-2 rounded-xl outline-none font-semibold text-slate-700"
              >
                <option value="All">All Forms</option>
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Ointment">Ointment</option>
                <option value="Drops">Drops</option>
                <option value="Inhaler">Inhaler</option>
              </select>
            </div>

            {medSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                {medSuccessMsg}
              </div>
            )}

            {/* Medicine table */}
            {loadingMedicines ? (
              <div className="text-center py-10 text-xs text-slate-500">Loading custom formulary...</div>
            ) : filteredMedicines.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                {customMedicines.length === 0
                  ? 'No custom medicines added yet. The pre-seeded Indian Formulary is available in consultation.'
                  : 'No custom medicines match your filter.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
                      <th className="py-2.5 px-3">Brand Name</th>
                      <th className="py-2.5 px-3">Salt Composition</th>
                      <th className="py-2.5 px-3">Form</th>
                      <th className="py-2.5 px-3">Strength</th>
                      <th className="py-2.5 px-3">Manufacturer</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMedicines.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-900">{m.brandName}</td>
                        <td className="py-3 px-3 text-slate-600">{m.saltComposition}</td>
                        <td className="py-3 px-3">
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200/60">
                            {m.form}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">{m.strength}</td>
                        <td className="py-3 px-3 text-slate-500">{m.manufacturer || '—'}</td>
                        <td className="py-3 px-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingMedicine(m);
                              setIsAddMedModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMedicine(m.id, m.brandName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add / Edit Custom Medicine Modal */}
          {isAddMedModalOpen && (
            <AddCustomMedicineModal
              isOpen={isAddMedModalOpen}
              medicineToEdit={editingMedicine}
              onClose={() => {
                setIsAddMedModalOpen(false);
                setEditingMedicine(null);
              }}
              onMedicineAdded={() => {
                setIsAddMedModalOpen(false);
                setEditingMedicine(null);
                loadCustomMedicines();
                setMedSuccessMsg('Formulary updated successfully.');
                setTimeout(() => setMedSuccessMsg(null), 3500);
              }}
              onMedicineUpdated={() => {
                setIsAddMedModalOpen(false);
                setEditingMedicine(null);
                loadCustomMedicines();
                setMedSuccessMsg('Formulary updated successfully.');
                setTimeout(() => setMedSuccessMsg(null), 3500);
              }}
            />
          )}
        </div>
      )}

      {/* Tab 5: Dynamic Vitals Setup */}
      {activeTab === 'vitals' && (
        <div className="pt-2">
          <VitalsSettingsPage />
        </div>
      )}
    </div>
  );
};
