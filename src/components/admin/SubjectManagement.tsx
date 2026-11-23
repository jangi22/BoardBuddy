import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  FolderPlus, 
  ChevronRight, 
  Sparkles, 
  GraduationCap, 
  Layers,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Subject, Topic } from '../../types';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';
import { LET_REVIEW_DATASETS } from '../../data/boardContent';

export const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);

  // New Subject Form
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Board Licensure Examination for Professional Teachers (BLEPT)');
  const [units, setUnits] = useState(3);

  // New Topic Form
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDesc, setTopicDesc] = useState('');

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const mapFallbackTopicsForSubjects = (subList: Subject[]): Topic[] => {
    const normalize = (s: string) => s.trim().toLowerCase();
    const aliasLookup: Record<string, string> = {
      'professional ed': 'professional education',
      'professional education': 'professional education',
      'prof_ed': 'professional education',
      'general ed': 'general education',
      'general education': 'general education',
      'gen_ed': 'general education',
      'mathematics': 'mathematics',
      'math': 'mathematics',
      'science': 'science',
      'sci': 'science',
      'filipino': 'filipino',
      'fil': 'filipino',
      'social studies': 'social studies',
      'soc': 'social studies',
      'tle': 'tle',
      'mapeh': 'mapeh',
      'values ed': 'values ed',
      'val': 'values ed',
      'secondary majors': 'secondary majors',
      'majors': 'secondary majors',
    };

    const subjectIdByCanonical = new Map<string, string>();
    for (const sub of subList) {
      const tKey = aliasLookup[normalize(sub.title)] || normalize(sub.title);
      const cKey = aliasLookup[normalize(sub.code)] || normalize(sub.code);
      subjectIdByCanonical.set(tKey, sub.id);
      subjectIdByCanonical.set(cKey, sub.id);
    }

    const orderCounter: Record<string, number> = {};
    const generated: Topic[] = [];

    for (const summary of LET_REVIEW_DATASETS.summaries) {
      const canonical = aliasLookup[normalize(summary.subject)] || normalize(summary.subject);
      const matchedSubId = subjectIdByCanonical.get(canonical);
      if (!matchedSubId) continue;

      orderCounter[matchedSubId] = (orderCounter[matchedSubId] || 0) + 1;
      const cleanDesc = summary.content
        .replace(/^#+\s*/gm, '')
        .replace(/\*\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      generated.push({
        id: `local-topic-${summary.id}`,
        subject_id: matchedSubId,
        title: summary.title,
        description: cleanDesc.length > 220 ? `${cleanDesc.slice(0, 217).trim()}...` : cleanDesc,
        order_index: orderCounter[matchedSubId],
        created_at: new Date().toISOString(),
      });
    }

    return generated;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const token =
        (isSupabaseReady ? (await supabase.auth.getSession()).data?.session?.access_token : null) ||
        localStorage.getItem('boardbuddy_auth_token') ||
        '';

      if (token) {
        const resp = await fetch('/api/admin/subjects', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });
        if (resp.ok) {
          const payload = await resp.json();
          const fetchedSubjects: Subject[] = Array.isArray(payload.subjects) ? payload.subjects : [];
          let fetchedTopics: Topic[] = Array.isArray(payload.topics) ? payload.topics : [];

          if (fetchedSubjects.length > 0 && fetchedTopics.length === 0) {
            fetchedTopics = mapFallbackTopicsForSubjects(fetchedSubjects);
          }

          setSubjects(fetchedSubjects);
          setTopics(fetchedTopics);
          if (fetchedSubjects.length > 0 && !selectedSubject) {
            setSelectedSubject(fetchedSubjects[0]);
          }
          return;
        }
      }

      if (!isSupabaseReady) return;
      const [resSubj, resTop] = await Promise.all([
        supabase.from('subjects').select('*').order('code'),
        supabase.from('topics').select('*').order('order_index').order('title'),
      ]);

      const fetchedSubjects: Subject[] = resSubj.data || [];
      let fetchedTopics: Topic[] = resTop.data || [];

      if (fetchedSubjects.length > 0 && fetchedTopics.length === 0) {
        fetchedTopics = mapFallbackTopicsForSubjects(fetchedSubjects);
      }

      if (fetchedSubjects.length > 0) {
        setSubjects(fetchedSubjects);
        if (!selectedSubject) {
          setSelectedSubject(fetchedSubjects[0]);
        }
      }
      setTopics(fetchedTopics);
    } catch (e) {
      console.warn('Failed to fetch subjects', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseReady) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code,
          title,
          description,
          board_exam_category: category,
          total_units: units,
        }),
      });
      if (resp.ok) {
        const newSub = await resp.json();
        setSubjects([...subjects, newSub]);
        setSelectedSubject(newSub);
        setIsAddSubjectOpen(false);
        setCode('');
        setTitle('');
        setDescription('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !isSupabaseReady) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch('/api/topics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_id: selectedSubject.id,
          title: topicTitle,
          description: topicDesc,
        }),
      });
      if (resp.ok) {
        const newTop = await resp.json();
        setTopics([...topics, newTop]);
        setIsAddTopicOpen(false);
        setTopicTitle('');
        setTopicDesc('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject and all its related topics and quizzes?')) return;
    if (!isSupabaseReady) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch(`/api/subjects/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        setSubjects(subjects.filter(s => s.id !== id));
        if (selectedSubject?.id === id) {
          setSelectedSubject(subjects.find(s => s.id !== id) || null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentTopics = topics
    .filter(t => t.subject_id === selectedSubject?.id)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0) || a.title.localeCompare(b.title));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Board Review Subject & Topic Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize official licensure examination subjects, unit competencies, and syllabi topics.
          </p>
        </div>

        <button
          onClick={() => setIsAddSubjectOpen(true)}
          className="px-4 py-2 bg-[#6847E8] hover:bg-[#5736D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Subject</span>
        </button>
      </div>

      {/* Grid: Subjects on Left, Topics & Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subject Navigation List */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">
            Subjects ({subjects.length})
          </span>

          <div className="space-y-2">
            {subjects.map((sub) => {
              const isSelected = selectedSubject?.id === sub.id;
              const subTopicCount = topics.filter(t => t.subject_id === sub.id).length;
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubject(sub)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#6847E8] shadow-md shadow-[#6847E8]/5 ring-2 ring-[#6847E8]/10'
                      : 'bg-white border-slate-100 hover:border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#FAF9FF] text-[#6847E8] rounded-xl font-mono text-xs font-extrabold border border-purple-100">
                        {sub.code}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#25223A]">{sub.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">{sub.board_exam_category}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {subTopicCount} Topics
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Subject Details & Topics */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-5">
          {selectedSubject ? (
            <>
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#6847E8] bg-purple-50 px-2 py-0.5 rounded-md">
                      {selectedSubject.code}
                    </span>
                    <h3 className="text-base font-extrabold text-[#25223A]">{selectedSubject.title}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {selectedSubject.description}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Category: <span className="font-semibold text-slate-700">{selectedSubject.board_exam_category}</span> • {selectedSubject.total_units} Units
                  </p>
                </div>

                <button
                  onClick={() => handleDeleteSubject(selectedSubject.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete Subject"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Topics Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#6847E8]" />
                    <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide">
                      Structured Syllabus Topics ({currentTopics.length})
                    </span>
                  </div>

                  <button
                    onClick={() => setIsAddTopicOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold text-[#6847E8] bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Topic</span>
                  </button>
                </div>

                {currentTopics.length === 0 ? (
                  <div className="p-8 text-center bg-[#FAF9FF] rounded-2xl border border-dashed border-purple-200/60 text-xs text-slate-400">
                    No topics created for this subject yet. Add syllabus topics to generate review materials and drills.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentTopics.map((top, idx) => (
                      <div
                        key={top.id}
                        className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-[#6847E8]/40 transition-all flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-[#25223A]">{top.title}</h5>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              {top.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-slate-400 text-xs">
              Select or create a subject to view curriculum topics.
            </div>
          )}
        </div>
      </div>

      {/* Add Subject Modal */}
      <Modal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        title="Create New Board Exam Subject"
        subtitle="Add a new core examination domain for student preparation"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Subject Code</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. PROF-ED, PNLE-MS, CPA-AFAR"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden font-mono uppercase"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Subject Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Facilitating Learner-Centered Teaching"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Board Exam Domain / Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Board Licensure Examination for Professional Teachers"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Description & Coverage</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Summary of board exam competencies covered..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddSubjectOpen(false)}
              className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl cursor-pointer shadow-xs"
            >
              Save Subject
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Topic Modal */}
      <Modal
        isOpen={isAddTopicOpen}
        onClose={() => setIsAddTopicOpen(false)}
        title={`Add Topic to ${selectedSubject?.code}`}
        subtitle="Define a syllabus unit for quizzes and review notes"
        maxWidth="md"
      >
        <form onSubmit={handleCreateTopic} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Topic Title</label>
            <input
              type="text"
              value={topicTitle}
              onChange={e => setTopicTitle(e.target.value)}
              placeholder="e.g. Piaget Stages of Cognitive Development"
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-[#25223A] mb-1 uppercase tracking-wide">Topic Coverage Description</label>
            <textarea
              rows={3}
              value={topicDesc}
              onChange={e => setTopicDesc(e.target.value)}
              placeholder="Describe key theories, legal articles, or formulas included..."
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddTopicOpen(false)}
              className="px-4 py-2 font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] rounded-xl cursor-pointer shadow-xs"
            >
              Add Topic
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
