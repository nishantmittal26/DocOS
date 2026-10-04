import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi, getApiErrorMessage } from '../../api/client';
import {
  ClinicSubscriptionDetail,
  UpdateClinicSubscriptionRequest,
  LabModuleSetting,
  SubscriptionStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../types';
import {
  Building2,
  ArrowLeft,
  CreditCard,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  XCircle,
  Save,
  Receipt,
  Zap,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Hash,
  FlaskConical,
} from 'lucide-react';
import { formatDateIST, formatDateTimeIST, getIstDateInputValue } from '../../utils/dateTime';

function labSettingFromOverride(override: boolean | null | undefined): LabModuleSetting {
  if (override === true) return 'enabled';
  if (override === false) return 'disabled';
  return 'inherit';
}

function labOverrideFromSetting(setting: LabModuleSetting): boolean | null {
  switch (setting) {
    case 'inherit':
      return null;
    case 'enabled':
      return true;
    case 'disabled':
      return false;
    default: {
      const unreachable: never = setting;
      return unreachable;
    }
  }
}

export const ClinicSubscriptionPage: React.FC = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ClinicSubscriptionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit form state
  const [isUnlimited, setIsUnlimited] = useState<boolean>(false);
  const [monthlyQuota, setMonthlyQuota] = useState<number | ''>(500);
  const [maxDoctorsOverride, setMaxDoctorsOverride] = useState<number | ''>('');
  const [status, setStatus] = useState<SubscriptionStatus>('Active');
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');
  const [labModuleSetting, setLabModuleSetting] = useState<LabModuleSetting>('inherit');

  // Top-up custom state
  const [customTopUp, setCustomTopUp] = useState<number>(100);
  const [topUpLoading, setTopUpLoading] = useState<boolean>(false);

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(1499);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => getIstDateInputValue());
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Success');
  const [paymentSubmitting, setPaymentSubmitting] = useState<boolean>(false);

  const fetchSubscription = async () => {
    if (!clinicId) {
      setLoading(false);
      setDetail(null);
      setError('Invalid clinic link — missing clinic ID in the URL.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getClinicSubscription(clinicId);
      setDetail(data);
      // Initialize form fields
      setIsUnlimited(data.isUnlimitedVisits);
      setMonthlyQuota(data.monthlyVisitQuota ?? 500);
      setMaxDoctorsOverride(data.maxDoctorsOverride ?? '');
      setStatus(data.status);
      setGracePeriodDays(data.gracePeriodDays);
      setNotes(data.notes || '');
      setLabModuleSetting(labSettingFromOverride(data.labModuleOverride));
      setPaymentAmount(data.priceINR || 1499);
      // Auto-generate invoice suggestion
      const year = new Date().getFullYear();
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setInvoiceNumber(`INV-${year}-${randNum}`);
    } catch (err: unknown) {
      console.error('Failed to load subscription details', err);
      setError(getApiErrorMessage(err, 'Failed to load clinic subscription'));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [clinicId]);

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload: UpdateClinicSubscriptionRequest = {
        isUnlimitedVisits: isUnlimited,
        monthlyVisitQuota: isUnlimited
          ? undefined
          : typeof monthlyQuota === 'number'
          ? monthlyQuota
          : undefined,
        maxDoctorsOverride:
          typeof maxDoctorsOverride === 'number' && maxDoctorsOverride > 0
            ? maxDoctorsOverride
            : undefined,
        status,
        gracePeriodDays,
        notes: notes.trim() || undefined,
        labModuleOverride: labOverrideFromSetting(labModuleSetting),
      };

      await adminApi.updateClinicSubscription(clinicId, payload);
      setSuccessMessage('Subscription settings updated successfully!');
      fetchSubscription();
    } catch (err: any) {
      console.error('Failed to update subscription', err);
      setError(err.response?.data?.message || 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTopUp = async (amount: number) => {
    if (!clinicId || amount <= 0) return;
    setTopUpLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await adminApi.addTopUpVisits(clinicId, amount);
      setSuccessMessage(`Successfully added +${amount} top-up visits for the current billing period!`);
      fetchSubscription();
    } catch (err: any) {
      console.error('Failed to add top-up visits', err);
      setError(err.response?.data?.message || 'Failed to add top-up visits');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;
    setPaymentSubmitting(true);
    setError(null);
    try {
      await adminApi.recordPayment(clinicId, {
        invoiceNumber: invoiceNumber.trim(),
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference: transactionRef.trim() || undefined,
        paymentDate: new Date(paymentDate).toISOString(),
        status: paymentStatus,
      });

      setIsPaymentModalOpen(false);
      setSuccessMessage(`Payment invoice ${invoiceNumber} recorded successfully!`);
      fetchSubscription();
    } catch (err: any) {
      console.error('Failed to record payment', err);
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Loading subscription details...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Could Not Load Subscription</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {error ??
            'The requested clinic subscription could not be loaded. Confirm you are signed in as Platform Admin and the API is reachable.'}
        </p>
        {clinicId && (
          <p className="text-[10px] font-mono text-slate-400">Clinic ID: {clinicId}</p>
        )}
        <button
          onClick={() => navigate('/admin/clinics')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clinics Directory</span>
        </button>
      </div>
    );
  }

  const usagePercent =
    detail.isUnlimitedVisits || !detail.totalAllowedVisits || detail.totalAllowedVisits === 0
      ? 0
      : Math.min(100, Math.round((detail.visitsConducted / detail.totalAllowedVisits) * 100));

  const isOverQuota =
    !detail.isUnlimitedVisits &&
    detail.totalAllowedVisits !== undefined &&
    detail.visitsConducted > detail.totalAllowedVisits;

  const previewEffectiveLabModule =
    labModuleSetting === 'enabled'
      ? true
      : labModuleSetting === 'disabled'
      ? false
      : detail.planHasLabModule;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button & Breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/admin/clinics')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Clinics Directory</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {detail.clinicName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                {detail.planName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tier: <strong className="text-slate-700">{detail.planTier}</strong> • Billing Cycle:{' '}
              <strong className="text-slate-700">{detail.billingCycle}</strong> • Plan Price:{' '}
              <strong className="text-slate-700">₹{detail.priceINR.toLocaleString('en-IN')}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSubscription}
            title="Refresh"
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:shadow"
          >
            <Receipt className="w-4 h-4" />
            <span>Record SaaS Payment</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Left Column (Usage Meter + Top-up), Right Column (Editor) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Meter & Quick Top-ups */}
        <div className="lg:col-span-1 space-y-6">
          {/* Usage Meter Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Visit Usage Meter</span>
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  detail.status === 'Active'
                    ? 'bg-emerald-100 text-emerald-800'
                    : detail.status === 'Trial'
                    ? 'bg-blue-100 text-blue-800'
                    : detail.status === 'GracePeriod'
                    ? 'bg-amber-100 text-amber-800'
                    : detail.status === 'QuotaExceeded'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {detail.status}
              </span>
            </div>

            {/* Big Counter */}
            <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Prescriptions / Visits Conducted
              </span>
              <div className="text-3xl font-black text-slate-900 font-mono">
                {detail.visitsConducted}
                {!detail.isUnlimitedVisits && (
                  <span className="text-sm text-slate-400 font-normal">
                    {' '}/ {detail.totalAllowedVisits}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {detail.isUnlimitedVisits
                  ? 'Unlimited prescriptions & visits enabled on this subscription.'
                  : `${detail.remainingVisits ?? 0} prescriptions remaining in base + top-up quota.`}
              </p>
            </div>

            {/* Progress bar */}
            {!detail.isUnlimitedVisits && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600 font-semibold">
                  <span>Quota Usage</span>
                  <span>{usagePercent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isOverQuota
                        ? 'bg-rose-600'
                        : usagePercent > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Breakdown Details */}
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Base Monthly Quota:</span>
                <span className="font-mono font-bold text-slate-800">
                  {detail.isUnlimitedVisits ? 'Unlimited' : `${detail.monthlyVisitQuota} visits`}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Additional Top-Up Visits:</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{detail.additionalTopUpVisits} visits
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Effective Doctor Limit:</span>
                <span className="font-mono font-bold text-slate-800">
                  {detail.effectiveMaxDoctors} Doctors
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Current Period Start:</span>
                <span className="font-medium text-slate-800">
                  {formatDateIST(detail.currentPeriodStart)}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Current Period End:</span>
                <span className="font-medium text-slate-800">
                  {formatDateIST(detail.currentPeriodEnd)}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Grace Buffer:</span>
                <span className="font-medium text-amber-700">
                  +20 visits (after quota) & {detail.gracePeriodDays} days grace
                </span>
              </div>
              {detail.lastVisitRecordedAt && (
                <div className="flex justify-between pt-2">
                  <span className="text-slate-500">Last Visit Recorded:</span>
                  <span className="font-medium text-slate-600">
                    {formatDateTimeIST(detail.lastVisitRecordedAt, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Top-Up Visits Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Add Top-Up Visits</h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Top-up visits are applied instantly to the current period only and reset to 0 when the next billing period opens.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[250, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={topUpLoading}
                  onClick={() => handleApplyTopUp(amt)}
                  className="px-3 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 rounded-xl text-xs font-bold transition-all text-slate-700 flex flex-col items-center disabled:opacity-50"
                >
                  <span>+{amt}</span>
                  <span className="text-[10px] font-normal text-slate-400">Visits</span>
                </button>
              ))}
            </div>

            {/* Custom Top Up input */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input
                type="number"
                min="10"
                step="50"
                value={customTopUp}
                onChange={(e) => setCustomTopUp(Number(e.target.value))}
                className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold outline-none"
                placeholder="Custom"
              />
              <button
                type="button"
                disabled={topUpLoading || customTopUp <= 0}
                onClick={() => handleApplyTopUp(customTopUp)}
                className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                {topUpLoading ? 'Applying...' : 'Apply Custom'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Subscription Settings & Payments History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Settings Form */}
          <form
            onSubmit={handleSaveSubscription}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Subscription & Quota Configuration</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update quota limits, doctor seat caps, and lifecycle status.
                </p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unlimited Toggle */}
              <div className="sm:col-span-2 flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Unlimited OPD Visits</span>
                  <span className="text-[11px] text-slate-500">
                    Bypass monthly visit quota enforcement completely.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Monthly Visit Quota (if not unlimited) */}
              {!isUnlimited && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monthly Visit Quota
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={monthlyQuota}
                    onChange={(e) =>
                      setMonthlyQuota(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="e.g. 500"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Soft buffer of +20 visits triggers automatically when quota is exceeded.
                  </p>
                </div>
              )}

              {/* Lab module entitlement */}
              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Diagnostic Lab Module</span>
                </div>
                <select
                  value={labModuleSetting}
                  onChange={(e) => setLabModuleSetting(e.target.value as LabModuleSetting)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  <option value="inherit">
                    Use plan default ({detail.planHasLabModule ? 'On' : 'Off'} — {detail.planName})
                  </option>
                  <option value="enabled">Force enabled (this clinic only)</option>
                  <option value="disabled">Force disabled (this clinic only)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Effective for this clinic after save:{' '}
                  <strong className={previewEffectiveLabModule ? 'text-emerald-700' : 'text-slate-600'}>
                    {previewEffectiveLabModule ? 'Labs enabled' : 'Labs disabled'}
                  </strong>
                  . Plan tier alone does not change until you switch plans; use this override for legacy
                  clinics or promotions.
                </p>
              </div>

              {/* Max Doctors Override */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doctor Seat Limit (Override)
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxDoctorsOverride}
                  onChange={(e) =>
                    setMaxDoctorsOverride(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder={`Plan default (${detail.effectiveMaxDoctors})`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Leave blank to use the plan default limit.
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subscription Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Trial">Trial</option>
                  <option value="GracePeriod">GracePeriod</option>
                  <option value="QuotaExceeded">QuotaExceeded</option>
                  <option value="Suspended">Suspended</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Suspended blocks new tokens while keeping history readable.
                </p>
              </div>

              {/* Grace Period Days */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Grace Period Days
                </label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Default is 5 days of token issuance past current period end.
                </p>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Notes / Sales Remarks
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sales agreements, special quotas, or billing terms..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>
          </form>

          {/* SaaS Payment History Table */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>SaaS Payment Invoices</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform subscription invoices recorded for this clinic.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Invoice</span>
              </button>
            </div>

            {detail.paymentHistory && detail.paymentHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">UTR / Txn Ref</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {detail.paymentHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {p.invoiceNumber}
                        </td>
                        <td className="py-3 px-3">
                          {formatDateIST(p.paymentDate)}
                        </td>
                        <td className="py-3 px-3 font-bold text-emerald-700">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          {p.transactionReference || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'Success'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs">
                No payment invoices recorded yet for this clinic.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Record SaaS Invoice Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="NetBanking">NetBanking</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transaction Reference / UTR
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UTR1234567890 / Bank Ref"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="Success">Success</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {paymentSubmitting ? 'Recording...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
