import { supabase } from "../../lib/supabaseClient";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Send, 
  Lock, 
  Sparkles, 
  Bot, 
  User, 
  HelpCircle,
  Lightbulb,
  BookOpen,
  Search,
  Volume2,
  RotateCw,
  AlertCircle,
  Loader2,
  BookmarkPlus,
  Check,
  Trash2,
  Edit3,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { DeckStudentState } from '../../types';
import { generateLocalBoardCoachReply } from '../../lib/localStudyCoach';
import { Badge, Mascot } from '../common/ThemeAssets';

interface DeckAssistantProps {
  S: DeckStudentState;
  go: (tab: string) => void;
}

interface Message {
  b: boolean; // true if bot, false if user
  t: string;
}

/* ── Free Dictionary API Data Types ────────────────────────────────────────── */
interface DictDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

interface DictMeaning {
  partOfSpeech: string;
  definitions: DictDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictPhonetic {
  text?: string;
  audio?: string;
}

interface DictEntry {
  word: string;
  phonetic?: string;
  phonetics?: DictPhonetic[];
  meanings: DictMeaning[];
  sourceUrls?: string[];
}

interface SavedStudyNote {
  id: string;
  word: string;
  phonetic?: string;
  pos: string;
  definition: string;
  createdAt: string;
}

export const DeckAssistant: React.FC<DeckAssistantProps> = ({ S, go }) => {
  const firstName = S.user.name?.split(' ')[0] || 'Future LPT';
  const userIdentifier = String(S.user?.email || S.user?.name || 'guest')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  
  const chatStorageKey = `bb_chat_history_${userIdentifier}`;
  const notesStorageKey = `bb_saved_notes_${userIdentifier}`;

  // Mode switcher: 'dictionary' (Lab 4 External API) or 'ai' (Gemini AI Coach)
  const [activeMode, setActiveMode] = useState<'dictionary' | 'ai'>('dictionary');

  /* ──────────────────────────────────────────────────────────────────────────
     1. NETWORKING & EXTERNAL API STATE (Free Dictionary API)
     ────────────────────────────────────────────────────────────────────────── */
  const [dictQuery, setDictQuery] = useState('');
  const [isDictLoading, setIsDictLoading] = useState(false);
  const [dictResult, setDictResult] = useState<DictEntry | null>(null);
  const [dictError, setDictError] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [playingAudio, setPlayingAudio] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  /* ── Saved Notes State (Local Data Persistence) ── */
  const loadSavedNotes = (): SavedStudyNote[] => {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(notesStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load saved notes:', e);
    }
    return [];
  };

  const [savedNotes, setSavedNotes] = useState<SavedStudyNote[]>(() => loadSavedNotes());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editDefinitionText, setEditDefinitionText] = useState('');
  const [customWord, setCustomWord] = useState('');
  const [customDefinition, setCustomDefinition] = useState('');

