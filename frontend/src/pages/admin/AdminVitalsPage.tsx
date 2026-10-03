import React, { useState, useEffect } from 'react';
import { Activity, Plus, Edit2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { adminApi } from '../../api/client';
import { VitalMaster, CreateGlobalVitalMasterRequest } from '../../types';

export const AdminVitalsPage: React.FC = () => {
  const [vitals, setVitals] = useState<VitalMaster[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingVital, setEditingVital] = useState<VitalMaster | null>(null);
  const [formData, setFormData] = useState<CreateGlobalVitalMasterRequest>({
    code: '',
    displayName: '',
    unit: '',
    inputType: 'Decimal',
    pairGroup: '',
    normalRangeMin: undefined,
    normalRangeMax: undefined,
    defaultDisplayOrder: 0,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    loadGlobalVitals();
  }, []);

  const loadGlobalVitals = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getGlobalVitals();
      setVitals(data.sort((a, b) => a.defaultDisplayOrder - b.defaultDisplayOrder));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load global vitals' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingVital(null);
    setFormData({
      code: '',
      displayName: '',
      unit: '',
      inputType: 'Decimal',
      pairGroup: '',
      normalRangeMin: undefined,
      normalRangeMax: undefined,
      defaultDisplayOrder: (vitals.length > 0 ? Math.max(...vitals.map((v) => v.defaultDisplayOrder)) : 0) + 1,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vital: VitalMaster) => {
    setEditingVital(vital);
    setFormData({
      code: vital.code,
      displayName: vital.displayName,
      unit: vital.unit,
      inputType: vital.inputType,
      pairGroup: vital.pairGroup || '',
      normalRangeMin: vital.normalRangeMin,
      normalRangeMax: vital.normalRangeMax,
      defaultDisplayOrder: vital.defaultDisplayOrder,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    try {
      if (editingVital) {
        await adminApi.updateGlobalVital(editingVital.id, {
          displayName: formData.displayName.trim(),
          unit: formData.unit.trim(),
          inputType: formData.inputType as any,
          pairGroup: formData.pairGroup?.trim() || undefined,
          normalRangeMin: formData.normalRangeMin,
          normalRangeMax: formData.normalRangeMax,
          defaultDisplayOrder: formData.defaultDisplayOrder,
        });
        setMessage({ type: 'success', text: `Global vital '${formData.displayName}' updated successfully.` });
      } else {
        await adminApi.createGlobalVital({
          code: formData.code.trim().toUpperCase(),
          displayName: formData.displayName.trim(),
          unit: formData.unit.trim(),
          inputType: formData.inputType,
          pairGroup: formData.pairGroup?.trim() || undefined,
          normalRangeMin: formData.normalRangeMin,
          normalRangeMax: formData.normalRangeMax,
          defaultDisplayOrder: formData.defaultDisplayOrder,
        });
        setMessage({ type: 'success', text: `Global vital '${formData.displayName}' created successfully.` });
      }

      setIsModalOpen(false);
      loadGlobalVitals();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Global Vital Masters Catalog</h1>
              <p className="text-sm text-slate-500">
                Platform-wide master catalog of vitals available to all clinics across DocOS.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Global Vital</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center space-x-2 border transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading global vital catalog...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16 text-center">Order</th>
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Display Name</th>
                  <th className="py-3.5 px-4">Unit</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Normal Range</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vitals.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600">
                      {v.defaultDisplayOrder}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{v.code}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{v.displayName}</span>
                        {v.pairGroup && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Paired ({v.pairGroup})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{v.unit}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                        {v.inputType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {v.normalRangeMin !== undefined || v.normalRangeMax !== undefined ? (
                        <span>
                          {v.normalRangeMin ?? '-'} to {v.normalRangeMax ?? '-'} {v.unit}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(v)}
                        className="px-2.5 py-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 text-xs font-semibold inline-flex items-center space-x-1 transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingVital ? `Edit Vital (${editingVital.code})` : 'New Global Vital Master'}
                  </h3>
                  <p className="text-xs text-slate-500">Configure global catalog definition</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{modalError}</span>
                </div>
              )}

              {!editingVital && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RESP_RATE"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Respiratory Rate"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bpm, %, °F"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Input Type *</label>
                  <select
                    value={formData.inputType}
                    onChange={(e) => setFormData({ ...formData, inputType: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="Decimal">Decimal</option>
                    <option value="Number">Number</option>
                    <option value="Text">Text</option>
                    <option value="Computed">Computed</option>
                    <option value="Paired">Paired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pair Group</label>
                  <input
                    type="text"
                    placeholder="e.g. BP"
                    value={formData.pairGroup || ''}
                    onChange={(e) => setFormData({ ...formData, pairGroup: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Order *</label>
                  <input
                    type="number"
                    required
                    value={formData.defaultDisplayOrder}
                    onChange={(e) => setFormData({ ...formData, defaultDisplayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Normal Range Min</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 12"
                    value={formData.normalRangeMin ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        normalRangeMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Normal Range Max</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 20"
                    value={formData.normalRangeMax ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        normalRangeMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm shadow-indigo-700/20 flex items-center space-x-1.5 transition-all"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingVital ? 'Save Changes' : 'Create Master'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
