import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  FileText,
  Sliders,
  AlertTriangle,
  Calendar,
  Phone,
  Share2,
  Copy,
  Check,
  FlaskConical,
} from 'lucide-react';
import { PrescriptionDetail } from '../types';
import { visitsApi } from '../api/client';

interface PrescriptionPrintModalProps {
  isOpen: boolean;
  prescription: PrescriptionDetail | null;
  onClose: () => void;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
  isOpen,
  prescription,
  onClose,
}) => {
  // Mode selection: default to 'pad' if clinic has hideLetterheadOnPrint set, otherwise 'blank'
  const [printMode, setPrintMode] = useState<'blank' | 'pad'>(
    prescription?.clinic?.hideLetterheadOnPrint ? 'pad' : 'blank'
  );
  const [marginTopMm, setMarginTopMm] = useState<number>(
    prescription?.clinic?.letterheadMarginTopMm || 60
  );
  const [bottomMarginMm, setBottomMarginMm] = useState<number>(
    prescription?.clinic?.printBottomMarginMm || 0
  );

  // Digital Share Link state (Phase 2D)
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [generatingShare, setGeneratingShare] = useState<boolean>(false);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  if (!isOpen || !prescription) return null;

  const handlePrint = () => {
    // Phase 2D: Mark as printed to track revisions and PRINT audit
    if (prescription.id) {
      visitsApi.markPrinted(prescription.id).catch((err) => {
        console.warn('Could not record print audit', err);
      });
    }
    window.print();
  };

  const handleGenerateShareLink = async () => {
    setGeneratingShare(true);
    try {
      const res = await visitsApi.generateShareToken(prescription.id);
      const url = `${window.location.origin}/rx/${res.token}`;
      setShareUrl(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate digital prescription link');
    } finally {
      setGeneratingShare(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const clinic = prescription.clinic;
  const vitals = prescription.vitals;

  return createPortal(
    <div className="print-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="print-modal-container bg-slate-100 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-white px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Prescription Print & Preview</h3>
              <p className="text-xs text-slate-500">
                Patient: <span className="font-semibold text-slate-700">{prescription.patientName}</span> ({prescription.patientUid})
              </p>
            </div>
          </div>

          {/* Dual-Mode Selector */}
          <div className="flex items-center space-x-3 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPrintMode('blank')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                printMode === 'blank'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Blank Paper (With Header)</span>
            </button>
            <button
              onClick={() => setPrintMode('pad')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                printMode === 'pad'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Pre-printed Pad (Margin Offset)</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {printMode === 'pad' && (
              <div className="flex items-center space-x-3 text-xs text-slate-600 mr-2">
                <div className="flex items-center space-x-1">
                  <span>Top:</span>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={marginTopMm}
                    onChange={(e) => setMarginTopMm(parseInt(e.target.value) || 0)}
                    className="w-12 px-1.5 py-1 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                  />
                  <span>mm</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Bottom:</span>
                  <input
                    type="number"
                    min="0"
                    max="80"
                    value={bottomMarginMm}
                    onChange={(e) => setBottomMarginMm(parseInt(e.target.value) || 0)}
                    className="w-12 px-1.5 py-1 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                  />
                  <span>mm</span>
                </div>
              </div>
            )}

            {/* Share Digital Rx Button (Phase 2D) */}
            <button
              onClick={handleGenerateShareLink}
              disabled={generatingShare}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition-all"
              title="Generate a secure public web link for patient"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{generatingShare ? 'Generating...' : 'Share Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Now</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Digital Share Link Ribbon (if generated) */}
        {shareUrl && (
          <div className="no-print bg-indigo-50 border-b border-indigo-200 px-6 py-2.5 flex items-center justify-between text-xs text-indigo-900 animate-in slide-in-from-top-1">
            <div className="flex items-center space-x-2 truncate mr-4">
              <span className="font-bold whitespace-nowrap">Secure Public Rx Link:</span>
              <span className="font-mono text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200 truncate select-all">
                {shareUrl}
              </span>
            </div>
            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all shrink-0"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedShare ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        )}

        {/* Prescription Paper Preview */}
        <div className="print-page-wrapper flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
          <div
            className={`print-page bg-white shadow-xl rounded-xl sm:rounded-none w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 text-slate-900 text-sm flex flex-col justify-between ${
              printMode === 'pad' ? 'pad-mode' : ''
            }`}
            style={{
              paddingTop: printMode === 'pad' ? `${marginTopMm}mm` : undefined,
              paddingBottom: printMode === 'pad' ? `${bottomMarginMm}mm` : undefined,
            }}
          >
            <div>
              {/* DIGITAL LETTERHEAD (Hidden in 'pad' mode) */}
              {printMode === 'blank' && (
                <div className="digital-header border-b-2 border-emerald-700 pb-5 mb-6 flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-black text-emerald-800 tracking-tight uppercase">
                      {clinic.clinicName}
                    </h1>
                    <div className="text-lg font-bold text-slate-900 mt-1">
                      {clinic.doctorName}
                    </div>
                    {clinic.qualifications && (
                      <div className="text-xs font-semibold text-slate-600">
                        {clinic.qualifications}
                      </div>
                    )}
                    {clinic.specialization && (
                      <div className="text-xs font-medium text-emerald-700">
                        {clinic.specialization}
                      </div>
                    )}
                    {clinic.regNumber && (
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        Reg. No: <span className="font-semibold text-slate-700">{clinic.regNumber}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs text-slate-500 space-y-1">
                    <div className="flex items-center justify-end space-x-1 font-semibold text-slate-700">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{clinic.phone}</span>
                    </div>
                    {clinic.email && <div>{clinic.email}</div>}
                    {clinic.address && (
                      <div className="max-w-[220px] text-right text-[11px] leading-tight text-slate-600">
                        {clinic.address}
                      </div>
                    )}
                    {clinic.clinicTimings && (
                      <div className="text-[11px] text-emerald-800 font-medium">
                        {clinic.clinicTimings}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PATIENT DEMOGRAPHICS BAR */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Patient Name</span>
                  <span className="font-bold text-slate-900 text-sm">{prescription.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Age / Gender</span>
                  <span className="font-semibold text-slate-800">{prescription.age} Yrs / {prescription.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Patient ID</span>
                  <span className="font-mono font-bold text-emerald-700">{prescription.patientUid}</span>
                </div>
                <div className="text-right sm:text-left">
                  <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">Date</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(prescription.prescribedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* ALLERGY ALERT (IF ANY) */}
              {prescription.allergies && (
                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-xs text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>ALLERGIES: {prescription.allergies}</span>
                </div>
              )}

              {/* VITALS & CLINICAL IMPRESSION */}
              <div className="mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vitals */}
                {vitals && (
                  <div className="text-xs bg-white border border-slate-200 rounded-xl p-3">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-2">
                      Vitals Recorded
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-slate-600">
                      {vitals.recordedVitals && vitals.recordedVitals.length > 0 ? (
                        <>
                          {(() => {
                            const bpItems = vitals.recordedVitals.filter((v) => v.pairGroup === 'BP');
                            const nonBp = vitals.recordedVitals.filter((v) => v.pairGroup !== 'BP');
                            const hasAbnormalBp = bpItems.some((v) => v.isAbnormal);

                            return (
                              <>
                                {bpItems.length > 0 && (
                                  <div>
                                    <span className={`text-[10px] block ${hasAbnormalBp ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                                      BP {hasAbnormalBp ? '*' : ''}
                                    </span>
                                    <span className={`font-semibold ${hasAbnormalBp ? 'text-rose-700' : 'text-slate-800'}`}>
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
                                  <div key={item.code}>
                                    <span className={`text-[10px] block uppercase ${item.isAbnormal ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                                      {item.displayName} {item.isAbnormal ? '*' : ''}
                                    </span>
                                    <span className={`font-semibold ${item.isAbnormal ? 'text-rose-700' : 'text-slate-800'}`}>
                                      {item.valueNumeric !== undefined ? item.valueNumeric : item.valueText}
                                      {item.unitSnapshot ? ` ${item.unitSnapshot}` : ''}
                                    </span>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          {(vitals.systolicBp || vitals.diastolicBp) && (
                            <div>
                              <span className="text-slate-400 text-[10px] block">BP</span>
                              <span className="font-semibold text-slate-800">{vitals.systolicBp}/{vitals.diastolicBp} mmHg</span>
                            </div>
                          )}
                          {vitals.pulseBpm && (
                            <div>
                              <span className="text-slate-400 text-[10px] block">Pulse</span>
                              <span className="font-semibold text-slate-800">{vitals.pulseBpm} bpm</span>
                            </div>
                          )}
                          {vitals.temperatureF && (
                            <div>
                              <span className="text-slate-400 text-[10px] block">Temp</span>
                              <span className="font-semibold text-slate-800">{vitals.temperatureF} °F</span>
                            </div>
                          )}
                          {vitals.spo2 && (
                            <div>
                              <span className="text-slate-400 text-[10px] block">SpO2</span>
                              <span className="font-semibold text-slate-800">{vitals.spo2} %</span>
                            </div>
                          )}
                          {vitals.sugar && (
                            <div>
                              <span className="text-slate-400 text-[10px] block">Sugar</span>
                              <span className="font-semibold text-slate-800">{vitals.sugar}</span>
                            </div>
                          )}
                          {vitals.weightKg && (
                            <div>
                              <span className="text-slate-400 text-[10px] block">Weight</span>
                              <span className="font-semibold text-slate-800">{vitals.weightKg} kg</span>
                            </div>
                          )}
                          {vitals.bmi && (
                            <div>
                              <span className="text-slate-400 text-[10px] block">BMI</span>
                              <span className="font-semibold text-slate-800">{vitals.bmi}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Chief Complaints & Diagnosis */}
                <div className="text-xs bg-white border border-slate-200 rounded-xl p-3">
                  {prescription.chiefComplaints && (
                    <div className="mb-2">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                        Chief Complaints
                      </span>
                      <span className="text-slate-800 font-medium">{prescription.chiefComplaints}</span>
                    </div>
                  )}
                  {prescription.diagnosis && (
                    <div>
                      <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] block">
                        Diagnosis / Clinical Impression
                      </span>
                      <span className="text-slate-900 font-bold">{prescription.diagnosis}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PRESCRIPTION (Rx) TABLE */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base mb-3">
                  <span className="text-2xl font-serif italic">℞</span>
                  <span>Prescription (Rx)</span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-8">#</th>
                        <th className="py-2.5 px-3">Medicine (Brand & Salt)</th>
                        <th className="py-2.5 px-3 w-20">Dosage</th>
                        <th className="py-2.5 px-3 w-28">Timing</th>
                        <th className="py-2.5 px-3 w-20">Duration</th>
                        <th className="py-2.5 px-3">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {prescription.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mr-1.5">
                                {item.form}
                              </span>
                              {item.medicineName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 italic">
                              Salt: {item.saltComposition}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                            {item.dosage}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700">
                            {item.timing === 'AfterFood' && 'After Food'}
                            {item.timing === 'BeforeFood' && 'Before Food'}
                            {item.timing === 'WithFood' && 'With Food'}
                            {item.timing === 'Bedtime' && 'At Bedtime'}
                            {item.timing === 'EmptyStomach' && 'Empty Stomach'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {item.durationDays} Days
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {item.instructions || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DIAGNOSTIC LAB ORDERS (Phase 2D) */}
              {prescription.labOrders && prescription.labOrders.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm mb-2">
                    <FlaskConical className="w-4 h-4 text-indigo-600" />
                    <span>Diagnostic Lab Tests Recommended</span>
                  </div>

                  <div className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-50/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-indigo-100/60 text-indigo-900 font-semibold border-b border-indigo-200">
                          <th className="py-2 px-3 w-8">#</th>
                          <th className="py-2 px-3">Test Name & Code</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Sample</th>
                          <th className="py-2 px-3">Preparation</th>
                          <th className="py-2 px-3">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-indigo-100/80">
                        {prescription.labOrders.map((lab, idx) => (
                          <tr key={lab.id} className="hover:bg-indigo-50/50">
                            <td className="py-2 px-3 font-bold text-indigo-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {lab.testName} <span className="font-mono text-slate-500 font-normal">({lab.testCode})</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600">{lab.category}</td>
                            <td className="py-2 px-3 text-slate-600">{lab.sampleType || 'Blood'}</td>
                            <td className="py-2 px-3">
                              {lab.fastingRequired ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Fasting Required
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Non-fasting</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">
                              {lab.specialInstructions || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GENERAL & TEMPLATE ADVICE (Phase 2D) */}
              {((prescription.adviceItems && prescription.adviceItems.length > 0) || prescription.generalAdvice || prescription.followUpDate) && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs space-y-2.5">
                  {prescription.adviceItems && prescription.adviceItems.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-1">
                        Doctor's Specific Guidelines:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-800">
                        {prescription.adviceItems.map((adv) => (
                          <li key={adv.id} className="leading-relaxed">
                            <span className="font-medium">{adv.adviceText}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {prescription.generalAdvice && (
                    <div>
                      <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">
                        General Advice / Dietary Guidelines:
                      </span>
                      <span className="text-slate-800">{prescription.generalAdvice}</span>
                    </div>
                  )}

                  {prescription.followUpDate && (
                    <div className="flex items-center space-x-1.5 text-emerald-800 font-bold pt-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Follow-up Visit: {new Date(prescription.followUpDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DOCTOR SIGNATURE SECTION */}
            <div className="pt-8 border-t border-slate-200 flex justify-between items-end text-xs">
              <div className="text-[10px] text-slate-400 font-mono">
                Prescription generated digitally via DocOS Clinic SaaS
              </div>
              <div className="text-center min-w-[180px]">
                <div className="border-b border-dashed border-slate-400 pb-8 mb-1"></div>
                <div className="font-bold text-slate-900">{clinic.doctorName}</div>
                {clinic.regNumber && (
                  <div className="text-[10px] text-slate-500 font-mono">Reg: {clinic.regNumber}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrescriptionPrintModal;
