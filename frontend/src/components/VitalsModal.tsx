import React, { useState, useEffect } from 'react';
import { X, Activity, Check, HeartPulse, Thermometer, Wind, Scale, Ruler, Droplet, AlertTriangle, Sparkles } from 'lucide-react';
import { vitalsApi } from '../api/client';
import { VisitQueueItem, ClinicVitalPreference, RecordVisitVitalItemRequest } from '../types';

interface VitalsModalProps {
  isOpen: boolean;
  visit: VisitQueueItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export const VitalsModal: React.FC<VitalsModalProps> = ({
  isOpen,
  visit,
  onClose,
  onSaved,
}) => {
  const [preferences, setPreferences] = useState<ClinicVitalPreference[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPrefs, setLoadingPrefs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load clinic preferences and existing vitals
  useEffect(() => {
    if (!isOpen || !visit) return;

    const loadData = async () => {
      setLoadingPrefs(true);
      setError(null);
      try {
        const [prefs, recorded] = await Promise.all([
          vitalsApi.getPreferences(),
          vitalsApi.getVisitVitals(visit.id).catch(() => []),
        ]);

        const enabledPrefs = prefs.filter((p) => p.isEnabled).sort((a, b) => a.displayOrder - b.displayOrder);
        setPreferences(enabledPrefs);

        // Prepopulate values from recorded vitals or legacy visit.vitals
        const initialVals: Record<string, string> = {};

        if (recorded && recorded.length > 0) {
          recorded.forEach((item) => {
            initialVals[item.code] = item.valueText || (item.valueNumeric !== undefined ? item.valueNumeric.toString() : '');
          });
        } else if (visit.vitals) {
          const v = visit.vitals;
          if (v.systolicBp) initialVals['BP_SYS'] = v.systolicBp.toString();
          if (v.diastolicBp) initialVals['BP_DIA'] = v.diastolicBp.toString();
          if (v.pulseBpm) initialVals['PULSE'] = v.pulseBpm.toString();
          if (v.temperatureF) initialVals['TEMP_F'] = v.temperatureF.toString();
          if (v.spo2) initialVals['SPO2'] = v.spo2.toString();
          if (v.weightKg) initialVals['WEIGHT'] = v.weightKg.toString();
          if (v.heightCm) initialVals['HEIGHT'] = v.heightCm.toString();
          if (v.sugar) initialVals['SUGAR'] = v.sugar;
        }

        setValues(initialVals);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load clinic vital settings');
      } finally {
        setLoadingPrefs(false);
      }
    };

    loadData();
  }, [isOpen, visit]);

  // Live computed BMI calculation
  const weightStr = values['WEIGHT'] || '';
  const heightStr = values['HEIGHT'] || '';
  const wt = parseFloat(weightStr);
  const ht = parseFloat(heightStr);

  let liveBmi: number | null = null;
  let bmiCategory = '';
  let bmiColor = 'bg-slate-100 text-slate-700';

  if (!isNaN(wt) && !isNaN(ht) && ht > 0) {
    const htMeters = ht / 100;
    liveBmi = Math.round((wt / (htMeters * htMeters)) * 10) / 10;
    if (liveBmi < 18.5) {
      bmiCategory = 'Underweight';
      bmiColor = 'bg-blue-100 text-blue-700';
    } else if (liveBmi <= 24.9) {
      bmiCategory = 'Normal Weight';
      bmiColor = 'bg-emerald-100 text-emerald-700';
    } else if (liveBmi <= 29.9) {
      bmiCategory = 'Overweight';
      bmiColor = 'bg-amber-100 text-amber-700';
    } else {
      bmiCategory = 'Obese';
      bmiColor = 'bg-rose-100 text-rose-700';
    }
  }

  if (!isOpen || !visit) return null;

  const handleInputChange = (code: string, val: string) => {
    setValues((prev) => ({ ...prev, [code]: val }));
  };

  const getIconForCode = (code: string) => {
    switch (code) {
      case 'BP_SYS':
      case 'BP_DIA':
        return <HeartPulse className="w-4 h-4 text-rose-500" />;
      case 'PULSE':
        return <Activity className="w-4 h-4 text-emerald-500" />;
      case 'TEMP_F':
        return <Thermometer className="w-4 h-4 text-amber-500" />;
      case 'SPO2':
        return <Wind className="w-4 h-4 text-cyan-500" />;
      case 'WEIGHT':
        return <Scale className="w-4 h-4 text-indigo-500" />;
      case 'HEIGHT':
        return <Ruler className="w-4 h-4 text-purple-500" />;
      case 'SUGAR':
        return <Droplet className="w-4 h-4 text-blue-500" />;
      default:
        return <Activity className="w-4 h-4 text-teal-500" />;
    }
  };

  const checkAbnormal = (pref: ClinicVitalPreference, valStr: string) => {
    if (!valStr || !valStr.trim()) return false;
    const num = parseFloat(valStr);
    if (isNaN(num)) return false;
    const min = pref.effectiveRangeMin ?? pref.masterRangeMin;
    const max = pref.effectiveRangeMax ?? pref.masterRangeMax;
    if (min !== undefined && min !== null && num < min) return true;
    if (max !== undefined && max !== null && num > max) return true;
    return false;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation for mandatory vitals
    for (const pref of preferences) {
      if (pref.isMandatory) {
        if (pref.code === 'BMI') {
          if (liveBmi === null) {
            setError(`BMI is mandatory. Please provide valid Weight and Height.`);
            setLoading(false);
            return;
          }
        } else if (!values[pref.code] || !values[pref.code].trim()) {
          setError(`'${pref.displayName}' is mandatory.`);
          setLoading(false);
          return;
        }
      }
    }

    try {
      const items: RecordVisitVitalItemRequest[] = [];

      preferences.forEach((pref) => {
        if (pref.code === 'BMI') {
          if (liveBmi !== null) {
            items.push({
              vitalMasterId: pref.vitalMasterId,
              code: 'BMI',
              valueText: liveBmi.toFixed(1),
              valueNumeric: liveBmi,
            });
          }
        } else {
          const val = values[pref.code]?.trim();
          if (val) {
            const num = parseFloat(val);
            items.push({
              vitalMasterId: pref.vitalMasterId,
              code: pref.code,
              valueText: val,
              valueNumeric: !isNaN(num) && pref.inputType !== 'Text' ? num : undefined,
            });
          }
        }
      });

      await vitalsApi.recordVisitVitals(visit.id, items);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  // Group paired preferences by PairGroup
  const renderedCodes = new Set<string>();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Record Patient Vitals</h2>
              <p className="text-xs text-slate-500">
                Token #{visit.tokenNumber} • {visit.patientName} ({visit.patientUid})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {loadingPrefs ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading clinic vitals configuration...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {preferences.map((pref) => {
                // If this is part of a pair group that has already been rendered together, skip
                if (renderedCodes.has(pref.code)) return null;

                // Handle Paired controls (e.g. BP_SYS and BP_DIA)
                if (pref.pairGroup === 'BP' && (pref.code === 'BP_SYS' || pref.code === 'BP_DIA')) {
                  renderedCodes.add('BP_SYS');
                  renderedCodes.add('BP_DIA');

                  const sysPref = preferences.find((p) => p.code === 'BP_SYS') || pref;
                  const diaPref = preferences.find((p) => p.code === 'BP_DIA') || pref;
                  const sysVal = values['BP_SYS'] || '';
                  const diaVal = values['BP_DIA'] || '';
                  const sysAbnormal = checkAbnormal(sysPref, sysVal);
                  const diaAbnormal = checkAbnormal(diaPref, diaVal);
                  const hasPairAbnormal = sysAbnormal || diaAbnormal;

                  return (
                    <div
                      key="pair-bp"
                      className={`md:col-span-2 p-3.5 rounded-xl border transition-all ${
                        hasPairAbnormal
                          ? 'border-rose-300 bg-rose-50/30'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                          {getIconForCode('BP_SYS')}
                          <span>Blood Pressure (Systolic / Diastolic)</span>
                          {(sysPref.isMandatory || diaPref.isMandatory) && (
                            <span className="text-rose-500 font-bold">*</span>
                          )}
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Normal: {sysPref.effectiveRangeMin ?? 90}-{sysPref.effectiveRangeMax ?? 120} /{' '}
                          {diaPref.effectiveRangeMin ?? 60}-{diaPref.effectiveRangeMax ?? 80} mmHg
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            placeholder="Systolic"
                            value={sysVal}
                            onChange={(e) => handleInputChange('BP_SYS', e.target.value)}
                            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                              sysAbnormal
                                ? 'border-rose-400 focus:ring-rose-200 text-rose-900 font-semibold'
                                : 'border-slate-200 focus:ring-teal-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <span className="text-slate-400 font-bold text-base">/</span>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            placeholder="Diastolic"
                            value={diaVal}
                            onChange={(e) => handleInputChange('BP_DIA', e.target.value)}
                            className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                              diaAbnormal
                                ? 'border-rose-400 focus:ring-rose-200 text-rose-900 font-semibold'
                                : 'border-slate-200 focus:ring-teal-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500 shrink-0">mmHg</span>
                      </div>

                      {hasPairAbnormal && (
                        <p className="mt-1.5 text-[11px] font-medium text-rose-600 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Blood pressure reading is outside standard target range.</span>
                        </p>
                      )}
                    </div>
                  );
                }

                // Handle Computed controls (e.g. BMI)
                if (pref.code === 'BMI' || pref.inputType === 'Computed') {
                  renderedCodes.add(pref.code);
                  const isBmiAbnormal =
                    liveBmi !== null &&
                    ((pref.effectiveRangeMin !== undefined && liveBmi < pref.effectiveRangeMin) ||
                      (pref.effectiveRangeMax !== undefined && liveBmi > pref.effectiveRangeMax));

                  return (
                    <div
                      key={pref.id}
                      className="md:col-span-2 p-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/30 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-semibold text-slate-800">{pref.displayName}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                              Computed
                            </span>
                            {pref.isMandatory && <span className="text-rose-500 font-bold">*</span>}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Normal: {pref.effectiveRangeMin ?? 18.5} - {pref.effectiveRangeMax ?? 24.9} {pref.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        {liveBmi !== null ? (
                          <>
                            <span className="text-base font-bold text-slate-900">
                              {liveBmi.toFixed(1)}{' '}
                              <span className="text-xs font-normal text-slate-500">{pref.unit}</span>
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bmiColor}`}>
                              {bmiCategory}
                            </span>
                            {isBmiAbnormal && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                                Abnormal
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Enter Weight & Height</span>
                        )}
                      </div>
                    </div>
                  );
                }

                // Standard Vitals
                renderedCodes.add(pref.code);
                const val = values[pref.code] || '';
                const isAbnormal = checkAbnormal(pref, val);

                return (
                  <div key={pref.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                        {getIconForCode(pref.code)}
                        <span>{pref.displayName}</span>
                        {pref.isMandatory && <span className="text-rose-500 font-bold">*</span>}
                        {pref.isCustom && (
                          <span className="text-[10px] font-bold px-1 rounded bg-indigo-50 text-indigo-700">
                            Custom
                          </span>
                        )}
                      </label>
                      {(pref.effectiveRangeMin !== undefined || pref.effectiveRangeMax !== undefined) && (
                        <span className="text-[10px] text-slate-400">
                          {pref.effectiveRangeMin ?? '-'}-{pref.effectiveRangeMax ?? '-'} {pref.unit}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type={pref.inputType === 'Number' || pref.inputType === 'Decimal' ? 'number' : 'text'}
                        step={pref.inputType === 'Decimal' ? '0.1' : undefined}
                        placeholder={pref.code === 'SUGAR' ? 'e.g. 110 mg/dL, 140 PP' : `Enter ${pref.displayName}`}
                        value={val}
                        onChange={(e) => handleInputChange(pref.code, e.target.value)}
                        className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                          isAbnormal
                            ? 'border-rose-400 focus:ring-rose-200 text-rose-900 font-semibold bg-rose-50/20'
                            : 'border-slate-200 focus:ring-teal-200 text-slate-900'
                        }`}
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400 pointer-events-none">
                        {pref.unit}
                      </span>
                    </div>

                    {isAbnormal && (
                      <p className="text-[10px] font-semibold text-rose-600 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>Outside normal range ({pref.effectiveRangeMin}-{pref.effectiveRangeMax} {pref.unit})</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || loadingPrefs}
              className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-sm shadow-teal-700/20 flex items-center space-x-1.5 transition-all"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Vitals</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
