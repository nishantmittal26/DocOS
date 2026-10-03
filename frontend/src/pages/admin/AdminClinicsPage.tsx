import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/client';
import { AdminClinicItem, SubscriptionStatus } from '../../types';
import { formatDateIST } from '../../utils/dateTime';
import {
  Building2,
  Users,
  Search,
  Plus,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Sliders,
  Filter
} from 'lucide-react';

export const AdminClinicsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [clinics, setClinics] = useState<AdminClinicItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const isPlatformAdmin = hasRole('PlatformAdmin');
  const isSalesAgent = hasRole('SalesAgent');

  const fetchClinics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getClinics();
      setClinics(data);
    } catch (err: any) {
      console.error('Failed to load clinics', err);
      setError(err.response?.data?.message || 'Failed to fetch clinics directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const filteredClinics = clinics.filter((c) => {
    // Status filter
    if (statusFilter !== 'All' && c.status !== statusFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = c.clinicName.toLowerCase().includes(q);
      const matchDoc = (c.primaryDoctorName || '').toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchSales = (c.salesNotes || '').toLowerCase().includes(q);
      return matchName || matchDoc || matchPhone || matchSales;
    }
    return true;
  });

  // Calculate statistics
  const totalClinics = clinics.length;
  const activeCount = clinics.filter((c) => c.status === 'Active').length;
  const trialCount = clinics.filter((c) => c.status === 'Trial').length;
  const warningCount = clinics.filter(
    (c) => c.status === 'GracePeriod' || c.status === 'QuotaExceeded'
  ).length;
  const suspendedCount = clinics.filter((c) => c.status === 'Suspended').length;

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Active
          </span>
        );
      case 'Trial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Sparkles className="w-3 h-3 text-blue-600" />
            Trial
          </span>
        );
      case 'GracePeriod':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Grace Period
          </span>
        );
      case 'QuotaExceeded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Quota Exceeded
          </span>
        );
      case 'Suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-600" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Clinics Directory</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {isPlatformAdmin ? 'Platform Admin Scope' : 'Sales Agent Scope'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {isPlatformAdmin
                  ? 'All onboarded clinics, subscriptions, visit quotas, and SaaS payment management.'
                  : 'Clinics onboarded by you. Track onboarding, doctor credentials, and plan statuses.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchClinics}
            title="Refresh List"
            className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/admin/onboard-doctor')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard New Clinic</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Clinics</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalClinics}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700">Active Subscriptions</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700">Free Trials</p>
            <p className="text-2xl font-black text-blue-900 mt-1">{trialCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-700">Quota Exceeded / Grace</p>
            <p className="text-2xl font-black text-rose-900 mt-1">{warningCount + suspendedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by clinic name, doctor name, phone, or sales notes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {['All', 'Active', 'Trial', 'GracePeriod', 'QuotaExceeded', 'Suspended'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {status === 'GracePeriod' ? 'Grace Period' : status === 'QuotaExceeded' ? 'Quota Exceeded' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading clinics directory...
        </div>
      ) : filteredClinics.length === 0 ? (
        /* Empty state */
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Clinics Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== 'All'
                ? 'No clinics match your current search or filter criteria. Try clearing filters.'
                : isSalesAgent
                ? 'You have not onboarded any clinics yet. Click "Onboard New Clinic" to register your first clinic!'
                : 'No clinics found on the DocOS platform.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/onboard-doctor')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard First Clinic</span>
          </button>
        </div>
      ) : (
        /* Clinics Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClinics.map((clinic) => {
            const usagePercent =
              clinic.isUnlimited || !clinic.totalAllowedVisits || clinic.totalAllowedVisits === 0
                ? 0
                : Math.min(100, Math.round((clinic.visitsConducted / clinic.totalAllowedVisits) * 100));

            const isOverQuota =
              !clinic.isUnlimited &&
              clinic.totalAllowedVisits !== undefined &&
              clinic.visitsConducted > clinic.totalAllowedVisits;

            return (
              <div
                key={clinic.clinicId}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-snug line-clamp-1">
                        {clinic.clinicName}
                      </h3>
                      {isPlatformAdmin && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate" title={clinic.clinicId}>
                          {clinic.clinicId}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>
                          {clinic.primaryDoctorName
                            ? `Dr. ${clinic.primaryDoctorName}`
                            : `${clinic.doctorCount} Doctor(s)`}
                        </span>
                        {clinic.doctorCount > 1 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.2 rounded">
                            +{clinic.doctorCount - 1} more
                          </span>
                        )}
                      </p>
                    </div>
                    <div>{getStatusBadge(clinic.status)}</div>
                  </div>

                  {/* Plan & Tier badge */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {clinic.planName || 'Starter Plan'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Tier: {clinic.planTier || 'Starter'}
                    </span>
                  </div>
                </div>

                {/* Card Body: Usage Meter & Period */}
                <div className="p-5 space-y-4 bg-slate-50/40 flex-1">
                  {/* Visit Usage */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Period Visit Usage:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {clinic.isUnlimited ? (
                          <span className="text-emerald-700">
                            {clinic.visitsConducted} (Unlimited Quota)
                          </span>
                        ) : (
                          <span className={isOverQuota ? 'text-rose-600' : 'text-slate-900'}>
                            {clinic.visitsConducted} / {clinic.totalAllowedVisits} visits
                          </span>
                        )}
                      </span>
                    </div>

                    {!clinic.isUnlimited && (
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isOverQuota
                              ? 'bg-rose-600'
                              : usagePercent > 80
                              ? 'bg-amber-500'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    )}

                    {isOverQuota && (
                      <p className="text-[11px] text-rose-600 font-medium">
                        ⚠️ Buffer active (+{clinic.visitsConducted - (clinic.totalAllowedVisits || 0)} over quota)
                      </p>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{clinic.phone}</span>
                    </div>
                    {clinic.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{clinic.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Billing Period & Onboarded By */}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Period:</span>
                      <span className="font-medium text-slate-700">
                        {formatDateIST(clinic.currentPeriodStart, {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        -{' '}
                        {formatDateIST(clinic.currentPeriodEnd, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {clinic.onboardedByName && (
                      <div className="flex items-center justify-between">
                        <span>Onboarded by:</span>
                        <span className="font-medium text-slate-700">{clinic.onboardedByName}</span>
                      </div>
                    )}

                    {clinic.salesNotes && (
                      <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-1">
                        "{clinic.salesNotes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
                  {isPlatformAdmin ? (
                    <button
                      onClick={() => navigate(`/admin/clinics/${clinic.clinicId}/subscription`)}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                    >
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Manage Quota & Billing</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">Managed by Platform</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        ID: {clinic.clinicId.slice(0, 8)}...
                      </span>
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
