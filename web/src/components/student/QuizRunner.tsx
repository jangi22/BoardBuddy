import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Flag, 
  Trophy,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Quiz, Question, QuizAttempt, StudentAnswerDetail } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface QuizRunnerProps {
  quizId: string;
  onExit: () => void;
  onRetake?: () => void;
}

export const QuizRunner: React.FC<QuizRunnerProps> = ({ quizId, onExit }) => {
  const { currentUser } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(600); // 10 mins default
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<QuizAttempt | null>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  // Timer countdown
  useEffect(() => {
    if (attemptResult || loading) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [attemptResult, loading, selectedAnswers]);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, questions(*)')
        .eq('id', quizId)
        .single();

      if (!error && data) {
        setQuiz(data as any);
        setQuestions(data.questions || []);
        setTimeLeftSeconds((data.time_limit_minutes || 10) * 60);
        setStartTime(Date.now());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: optionKey,
    });
  };

  const toggleFlag = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setFlaggedQuestions({
      ...flaggedQuestions,
      [currentQ.id]: !flaggedQuestions[currentQ.id],
    });
  };

  const handleSubmitQuiz = async () => {
    if (!quiz || isSubmitting) return;
    setIsSubmitting(true);
    const durationSec = Math.round((Date.now() - startTime) / 1000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/quizzes/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          quiz_id: quiz.id,
          user_id: currentUser?.id,
          answers: selectedAnswers,
          duration_seconds: durationSec,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setAttemptResult(data.attempt);
      }
    } catch (e) {
      console.error('Submission error:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-[#6847E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-500">Loading Board Examination Drill...</p>
      </div>
    );
  }

  // Results View
  if (attemptResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score Celebration Card */}
        <div className={`p-8 rounded-3xl text-center space-y-4 shadow-xl border ${
          attemptResult.passed 
            ? 'bg-gradient-to-b from-emerald-50 to-white border-emerald-200' 
            : 'bg-gradient-to-b from-purple-50 to-white border-purple-200'
        }`}>
          <div className="inline-flex p-4 rounded-3xl bg-white shadow-md">
            {attemptResult.passed ? (
              <Trophy className="w-12 h-12 text-emerald-600 animate-bounce" />
            ) : (
              <RotateCcw className="w-12 h-12 text-[#6847E8]" />
            )}
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-[#25223A]">
              {attemptResult.passed ? 'Board Simulation Passed!' : 'Practice Complete – Review Needed'}
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              {attemptResult.passed 
                ? 'Excellent work! You achieved passing board competency standards (≥75%).' 
                : 'Keep practicing! Review the rationales below to target your weak points.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2">
            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Score</span>
              <p className="text-3xl font-black text-[#25223A]">
                {attemptResult.score} <span className="text-lg font-bold text-slate-400">/ {attemptResult.total_questions}</span>
              </p>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Percentage</span>
              <p className={`text-3xl font-black ${attemptResult.passed ? 'text-emerald-600' : 'text-[#6847E8]'}`}>
                {attemptResult.percentage}%
              </p>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            <div className="text-center">
              <span className="text-xs font-semibold text-slate-400 uppercase">Duration</span>
              <p className="text-3xl font-black text-slate-700 font-mono">
                {Math.floor(attemptResult.duration_seconds / 60)}m {attemptResult.duration_seconds % 60}s
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setAttemptResult(null);
                setSelectedAnswers({});
                setFlaggedQuestions({});
                setCurrentIndex(0);
                fetchQuiz();
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] shadow-md shadow-[#6847E8]/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake Drill</span>
            </button>
            <button
              onClick={onExit}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Back to Quizzes
            </button>
          </div>
        </div>

        {/* Detailed Answer Explanations Review */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-[#25223A] uppercase tracking-wide">
              Detailed Answer Rationale & Distractor Explanations
            </h3>
            <span className="text-xs text-slate-400">All questions verified</span>
          </div>

          {attemptResult.answers?.map((ans, idx) => (
            <div
              key={ans.question_id}
              className={`p-5 rounded-2xl border transition-all ${
                ans.is_correct 
                  ? 'bg-white border-emerald-200/80' 
                  : 'bg-white border-rose-200/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-[#6847E8]">Question {idx + 1}</span>
                {ans.is_correct ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Incorrect
                  </span>
                )}
              </div>

              <p className="text-sm font-bold text-[#25223A] mt-2 leading-relaxed">
                {ans.question_text}
              </p>

              {/* Options Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-xs">
                {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                  const optText = ans.options[optKey];
                  const isUserSelection = ans.selected_answer === optKey;
                  const isCorrect = ans.correct_answer === optKey;

                  return (
                    <div
                      key={optKey}
                      className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                        isCorrect
                          ? 'bg-emerald-50/70 border-emerald-300 font-semibold text-emerald-950'
                          : isUserSelection
                          ? 'bg-rose-50/70 border-rose-300 text-rose-950 font-semibold'
                          : 'bg-slate-50/50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isUserSelection
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {optKey}
                      </span>
                      <span>{optText}</span>
                    </div>
                  );
                })}
              </div>

              {/* Comprehensive AI Explanation */}
              <div className="mt-3 p-3.5 bg-[#FAF9FF] rounded-xl border border-purple-100 text-xs text-slate-700 leading-relaxed space-y-1">
                <span className="font-bold text-[#6847E8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Explanation & Concept Insight:
                </span>
                <p>{ans.explanation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(selectedAnswers).length;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Top Banner: Quiz Info, Timer, Flag */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold text-[#6847E8] bg-purple-50 px-2 py-0.5 rounded-md">
            {quiz?.subject_title}
          </span>
          <h3 className="text-sm font-bold text-[#25223A] mt-1">{quiz?.title}</h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Countdown Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-[#6847E8] rounded-xl font-mono text-xs font-bold border border-purple-100">
            <Clock className="w-4 h-4 animate-pulse" />
            <span>
              {Math.floor(timeLeftSeconds / 60)}:
              {(timeLeftSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={toggleFlag}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              flaggedQuestions[currentQ?.id]
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
            }`}
            title="Flag question for review"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Palette / Navigator */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wide">
          Question Palette
        </span>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {questions.map((q, idx) => {
            const isAnswered = Boolean(selectedAnswers[q.id]);
            const isFlagged = Boolean(flaggedQuestions[q.id]);
            const isCurrent = currentIndex === idx;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer relative shrink-0 ${
                  isCurrent
                    ? 'bg-[#6847E8] text-white shadow-md shadow-[#6847E8]/20 ring-2 ring-[#6847E8]/30'
                    : isAnswered
                    ? 'bg-purple-100 text-[#6847E8]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-slate-400 font-semibold shrink-0">
          {answeredCount}/{questions.length} Answered
        </span>
      </div>

      {/* Current Question Body */}
      {currentQ && (
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#6847E8] uppercase tracking-wider">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {currentQ.difficulty}
            </span>
          </div>

          <h4 className="text-base font-bold text-[#25223A] leading-relaxed">
            {currentQ.question_text}
          </h4>

          {/* 4 Answer Options */}
          <div className="space-y-3 pt-2">
            {(['A', 'B', 'C', 'D'] as const).map(optionKey => {
              const textKey = `option_${optionKey.toLowerCase()}` as keyof Question;
              const optionText = currentQ[textKey] as string;
              const isSelected = selectedAnswers[currentQ.id] === optionKey;

              return (
                <div
                  key={optionKey}
                  onClick={() => handleSelectOption(optionKey)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${
                    isSelected
                      ? 'border-[#6847E8] bg-purple-50/60 shadow-xs'
                      : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#6847E8] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {optionKey}
                  </div>
                  <span className={`text-xs md:text-sm leading-snug ${
                    isSelected ? 'font-bold text-[#25223A]' : 'text-slate-700'
                  }`}>
                    {optionText}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all text-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Final Answers'}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] shadow-md shadow-[#6847E8]/20 transition-all text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
