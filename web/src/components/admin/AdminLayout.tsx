import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShieldCheck, 
  BookOpen, 
  FileText, 
  Sparkles, 
  BarChart3, 
  Database, 
  Settings, 
  ScrollText, 
  LogOut, 
  Menu, 
  X,
  Bell,
  CheckCircle,
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../lib/avatar';
import { AdminOverview } from './AdminOverview';
import { StudentManagement } from './StudentManagement';
import { RegistrationVerification } from './RegistrationVerification';
import { SubjectManagement } from './SubjectManagement';
import { ReviewMaterialsManager } from './ReviewMaterialsManager';
import { AIQuizManager } from './AIQuizManager';
import { QuizAnalytics } from './QuizAnalytics';
import { DatabaseManager } from './DatabaseManager';
import { SystemSettingsView } from './SystemSettingsView';
import { ActivityLogsView } from './ActivityLogsView';
import { PaymentVerification } from './PaymentVerification';
import { QrCode } from 'lucide-react';

type AdminTab = 
  | 'overview' 
  | 'students' 
  | 'verification' 
  | 'payment-verification'
  | 'subjects' 
  | 'review-materials' 
  | 'ai-quizzes' 
  | 'analytics' 
  | 'database' 
  | 'settings' 
  | 'logs';

export const AdminLayout: React.FC<{ onSwitchToStudent?: () => void }> = ({ onSwitchToStudent }) => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'students', label: 'Student Management', icon: Users },
    { id: 'verification', label: 'Registration Audit', icon: ShieldCheck },
    { id: 'payment-verification', label: 'Payment QR Verification', icon: QrCode, badge: 'Receipts' },
    { id: 'subjects', label: 'Subject Management', icon: BookOpen },
    { id: 'review-materials', label: 'Review Materials', icon: FileText },
    { id: 'ai-quizzes', label: 'AI Quiz Management', icon: Sparkles },
    { id: 'analytics', label: 'Results & Analytics', icon: BarChart3 },
    { id: 'database', label: 'Database Management', icon: Database },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'logs', label: 'Activity Logs', icon: ScrollText },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AdminOverview onNavigateTab={(t) => setActiveTab(t as AdminTab)} />;
      case 'students':
        return <StudentManagement />;
      case 'verification':
        return <RegistrationVerification />;
      case 'payment-verification':
        return <PaymentVerification />;
      case 'subjects':
        return <SubjectManagement />;
      case 'review-materials':
        return <ReviewMaterialsManager />;
      case 'ai-quizzes':
        return <AIQuizManager />;
      case 'analytics':
        return <QuizAnalytics />;
      case 'database':
        return <DatabaseManager />;
      case 'settings':
        return <SystemSettingsView />;
      case 'logs':
        return <ActivityLogsView />;
      default:
        return <AdminOverview onNavigateTab={(t) => setActiveTab(t as AdminTab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FC] flex">
      {/* Sidebar for Desktop & Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#161426]/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col justify-between z-50 transition-transform duration-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div>
          {/* Brand Header */}
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
                  Super Admin
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
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as AdminTab);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#16335A] text-white shadow-md shadow-[#16335A]/20'
                      : 'text-slate-600 hover:text-[#16335A] hover:bg-[#FAF9FF]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#A8D8B0]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold uppercase ${
                      isActive ? 'bg-[#3E9B52] text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-3 border-t border-slate-100 bg-[#FAF9FF]/60">
          <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-2xs mb-2 flex items-center gap-2.5">
            {getAvatarUrl(currentUser) ? (
              <div className="w-8 h-8 aspect-square shrink-0 rounded-full overflow-hidden border border-[#3E9B52]">
                <img
                  src={getAvatarUrl(currentUser)}
                  alt={currentUser?.full_name || 'Admin'}
                  className="w-full h-full object-cover object-center block"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#16335A] text-white font-bold text-xs flex items-center justify-center">
                {currentUser?.full_name?.charAt(0) || 'A'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#16335A] truncate">{currentUser?.full_name}</p>
              <p className="text-[11px] text-slate-400 truncate">{currentUser?.email}</p>
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Navbar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="text-xs text-slate-400">BoardBuddy Governance System</span>
              <h1 className="text-sm font-bold text-[#16335A] capitalize">
                {activeTab.replace(/-/g, ' ')}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToStudent && (
              <button
                onClick={onSwitchToStudent}
                className="px-3 py-1.5 rounded-xl bg-[#16335A] text-white hover:bg-[#1F4478] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <GraduationCap className="w-4 h-4 text-[#A8D8B0]" />
                <span>Student Experience</span>
              </button>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Super Admin Active
            </span>

            <button
              onClick={logout}
              className="ml-2 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
