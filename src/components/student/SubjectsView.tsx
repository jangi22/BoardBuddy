import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, CheckCircle2, FileText, ArrowRight, Sparkles } from 'lucide-react';
import { Subject, Topic } from '../../types';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';

interface SubjectsViewProps {
  onSelectSubjectNotes: (subjectId: string) => void;
  onLaunchSubjectQuiz: (subjectId: string) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({ 
  onSelectSubjectNotes,
  onLaunchSubjectQuiz 
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseReady) return;
    try {
      const [resSub, resTop] = await Promise.all([
        supabase.from('subjects').select('*').eq('is_published', true).order('title'),
        supabase.from('topics').select('*').order('title'),
      ]);
      
      if (resSub.data) setSubjects(resSub.data);
      if (resTop.data) setTopics(resTop.data);
    } catch (e) {
      console.warn('Subjects fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <h2 className="text-lg font-bold text-[#25223A]">Board Licensure Review Subjects</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive curriculum modules structured according to official PRC Board Examination competencies.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subjects.map((sub) => {
          const subTopics = topics.filter(t => t.subject_id === sub.id);
          return (
            <div
              key={sub.id}
              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs hover:border-[#6847E8]/40 hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-[#6847E8] border border-purple-100">
                    {sub.code}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {sub.total_units} Board Units
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#25223A]">{sub.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sub.description}</p>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Key Topics ({subTopics.length}):
                  </span>
                  <div className="space-y-1.5">
                    {subTopics.slice(0, 3).map(top => (
                      <div key={top.id} className="p-2 bg-[#FAF9FF] rounded-xl text-xs text-slate-700 flex items-center gap-2 border border-purple-100/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6847E8]" />
                        <span className="font-medium truncate">{top.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  onClick={() => onSelectSubjectNotes(sub.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#6847E8] bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>Read Reviewer</span>
                </button>

                <button
                  onClick={() => onLaunchSubjectQuiz(sub.id)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Practice Quiz</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
