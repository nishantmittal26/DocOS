import React, { useState, useEffect } from 'react';
import { labsApi, clinicsApi } from '../../api/client';
import { LabTestMaster, LabTestPanel, CreateLabTestRequest, CreateLabPanelRequest, ClinicQuotaStatus } from '../../types';
import {
  FlaskConical,
  Layers,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Edit2,
  Trash2,
  Filter,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const LabTestsSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tests' | 'panels'>('panels');
  const [tests, setTests] = useState<LabTestMaster[]>([]);
  const [panels, setPanels] = useState<LabTestPanel[]>([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState<ClinicQuotaStatus | null>(null);
  const [hasLabModule, setHasLabModule] = useState<boolean>(true);

  // Search & Filter
  const [testSearch, setTestSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Custom Test Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testForm, setTestForm] = useState<CreateLabTestRequest>({
    testCode: '',
    testName: '',
    category: 'Biochemistry',
    sampleType: 'Blood',
    fastingRequired: false,
  });
  const [savingTest, setSavingTest] = useState(false);

  // Panel Modal
  const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [panelName, setPanelName] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [savingPanel, setSavingPanel] = useState(false);
  const [panelSearchQuery, setPanelSearchQuery] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotaData, testsData, panelsData] = await Promise.allSettled([
        clinicsApi.getCurrentSubscriptionQuota(),
        labsApi.getTests(),
        labsApi.getPanels(),
      ]);

      if (quotaData.status === 'fulfilled') {
        setQuota(quotaData.value);
      }

      if (testsData.status === 'fulfilled') {
        setTests(testsData.value);
        setHasLabModule(true);
      } else {
        // Check if 403 entitlement error
        const err = testsData.reason;
        if (err.response?.status === 403) {
          setHasLabModule(false);
        }
      }

      if (panelsData.status === 'fulfilled') {
        setPanels(panelsData.value);
      }
    } catch (err) {
      console.error('Failed to load lab data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTest(true);
    try {
      const created = await labsApi.createTest({
        ...testForm,
        testCode: testForm.testCode.trim().toUpperCase(),
        testName: testForm.testName.trim(),
      });
      setTests((prev) => [...prev, created]);
      setIsTestModalOpen(false);
      setTestForm({
        testCode: '',
        testName: '',
        category: 'Biochemistry',
        sampleType: 'Blood',
        fastingRequired: false,
      });
      setMessage({ type: 'success', text: `Test "${created.testName}" created successfully!` });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create lab test');
    } finally {
      setSavingTest(false);
    }
  };

  const handleOpenPanelModal = (panel?: LabTestPanel) => {
    if (panel) {
      setEditingPanelId(panel.id);
      setPanelName(panel.name);
      setSelectedTestIds(panel.tests.map((t) => t.id));
    } else {
      setEditingPanelId(null);
      setPanelName('');
      setSelectedTestIds([]);
    }
    setPanelSearchQuery('');
    setIsPanelModalOpen(true);
  };

  const toggleTestInPanel = (testId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTestIds.length === 0) {
      alert('Please select at least one lab test for this panel bundle.');
      return;
    }

    setSavingPanel(true);
    try {
      if (editingPanelId) {
        const updated = await labsApi.updatePanel(editingPanelId, {
          name: panelName.trim(),
          isActive: true,
          testIds: selectedTestIds,
        });
        setPanels((prev) => prev.map((p) => (p.id === editingPanelId ? updated : p)));
        setMessage({ type: 'success', text: `Panel "${updated.name}" updated successfully!` });
      } else {
        const created = await labsApi.createPanel({
          name: panelName.trim(),
          testIds: selectedTestIds,
        });
        setPanels((prev) => [...prev, created]);
        setMessage({ type: 'success', text: `Panel "${created.name}" created successfully!` });
      }
      setIsPanelModalOpen(false);
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save panel');
    } finally {
      setSavingPanel(false);
    }
  };

  const handleDeletePanel = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete panel bundle "${name}"?`)) return;
    try {
      await labsApi.deletePanel(id);
      setPanels((prev) => prev.filter((p) => p.id !== id));
      setMessage({ type: 'success', text: `Panel "${name}" removed.` });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete panel');
    }
  };

  const categories = Array.from(new Set(tests.map((t) => t.category))).filter(Boolean);

  const filteredTests = tests.filter((t) => {
    const q = testSearch.trim().toLowerCase();
    const matchesQuery = !q || t.testName.toLowerCase().includes(q) || t.testCode.toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'All' || t.category === categoryFilter;
    return matchesQuery && matchesCat;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Diagnostic Labs & Panel Bundler</h1>
            <p className="text-xs text-slate-500">
              Manage custom laboratory investigations and bundle frequent test groups for 1-click consultation ordering.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'tests' ? (
            <button
              onClick={() => setIsTestModalOpen(true)}
              disabled={!hasLabModule}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Test</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenPanelModal()}
              disabled={!hasLabModule}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Panel Bundle</span>
            </button>
          )}
        </div>
      </div>

      {/* Plan Entitlement Warning if HasLabModule is False */}
      {!hasLabModule && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900 text-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">Lab Module Not Enabled on Current Plan</div>
            <p className="text-amber-800 leading-relaxed">
              Your clinic's current subscription plan ({quota?.planName || 'Starter'}) does not include the Diagnostic Lab Ordering Module.
              Contact DocOS support or upgrade your subscription plan to unlock full lab ordering and panel bundles during consultations.
            </p>
          </div>
        </div>
      )}

      {/* Status Message */}
      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('panels')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'panels'
              ? 'border-indigo-600 text-indigo-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Panel Bundles ({panels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
            activeTab === 'tests'
              ? 'border-indigo-600 text-indigo-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Lab Tests Formulary ({tests.length})</span>
        </button>
      </div>

      {/* Tab 1: Panel Bundles */}
      {activeTab === 'panels' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Panels allow doctors to order multiple correlated tests (e.g. Fever Panel, Diabetic Screen, Lipid Profile) with a single click during patient consultation.
          </p>

          {loading ? (
            <div className="text-center py-16 text-slate-400 text-xs">Loading lab panels...</div>
          ) : panels.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 space-y-3">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">No Lab Panels Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create bundles like "Fever Workup" (CBC + Dengue + Widal + Urine RE) to save time during OPD visits.
              </p>
              <button
                onClick={() => handleOpenPanelModal()}
                disabled={!hasLabModule}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Panel</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {panels.map((panel) => (
                <div
                  key={panel.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col justify-between hover:border-indigo-200 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {panel.tests.length}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{panel.name}</h3>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {panel.tests.length} investigations bundled
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenPanelModal(panel)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Panel"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePanel(panel.id, panel.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Panel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {panel.tests.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                        >
                          {t.testName}
                          {t.fastingRequired && (
                            <span className="ml-1 text-[9px] text-amber-700 font-bold bg-amber-100 px-1 rounded">
                              F
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Clinic Scoped Bundle</span>
                    <span className="text-emerald-700 font-bold">Active in Consultation</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Lab Tests Catalog */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tests by name or code (e.g. CBC, Lipid, HbA1c)..."
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                className="w-full text-xs outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-semibold text-slate-700"
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Test Code</th>
                    <th className="py-3 px-4">Test Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Sample Type</th>
                    <th className="py-3 px-4">Preparation</th>
                    <th className="py-3 px-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTests.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{test.testCode}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{test.testName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          {test.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{test.sampleType || 'Blood'}</td>
                      <td className="py-3 px-4">
                        {test.fastingRequired ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Fasting Required
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Non-fasting</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {test.isCustom ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Clinic Custom
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Standard
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Add Clinic Custom Lab Test</h3>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Test Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIT_D3, CRP, FERRITIN"
                  value={testForm.testCode}
                  onChange={(e) => setTestForm({ ...testForm, testCode: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-mono font-bold focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Test Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25-Hydroxy Vitamin D (Total)"
                  value={testForm.testName}
                  onChange={(e) => setTestForm({ ...testForm, testName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={testForm.category}
                    onChange={(e) => setTestForm({ ...testForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500"
                  >
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Hematology">Hematology</option>
                    <option value="Serology">Serology</option>
                    <option value="Microbiology">Microbiology</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Special Investigation">Special Investigation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sample Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Blood, Serum, Urine"
                    value={testForm.sampleType}
                    onChange={(e) => setTestForm({ ...testForm, sampleType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="fastingToggle"
                  checked={testForm.fastingRequired}
                  onChange={(e) => setTestForm({ ...testForm, fastingRequired: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <label htmlFor="fastingToggle" className="font-semibold text-slate-700 cursor-pointer">
                  Fasting sample required (8-12 hours overnight)
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTest}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {savingTest ? 'Saving...' : 'Add Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Panel Bundle Modal */}
      {isPanelModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingPanelId ? 'Edit Panel Bundle' : 'Create New Panel Bundle'}
              </h3>
              <button
                onClick={() => setIsPanelModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePanel} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Panel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Fever Panel, Diabetic Annual Review, Thyroid Profile"
                  value={panelName}
                  onChange={(e) => setPanelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none font-bold focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">
                    Select Tests to Bundle ({selectedTestIds.length} selected)
                  </label>
                  <span className="text-[10px] text-slate-400">Click to toggle tests</span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search test formulary to add..."
                    value={panelSearchQuery}
                    onChange={(e) => setPanelSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 outline-none text-xs"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                  {tests
                    .filter((t) => {
                      const q = panelSearchQuery.trim().toLowerCase();
                      return !q || t.testName.toLowerCase().includes(q) || t.testCode.toLowerCase().includes(q);
                    })
                    .map((t) => {
                      const isSelected = selectedTestIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTestInPanel(t.id)}
                          className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50 border border-indigo-200 text-indigo-900' : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-xs">{t.testName}</span>
                            <span className="font-mono text-[10px] text-slate-400 ml-1.5">({t.testCode})</span>
                            <span className="text-[10px] text-slate-500 ml-2">[{t.category}]</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPanelModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPanel}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {savingPanel ? 'Saving...' : 'Save Panel Bundle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabTestsSettingsPage;
