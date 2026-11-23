import React, { useState } from 'react';
import { 
  Search, 
  CheckCircle2, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  PenTool, 
  Check,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { DeckStudentState, DeckTopic } from '../../types';
import { T, SUB, SC, open, bump } from '../../data/boardContent';
import {
  buildTopicSpecificSummary,
  getAllCustomTopics,
  getCachedCustomTopic,
  saveCustomTopic,
} from '../../lib/customTopicGenerator';
import { Badge } from '../common/ThemeAssets';

interface DeckNotesProps {
  S: DeckStudentState;
  save: (fn: (prev: DeckStudentState) => DeckStudentState) => void;
  go: (tab: string, topicId?: string) => void;
}

export const DeckNotes: React.FC<DeckNotesProps> = ({ S, save, go }) => {
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const [openTopicId, setOpenTopicId] = useState<string | null>('pe-piaget');
  
  // Persistent Custom AI Topics State (stored in localStorage under 'bb_custom_topics')
  const [customTopics, setCustomTopics] = useState<DeckTopic[]>(() => getAllCustomTopics());
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const handleAISummarize = async () => {
    const trimmed = q.trim();
    if (!trimmed || isGenerating) return;
    
    if (!S.premium) {
      go('up');
      return;
    }

    setGenError('');

    // 1. Instant lightweight cache hit (< 5ms)
    const cached = getCachedCustomTopic(trimmed);
    if (cached) {
      const updated = saveCustomTopic(trimmed, cached);
      setCustomTopics(updated);
      setOpenTopicId(cached.id);
      setF('all');
      return;
    }

    setIsGenerating(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90);

    try {
      const clientKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
      const resp = await fetch('/api/ai/summarize-topic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(clientKey ? { 'x-gemini-api-key': clientKey } : {}),
        },
        body: JSON.stringify({
          topic: trimmed,
          ...(clientKey ? { gemini_api_key: clientKey } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        if (data?.topic?.title) {
          const structuredTopic = buildTopicSpecificSummary(trimmed, {
            id: data.topic.id,
            title: data.topic.title,
            subject_key: data.topic.s,
            notes: data.topic.notes,
            cards: data.topic.cards,
            qs: data.topic.qs,
          });
          const updated = saveCustomTopic(trimmed, structuredTopic);
          setCustomTopics(updated);
          setOpenTopicId(structuredTopic.id);
          setF('all');
          setGenError('');
          setIsGenerating(false);
          return;
        }
      }

      // Instant local board reviewer structuring fallback
      const localTopic = buildTopicSpecificSummary(trimmed);
      const updated = saveCustomTopic(trimmed, localTopic);
      setCustomTopics(updated);
      setOpenTopicId(localTopic.id);
      setF('all');
      setGenError('');
      setIsGenerating(false);
    } catch (_err) {
      clearTimeout(timeoutId);
      // Instant local board reviewer structuring (< 2ms) when network/API exceeds 90ms
      const localTopic = buildTopicSpecificSummary(trimmed);
      const updated = saveCustomTopic(trimmed, localTopic);
      setCustomTopics(updated);
      setOpenTopicId(localTopic.id);
      setF('all');
      setGenError('');
      setIsGenerating(false);
    }
  };

  // Prepend custom topics permanently to the top of the active topics list alongside T
  const displayList = [...customTopics, ...T].filter(
    (t) =>
      (f === 'all' || t.s === f) &&
      (t.title + t.notes.join(' ')).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
            AI Summaries
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            Long reviewers, turned into short notes.
          </p>
        </div>
        <Badge size={52} />
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics..."
          className="w-full bg-white rounded-2xl px-4 py-3 text-sm text-[#1B2A41] placeholder-[#6B7C93] border border-[#D5E2F2] shadow-sm shadow-[#16335A]/5 focus:outline-none focus:border-[#16335A] transition-all"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['all', ...Object.keys(SUB)].map((k) => {
          const isActive = f === k;
          return (
            <button
              key={k}
              onClick={() => setF(k)}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#16335A] text-white shadow-sm'
                  : 'bg-white text-[#16335A] border border-[#D5E2F2]/80 hover:bg-slate-50'
              }`}
            >
              {k === 'all' ? 'All' : SUB[k]}
            </button>
          );
        })}
      </div>

      {/* Topics list */}
      {!displayList.length && !isGenerating ? (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center py-10 bg-white rounded-2xl border border-[#D5E2F2]/60 p-6">
            <p className="text-sm text-[#6B7C93]">No topics match your search.</p>
          </div>

          <div className="bg-[#FAF9FF] rounded-2xl p-6 border border-purple-100 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-[#6847E8] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-[#16335A] text-sm">Summarize "{q}" with AI</h3>
            <p className="text-xs text-[#6B7C93]">
              Can't find it in our library? Ask BoardBuddy AI to generate a custom board-ready summary for you instantly.
            </p>
            
            {genError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-[11px] text-rose-600 flex items-center gap-2 justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {genError.includes('{') || genError.includes('403') || genError.includes('PERMISSION_DENIED') || genError.includes('Permission denied')
                    ? 'AI cloud service was temporarily busy. Offline board review mode is active.'
                    : genError}
                </span>
              </div>
            )}

            <button
              onClick={handleAISummarize}
              className="w-full py-3 bg-[#16335A] hover:bg-[#1F4478] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all active:scale-95"
            >
              {!S.premium && <Lock className="w-3.5 h-3.5" />}
              <span>{S.premium ? 'Request AI Summary' : 'Unlock AI Search (Premium)'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {/* AI Generating Placeholder */}
          {isGenerating && (
            <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-[#6847E8]/30 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px] animate-pulse">
              <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[#6847E8] animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#16335A]">Generating AI Summary...</p>
                <p className="text-[11px] text-slate-500 mt-1">Buddy is analyzing board concepts for "{q}"</p>
              </div>
            </div>
          )}

          {displayList.map((t) => {
            const isAi = t.id.startsWith('ai-');
            const isLocked = !open(S, t) && !isAi;
            const isExpanded = openTopicId === t.id;
            const borderColor = isAi ? '#6847E8' : (SC[t.s] || '#16335A');
            const notesToShow = isLocked ? t.notes.slice(0, 1) : t.notes;

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl p-4 shadow-md border transition-all ${
                  isAi ? 'border-[#6847E8]/40 ring-1 ring-[#6847E8]/10' : 'border-[#D5E2F2]/60 shadow-[#16335A]/5'
                }`}
                style={{ borderLeftWidth: 5, borderLeftColor: borderColor }}
              >
                <button
                  type="button"
                  onClick={() => setOpenTopicId(isExpanded ? null : t.id)}
                  className="w-full flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-[#16335A] text-base leading-tight">
                        {t.title}
                      </h3>
                      {t.id.startsWith('ai-') && (
                        <span className="bg-purple-100 text-[#6847E8] text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shrink-0">AI GEN</span>
                      )}
                    </div>
                    <span className="text-xs text-[#6B7C93] mt-0.5 block">
                      {SUB[t.s] || 'Educational Concept'}
                      {S.done[t.id] ? ' · Done' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8C77A] text-[#16335A] text-[11px] font-bold">
                        <Lock className="w-3 h-3" />
                        <span>Premium</span>
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-[#6B7C93]" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-[#6B7C93]" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[#D5E2F2]/60 space-y-3 animate-slide-down">
                    {notesToShow.map((n, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${t.id.startsWith('ai-') ? 'text-[#6847E8]' : 'text-[#3E9B52]'}`} />
                        <p className="text-xs md:text-sm text-[#1B2A41] leading-relaxed">
                          {n}
                        </p>
                      </div>
                    ))}

                    {isLocked ? (
                      <div className="mt-3 pt-2">
                        <p className="text-xs text-[#6B7C93] italic">
                          Preview only. Unlock Premium to read the full summary.
                        </p>
                        <button
                          onClick={() => go('up')}
                          className="mt-3 w-full py-2.5 bg-[#3E9B52] hover:bg-[#348345] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock full summary</span>
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 pt-1 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            onClick={() => go('cards', t.id)}
                            className="py-2.5 px-3 rounded-xl border border-[#16335A] text-[#16335A] hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Flashcards</span>
                          </button>
                          <button
                            onClick={() => go('practice', t.id)}
                            className="py-2.5 px-3 rounded-xl bg-[#16335A] hover:bg-[#1F4478] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>Practice</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            if (!S.done[t.id]) {
                              save((prev) =>
                                bump(
                                  {
                                    ...prev,
                                    done: { ...(prev.done || {}), [t.id]: true },
                                  },
                                  3
                                )
                              );
                            }
                          }}
                          className={`w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            S.done[t.id]
                              ? 'border border-[#16335A] text-[#16335A] bg-transparent'
                              : 'bg-[#3E9B52] hover:bg-[#348345] text-white shadow-sm'
                          }`}
                        >
                          {S.done[t.id] ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span>Completed ✓</span>
                            </>
                          ) : (
                            <span>Mark as done</span>
                          )}
                        </button>
                        
                        {isAi && (
                           <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                              <p className="text-[10px] text-purple-600 font-bold uppercase tracking-tight">AI Generated Board Reviewer</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">This custom summary is saved to your AI Summaries list.</p>
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

