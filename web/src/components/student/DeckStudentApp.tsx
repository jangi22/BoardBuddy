import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Sparkles, 
  Layers, 
  PenTool, 
  BookOpen, 
  BarChart2, 
  User, 
  CreditCard,
  MessageSquare,
  ShieldAlert,
  LogOut,
  CheckCircle2
} from 'lucide-react';
import { DeckStudentState, DeckUser } from '../../types';
import { createInitialStudentState } from '../../data/boardContent';
import { DeckHome } from './DeckHome';
import { DeckNotes } from './DeckNotes';
import { DeckCards } from './DeckCards';
import { DeckPractice } from './DeckPractice';
import { DeckSelfReview } from './DeckSelfReview';
import { DeckProgress } from './DeckProgress';
import { DeckProfile } from './DeckProfile';
import { DeckAssistant } from './DeckAssistant';
import { DeckUpgrade } from './DeckUpgrade';
import { BgWave } from '../common/ThemeAssets';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { getAvatarUrl } from '../../lib/avatar';

interface DeckStudentAppProps {
  onOpenAdmin?: () => void;
}

export const DeckStudentApp: React.FC<DeckStudentAppProps> = ({ onOpenAdmin }) => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [avatarImgFailed, setAvatarImgFailed] = useState<boolean>(false);

  // Load persistent progress keyed by student's real verified email
  const [studentState, setStudentState] = useState<DeckStudentState>(() => {
    if (!currentUser) {
      return createInitialStudentState({
        name: 'Student',
        email: '',
        type: 'Graduating Education Student',
        joined: Date.now(),
        verified: 'approved',
      });
    }

    const storageKey = `bb_study_${currentUser.email}`;
    const saved = localStorage.getItem(storageKey);
    const resolvedAvatar = getAvatarUrl(currentUser);
    const initialUser: DeckUser = {
      name: currentUser.full_name,
      email: currentUser.email,
      type: currentUser.reviewee_type,
      institution: currentUser.institution,
      joined: new Date(currentUser.created_at).getTime(),
      docLabel: currentUser.reviewee_type === 'Graduating Education Student' ? 'Valid student ID' : 'Certificate',
      verified: 'approved',
      avatar_url: resolvedAvatar,
      avatarUrl: resolvedAvatar,
      photoUrl: resolvedAvatar,
    };

    const isPremium = Boolean(currentUser.is_premium);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...createInitialStudentState(initialUser),
          ...parsed,
          user: initialUser,
          premium: isPremium,
        };
      } catch (e) {
        return {
          ...createInitialStudentState(initialUser),
          premium: isPremium,
        };
      }
    }

    return {
      ...createInitialStudentState(initialUser),
      premium: isPremium,
    };
  });

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      const storageKey = `bb_study_${currentUser.email}`;
      const saved = localStorage.getItem(storageKey);
      const resolvedAvatar = getAvatarUrl(currentUser);
      const updatedUser: DeckUser = {
        name: currentUser.full_name,
        email: currentUser.email,
        type: currentUser.reviewee_type,
        institution: currentUser.institution,
        joined: new Date(currentUser.created_at).getTime(),
        docLabel: currentUser.reviewee_type === 'Graduating Education Student' ? 'Valid student ID' : 'Certificate',
        verified: 'approved',
        avatar_url: resolvedAvatar,
        avatarUrl: resolvedAvatar,
        photoUrl: resolvedAvatar,
      };

      const isPremium = Boolean(currentUser.is_premium);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setStudentState({
            ...createInitialStudentState(updatedUser),
            ...parsed,
            user: updatedUser,
            premium: isPremium, // Sync premium status from DB
          });
          return;
        } catch (e) {}
      }

      setStudentState({
        ...createInitialStudentState(updatedUser),
        premium: isPremium,
      });
    }
  }, [currentUser]);

  const activeAvatarUrl = getAvatarUrl(currentUser) || getAvatarUrl(studentState.user);

  useEffect(() => {
    setAvatarImgFailed(false);
  }, [activeAvatarUrl]);

  // Deferred real-time synchronization: If admin approves payment, unlock student premium immediately
  useEffect(() => {
    if (!currentUser?.id || currentUser.is_premium) return;

    let cancelled = false;
    const checkApproval = async () => {
      if (cancelled || document.hidden) return;
      try {
        const { data } = await supabase
          .from('manual_payment_receipts')
          .select('status')
          .eq('user_id', currentUser.id)
          .eq('status', 'APPROVED')
          .limit(1);

        if (!cancelled && data && data.length > 0) {
          setStudentState((prev) => {
            if (!prev.premium) {
              return { ...prev, premium: true };
            }
            return prev;
          });
        }
      } catch (_) {}
    };

    const initialTimer = setTimeout(checkApproval, 300);
    const interval = setInterval(checkApproval, 15000);

    const subscription = supabase
      .channel(`app_receipt_sync_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manual_payment_receipts',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          void checkApproval();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [currentUser?.id, currentUser?.is_premium]);

  const handleNavigate = (tab: string, topicId?: string) => {
    if (tab === 'cards' || tab === 'practice') {
      setSelectedTopicId(topicId !== undefined ? topicId : null);
    } else if (topicId !== undefined) {
      setSelectedTopicId(topicId);
    }
    setActiveTab(tab);
  };

  const updateCurrentState = (fn: (prev: DeckStudentState) => DeckStudentState) => {
    setStudentState((prev) => {
      const next = fn(prev);
      if (currentUser?.email) {
        try {
          localStorage.setItem(`bb_study_${currentUser.email}`, JSON.stringify(next));
        } catch (e) {
          console.warn('LocalStorage save failed:', e);
        }
      }
      return next;
    });
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'notes', label: 'Summaries', icon: Sparkles },
    { id: 'practice', label: 'Practice', icon: PenTool },
    { id: 'review', label: 'Review', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: BarChart2 },
    { id: 'up', label: 'Payment', icon: CreditCard },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return <DeckHome S={studentState} setStudentState={setStudentState} go={handleNavigate} />;
      case 'notes':
        return <DeckNotes S={studentState} save={updateCurrentState} go={handleNavigate} />;
      case 'cards':
        return <DeckCards S={studentState} save={updateCurrentState} go={handleNavigate} selectedTopicId={selectedTopicId} setSelectedTopicId={setSelectedTopicId} />;
      case 'practice':
        return (
          <DeckPractice
            S={studentState}
            save={updateCurrentState}
            go={handleNavigate}
            selectedTopicId={selectedTopicId}
            setSelectedTopicId={setSelectedTopicId}
          />
        );
      case 'review':
        return <DeckSelfReview S={studentState} save={updateCurrentState} go={handleNavigate} />;
      case 'progress':
        return <DeckProgress S={studentState} save={updateCurrentState} go={handleNavigate} />;
      case 'up':
        return <DeckUpgrade S={studentState} save={updateCurrentState} go={handleNavigate} />;
      case 'profile':
        return (
          <DeckProfile
            S={studentState}
            save={updateCurrentState}
            go={handleNavigate}
            logout={logout}
          />
        );
      case 'ai':
        return <DeckAssistant S={studentState} go={setActiveTab} />;
      default:
        return <DeckHome S={studentState} setStudentState={setStudentState} go={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#E8F1FB] text-[#1B2A41] relative font-sans flex flex-col md:flex-row selection:bg-[#3E9B52] selection:text-white">
      {/* Background wave decoration */}
      <BgWave />

      {/* Desktop Vertical Sidebar (Visible on md and larger screens) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-gradient-to-b from-[#16335A]/[0.08] via-white/90 to-[#16335A]/[0.04] backdrop-blur-md border-r border-[#16335A]/10 sticky top-0 h-screen z-30 shadow-xl shadow-[#16335A]/5 justify-between p-4 overflow-y-auto">
        <div className="space-y-6">
          {/* Brand / Logo Header */}
          <div className="flex items-center gap-3 p-2.5 bg-white/80 rounded-2xl border border-[#16335A]/10 shadow-xs backdrop-blur-xs">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#D5E2F2] flex items-center justify-center shadow-md shadow-[#16335A]/15 shrink-0 overflow-hidden p-0.5">
              <img
                src="/mascot-512.png"
                alt="BoardBuddy Logo"
                className="w-full h-full object-contain object-center"
              />
            </div>
            <div className="min-w-0">
              <span className="text-lg font-extrabold text-[#16335A] tracking-tight block leading-tight font-heading">
                BoardBuddy
              </span>
              <span className="text-[10px] font-bold text-[#3E9B52] bg-[#E6F4E9] px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                LET Reviewer
              </span>
            </div>
          </div>

          {/* Sidebar Navigation Items */}
          <nav className="space-y-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavigate(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'bg-[#16335A] text-white shadow-lg shadow-[#16335A]/25 ring-1 ring-[#16335A]'
                      : 'text-[#6B7C93] hover:text-[#16335A] hover:bg-white hover:shadow-md hover:shadow-[#3E9B52]/10 border border-transparent hover:border-[#3E9B52]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 transition-colors duration-200 ${
                        isActive
                          ? 'text-[#A8D8B0]'
                          : 'text-[#6B7C93] group-hover:text-[#3E9B52]'
                      }`}
                    />
                    <span className="transition-colors duration-200">{tab.label}</span>
                  </div>
                  {isActive ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#3E9B52] shadow-xs shadow-[#3E9B52]/50 animate-pulse" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-[#3E9B52]/60 transition-colors" />
                  )}
                </button>
              );
            })}

            {/* AI Study Assistant button in Sidebar */}
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer mt-3 group ${
                activeTab === 'ai'
                  ? 'bg-[#3E9B52] text-white shadow-lg shadow-[#3E9B52]/25 ring-1 ring-[#3E9B52]'
                  : 'text-[#3E9B52] bg-[#E6F4E9]/90 hover:bg-[#3E9B52] hover:text-white shadow-xs border border-[#3E9B52]/20 hover:border-[#3E9B52]'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className={`w-5 h-5 transition-colors ${activeTab === 'ai' ? 'text-white' : 'text-[#3E9B52] group-hover:text-white'}`} />
                <span>AI Study Assistant</span>
              </div>
              <Sparkles className={`w-4 h-4 transition-transform group-hover:rotate-12 ${activeTab === 'ai' ? 'text-white' : 'text-[#3E9B52] group-hover:text-white'}`} />
            </button>
          </nav>
        </div>

        {/* User Profile Footer Card in Sidebar */}
        <div className="pt-4 border-t border-[#16335A]/10 space-y-3">
          <div
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/90 hover:bg-white border border-[#16335A]/10 hover:border-[#3E9B52]/40 shadow-sm hover:shadow-md hover:shadow-[#3E9B52]/10 transition-all cursor-pointer group"
          >
            {activeAvatarUrl && !avatarImgFailed ? (
              <div className="w-9 h-9 aspect-square shrink-0 rounded-full overflow-hidden border-2 border-[#3E9B52] shadow-2xs group-hover:scale-105 transition-transform bg-[#16335A]">
                <img
                  src={activeAvatarUrl}
                  alt={studentState.user.name}
                  onError={() => setAvatarImgFailed(true)}
                  className="w-full h-full object-cover object-center block"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#16335A] text-white font-bold text-xs flex items-center justify-center border-2 border-[#3E9B52] shrink-0 group-hover:scale-105 transition-transform">
                {studentState.user.name?.charAt(0) || 'S'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-bold text-[#16335A] text-xs truncate block group-hover:text-[#3E9B52] transition-colors">
                {studentState.user.name}
              </span>
              <span className="text-[10px] text-[#3E9B52] font-semibold block truncate">
                Verified Student
              </span>
            </div>
          </div>

          {currentUser?.role === 'SUPERADMIN' && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="w-full py-2.5 px-3 rounded-xl bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-[#A8D8B0]" />
              <span>Super Admin Console</span>
            </button>
          )}

          <button
            onClick={logout}
            className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#16335A] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#16335A]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (To the right of sidebar on desktop) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header Banner */}
        <header className="relative z-20 bg-white/80 backdrop-blur-md border-b border-[#D5E2F2]/80 px-4 py-2.5">
          <div className="w-full px-2 sm:px-4 lg:px-6 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setActiveTab('profile')}
                title="View & Edit Profile"
                className="relative cursor-pointer transition-transform hover:scale-105 active:scale-95 md:hidden"
              >
                {activeAvatarUrl && !avatarImgFailed ? (
                  <div className="w-8 h-8 aspect-square shrink-0 rounded-full overflow-hidden border-2 border-[#3E9B52] shadow-2xs bg-[#16335A]">
                    <img
                      src={activeAvatarUrl}
                      alt={studentState.user.name}
                      onError={() => setAvatarImgFailed(true)}
                      className="w-full h-full object-cover object-center block"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#16335A] text-white font-bold text-xs flex items-center justify-center border-2 border-[#3E9B52]">
                    {studentState.user.name?.charAt(0) || 'S'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#3E9B52] border-2 border-white" />
              </button>
              <div className="flex flex-col">
                <span className="font-bold text-[#16335A] text-xs sm:text-sm leading-tight">
                  {studentState.user.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[#3E9B52] text-[10px] sm:text-xs font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Account</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {currentUser?.role === 'SUPERADMIN' && onOpenAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="px-3 py-1.5 rounded-xl bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-[#A8D8B0]" />
                  <span>Super Admin Console</span>
                </button>
              )}

              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#16335A] font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Content View - Fluid Full Width */}
        <main className="relative z-10 flex-1 py-4 md:py-6 w-full px-4 sm:px-6 lg:px-8 pb-28 md:pb-8">
          {renderActiveView()}
        </main>
      </div>

      {/* Floating Action Button (FAB) for AI Study Assistant */}
      {activeTab !== 'ai' && (
        <button
          onClick={() => setActiveTab('ai')}
          aria-label="Open AI Study Assistant"
          className="fixed right-5 bottom-22 md:bottom-8 md:right-8 z-30 w-14 h-14 rounded-full bg-[#3E9B52] hover:bg-[#348345] text-white flex items-center justify-center shadow-xl shadow-[#3E9B52]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <MessageSquare className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Mobile Fixed Bottom Tabs Bar (Hidden on Desktop) */}
      <nav className="md:hidden fixed left-0 right-0 bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#D5E2F2] shadow-2xl rounded-t-2xl py-2 px-1">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleNavigate(tab.id)}
                className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 cursor-pointer group"
              >
                <div
                  className={`px-3 py-1 rounded-full transition-all ${
                    isActive
                      ? 'bg-[#E1F1E5] text-[#3E9B52]'
                      : 'text-[#6B7C93] group-hover:text-[#16335A]'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[10px] mt-0.5 transition-colors leading-tight ${
                    isActive
                      ? 'font-bold text-[#3E9B52]'
                      : 'font-medium text-[#6B7C93]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
