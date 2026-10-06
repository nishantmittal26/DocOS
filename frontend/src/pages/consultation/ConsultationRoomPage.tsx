import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { visitsApi, medicinesApi, labsApi, adviceApi, clinicsApi } from '../../api/client';
import {
  VisitQueueItem,
  PrescriptionItem,
  Medicine,
  DosageForm,
  DosageTiming,
  PrescriptionDetail,
  PatientPrescriptionTimelineItem,
  LabTestMaster,
  LabTestPanel,
  AdviceTemplate,
  ClinicQuotaStatus,
} from '../../types';
import { shiftIstDateInput, formatDateIST } from '../../utils/dateTime';
import { PrescriptionPrintModal } from '../../components/PrescriptionPrintModal';
import { VitalsModal } from '../../components/VitalsModal';
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
  Info,
  Activity,
  Star,
  FlaskConical,
  Layers,
  FileText,
  Lock,
  Check,
  ChevronDown,
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
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Active medicine being drafted
  const [brandName, setBrandName] = useState('');
  const [saltComposition, setSaltComposition] = useState('');
  const [form, setForm] = useState<DosageForm>('Tablet');
  const [dosage, setDosage] = useState('1-0-1');
  const [timing, setTiming] = useState<DosageTiming>('AfterFood');
  const [durationDays, setDurationDays] = useState<number>(5);
  const [instructions, setInstructions] = useState('');

  // Diagnostic Lab Orders state (Phase 2D)
  const [hasLabModule, setHasLabModule] = useState(true);
  const [quota, setQuota] = useState<ClinicQuotaStatus | null>(null);
  const [allLabTests, setAllLabTests] = useState<LabTestMaster[]>([]);
  const [labPanels, setLabPanels] = useState<LabTestPanel[]>([]);
  const [labSearchQuery, setLabSearchQuery] = useState('');
  const [selectedLabOrders, setSelectedLabOrders] = useState<
    { testId: string; testName: string; testCode: string; category: string; sampleType?: string; fastingRequired: boolean; specialInstructions?: string }[]
  >([]);

  // Advice Snippets state (Phase 2D)
  const [allAdviceTemplates, setAllAdviceTemplates] = useState<AdviceTemplate[]>([]);
  const [selectedAdviceSnippets, setSelectedAdviceSnippets] = useState<{ templateId?: string; text: string }[]>([]);
  const [adviceCategoryFilter, setAdviceCategoryFilter] = useState('All');

  // Modals / submission
  const [submitting, setSubmitting] = useState(false);
  const [completedPrescription, setCompletedPrescription] = useState<PrescriptionDetail | null>(null);
  const [priorRxTimeline, setPriorRxTimeline] = useState<PatientPrescriptionTimelineItem[]>([]);
  const [timelineRxPreview, setTimelineRxPreview] = useState<PrescriptionDetail | null>(null);
  const [loadingTimelineRx, setLoadingTimelineRx] = useState(false);
  const [isVitalsModalOpen, setIsVitalsModalOpen] = useState(false);

  const loadVisit = async () => {
    if (!visitId) return;
    try {
      const queue = await visitsApi.getTodayQueue();
      const current = queue.find((q) => q.id === visitId);
      if (current) {
        setVisit(current);
        if (current.chiefComplaints) setChiefComplaints(current.chiefComplaints);
        if (current.diagnosis) setDiagnosis(current.diagnosis);
        if (current.clinicalNotes) setClinicalNotes(current.clinicalNotes);

        // If prescription exists, load it (including revisions)
        try {
          const timeline = await visitsApi.getPatientPrescriptionTimeline(current.patientId, current.id);
          setPriorRxTimeline(timeline);
        } catch {
          setPriorRxTimeline([]);
        }

        if (current.hasPrescription) {
          const rx = await visitsApi.getPrescription(current.id);
          if (rx) {
            setRxItems(rx.items || []);
            if (rx.generalAdvice) setGeneralAdvice(rx.generalAdvice);
            if (rx.followUpDate) setFollowUpDate(rx.followUpDate.split('T')[0]);
            if (rx.labOrders && rx.labOrders.length > 0) {
              setSelectedLabOrders(
                rx.labOrders.map((lo) => ({
                  testId: lo.labTestMasterId,
                  testName: lo.testName,
                  testCode: lo.testCode,
                  category: lo.category,
                  sampleType: lo.sampleType,
                  fastingRequired: lo.fastingRequired,
                  specialInstructions: lo.specialInstructions,
                }))
              );
            }
            if (rx.adviceItems && rx.adviceItems.length > 0) {
              setSelectedAdviceSnippets(
                rx.adviceItems.map((ai) => ({
                  templateId: ai.adviceTemplateId,
                  text: ai.adviceText,
                }))
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load visit details', err);
    } finally {
      setLoading(false);
    }
  };

  // Load lab masters & advice templates
  useEffect(() => {
    let labModuleEnabled = true;

    clinicsApi
      .getCurrentSubscriptionQuota()
      .then((q) => {
        setQuota(q);
        labModuleEnabled = q.hasLabModule;
        setHasLabModule(labModuleEnabled);
      })
      .catch(() => {});

    labsApi
      .getTests()
      .then((tests) => {
        setAllLabTests(tests);
        setHasLabModule(true);
      })
      .catch((err) => {
        if (err.response?.status === 403) {
          setHasLabModule(false);
        }
      });

    labsApi.getPanels().then(setLabPanels).catch(() => {});
    adviceApi.getTemplates().then(setAllAdviceTemplates).catch(() => {});
  }, []);

  // Load visit details
  useEffect(() => {
    loadVisit();
  }, [visitId]);

  // Debounced medicine formulary search (searches brand name & salt composition, optional favorites filter)
  useEffect(() => {
    if (onlyFavorites) {
      setSearching(true);
      medicinesApi
        .getFavorites()
        .then((res) => {
          if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            setSearchResults(
              res.filter(
                (m) =>
                  m.brandName.toLowerCase().includes(q) ||
                  m.saltComposition.toLowerCase().includes(q)
              )
            );
          } else {
            setSearchResults(res);
          }
        })
        .catch(console.error)
        .finally(() => setSearching(false));
      return;
    }

    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await medicinesApi.search(searchQuery.trim(), onlyFavorites);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, onlyFavorites]);

  const handleToggleFavorite = async (e: React.MouseEvent, med: Medicine) => {
    e.stopPropagation();
    try {
      const res = await medicinesApi.toggleFavorite(med.id);
      setSearchResults((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, isFavorite: res.isFavorite } : m))
      );
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  const handleSelectMedicine = (med: Medicine) => {
    setBrandName(med.brandName);
    setSaltComposition(med.saltComposition);
    setForm(med.form);
    // Prefill default dosage and timing if set
    if (med.defaultDosage) {
      setDosage(med.defaultDosage);
    } else {
      setDosage('1-0-1');
    }
    if (med.defaultTiming) {
      setTiming(med.defaultTiming);
    } else {
      setTiming('AfterFood');
    }
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

  // Lab Orders Handlers (Phase 2D)
  const handleAddLabTest = (test: LabTestMaster) => {
    if (selectedLabOrders.some((lo) => lo.testId === test.id)) return;
    setSelectedLabOrders((prev) => [
      ...prev,
      {
        testId: test.id,
        testName: test.testName,
        testCode: test.testCode,
        category: test.category,
        sampleType: test.sampleType,
        fastingRequired: test.fastingRequired,
        specialInstructions: '',
      },
    ]);
    setLabSearchQuery('');
  };

  const handleAddPanel = (panel: LabTestPanel) => {
    const newItems = panel.tests
      .filter((t) => !selectedLabOrders.some((lo) => lo.testId === t.id))
      .map((t) => ({
        testId: t.id,
        testName: t.testName,
        testCode: t.testCode,
        category: t.category,
        sampleType: t.sampleType,
        fastingRequired: t.fastingRequired,
        specialInstructions: `Panel: ${panel.name}`,
      }));

    setSelectedLabOrders((prev) => [...prev, ...newItems]);
  };

  const handleRemoveLabOrder = (testId: string) => {
    setSelectedLabOrders((prev) => prev.filter((lo) => lo.testId !== testId));
  };

  const handleUpdateLabInstructions = (testId: string, instructions: string) => {
    setSelectedLabOrders((prev) =>
      prev.map((lo) => (lo.testId === testId ? { ...lo, specialInstructions: instructions } : lo))
    );
  };

  // Advice Handlers (Phase 2D)
  const handleToggleAdviceSnippet = (tmpl: AdviceTemplate) => {
    const exists = selectedAdviceSnippets.some((a) => a.templateId === tmpl.id || a.text === tmpl.instructionsText);
    if (exists) {
      setSelectedAdviceSnippets((prev) =>
        prev.filter((a) => a.templateId !== tmpl.id && a.text !== tmpl.instructionsText)
      );
    } else {
      setSelectedAdviceSnippets((prev) => [
        ...prev,
        {
          templateId: tmpl.id,
          text: tmpl.instructionsText,
        },
      ]);
    }
  };

  const handleRemoveAdviceSnippet = (index: number) => {
    setSelectedAdviceSnippets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleViewPriorPrescription = async (timelineVisitId: string) => {
    setLoadingTimelineRx(true);
    try {
      const rx = await visitsApi.getPrescription(timelineVisitId);
      setTimelineRxPreview(rx);
    } catch (err) {
      console.error('Failed to load prior prescription', err);
      alert('Could not load prior prescription.');
    } finally {
      setLoadingTimelineRx(false);
    }
  };

  const handleCompleteAndPrint = async () => {
    if (!visitId) return;
    if (rxItems.length === 0 && selectedLabOrders.length === 0 && !diagnosis.trim()) {
      if (!window.confirm('No medicines, lab tests, or diagnosis added. Proceed to complete visit?')) {
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
        labOrders: selectedLabOrders.map((lo) => ({
          labTestMasterId: lo.testId,
          specialInstructions: lo.specialInstructions?.trim() || undefined,
        })),
        adviceItems: selectedAdviceSnippets.map((adv, idx) => ({
          adviceTemplateId: adv.templateId,
          adviceText: adv.text.trim(),
          displayOrder: idx + 1,
        })),
      });

      setCompletedPrescription(rxDetail);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete consultation');
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickFollowUp = (days: number) => {
    setFollowUpDate(shiftIstDateInput(new Date(), days));
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
          {quota && (
            <div
              className={`hidden sm:flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                quota.isQuotaExceeded
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : quota.isWithinBuffer
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
              }`}
              title={`Used: ${quota.visitsConducted} prescriptions. Quota cycle ends: ${formatDateIST(quota.periodEnd)}`}
            >
              <FileText className={`w-3.5 h-3.5 ${
                quota.isQuotaExceeded ? 'text-rose-600' :
                quota.isWithinBuffer ? 'text-amber-600' :
                'text-emerald-600'
              }`} />
              <span className="font-semibold text-slate-500">Rx Quota:</span>
              <span>
                {quota.visitsConducted} used
                {quota.isUnlimited
                  ? ' (Unlimited)'
                  : ` • ${quota.remainingVisits ?? 0} remaining`}
              </span>
            </div>
          )}

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

      {priorRxTimeline.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">Prior OPD prescriptions</h2>
            <span className="text-xs text-slate-400 font-medium">read-only</span>
          </div>
          <ul className="space-y-2">
            {priorRxTimeline.map((entry) => (
              <li
                key={entry.prescriptionId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl border border-slate-100 bg-slate-50/80"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    {formatDateIST(entry.visitDate)}
                    {entry.doctorName ? ` · Dr. ${entry.doctorName}` : ''}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 truncate">
                    {entry.diagnosis?.trim() || entry.chiefComplaints?.trim() || 'No diagnosis recorded'}
                    {entry.medicineCount > 0 ? ` · ${entry.medicineCount} medicine(s)` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loadingTimelineRx}
                  onClick={() => handleViewPriorPrescription(entry.visitId)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" />
                  View / Print
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            {vitals?.recordedVitals && vitals.recordedVitals.length > 0 ? (
              <>
                {(() => {
                  const bpItems = vitals.recordedVitals.filter((v) => v.pairGroup === 'BP');
                  const nonBp = vitals.recordedVitals.filter((v) => v.pairGroup !== 'BP');
                  const hasAbnormalBp = bpItems.some((v) => v.isAbnormal);

                  return (
                    <>
                      {bpItems.length > 0 && (
                        <div
                          className={`px-2 py-1 rounded-lg border font-mono ${
                            hasAbnormalBp
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <span className={`text-[10px] block ${hasAbnormalBp ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                            BP {hasAbnormalBp ? '(!)' : ''}
                          </span>
                          <span className="font-bold">
                            {bpItems.find((v) => v.code.toUpperCase().includes('SYS'))?.valueNumeric ??
                             bpItems.find((v) => v.code.toUpperCase().includes('SYS'))?.valueText ??
                             '-'}
                            /
                            {bpItems.find((v) => v.code.toUpperCase().includes('DIA'))?.valueNumeric ??
                             bpItems.find((v) => v.code.toUpperCase().includes('DIA'))?.valueText ??
                             '-'} mmHg
                          </span>
                        </div>
                      )}

                      {nonBp.map((item) => (
                        <div
                          key={item.code}
                          className={`px-2 py-1 rounded-lg border font-mono ${
                            item.isAbnormal
                              ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <span className={`text-[10px] block uppercase ${item.isAbnormal ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                            {item.displayName} {item.isAbnormal ? '(!)' : ''}
                          </span>
                          <span className="font-bold">
                            {item.valueNumeric !== undefined ? item.valueNumeric : item.valueText}
                            {item.unitSnapshot ? ` ${item.unitSnapshot}` : ''}
                          </span>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </>
            ) : (vitals && (vitals.systolicBp || vitals.diastolicBp || vitals.pulseBpm || vitals.temperatureF || vitals.spo2 || vitals.sugar || vitals.weightKg || vitals.bmi)) ? (
              <>
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
                {vitals.sugar && (
                  <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                    <span className="text-slate-400 text-[10px] block">SUGAR</span>
                    <span className="font-bold text-slate-800">{vitals.sugar}</span>
                  </div>
                )}
                {vitals.weightKg && (
                  <div className="px-2 py-1 bg-white rounded-lg border border-slate-200 font-mono">
                    <span className="text-slate-400 text-[10px] block">WT</span>
                    <span className="font-bold text-slate-800">{vitals.weightKg} kg</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-slate-400 text-xs italic">No vitals recorded for this visit yet.</span>
            )}

            <button
              type="button"
              onClick={() => setIsVitalsModalOpen(true)}
              className="ml-auto inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
            >
              <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
              <span>Record / Edit Vitals</span>
            </button>
          </div>
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

      {/* Main Grid: Clinical Notes (Left) & Rx + Labs + Advice Builder (Right) */}
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
                placeholder="e.g. Fever with chills (3 days), cough with expectoration..."
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

            {/* Clinical Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor's Notes & Findings
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Chest: clear, throat: congested, no lymphadenopathy"
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

            {/* General Advice Free Text */}
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

        {/* Right Column: Rx Builder + Labs + Advice */}
        <div className="lg:col-span-8 space-y-5">
          {/* Section 1: Medicine Search & Prescribing */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>Prescribe Medicines (Brand & Generic Salt)</span>
              </h2>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    onlyFavorites
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>My Favorites</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="flex items-center px-3 py-2.5 rounded-xl border border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 bg-slate-50">
                <Search className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type="text"
                  placeholder={
                    onlyFavorites
                      ? 'Filter your starred favorite medicines...'
                      : 'Search by Brand Name (e.g. Augmentin, Dolo, Pan 40) or Salt Name (e.g. Paracetamol)...'
                  }
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
                    <div
                      key={med.id}
                      onClick={() => handleSelectMedicine(med)}
                      className="w-full text-left p-3 hover:bg-emerald-50/70 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-start space-x-2">
                        {/* Star Button (Phase 2D: DoctorMedicineFavorite) */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, med)}
                          className="p-1 text-slate-300 hover:text-amber-500 transition-colors mt-0.5"
                          title={med.isFavorite ? 'Remove from favorites' : 'Star as favorite'}
                        >
                          <Star className={`w-4 h-4 ${med.isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
                        </button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-900">{med.brandName}</span>
                            <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              {med.form}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">({med.strength})</span>
                            {med.defaultDosage && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                {med.defaultDosage}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium italic mt-0.5">
                            Salt: {med.saltComposition}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-semibold px-2 py-1 rounded bg-emerald-50">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medicine Regimen Form */}
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
                  placeholder="Special instructions (e.g. Complete 5-day course, avoid dairy)"
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

            {/* Prescribed Medicines List */}
            {rxItems.length > 0 && (
              <div className="pt-2">
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
              </div>
            )}
          </div>

          {/* Section 2: Diagnostic Lab Orders (Phase 2D) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                <span>Diagnostic Lab Orders & Panels</span>
              </h2>
              {hasLabModule ? (
                <span className="text-[11px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  {selectedLabOrders.length} Ordered
                </span>
              ) : (
                <span className="text-[11px] text-amber-800 bg-amber-50 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  Module Not Subscribed
                </span>
              )}
            </div>

            {!hasLabModule ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Diagnostic Lab Module is disabled on your clinic plan. Upgrade subscription to enable lab ordering.
                </span>
              </div>
            ) : (
              <>
                {/* Panel Bundles Quick Select */}
                {labPanels.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Frequent Panel Bundles (1-Click Group Ordering):
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {labPanels.map((panel) => (
                        <button
                          key={panel.id}
                          type="button"
                          onClick={() => handleAddPanel(panel)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                          <Layers className="w-3.5 h-3.5 text-indigo-600" />
                          <span>+ {panel.name} ({panel.tests.length})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Test Search */}
                <div className="relative">
                  <div className="flex items-center px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus-within:border-indigo-500">
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                      type="text"
                      placeholder="Search individual lab tests to order (e.g. CBC, KFT, HbA1c, Thyroid)..."
                      value={labSearchQuery}
                      onChange={(e) => setLabSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs outline-none"
                    />
                  </div>

                  {labSearchQuery.trim().length > 1 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {allLabTests
                        .filter(
                          (t) =>
                            t.testName.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
                            t.testCode.toLowerCase().includes(labSearchQuery.toLowerCase())
                        )
                        .map((t) => (
                          <div
                            key={t.id}
                            onClick={() => handleAddLabTest(t)}
                            className="p-2.5 hover:bg-indigo-50/70 transition-colors flex items-center justify-between cursor-pointer text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{t.testName}</span>
                              <span className="font-mono text-[10px] text-slate-400 ml-1.5">({t.testCode})</span>
                              <span className="text-[10px] text-slate-500 ml-2">[{t.category}]</span>
                            </div>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              + Order
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Ordered Labs Table */}
                {selectedLabOrders.length > 0 && (
                  <div className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-50/20">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-indigo-100/60 text-indigo-900 font-semibold border-b border-indigo-200">
                          <th className="py-2 px-3">Investigation</th>
                          <th className="py-2 px-3 w-28">Prep</th>
                          <th className="py-2 px-3">Special Instructions</th>
                          <th className="py-2 px-3 w-10 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100/80">
                        {selectedLabOrders.map((lab) => (
                          <tr key={lab.testId} className="hover:bg-indigo-50/40">
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {lab.testName}{' '}
                              <span className="font-mono text-[10px] text-slate-500 font-normal">
                                ({lab.testCode})
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {lab.fastingRequired ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  Fasting
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Regular</span>
                              )}
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="text"
                                placeholder="e.g. 12hr overnight fast"
                                value={lab.specialInstructions || ''}
                                onChange={(e) => handleUpdateLabInstructions(lab.testId, e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-indigo-200 rounded-lg bg-white outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLabOrder(lab.testId)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Section 3: Advice Templates & Snippets (Phase 2D) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Doctor's Advice Snippets</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-bold">
                {selectedAdviceSnippets.length} Attached
              </span>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1">
              {['All', 'Dietary', 'General', 'Medication', 'Lifestyle', 'Precautions'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAdviceCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    adviceCategoryFilter === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Advice Snippets Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-slate-100 rounded-xl">
              {allAdviceTemplates
                .filter((t) => adviceCategoryFilter === 'All' || t.category === adviceCategoryFilter)
                .map((tmpl) => {
                  const isChecked = selectedAdviceSnippets.some(
                    (a) => a.templateId === tmpl.id || a.text === tmpl.instructionsText
                  );
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => handleToggleAdviceSnippet(tmpl)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-2 ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>{tmpl.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">[{tmpl.category}]</span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                          {tmpl.instructionsText}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Attached Snippets List */}
            {selectedAdviceSnippets.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Attached to Prescription:
                </span>
                {selectedAdviceSnippets.map((adv, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-800 line-clamp-1">{adv.text}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdviceSnippet(idx)}
                      className="text-slate-400 hover:text-rose-600 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
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

      <PrescriptionPrintModal
        isOpen={!!timelineRxPreview}
        prescription={timelineRxPreview}
        onClose={() => setTimelineRxPreview(null)}
      />

      {/* Vitals Recording Modal */}
      <VitalsModal
        isOpen={isVitalsModalOpen}
        visit={visit}
        onClose={() => setIsVitalsModalOpen(false)}
        onSaved={() => {
          setIsVitalsModalOpen(false);
          loadVisit();
        }}
      />
    </div>
  );
};

export default ConsultationRoomPage;
