import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { visitsApi, medicinesApi } from '../../api/client';
import {
  VisitQueueItem,
  PrescriptionItem,
  Medicine,
  DosageForm,
  DosageTiming,
  PrescriptionDetail,
} from '../../types';
import { PrescriptionPrintModal } from '../../components/PrescriptionPrintModal';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Pill,
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

export const ConsultationRoomPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();

  const [visit, setVisit] = useState<VisitQueueItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Consultation notes state
  const [chiefComplaints, setChiefComplaints] = useState<string>('');
  const [diagnosis, setDiagnosis] = useState<string>('');
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [generalAdvice, setGeneralAdvice] = useState<string>('Take plenty of rest and hydrate well.');

  // Prescription Items
  const [rxItems, setRxItems] = useState<PrescriptionItem[]>([]);

  // Medicine search & add state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Medicine[]>([]);
  const [searching, setSearching] = useState(false);

  // Active medicine being drafted
  const [brandName, setBrandName] = useState('');
  const [saltComposition, setSaltComposition] = useState('');
  const [form, setForm] = useState<DosageForm>('Tablet');
  const [dosage, setDosage] = useState('1-0-1');
  const [timing, setTiming] = useState<DosageTiming>('AfterFood');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [instructions, setInstructions] = useState('');

  // Modals / submission
  const [submitting, setSubmitting] = useState(false);
  const [completedPrescription, setCompletedPrescription] = useState<PrescriptionDetail | null>(null);

  // Load visit details
  useEffect(() => {
    if (!visitId) return;

    const loadVisit = async () => {
      try {
        const queue = await visitsApi.getTodayQueue();
        const current = queue.find((q) => q.id === visitId);
        if (current) {
          setVisit(current);
          if (current.chiefComplaints) setChiefComplaints(current.chiefComplaints);
          if (current.diagnosis) setDiagnosis(current.diagnosis);
          if (current.clinicalNotes) setClinicalNotes(current.clinicalNotes);

          // If prescription exists, load it
          if (current.hasPrescription) {
            const rx = await visitsApi.getPrescription(current.id);
            if (rx) {
              setRxItems(rx.items);
              if (rx.generalAdvice) setGeneralAdvice(rx.generalAdvice);
              if (rx.followUpDate) setFollowUpDate(rx.followUpDate.split('T')[0]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load visit details', err);
      } finally {
        setLoading(false);
      }
    };

    loadVisit();
  }, [visitId]);

  // Debounced medicine formulary search (searches brand name & salt composition)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await medicinesApi.search(searchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectMedicine = (med: Medicine) => {
    setBrandName(med.brandName);
    setSaltComposition(med.saltComposition);
    setForm(med.form);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddMedicineToRx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim() || !saltComposition.trim()) {
      alert('Please specify both Medicine/Brand name and Generic Salt composition');
      return;
    }

    const newItem: PrescriptionItem = {
      medicineName: brandName.trim(),
      saltComposition: saltComposition.trim(),
      form,
      dosage,
      timing,
      durationDays: Number(durationDays) || 5,
      instructions: instructions.trim() || undefined,
    };

    setRxItems([...rxItems, newItem]);

    // Reset draft
    setBrandName('');
    setSaltComposition('');
    setForm('Tablet');
    setDosage('1-0-1');
    setTiming('AfterFood');
    setDurationDays(5);
    setInstructions('');
  };

  const handleRemoveRxItem = (index: number) => {
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const handleCompleteAndPrint = async () => {
    if (!visitId) return;
    if (rxItems.length === 0 && !diagnosis.trim()) {
      if (!window.confirm('No medicines or diagnosis added. Proceed to complete visit?')) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const rxDetail = await visitsApi.completeConsultation({
        visitId,
        chiefComplaints: chiefComplaints.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
        generalAdvice: generalAdvice.trim() || undefined,
        items: rxItems,
      });

      setCompletedPrescription(rxDetail);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete consultation');
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickFollowUp = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFollowUpDate(d.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-500">
        Loading patient consultation session...
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Visit session not found</h2>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
        >
          Return to OPD Queue
        </button>
      </div>
    );
  }

  const vitals = visit.vitals;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navigation & Patient Overview Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to OPD Queue</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCompleteAndPrint}
            disabled={submitting}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : 'Save & Print Prescription'}</span>
          </button>
        </div>
      </div>

      {/* Patient Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black font-mono text-lg flex-shrink-0">
              #{visit.tokenNumber}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-extrabold text-slate-900">{visit.patientName}</h1>
                <span className="font-mono text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded">
                  {visit.patientUid}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {visit.age} Yrs • {visit.gender}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4">
                <span>Phone: <span className="font-mono text-slate-700">{visit.mobileNumber}</span></span>
                {visit.medicalHistory && (
                  <span>Medical History: <span className="text-slate-700 font-medium">{visit.medicalHistory}</span></span>
                )}
              </div>
            </div>
          </div>

          {/* Vitals Ribbon */}
          {vitals && (
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              {(vitals.systolicBp || vitals.diastolicBp) && (
                <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                  <span className="text-slate-400 text-[10px] block">BP</span>
                  <span className="font-bold text-slate-800">{vitals.systolicBp}/{vitals.diastolicBp}</span>
                </div>
              )}
              {vitals.pulseBpm && (
                <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                  <span className="text-slate-400 text-[10px] block">PULSE</span>
                  <span className="font-bold text-slate-800">{vitals.pulseBpm} bpm</span>
                </div>
              )}
              {vitals.temperatureF && (
                <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                  <span className="text-slate-400 text-[10px] block">TEMP</span>
                  <span className="font-bold text-slate-800">{vitals.temperatureF}°F</span>
                </div>
              )}
              {vitals.spo2 && (
                <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                  <span className="text-slate-400 text-[10px] block">SPO2</span>
                  <span className="font-bold text-slate-800">{vitals.spo2}%</span>
                </div>
              )}
              {vitals.weightKg && (
                <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                  <span className="text-slate-400 text-[10px] block">WT</span>
                  <span className="font-bold text-slate-800">{vitals.weightKg} kg</span>
                </div>
              )}
              {vitals.bmi && (
                <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                  <span className="text-slate-400 text-[10px] block">BMI</span>
                  <span className="font-bold text-slate-800">{vitals.bmi}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ALLERGY WARNING ALERT */}
        {visit.allergies && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-3 text-rose-800 text-xs font-bold animate-bounce-short">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <span className="uppercase tracking-wider">Patient Allergy Alert: </span>
              <span className="text-rose-950 underline">{visit.allergies}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Clinical Notes (Left) & Rx Builder (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaints & Clinical Diagnosis */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Clinical Evaluation</span>
            </h2>

            {/* Chief Complaints */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Chief Complaints</label>
                {/* Quick duration helpers */}
                <div className="flex space-x-1">
                  {['x 2 days', 'x 3 days', 'x 1 week'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setChiefComplaints((prev) => `${prev} ${tag}`.trim())}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={3}
                placeholder="e.g. Fever with chills (3 days), productive cough with yellowish phlegm..."
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Diagnosis */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Diagnosis / Provisional Impression <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acute Upper Respiratory Tract Infection (URTI)"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>

            {/* Clinical Notes / Examination findings */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor's Notes & Findings
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Chest: bilateral clear, throat: congested, no cervical lymphadenopathy"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Follow-up Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Follow-up Consultation
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(3)}
                  className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1 rounded-lg font-medium transition-colors"
                >
                  +3 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(7)}
                  className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1 rounded-lg font-medium transition-colors"
                >
                  +1 Week
                </button>
                <button
                  type="button"
                  onClick={() => setQuickFollowUp(14)}
                  className="text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 px-2.5 py-1 rounded-lg font-medium transition-colors"
                >
                  +2 Weeks
                </button>
              </div>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* General Advice */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dietary & General Advice
              </label>
              <input
                type="text"
                placeholder="e.g. Drink lukewarm water, steam inhalation twice daily"
                value={generalAdvice}
                onChange={(e) => setGeneralAdvice(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Rx Prescription Builder */}
        <div className="lg:col-span-8 space-y-4">
          {/* Medicine Search & Form Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>Prescribe Medicines (Brand & Generic Salt Name)</span>
              </h2>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                500+ Indian Drug Formulary
              </span>
            </div>

            {/* Fast Autocomplete Search Bar */}
            <div className="relative">
              <div className="flex items-center px-3 py-2.5 rounded-xl border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-50">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder="Search by Brand Name (e.g. Augmentin, Dolo, Pan 40) or Salt Name (e.g. Paracetamol, Amoxicillin)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm outline-none text-slate-900 placeholder:text-slate-400"
                />
                {searching && <span className="text-[11px] text-slate-400">Searching...</span>}
              </div>

              {/* Autocomplete Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((med) => (
                    <button
                      key={med.id}
                      type="button"
                      onClick={() => handleSelectMedicine(med)}
                      className="w-full text-left p-3 hover:bg-emerald-50/70 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{med.brandName}</span>
                          <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {med.form}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">({med.strength})</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium italic mt-0.5">
                          Salt: {med.saltComposition}
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold px-2 py-1 rounded bg-emerald-50">
                        Select
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Medicine Details & Dosage Regimen Form */}
            <form onSubmit={handleAddMedicineToRx} className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Medicine / Brand Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Augmentin 625 Duo"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Generic / Salt Composition <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin 500mg + Clavulanic Acid 125mg"
                    value={saltComposition}
                    onChange={(e) => setSaltComposition(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-700"
                  />
                </div>
              </div>

              {/* Form, Dosage Chips, Timing, Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Form</label>
                  <select
                    value={form}
                    onChange={(e) => setForm(e.target.value as DosageForm)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
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
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Dosage Pattern
                  </label>
                  <select
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-emerald-800"
                  >
                    <option value="1-0-1">1-0-1 (Twice daily)</option>
                    <option value="1-0-0">1-0-0 (Morning)</option>
                    <option value="0-0-1">0-0-1 (Night)</option>
                    <option value="1-1-1">1-1-1 (Thrice daily)</option>
                    <option value="1-1-1-1">1-1-1-1 (4 times)</option>
                    <option value="SOS">SOS (As needed)</option>
                    <option value="STAT">STAT (Immediately)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Food Timing</label>
                  <select
                    value={timing}
                    onChange={(e) => setTiming(e.target.value as DosageTiming)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="AfterFood">After Food</option>
                    <option value="BeforeFood">Before Food</option>
                    <option value="WithFood">With Food</option>
                    <option value="Bedtime">At Bedtime</option>
                    <option value="EmptyStomach">Empty Stomach</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                  />
                </div>
              </div>

              {/* Instructions & Add Button */}
              <div className="flex items-center space-x-3 pt-1">
                <input
                  type="text"
                  placeholder="Special instructions (e.g. Complete 5-day course, gargle with warm water)"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Rx</span>
                </button>
              </div>
            </form>
          </div>

          {/* Current Prescription Table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <span className="text-xl font-serif italic text-emerald-700">℞</span>
                <span>Active Prescription List ({rxItems.length} Medicines)</span>
              </h2>
            </div>

            {rxItems.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                No medicines added yet. Search and add medicines above.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3 w-8">#</th>
                      <th className="py-2 px-3">Medicine & Salt</th>
                      <th className="py-2 px-3 w-20">Dosage</th>
                      <th className="py-2 px-3 w-24">Timing</th>
                      <th className="py-2 px-3 w-16">Days</th>
                      <th className="py-2 px-3">Instructions</th>
                      <th className="py-2 px-3 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rxItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">
                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded mr-1">
                              {item.form}
                            </span>
                            {item.medicineName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium italic mt-0.5">
                            {item.saltComposition}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                          {item.dosage}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {item.timing === 'AfterFood' && 'After Food'}
                          {item.timing === 'BeforeFood' && 'Before Food'}
                          {item.timing === 'WithFood' && 'With Food'}
                          {item.timing === 'Bedtime' && 'At Bedtime'}
                          {item.timing === 'EmptyStomach' && 'Empty Stomach'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.durationDays}d
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {item.instructions || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRxItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completed Prescription Print Modal */}
      <PrescriptionPrintModal
        isOpen={!!completedPrescription}
        prescription={completedPrescription}
        onClose={() => {
          setCompletedPrescription(null);
          navigate('/');
        }}
      />
    </div>
  );
};
