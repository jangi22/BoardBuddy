import React, { useState } from 'react';
import { 
  Share2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  PenTool,
  RotateCcw
} from 'lucide-react';
import { DeckStudentState, DeckQuestionItem, DeckQuizResultLog } from '../../types';
import { T, SUB, SC, C, open, AQ, shuf, bump } from '../../data/boardContent';
import { Badge } from '../common/ThemeAssets';
import { DeckQuiz } from './DeckQuiz';

interface DeckSelfReviewProps {
  S: DeckStudentState;
  save?: (fn: (prev: DeckStudentState) => DeckStudentState) => void;
  go: (tab: string) => void;
}

export const DeckSelfReview: React.FC<DeckSelfReviewProps> = ({ S, save, go }) => {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'right'>('all');
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({
    pe: true,
    ge: true,
    en: true,
  });
  const [copied, setCopied] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);

  const getTopicTitle = (id: string) => T.find((t) => t.id === id)?.title || id;

  const historyList = Object.values(S.hist || {}).sort((a, b) => (b.at || 0) - (a.at || 0));

  const cardsList = T.filter((t) => open(S, t))
    .flatMap((t) =>
      t.cards.map((c, i) => ({
        t: t.id,
        q: c[0],
        a: c[1],
        v: S.known?.[t.id + i],
      }))
    )
    .filter((c) => c.v !== undefined);

  const items = [
    ...historyList.map((h) => ({
      k: 'q' + h.t + h.q,
      t: h.t,
      ok: h.ok,
      h,
      c: null,
    })),
    ...cardsList.map((c) => ({
      k: 'c' + c.t + c.q,
      t: c.t,
      ok: Boolean(c.v),
      h: null,
      c,
    })),
  ];

  const nR = items.filter((x) => x.ok).length;
  const nW = items.length - nR;

  // Build the list of incorrect questions for targeted retake drill
  const wrongPracticeQs: DeckQuestionItem[] = [];
  const seenQs = new Set<string>();

  historyList.forEach((h) => {
    if (!h.ok && h.q && h.o && !seenQs.has(h.q)) {
      seenQs.add(h.q);
      wrongPracticeQs.push({
        t: h.t,
        q: h.q,
        o: h.o,
        a: h.a,
        w: h.w || 'Review the correct concept and rationale for this board question.',
      });
    }
  });

  // If there are also unknown flashcards, provide matching practice questions from AQ
  cardsList.forEach((c) => {
    if (!c.v) {
      const topicQ = AQ.find((q) => q.t === c.t && !seenQs.has(q.q));
      if (topicQ) {
        seenQs.add(topicQ.q);
        wrongPracticeQs.push(topicQ);
      }
    }
  });

  const handleDoneRetake = (log: DeckQuizResultLog[]) => {
    if (save) {
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
    }
  };

  if (isRetaking && wrongPracticeQs.length > 0) {
    return (
      <DeckQuiz
        title="Retake Mistakes Drill"
        qs={shuf(wrongPracticeQs)}
        exitLabel="Back to Self Review"
        onDone={handleDoneRetake}
        onExit={() => setIsRetaking(false)}
      />
    );
  }

  const formatItem = (x: typeof items[0]) => {
    if (x.h) {
      return (
        `- ${x.h.q}\n` +
        `  Correct: ${x.h.o[x.h.a]}` +
        (x.ok ? '' : `\n  Your answer: ${x.h.o[x.h.pick]}`) +
        `\n  Why: ${x.h.w}`
      );
    }
    return `- [Flashcard] ${x.c?.q}: ${x.c?.a}`;
  };

  const generateFullText = () => {
    return (
      'BoardBuddy Self Review\n' +
      Object.keys(SUB)
        .map((k) => {
          const subjectItems = items.filter(
            (x) => T.find((t) => t.id === x.t)?.s === k
          );
          if (!subjectItems.length) return '';
          return (
            `\n##### ${SUB[k].toUpperCase()} #####\n\n` +
            'WRONG / REVIEW AGAIN\n' +
            (subjectItems
              .filter((x) => !x.ok)
              .map(formatItem)
              .join('\n') || '(none)') +
            '\n\nRIGHT\n' +
            (subjectItems
              .filter((x) => x.ok)
              .map(formatItem)
              .join('\n') || '(none)')
          );
        })
        .join('\n')
    );
  };

  const handleShareOrCopy = () => {
    const text = generateFullText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filterOptions = [
    { k: 'all' as const, label: 'All' },
    { k: 'wrong' as const, label: 'Wrong' },
    { k: 'right' as const, label: 'Right' },
  ];

  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
            Self Review
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            Your right and wrong answers, by subject.
          </p>
        </div>
        <Badge size={52} />
      </div>

      {/* Overview Stats in Navy Card */}
      <div className="bg-[#16335A] rounded-2xl p-4 shadow-xl shadow-[#16335A]/15 text-white flex justify-around items-center">
        <div className="text-center">
          <span className="font-heading text-2xl md:text-3xl block text-white leading-none">
            {items.length}
          </span>
          <span className="text-[11px] font-semibold text-[#A8D8B0] mt-1 block">
            Answered
          </span>
        </div>

        <div className="h-8 w-px bg-white/20" />

        <div className="text-center">
          <span className="font-heading text-2xl md:text-3xl block text-[#A8D8B0] leading-none">
            {nR}
          </span>
          <span className="text-[11px] font-semibold text-[#A8D8B0] mt-1 block">
            Right
          </span>
        </div>

        <div className="h-8 w-px bg-white/20" />

        <div className="text-center">
          <span className="font-heading text-2xl md:text-3xl block text-[#FFB4B0] leading-none">
            {nW}
          </span>
          <span className="text-[11px] font-semibold text-[#FFB4B0] mt-1 block">
            Wrong
          </span>
        </div>
      </div>

      {/* Retake Wrong Answers / Retry Mistakes Button */}
      {nW > 0 && (
        <button
          onClick={() => setIsRetaking(true)}
          className="w-full py-3.5 px-4 bg-[#D9534F] hover:bg-[#C9302C] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#D9534F]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake Wrong Answers ({nW})</span>
        </button>
      )}

      {/* Empty State */}
      {!items.length ? (
        <div className="bg-white rounded-2xl p-6 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 text-center space-y-4">
          <p className="text-xs md:text-sm text-[#6B7C93] leading-relaxed">
            No answers yet. Answer flashcards or practice questions and your right and wrong answers will be compiled here.
          </p>
          <button
            onClick={() => go('practice')}
            className="w-full py-3 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PenTool className="w-4 h-4" />
            <span>Go to Practice</span>
          </button>
        </div>
      ) : (
        <>
          {/* Filter Chips */}
          <div className="flex gap-2 pb-1">
            {filterOptions.map((opt) => {
              const active = filter === opt.k;
              let bg = 'bg-white text-[#16335A] border border-[#D5E2F2]';
              if (active) {
                if (opt.k === 'wrong') bg = 'bg-[#D9534F] text-white';
                else if (opt.k === 'right') bg = 'bg-[#3E9B52] text-white';
                else bg = 'bg-[#16335A] text-white';
              }

              return (
                <button
                  key={opt.k}
                  onClick={() => setFilter(opt.k)}
                  className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${bg}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Subject Accordions */}
          <div className="space-y-3">
            {Object.keys(SUB).map((k) => {
              const subjectItems = items.filter(
                (x) => T.find((t) => t.id === x.t)?.s === k
              );
              if (!subjectItems.length) return null;

              const wrongItems = subjectItems.filter((x) => !x.ok);
              const rightItems = subjectItems.filter((x) => x.ok);
              const isOpen = openSubjects[k] !== false;
              const borderColor = SC[k] || '#16335A';

              return (
                <div
                  key={k}
                  className="bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 transition-all"
                  style={{ borderLeftWidth: 5, borderLeftColor: borderColor }}
                >
                  {/* Subject Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSubjects((prev) => ({
                        ...prev,
                        [k]: !isOpen,
                      }))
                    }
                    className="w-full flex items-center justify-between text-left cursor-pointer"
                  >
                    <span className="font-bold text-[#16335A] text-sm flex-1">
                      {SUB[k]}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#FBE9E8] text-[#D9534F] text-[11px] font-bold">
                        ✗ {wrongItems.length}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#E6F4E9] text-[#3E9B52] text-[11px] font-bold">
                        ✓ {rightItems.length}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-[#6B7C93]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#6B7C93]" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Items */}
                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-[#D5E2F2]/60 space-y-4">
                      {/* Wrong Section */}
                      {filter !== 'right' && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-[#D9534F] block">
                              ✗ Wrong ({wrongItems.length})
                            </span>
                            {wrongItems.length > 0 && (
                              <button
                                onClick={() => setIsRetaking(true)}
                                className="text-[11px] font-bold text-[#D9534F] hover:text-[#C9302C] flex items-center gap-1 cursor-pointer bg-[#FBE9E8] px-2.5 py-1 rounded-lg transition-all"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retry Mistakes</span>
                              </button>
                            )}
                          </div>
                          {wrongItems.length ? (
                            <div className="space-y-3">
                              {wrongItems.map((item) => (
                                <div
                                  key={item.k}
                                  className="pt-2 border-t border-[#D5E2F2]/40 text-left space-y-1"
                                >
                                  <span className="text-[10px] text-[#6B7C93] font-medium block">
                                    {getTopicTitle(item.t)}
                                    {item.c ? ' · Flashcard' : ''}
                                  </span>
                                  <p className="font-bold text-xs text-[#1B2A41]">
                                    {item.h ? item.h.q : item.c?.q}
                                  </p>
                                  {item.h ? (
                                    <>
                                      <p className="text-xs text-[#D9534F] font-medium">
                                        ✗ Your answer: {item.h.o[item.h.pick]}
                                      </p>
                                      <p className="text-xs text-[#3E9B52] font-semibold">
                                        ✓ Correct: {item.h.o[item.h.a]}
                                      </p>
                                      <p className="text-[11px] text-[#6B7C93] leading-relaxed">
                                        {item.h.w}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-[#6B7C93]">
                                      {item.c?.a}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#6B7C93]">
                              None. Great job!
                            </p>
                          )}
                        </div>
                      )}

                      {/* Right Section */}
                      {filter !== 'wrong' && (
                        <div className="pt-2">
                          <span className="font-bold text-xs text-[#3E9B52] block mb-2">
                            ✓ Right ({rightItems.length})
                          </span>
                          {rightItems.length ? (
                            <div className="space-y-3">
                              {rightItems.map((item) => (
                                <div
                                  key={item.k}
                                  className="pt-2 border-t border-[#D5E2F2]/40 text-left space-y-1"
                                >
                                  <span className="text-[10px] text-[#6B7C93] font-medium block">
                                    {getTopicTitle(item.t)}
                                    {item.c ? ' · Flashcard' : ''}
                                  </span>
                                  <p className="font-bold text-xs text-[#1B2A41]">
                                    {item.h ? item.h.q : item.c?.q}
                                  </p>
                                  {item.h ? (
                                    <>
                                      <p className="text-xs text-[#3E9B52] font-semibold">
                                        ✓ Correct: {item.h.o[item.h.a]}
                                      </p>
                                      <p className="text-[11px] text-[#6B7C93] leading-relaxed">
                                        {item.h.w}
                                      </p>
                                    </>
                                  ) : (
                                    <p className="text-xs text-[#6B7C93]">
                                      {item.c?.a}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-[#6B7C93]">
                              None yet.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Share/Save Button */}
          <button
            onClick={handleShareOrCopy}
            className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-[#16335A] text-[#16335A] font-bold text-xs rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#3E9B52]" />
                <span className="text-[#3E9B52]">Copied to clipboard!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share / save as text</span>
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
};
