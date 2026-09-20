import React, { useState, useEffect } from 'react';
import { X, Activity, Check, HeartPulse, Thermometer, Wind, Scale, Ruler } from 'lucide-react';
import { visitsApi } from '../api/client';
import { VisitQueueItem } from '../types';

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
  const [systolicBp, setSystolicBp] = useState<string>('');
  const [diastolicBp, setDiastolicBp] = useState<string>('');
  const [pulseBpm, setPulseBpm] = useState<string>('');
  const [temperatureF, setTemperatureF] = useState<string>('');
  const [spo2, setSpo2] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visit?.vitals) {
      const v = visit.vitals;
      setSystolicBp(v.systolicBp?.toString() || '');
      setDiastolicBp(v.diastolicBp?.toString() || '');
      setPulseBpm(v.pulseBpm?.toString() || '');
      setTemperatureF(v.temperatureF?.toString() || '');
      setSpo2(v.spo2?.toString() || '');
      setWeightKg(v.weightKg?.toString() || '');
      setHeightCm(v.heightCm?.toString() || '');
    } else {
      setSystolicBp('');
      setDiastolicBp('');
      setPulseBpm('');
      setTemperatureF('');
      setSpo2('');
      setWeightKg('');
      setHeightCm('');
    }
  }, [visit]);

  if (!isOpen || !visit) return null;

  // Live BMI calculation
  const wt = parseFloat(weightKg);
  const ht = parseFloat(heightCm);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await visitsApi.recordVitals({
        visitId: visit.id,
        systolicBp: systolicBp ? parseInt(systolicBp) : undefined,
        diastolicBp: diastolicBp ? parseInt(diastolicBp) : undefined,
        pulseBpm: pulseBpm ? parseInt(pulseBpm) : undefined,
        temperatureF: temperatureF ? parseFloat(temperatureF) : undefined,
        spo2: spo2 ? parseInt(spo2) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record vitals');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
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
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vitals Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* BP */}
          <div>
            <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5">
              <HeartPulse className="w-4 h-4 mr-1 text-rose-500" />
              Blood Pressure (Systolic / Diastolic mmHg)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Systolic (e.g. 120)"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
              <input
                type="number"
                placeholder="Diastolic (e.g. 80)"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          {/* Pulse & Temperature */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5">
                <Activity className="w-4 h-4 mr-1 text-indigo-500" />
                Pulse Rate (bpm)
              </label>
              <input
                type="number"
                placeholder="e.g. 72"
                value={pulseBpm}
                onChange={(e) => setPulseBpm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5">
                <Thermometer className="w-4 h-4 mr-1 text-amber-500" />
                Temp (°F)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 98.6"
                value={temperatureF}
                onChange={(e) => setTemperatureF(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          {/* SpO2 */}
          <div>
            <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5">
              <Wind className="w-4 h-4 mr-1 text-cyan-500" />
              Oxygen Saturation (SpO2 %)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              placeholder="e.g. 98"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
            />
          </div>

          {/* Weight & Height & Live BMI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5">
                <Scale className="w-4 h-4 mr-1 text-emerald-500" />
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 68.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="flex items-center text-xs font-semibold text-slate-700 mb-1.5">
                <Ruler className="w-4 h-4 mr-1 text-violet-500" />
                Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 172"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>
          </div>

          {/* Auto BMI Card */}
          {liveBmi !== null && (
            <div className={`p-3 rounded-xl flex items-center justify-between border ${bmiColor}`}>
              <div className="text-xs font-medium">
                Auto-calculated Body Mass Index (BMI):
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-sm">{liveBmi} kg/m²</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/70">
                  {bmiCategory}
                </span>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-teal-600/20 disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save Vitals'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
