import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, getApiErrorMessage } from '../../api/client';
import { SalesAgentItem, CreateSalesAgentRequest } from '../../types';
import { formatDateIST } from '../../utils/dateTime';
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
} from 'lucide-react';

type StatusFilter = 'All' | 'Active' | 'Deactivated';

export const AdminSalesAgentsPage: React.FC = () => {
  const navigate = useNavigate();

  const [agents, setAgents] = useState<SalesAgentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  // Create Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateSalesAgentRequest>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });

  // Handover state after creating a Sales Agent
  const [createdAgent, setCreatedAgent] = useState<SalesAgentItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchSalesAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getSalesAgents();
      setAgents(data);
    } catch (err: unknown) {
      console.error('Failed to load sales agents', err);
      setError(getApiErrorMessage(err, 'Failed to fetch Sales Agents directory'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesAgents();
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const openAddModal = () => {
    setFormError(null);
    setCreatedAgent(null);
    setShowPassword(false);
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
    });
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName.trim()) {
      setFormError('Sales Agent full name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setFormError('A valid email address is required.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await adminApi.createSalesAgent({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber?.trim() || undefined,
        password: formData.password?.trim() || undefined,
      });
      setCreatedAgent(created);
      await fetchSalesAgents();
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err, 'Failed to create Sales Agent account'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent: SalesAgentItem) => {
    try {
      setError(null);
      await adminApi.updateSalesAgentStatus(agent.id, !agent.isActive);
      await fetchSalesAgents();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to update Sales Agent status'));
    }
  };

  const filteredAgents = agents.filter((agent) => {
    switch (statusFilter) {
      case 'All':
        break;
      case 'Active':
        if (!agent.isActive) return false;
        break;
      case 'Deactivated':
        if (agent.isActive) return false;
        break;
      default: {
        const _exhaustive: never = statusFilter;
        return _exhaustive;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = agent.fullName.toLowerCase().includes(q);
      const matchEmail = agent.email.toLowerCase().includes(q);
      const matchPhone = (agent.phoneNumber || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone;
    }

    return true;
  });

  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.isActive).length;
  const deactivatedAgents = agents.filter((a) => !a.isActive).length;
  const totalClinicsOnboarded = agents.reduce((sum, a) => sum + (a.onboardedClinicsCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Agents</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Platform Admin Scope
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add and manage Sales Agents. Sales Agents have access strictly to Onboarding a New Clinic.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSalesAgents}
            title="Refresh List"
            className="p-2.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/admin/onboard-doctor')}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>Onboard Wizard</span>
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:shadow"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Sales Agent</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Total Sales Agents</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalAgents}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-700">Active Agents</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">{activeAgents}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-700">Deactivated</p>
            <p className="text-2xl font-black text-rose-900 mt-1">{deactivatedAgents}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-700">Clinics Onboarded</p>
            <p className="text-2xl font-black text-indigo-900 mt-1">{totalClinicsOnboarded}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Sales Agents by name, email, or phone..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {(['All', 'Active', 'Deactivated'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {status}
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

      {/* Table / Empty state */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading Sales Agents...
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No Sales Agents Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {searchQuery || statusFilter !== 'All'
                ? 'No Sales Agents match your current search or filter criteria.'
                : 'No Sales Agent accounts have been created yet. Click "Add Sales Agent" to create one.'}
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Sales Agent</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="py-3.5 px-4">Sales Agent</th>
                  <th className="py-3.5 px-4">Login Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Access Scope</th>
                  <th className="py-3.5 px-4">Clinics Onboarded</th>
                  <th className="py-3.5 px-4">Created (IST)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {agent.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{agent.fullName}</div>
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            SalesAgent
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{agent.email}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(agent.email, `email-${agent.id}`)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy email"
                        >
                          {copiedField === `email-${agent.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono">
                      {agent.phoneNumber ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {agent.phoneNumber}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Onboarding New Clinic Only
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {agent.onboardedClinicsCount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {formatDateIST(agent.createdAt, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      {agent.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(agent)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                          agent.isActive
                            ? 'text-rose-600 hover:bg-rose-50 border-rose-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        {agent.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Sales Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {createdAgent ? 'Sales Agent Created!' : 'Add New Sales Agent'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Role: <span className="font-mono font-bold text-indigo-700">SalesAgent</span> • Onboarding-only access
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {createdAgent ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-sm">Account ready for {createdAgent.fullName}</p>
                    <p className="text-emerald-700 mt-0.5">
                      Share these login credentials with the Sales Agent. When they sign in, they will only have access to Onboarding a New Clinic.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Sales Agent Credentials
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `DocOS Sales Agent Login:\nPortal: ${window.location.origin}/login\nName: ${createdAgent.fullName}\nEmail: ${createdAgent.email}\nPassword: ${createdAgent.initialPassword || 'Sales@2026'}\nAccess: Onboard New Clinic Only`;
                        handleCopy(text, 'created-all');
                      }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                    >
                      {copiedField === 'created-all' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy All</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-bold text-slate-900">{createdAgent.fullName}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Login Email</span>
                    <span className="font-mono font-bold text-slate-900">{createdAgent.email}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Initial Password</span>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {createdAgent.initialPassword || 'Sales@2026'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Assigned Role</span>
                    <span className="font-bold text-indigo-700">SalesAgent (Onboard New Clinic Only)</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Add Another Agent
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl font-bold text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-indigo-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Restricted Access:</strong> Sales Agents can sign in and access <strong>Onboarding a New Clinic</strong> only. They cannot access the Clinics Directory, Subscription Billing, Global Masters, Audit Logs, or Clinical APIs.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Mehta"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Login Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="sales@docos.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit mobile"
                      value={formData.phoneNumber || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Initial Password (leave blank for default:{' '}
                    <code className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Sales@2026</code>)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Leave blank for Sales@2026"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 text-slate-900 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {submitting ? 'Creating Account...' : 'Create Sales Agent'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
