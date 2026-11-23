import React, { useState, useEffect } from 'react';
import { BookOpen, BookmarkCheck, ArrowRight, Sparkles, Layers, Search } from 'lucide-react';
import { ReviewMaterial, Subject } from '../../types';
import { Modal } from '../common/Modal';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';
import { LET_REVIEW_DATASETS } from '../../data/boardContent';
import { toSafeLower } from '../../lib/safeString';

export const ReviewMaterialsView: React.FC<{ initialSubjectId?: string }> = ({ initialSubjectId }) => {
  const [materials, setMaterials] = useState<ReviewMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || 'ALL');
  const [search, setSearch] = useState('');
  const [readingMaterial, setReadingMaterial] = useState<ReviewMaterial | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, [selectedSubjectId]);

  const fetchMaterials = async () => {
    const fallbackList = LET_REVIEW_DATASETS.summaries.map(s => ({
      id: s.id,
      subject_id: s.subject === 'Professional Education' ? 'pe' : 'ge',
      title: s.title,
      summary: s.content,
      key_concepts: [s.title],
      study_notes: s.content,
      is_published: true,
      created_at: new Date().toISOString(),
      subject_title: s.subject,
      topic_title: s.title,
    }));

    if (!isSupabaseReady) {
      setMaterials(fallbackList);
      return;
    }
    try {
      let matQuery = supabase
        .from('review_materials')
        .select('*, subjects(title), topics(title)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (selectedSubjectId !== 'ALL') {
        matQuery = matQuery.eq('subject_id', selectedSubjectId);
      }

      const [resMat, resSub] = await Promise.all([
        matQuery,
        supabase.from('subjects').select('*').eq('is_published', true).order('title'),
      ]);

      if (resMat.data && resMat.data.length > 0) {
        setMaterials(resMat.data.map((m: any) => ({
          ...m,
          subject_title: m.subjects?.title || 'Subject',
          topic_title: m.topics?.title || 'Topic',
        })));
      } else {
        setMaterials(fallbackList);
      }
      if (resSub.data) setSubjects(resSub.data);
    } catch (e) {
      console.warn('ReviewMaterials fetch error', e);
      setMaterials(fallbackList);
    }
  };

  const searchLower = toSafeLower(search);
  const filtered = materials.filter(m =>
    toSafeLower(m?.title).includes(searchLower) ||
    toSafeLower(m?.summary).includes(searchLower)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">High-Yield Board Exam Reviewers</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Curated summaries, mnemonics, and common trap explanations crafted for examinee success.
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search topics, laws, concepts..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden text-[#25223A]"
          />
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSubjectId('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedSubjectId === 'ALL'
              ? 'bg-[#6847E8] text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Subjects ({materials.length})
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

      {/* Materials Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(mat => (
          <div
            key={mat.id}
            className="bg-white rounded-3xl border border-slate-100 shadow-xs hover:border-[#6847E8]/40 hover:shadow-lg transition-all p-5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <span className="font-mono text-[10px] font-bold text-[#6847E8] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                {mat.subject_title || 'Board Subject'}
              </span>

              <div>
                <h3 className="text-sm font-bold text-[#25223A] line-clamp-2 leading-snug">{mat.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">{mat.summary}</p>
              </div>

              {mat.key_concepts && mat.key_concepts.length > 0 && (
                <div className="p-3 bg-[#FAF9FF] rounded-xl border border-purple-100/60 text-xs text-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-[#6847E8] uppercase tracking-wider block">
                    Core Board Concept:
                  </span>
                  <p className="line-clamp-2">{mat.key_concepts[0]}</p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {mat.key_concepts?.length || 0} Key Takeaways
              </span>

              <button
                onClick={() => setReadingMaterial(mat)}
                className="px-3.5 py-1.5 text-xs font-bold text-[#6847E8] bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Read Notes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reading Modal */}
      {readingMaterial && (
        <Modal
          isOpen={true}
          onClose={() => setReadingMaterial(null)}
          title={readingMaterial.title}
          subtitle={`${readingMaterial.subject_title || 'Board Examination Review'} • Official Study Notes`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-100 text-slate-700 text-sm leading-relaxed">
              <span className="text-xs font-bold text-[#6847E8] block uppercase mb-1">Overview</span>
              {readingMaterial.summary}
            </div>

            {readingMaterial.key_concepts && readingMaterial.key_concepts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide block">
                  Essential Board Competencies
                </span>
                <div className="space-y-1.5">
                  {readingMaterial.key_concepts.map((concept, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
                      <BookmarkCheck className="w-4 h-4 text-[#6847E8] shrink-0 mt-0.5" />
                      <span className="text-slate-800 leading-relaxed font-medium">{concept}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide block">
                Study Notes & Traps Analysis
              </span>
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed font-sans text-sm">
                {readingMaterial.study_notes}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReadingMaterial(null)}
                className="px-5 py-2 font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl cursor-pointer"
              >
                Close Reviewer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