  // Persist notes
  const persistNotes = useCallback((updated: SavedStudyNote[]) => {
    setSavedNotes(updated);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(notesStorageKey, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist notes:', e);
      }
    }
  }, [notesStorageKey]);

  /* ── Fetch from Free Dictionary API ── */
  const lookupWord = async (wordToSearch?: string) => {
    const term = (wordToSearch !== undefined ? wordToSearch : dictQuery).trim();
    if (!term) return;

    setLastQuery(term);
    setIsDictLoading(true);
    setDictResult(null);
    setDictError('');
    setSaveSuccessMsg('');

    try {
      // Offline network check
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('You appear to be offline. Check your internet connection and tap Retry.');
      }

      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`
      );

      if (res.status === 404) {
        setDictError(`No definition found for "${term}". Please check your spelling or try another educational term.`);
        return;
      }

      if (!res.ok) {
        setDictError(`Dictionary server responded with error (${res.status}). Please tap Retry.`);
        return;
      }

      const data: DictEntry[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setDictError(`No definition returned for "${term}". Try another word.`);
        return;
      }

      setDictResult(data[0]);
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isOffline =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        msg.toLowerCase().includes('offline') ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('failed to fetch');

      setDictError(
        isOffline
          ? 'You appear to be offline. Check your internet connection and tap Retry.'
          : `Network error: ${msg || 'Unable to reach dictionary server'}. Tap Retry.`
      );
    } finally {
      setIsDictLoading(false);
    }
  };

  // Play audio pronunciation if available
  const playPronunciation = (audioUrl?: string) => {
    if (!audioUrl) return;
    try {
      setPlayingAudio(true);
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudio(false);
      audio.onerror = () => setPlayingAudio(false);
      audio.play().catch(() => setPlayingAudio(false));
    } catch (_) {
      setPlayingAudio(false);
    }
  };

  // Save term from API result into My Saved Notes
  const handleSaveFromResult = () => {
    if (!dictResult) return;
    const firstMeaning = dictResult.meanings?.[0];
    const newNote: SavedStudyNote = {
      id: `note-${Date.now()}`,
      word: dictResult.word,
      phonetic: dictResult.phonetic || '',
      pos: firstMeaning?.partOfSpeech || 'term',
      definition: firstMeaning?.definitions?.[0]?.definition || '(No definition provided)',
      createdAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const exists = savedNotes.some(
      (n) => n.word.toLowerCase() === dictResult.word.toLowerCase()
    );
    if (exists) {
      setSaveSuccessMsg(`"${dictResult.word}" is already in your saved notes!`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      return;
    }

    persistNotes([newNote, ...savedNotes]);
    setSaveSuccessMsg(`Saved! "${dictResult.word}" added to My Saved Notes.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Add custom note
  const handleAddCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWord.trim() || !customDefinition.trim()) return;

    const newNote: SavedStudyNote = {
      id: `note-${Date.now()}`,
      word: customWord.trim(),
      pos: 'custom study note',
      definition: customDefinition.trim(),
      createdAt: new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    persistNotes([newNote, ...savedNotes]);
    setCustomWord('');
    setCustomDefinition('');
  };

  // Edit note
  const handleStartEdit = (note: SavedStudyNote) => {
    setEditingNoteId(note.id);
    setEditDefinitionText(note.definition);
  };

  const handleCommitEdit = (id: string) => {
    if (!editDefinitionText.trim()) return;
    const updated = savedNotes.map((n) =>
      n.id === id ? { ...n, definition: editDefinitionText.trim() } : n
    );
    persistNotes(updated);
    setEditingNoteId(null);
    setEditDefinitionText('');
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    if (window.confirm('Delete this saved study note?')) {
      persistNotes(savedNotes.filter((n) => n.id !== id));
    }
  };

  // Seamless Bridge: ask Buddy AI to rationalize and contextualize this dictionary word for LET
  const handleAskBuddyAboutWord = (word: string, _def?: string) => {
    setActiveMode('ai');
    const promptText = `Explain the educational concept "${word}" in the context of the Philippine LET Board Exam, including core learning theories, classroom applications, high-yield board pointers, and sample LET questions.`;
    handleSend(promptText);
  };

  /* ──────────────────────────────────────────────────────────────────────────
     2. AI COACH CHAT STATE & LOGIC (Preserved with 100% fidelity)
     ────────────────────────────────────────────────────────────────────────── */
  const getInitialGreeting = (): Message[] => [
    {
      b: true,
      t: `Hello ${firstName}! I'm Buddy, your personal LET study coach. 🍎\n\nThink of me as your study partner. I can break down tough concepts, give you memory mnemonics, or explain why a certain answer was correct. \n\nWhat can we conquer together today?`,
    },
  ];

  const loadSavedMessages = (key: string): Message[] => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getInitialGreeting();
    }
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every((m) => m && typeof m.b === 'boolean' && typeof m.t === 'string')
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved chat history:', e);
    }
    return getInitialGreeting();
  };

  const [messages, setMessages] = useState<Message[]>(() => loadSavedMessages(chatStorageKey));
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const loadedKeyRef = useRef<string>(chatStorageKey);

  // Reload chat history if active student account changes after mount
  useEffect(() => {
    if (loadedKeyRef.current !== chatStorageKey) {
      loadedKeyRef.current = chatStorageKey;
      setMessages(loadSavedMessages(chatStorageKey));
    }
  }, [chatStorageKey]);

  // Persist chat history automatically whenever messages update
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-100)));
    } catch (e) {
      console.warn('Failed to persist chat history:', e);
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    if (activeMode === 'ai') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeMode]);

  // Answer generator: Gemini API with context-aware local LET board review fallback
  const handleSend = async (customText?: string) => {
    const qText = (customText || query).trim();
    if (!qText || loading) return;

    setMessages((prev) => [...prev, { b: false, t: qText }]);
    setQuery('');
    setLoading(true);

    const clientKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    const usableClientKey =
      clientKey &&
      clientKey !== 'undefined' &&
      clientKey !== 'null'
        ? clientKey
        : '';

    // 1. Try backend AI assistant endpoint
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (usableClientKey) {
        headers['x-gemini-api-key'] = usableClientKey;
      }

      const resp = await fetch('/api/ai/ask-assistant', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: qText,
          student_name: S.user.name,
          ...(usableClientKey ? { gemini_api_key: usableClientKey } : {}),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const replyContent = String(data.answer || data.reply || '').trim();
        if (replyContent && !replyContent.startsWith('⚠️')) {
          setMessages((prev) => [...prev, { b: true, t: replyContent }]);
          setLoading(false);
          return;
        }
      }
    } catch (_e) {
      // Fall through cleanly
    }

    // 2. Direct Gemini fallback
    if (usableClientKey) {
      try {
        const directResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(usableClientKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: qText }] }],
              systemInstruction: {
                parts: [{
                  text: `You are Buddy, a warm, upbeat, supportive LET study buddy and mentor talking directly to ${S.user.name || 'Future LPT'}. Intelligently interpret any typos or casual phrasing. For study topics, follow the 3-part format: 1) **Core LET Concepts**, 2) **High-Yield Board Notes** (with mnemonics/tips), and 3) **Sample Practice Question** (A/B/C/D options + **Correct Answer** + **Rationalization**). For greetings, casual questions, or questions about who/what you are, answer naturally and warmly without forcing an exam question.`
                }]
              }
            })
          }
        );
        if (directResp.ok) {
          const directData = await directResp.json();
          const text = directData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            setMessages((prev) => [...prev, { b: true, t: text }]);
            setLoading(false);
            return;
          }
        }
      } catch (_err) {}
    }

    // 3. Local board review coach fallback
    const smartLocalReply = generateLocalBoardCoachReply({
      question: qText,
      studentName: S.user.name,
    });
    setMessages((prev) => [...prev, { b: true, t: smartLocalReply }]);
    setLoading(false);
  };

  // Quick pedagogical term suggestions for LET students
  const pedagogicalTerms = [
    'pedagogy',
    'scaffolding',
    'epistemology',
    'cognition',
    'affective',
    'rubric',
    'metacognition',
    'formative',
    'constructivism'
  ];

  // First phonetic audio URL if available
  const availableAudio = dictResult?.phonetics?.find((p) => p.audio && p.audio.trim().length > 0)?.audio;

  return (
    <div className="flex flex-col h-[calc(100vh-115px)] w-full px-4 sm:px-6 lg:px-8 pt-2 pb-3">
      {/* Screen Header */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#D5E2F2]/60 shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl md:text-3xl text-[#16335A] tracking-normal leading-tight">
              Study Assistant
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6F4E9] text-[#2E9E5B] border border-[#2E9E5B]/20 uppercase">
              LET Reviewer
            </span>
          </div>
          <p className="text-xs text-[#6B7C93] font-medium mt-0.5">
            Educational Dictionary & AI Board Exam Coach
          </p>
        </div>
        <Badge size={42} />
      </div>

      {/* Feature Mode Switcher Tabs */}
      <div className="flex bg-[#EAF2F9] p-1 rounded-2xl border border-[#D5E2F2] mt-2.5 mb-2 shrink-0">
        <button
          onClick={() => setActiveMode('dictionary')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'dictionary'
              ? 'bg-[#16335A] text-white shadow-md shadow-[#16335A]/20'
              : 'text-[#6B7C93] hover:text-[#16335A]'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#EBD289]" />
          <span>📖 Educational Dictionary</span>
        </button>

        <button
          onClick={() => setActiveMode('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMode === 'ai'
              ? 'bg-[#16335A] text-white shadow-md shadow-[#16335A]/20'
              : 'text-[#6B7C93] hover:text-[#16335A]'
          }`}
        >
          <Bot className="w-4 h-4 text-[#A8D8B0]" />
          <span>🤖 Buddy AI Study Coach</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          MODE 1: EDUCATIONAL DICTIONARY (Free Dictionary API - Lab 4 Requirement)
          ────────────────────────────────────────────────────────────────────────── */}
      {activeMode === 'dictionary' && (
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
          {/* Search Box Card */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-[#D5E2F2]/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#16335A] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#2E9E5B]" />
                  Free Dictionary API Lookup
                </h2>
                <p className="text-xs text-[#6B7C93] mt-0.5">
                  Look up pedagogical and educational terms with real-time pronunciation and definitions.
                </p>
              </div>
              <span className="text-[10px] text-[#6B7C93] bg-[#EFF4F9] px-2 py-1 rounded-lg border border-[#D5E2F2]">
                api.dictionaryapi.dev
              </span>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
              <span className="text-[11px] font-semibold text-[#6B7C93] shrink-0">Try term:</span>
              {pedagogicalTerms.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setDictQuery(term);
                    lookupWord(term);
                  }}
                  disabled={isDictLoading}
                  className="px-2.5 py-1 rounded-full bg-[#EFF4F9] hover:bg-[#E2EDF8] text-[#16335A] text-[11px] font-medium border border-[#D5E2F2] hover:border-[#16335A]/30 transition-all cursor-pointer whitespace-nowrap"
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Search Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupWord();
              }}
              className="flex items-center gap-2 bg-[#EFF4F9] rounded-2xl p-1.5 pl-3.5 border border-[#D5E2F2] focus-within:border-[#16335A] focus-within:bg-white transition-all shadow-inner"
            >
              <Search className="w-4 h-4 text-[#6B7C93] shrink-0" />
              <input
                type="text"
                value={dictQuery}
                onChange={(e) => setDictQuery(e.target.value)}
                placeholder="Search term (e.g., pedagogy, scaffolding, epistemology)..."
                className="flex-1 text-xs md:text-sm text-[#16335A] placeholder-[#8898AA] bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                disabled={!dictQuery.trim() || isDictLoading}
                className="px-4 py-2 bg-[#2E9E5B] hover:bg-[#258249] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
              >
                {isDictLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* Loading State Spinner (ActivityIndicator style) */}
          {isDictLoading && (
            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-[#D5E2F2]/70 shadow-sm space-y-3">
              <div className="relative">
                <div className="w-10 h-10 border-4 border-[#EFF4F9] border-t-[#16335A] rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-xs md:text-sm font-bold text-[#16335A]">
                  Looking up "{lastQuery}"…
                </p>
                <p className="text-[11px] text-[#6B7C93] mt-0.5">
                  Fetching definition from Free Dictionary API...
                </p>
              </div>
            </div>
          )}

          {/* Error & Offline State with Retry Button */}
          {!isDictLoading && !!dictError && (
            <div className="p-4 sm:p-5 bg-red-50/90 border border-red-200 rounded-3xl text-left space-y-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs md:text-sm font-bold text-red-900">
                    Unable to Complete Dictionary Lookup
                  </h4>
                  <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                    {dictError}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => lookupWord(lastQuery)}
                  disabled={!lastQuery || isDictLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-red-300 shadow-xs transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>🔄 Retry</span>
                </button>
                <span className="text-[11px] text-red-600 italic">
                  Tap Retry to re-send the API request.
                </span>
              </div>
            </div>
          )}

          {/* Dictionary Result Card */}
          {!isDictLoading && dictResult && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md shadow-[#16335A]/5 border-2 border-[#16335A]/15 space-y-4">
              {/* Word Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D5E2F2]/60">
                <div>
                  <h3 className="font-heading text-2xl md:text-3xl font-extrabold text-[#16335A] capitalize">
                    {dictResult.word}
                  </h3>
                  {dictResult.phonetic && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs md:text-sm font-mono text-[#6B7C93] bg-[#EFF4F9] px-2 py-0.5 rounded-md">
                        {dictResult.phonetic}
                      </span>
                      {availableAudio && (
                        <button
                          onClick={() => playPronunciation(availableAudio)}
                          disabled={playingAudio}
                          title="Listen to pronunciation"
                          className="p-1.5 rounded-full bg-[#E6F4E9] hover:bg-[#D4ECD8] text-[#2E9E5B] transition-all cursor-pointer"
                        >
                          <Volume2 className={`w-4 h-4 ${playingAudio ? 'animate-pulse' : ''}`} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Save / Bridge Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSaveFromResult}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2E9E5B] hover:bg-[#258249] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>💾 Save to My Notes</span>
                  </button>

                  <button
                    onClick={() =>
                      handleAskBuddyAboutWord(
                        dictResult.word,
                        dictResult.meanings?.[0]?.definitions?.[0]?.definition
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16335A] hover:bg-[#204374] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#EBD289]" />
                    <span>Explain in LET Context</span>
                  </button>
                </div>
              </div>

              {/* Notification if saved */}
              {saveSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Meanings & Definitions */}
              <div className="space-y-4 pt-1">
                {dictResult.meanings.slice(0, 3).map((meaning, mi) => (
                  <div key={mi} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#E6F4E9] text-[#2E9E5B] border border-[#2E9E5B]/20">
                        {meaning.partOfSpeech}
                      </span>
                    </div>

                    <ol className="space-y-2 pl-1">
                      {meaning.definitions.slice(0, 3).map((def, di) => (
                        <li key={di} className="text-xs md:text-sm text-[#1B2A41] leading-relaxed flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-[#EFF4F9] text-[#16335A] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-[#D5E2F2]">
                            {di + 1}
                          </span>
                          <div className="flex-1 space-y-1">
                            <span className="text-[#16335A]">{def.definition}</span>
                            {def.example && (
                              <p className="text-xs italic text-[#6B7C93] pl-2 border-l-2 border-[#D5E2F2]">
                                "{def.example}"
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>

                    {meaning.synonyms && meaning.synonyms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 pl-7 text-[11px]">
                        <span className="font-semibold text-[#6B7C93]">Synonyms:</span>
                        {meaning.synonyms.slice(0, 5).map((syn, si) => (
                          <button
                            key={si}
                            onClick={() => {
                              setDictQuery(syn);
                              lookupWord(syn);
                            }}
                            className="text-[#2563B8] hover:underline cursor-pointer bg-[#EFF4F9] px-2 py-0.5 rounded-md"
                          >
                            {syn}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION B: Add Custom Study Note (Lab 4 CRUD: Create) ── */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#D5E2F2]/70 space-y-3">
            <h3 className="text-xs md:text-sm font-bold text-[#16335A] flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#2E9E5B]" />
              ✏️ Add Custom Study Note (Local Data Persistence)
            </h3>
            <p className="text-xs text-[#6B7C93]">
              Add your own pedagogical notes or board exam mnemonics. They survive app restarts via local storage.
            </p>

            <form onSubmit={handleAddCustomNote} className="space-y-2.5">
              <input
                type="text"
                value={customWord}
                onChange={(e) => setCustomWord(e.target.value)}
                placeholder="Term or Concept (e.g., ZPD, Scaffolding, RA 7836)"
                className="w-full text-xs md:text-sm p-2.5 rounded-xl bg-[#EFF4F9] border border-[#D5E2F2] text-[#16335A] focus:outline-none focus:bg-white focus:border-[#16335A]"
              />
              <textarea
                rows={2}
                value={customDefinition}
                onChange={(e) => setCustomDefinition(e.target.value)}
                placeholder="Definition, board exam mnemonic, or key points..."
                className="w-full text-xs md:text-sm p-2.5 rounded-xl bg-[#EFF4F9] border border-[#D5E2F2] text-[#16335A] focus:outline-none focus:bg-white focus:border-[#16335A]"
              />
              <button
                type="submit"
                disabled={!customWord.trim() || !customDefinition.trim()}
                className="w-full py-2.5 bg-[#16335A] hover:bg-[#204374] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs"
              >
                ➕ Add to My Saved Notes
              </button>
            </form>
          </div>

          {/* ── SECTION C: My Saved Notes (Lab 4 CRUD: Read, Update, Delete) ── */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#D5E2F2]/70 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs md:text-sm font-bold text-[#16335A] flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4 text-[#2E9E5B]" />
                📒 My Saved Notes ({savedNotes.length})
              </h3>
              <span className="text-[11px] font-semibold text-[#6B7C93]">
                Survives App Reopening
              </span>
            </div>

            {savedNotes.length === 0 ? (
              <p className="text-xs text-[#6B7C93] italic py-2">
                No saved study notes yet. Look up a word above or add a custom note to test local storage!
              </p>
            ) : (
              <div className="space-y-2.5 pt-1">
                {savedNotes.map((note) => {
                  const isEditing = editingNoteId === note.id;
                  return (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-2xl bg-[#EFF4F9]/60 border border-[#D5E2F2] space-y-2 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#16335A] text-xs md:text-sm capitalize">
                              {note.word}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-[#2E9E5B] bg-[#E6F4E9] px-1.5 py-0.5 rounded">
                              {note.pos}
                            </span>
                          </div>
                          {note.phonetic && (
                            <span className="text-[11px] font-mono text-[#6B7C93]">
                              {note.phonetic}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleStartEdit(note)}
                            className="p-1.5 rounded-lg hover:bg-white text-[#2563B8] transition-all cursor-pointer"
                            title="Edit definition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 rounded-lg hover:bg-white text-red-600 transition-all cursor-pointer"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Definition: View or Edit Mode */}
                      {isEditing ? (
                        <div className="space-y-2 pt-1">
                          <textarea
                            rows={2}
                            value={editDefinitionText}
                            onChange={(e) => setEditDefinitionText(e.target.value)}
                            className="w-full text-xs p-2 rounded-xl bg-white border border-[#16335A] text-[#16335A] focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCommitEdit(note.id)}
                              className="px-3 py-1 bg-[#2E9E5B] text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                              💾 Save
                            </button>
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1 bg-gray-200 text-[#16335A] text-xs font-bold rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#16335A] leading-relaxed">
                          {note.definition}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-[#D5E2F2]/40 text-[10px] text-[#6B7C93]">
                        <span>Saved: {note.createdAt}</span>
                        <button
                          onClick={() => handleAskBuddyAboutWord(note.word, note.definition)}
                          className="text-[#2563B8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          Ask Buddy about this ›
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODE 2: BUDDY AI STUDY COACH (Gemini AI Chat & Board Review)
          ────────────────────────────────────────────────────────────────────────── */}
      {activeMode === 'ai' && (
        <>
          {!S.premium ? (
            /* Premium gate for AI Coach */
            <div className="flex-1 flex items-center justify-center py-6 px-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#D5E2F2]/60 text-center space-y-4 max-w-md w-full">
                <div className="w-14 h-14 rounded-full bg-[#E8C77A]/20 flex items-center justify-center mx-auto text-[#16335A]">
                  <Lock className="w-7 h-7 text-[#16335A]" />
                </div>

                <div>
                  <h3 className="font-bold text-[#16335A] text-lg">AI Coach is a Premium Feature</h3>
                  <p className="text-xs md:text-sm text-[#6B7C93] mt-1 max-w-sm mx-auto leading-relaxed">
                    Unlock Buddy powered by Gemini for unlimited board exam concept breakdowns, personalized mnemonics, and missed-item rationales.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-left space-y-1">
                  <p className="text-[11px] font-bold text-emerald-800">
                    💡 Good News:
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    The <strong>Educational Dictionary</strong> remains 100% free and accessible in the tab above!
                  </p>
                </div>

                <button
                  onClick={() => go('up')}
                  className="w-full py-3 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
                >
                  See Premium Plans
                </button>
              </div>
            </div>
          ) : (
            /* Full AI Coach Chat Area */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Suggestion Chips */}
              <div className="flex gap-2 overflow-x-auto py-2 no-scrollbar shrink-0">
                {[
                  'Mnemonic for Piaget stages',
                  'Explain Scaffolding vs ZPD',
                  'RA 7836 vs RA 9293',
                  'Assessment FOR learning vs OF learning',
                  'Give me a board exam tip',
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSend(chip)}
                    className="px-3 py-1.5 rounded-full bg-white text-[#16335A] text-[11px] font-semibold border border-[#D5E2F2] hover:border-[#16335A] whitespace-nowrap shadow-2xs transition-all cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-3 py-4 px-3 mt-1 mb-2 bg-white/70 rounded-3xl border border-[#D5E2F2]/80 shadow-inner">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${
                      m.b ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {m.b && (
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-[#D5E2F2]/60">
                        <Mascot size={26} />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs md:text-sm leading-relaxed whitespace-pre-line ${
                        m.b
                          ? 'bg-white text-[#1B2A41] shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 rounded-tl-xs'
                          : 'bg-[#2563B8] text-white rounded-tr-xs shadow-md shadow-[#2563B8]/20'
                      }`}
                    >
                      {m.t}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-[#6B7C93] text-xs pl-10 py-1">
                    <div className="w-2 h-2 rounded-full bg-[#3E9B52] animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-[#3E9B52] animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-[#3E9B52] animate-bounce [animation-delay:0.4s]" />
                    <span className="text-[11px]">BoardBuddy is thinking...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input bar */}
              <div className="pt-1 pb-1 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2 bg-white rounded-full p-1.5 pl-4 shadow-xl shadow-[#16335A]/15 border border-[#D5E2F2]"
                >
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask Buddy about any board exam topic..."
                    className="flex-1 text-xs md:text-sm text-[#1B2A41] placeholder-[#6B7C93] focus:outline-none bg-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!query.trim() || loading}
                    className="w-10 h-10 rounded-full bg-[#3E9B52] hover:bg-[#348345] disabled:opacity-50 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
