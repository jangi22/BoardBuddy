import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Clock, UserCheck, FileCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { ActivityLog, VerificationLog } from '../../types';

export const ActivityLogsView: React.FC = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
  const [tab, setTab] = useState<'ACTIVITY' | 'VERIFICATION'>('ACTIVITY');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const [actRes, verRes] = await Promise.all([
        supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('verification_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      if (!actRes.error && actRes.data) {
        setActivityLogs(actRes.data as any);
      }
      if (!verRes.error && verRes.data) {
        setVerificationLogs(verRes.data as any);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">System Activity & Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable security audit trail of administrative approvals, document evaluations, and student sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('ACTIVITY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'ACTIVITY'
                ? 'bg-[#6847E8] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            System Activity ({activityLogs.length})
          </button>
          <button
            onClick={() => setTab('VERIFICATION')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === 'VERIFICATION'
                ? 'bg-[#6847E8] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Verification Audits ({verificationLogs.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {tab === 'ACTIVITY' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#25223A] whitespace-nowrap">
                      {log.user_name || 'System / AI'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] font-bold text-[#6847E8] bg-purple-50 px-2 py-0.5 rounded-md">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 leading-relaxed">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Reviewee Applicant</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Transition</th>
                  <th className="py-3 px-4">Audit Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verificationLogs.map((vlog) => (
                  <tr key={vlog.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {new Date(vlog.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#25223A] whitespace-nowrap">
                      {vlog.user_name || vlog.user_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#6847E8]">
                      {vlog.action}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] font-mono">
                      <span className="text-slate-500">{vlog.previous_status}</span> &rarr;{' '}
                      <span className="font-bold text-emerald-700">{vlog.new_status}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 leading-relaxed">
                      {vlog.note || 'N/A'}
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
