import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicRxApi } from '../../api/client';
import { PrescriptionDetail } from '../../types';
import {
  Printer,
  Calendar,
  Phone,
  AlertTriangle,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Share2,
} from 'lucide-react';

export const PublicPrescriptionPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setError('Prescription link is invalid or missing.');
      setLoading(false);
      return;
    }

    const fetchPrescription = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await publicRxApi.getPrescription(token);
        setPrescription(data);
      } catch (err: any) {
        if (err.response?.status === 410) {
          setError('This digital prescription link has expired. Please contact the clinic for a fresh copy.');
        } else if (err.response?.status === 404) {
          setError('Prescription not found or link is invalid.');
        } else if (err.response?.status === 429) {
          setError('Too many requests. Please wait a moment and refresh the page.');
        } else {
          setError(err.response?.data?.message || 'Failed to load digital prescription.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Prescription for ${prescription?.patientName}`,
        text: `Digital Prescription from ${prescription?.clinic?.clinicName}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg animate-pulse mb-4">
          <Stethoscope className="w-6 h-6" />
        </div>
        <p className="text-slate-600 font-semibold text-sm">Verifying secure prescription token...</p>
        <p className="text-slate-400 text-xs mt-1">DocOS Encrypted Patient Portal</p>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Unable to View Prescription</h2>
          <p className="text-sm text-slate-600">{error || 'This prescription link is invalid.'}</p>
          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
            If you need a copy of your prescription, please reach out to your doctor or clinic reception.
          </div>
        </div>
      </div>
    );
  }

  const clinic = prescription.clinic;
  const vitals = prescription.vitals;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Top Floating App Bar (Hidden on print) */}
      <div className="no-print bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">DocOS Digital Rx</span>
              <span className="block text-[11px] text-slate-500 font-medium">Verified Patient Consultation</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied Link!' : 'Share'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Prescription</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Prescription Paper Document */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 sm:p-12 space-y-6">
          {/* Clinic & Doctor Header */}
          <div className="border-b-2 border-emerald-700 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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

            <div className="sm:text-right text-xs text-slate-500 space-y-1">
              <div className="flex items-center sm:justify-end space-x-1 font-semibold text-slate-700">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{clinic.phone}</span>
              </div>
              {clinic.email && <div>{clinic.email}</div>}
              {clinic.address && (
                <div className="sm:max-w-[240px] text-[11px] leading-tight text-slate-600">
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

          {/* Patient Demographics Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Patient Name</span>
              <span className="font-bold text-slate-900 text-sm">{prescription.patientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Age / Gender</span>
              <span className="font-semibold text-slate-800">{prescription.age} Yrs / {prescription.gender}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Patient ID</span>
              <span className="font-mono font-bold text-emerald-700">{prescription.patientUid}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Prescribed Date</span>
              <span className="font-semibold text-slate-800">
                {new Date(prescription.prescribedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Allergy Alert */}
          {prescription.allergies && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-800 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>PATIENT ALLERGIES: {prescription.allergies}</span>
            </div>
          )}

          {/* Clinical Impression & Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vitals */}
            {vitals && (
              <div className="text-xs bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
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
                                <span className={`font-semibold ${hasAbnormalBp ? 'text-rose-700 font-bold' : 'text-slate-800'}`}>
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
                                <span className={`font-semibold ${item.isAbnormal ? 'text-rose-700 font-bold' : 'text-slate-800'}`}>
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
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Diagnosis & Complaints */}
            <div className="text-xs bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2">
              {prescription.diagnosis && (
                <div>
                  <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px] block">
                    Diagnosis / Clinical Impression
                  </span>
                  <span className="text-slate-900 font-bold text-sm">{prescription.diagnosis}</span>
                </div>
              )}
              {prescription.chiefComplaints && (
                <div>
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Chief Complaints
                  </span>
                  <span className="text-slate-800 font-medium">{prescription.chiefComplaints}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prescribed Medicines (Rx) */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold text-base">
              <span className="text-2xl font-serif italic">℞</span>
              <span>Prescribed Medicines</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Medicine (Brand & Generic Salt)</th>
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

          {/* Diagnostic Lab Orders (Phase 2D) */}
          {prescription.labOrders && prescription.labOrders.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                <span>Diagnostic Lab Tests Recommended</span>
              </div>

              <div className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-50/30">
                <table className="w-full text-left text-xs">
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
                        <td className="py-2.5 px-3 font-bold text-indigo-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {lab.testName} <span className="font-mono text-slate-500 font-normal">({lab.testCode})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{lab.category}</td>
                        <td className="py-2.5 px-3 text-slate-600">{lab.sampleType || 'Blood'}</td>
                        <td className="py-2.5 px-3">
                          {lab.fastingRequired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Fasting Required
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Non-fasting</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {lab.specialInstructions || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Medical Advice & Guidelines (Phase 2D) */}
          {((prescription.adviceItems && prescription.adviceItems.length > 0) || prescription.generalAdvice) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Doctor's Advice & Guidelines</span>
              </div>

              <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-3 text-xs">
                {prescription.adviceItems && prescription.adviceItems.length > 0 && (
                  <ul className="space-y-2 list-disc list-inside text-slate-800">
                    {prescription.adviceItems.map((adv) => (
                      <li key={adv.id} className="leading-relaxed">
                        <span className="font-medium">{adv.adviceText}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {prescription.generalAdvice && (
                  <div className="pt-2 border-t border-emerald-100/80 text-slate-700">
                    <span className="font-bold text-emerald-900 block text-[10px] uppercase tracking-wider mb-0.5">
                      General Instructions:
                    </span>
                    <span className="leading-relaxed">{prescription.generalAdvice}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Follow-up Consultation Date */}
          {prescription.followUpDate && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2 text-xs font-bold text-emerald-800">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>
                Recommended Follow-up Visit:{' '}
                {new Date(prescription.followUpDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Doctor Signature & Authentication Block */}
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Authenticated by DocOS</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Security Token: {token?.slice(0, 16)}...
              </div>
              {prescription.expiresAt && (
                <div className="text-[10px] text-slate-500 flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Valid until {new Date(prescription.expiresAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center sm:text-right min-w-[200px] self-end">
              <div className="border-b border-dashed border-slate-400 pb-8 mb-1"></div>
              <div className="font-bold text-slate-900 text-sm">{clinic.doctorName}</div>
              {clinic.regNumber && (
                <div className="text-[10px] text-slate-500 font-mono">Medical Reg: {clinic.regNumber}</div>
              )}
              {clinic.qualifications && (
                <div className="text-[10px] text-slate-500">{clinic.qualifications}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPrescriptionPage;
