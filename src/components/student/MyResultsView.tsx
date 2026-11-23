import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  RotateCcw, 
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { QuizAttempt, StudentAnswerDetail } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';

export const MyResultsView: React.FC<{ onRetakeQuiz: (quizId: string) => void }> = ({ onRetakeQuiz }) => {
  const { currentUser } = useAuth();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      const fetchAttempts = async () => {
        try {
          const { data, error } = await supabase
            .from('quiz_attempts')
            .select('*')
            .eq('user_id', currentUser.id)
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
      fetchAttempts();
    }
  }, [currentUser]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">My Examination Results & History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your submitted simulation answers, time spent, and detailed explanations for past drills.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9FF] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Examination</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-4">Percentage</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4">Date Completed</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No examination records yet. Take your first practice drill to view your scores here.
                  </td>
                </tr>
              ) : (
                attempts.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-50/70 transition-colors">
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
                          <XCircle className="w-3 h-3" /> Needs Review
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(att.completed_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedAttempt(att)}
                        className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-[#6847E8] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onRetakeQuiz(att.quiz_id || '')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        title="Retake Quiz"
                      >
                        Retake
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Attempt Modal */}
      {selectedAttempt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAttempt(null)}
          title={`Exam Review: ${selectedAttempt.quiz_title}`}
          subtitle={`Score: ${selectedAttempt.score}/${selectedAttempt.total_questions} (${selectedAttempt.percentage}%) • Duration: ${Math.floor(selectedAttempt.duration_seconds / 60)}m ${selectedAttempt.duration_seconds % 60}s`}
          maxWidth="2xl"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {selectedAttempt.answers?.map((ans, idx) => (
              <div
                key={ans.question_id || idx}
                className={`p-4 rounded-2xl border text-xs ${
                  ans.is_correct ? 'bg-emerald-50/30 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#6847E8]">Question {idx + 1}</span>
                  {ans.is_correct ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                    </span>
                  ) : (
                    <span className="text-rose-700 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Incorrect (Selected: {ans.selected_answer})
                    </span>
                  )}
                </div>

                <p className="font-bold text-[#25223A] text-sm mt-2 leading-relaxed">
                  {ans.question_text}
                </p>

                <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-slate-700 leading-relaxed space-y-1">
                  <span className="font-bold text-[#6847E8] block">Correct Answer: Option {ans.correct_answer}</span>
                  <p>{ans.explanation}</p>
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAttempt(null)}
                className="px-5 py-2 font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl cursor-pointer"
              >
                Close Review
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
