import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit2, CheckCircle2, AlertCircle, Search, Filter } from 'lucide-react';
import { adminApi } from '../../api/client';
import { AdviceTemplate, CreateAdviceTemplateRequest, UpdateAdviceTemplateRequest } from '../../types';

export const AdminAdvicePage: React.FC = () => {
  const [adviceList, setAdviceList] = useState<AdviceTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAdvice, setEditingAdvice] = useState<AdviceTemplate | null>(null);
  const [formData, setFormData] = useState<CreateAdviceTemplateRequest>({
    category: 'Dietary',
    title: '',
    instructionsText: '',
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadGlobalAdvice();
  }, []);

  const loadGlobalAdvice = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getGlobalAdvice();
      setAdviceList(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load global advice templates' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingAdvice(null);
    setFormData({
      category: 'Dietary',
      title: '',
      instructionsText: '',
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (advice: AdviceTemplate) => {
    setEditingAdvice(advice);
    setFormData({
      category: advice.category,
      title: advice.title,
      instructionsText: advice.instructionsText,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingAdvice) {
        const updateReq: UpdateAdviceTemplateRequest = {
          category: formData.category,
          title: formData.title.trim(),
          instructionsText: formData.instructionsText.trim(),
          isActive: editingAdvice.isActive,
        };
        const updated = await adminApi.updateGlobalAdvice(editingAdvice.id, updateReq);
        setAdviceList((prev) => prev.map((a) => (a.id === editingAdvice.id ? updated : a)));
        setMessage({ type: 'success', text: `Global advice '${formData.title}' updated.` });
      } else {
        const created = await adminApi.createGlobalAdvice({
          category: formData.category,
          title: formData.title.trim(),
          instructionsText: formData.instructionsText.trim(),
        });
        setAdviceList((prev) => [...prev, created]);
        setMessage({ type: 'success', text: `Global advice '${formData.title}' created.` });
      }
      setIsModalOpen(false);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to save advice template');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['All', 'Dietary', 'General', 'Medication', 'Lifestyle', 'Precautions'];

  const filtered = adviceList.filter((a) => {
    const q = search.trim().toLowerCase();
    const matchesQ = !q || a.title.toLowerCase().includes(q) || a.instructionsText.toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'All' || a.category === categoryFilter;
    return matchesQ && matchesCat;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global Advice Master Catalog</h1>
            <p className="text-xs text-slate-500">
              Manage platform-wide clinical guidelines, dietary recommendations, and precautions available to all clinics.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Global Advice Template</span>
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
            placeholder="Search global advice templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === cat
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading global advice templates...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Advice Text</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((advice) => (
                  <tr key={advice.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-teal-800">
                      <span className="bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full text-[10px]">
                        {advice.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{advice.title}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-md truncate">{advice.instructionsText}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Global Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(advice)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-teal-700 hover:bg-teal-50 rounded-lg border border-teal-200 font-bold transition-all"
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
                {editingAdvice ? 'Edit Global Advice Template' : 'Add New Global Advice Template'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white focus:border-teal-500 font-semibold"
                  >
                    <option value="Dietary">Dietary</option>
                    <option value="General">General</option>
                    <option value="Medication">Medication</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Precautions">Precautions</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diabetic Guidelines"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-teal-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions / Advice Text *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter detailed clinical or dietary guidelines..."
                  value={formData.instructionsText}
                  onChange={(e) => setFormData({ ...formData, instructionsText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-teal-500"
                />
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
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Global Advice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAdvicePage;
