import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api/client';
import { SubscriptionPlan, OnboardClinicRequest, OnboardClinicResponse } from '../../types';
import {
  derivePatientIdPrefixFromClinicName,
  sanitizePatientIdPrefixInput,
} from '../../utils/patientIdPrefix';
import { OnboardWizardTimeline, OnboardWizardStep } from '../../components/OnboardWizardTimeline';
import {
  Building2,
  Stethoscope,
  CreditCard,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  Printer,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  Eye,
  EyeOff
} from 'lucide-react';

const ONBOARD_WIZARD_STEPS: OnboardWizardStep[] = [
  { num: 1, label: 'Clinic & Doctor', shortLabel: 'Clinic', icon: Building2 },
  { num: 2, label: 'Plan & Quota', shortLabel: 'Plan', icon: CreditCard },
  { num: 3, label: 'Letterhead Margins', shortLabel: 'Print', icon: FileText },
  { num: 4, label: 'Handover & QR', shortLabel: 'Done', icon: ShieldCheck },
];

export const OnboardDoctorPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [patientIdPrefixTouched, setPatientIdPrefixTouched] = useState(false);

  // Form State
  const [formData, setFormData] = useState<OnboardClinicRequest>({
    clinicName: '',
    phone: '',
    email: '',
    address: '',
    doctorName: '',
    regNumber: '',
    qualifications: '',
    specialization: '',
    consultationFee: 500,
    clinicTimings: 'Mon - Sat: 10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM',
    doctorPassword: '',
    planId: '',
    isTrial: false,
    monthlyVisitQuotaOverride: undefined,
    isUnlimitedOverride: false,
    letterheadMarginTopMm: 60,
    printBottomMarginMm: 15,
    hideLetterheadOnPrint: false,
    salesNotes: '',
    patientIdPrefix: '',
  });

  // Handover state
  const [handoverResult, setHandoverResult] = useState<OnboardClinicResponse | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const data = await adminApi.getPlans();
        setPlans(data);
        if (data.length > 0 && !formData.planId) {
          setFormData((prev) => ({ ...prev, planId: data[0].id }));
        }
      } catch (err: any) {
        console.error('Failed to load subscription plans:', err);
        setError('Failed to load subscription plans. Please refresh.');
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const validateStep1 = () => {
    if (!formData.clinicName.trim()) return 'Clinic name is required';
    if (!formData.phone.trim() || formData.phone.length < 10) return 'Valid 10-digit mobile number is required';
    if (!formData.doctorName.trim()) return 'Doctor full name is required';
    if (!formData.email.trim() || !formData.email.includes('@')) return 'Valid doctor email is required for login';
    return null;
  };

  const validateStep2 = () => {
    if (!formData.planId) return 'Please select a subscription plan';
    return null;
  };

  const isStepDataReady = (stepNum: number): boolean => {
    switch (stepNum) {
      case 1:
        return validateStep1() === null;
      case 2:
        return validateStep2() === null;
      case 3:
        return currentStep >= 3 || handoverResult !== null;
      case 4:
        return handoverResult !== null;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    setError(null);
    if (currentStep === 1) {
      const err = validateStep1();
      if (err) {
        setError(err);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const err = validateStep2();
      if (err) {
        setError(err);
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      setError(null);
      setSubmitting(true);
      const response = await adminApi.onboardClinic({
        ...formData,
        patientIdPrefix: formData.patientIdPrefix?.trim() || undefined,
      });
      setHandoverResult(response);
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to complete clinic onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === formData.planId);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              DocOS Onboarding Wizard
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Onboard Doctor & Clinic
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Setup a new medical practice, attach their subscription plan, and generate handover credentials.
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/clinics')}
            className="px-4 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-medium transition"
          >
            Cancel / Back to List
          </button>
        </div>

        {/* Wizard timeline */}
        <div className="mb-8 bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm">
          <OnboardWizardTimeline
            steps={ONBOARD_WIZARD_STEPS}
            currentStep={currentStep}
            isStepDataReady={isStepDataReady}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}

        {/* STEP 1: CLINIC & PRIMARY DOCTOR */}
        {currentStep === 1 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                Step 1: Clinic Trade & Doctor Profile
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter the clinic's trade name and primary doctor's medical council credentials.
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Clinic Trade Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Super Clinic or Sharma Polyclinic"
                    value={formData.clinicName}
                    onChange={(e) => {
                      const clinicName = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        clinicName,
                        patientIdPrefix: patientIdPrefixTouched
                          ? prev.patientIdPrefix
                          : derivePatientIdPrefixFromClinicName(clinicName),
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Patient ID prefix
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CITY"
                    maxLength={20}
                    value={formData.patientIdPrefix || ''}
                    onChange={(e) => {
                      setPatientIdPrefixTouched(true);
                      setFormData((prev) => ({
                        ...prev,
                        patientIdPrefix: sanitizePatientIdPrefixInput(e.target.value),
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    New patients get IDs like{' '}
                    <span className="font-mono font-semibold text-slate-700">
                      {(formData.patientIdPrefix || derivePatientIdPrefixFromClinicName(formData.clinicName)) || 'DOC'}
                      -2026-0001
                    </span>
                    . Default: first 4 letters of clinic name.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Clinic Phone / Reception Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit Indian Mobile Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Clinic Physical Address
                </label>
                <input
                  type="text"
                  placeholder="Street, Landmark, City, State, PIN"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  Primary Doctor Credentials
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Doctor Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={formData.doctorName}
                      onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Doctor Login Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="doctor@clinic.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Medical Council Registration No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MCI-2015-84920"
                      value={formData.regNumber || ''}
                      onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Qualifications / Degrees
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MBBS, MD (General Medicine)"
                      value={formData.qualifications || ''}
                      onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Speciality / Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Consultant Physician"
                      value={formData.specialization || ''}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Default Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      placeholder="500"
                      value={formData.consultationFee || 0}
                      onChange={(e) => setFormData({ ...formData, consultationFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Clinic Consultation Timings
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mon-Sat: 10:00 AM - 02:00 PM, 05:00 PM - 09:00 PM"
                      value={formData.clinicTimings || ''}
                      onChange={(e) => setFormData({ ...formData, clinicTimings: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Custom Password (leave blank to auto-generate default: <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">DocOS@2026</code>)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Leave blank for DocOS@2026"
                        value={formData.doctorPassword || ''}
                        onChange={(e) => setFormData({ ...formData, doctorPassword: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Internal Sales Notes / Referral Source
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Met doctor at IMA conference, keen on switching from paper pad..."
                  value={formData.salesNotes || ''}
                  onChange={(e) => setFormData({ ...formData, salesNotes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 transition"
              >
                Proceed to Plan & Quota
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PLAN & QUOTA */}
        {currentStep === 2 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Step 2: Choose Subscription Plan & Visit Quota
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select the billing tier. Quota applies per subscription period with an automatic 20-visit grace buffer.
              </p>
            </div>

            {loadingPlans ? (
              <div className="py-12 text-center text-slate-400">Loading available plans...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => {
                    const isSelected = formData.planId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setFormData({ ...formData, planId: p.id })}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-3 right-3 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {p.tier} Tier
                          </span>
                          <h3 className="font-bold text-slate-900 text-base mt-2">{p.planName}</h3>
                          <div className="mt-2 text-2xl font-black text-slate-900">
                            ₹{p.priceINR.toLocaleString('en-IN')}
                            <span className="text-xs font-normal text-slate-500">/{p.billingCycle.toLowerCase()}</span>
                          </div>

                          <ul className="mt-4 space-y-2 text-xs text-slate-600">
                            <li className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <strong>{p.isUnlimitedVisits ? 'Unlimited' : `${p.defaultMonthlyVisits} Visits`}</strong> / month
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Up to <strong>{p.maxDoctors} Doctor{p.maxDoctors > 1 ? 's' : ''}</strong>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Up to <strong>{p.maxStaff} Staff accounts</strong>
                            </li>
                            {p.hasCustomVitals && (
                              <li className="flex items-center gap-2 text-emerald-700 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Custom Vitals & Formulas
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="mt-6 pt-3 border-t border-slate-200/60 text-[11px] text-slate-500">
                          Includes 20-visit soft buffer past quota
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Plan options override */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Trial & Custom Quota Overrides (Optional)
                  </h4>

                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.isTrial}
                        onChange={(e) => setFormData({ ...formData, isTrial: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      Start as 14-Day Free Trial
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.isUnlimitedOverride}
                        onChange={(e) => setFormData({ ...formData, isUnlimitedOverride: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      Override to Unlimited Visits
                    </label>
                  </div>

                  {!formData.isUnlimitedOverride && (
                    <div className="max-w-xs">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Custom Monthly Visit Quota (leave blank for plan default)
                      </label>
                      <input
                        type="number"
                        placeholder={`Plan default: ${selectedPlan?.defaultMonthlyVisits || 300}`}
                        value={formData.monthlyVisitQuotaOverride ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            monthlyVisitQuotaOverride: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Details
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 transition"
              >
                Proceed to Letterhead Setup
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LETTERHEAD PREVIEW */}
        {currentStep === 3 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Step 3: Letterhead & Print Margins Configuration
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure prescription print stationery: digital letterhead on blank A4 paper vs. pre-printed doctor pad.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Controls */}
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Print Stationery Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, hideLetterheadOnPrint: false, letterheadMarginTopMm: 60 })}
                      className={`p-3 rounded-xl border text-left transition ${
                        !formData.hideLetterheadOnPrint
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-sm font-bold">Blank A4 Paper</div>
                      <div className="text-xs text-slate-500 mt-1">Draw digital clinic banner & doctor credentials</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, hideLetterheadOnPrint: true, letterheadMarginTopMm: 50 })}
                      className={`p-3 rounded-xl border text-left transition ${
                        formData.hideLetterheadOnPrint
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-sm font-bold">Pre-Printed Pad</div>
                      <div className="text-xs text-slate-500 mt-1">Leave header blank to align with doctor stationery</div>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Top Margin Offset (mm)
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {formData.letterheadMarginTopMm} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={formData.letterheadMarginTopMm}
                    onChange={(e) => setFormData({ ...formData, letterheadMarginTopMm: parseInt(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0 mm</span>
                    <span>60 mm (Standard)</span>
                    <span>120 mm</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Bottom Margin Offset (mm)
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {formData.printBottomMarginMm} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={formData.printBottomMarginMm}
                    onChange={(e) => setFormData({ ...formData, printBottomMarginMm: parseInt(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>0 mm</span>
                    <span>15 mm (Standard)</span>
                    <span>60 mm</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-600 space-y-1">
                  <div className="font-semibold text-slate-800">Stationery Alignment Guarantee:</div>
                  <p>
                    These margins can be re-calibrated at any time in the doctor's Settings portal.
                  </p>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="border border-slate-300 rounded-xl bg-slate-100 p-4 shadow-inner flex flex-col items-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Prescription Paper Layout Preview
                </span>
                <div
                  className="w-full max-w-[280px] bg-white border border-slate-300 rounded-lg shadow-sm p-4 relative text-left"
                  style={{ minHeight: '380px' }}
                >
                  {/* Top Margin Space Indicator */}
                  <div
                    style={{ height: `${Math.min(formData.letterheadMarginTopMm * 0.8, 100)}px` }}
                    className={`border-b-2 border-dashed flex flex-col items-center justify-center p-1 transition-all ${
                      formData.hideLetterheadOnPrint
                        ? 'border-amber-300 bg-amber-50/70 text-amber-800'
                        : 'border-emerald-300 bg-emerald-50/50 text-emerald-900'
                    }`}
                  >
                    {formData.hideLetterheadOnPrint ? (
                      <div className="text-[10px] text-center font-medium">
                        [Blank Header Offset: {formData.letterheadMarginTopMm}mm]
                        <div className="text-[9px] text-amber-600">Pre-printed letterhead pad area</div>
                      </div>
                    ) : (
                      <div className="text-center w-full">
                        <div className="text-[11px] font-bold text-slate-900 truncate">
                          {formData.clinicName || 'Clinic Name'}
                        </div>
                        <div className="text-[9px] text-emerald-800 font-semibold truncate">
                          {formData.doctorName || 'Dr. Doctor Name'}
                        </div>
                        <div className="text-[8px] text-slate-500 truncate">
                          {formData.qualifications || 'MBBS, MD'} | Reg: {formData.regNumber || 'MCI-1234'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body Content Placeholder */}
                  <div className="pt-3 space-y-2 text-[9px] text-slate-400">
                    <div className="h-2 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-2 bg-slate-100 rounded w-1/2"></div>
                    <div className="my-2 border-t border-slate-100 pt-2 font-mono text-[8px] text-slate-600">
                      Rx:
                      <div className="text-[8px] text-slate-500">Paracetamol 650mg — 1-0-1 (3 days)</div>
                      <div className="text-[8px] text-slate-500">Pantoprazole 40mg — 1-0-0 (5 days)</div>
                    </div>
                  </div>

                  {/* Bottom Margin Indicator */}
                  <div
                    style={{ height: `${Math.min(formData.printBottomMarginMm * 0.8, 50)}px` }}
                    className="absolute bottom-2 left-4 right-4 border-t-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-[9px] text-slate-500"
                  >
                    Footer margin: {formData.printBottomMarginMm}mm
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Plan
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-2 transition disabled:opacity-50"
              >
                {submitting ? 'Creating Clinic & Account...' : 'Complete Onboarding & Handover'}
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: HANDOVER & QR */}
        {currentStep === 4 && handoverResult && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
            <div className="text-center pb-6 border-b border-slate-100">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                Clinic Onboarded Successfully!
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Handover these credentials and portal access link to the doctor.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Credentials Slip */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  Doctor Login Credentials
                  <button
                    onClick={() => {
                      const text = `DocOS Clinic Login:\nPortal: ${window.location.origin}${handoverResult.loginUrl}\nEmail: ${handoverResult.doctorEmail}\nPassword: ${handoverResult.initialPassword}\nClinic: ${handoverResult.clinicName}`;
                      handleCopy(text, 'all');
                    }}
                    className="text-emerald-700 hover:text-emerald-800 text-xs font-semibold flex items-center gap-1"
                  >
                    {copiedField === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy All
                  </button>
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-500 text-xs">Clinic Name</span>
                    <span className="font-semibold text-slate-900">{handoverResult.clinicName}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-500 text-xs">Patient ID prefix</span>
                    <span className="font-mono font-bold text-slate-900">{handoverResult.patientIdPrefix}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-500 text-xs">Doctor Name</span>
                    <span className="font-semibold text-slate-900">{handoverResult.doctorName}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-500 text-xs">Login Email</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-900 font-semibold">{handoverResult.doctorEmail}</span>
                      <button
                        onClick={() => handleCopy(handoverResult.doctorEmail, 'email')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-500 text-xs">Initial Password</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                        {handoverResult.initialPassword}
                      </span>
                      <button
                        onClick={() => handleCopy(handoverResult.initialPassword, 'pass')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {copiedField === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-500 text-xs">Subscription Plan</span>
                    <span className="font-medium text-slate-900">{handoverResult.planName} ({handoverResult.subscriptionStatus})</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500 text-xs">Monthly Visit Allowance</span>
                    <span className="font-medium text-slate-900">
                      {handoverResult.isUnlimited ? 'Unlimited' : `${handoverResult.monthlyVisitQuota} visits/month (+20 buffer)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* QR Code Handover Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center space-y-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Scan to Open DocOS Portal
                </span>

                {/* QR Code generator */}
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `${window.location.origin}${handoverResult.loginUrl}`
                    )}`}
                    alt="DocOS Login QR Code"
                    className="w-44 h-44 object-contain rounded-lg"
                  />
                </div>

                <div className="text-xs text-slate-500">
                  Doctor or clinic assistant can scan this with any phone camera to instantly open their login screen.
                </div>

                <div className="pt-2 flex gap-3 w-full">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Handover Slip
                  </button>
                  <button
                    onClick={() => navigate('/admin/clinics')}
                    className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    View Clinics Directory
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
