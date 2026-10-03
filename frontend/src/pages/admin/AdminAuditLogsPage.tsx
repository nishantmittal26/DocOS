import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, Clock, Activity, FileText, User } from 'lucide-react';
import { adminApi } from '../../api/client';
import { AuditLog } from '../../types';
import { formatDateTimeIST } from '../../utils/dateTime';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('All');
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAuditLogs({
        action: actionFilter === 'All' ? undefined : actionFilter,
        limit: 100,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((log) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.entityName.toLowerCase().includes(q) ||
      log.entityId.toLowerCase().includes(q) ||
      (log.userId && log.userId.toLowerCase().includes(q)) ||
      (log.changesJson && log.changesJson.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Audit & Compliance Logs</h1>
            <p className="text-xs text-slate-500">
              Immutable activity tracking for CREATE, UPDATE, DELETE, LOGIN, and PRINT events across clinics.
            </p>
          </div>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all self-start sm:self-auto"
        >
          Refresh Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by entity, user ID, or changes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs outline-none bg-transparent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-semibold">Action:</span>
          {(['All', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PRINT'] as const).map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                actionFilter === act
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading audit events...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">No audit logs matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTimeIST(log.timestamp)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'UPDATE'
                            ? 'bg-blue-100 text-blue-800'
                            : log.action === 'DELETE'
                            ? 'bg-rose-100 text-rose-800'
                            : log.action === 'LOGIN'
                            ? 'bg-purple-100 text-purple-800'
                            : log.action === 'PRINT'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {log.entityName} <span className="text-slate-400 font-normal">({log.entityId?.slice(0, 8)}...)</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {log.userId ? log.userId.slice(0, 8) + '...' : 'System'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{log.ipAddress || '—'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.changesJson}>
                      {log.changesJson || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
