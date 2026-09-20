import React, { useState, useEffect } from 'react';
import { X, Pill, AlertCircle, Edit3 } from 'lucide-react';
import { medicinesApi } from '../api/client';
import { DosageForm, Medicine } from '../types';

interface AddCustomMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMedicineAdded?: (medicine: Medicine) => void;
  onMedicineUpdated?: (medicine: Medicine) => void;
  medicineToEdit?: Medicine | null;
}

export const AddCustomMedicineModal: React.FC<AddCustomMedicineModalProps> = ({
  isOpen,
  onClose,
  onMedicineAdded,
  onMedicineUpdated,
  medicineToEdit,
}) => {
  const isEditMode = !!medicineToEdit;

  const [brandName, setBrandName] = useState('');
  const [saltComposition, setSaltComposition] = useState('');
  const [form, setForm] = useState<DosageForm>('Tablet');
  const [strength, setStrength] = useState('');
  const [manufacturer, setManufacturer] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (medicineToEdit) {
      setBrandName(medicineToEdit.brandName);
      setSaltComposition(medicineToEdit.saltComposition);
      setForm(medicineToEdit.form);
      setStrength(medicineToEdit.strength);
      setManufacturer(medicineToEdit.manufacturer || '');
    } else {
      setBrandName('');
      setSaltComposition('');
      setForm('Tablet');
      setStrength('');
      setManufacturer('');
    }
    setError(null);
  }, [isOpen, medicineToEdit]);

  if (!isOpen) return null;

  const handleClose = () => {
    setBrandName('');
    setSaltComposition('');
    setForm('Tablet');
    setStrength('');
    setManufacturer('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!brandName.trim()) {
      setError('Please provide a medicine or brand name.');
      return;
    }
    if (!saltComposition.trim()) {
      setError('Please provide generic salt composition.');
      return;
    }
    if (!strength.trim()) {
      setError('Please specify the dosage strength (e.g. 500mg, 10ml).');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && medicineToEdit) {
        const updated = await medicinesApi.updateCustom(medicineToEdit.id, {
          brandName: brandName.trim(),
          saltComposition: saltComposition.trim(),
          form,
          strength: strength.trim(),
          manufacturer: manufacturer.trim() || undefined,
        });

        if (onMedicineUpdated) {
          onMedicineUpdated(updated);
        } else if (onMedicineAdded) {
          onMedicineAdded(updated);
        }
      } else {
        const newMed = await medicinesApi.addCustom({
          brandName: brandName.trim(),
          saltComposition: saltComposition.trim(),
          form,
          strength: strength.trim(),
          manufacturer: manufacturer.trim() || undefined,
        });

        onMedicineAdded?.(newMed);
      }
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || (isEditMode ? 'Failed to update custom medicine' : 'Failed to add custom medicine');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
              isEditMode ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isEditMode ? <Edit3 className="w-5 h-5" /> : <Pill className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditMode ? 'Edit Custom Medicine' : 'Add Custom Medicine'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isEditMode
                  ? 'Update brand details, dosage strength, or salt composition.'
                  : 'Add specialized brands & salt formulations to your clinic formulary.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Medicine / Brand Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Brand / Medicine Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. MySpecial Brand 500, Calpol 650"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Form & Strength */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Dosage Form <span className="text-red-500">*</span>
              </label>
              <select
                value={form}
                onChange={(e) => setForm(e.target.value as DosageForm)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Ointment">Ointment</option>
                <option value="Drops">Drops</option>
                <option value="Inhaler">Inhaler</option>
                <option value="Powder">Powder</option>
                <option value="Lotion">Lotion</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Strength <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 500mg, 650mg, 10ml"
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>

          {/* Generic / Salt Composition */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Generic / Salt Composition <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol 500mg + Caffeine 30mg"
              value={saltComposition}
              onChange={(e) => setSaltComposition(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Manufacturer */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Manufacturer / Pharma Brand (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Sun Pharma, Cipla, GSK"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center space-x-2 px-5 py-2.5 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md transition-all ${
                isEditMode
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isEditMode ? (
                <Edit3 className="w-4 h-4" />
              ) : (
                <Pill className="w-4 h-4" />
              )}
              <span>
                {loading
                  ? isEditMode
                    ? 'Updating...'
                    : 'Adding...'
                  : isEditMode
                  ? 'Update Medicine'
                  : 'Save to Formulary'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
