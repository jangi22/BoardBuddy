import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  Award, 
  Sparkles, 
  Layers, 
  PenTool, 
  MessageSquare, 
  Target, 
  ChevronRight,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DeckStudentState, ManualPaymentReceipt } from '../../types';
import { T, C, day, streak, acc, weak } from '../../data/boardContent';
import { Badge, Mascot } from '../common/ThemeAssets';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

interface DeckHomeProps {
  S: DeckStudentState;
  setStudentState?: React.Dispatch<React.SetStateAction<DeckStudentState>>;
  go: (tab: string, topicId?: string) => void;
}

const Ring: React.FC<{ p: number; size?: number }> = ({ p, size = 100 }) => {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const strokeDashoffset = c - (c * p) / 100;

  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="9"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={C.green}
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute font-heading text-2xl text-white tracking-wide">
        {p}%
      </span>
    </div>
  );
};

export const DeckHome: React.FC<DeckHomeProps> = ({ S, setStudentState, go }) => {
  const { currentUser } = useAuth();
  const [rejectedReceipt, setRejectedReceipt] = useState<ManualPaymentReceipt | null>(null);
  const [hasPendingReceipt, setHasPendingReceipt] = useState(false);

  const fetchReceipts = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('manual_payment_receipts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const pending = data.some((r: any) => r.status === 'PENDING_VERIFICATION');
        setHasPendingReceipt(pending);

        const hasApproved = data.some((r: any) => r.status === 'APPROVED');
        const isUserPremium = Boolean(S.premium || currentUser?.is_premium || hasApproved);

        if (hasApproved || isUserPremium) {
          setRejectedReceipt(null);
          if (setStudentState && !S.premium) {
            setStudentState((prev) => ({ ...prev, premium: true }));
          }
        } else {
          const latest = data[0];
          if (latest && latest.status === 'REJECTED') {
            setRejectedReceipt(latest);
          } else {
            setRejectedReceipt(null);
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    let cancelled = false;
    const safeFetchReceipts = () => {
      if (cancelled || document.hidden) return;
      void fetchReceipts();
    };

    const initialTimer = setTimeout(safeFetchReceipts, 250);

    // Background polling fallback paired with live Realtime updates
    const pollInterval = setInterval(safeFetchReceipts, 15000);

    let subscription: any = null;
    if (supabase && currentUser?.id) {
      subscription = supabase
        .channel(`home_receipt_updates_${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'manual_payment_receipts',
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => {
            if (!cancelled) void fetchReceipts();
          }
        )
        .subscribe();
    }

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
      if (supabase && subscription) supabase.removeChannel(subscription);
    };
  }, [currentUser?.id]);

  const d = T.filter((t) => S.done[t.id]).length;
  const p = Math.round((d / T.length) * 100);
  const w = weak(S)[0] || T[0];
  const a = acc(S, w);
  const td = (S.act || {})[day()] || 0;
  const km = Object.values(S.known).filter(Boolean).length;

  const hr = new Date().getHours();
  const gr = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (S.user.name || 'Student').split(' ')[0];

  const tiles = [
    { id: 'notes', icon: Sparkles, title: 'AI Summaries', bg: C.navy },
    { id: 'cards', icon: Layers, title: 'Flashcards', bg: C.blue },
    { id: 'practice', icon: PenTool, title: 'Practice', bg: C.green },
    { id: 'ai', icon: MessageSquare, title: 'Study Assistant', bg: C.nl },
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header with greeting and mascot badge */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl text-[#16335A] tracking-normal leading-tight">
            {gr}, {firstName}!
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-[#6B7C93] font-medium mt-1">
            Too much to review? Start small today.
          </p>
        </div>
        <Badge size={60} />
      </div>



      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#16335A] p-6 sm:p-8 md:p-10 shadow-xl shadow-[#16335A]/15 text-white flex items-center justify-between">
        {/* Deco circles */}
        <div className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-[#1F4478] pointer-events-none" />
        <div className="absolute -left-6 -bottom-12 w-40 h-40 rounded-full bg-[#3E9B52]/25 pointer-events-none" />

        <div className="relative z-10 flex-1 pr-4">
          <span className="font-semibold text-xs sm:text-sm tracking-wider uppercase text-[#A8D8B0] block">
            Your LET review progress
          </span>
          <div className="font-heading text-5xl sm:text-6xl md:text-7xl text-white my-1.5 tracking-tight">
            {d}/{T.length}
          </div>
          <span className="text-xs sm:text-sm md:text-base text-white/90">
            topics completed
          </span>
        </div>

        <div className="relative z-10">
          <Ring p={p} size={110} />
        </div>
      </div>

      {/* Mini Stats (Streak, Done Today, Cards Mastered) */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 flex flex-col items-center text-center">
          <Flame className="w-6 h-6 md:w-8 md:h-8 text-[#E8C77A]" />
          <span className="font-heading text-2xl sm:text-3xl md:text-4xl text-[#16335A] mt-2 leading-none">
            {streak(S)}
          </span>
          <span className="text-[11px] sm:text-xs md:text-sm text-[#6B7C93] font-medium mt-1">
            day streak
          </span>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 flex flex-col items-center text-center">
          <Clock className="w-6 h-6 md:w-8 md:h-8 text-[#2563B8]" />
          <span className="font-heading text-2xl sm:text-3xl md:text-4xl text-[#16335A] mt-2 leading-none">
            {td}
          </span>
          <span className="text-[11px] sm:text-xs md:text-sm text-[#6B7C93] font-medium mt-1">
            done today
          </span>
        </div>

        <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 flex flex-col items-center text-center">
          <Award className="w-6 h-6 md:w-8 md:h-8 text-[#3E9B52]" />
          <span className="font-heading text-2xl sm:text-3xl md:text-4xl text-[#16335A] mt-2 leading-none">
            {km}
          </span>
          <span className="text-[11px] sm:text-xs md:text-sm text-[#6B7C93] font-medium mt-1">
            cards mastered
          </span>
        </div>
      </div>

      {/* Today's Goal Card */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-7 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#16335A] text-sm sm:text-base md:text-lg">Today’s goal</h3>
          <span className="text-xs sm:text-sm font-semibold text-[#6B7C93]">
            {Math.min(td, 10)}/10
          </span>
        </div>
        <div className="w-full h-3 bg-[#D5E2F2] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#3E9B52] rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, td * 10)}%` }}
          />
        </div>
        <p className="text-xs sm:text-sm text-[#6B7C93]">
          Answer questions, review cards, or finish a topic to keep your streak.
        </p>
      </div>

      {/* Study Tools Grid */}
      <div>
        <h2 className="font-heading text-xl sm:text-2xl md:text-3xl text-[#16335A] mb-4">Study tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className="bg-white rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 hover:shadow-xl hover:border-[#16335A]/20 hover:scale-[1.02] transition-all text-left flex flex-col items-start cursor-pointer group"
              >
                <div 
                  style={{ backgroundColor: t.bg }} 
                  className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform"
                >
                  <Icon className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <span className="font-extrabold text-[#16335A] text-sm sm:text-base mt-4">
                  {t.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Focus Next Card */}
      <div>
        <h2 className="font-heading text-xl text-[#16335A] mb-3">Focus next</h2>
        <button
          onClick={() => go('cards', w.id)}
          className="w-full bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 hover:border-[#3E9B52]/40 transition-all text-left flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-11 h-11 rounded-full bg-[#3E9B52] flex items-center justify-center text-white shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-[#16335A] text-sm">{w.title}</h4>
              <p className="text-xs text-[#6B7C93] mt-0.5">
                {a === null
                  ? 'Not started yet. Read the summary, then try practice.'
                  : `Your accuracy is ${Math.round(a * 100)}%. Review this topic next.`}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6B7C93] group-hover:translate-x-1 transition-transform shrink-0" />
        </button>
      </div>

      {/* Premium Banner */}
      {S.premium ? (
        <div className="bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border-2 border-[#E8C77A] flex items-start gap-3">
          <Star className="w-5 h-5 text-[#E8C77A] fill-[#E8C77A] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-[#16335A] text-sm">Premium is active</h4>
            <p className="text-xs text-[#6B7C93] mt-0.5">
              Full materials, AI Study Assistant, personalized practice, and mock exams are unlocked.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Rejection Warning Banner right above See Premium */}
          {rejectedReceipt && !hasPendingReceipt && !S.premium && !currentUser?.is_premium && (
            <div className="bg-[#FFF0F3] rounded-2xl p-4 sm:p-5 border-2 border-rose-300 text-xs sm:text-sm text-rose-900 space-y-3 shadow-md animate-fade-in font-sans">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 font-bold text-[#A81538] text-sm sm:text-base">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Payment Receipt Rejected by Super Admin</span>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono self-start sm:self-auto">
                  Ref: {rejectedReceipt.reference_number}
                </span>
              </div>

              <div className="p-3.5 bg-white/95 rounded-xl border border-rose-200 text-xs space-y-1">
                <span className="font-bold text-[#A81538] uppercase tracking-wider text-[10px] block">
                  SUPER ADMIN AUDIT REASON:
                </span>
                <p className="font-semibold text-slate-800 text-xs sm:text-sm leading-relaxed">
                  "{rejectedReceipt.rejection_reason || 'Screenshot cut off / unreadable'}"
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
                  Your payment upload form is unlocked. Please select your plan and upload a corrected receipt.
                </p>
                <button
                  onClick={() => go('up')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0 uppercase tracking-wide"
                >
                  <span>Re-Upload Payment Receipt</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-md shadow-[#16335A]/5 border-2 border-[#E8C77A]">
            <h4 className="font-bold text-[#16335A] text-sm">Monthly Premium Plan · ₱149/month</h4>
            <p className="text-xs text-[#6B7C93] my-2">
              Full review materials, unlimited flashcards, AI Study Assistant, mock board exams, and detailed analytics.
            </p>
            <button
              onClick={() => go('up')}
              className="w-full py-3 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-xl shadow-md shadow-[#3E9B52]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>See Premium</span>
            </button>
          </div>
        </div>
      )}

      {/* Mascot Footer Card */}
      <div className="bg-[#16335A] rounded-2xl p-4 shadow-xl shadow-[#16335A]/15 text-white flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shrink-0 shadow-inner">
          <Mascot size={54} />
        </div>
        <div>
          <h3 className="font-heading text-xl text-white leading-tight">
            Don’t study alone.
          </h3>
          <p className="text-sm font-semibold text-[#A8D8B0]">
            Study with a buddy.
          </p>
        </div>
      </div>
    </div>
  );
};
