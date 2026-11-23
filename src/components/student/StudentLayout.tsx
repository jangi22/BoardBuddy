import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  FileCheck2, 
  Trophy, 
  TrendingUp, 
  Bot, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../lib/avatar';
import { StudentDashboard } from './StudentDashboard';
import { SubjectsView } from './SubjectsView';
import { ReviewMaterialsView } from './ReviewMaterialsView';
import { PracticeQuizzesView } from './PracticeQuizzesView';
import { QuizRunner } from './QuizRunner';
import { MyResultsView } from './MyResultsView';
import { MyProgressView } from './MyProgressView';
import { AIAssistantView } from './AIAssistantView';
import { StudentProfileView } from './StudentProfileView';

type StudentTab = 
  | 'dashboard' 
  | 'subjects' 
  | 'review-materials' 
  | 'quizzes' 
  | 'my-results' 
  | 'my-progress' 
  | 'ai-assistant' 
  | 'profile';

export const StudentLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<StudentTab>('dashboard');
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [targetSubjectId, setTargetSubjectId] = useState<string | undefined>();
  const [assistantInitialQuery, setAssistantInitialQuery] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'review-materials', label: 'Review Materials', icon: FileText },
    { id: 'quizzes', label: 'Practice Quizzes', icon: FileCheck2 },
    { id: 'my-results', label: 'My Results', icon: Trophy },
    { id: 'my-progress', label: 'My Progress', icon: TrendingUp },
    { id: 'ai-assistant', label: 'AI Study Assistant', icon: Bot, isSpecial: true },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleNavigate = (tab: string, context?: any) => {
    setActiveQuizId(null);
    if (context?.subjectId) setTargetSubjectId(context.subjectId);
    if (context?.initialQuestion) setAssistantInitialQuery(context.initialQuestion);
    setActiveTab(tab as StudentTab);
  };

  const renderContent = () => {
    if (activeQuizId) {
      return (
        <QuizRunner
          quizId={activeQuizId}
          onExit={() => setActiveQuizId(null)}
          onRetake={() => {}}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <StudentDashboard
            onNavigateTab={handleNavigate}
            onLaunchQuiz={(qId) => setActiveQuizId(qId)}
          />
        );
      case 'subjects':
        return (
          <SubjectsView
            onSelectSubjectNotes={(sId) => {
              setTargetSubjectId(sId);
              setActiveTab('review-materials');
            }}
            onLaunchSubjectQuiz={(sId) => {
              setTargetSubjectId(sId);
              setActiveTab('quizzes');
            }}
          />
        );
      case 'review-materials':
        return <ReviewMaterialsView initialSubjectId={targetSubjectId} />;
      case 'quizzes':
        return (
          <PracticeQuizzesView
            onStartQuiz={(qId) => setActiveQuizId(qId)}
            initialSubjectId={targetSubjectId}
          />
        );
      case 'my-results':
        return (
          <MyResultsView
            onRetakeQuiz={(qId) => setActiveQuizId(qId)}
          />
        );
      case 'my-progress':
        return (
          <MyProgressView
            onNavigateNotes={(sId) => {
              setTargetSubjectId(sId);
              setActiveTab('review-materials');
            }}
          />
        );
      case 'ai-assistant':
        return <AIAssistantView initialQuestion={assistantInitialQuery} />;
      case 'profile':
        return <StudentProfileView />;
      default:
        return (
          <StudentDashboard
            onNavigateTab={handleNavigate}
            onLaunchQuiz={(qId) => setActiveQuizId(qId)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FC] flex">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#161426]/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col justify-between z-50 transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div>
          {/* Logo & Brand Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#D5E2F2] flex items-center justify-center shadow-md shadow-[#16335A]/15 overflow-hidden p-0.5 shrink-0">
                <img
                  src="/mascot-512.png"
                  alt="BoardBuddy Logo"
                  className="w-full h-full object-contain object-center"
                />
              </div>
              <div>
                <span className="text-base font-extrabold text-[#16335A] tracking-tight block">BoardBuddy</span>
                <span className="text-[10px] font-bold text-[#3E9B52] bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Reviewee Portal
                </span>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id && !activeQuizId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveQuizId(null);
                    setActiveTab(item.id as StudentTab);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#16335A] text-white shadow-md shadow-[#16335A]/20'
                      : item.isSpecial
                      ? 'text-[#3E9B52] bg-emerald-50/70 hover:bg-emerald-100/60'
                      : 'text-slate-600 hover:text-[#16335A] hover:bg-[#FAF9FF]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#A8D8B0]' : item.isSpecial ? 'text-[#3E9B52]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.isSpecial && !isActive && (
                    <Sparkles className="w-3.5 h-3.5 text-[#3E9B52]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Profile Card & Logout */}
        <div className="p-3 border-t border-slate-100 bg-[#FAF9FF]/60">
          <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs mb-2 flex items-center gap-2.5">
            {getAvatarUrl(currentUser) ? (
              <div className="w-8 h-8 aspect-square shrink-0 rounded-full overflow-hidden border border-[#3E9B52]">
                <img
                  src={getAvatarUrl(currentUser)}
                  alt={currentUser?.full_name || 'Student'}
                  className="w-full h-full object-cover object-center block"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#16335A] text-white font-bold text-xs flex items-center justify-center">
                {currentUser?.full_name?.charAt(0) || 'R'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#16335A] truncate">{currentUser?.full_name}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser?.institution}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs text-slate-400">Board Exam Preparation System</span>
              <h1 className="text-sm font-bold text-[#16335A] capitalize">
                {activeQuizId ? 'Practice Examination' : activeTab.replace(/-/g, ' ')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 hidden sm:inline">
                {currentUser?.full_name}
              </span>
              {getAvatarUrl(currentUser) ? (
                <div className="w-8 h-8 aspect-square shrink-0 rounded-full overflow-hidden border border-[#3E9B52]">
                  <img
                    src={getAvatarUrl(currentUser)}
                    alt={currentUser?.full_name || 'Student'}
                    className="w-full h-full object-cover object-center block"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#16335A] text-white font-bold text-xs flex items-center justify-center">
                  {currentUser?.full_name?.charAt(0) || 'R'}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 flex-1 w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
