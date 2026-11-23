import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, 
  Lock, 
  Target, 
  Timer, 
  Sparkles,
  ChevronRight 
} from 'lucide-react';
import { DeckStudentState, DeckQuizResultLog, DeckQuestionItem, DeckTopic } from '../../types';
import { T, AQ, SC, open, acc, weak, bump, shuf } from '../../data/boardContent';
import {
  expandTopicQuestions,
  getAllCustomTopics,
  getCustomTopicById,
} from '../../lib/customTopicGenerator';
import { DeckQuiz } from './DeckQuiz';
import { Badge } from '../common/ThemeAssets';

interface DeckPracticeProps {
  S: DeckStudentState;
  save: (fn: (prev: DeckStudentState) => DeckStudentState) => void;
  go: (tab: string, topicId?: string) => void;
  selectedTopicId?: string | null;
  setSelectedTopicId?: (id: string | null) => void;
}

interface ActiveRun {
  k: number;
  title: string;
  qs: DeckQuestionItem[];
  secs?: number;
}

export const DeckPractice: React.FC<DeckPracticeProps> = ({
  S,
  save,
  go,
  selectedTopicId,
  setSelectedTopicId,
}) => {
  const [run, setRun] = useState<ActiveRun | null>(null);

  const customTopics = getAllCustomTopics();
  const allTopics = [...customTopics, ...T];

  const getTopicPool = (topic: DeckTopic): DeckQuestionItem[] => {
    if (topic.id.startsWith('ai-')) {
      return expandTopicQuestions(topic);
    }
    const basePool = AQ.filter((q) => q.t === topic.id);
    return basePool.length >= 50 ? basePool : expandTopicQuestions(topic);
  };

  useEffect(() => {
    if (!selectedTopicId) return;
    const topic =
      T.find((t) => t.id === selectedTopicId) ||
      getCustomTopicById(selectedTopicId) ||
      customTopics.find((t) => t.id === selectedTopicId);

    if (!topic) return;

    const isLocked = !open(S, topic) && !topic.id.startsWith('ai-');
    if (isLocked) {
      if (setSelectedTopicId) setSelectedTopicId(null);
      go('up');
      return;
    }

    const pool = getTopicPool(topic);
    if (pool.length > 0) {
      setRun({
        k: Date.now(),
        title: topic.title,
        qs: shuf(pool).slice(0, 50),
      });
    }
  }, [selectedTopicId]);

  const handleDone = (log: DeckQuizResultLog[]) => {
    save((p) => {
      const r = { ...(p.res || {}) };
      const h = { ...(p.hist || {}) };

      log.forEach((x) => {
        const o = r[x.t] || { c: 0, t: 0 };
        r[x.t] = { c: o.c + (x.ok ? 1 : 0), t: o.t + 1 };
        h[`${x.t}|${x.q}`] = { ...x, at: Date.now() };
      });

      return bump({ ...p, res: r, hist: h }, log.length);
    });
  };

  if (run) {
    return (
      <DeckQuiz
        key={run.k}
        title={run.title}
        qs={run.qs}
        secs={run.secs}
        onDone={handleDone}
        onExit={() => {
          setRun(null);
          if (setSelectedTopicId) setSelectedTopicId(null);
        }}
      />
    );
  }

  const start = (title: string, questions: DeckQuestionItem[], secs?: number) => {
    if (!questions.length) return;
    setRun({
      k: Date.now(),
      title,
      qs: shuf(questions),
      secs,
    });
  };

  const weakTopicIds = weak(S).slice(0, 2).map((t) => t.id);

  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
            Practice
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            Test your knowledge and recall.
          </p>
        </div>
        <Badge size={52} />
      </div>

      {/* Topic Practice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {allTopics.map((t) => {
          const isAi = t.id.startsWith('ai-');
          const isLocked = !open(S, t) && !isAi;
          const a = acc(S, t);
          const borderColor = isAi ? '#6847E8' : (SC[t.s] || '#16335A');

          return (
            <button
              key={t.id}
              onClick={() =>
                isLocked
                  ? go('up')
                  : start(t.title, shuf(getTopicPool(t)).slice(0, 50))
              }
              className="w-full bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 hover:shadow-lg transition-all text-left flex items-center justify-between cursor-pointer group"
              style={{ borderLeftWidth: 5, borderLeftColor: borderColor }}
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-[#16335A] text-base leading-tight">
                    {t.title}
                  </h3>
                  {isAi && (
                    <span className="bg-purple-100 text-[#6847E8] text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shrink-0">AI GEN</span>
                  )}
                </div>
                <span className="text-xs text-[#6B7C93] mt-0.5 block">
                  {a === null ? 'Not attempted' : `Accuracy ${Math.round(a * 100)}%`}
                </span>
              </div>

              {isLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8C77A] text-[#16335A] text-[11px] font-bold shrink-0">
                  <Lock className="w-3 h-3" />
                  <span>Premium</span>
                </span>
              ) : (
                <PlayCircle className="w-7 h-7 text-[#3E9B52] group-hover:scale-110 transition-transform shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Premium Practice Drills */}
      <div className="pt-2">
        <h2 className="font-heading text-xl text-[#16335A] mb-3">Premium</h2>
        <div className="space-y-2.5">
          <button
            onClick={() =>
              S.premium
                ? start(
                    'Personalized Practice',
                    AQ.filter((q) => weakTopicIds.includes(q.t))
                  )
                : go('up')
            }
            className="w-full py-3.5 px-4 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#16335A]/15 transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {S.premium ? (
                <Target className="w-5 h-5 text-[#A8D8B0]" />
              ) : (
                <Lock className="w-5 h-5 text-[#E8C77A]" />
              )}
              <span>Personalized practice (weak topics)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>

          <button
            onClick={() =>
              S.premium
                ? start('Mock Board Exam', AQ, 300)
                : go('up')
            }
            className="w-full py-3.5 px-4 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#16335A]/15 transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {S.premium ? (
                <Timer className="w-5 h-5 text-[#A8D8B0]" />
              ) : (
                <Lock className="w-5 h-5 text-[#E8C77A]" />
              )}
              <span>Mock board exam (5 min timed)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    </div>
  );
};
