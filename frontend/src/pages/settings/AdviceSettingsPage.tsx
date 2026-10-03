import React, { useState, useEffect } from 'react';
import { adviceApi } from '../../api/client';
import { AdviceTemplate, CreateAdviceTemplateRequest } from '../../types';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  BookOpen,
} from 'lucide-react';
import {
  CatalogScopeFilter,
  CatalogSourceBadge,
  CatalogScope,
  matchesCatalogScope,
} from '../../components/CatalogScopeFilter';

export const AdviceSettingsPage: React.FC = () => {
  const [templates, setTemplates] = useState<AdviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogScope, setCatalogScope] = useState<CatalogScope>('clinic');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateAdviceTemplateRequest>({
    category: 'Dietary',
    title: '',
    instructionsText: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await adviceApi.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load advice templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleOpenModal = (tmpl?: AdviceTemplate) => {
    if (tmpl) {
      setEditingId(tmpl.id);
      setForm({
        category: tmpl.category,
        title: tmpl.title,
        instructionsText: tmpl.instructionsText,
      });
    } else {
      setEditingId(null);
      setForm({
        category: 'Dietary',
        title: '',
        instructionsText: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const updated = await adviceApi.updateTemplate(editingId, {
          ...form,
          isActive: true,
        });
        setTemplates((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
        setMessage({ type: 'success', text: `Advice template "${updated.title}" updated!` });
      } else {
        const created = await adviceApi.createTemplate(form);
        setTemplates((prev) => [...prev, created]);
        setMessage({ type: 'success', text: `Advice template "${created.title}" created!` });
      }
      setIsModalOpen(false);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save advice template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${title}"?`)) return;
    try {
      await adviceApi.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setMessage({ type: 'success', text: `Advice template "${title}" deleted.` });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete advice template');
    }
  };

  const categories = ['All', 'Dietary', 'General', 'Medication', 'Lifestyle', 'Precautions'];

  const clinicTemplateCount = templates.filter((t) => t.isCustom).length;

  const filtered = templates.filter((t) => {
    if (!matchesCatalogScope(t.isCustom, catalogScope)) {
      return false;
    }
    const matchesCat = categoryFilter === 'All' || t.category === categoryFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.instructionsText.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Prescription Advice Templates</h1>
            <p className="text-xs text-slate-500">
              Manage reusable advice snippets, dietary guidelines, and disease-specific care instructions for consultations.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm flex items-center space-x-1.5 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Advice Template</span>
        </button>
      </div>

      {/* Status Message */}
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

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search advice snippets by keyword or diagnosis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <CatalogScopeFilter value={catalogScope} onChange={setCatalogScope} />
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Loading advice templates...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-sm">No Advice Templates Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {clinicTemplateCount === 0 && catalogScope === 'clinic'
              ? 'No clinic custom advice yet. Turn on “Include global catalog” to browse standard templates (view-only), or add your own.'
              : 'No templates match your filters. Create snippets like "Diabetic Dietary Guidelines" or adjust search/category.'}
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover:border-emerald-200 transition-all space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        tmpl.category === 'Dietary'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tmpl.category === 'Lifestyle'
                          ? 'bg-blue-100 text-blue-800'
                          : tmpl.category === 'Medication'
                          ? 'bg-purple-100 text-purple-800'
                          : tmpl.category === 'Precautions'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {tmpl.category}
                    </span>
                    <CatalogSourceBadge isClinicOwned={tmpl.isCustom} />
                  </div>

                  {tmpl.isCustom ? (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenModal(tmpl)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tmpl.id, tmpl.title)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">View only</span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-2">{tmpl.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {tmpl.instructionsText}
                </p>
              </div>

              <div className="pt-2 text-[10px] text-slate-400">
                {tmpl.isCustom ? 'Editable clinic template' : 'Global catalog — read-only in settings'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Advice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingId ? 'Edit Advice Template' : 'Create Custom Advice Template'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white focus:border-emerald-500 font-semibold"
                  >
                    <option value="Dietary">Dietary</option>
                    <option value="General">General</option>
                    <option value="Medication">Medication</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Precautions">Precautions</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title / Trigger *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Low Sodium Diet, Asthma Advice"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructions / Advice Text *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter the detailed clinical or dietary advice that will appear on the printed prescription..."
                  value={form.instructionsText}
                  onChange={(e) => setForm({ ...form, instructionsText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-500"
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
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdviceSettingsPage;
