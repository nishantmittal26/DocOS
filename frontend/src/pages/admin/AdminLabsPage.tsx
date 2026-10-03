import React, { useState, useEffect } from 'react';
import { FlaskConical, Plus, Edit2, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';
import { adminApi } from '../../api/client';
import { LabTestMaster, CreateLabTestRequest, UpdateLabTestRequest } from '../../types';

export const AdminLabsPage: React.FC = () => {
  const [labs, setLabs] = useState<LabTestMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLab, setEditingLab] = useState<LabTestMaster | null>(null);
  const [formData, setFormData] = useState<CreateLabTestRequest>({
    testCode: '',
    testName: '',
    category: 'Biochemistry',
    sampleType: 'Blood',
    fastingRequired: false,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadGlobalLabs();
  }, []);

  const loadGlobalLabs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getGlobalLabs();
      setLabs(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load global lab tests' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingLab(null);
    setFormData({
      testCode: '',
      testName: '',
      category: 'Biochemistry',
      sampleType: 'Blood',
      fastingRequired: false,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lab: LabTestMaster) => {
    setEditingLab(lab);
    setFormData({
      testCode: lab.testCode,
      testName: lab.testName,
      category: lab.category,
      sampleType: lab.sampleType || 'Blood',
      fastingRequired: lab.fastingRequired,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingLab) {
        const updateReq: UpdateLabTestRequest = {
          testCode: formData.testCode.trim().toUpperCase(),
          testName: formData.testName.trim(),
          category: formData.category,
          sampleType: formData.sampleType?.trim() || undefined,
          fastingRequired: formData.fastingRequired,
          isActive: editingLab.isActive,
        };
        const updated = await adminApi.updateGlobalLab(editingLab.id, updateReq);
        setLabs((prev) => prev.map((l) => (l.id === editingLab.id ? updated : l)));
        setMessage({ type: 'success', text: `Global lab '${formData.testName}' updated.` });
      } else {
        const created = await adminApi.createGlobalLab({
          testCode: formData.testCode.trim().toUpperCase(),
          testName: formData.testName.trim(),
          category: formData.category,
          sampleType: formData.sampleType?.trim() || undefined,
          fastingRequired: formData.fastingRequired,
        });
        setLabs((prev) => [...prev, created]);
        setMessage({ type: 'success', text: `Global lab '${formData.testName}' created.` });
      }
      setIsModalOpen(false);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save global lab test');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = Array.from(new Set(labs.map((l) => l.category))).filter(Boolean);

  const filtered = labs.filter((l) => {
    const q = search.trim().toLowerCase();
    const matchesQ = !q || l.testName.toLowerCase().includes(q) || l.testCode.toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'All' || l.category === categoryFilter;
    return matchesQ && matchesCat;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-sm">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global Laboratory Master Catalog</h1>
            <p className="text-xs text-slate-500">
              Manage platform-wide standard Indian laboratory investigations available to all subscribed clinics.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Global Lab Test</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search global tests by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-semibold text-slate-700"
          >
            <option value="All">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading global lab tests...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Sample Type</th>
                  <th className="py-3 px-4">Fasting Required</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lab) => (
                  <tr key={lab.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{lab.testCode}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{lab.testName}</td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                        {lab.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{lab.sampleType || 'Blood'}</td>
                    <td className="py-3 px-4">
                      {lab.fastingRequired ? (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Yes
                        </span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Global Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(lab)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-purple-700 hover:bg-purple-50 rounded-lg border border-purple-200 font-bold transition-all"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingLab ? 'Edit Global Lab Test' : 'Add New Global Lab Test'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Test Code *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingLab}
                  placeholder="e.g. CBC, LFT, KFT"
                  value={formData.testCode}
                  onChange={(e) => setFormData({ ...formData, testCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-mono font-bold focus:border-purple-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Test Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Complete Blood Count"
                  value={formData.testName}
                  onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white focus:border-purple-500"
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Serology">Serology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Special Investigation">Special Investigation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sample Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Blood, Serum, Urine"
                    value={formData.sampleType}
                    onChange={(e) => setFormData({ ...formData, sampleType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="adminFastingToggle"
                  checked={formData.fastingRequired}
                  onChange={(e) => setFormData({ ...formData, fastingRequired: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300"
                />
                <label htmlFor="adminFastingToggle" className="font-semibold text-slate-700 cursor-pointer">
                  Fasting sample required
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Global Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLabsPage;
