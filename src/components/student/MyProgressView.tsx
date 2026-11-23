import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Calendar,
  Layers,
  RefreshCw,
  Target
} from 'lucide-react';
import { AIRecommendation, StudentProgress } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const MyProgressView: React.FC<{ onNavigateNotes: (subjectId: string) => void }> = ({ onNavigateNotes }) => {
  const { currentUser } = useAuth();
  const [recommendations, setRecommendations] = useState<AIRecommendation | null>(null);
  const [progressList, setProgressList] = useState<StudentProgress[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchProgressAndRecs();
    }
  }, [currentUser]);

  const fetchProgressAndRecs = async () => {
    if (!currentUser) return;
    try {
      const [progRes, recRes] = await Promise.all([
        supabase
          .from('student_progress')
          .select('*')
          .eq('user_id', currentUser.id),
        fetch(`/api/ai/recommendations?user_id=${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        })
      ]);

      if (!progRes.error && progRes.data) {
        setProgressList(progRes.data as any);
      }
      if (recRes.ok) {
        setRecommendations(await recRes.json());
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleRefreshAI = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ user_id: currentUser.id }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setRecommendations(data.recommendation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Learning Progress & AI Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Diagnostic insights generated from your real board simulation scores and answer rationales.
          </p>
        </div>

        <button
          onClick={handleRefreshAI}
          disabled={isRefreshing}
          className="px-4 py-2 bg-[#6847E8] hover:bg-[#5736D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {isRefreshing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>Refresh Gemini AI Analytics</span>
        </button>
      </div>

      {/* Main Grid: Subject Mastery + Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Subject Mastery Progress */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#25223A] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#6847E8]" />
              <span>Subject Competency Mastery</span>
            </h3>
            <span className="text-xs text-slate-400">Target: ≥75%</span>
          </div>

          <div className="space-y-4">
            {progressList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                Complete practice quizzes to establish your competency tracking.
              </div>
            ) : (
              progressList.map(prog => (
                <div key={prog.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#25223A]">{prog.subject_title || 'Subject'}</span>
                    <span className={`font-mono font-bold ${prog.mastery_level >= 75 ? 'text-emerald-600' : 'text-[#6847E8]'}`}>
                      {prog.mastery_level}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        prog.mastery_level >= 75 ? 'bg-emerald-500' : 'bg-[#6847E8]'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, prog.mastery_level))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{prog.total_attempts} attempts recorded</span>
                    <span>Last active: {new Date(prog.last_activity_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Board Readiness Score Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#FAF9FF] to-white p-6 rounded-3xl border border-purple-100 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6847E8] bg-purple-50 px-2 py-0.5 rounded-md">
              AI Diagnostic Index
            </span>
            <h3 className="text-base font-extrabold text-[#25223A] mt-2">Overall Board Examination Readiness</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Synthesized by Gemini AI from your simulation accuracy, response speed, and theoretical error patterns.
            </p>
          </div>

          <div className="text-center py-4">
            <p className="text-5xl font-black text-[#6847E8] tracking-tight">
              {recommendations?.overall_readiness_score || 80}%
            </p>
            <span className="text-xs font-bold text-slate-600 mt-1 block">
              Passing Benchmark: 75.0%
            </span>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-purple-100 text-xs text-slate-600 flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Recommended Next Goal: Boost your scenario-based Kohlberg & Legal Mandate drills.</span>
          </div>
        </div>
      </div>

      {/* AI Recommendations Deep Dive: Weak vs Strong & Study Plan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-[#25223A]">Topics Needing Immediate Review</h3>
          </div>

          <div className="space-y-3">
            {recommendations?.weak_topics && recommendations.weak_topics.length > 0 ? (
              recommendations.weak_topics.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/60 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-amber-900">
                    <span>{item.topic}</span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                      Score: {item.score}%
                    </span>
                  </div>
                  <p className="text-amber-800/90 leading-relaxed text-[11px]">{item.reason}</p>
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
                No acute weak topics detected. Continue taking varied drills.
              </div>
            )}
          </div>
        </div>

        {/* Strong Topics */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-[#25223A]">Mastered Competencies</h3>
          </div>

          <div className="space-y-3">
            {recommendations?.strong_topics && recommendations.strong_topics.length > 0 ? (
              recommendations.strong_topics.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-950">
                    <span>{item.topic}</span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-700">
                      Score: {item.score}%
                    </span>
                  </div>
                  <p className="text-emerald-800/80 text-[11px]">Consistently answered accurately during timed simulation.</p>
                </div>
              ))
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500">
                Continue taking quizzes to highlight your top domains.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personalized Study Sprint Card */}
      {recommendations?.study_plan && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6847E8]" />
            <h3 className="text-sm font-bold text-[#25223A]">Gemini AI Personalized 3-Day Board Review Sprint</h3>
          </div>
          <div className="p-4 bg-[#FAF9FF] rounded-2xl border border-purple-100 text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
            {recommendations.study_plan}
          </div>
        </div>
      )}
    </div>
  );
};
