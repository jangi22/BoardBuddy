import React, { useState, useEffect } from 'react';
import { 
  RotateCw, 
  Check, 
  Sparkles, 
  Lock, 
  Award,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { DeckStudentState } from '../../types';
import { T, C, open, bump, LET_REVIEW_DATASETS, SUB } from '../../data/boardContent';
import { getAllCustomTopics, getCustomTopicById } from '../../lib/customTopicGenerator';
import { Badge } from '../common/ThemeAssets';

interface DeckCardsProps {
  S: DeckStudentState;
  save: (fn: (prev: DeckStudentState) => DeckStudentState) => void;
  go: (tab: string, topicId?: string) => void;
  selectedTopicId?: string | null;
  setSelectedTopicId?: (id: string | null) => void;
}

export const DeckCards: React.FC<DeckCardsProps> = ({ 
  S, 
  save, 
  go, 
  selectedTopicId, 
  setSelectedTopicId 
}) => {
  const [localTopicId, setLocalTopicId] = useState<string | null>(selectedTopicId || null);

  useEffect(() => {
    if (selectedTopicId !== undefined) {
      setLocalTopicId(selectedTopicId);
    }
  }, [selectedTopicId]);

  const handleSelectTopic = (tid: string | null) => {
    setLocalTopicId(tid);
    if (setSelectedTopicId) setSelectedTopicId(tid);
    setIndex(0);
    setIsFlipped(false);
  };

  const datasetCards = (LET_REVIEW_DATASETS.flashcards || []).map((fc) => ({
    k: fc.id,
    q: fc.front,
    a: fc.back,
    topic: 'LET Review Cards',
    topicId: 'general',
  }));

  const getTopicCards = (t: typeof T[0]) => {
    const cardItems = t.cards.map((c, idx) => ({
      k: `${t.id}-card-${idx}`,
      q: c[0],
      a: c[1],
      topic: t.title,
      topicId: t.id,
    }));

    const qItems = (t.qs || []).map((q, idx) => ({
      k: `${t.id}-q-${idx}`,
      q: q[0],
      a: `Correct Answer: ${q[1][q[2]]}\n\nExplanation: ${q[3]}`,
      topic: `${t.title} (Quiz Q)`,
      topicId: t.id,
    }));

    const noteItems = (t.notes || []).map((note, idx) => ({
      k: `${t.id}-note-${idx}`,
      q: `Key Concept: ${t.title} (${idx + 1})`,
      a: note,
      topic: `${t.title} (Notes)`,
      topicId: t.id,
    }));

    const combined = [...cardItems, ...qItems, ...noteItems];

    while (combined.length < 35) {
      const baseCard = cardItems[combined.length % cardItems.length] || { q: t.title, a: 'Core LET Board Principle' };
      combined.push({
        k: `${t.id}-synth-${combined.length}`,
        q: `${baseCard.q} (Aspect #${combined.length + 1})`,
        a: `${baseCard.a} [Advanced LET Review Principle for ${t.title}]`,
        topic: t.title,
        topicId: t.id,
      });
    }

    return combined.slice(0, 45);
  };

  const customTopics = getAllCustomTopics();
  const allTopics = [...customTopics, ...T];
  const allTopicCards = T.flatMap((t) => getTopicCards(t));
  const baseDeck = [...datasetCards, ...allTopicCards];

  const activeTopicObj =
    T.find((t) => t.id === localTopicId) ||
    getCustomTopicById(localTopicId) ||
    customTopics.find((t) => t.id === localTopicId) ||
    null;

  const deck = localTopicId && localTopicId !== 'all' && localTopicId !== 'general' && activeTopicObj
    ? getTopicCards(activeTopicObj)
    : localTopicId === 'general'
      ? datasetCards
      : baseDeck;

  const totalPossible = T.reduce((acc, t) => acc + t.cards.length, 0);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = deck.length > 0 ? deck[index % deck.length] : null;

  const markCard = (v: boolean) => {
    if (!currentCard) return;
    save((prev) =>
      bump(
        {
          ...prev,
          known: { ...(prev.known || {}), [currentCard.k]: v },
        },
        1
      )
    );
    setIsFlipped(false);
    setIndex((prev) => prev + 1);
  };

  const masteredCount = deck.filter((d) => S.known?.[d.k]).length;
  const progressPercent = deck.length > 0 ? (masteredCount / deck.length) * 100 : 0;

  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <button
            onClick={() => go('home')}
            className="inline-flex items-center gap-1.5 text-xs text-[#2563B8] hover:text-[#16335A] font-bold mb-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
          <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
            Flashcards {activeTopicObj ? `· ${activeTopicObj.title}` : ''}
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            {masteredCount} of {deck.length} cards mastered {activeTopicObj ? `in ${activeTopicObj.title}` : ''}
          </p>
        </div>
        <Badge size={52} />
      </div>

      {/* Topic Filter Selector inside Flashcards view */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#D5E2F2] space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-[#3E9B52]" />
            <span>Filter Flashcards by Topic</span>
          </label>
          {localTopicId && (
            <button
              type="button"
              onClick={() => handleSelectTopic(null)}
              className="text-[11px] text-[#2563B8] hover:underline font-bold cursor-pointer"
            >
              Show All Topics
            </button>
          )}
        </div>
        <select
          value={localTopicId || 'all'}
          onChange={(e) => handleSelectTopic(e.target.value === 'all' ? null : e.target.value)}
          className="w-full bg-[#E8F1FB] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#16335A] outline-none cursor-pointer border border-transparent focus:border-blue-400"
        >
          <option value="all">All Topics (Full Review Deck - {baseDeck.length} cards)</option>
          <option value="general">General LET Review Cards</option>
          {allTopics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id.startsWith('ai-') ? 'AI SUMMARY' : (SUB[t.s] || t.s.toUpperCase())} · {t.title} ({getTopicCards(t).length} cards)
            </option>
          ))}
        </select>
      </div>

      {/* Free Plan Upgrade Callout */}
      {!S.premium && (
        <button
          onClick={() => go('up')}
          className="w-full text-left bg-[#E8C77A] rounded-2xl p-3.5 shadow-sm hover:opacity-95 transition-all cursor-pointer flex items-center justify-between"
        >
          <span className="font-semibold text-xs text-[#16335A]">
            Free plan: {deck.length} of {totalPossible} cards. Tap to unlock all.
          </span>
          <Lock className="w-4 h-4 text-[#16335A] shrink-0 ml-2" />
        </button>
      )}

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-[#D5E2F2] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#3E9B52] rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>

      {/* Flashcard Component */}
      {currentCard ? (
        <div className="space-y-4 pt-2">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`relative min-h-[280px] md:min-h-[300px] rounded-3xl p-6 md:p-8 flex flex-col justify-center items-center text-center shadow-xl transition-all duration-300 cursor-pointer select-none ${
              isFlipped
                ? 'bg-[#3E9B52] shadow-[#3E9B52]/20'
                : 'bg-[#16335A] shadow-[#16335A]/20'
            }`}
          >
            {/* Top Label */}
            <span className="absolute top-5 left-6 text-white/75 font-semibold text-xs uppercase tracking-wider">
              {isFlipped ? 'Definition' : 'Term'}
            </span>

            {/* Topic pill */}
            <span className="absolute top-5 right-6 px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-[10px] font-medium">
              {currentCard.topic}
            </span>

            {/* Center Content */}
            <div className="my-auto px-4">
              {isFlipped ? (
                <p className="font-semibold text-white text-base md:text-lg leading-relaxed">
                  {currentCard.a}
                </p>
              ) : (
                <h2 className="font-heading text-2xl md:text-4xl text-white tracking-wide leading-tight">
                  {currentCard.q}
                </h2>
              )}
            </div>

            {/* Bottom Hint */}
            <div className="absolute bottom-4 flex items-center gap-1.5 text-white/60 text-xs">
              <RotateCw className="w-3.5 h-3.5" />
              <span>
                Tap to {isFlipped ? 'see the term' : 'flip'}
                {S.known?.[currentCard.k] ? ' · mastered' : ''}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => markCard(false)}
              className="py-3 px-4 bg-white hover:bg-slate-50 border-2 border-[#16335A] text-[#16335A] font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Review again</span>
            </button>

            <button
              onClick={() => markCard(true)}
              className="py-3 px-4 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-[#3E9B52]/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Got it</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-[#D5E2F2]/60 p-6 space-y-3">
          <p className="text-sm text-[#6B7C93]">No flashcards available for this selected topic.</p>
          <button
            type="button"
            onClick={() => handleSelectTopic(null)}
            className="px-4 py-2 bg-[#16335A] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Show All Topics
          </button>
        </div>
      )}
    </div>
  );
};
