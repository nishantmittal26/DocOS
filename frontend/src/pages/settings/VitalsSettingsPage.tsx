import React, { useState, useEffect } from 'react';
import { Activity, ArrowUp, ArrowDown, Check, Save, Plus, AlertCircle, Sparkles, Lock, RotateCcw } from 'lucide-react';
import { vitalsApi, clinicsApi } from '../../api/client';
import { ClinicVitalPreference, UpdateVitalPreferenceItem, CreateCustomVitalRequest, ClinicQuotaStatus } from '../../types';

export const VitalsSettingsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [preferences, setPreferences] = useState<ClinicVitalPreference[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Custom Vital Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [quotaStatus, setQuotaStatus] = useState<ClinicQuotaStatus | null>(null);
  const [customReq, setCustomReq] = useState<CreateCustomVitalRequest>({
    code: '',
    displayName: '',
    unit: '',
    inputType: 'Decimal',
    normalRangeMin: undefined,
    normalRangeMax: undefined,
    isMandatory: false,
  });
  const [customError, setCustomError] = useState<string | null>(null);
  const [addingCustom, setAddingCustom] = useState<boolean>(false);

  useEffect(() => {
    loadPreferences();
    loadQuota();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await vitalsApi.getPreferences();
      setPreferences(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to load vital preferences' });
    } finally {
      setLoading(false);
    }
  };

  const loadQuota = async () => {
    try {
      const quota = await clinicsApi.getCurrentSubscriptionQuota();
      setQuotaStatus(quota);
    } catch {
      // Non-blocking
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= preferences.length) return;

    const updated = [...preferences];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-assign displayOrder sequentially
    const reordered = updated.map((pref, idx) => ({
      ...pref,
      displayOrder: idx + 1,
    }));

    setPreferences(reordered);
  };

  const handleToggleEnable = (id: string) => {
    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isEnabled: !p.isEnabled } : p))
    );
  };

  const handleToggleMandatory = (id: string) => {
    setPreferences((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isMandatory: !p.isMandatory } : p))
    );
  };

  const handleRangeOverrideChange = (
    id: string,
    field: 'normalRangeMinOverride' | 'normalRangeMaxOverride',
    val: string
  ) => {
    const num = val.trim() === '' ? undefined : parseFloat(val);
    setPreferences((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: isNaN(num as number) ? undefined : num };
        updated.effectiveRangeMin = updated.normalRangeMinOverride ?? updated.masterRangeMin;
        updated.effectiveRangeMax = updated.normalRangeMaxOverride ?? updated.masterRangeMax;
        return updated;
      })
    );
  };

  const handleResetRange = (id: string) => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              normalRangeMinOverride: undefined,
              normalRangeMaxOverride: undefined,
              effectiveRangeMin: p.masterRangeMin,
              effectiveRangeMax: p.masterRangeMax,
            }
          : p
      )
    );
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const payload: UpdateVitalPreferenceItem[] = preferences.map((p, idx) => ({
        vitalMasterId: p.vitalMasterId,
        isEnabled: p.isEnabled,
        isMandatory: p.isMandatory,
        displayOrder: idx + 1,
        normalRangeMinOverride: p.normalRangeMinOverride ?? null,
        normalRangeMaxOverride: p.normalRangeMaxOverride ?? null,
      }));

      await vitalsApi.updatePreferences(payload);
      setMessage({ type: 'success', text: 'Vital preferences saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save vital preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomVital = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCustom(true);
    setCustomError(null);

    try {
      const created = await vitalsApi.createCustomVital({
        ...customReq,
        code: customReq.code.trim().toUpperCase(),
        displayName: customReq.displayName.trim(),
        unit: customReq.unit.trim(),
      });

      setPreferences((prev) => [...prev, created]);
      setIsAddModalOpen(false);
      setCustomReq({
        code: '',
        displayName: '',
        unit: '',
        inputType: 'Decimal',
        normalRangeMin: undefined,
        normalRangeMax: undefined,
        isMandatory: false,
      });
      setMessage({ type: 'success', text: `Custom vital '${created.displayName}' created successfully!` });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setCustomError(err.response?.data?.message || 'Failed to create custom vital');
    } finally {
      setAddingCustom(false);
    }
  };

  return (
    <div className={embedded ? "space-y-6" : "max-w-6xl mx-auto px-4 py-8 space-y-6"}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinic Vitals Configuration</h1>
              <p className="text-sm text-slate-500">
                Customize which vitals appear during OPD check-in, set their order, configure mandatory fields, and override normal ranges.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl flex items-center space-x-1.5 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Vital</span>
          </button>
          <button
            onClick={handleSavePreferences}
            disabled={saving || loading}
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-sm shadow-teal-700/20 flex items-center space-x-1.5 transition-all"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
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

      {/* Preferences Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading clinic vital preferences...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-20 text-center">Order</th>
                  <th className="py-3.5 px-4">Vital Name</th>
                  <th className="py-3.5 px-4">Input Type</th>
                  <th className="py-3.5 px-4 text-center">Enabled</th>
                  <th className="py-3.5 px-4 text-center">Mandatory</th>
                  <th className="py-3.5 px-4">Standard Range</th>
                  <th className="py-3.5 px-4">Clinic Override Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {preferences.map((pref, index) => (
                  <tr
                    key={pref.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !pref.isEnabled ? 'bg-slate-50/50 opacity-60' : ''
                    }`}
                  >
                    {/* Order Controls */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          title="Move Up"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20 transition-all"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-semibold text-slate-700 w-4 text-center">
                          {index + 1}
                        </span>
                        <button
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === preferences.length - 1}
                          title="Move Down"
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20 transition-all"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Vital Name & Unit */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{pref.displayName}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {pref.unit}
                        </span>
                        {pref.isCustom && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Custom
                          </span>
                        )}
                        {pref.pairGroup && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Paired ({pref.pairGroup})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{pref.code}</span>
                    </td>

                    {/* Input Type */}
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                        {pref.inputType}
                      </span>
                    </td>

                    {/* Enable Toggle */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={pref.isEnabled}
                        onChange={() => handleToggleEnable(pref.id)}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>

                    {/* Mandatory Toggle */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={pref.isMandatory}
                        disabled={!pref.isEnabled}
                        onChange={() => handleToggleMandatory(pref.id)}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer disabled:opacity-30"
                      />
                    </td>

                    {/* Standard Range */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                      {pref.masterRangeMin !== undefined || pref.masterRangeMax !== undefined ? (
                        <span>
                          {pref.masterRangeMin ?? '-'} to {pref.masterRangeMax ?? '-'} {pref.unit}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>

                    {/* Clinic Override Range */}
                    <td className="py-3 px-4">
                      {pref.inputType !== 'Text' ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="number"
                            step="0.1"
                            placeholder={pref.masterRangeMin?.toString() ?? 'Min'}
                            value={pref.normalRangeMinOverride ?? ''}
                            onChange={(e) => handleRangeOverrideChange(pref.id, 'normalRangeMinOverride', e.target.value)}
                            disabled={!pref.isEnabled}
                            className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="number"
                            step="0.1"
                            placeholder={pref.masterRangeMax?.toString() ?? 'Max'}
                            value={pref.normalRangeMaxOverride ?? ''}
                            onChange={(e) => handleRangeOverrideChange(pref.id, 'normalRangeMaxOverride', e.target.value)}
                            disabled={!pref.isEnabled}
                            className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 disabled:bg-slate-50"
                          />
                          {(pref.normalRangeMinOverride !== undefined || pref.normalRangeMaxOverride !== undefined) && (
                            <button
                              onClick={() => handleResetRange(pref.id)}
                              title="Reset override to master"
                              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Free Text</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Custom Vital Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Clinic Custom Vital</h3>
                  <p className="text-xs text-slate-500">Define a custom reading specific to your clinic</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCustomVital} className="p-6 space-y-4">
              {customError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{customError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vital Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HBA1C, WAIST, VISUAL_ACUITY"
                  value={customReq.code}
                  onChange={(e) => setCustomReq({ ...customReq, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HbA1c Glycated Hemoglobin"
                  value={customReq.displayName}
                  onChange={(e) => setCustomReq({ ...customReq, displayName: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. %, cm, mg/dL"
                    value={customReq.unit}
                    onChange={(e) => setCustomReq({ ...customReq, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Input Type *</label>
                  <select
                    value={customReq.inputType}
                    onChange={(e) => setCustomReq({ ...customReq, inputType: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
                  >
                    <option value="Decimal">Decimal (e.g. 5.6)</option>
                    <option value="Number">Whole Number</option>
                    <option value="Text">Free Text</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Normal Min (Optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 4.0"
                    value={customReq.normalRangeMin ?? ''}
                    onChange={(e) =>
                      setCustomReq({
                        ...customReq,
                        normalRangeMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Normal Max (Optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.6"
                    value={customReq.normalRangeMax ?? ''}
                    onChange={(e) =>
                      setCustomReq({
                        ...customReq,
                        normalRangeMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-200"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="customIsMandatory"
                  checked={customReq.isMandatory}
                  onChange={(e) => setCustomReq({ ...customReq, isMandatory: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="customIsMandatory" className="text-xs text-slate-700 cursor-pointer">
                  Mark this vital as mandatory during OPD entry
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingCustom}
                  className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-sm shadow-teal-700/20 flex items-center space-x-1.5 transition-all"
                >
                  {addingCustom ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Vital</span>
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
