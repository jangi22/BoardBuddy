import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Plus, 
  FileText, 
  Layers, 
  Eye, 
  CheckCircle, 
  ArrowRight,
  BookmarkCheck,
  AlertCircle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ReviewMaterial, Subject, Topic } from '../../types';

export const ReviewMaterialsManager: React.FC = () => {
  const [materials, setMaterials] = useState<ReviewMaterial[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  
  const [activeMaterial, setActiveMaterial] = useState<ReviewMaterial | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);

  // Generator Form state
  const [genSubjectId, setGenSubjectId] = useState('');
  const [genTopicId, setGenTopicId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedSubjectId]);

  const fetchData = async () => {
    try {
      let matQuery = supabase
        .from('review_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedSubjectId !== 'ALL') {
        matQuery = matQuery.eq('subject_id', selectedSubjectId);
      }

      const [resMat, resSub, resTop] = await Promise.all([
        matQuery,
        supabase.from('subjects').select('*').order('title'),
        supabase.from('topics').select('*').order('title'),
      ]);

      if (!resMat.error && resMat.data) {
        setMaterials(resMat.data as any);
      }
      if (!resSub.error && resSub.data) {
        setSubjects(resSub.data);
        if (resSub.data.length > 0 && !genSubjectId) {
          setGenSubjectId(resSub.data[0].id);
        }
      }
      if (!resTop.error && resTop.data) setTopics(resTop.data);
    } catch (e) {
      console.warn('Failed to fetch review materials', e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = subjects.find(sub => sub.id === genSubjectId);
    const t = topics.find(top => top.id === genTopicId);
    if (!s) return;

    setIsGenerating(true);
    setGenError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/ai/generate-material', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          subject_id: s.id,
          topic_id: t?.id || null,
          subject_title: s.title,
          topic_title: t?.title || 'Comprehensive Board Review',
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setGenError(data.error || 'Failed to generate review material.');
        return;
      }

      setMaterials([data.material, ...materials]);
      setIsGenerateOpen(false);
      setActiveMaterial(data.material);
    } catch (err: any) {
      setGenError(err.message || 'Generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const availableTopics = topics.filter(t => t.subject_id === genSubjectId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Board Exam Review Materials</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage comprehensive syllabus notes, key concepts, formulas, and legal guidelines.
          </p>
        </div>

        <button
          onClick={() => setIsGenerateOpen(true)}
          className="px-4 py-2 bg-[#6847E8] hover:bg-[#5736D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Reviewer with Gemini AI</span>
        </button>
      </div>

      {/* Filter by Subject */}
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

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {materials.map((mat) => (
          <div
            key={mat.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:border-[#6847E8]/40 hover:shadow-md transition-all p-5 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-[#6847E8] border border-purple-100">
                  {mat.subject_title || 'Subject'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(mat.created_at).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#25223A] line-clamp-2 leading-snug">{mat.title}</h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">{mat.summary}</p>
              </div>

              {mat.key_concepts && mat.key_concepts.length > 0 && (
                <div className="p-3 bg-[#FAF9FF] rounded-xl border border-purple-100/60 space-y-1 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6847E8] block">
                    Core Memorization Takeaway:
                  </span>
                  <p className="text-[11px] text-slate-600 line-clamp-2 font-medium">
                    {mat.key_concepts[0]}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {mat.key_concepts?.length || 0} Key Concepts
              </span>
              <button
                onClick={() => setActiveMaterial(mat)}
                className="px-3 py-1.5 text-xs font-bold text-[#6847E8] hover:bg-purple-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Read Full Reviewer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reader Modal */}
      {activeMaterial && (
        <Modal
          isOpen={true}
          onClose={() => setActiveMaterial(null)}
          title={activeMaterial.title}
          subtitle={`${activeMaterial.subject_title || 'Board Review'} • High-Yield Study Notes`}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-2">
              <span className="text-xs font-bold text-[#6847E8] block uppercase">Executive Summary</span>
              <p className="text-slate-700 leading-relaxed text-sm">{activeMaterial.summary}</p>
            </div>

            {activeMaterial.key_concepts && activeMaterial.key_concepts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide block">
                  Key Board Exam Competencies
                </span>
                <div className="space-y-1.5">
                  {activeMaterial.key_concepts.map((concept, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2">
                      <BookmarkCheck className="w-4 h-4 text-[#6847E8] shrink-0 mt-0.5" />
                      <span className="text-slate-700 leading-relaxed">{concept}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide block">
                Study Notes & Traps Analysis
              </span>
              <div className="prose prose-xs max-w-none p-4 bg-white rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                {activeMaterial.study_notes}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveMaterial(null)}
                className="px-5 py-2 font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl cursor-pointer"
              >
                Done Reading
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Gemini AI Generator Modal */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Board Exam Reviewer with Gemini AI"
        subtitle="Produce high-yield study notes, mnemonics, and trap warnings"
        maxWidth="md"
      >
        <form onSubmit={handleGenerate} className="space-y-4 text-xs">
          {genError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{genError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Target Subject</label>
            <select
              value={genSubjectId}
              onChange={e => {
                setGenSubjectId(e.target.value);
                setGenTopicId('');
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
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Specific Syllabus Topic</label>
            <select
              value={genTopicId}
              onChange={e => setGenTopicId(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden cursor-pointer"
            >
              <option value="">General Subject Review</option>
              {availableTopics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-slate-600 leading-relaxed">
            Gemini AI will synthesize Philippine Board Licensure Syllabi, generate 4-6 high-yield key concepts, and structure comprehensive notes with board exam traps.
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
                  <span>Synthesizing with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Reviewer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
