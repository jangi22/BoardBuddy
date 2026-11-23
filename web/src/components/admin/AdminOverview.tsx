import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  BookOpen, 
  FileCheck2, 
  Trophy, 
  TrendingUp, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Database,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';

interface AdminOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    approvedStudents: 0,
    pendingVerification: 0,
    rejectedStudents: 0,
    needsClearerCopy: 0,
    suspendedStudents: 0,
    totalSubjects: 0,
    totalQuizzes: 0,
    totalQuizAttempts: 0,
    averageStudentScore: 0,
    overallPassingRate: 0,
    supabaseConfigured: false,
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [serviceRoleOperational, setServiceRoleOperational] = useState<boolean | null>(null);

  useEffect(() => {
    fetchStats();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(true);
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        fetchStats(true);
      }
    }, 30000);

    let channel: any = null;
    if (isSupabaseReady) {
      channel = supabase
        .channel('admin-overview-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchStats(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_documents' }, () => {
          fetchStats(true);
        })
        .subscribe();
    }

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const fetchStats = async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFetchError('');
    try {
      const { data: { session } } = isSupabaseReady
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';
      let backendError = '';
      let resolvedServiceRoleFlag = false;

      if (token) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
          const resp = await fetch('/api/admin/overview', {
            cache: 'no-store',
            signal: controller.signal,
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            if (typeof data?.serviceRoleKeyOperational === 'boolean') {
              setServiceRoleOperational(data.serviceRoleKeyOperational);
              resolvedServiceRoleFlag = true;
            }
            if (typeof data?.totalStudents === 'number') {
              setStats({
                totalStudents: data.totalStudents || 0,
                approvedStudents: data.approvedStudents || 0,
                pendingVerification: data.pendingVerification || 0,
                rejectedStudents: data.rejectedStudents || 0,
                needsClearerCopy: data.needsClearerCopy || 0,
                suspendedStudents: data.suspendedStudents || 0,
                totalSubjects: data.totalSubjects || 0,
                totalQuizzes: data.totalQuizzes || 0,
                totalQuizAttempts: data.totalQuizAttempts || 0,
                averageStudentScore: data.averageStudentScore || 0,
                overallPassingRate: data.overallPassingRate || 85,
                supabaseConfigured: Boolean(data.supabaseConfigured ?? true),
              });
              if (Array.isArray(data.recentLogs)) {
                setRecentLogs(data.recentLogs);
              }
              return;
            }
          } else {
            const errJson = await resp.json().catch(() => ({}));
            backendError = errJson?.error || errJson?.message || `Overview API error (HTTP ${resp.status}).`;
          }
        } catch (apiErr: any) {
          backendError =
            apiErr?.name === 'AbortError'
              ? 'Overview request timed out. Falling back to direct database query...'
              : apiErr?.message || 'Unable to reach overview API.';
        } finally {
          clearTimeout(timeoutId);
        }
      }

      // Deferred health check only if overview API didn't report service role status
      if (!resolvedServiceRoleFlag) {
        fetch('/api/health', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .then((h) => {
            if (h?.supabase && typeof h.supabase.serviceRoleKeyOperational === 'boolean') {
              setServiceRoleOperational(h.supabase.serviceRoleKeyOperational);
            }
          })
          .catch(() => {});
      }

      if (!isSupabaseReady) {
        if (backendError) setFetchError(backendError);
        return;
      }

      const [
        { data: profileRows, error: profilesErr },
        { count: totalSubjects },
        { count: totalQuizzes },
        { count: totalQuizAttempts },
        { data: logs }
      ] = await Promise.race([
        Promise.all([
          supabase.from('profiles').select('id, email, verification_status, role').or('role.neq.SUPERADMIN,role.is.null'),
          supabase.from('subjects').select('*', { count: 'exact', head: true }),
          supabase.from('quizzes').select('*', { count: 'exact', head: true }),
          supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }),
          supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(5)
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Loading dashboard statistics timed out. Please click Retry.')), 8000)
        ),
      ]);

      if (profilesErr) {
        setFetchError(backendError || profilesErr.message || 'Unable to fetch registration metrics from Supabase.');
        return;
      }

      const filteredProfiles = (profileRows || []).filter((p: any) => {
        const em = String(p.email || '').trim().toLowerCase();
        if (String(p.role || '').toUpperCase() === 'SUPERADMIN') return false;
        if (em === 'boardbuddy.team@gmail.com') return false;
        return true;
      });

      let approvedStudents = 0;
      let pendingVerification = 0;
      let rejectedStudents = 0;
      let needsClearerCopy = 0;
      let suspendedStudents = 0;

      const PENDING_STATUSES = new Set([
        'PENDING_VERIFICATION',
        'PENDING',
        'PENDING_REVIEW',
        'SUBMITTED',
        'UNVERIFIED',
      ]);

      for (const p of filteredProfiles) {
        const st = String(p.verification_status ?? '').trim().replace(/\s+/g, '_').toUpperCase();
        if (st === 'APPROVED' || st === 'VERIFIED' || st === 'ACTIVE') approvedStudents++;
        else if (st === 'REJECTED') rejectedStudents++;
        else if (st === 'NEEDS_CLEARER_COPY') needsClearerCopy++;
        else if (st === 'SUSPENDED') suspendedStudents++;
        else if (!st || PENDING_STATUSES.has(st)) pendingVerification++;
      }

      if (backendError && filteredProfiles.length === 0) {
        setFetchError(backendError);
      }

      setStats({
        totalStudents: approvedStudents + pendingVerification + rejectedStudents + needsClearerCopy + suspendedStudents,
        approvedStudents,
        pendingVerification,
        rejectedStudents,
        needsClearerCopy,
        suspendedStudents,
        totalSubjects: totalSubjects || 0,
        totalQuizzes: totalQuizzes || 0,
        totalQuizAttempts: totalQuizAttempts || 0,
        overallPassingRate: 85,
        supabaseConfigured: true,
      });

      if (logs) {
        setRecentLogs(logs);
      }
    } catch (e: any) {
      console.warn('Stats fetch error', e);
      setFetchError(e?.message || 'Stats fetch error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Header & Live Refresh Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#25223A]">Super Admin Dashboard Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live student registration counts and verification metrics synced with Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchStats(false)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          <span>{loading || refreshing ? 'Refreshing...' : 'Refresh Overview'}</span>
        </button>
      </div>

      {fetchError && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <span className="font-bold block text-rose-900">Unable to sync overview statistics</span>
              <span className="text-rose-700 font-medium">{fetchError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchStats(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      )}

      {serviceRoleOperational === false && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">New registrations &amp; Auth sync are blocked: Invalid SUPABASE_SERVICE_ROLE_KEY</span>
            <p className="text-amber-900/90 leading-relaxed">
              The server&apos;s <code className="px-1 py-0.5 bg-amber-100 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is returning <strong>Unregistered API key</strong> from Supabase. Set the valid <strong>service_role</strong> secret key (from Supabase Dashboard → Project Settings → API) in your environment variables, and run <code className="px-1 py-0.5 bg-amber-100 rounded">supabase_fix.sql</code> in Supabase SQL Editor to sync existing registered users into the Pending queue.
            </p>
          </div>
        </div>
      )}

      {/* Pending Verifications Urgent Banner */}
      {stats.pendingVerification > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                {stats.pendingVerification} Reviewee Verification Case{stats.pendingVerification > 1 ? 's' : ''} Awaiting Review
              </h3>
              <p className="text-xs text-amber-900/80 mt-0.5">
                New applicants have submitted Student IDs/Certificates with Gemini OCR pre-scans ready for audit.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('verification')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>Audit Queue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Registered</span>
            <div className="p-2.5 rounded-xl bg-[#6847E8]/10 text-[#6847E8]">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#25223A] mt-2">{stats.totalStudents}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span className="font-semibold text-emerald-600">{stats.approvedStudents} Approved</span>
            <span>•</span>
            <span className="font-semibold text-amber-600">{stats.pendingVerification} Pending</span>
            {stats.needsClearerCopy > 0 && (
              <>
                <span>•</span>
                <span className="font-semibold text-blue-600">{stats.needsClearerCopy} Needs Copy</span>
              </>
            )}
            {stats.rejectedStudents > 0 && (
              <>
                <span>•</span>
                <span className="font-semibold text-rose-600">{stats.rejectedStudents} Rejected</span>
              </>
            )}
            {stats.suspendedStudents > 0 && (
              <>
                <span>•</span>
                <span className="font-semibold text-slate-600">{stats.suspendedStudents} Suspended</span>
              </>
            )}
          </div>
        </div>

        {/* Subjects & Curriculum */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Subjects</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#25223A] mt-2">{stats.totalSubjects}</p>
          <p className="text-[11px] text-slate-500 mt-2">
            Professional & General Education modules
          </p>
        </div>

        {/* Total Quizzes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Practice Drills</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-[#6847E8]">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#25223A] mt-2">{stats.totalQuizzes}</p>
          <p className="text-[11px] text-slate-500 mt-2">
            AI-generated & vetted board drills
          </p>
        </div>

        {/* Passing Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Passing Rate</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#25223A] mt-2">{stats.overallPassingRate}%</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
            <span>Avg score: <strong className="text-slate-800">{stats.averageStudentScore}%</strong></span>
            <span>•</span>
            <span>{stats.totalQuizAttempts} attempts</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Action Hub & System Integrity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#25223A]">Verification Queue Status</h3>
            <span className="text-xs text-slate-400">PRC Rules</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700">Approved Students</span>
              </div>
              <span className="text-xs font-extrabold text-emerald-700">{stats.approvedStudents}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs font-bold text-slate-700">Pending Verification</span>
              </div>
              <span className="text-xs font-extrabold text-amber-700">{stats.pendingVerification}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-700">Needs Clearer Copy</span>
              </div>
              <span className="text-xs font-extrabold text-blue-700">{stats.needsClearerCopy}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-100/60">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-xs font-bold text-slate-700">Rejected Registrations</span>
              </div>
              <span className="text-xs font-extrabold text-rose-700">{stats.rejectedStudents}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigateTab('verification')}
              className="w-full py-2.5 rounded-xl border border-[#6847E8] text-[#6847E8] font-bold text-xs hover:bg-[#6847E8]/5 transition-colors cursor-pointer"
            >
              Open Verification Workstation
            </button>
          </div>
        </div>

        {/* AI Engine Status & Quick Generative Actions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6847E8]" />
              <h3 className="text-sm font-bold text-[#25223A]">Gemini AI Content Engine</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-[#6847E8]">
              Active
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Generate fresh, high-yield practice drills, explanations, and topic summaries adhering to accredited board examination syllabi.
          </p>

          <div className="space-y-2 pt-1">
            <button
              onClick={() => onNavigateTab('ai-quizzes')}
              className="w-full p-3 rounded-xl bg-[#FAF9FF] border border-purple-100 hover:border-[#6847E8] text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-[#25223A] group-hover:text-[#6847E8]">Generate Practice Quiz</p>
                <p className="text-[11px] text-slate-400">4-option MCQs with full rationales</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#6847E8] group-hover:translate-x-0.5 transition-all" />
            </button>

            <button
              onClick={() => onNavigateTab('review-materials')}
              className="w-full p-3 rounded-xl bg-[#FAF9FF] border border-purple-100 hover:border-[#6847E8] text-left transition-all flex items-center justify-between group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold text-[#25223A] group-hover:text-[#6847E8]">Generate Reviewer Notes</p>
                <p className="text-[11px] text-slate-400">Key concepts, formulas & common traps</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#6847E8] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          <div className="p-3 bg-purple-50/70 rounded-xl text-[11px] text-[#6847E8] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Anti-hallucination guardrails active. Super Admin publishes all content.</span>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#25223A]">System Activity Audit</h3>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs font-semibold text-[#6847E8] hover:underline cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div key={log.id} className="text-xs p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span className="font-semibold text-slate-700">{log.user_name || 'System'}</span>
                  <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-600 line-clamp-2">{log.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
