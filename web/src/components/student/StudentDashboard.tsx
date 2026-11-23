import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Sparkles, 
  BookOpen, 
  FileCheck2, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Bot, 
  Target,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Subject, Quiz, QuizAttempt, AIRecommendation } from '../../types';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';

interface StudentDashboardProps {
  onNavigateTab: (tab: string, context?: any) => void;
  onLaunchQuiz: (quizId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  onNavigateTab,
  onLaunchQuiz 
}) => {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation | null>(null);
  const [quickQuestion, setQuickQuestion] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const fetchDashboardData = async () => {
    if (!currentUser || !isSupabaseReady) return;
    try {
      const [resSub, resQuiz, resAtt, resRec] = await Promise.all([
        supabase.from('subjects').select('*').eq('published', true),
        supabase.from('quizzes').select('*'),
        supabase.from('quiz_attempts').select('*').eq('user_id', currentUser.id).order('completed_at', { ascending: false }),
        supabase.from('ai_recommendations').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (resSub.data) setSubjects(resSub.data);
      if (resQuiz.data) setQuizzes(resQuiz.data);
      if (resAtt.data) setAttempts(resAtt.data as QuizAttempt[]);
      if (resRec.data) setRecommendations(resRec.data as AIRecommendation);
    } catch (e) {
      console.warn('Dashboard fetch error', e);
    }
  };

  const totalQuizzesTaken = attempts.length;
  const avgScore = totalQuizzesTaken > 0
    ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / totalQuizzesTaken)
    : 0;

  const passedCount = attempts.filter(a => a.passed).length;
  const readinessScore = recommendations?.overall_readiness_score || (totalQuizzesTaken > 0 ? avgScore : 72);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#16335A] via-[#1F4478] to-[#16335A] rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-[#16335A]/15 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-bold text-white">
            <GraduationCap className="w-3.5 h-3.5 text-[#A8D8B0]" />
            <span>{currentUser?.institution}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Mabuhay, {currentUser?.full_name?.split(' ')[0] || 'Reviewee'}!
          </h1>
          <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
            Welcome to your BoardBuddy review dashboard. Your AI-guided preparation sprint is active. Master your competencies, take timed simulation drills, and track your readiness for the PRC Board Examination.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 text-center shrink-0 min-w-[180px]">
          <span className="text-xs uppercase tracking-wider text-[#A8D8B0] font-bold block">
            Board Readiness
          </span>
          <p className="text-4xl font-black text-white mt-1">{readinessScore}%</p>
          <div className="mt-2 text-[11px] font-semibold text-[#A8D8B0]">
            {readinessScore >= 75 ? 'Target Passing Level Met' : 'Approaching Passing Standard'}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Drills Completed</span>
          <p className="text-2xl font-extrabold text-[#25223A] mt-2">{totalQuizzesTaken}</p>
          <p className="text-[11px] text-slate-500 mt-1">Timed practice exams taken</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Score</span>
          <p className={`text-2xl font-extrabold mt-2 ${avgScore >= 75 ? 'text-emerald-600' : 'text-[#6847E8]'}`}>
            {avgScore}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Passing benchmark: 75%</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pass Rate</span>
          <p className="text-2xl font-extrabold text-emerald-600 mt-2">
            {totalQuizzesTaken > 0 ? Math.round((passedCount / totalQuizzesTaken) * 100) : 0}%
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{passedCount} passing evaluations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Curriculum Coverage</span>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">{subjects.length} Subjects</p>
          <p className="text-[11px] text-slate-500 mt-1">Active syllabus categories</p>
        </div>
      </div>

      {/* Grid: Continue Studying & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Continue Studying & Practice Quizzes */}
        <div className="lg:col-span-8 space-y-6">
          {/* Continue Studying Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#25223A]">Continue Studying</h3>
                <p className="text-xs text-slate-400">Pick up where you left off or start high-yield review</p>
              </div>
              <button
                onClick={() => onNavigateTab('subjects')}
                className="text-xs font-bold text-[#6847E8] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All Subjects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.slice(0, 2).map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-[#FAF9FF] hover:border-purple-200 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#6847E8] bg-white px-2 py-0.5 rounded-md border border-purple-100">
                      {sub.code}
                    </span>
                    <h4 className="text-xs font-bold text-[#25223A] mt-1">{sub.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {sub.description}
                    </p>
                  </div>
                  <div className="pt-3 mt-2 border-t border-purple-100/60 flex items-center justify-between">
                    <button
                      onClick={() => onNavigateTab('review-materials')}
                      className="text-xs font-bold text-[#6847E8] hover:underline cursor-pointer"
                    >
                      Read Notes
                    </button>
                    <button
                      onClick={() => onNavigateTab('quizzes')}
                      className="px-3 py-1 bg-[#6847E8] text-white text-[11px] font-bold rounded-lg hover:bg-[#5736D6] cursor-pointer"
                    >
                      Take Drill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Quiz Attempts */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#25223A]">Recent Quiz Attempts</h3>
              <button
                onClick={() => onNavigateTab('my-results')}
                className="text-xs font-bold text-[#6847E8] hover:underline cursor-pointer"
              >
                View History
              </button>
            </div>

            {attempts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                You haven't completed any practice quizzes yet. Select a quiz below to start!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attempts.slice(0, 3).map((att) => (
                  <div key={att.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-[#25223A]">{att.quiz_title}</h4>
                      <p className="text-[11px] text-slate-400">
                        {att.subject_title || 'General'} • {new Date(att.completed_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-[#25223A]">{att.score}/{att.total_questions}</span>
                        <span className={`block text-[10px] font-bold ${att.passed ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {att.percentage}%
                        </span>
                      </div>
                      {att.passed ? (
                        <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                          <XCircle className="w-4 h-4" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Recommendations & AI Study Assistant */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Recommended Topics */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6847E8]" />
              <h3 className="text-sm font-bold text-[#25223A]">AI Study Recommendations</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Based on your actual examination attempts, Gemini AI identified these priority review competencies:
            </p>

            <div className="space-y-2.5">
              {recommendations?.weak_topics && recommendations.weak_topics.length > 0 ? (
                recommendations.weak_topics.map((weak, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#6847E8] font-bold uppercase">
                      <span>{weak.subject}</span>
                      <span>Target Topic</span>
                    </div>
                    <p className="text-xs font-bold text-[#25223A]">{weak.topic}</p>
                    <p className="text-[11px] text-slate-600 leading-snug">{weak.reason}</p>
                  </div>
                ))
              ) : (
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-100 space-y-1">
                  <span className="text-[10px] text-[#6847E8] font-bold uppercase">Target Topic</span>
                  <p className="text-xs font-bold text-[#25223A]">Kohlberg Moral Reasoning Levels</p>
                  <p className="text-[11px] text-slate-600">Review difference between Pre-conventional punishment avoidance and Conventional consensus.</p>
                </div>
              )}
            </div>

            <button
              onClick={() => onNavigateTab('my-progress')}
              className="w-full py-2 bg-purple-50 text-[#6847E8] hover:bg-purple-100 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              View Full 3-Day Sprint Plan
            </button>
          </div>

          {/* Quick AI Study Buddy Box */}
          <div className="bg-gradient-to-b from-[#FAF9FF] to-white p-6 rounded-2xl border border-purple-100 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#6847E8]" />
              <h3 className="text-sm font-bold text-[#25223A]">Ask AI Study Assistant</h3>
            </div>

            <p className="text-xs text-slate-500">
              Need a concept clarified or an easy-to-remember mnemonic? Ask "Buddy".
            </p>

            <div className="relative">
              <input
                type="text"
                value={quickQuestion}
                onChange={e => setQuickQuestion(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && quickQuestion.trim()) {
                    onNavigateTab('ai-assistant', { initialQuestion: quickQuestion });
                  }
                }}
                placeholder="e.g. Explain Vygotsky ZPD simply..."
                className="w-full p-2.5 pr-8 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden text-[#25223A]"
              />
              <button
                onClick={() => {
                  if (quickQuestion.trim()) {
                    onNavigateTab('ai-assistant', { initialQuestion: quickQuestion });
                  }
                }}
                className="absolute right-2.5 top-2.5 text-[#6847E8] hover:text-[#5736D6] cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
