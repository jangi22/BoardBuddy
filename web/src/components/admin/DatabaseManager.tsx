import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  ShieldCheck, 
  Key, 
  FolderLock,
  Layers,
  Server
} from 'lucide-react';

export const DatabaseManager: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (resp.ok) {
        setSettings(await resp.json());
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySchema = () => {
    fetch('/supabase_schema.sql')
      .then(res => res.text())
      .then(text => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
  };

  const isConfigured = settings?.supabaseStatus?.isConfigured;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Supabase Database & Storage Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            PostgreSQL database, Row Level Security (RLS), private document storage, and Auth connection status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
              Supabase Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
              External Configuration Needed
            </span>
          )}
        </div>
      </div>

      {/* Connection Diagnostics Banner */}
      <div className={`p-5 rounded-2xl border ${
        isConfigured 
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
          : 'bg-amber-50/80 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${isConfigured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            <Database className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold">
              {isConfigured 
                ? 'Active Supabase Connection Established' 
                : 'Supabase Credentials Not Yet Injected (Currently Using Safe Resilient Local Store)'}
            </h3>
            <p className="text-xs leading-relaxed opacity-90">
              {isConfigured
                ? `Connected to remote PostgreSQL instance at: ${settings?.supabaseStatus?.supabaseUrl}`
                : 'The application is running with its integrated PostgreSQL-compatible repository so all review features, AI document OCR, and quiz generation are immediately interactive. To connect your live Supabase project, supply the environment keys specified below.'}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Checklist Guide */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
        <h3 className="text-sm font-bold text-[#25223A] flex items-center gap-2">
          <Key className="w-4 h-4 text-[#6847E8]" />
          <span>Step 1: Required Environment Variables</span>
        </h3>

        <div className="space-y-3 text-xs">
          <p className="text-slate-600">
            To connect your live Supabase cloud project, configure the following keys in your environment variables:
          </p>

          <div className="space-y-2.5 font-mono text-[11px]">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Project URL</span>
                <span className="text-[#6847E8] font-bold">VITE_SUPABASE_URL</span>
                <span className="text-slate-500 font-sans ml-2 text-[11px]">= Your project URL (e.g. https://[ref].supabase.co)</span>
              </div>
              <span className="text-slate-400 text-[10px] font-sans">Settings &gt; API &gt; Project URL</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Anon Public API Key</span>
                <span className="text-[#6847E8] font-bold">VITE_SUPABASE_ANON_KEY</span>
                <span className="text-slate-500 font-sans ml-2 text-[11px]">= Client-side anonymous public key</span>
              </div>
              <span className="text-slate-400 text-[10px] font-sans">Settings &gt; API &gt; anon public</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Service Role Secret Key (Server-Only)</span>
                <span className="text-[#6847E8] font-bold">SUPABASE_SERVICE_ROLE_KEY</span>
                <span className="text-slate-500 font-sans ml-2 text-[11px]">= Privileged key for server-side verification</span>
              </div>
              <span className="text-slate-400 text-[10px] font-sans">Settings &gt; API &gt; service_role secret</span>
            </div>
          </div>
        </div>

        <h3 className="text-sm font-bold text-[#25223A] flex items-center gap-2 pt-3 border-t border-slate-100">
          <Terminal className="w-4 h-4 text-[#6847E8]" />
          <span>Step 2: Execute PostgreSQL Schema & RLS Policies in Supabase</span>
        </h3>

        <div className="p-4 bg-[#FAF9FF] border border-purple-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#25223A]">
              File: <code className="text-[#6847E8]">/supabase_schema.sql</code>
            </span>
            <button
              onClick={handleCopySchema}
              className="px-3 py-1.5 bg-[#6847E8] hover:bg-[#5736D6] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Migration</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Includes table declarations (<code className="font-mono">profiles</code>, <code className="font-mono">student_documents</code>, <code className="font-mono">subjects</code>, <code className="font-mono">topics</code>, <code className="font-mono">review_materials</code>, <code className="font-mono">quizzes</code>, <code className="font-mono">questions</code>, <code className="font-mono">quiz_attempts</code>), Row Level Security (RLS) rules, the private <code className="font-mono">student-documents</code> bucket, and automatic initial Super Admin assignment for <strong className="text-[#25223A]">boardbuddy.team@gmail.com</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
