import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { QuizAttempt } from '../../types';

export const QuizAnalytics: React.FC = () => {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttempts();
  }, []);

  const fetchAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .order('completed_at', { ascending: false });
      
      if (!error && data) {
        setAttempts(data as any);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const totalAttempts = attempts.length;
  const passedCount = attempts.filter(a => a.passed).length;
  const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
  const avgScore = totalAttempts > 0 
    ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Reviewee Examination Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time aggregate performance metrics across board simulation drills and topics.
          </p>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Drills Taken</span>
          <p className="text-2xl font-extrabold text-[#25223A] mt-2">{totalAttempts}</p>
          <p className="text-[11px] text-slate-500 mt-1">Recorded across all examinees</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overall Pass Rate</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">{passRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">{passedCount} passing performances (≥75%)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</span>
          <p className="text-2xl font-extrabold text-[#6847E8] mt-2">{avgScore}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Weighted mean test score</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Threshold</span>
          <p className="text-2xl font-extrabold text-slate-700 mt-2">75.0%</p>
          <p className="text-[11px] text-slate-500 mt-1">Philippine Board Passing Grade</p>
        </div>
      </div>

      {/* Detailed Attempts Stream */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-[#FAF9FF] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#25223A] uppercase tracking-wide">
            Recent Examination Log
          </h3>
          <span className="text-xs text-slate-400">All submissions saved in database</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Quiz / Simulation</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Date Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No student quiz submissions recorded yet.
                  </td>
                </tr>
              ) : (
                attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-[#25223A]">{att.quiz_title}</td>
                    <td className="py-3.5 px-4 text-slate-600">{att.subject_title || 'General'}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      {att.score} / {att.total_questions}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${att.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {att.percentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono">
                      {Math.floor(att.duration_seconds / 60)}m {att.duration_seconds % 60}s
                    </td>
                    <td className="py-3.5 px-4">
                      {att.passed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Review Needed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(att.completed_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
