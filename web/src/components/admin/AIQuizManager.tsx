import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  FileCheck2, 
  Eye, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Layers, 
  AlertCircle,
  HelpCircle,
  Shuffle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Quiz, Question, Subject, Topic, QuizDifficulty } from '../../types';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';

export const AIQuizManager: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  // AI Generator Form
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('MODERATE');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseReady) return;
    try {
      const [resQuiz, resSub, resTop] = await Promise.all([
        supabase.from('quizzes').select('*').order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('title'),
        supabase.from('topics').select('*').order('title'),
      ]);

      if (resQuiz.data) setQuizzes(resQuiz.data);
      if (resSub.data) {
        setSubjects(resSub.data);
        if (resSub.data.length > 0 && !subjectId) {
          setSubjectId(resSub.data[0].id);
        }
      }
      if (resTop.data) setTopics(resTop.data);
    } catch (e) {
      console.warn('Failed to fetch quizzes', e);
    }
  };

  const handleInspectQuiz = async (quiz: Quiz) => {
    if (!isSupabaseReady) return;
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*, questions(*)')
        .eq('id', quiz.id)
        .single();

      if (error) throw error;
      if (data) {
        setSelectedQuiz(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseReady) return;
    const s = subjects.find(sub => sub.id === subjectId);
    const t = topics.find(top => top.id === topicId);
    if (!s) return;

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_id: s.id,
          topic_id: t?.id || null,
          subject_name: s.title,
          topic_name: t?.title || 'Comprehensive Board Drill',
          difficulty,
          question_count: questionCount,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setErrorMsg(data.error || 'Failed to generate quiz.');
        return;
      }

      setQuizzes([data.quiz, ...quizzes]);
      setIsGenerateOpen(false);
      handleInspectQuiz(data.quiz);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with AI engine.');
    } finally {
      setIsGenerating(false);
    }
  };

  const availableTopics = topics.filter(t => t.subject_id === subjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">AI Practice Quiz Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate multiple-choice drills with 4 answer options and comprehensive answer rationales.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateOpen(true)}
          className="px-4 py-2 bg-[#6847E8] hover:bg-[#5736D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate New AI Quiz</span>
        </button>
      </div>

      {/* Quizzes List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-[#6847E8]/40 hover:shadow-md transition-all p-5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-[#6847E8]">
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

              <div className="flex items-center gap-3 text-[11px] text-slate-400">
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

            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#6847E8]">
                <Sparkles className="w-3 h-3" />
                AI Generated
              </span>

              <button
                onClick={() => handleInspectQuiz(quiz)}
                className="px-3 py-1.5 text-xs font-bold text-[#6847E8] hover:bg-purple-50 rounded-xl transition-colors cursor-pointer"
              >
                Inspect Questions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Quiz Modal */}
      {selectedQuiz && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedQuiz(null)}
          title={selectedQuiz.title}
          subtitle={`${selectedQuiz.subject_title} • ${selectedQuiz.difficulty} Difficulty • ${selectedQuiz.questions?.length || 0} Questions`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs max-h-[70vh] overflow-y-auto pr-1">
            <p className="text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {selectedQuiz.description}
            </p>

            <div className="space-y-4">
              {selectedQuiz.questions?.map((q: Question, idx: number) => (
                <div key={q.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-[#6847E8] text-xs">Question {idx + 1}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {q.difficulty}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-[#25223A] leading-relaxed">{q.question_text}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                      const isCorrect = q.correct_answer === optKey;
                      const textKey = `option_${optKey.toLowerCase()}` as keyof Question;
                      return (
                        <div
                          key={optKey}
                          className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                            isCorrect 
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold' 
                              : 'bg-slate-50/50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {optKey}
                          </span>
                          <span className="leading-snug">{q[textKey] as string}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-[#FAF9FF] rounded-xl border border-purple-100 text-[11px] text-slate-700 leading-relaxed">
                    <strong className="text-[#6847E8] block mb-1">Answer Rationale & Distractor Analysis:</strong>
                    {q.explanation}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedQuiz(null)}
                className="px-5 py-2 font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Quiz Generator Modal */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Multiple-Choice Quiz with Gemini AI"
        subtitle="Specify subject, difficulty, and question count to create new board review drills"
        maxWidth="md"
      >
        <form onSubmit={handleGenerateQuiz} className="space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Select Subject</label>
            <select
              value={subjectId}
              onChange={e => {
                setSubjectId(e.target.value);
                setTopicId('');
              }}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden cursor-pointer"
              required
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Target Topic</label>
            <select
              value={topicId}
              onChange={e => setTopicId(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden cursor-pointer"
            >
              <option value="">General Subject Coverage</option>
              {availableTopics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Difficulty Level</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as QuizDifficulty)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden cursor-pointer"
              >
                <option value="EASY">Easy (Foundations)</option>
                <option value="MODERATE">Moderate (Standard)</option>
                <option value="DIFFICULT">Difficult (Scenario)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Question Count</label>
              <select
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden cursor-pointer"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-slate-600 leading-relaxed">
            Gemini AI ensures all questions adhere strictly to 4 options (A, B, C, D), single unambiguous correct answer, and detailed explanations for all choices.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-2 font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Drafting Questions with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Quiz</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
