import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  HelpCircle, 
  Filter,
  CheckCircle2,
  Trophy
} from 'lucide-react';
import { Quiz, Subject, QuizDifficulty } from '../../types';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';

interface PracticeQuizzesViewProps {
  onStartQuiz: (quizId: string) => void;
  initialSubjectId?: string;
}

export const PracticeQuizzesView: React.FC<PracticeQuizzesViewProps> = ({ 
  onStartQuiz,
  initialSubjectId 
}) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || 'ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');

  useEffect(() => {
    fetchData();
  }, [selectedSubjectId]);

  const fetchData = async () => {
    if (!isSupabaseReady) return;
    try {
      let quizQuery = supabase.from('quizzes').select('*').eq('is_published', true).order('created_at', { ascending: false });
      if (selectedSubjectId !== 'ALL') {
        quizQuery = quizQuery.eq('subject_id', selectedSubjectId);
      }

      const [resQuiz, resSub] = await Promise.all([
        quizQuery,
        supabase.from('subjects').select('*').eq('is_published', true).order('title'),
      ]);

      if (resQuiz.data) setQuizzes(resQuiz.data);
      if (resSub.data) setSubjects(resSub.data);
    } catch (e) {
      console.warn('PracticeQuizzes fetch error', e);
    }
  };

  const filtered = quizzes.filter(q => {
    if (selectedDifficulty !== 'ALL' && q.difficulty !== selectedDifficulty) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Board Exam Practice Quizzes</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Timed multiple-choice drills with 4 options, instant scoring, and complete answer rationales.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Subject Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedSubjectId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedSubjectId === 'ALL'
                ? 'bg-[#6847E8] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Subjects
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSubjectId(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedSubjectId === s.id
                  ? 'bg-[#6847E8] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.code}
            </button>
          ))}
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-semibold text-slate-400">Difficulty:</span>
          {['ALL', 'EASY', 'MODERATE', 'DIFFICULT'].map(d => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                selectedDifficulty === d
                  ? 'bg-purple-100 text-[#6847E8]'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Quizzes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(quiz => (
          <div
            key={quiz.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-xs hover:border-[#6847E8]/40 hover:shadow-lg transition-all p-5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#6847E8] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  {quiz.subject_title || 'Board Subject'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  quiz.difficulty === 'EASY'
                    ? 'bg-emerald-50 text-emerald-700'
                    : quiz.difficulty === 'MODERATE'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}>
                  {quiz.difficulty}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#25223A] line-clamp-2 leading-snug">{quiz.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{quiz.description}</p>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-[#6847E8]" />
                  <span>{quiz.question_count || 5} Questions</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{quiz.time_limit_minutes} Mins</span>
                </span>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                Passing: 75%
              </span>

              <button
                onClick={() => onStartQuiz(quiz.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start Quiz</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
