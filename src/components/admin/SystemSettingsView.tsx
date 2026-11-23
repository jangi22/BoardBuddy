import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Sliders, CheckCircle2, AlertTriangle, Sparkles, Save } from 'lucide-react';

export const SystemSettingsView: React.FC = () => {
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [threshold, setThreshold] = useState(0.85);
  const [requireAudit, setRequireAudit] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch('/api/admin/settings', {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`
          }
        });
        const d = await r.json();
        if (d.settings) {
          setRegistrationOpen(d.settings.registration_open ?? true);
          setThreshold(d.settings.auto_verification_threshold ?? 0.85);
          setRequireAudit(d.settings.require_human_audit_on_ambiguity ?? true);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          registration_open: registrationOpen,
          auto_verification_threshold: threshold,
          require_human_audit_on_ambiguity: requireAudit,
        }),
      });
      if (resp.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">BoardBuddy System Governance & AI Settings</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated OCR thresholds, security audit requirements, and examinee registration controls.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2 bg-[#6847E8] hover:bg-[#5736D6] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Policy Settings</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>System policies and thresholds updated successfully.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Access */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#25223A] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#6847E8]" />
            <span>Examinee Registration Controls</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
              <div>
                <span className="font-bold text-[#25223A] block">Accept New Reviewee Registrations</span>
                <span className="text-[11px] text-slate-500">Allow graduates to sign up and submit Student IDs/Certificates</span>
              </div>
              <input
                type="checkbox"
                checked={registrationOpen}
                onChange={e => setRegistrationOpen(e.target.checked)}
                className="w-5 h-5 accent-[#6847E8] rounded-md cursor-pointer"
              />
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-[#6847E8]">
              <strong>Gmail Restriction:</strong> In compliance with system policy, only valid Gmail addresses ending in <code className="font-mono font-bold">@gmail.com</code> are permitted. Institutional email accounts (@assu.edu.ph) are not mandated.
            </div>
          </div>
        </div>

        {/* AI OCR & Verification Rules */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#25223A] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#6847E8]" />
            <span>Gemini AI Verification Thresholds</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#25223A]">Auto-Confidence Audit Threshold</span>
                <span className="font-mono font-bold text-[#6847E8]">{Math.round(threshold * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.99"
                step="0.01"
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-[#6847E8] cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Documents scoring below this confidence level are automatically routed to the Super Admin pending queue.
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
              <div>
                <span className="font-bold text-[#25223A] block">Enforce Authenticity Protocol</span>
                <span className="text-[11px] text-slate-500">
                  Require Super Admin review before granting access (OCR cannot prove authenticity alone)
                </span>
              </div>
              <input
                type="checkbox"
                checked={requireAudit}
                onChange={e => setRequireAudit(e.target.checked)}
                className="w-5 h-5 accent-[#6847E8] rounded-md cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
