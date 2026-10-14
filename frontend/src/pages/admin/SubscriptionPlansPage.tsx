import React, { useState, useEffect } from 'react';
import { adminApi, getApiErrorMessage } from '../../api/client';
import {
  SubscriptionPlan,
  SubscriptionTier,
  BillingCycle,
  CreateSubscriptionPlanRequest,
  UpdateSubscriptionPlanRequest,
} from '../../types';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  ShieldAlert,
  CreditCard,
  Users,
  FlaskConical,
  Activity,
  Infinity as InfinityIcon,
  Sparkles,
  Info,
} from 'lucide-react';

export const SubscriptionPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [formPlanCode, setFormPlanCode] = useState<string>('');
  const [formPlanName, setFormPlanName] = useState<string>('');
  const [formTier, setFormTier] = useState<SubscriptionTier>('Starter');
  const [formBillingCycle, setFormBillingCycle] = useState<BillingCycle>('Monthly');
  const [formPriceINR, setFormPriceINR] = useState<number>(999);
  const [formIsUnlimited, setFormIsUnlimited] = useState<boolean>(false);
  const [formMonthlyVisits, setFormMonthlyVisits] = useState<number | ''>(500);
  const [formMaxDoctors, setFormMaxDoctors] = useState<number>(1);
  const [formMaxStaff, setFormMaxStaff] = useState<number>(5);
  const [formHasCustomVitals, setFormHasCustomVitals] = useState<boolean>(false);
  const [formHasLabModule, setFormHasLabModule] = useState<boolean>(false);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAdminPlans();
      setPlans(data);
    } catch (err: unknown) {
      console.error('Failed to load subscription catalog plans', err);
      setError(getApiErrorMessage(err, 'Failed to load subscription catalog plans'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormPlanCode('');
    setFormPlanName('');
    setFormTier('Starter');
    setFormBillingCycle('Monthly');
    setFormPriceINR(999);
    setFormIsUnlimited(false);
    setFormMonthlyVisits(500);
    setFormMaxDoctors(1);
    setFormMaxStaff(5);
    setFormHasCustomVitals(false);
    setFormHasLabModule(false);
    setFormIsActive(true);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormPlanCode(plan.planCode);
    setFormPlanName(plan.planName);
    setFormTier(plan.tier);
    setFormBillingCycle(plan.billingCycle);
    setFormPriceINR(plan.priceINR);
    setFormIsUnlimited(plan.isUnlimitedVisits);
    setFormMonthlyVisits(plan.defaultMonthlyVisits ?? '');
    setFormMaxDoctors(plan.maxDoctors);
    setFormMaxStaff(plan.maxStaff);
    setFormHasCustomVitals(plan.hasCustomVitals);
    setFormHasLabModule(plan.hasLabModule);
    setFormIsActive(plan.isActive);
    setIsCreateModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (editingPlan) {
        const updateReq: UpdateSubscriptionPlanRequest = {
          planName: formPlanName.trim(),
          tier: formTier,
          billingCycle: formBillingCycle,
          priceINR: formPriceINR,
          isUnlimitedVisits: formIsUnlimited,
          defaultMonthlyVisits: formIsUnlimited ? null : (formMonthlyVisits === '' ? null : Number(formMonthlyVisits)),
          maxDoctors: formMaxDoctors,
          maxStaff: formMaxStaff,
          hasCustomVitals: formHasCustomVitals,
          hasLabModule: formHasLabModule,
          isActive: formIsActive,
        };
        await adminApi.updatePlan(editingPlan.id, updateReq);
        setSuccessMessage(`Catalog plan "${formPlanName}" updated successfully.`);
      } else {
        const createReq: CreateSubscriptionPlanRequest = {
          planCode: formPlanCode.trim().toUpperCase(),
          planName: formPlanName.trim(),
          tier: formTier,
          billingCycle: formBillingCycle,
          priceINR: formPriceINR,
          isUnlimitedVisits: formIsUnlimited,
          defaultMonthlyVisits: formIsUnlimited ? null : (formMonthlyVisits === '' ? null : Number(formMonthlyVisits)),
          maxDoctors: formMaxDoctors,
          maxStaff: formMaxStaff,
          hasCustomVitals: formHasCustomVitals,
          hasLabModule: formHasLabModule,
          isActive: formIsActive,
        };
        await adminApi.createPlan(createReq);
        setSuccessMessage(`New catalog plan "${formPlanName}" created successfully.`);
      }

      setIsCreateModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchPlans();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to save catalog plan'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    const matchesSearch =
      p.planCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.planName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tier.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTier = tierFilter === 'all' || p.tier.toLowerCase() === tierFilter.toLowerCase();
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? p.isActive
        : !p.isActive;

    return matchesSearch && matchesTier && matchesStatus;
  });

  const activeCount = plans.filter((p) => p.isActive).length;
  const totalCount = plans.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Plan Catalog</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                B13 Master SKUs
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure master plan definitions. Clinic subscriptions snapshot these values on assignment—updating catalog plans never alters active contracts at runtime.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPlans}
            title="Refresh Catalog"
            className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Info Notice on B13 Contract Snapshot Guarantee */}
      <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-900 leading-relaxed">
          <strong>Catalog vs. Contract Isolation:</strong> When a clinic is onboarded or switched to a plan, DocOS freezes a complete contract snapshot (<code className="bg-indigo-100/80 px-1 py-0.5 rounded text-indigo-800 font-mono text-[11px]">Subscribed*</code> columns). Changing pricing, visit limits, or module access in this catalog will <em>never</em> silently change active clinic entitlements. To migrate a clinic to updated catalog terms, use the <strong>Change Plan</strong> flow on that clinic's subscription page.
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

      {/* Quick Summary Cards & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Total Catalog Plans</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Active Plans (Menu)</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Archived Plans</div>
            <div className="text-xl font-black text-slate-500 mt-0.5">{totalCount - activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-medium">Lab-Enabled SKUs</div>
            <div className="text-xl font-black text-purple-600 mt-0.5">
              {plans.filter((p) => p.hasLabModule && p.isActive).length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <FlaskConical className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search plan code, name, tier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="multidoctor">MultiDoctor</option>
            <option value="enterprise">Enterprise</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Archived / Inactive</option>
          </select>
        </div>
      </div>

      {/* Plans Catalog Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading plan catalog...</div>
      ) : filteredPlans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No plans found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search filters or create a new plan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-6 border-2 transition-all flex flex-col justify-between shadow-sm relative ${
                plan.isActive
                  ? 'border-slate-200 hover:border-indigo-300 hover:shadow-md'
                  : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              {/* Card Top */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {plan.planCode}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-0.5">{plan.planName}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                      plan.isActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {plan.isActive ? 'Active SKU' : 'Archived'}
                  </span>
                </div>

                {/* Price & Billing Cycle */}
                <div className="py-3 border-y border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-slate-900">
                      ₹{plan.priceINR.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/{plan.billingCycle.toLowerCase()}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
                    {plan.tier}
                  </span>
                </div>

                {/* Quota & Capacity */}
                <div className="py-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      Visits Quota:
                    </span>
                    <span className="font-bold">
                      {plan.isUnlimitedVisits ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <InfinityIcon className="w-3.5 h-3.5" /> Unlimited
                        </span>
                      ) : (
                        `${plan.defaultMonthlyVisits ?? '—'} / month`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-4 h-4 text-slate-400" />
                      Max Doctors:
                    </span>
                    <span className="font-bold">{plan.maxDoctors} doctor(s)</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-4 h-4 text-slate-400" />
                      Max Staff:
                    </span>
                    <span className="font-bold">{plan.maxStaff} account(s)</span>
                  </div>
                </div>

                {/* Feature Badges */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      plan.hasLabModule
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-slate-100 text-slate-400 line-through'
                    }`}
                  >
                    <FlaskConical className="w-3 h-3" />
                    Diagnostic Labs
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      plan.hasCustomVitals
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-400 line-through'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    Custom Vitals
                  </span>
                </div>
              </div>

              {/* Card Bottom CTA */}
              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => openEditModal(plan)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit SKU</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingPlan ? `Edit Catalog Plan: ${editingPlan.planCode}` : 'Create New Catalog Plan'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Master plan definition. Used as a menu SKU for future clinic assignments.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {editingPlan && (
              <div className="mt-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Snapshot Note:</strong> Updating this catalog plan will only apply to new subscribers or clinics that switch to this plan. Current clinic contracts retain their frozen snapshot values.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Plan Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPlanCode}
                    onChange={(e) => setFormPlanCode(e.target.value.toUpperCase())}
                    disabled={!!editingPlan}
                    placeholder="e.g. STARTER_ANNUAL"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-500"
                    required
                  />
                  {!editingPlan && (
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Unique SKU code (letters, numbers, underscore)</span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Plan Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPlanName}
                    onChange={(e) => setFormPlanName(e.target.value)}
                    placeholder="e.g. DocOS Starter Annual"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tier</label>
                  <select
                    value={formTier}
                    onChange={(e) => setFormTier(e.target.value as SubscriptionTier)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="Starter">Starter</option>
                    <option value="MultiDoctor">MultiDoctor</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={formBillingCycle}
                    onChange={(e) => setFormBillingCycle(e.target.value as BillingCycle)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Price (INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formPriceINR}
                    onChange={(e) => setFormPriceINR(Number(e.target.value))}
                    min={0}
                    step={1}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold font-mono text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              {/* Visitiation Quota */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={formIsUnlimited}
                    onChange={(e) => setFormIsUnlimited(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Unlimited Monthly Visits</span>
                </label>

                {!formIsUnlimited && (
                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Default Monthly Visits Quota</label>
                    <input
                      type="number"
                      value={formMonthlyVisits}
                      onChange={(e) => setFormMonthlyVisits(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 500"
                      min={1}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold outline-none"
                      required={!formIsUnlimited}
                    />
                  </div>
                )}
              </div>

              {/* Doctor and Staff Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Doctors</label>
                  <input
                    type="number"
                    value={formMaxDoctors}
                    onChange={(e) => setFormMaxDoctors(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Staff</label>
                  <input
                    type="number"
                    value={formMaxStaff}
                    onChange={(e) => setFormMaxStaff(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Feature Modules & Status */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={formHasLabModule}
                    onChange={(e) => setFormHasLabModule(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800">Diagnostic Labs</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={formHasCustomVitals}
                    onChange={(e) => setFormHasCustomVitals(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800">Custom Vitals</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="font-semibold text-slate-800">Active SKU</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
