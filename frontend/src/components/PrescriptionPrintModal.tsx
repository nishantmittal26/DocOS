import React, { useState } from 'react';
import { X, Printer, FileText, Sliders, AlertTriangle, Calendar, Phone, MapPin } from 'lucide-react';
import { PrescriptionDetail } from '../types';

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
  // Mode selection: 'blank' (Mode A) or 'pad' (Mode B)
  const [printMode, setPrintMode] = useState<'blank' | 'pad'>('blank');
  const [marginTopMm, setMarginTopMm] = useState<number>(
    prescription?.clinic?.letterheadMarginTopMm || 60
  );

  if (!isOpen || !prescription) return null;

  const handlePrint = () => {
    window.print();
  };

  const clinic = prescription.clinic;
  const vitals = prescription.vitals;

  return (
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
              <div className="flex items-center space-x-1.5 text-xs text-slate-600 mr-2">
                <span>Top Margin:</span>
                <input
                  type="number"
                  min="20"
                  max="120"
                  value={marginTopMm}
                  onChange={(e) => setMarginTopMm(parseInt(e.target.value) || 0)}
                  className="w-14 px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                />
                <span>mm</span>
              </div>
            )}
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

        {/* Prescription Paper Preview */}
        <div className="print-page-wrapper flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200/60 flex justify-center">
          <div
            className={`print-page bg-white shadow-xl rounded-xl sm:rounded-none w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 text-slate-900 text-sm flex flex-col justify-between ${
              printMode === 'pad' ? 'pad-mode' : ''
            }`}
            style={{
              paddingTop: printMode === 'pad' ? `${marginTopMm}mm` : undefined,
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

              {/* GENERAL ADVICE & FOLLOW-UP */}
              {(prescription.generalAdvice || prescription.followUpDate) && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-6 text-xs space-y-2">
                  {prescription.generalAdvice && (
                    <div>
                      <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider">
                        General Advice / Dietary Guidelines:
                      </span>
                      <span className="text-slate-800">{prescription.generalAdvice}</span>
                    </div>
                  )}
                  {prescription.followUpDate && (
                    <div className="flex items-center space-x-1.5 text-emerald-800 font-bold">
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
    </div>
  );
};
