import { supabase } from "../../lib/supabaseClient";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
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
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { generateLocalBoardCoachReply } from '../../lib/localStudyCoach';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

/* ── Free Dictionary API Data Types ── */
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

export const AIAssistantView: React.FC<{ initialQuestion?: string }> = ({ initialQuestion }) => {
  const { currentUser } = useAuth();
  const userIdentifier = String(currentUser?.email || currentUser?.id || 'guest')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const chatStorageKey = `bb_assistant_history_${userIdentifier}`;
  const notesStorageKey = `bb_assistant_notes_${userIdentifier}`;

  // Mode: 'dictionary' (Lab 4 Free Dictionary API) or 'ai' (Gemini AI Coach)
  const [activeMode, setActiveMode] = useState<'dictionary' | 'ai'>('dictionary');

  /* ──────────────────────────────────────────────────────────────────────────
     1. NETWORKING & EXTERNAL API INTEGRATION (Free Dictionary API)
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
      console.warn('Failed to load notes:', e);
    }
    return [];
  };

  const [savedNotes, setSavedNotes] = useState<SavedStudyNote[]>(() => loadSavedNotes());
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editDefinitionText, setEditDefinitionText] = useState('');
  const [customWord, setCustomWord] = useState('');
  const [customDefinition, setCustomDefinition] = useState('');

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
        throw new Error('You appear to be offline. Check your network connection and tap Retry.');
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
          ? 'You appear to be offline. Check your network connection and tap Retry.'
          : `Network error: ${msg || 'Unable to reach dictionary server'}. Tap Retry.`
      );
    } finally {
      setIsDictLoading(false);
    }
  };

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

  const handleCommitEdit = (id: string) => {
    if (!editDefinitionText.trim()) return;
    const updated = savedNotes.map((n) =>
      n.id === id ? { ...n, definition: editDefinitionText.trim() } : n
    );
    persistNotes(updated);
    setEditingNoteId(null);
    setEditDefinitionText('');
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm('Delete this saved study note?')) {
      persistNotes(savedNotes.filter((n) => n.id !== id));
    }
  };

  const handleAskBuddyAboutWord = (word: string, _def?: string) => {
    setActiveMode('ai');
    const promptText = `Explain the educational concept "${word}" in the context of the Philippine LET Board Exam, including core learning theories, classroom applications, high-yield board pointers, and sample LET questions.`;
    handleSend(promptText);
  };

  /* ──────────────────────────────────────────────────────────────────────────
     2. AI COACH CHAT STATE & LOGIC (Preserved)
     ────────────────────────────────────────────────────────────────────────── */
  const getInitialGreeting = (): Message[] => [
    {
      id: 'msg-init',
      sender: 'assistant',
      text: `Hello ${currentUser?.full_name?.split(' ')[0] || 'Reviewee'}! I am **Buddy**, your AI Study Assistant for the Philippine Professional Board Examinations.\n\nI can help you with:\n- **Explaining tricky concepts** (e.g. Piaget cognitive stages, Bruner discovery learning, Vygotsky ZPD)\n- **Breaking down laws & ethics** (e.g. RA 7836 vs RA 9293, PRC Code of Ethics dilemmas)\n- **Explaining math & measurement formulas** (e.g. Difficulty index, discrimination index, standard deviation)\n- **Clarifying missed quiz questions** with clear rationales.\n\nWhat would you like to review today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          parsed.every((m) => m && typeof m.text === 'string' && (m.sender === 'user' || m.sender === 'assistant'))
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load saved assistant chat history:', e);
    }
    return getInitialGreeting();
  };

  const [messages, setMessages] = useState<Message[]>(() => loadSavedMessages(chatStorageKey));
  const [input, setInput] = useState(initialQuestion || '');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedKeyRef = useRef<string>(chatStorageKey);

  useEffect(() => {
    if (loadedKeyRef.current !== chatStorageKey) {
      loadedKeyRef.current = chatStorageKey;
      setMessages(loadSavedMessages(chatStorageKey));
    }
  }, [chatStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(chatStorageKey, JSON.stringify(messages.slice(-100)));
    } catch (e) {
      console.warn('Failed to persist assistant chat history:', e);
    }
  }, [messages, chatStorageKey]);

  useEffect(() => {
    if (activeMode === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeMode]);

  useEffect(() => {
    if (initialQuestion && initialQuestion.trim()) {
      setActiveMode('ai');
      handleSend(initialQuestion);
    }
  }, []);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const clientKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
      const usableClientKey =
        clientKey &&
        clientKey !== 'undefined' &&
        clientKey !== 'null'
          ? clientKey
          : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (usableClientKey) {
        headers['x-gemini-api-key'] = usableClientKey;
      }

      const resp = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMsg.text,
          student_name: currentUser?.full_name,
          ...(usableClientKey ? { gemini_api_key: usableClientKey } : {}),
        }),
      });

      const data = await resp.json();
      const serverReply = String(data.reply || data.answer || '').trim();
      const replyText =
        serverReply && !serverReply.startsWith('⚠️')
          ? serverReply
          : generateLocalBoardCoachReply({
              question: userMsg.text,
              studentName: currentUser?.full_name,
            });

      const botReply: Message = {
        id: `msg-${Date.now()}-bot`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botReply]);
    } catch (_err: any) {
      const fallbackText = generateLocalBoardCoachReply({
        question: userMsg.text,
        studentName: currentUser?.full_name,
      });
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-bot`,
          sender: 'assistant',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'How do I distinguish between Centration and Conservation in Piaget\'s theory?',
    'What are the para-teacher permit rules under RA 9293?',
    'How do I interpret a negative discrimination index (D = -0.30)?',
    'Explain Erikson\'s Industry vs. Inferiority crisis with a classroom scenario.'
  ];

  const pedagogicalTerms = [
    'pedagogy',
    'scaffolding',
    'epistemology',
    'cognition',
    'affective',
    'rubric',
    'metacognition',
    'formative'
  ];

  const availableAudio = dictResult?.phonetics?.find((p) => p.audio && p.audio.trim().length > 0)?.audio;

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#16335A] to-[#2563B8] text-white flex items-center justify-center font-bold shadow-md shadow-[#16335A]/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#16335A]">Buddy – AI Study Assistant</h2>
            <p className="text-xs text-slate-500">
              Educational Dictionary & AI Board Exam Grounding
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Online & Ready
        </span>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex bg-[#EAF2F9] p-1 rounded-2xl border border-[#D5E2F2]">
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

      {/* ── MODE 1: Free Dictionary API ── */}
      {activeMode === 'dictionary' && (
        <div className="space-y-4">
          {/* Search Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#16335A] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#2E9E5B]" />
                Free Dictionary API Lookup
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Look up educational & pedagogical terms using Free Dictionary API.
              </p>
            </div>

            {/* Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">Try term:</span>
              {pedagogicalTerms.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setDictQuery(term);
                    lookupWord(term);
                  }}
                  disabled={isDictLoading}
                  className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[#16335A] text-xs font-medium transition-all cursor-pointer shrink-0"
                >
                  {term}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookupWord();
              }}
              className="flex items-center gap-2 bg-slate-50 rounded-xl p-1.5 pl-3 border border-slate-200 focus-within:border-[#16335A] focus-within:bg-white"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={dictQuery}
                onChange={(e) => setDictQuery(e.target.value)}
                placeholder="Search term (e.g. pedagogy, scaffolding, epistemology)..."
                className="flex-1 text-xs md:text-sm text-[#16335A] placeholder-slate-400 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                disabled={!dictQuery.trim() || isDictLoading}
                className="px-4 py-2 bg-[#2E9E5B] hover:bg-[#258249] disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {isDictLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Search</span>
              </button>
            </form>
          </div>

          {/* Loading state */}
          {isDictLoading && (
            <div className="p-8 bg-white rounded-2xl border border-slate-100 text-center space-y-2 shadow-xs">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-[#16335A] rounded-full animate-spin mx-auto" />
              <p className="text-xs md:text-sm font-bold text-[#16335A]">Looking up "{lastQuery}"…</p>
              <p className="text-[11px] text-slate-400">Fetching definition from Free Dictionary API...</p>
            </div>
          )}

          {/* Error & Offline state with Retry */}
          {!isDictLoading && !!dictError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-left space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs md:text-sm font-bold text-red-900">Lookup Unsuccessful</h4>
                  <p className="text-xs text-red-700 mt-0.5">{dictError}</p>
                </div>
              </div>
              <button
                onClick={() => lookupWord(lastQuery)}
                disabled={!lastQuery || isDictLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 font-bold text-xs rounded-lg border border-red-300 shadow-2xs transition-all cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>🔄 Retry</span>
              </button>
            </div>
          )}

          {/* Result card */}
          {!isDictLoading && dictResult && (
            <div className="bg-white rounded-2xl p-5 border-2 border-[#16335A]/15 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-2xl font-extrabold text-[#16335A] capitalize">{dictResult.word}</h3>
                  {dictResult.phonetic && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {dictResult.phonetic}
                      </span>
                      {availableAudio && (
                        <button
                          onClick={() => playPronunciation(availableAudio)}
                          disabled={playingAudio}
                          className="p-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveFromResult}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2E9E5B] hover:bg-[#258249] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>💾 Save to Notes</span>
                  </button>
                  <button
                    onClick={() =>
                      handleAskBuddyAboutWord(
                        dictResult.word,
                        dictResult.meanings?.[0]?.definitions?.[0]?.definition
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16335A] hover:bg-[#204374] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#EBD289]" />
                    <span>Explain in LET Context</span>
                  </button>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <div className="space-y-3 pt-1">
                {dictResult.meanings.slice(0, 3).map((meaning, mi) => (
                  <div key={mi} className="space-y-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {meaning.partOfSpeech}
                    </span>
                    <ol className="space-y-1.5 pl-1">
                      {meaning.definitions.slice(0, 3).map((def, di) => (
                        <li key={di} className="text-xs md:text-sm text-slate-800 flex items-start gap-2">
                          <span className="font-bold text-[#16335A] shrink-0">{di + 1}.</span>
                          <div>
                            <span>{def.definition}</span>
                            {def.example && <p className="text-xs italic text-slate-400">"{def.example}"</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Note & Saved Notes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
            <h3 className="text-xs md:text-sm font-bold text-[#16335A] flex items-center gap-1.5">
              <BookmarkPlus className="w-4 h-4 text-[#2E9E5B]" />
              📒 My Saved Study Notes ({savedNotes.length})
            </h3>

            {savedNotes.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No notes saved yet. Look up a word to save it!</p>
            ) : (
              <div className="space-y-2">
                {savedNotes.map((note) => (
                  <div key={note.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#16335A] text-xs capitalize">{note.word}</span>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-700">{note.definition}</p>
                    <span className="text-[10px] text-slate-400">Saved: {note.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODE 2: AI Coach Chat Log ── */}
      {activeMode === 'ai' && (
        <div className="space-y-4">
          {/* Suggested Prompt Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0">
              <Lightbulb className="w-3.5 h-3.5 text-[#16335A]" />
              Suggested:
            </span>
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 hover:border-[#16335A] text-slate-700 hover:text-[#16335A] text-xs font-medium transition-all shrink-0 cursor-pointer shadow-2xs text-left"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 h-[480px] overflow-y-auto space-y-4">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isUser 
                      ? 'bg-slate-200 text-slate-700' 
                      : 'bg-[#16335A] text-white shadow-xs'
                  }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className={`max-w-xl rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-[#16335A] text-white rounded-tr-none'
                      : 'bg-[#FAF9FF] border border-slate-100 text-slate-800 rounded-tl-none whitespace-pre-wrap font-sans'
                  }`}>
                    {m.text}
                    <span className={`block text-[10px] mt-2 font-mono ${
                      isUser ? 'text-slate-200 text-right' : 'text-slate-400 text-left'
                    }`}>
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#16335A] text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-[#FAF9FF] border border-slate-100 p-3.5 rounded-2xl rounded-tl-none text-xs text-slate-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#2E9E5B] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[#2E9E5B] animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-[#2E9E5B] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] font-semibold text-slate-400 ml-1">Buddy is analyzing board concepts...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Buddy a board exam question or concept (e.g. 'Explain Piaget stages')..."
              className="flex-1 p-2 text-xs md:text-sm bg-transparent outline-hidden resize-none text-[#16335A]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-[#2E9E5B] hover:bg-[#258249] text-white rounded-xl shadow-xs transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
