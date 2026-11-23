import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Eye, 
  Search, 
  Filter, 
  Sparkles, 
  FileText, 
  User, 
  Building2, 
  Check, 
  AlertCircle,
  ExternalLink,
  DollarSign,
  Trash2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ManualPaymentReceipt } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';
import { toSafeLower, toSafeString } from '../../lib/safeString';

export const PaymentVerification: React.FC = () => {
  const [receipts, setReceipts] = useState<ManualPaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [inspectReceipt, setInspectReceipt] = useState<ManualPaymentReceipt | null>(null);
  const [inspectImageLoading, setInspectImageLoading] = useState(false);
  const [inspectImageError, setInspectImageError] = useState(false);
  const [rejectModalReceipt, setRejectModalReceipt] = useState<ManualPaymentReceipt | null>(null);
  const [deleteConfirmReceipt, setDeleteConfirmReceipt] = useState<ManualPaymentReceipt | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchReceipts();

    // Real-time listener for manual payment receipts (New arrivals or status changes)
    if (isSupabaseReady) {
      const subscription = supabase
        .channel('admin_receipt_updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for all changes (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'manual_payment_receipts',
          },
          () => {
            console.log('[Admin] Real-time receipt update detected. Re-fetching queue...');
            fetchReceipts(false);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, []);

  const fetchReceipts = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const token =
        (isSupabaseReady ? (await supabase.auth.getSession()).data?.session?.access_token : null) ||
        localStorage.getItem('boardbuddy_auth_token') ||
        '';

      // 1. Primary fetch via Super Admin backend endpoint (joins profiles + plans + generates signed URLs)
      if (token) {
        try {
          const resp = await fetch('/api/admin/manual-receipts', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          });
          if (resp.ok) {
            const payload = await resp.json();
            if (Array.isArray(payload)) {
              setReceipts(payload as ManualPaymentReceipt[]);
              return;
            }
          }
        } catch (_) {}
      }

      // 2. Fallback direct query with manual profile join & storage signed URL generation
      const { data, error } = await supabase
        .from('manual_payment_receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const rows = (data || []) as any[];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
      const profileMap = new Map<string, any>();

      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email, institution, reviewee_type')
          .in('id', userIds);
        (profs || []).forEach((p: any) => profileMap.set(p.id, p));
      }

      const enriched = await Promise.all(
        rows.map(async (r) => {
          const prof = profileMap.get(r.user_id);
          let resolvedUrl = r.receipt_signed_url || '';
          if (!resolvedUrl && r.receipt_url) {
            if (r.receipt_url.startsWith('data:') || r.receipt_url.startsWith('http')) {
              resolvedUrl = r.receipt_url;
            } else {
              try {
                const { data: signed } = await supabase.storage
                  .from('student-documents')
                  .createSignedUrl(r.receipt_url.replace(/^\/+/, ''), 3600);
                resolvedUrl = signed?.signedUrl || '';
              } catch (_) {}
              if (!resolvedUrl) {
                try {
                  const { data: pub } = supabase.storage
                    .from('student-documents')
                    .getPublicUrl(r.receipt_url.replace(/^\/+/, ''));
                  resolvedUrl = pub?.publicUrl || '';
                } catch (_) {}
              }
            }
          }

          return {
            ...r,
            user_name: r.user_name || prof?.full_name || 'Student Reviewee',
            user_email: r.user_email || prof?.email || '',
            institution: r.institution || prof?.institution || '',
            reviewee_type: r.reviewee_type || prof?.reviewee_type || '',
            plan_name:
              r.plan_name ||
              (r.plan_code === 'p' || r.plan_code === 'p149'
                ? 'Monthly Premium Plan'
                : 'Monthly Standard Plan'),
            receipt_signed_url: resolvedUrl,
          };
        })
      );

      setReceipts(enriched as ManualPaymentReceipt[]);
    } catch (e) {
      console.log('Failed to fetch manual receipts', e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const handleOpenInspectReceipt = async (receipt: ManualPaymentReceipt) => {
    setInspectImageError(false);
    setInspectReceipt(receipt);

    const hasInlineOrHttpUrl =
      receipt.receipt_url?.startsWith('data:') ||
      receipt.receipt_url?.startsWith('http://') ||
      receipt.receipt_url?.startsWith('https://');

    if (receipt.receipt_signed_url || hasInlineOrHttpUrl || !receipt.receipt_url) {
      return;
    }

    // Lazily fetch a fresh signed URL if missing
    setInspectImageLoading(true);
    try {
      const token =
        (isSupabaseReady ? (await supabase.auth.getSession()).data?.session?.access_token : null) ||
        localStorage.getItem('boardbuddy_auth_token') ||
        '';

      let freshUrl = '';
      if (token) {
        const resp = await fetch(`/api/admin/manual-receipts/${receipt.id}/signed-url`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data?.signedUrl) freshUrl = data.signedUrl;
        }
      }

      if (!freshUrl && isSupabaseReady) {
        const cleanPath = receipt.receipt_url.replace(/^\/+/, '');
        const { data: signed } = await supabase.storage
          .from('student-documents')
          .createSignedUrl(cleanPath, 3600);
        freshUrl = signed?.signedUrl || '';
      }

      if (freshUrl) {
        setInspectReceipt((prev) =>
          prev && prev.id === receipt.id ? { ...prev, receipt_signed_url: freshUrl } : prev
        );
        setReceipts((prev) =>
          prev.map((item) =>
            item.id === receipt.id ? { ...item, receipt_signed_url: freshUrl } : item
          )
        );
      }
    } catch (_) {
    } finally {
      setInspectImageLoading(false);
    }
  };

  const executeDeleteReceipt = async (receiptId: string) => {
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch('/api/admin/verify-manual-receipt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receipt_id: receiptId,
          action: 'DELETE'
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setActionMessage({ type: 'error', text: toSafeString(data?.error ?? data?.message ?? data, 'Failed to delete receipt.') });
        return;
      }

      setReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      setActionMessage({ type: 'success', text: toSafeString(data?.message, 'Payment receipt deleted successfully.') });
      setDeleteConfirmReceipt(null);
      if (inspectReceipt?.id === receiptId) setInspectReceipt(null);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: toSafeString(err, 'Error deleting payment receipt.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (receiptId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch('/api/admin/verify-manual-receipt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receipt_id: receiptId,
          action,
          rejection_reason: reason,
        }),
      });

      let data: any = {};
      try {
        data = await resp.json();
      } catch (_) {}

      if (!resp.ok) {
        setActionMessage({ type: 'error', text: toSafeString(data?.error ?? data?.message, `Verification action failed (${resp.status} ${resp.statusText})`) });
        setIsSubmitting(false);
        return;
      }

      // Immediate local state update so receipt moves from Pending to Approved/Rejected instantly
      setReceipts((prev) =>
        prev.map((r) =>
          r.id === receiptId
            ? {
                ...r,
                ...(data.receipt || {}),
                status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                rejection_reason: action === 'REJECT' ? (reason || r.rejection_reason) : r.rejection_reason,
              }
            : r
        )
      );

      setActionMessage({ type: 'success', text: toSafeString(data?.message, 'Action completed.') });
      setRejectModalReceipt(null);
      setRejectionReason('');
      setInspectReceipt(null);
      await fetchReceipts(false);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: toSafeString(err, 'Error processing verification action.') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredReceipts = receipts.filter((r) => {
    const matchesFilter = filterStatus === 'ALL' || r.status === filterStatus;
    const searchLower = toSafeLower(searchTerm);
    const matchesSearch =
      !searchTerm ||
      toSafeLower(r?.user_name).includes(searchLower) ||
      toSafeLower(r?.user_email).includes(searchLower) ||
      toSafeLower(r?.reference_number).includes(searchLower) ||
      toSafeLower(r?.institution).includes(searchLower);

    return matchesFilter && matchesSearch;
  });

  const pendingCount = receipts.filter((r) => r.status === 'PENDING_VERIFICATION').length;
  const approvedCount = receipts.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = receipts.filter((r) => r.status === 'REJECTED').length;
  const totalRevenue = receipts
    .filter((r) => r.status === 'APPROVED')
    .reduce((acc, r) => acc + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#25223A]">Manual Payment Verification Audit Queue</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-[#6847E8] uppercase tracking-wider">
              Administrator GCash QR
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit uploaded proof-of-payment receipts, review Gemini OCR risk findings, and approve 1-month subscriptions.
          </p>
        </div>

        <button
          onClick={() => fetchReceipts(true)}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
        >
          Refresh Queue
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-body">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Audit</span>
            <p className="text-2xl font-black text-[#16335A] mt-1">{pendingCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved Payments</span>
            <p className="text-2xl font-black text-[#3E9B52] mt-1">{approvedCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#3E9B52] flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected Receipts</span>
            <p className="text-2xl font-black text-rose-600 mt-1">{rejectedCount}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Revenue</span>
            <p className="text-2xl font-black text-[#16335A] mt-1">₱{totalRevenue.toLocaleString()}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#3E9B52] flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'ALL', label: `All Receipts (${receipts.length})` },
            { id: 'PENDING_VERIFICATION', label: `Pending (${pendingCount})` },
            { id: 'APPROVED', label: `Approved (${approvedCount})` },
            { id: 'REJECTED', label: `Rejected (${rejectedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-[#16335A] text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search student, ref #..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#3E9B52]"
          />
        </div>
      </div>

      {/* Receipt Audit Cards List */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-[#6847E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>Loading payment receipt queue...</span>
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-600">No payment receipts found</p>
          <p className="text-[11px] text-slate-400 mt-1">There are no manual QR receipts matching your current filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReceipts.map((r) => {
            const riskLevel = r.ai_analysis?.risk_level || 'LOW';
            const riskColor =
              riskLevel === 'CRITICAL'
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : riskLevel === 'HIGH'
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : riskLevel === 'MEDIUM'
                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                : 'bg-emerald-100 text-emerald-800 border-emerald-200';

            const statusColor =
              r.status === 'APPROVED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : r.status === 'REJECTED'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-[#6847E8]/40 transition-all space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-[#6847E8] font-bold flex items-center justify-center text-sm border border-purple-100 shrink-0">
                      {r.user_name ? r.user_name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#25223A] text-sm">{r.user_name || 'Student Reviewee'}</h3>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                          {r.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {r.user_email || 'No email provided'}
                        {r.institution ? ` • ${r.institution}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#6847E8] block">
                      {r.plan_name || (r.plan_code === 'p' || r.plan_code === 'p149' ? 'Monthly Premium Plan' : 'Monthly Standard Plan')} · ₱{r.amount}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Submitted: {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Body details & comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Column 1: Payment Details */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Claimed Transaction
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Method:</span>
                        <span className="font-bold text-[#25223A]">{r.payment_method.replace('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ref #:</span>
                        <span className="font-mono font-bold text-[#6847E8]">{r.reference_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Expected Price:</span>
                        <span className="font-bold text-slate-800">₱{r.amount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Gemini OCR Scan Results */}
                  <div className="p-3 bg-[#FAF9FF] rounded-xl border border-purple-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#6847E8] uppercase tracking-wider block flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#6847E8]" />
                        Gemini OCR Analysis
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${riskColor}`}>
                        {riskLevel} RISK
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Extracted Ref #:</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {r.ocr_extracted_data?.extracted_reference || 'Unread'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Extracted Amount:</span>
                        <span className="font-semibold text-slate-800">
                          {r.ocr_extracted_data?.extracted_amount ? `₱${r.ocr_extracted_data.extracted_amount}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Price Match:</span>
                        <span className={`font-bold ${r.ocr_extracted_data?.matched_plan_price ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.ocr_extracted_data?.matched_plan_price ? '✓ Matched' : '⚠ Mismatch / Check'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: AI Audit Findings */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Audit Findings & Risk Notes
                    </span>
                    {r.ai_analysis?.findings && r.ai_analysis.findings.length > 0 ? (
                      <ul className="space-y-1 text-[11px] text-slate-600">
                        {r.ai_analysis.findings.map((f, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className="text-[#6847E8]">•</span>
                            <span className="leading-snug">{f}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No specific risk flags detected. Please inspect receipt image.</p>
                    )}
                  </div>
                </div>

                {/* Rejection Note if Rejected */}
                {r.status === 'REJECTED' && r.rejection_reason && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-800">
                    <strong className="font-bold">Rejection Reason:</strong> {r.rejection_reason}
                  </div>
                )}

                {/* Action Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenInspectReceipt(r)}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-[#6847E8] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Full Receipt Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmReceipt(r);
                      }}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Permanently delete receipt record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                  {r.status === 'PENDING_VERIFICATION' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectionReason('');
                          setRejectModalReceipt(r);
                        }}
                        className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Reject Payment
                      </button>
                      <button
                        onClick={() => handleVerify(r.id, 'APPROVE')}
                        disabled={isSubmitting}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve & Activate 1-Month Sub</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Receipt Modal */}
      {inspectReceipt && (() => {
        const resolvedReceiptUrl =
          inspectReceipt.receipt_signed_url ||
          (inspectReceipt.receipt_url?.startsWith('data:') ||
          inspectReceipt.receipt_url?.startsWith('http://') ||
          inspectReceipt.receipt_url?.startsWith('https://')
            ? inspectReceipt.receipt_url
            : '');
        const uploaderName = inspectReceipt.user_name || 'Student Reviewee';
        const uploaderEmail = inspectReceipt.user_email || 'Email unavailable';

        return (
        <Modal
          isOpen={true}
          onClose={() => setInspectReceipt(null)}
          title={`Payment Receipt Audit: Ref ${inspectReceipt.reference_number}`}
          subtitle={`Uploaded by ${uploaderName} (${uploaderEmail})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Plan & Amount</p>
                <p className="text-lg font-bold text-white">
                  {inspectReceipt.plan_name || (inspectReceipt.plan_code === 'p' || inspectReceipt.plan_code === 'p149' ? 'Monthly Premium Plan' : 'Monthly Standard Plan')} · ₱{inspectReceipt.amount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Claimed Ref #</p>
                <p className="font-mono text-base font-bold text-emerald-400">{inspectReceipt.reference_number}</p>
              </div>
            </div>

            {/* Receipt Image Display */}
            <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 text-center space-y-2 max-h-[50vh] overflow-y-auto">
              {inspectImageLoading ? (
                <div className="py-12 text-slate-500 font-semibold flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#6847E8] border-t-transparent rounded-full animate-spin" />
                  <span>Loading receipt image...</span>
                </div>
              ) : resolvedReceiptUrl && !inspectImageError ? (
                <img
                  src={resolvedReceiptUrl}
                  alt="Payment Receipt"
                  onError={() => setInspectImageError(true)}
                  className="max-w-full h-auto mx-auto rounded-xl shadow-md border border-white"
                />
              ) : (
                <div className="py-12 text-slate-400 font-semibold">
                  <span>{inspectImageError ? 'Failed to load receipt image preview.' : 'No receipt image file attached.'}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Receipt File: <code className="text-slate-600 font-mono">{inspectReceipt.receipt_url}</code>
              </span>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmReceipt(inspectReceipt);
                  }}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  title="Permanently delete receipt record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Receipt</span>
                </button>

                {inspectReceipt.status === 'PENDING_VERIFICATION' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = inspectReceipt;
                        setInspectReceipt(null);
                        setRejectModalReceipt(target);
                      }}
                      className="px-4 py-2 font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer"
                    >
                      Reject Receipt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(inspectReceipt.id, 'APPROVE')}
                      disabled={isSubmitting}
                      className="px-4 py-2 font-bold text-xs text-white bg-[#3E9B52] hover:bg-[#348345] rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Activate</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setInspectReceipt(null)}
                  className="px-4 py-2 font-bold text-xs text-[#16335A] bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </Modal>
        );
      })()}

      {/* Rejection Modal requiring mandatory reason */}
      {rejectModalReceipt && (
        <Modal
          isOpen={true}
          onClose={() => {
            setRejectModalReceipt(null);
            setRejectionReason('');
          }}
          title="Reject Payment Receipt"
          subtitle={`Audit action for ${rejectModalReceipt.user_name} · Ref: ${rejectModalReceipt.reference_number}`}
          maxWidth="md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(rejectModalReceipt.id, 'REJECT', rejectionReason);
            }}
            className="space-y-4 text-xs font-sans"
          >
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
              <strong className="block font-bold">Mandatory Audit Rejection:</strong>
              <p className="text-[11px] text-rose-700">
                Please provide an explicit reason. The student will be notified and their payment form will be unlocked so they can re-upload a valid receipt.
              </p>
            </div>

            {/* Quick Reason Suggestions */}
            <div>
              <span className="block font-bold text-[#16335A] mb-1.5 uppercase tracking-wide text-[10px]">
                Quick Reason Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Blurry receipt',
                  'Incorrect amount',
                  'Reference number not found',
                  'Duplicate receipt proof',
                  'Screenshot cut off / unreadable',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      rejectionReason === preset
                        ? 'bg-[#16335A] text-white border-[#16335A]'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#16335A] mb-1 uppercase tracking-wide text-[10px]">
                Rejection Reason (Required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Blurry receipt, Reference number not found in GCash merchant statement, Incorrect amount..."
                rows={3}
                className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:border-[#3E9B52] focus:ring-2 focus:ring-[#3E9B52]/10 outline-hidden text-xs text-slate-800 font-sans"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectModalReceipt(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !rejectionReason.trim()}
                className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
              >
                {isSubmitting ? 'Submitting Rejection...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Receipt Confirmation Modal */}
      {deleteConfirmReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmReceipt(null)}
          title="Delete Payment Receipt Record"
          subtitle={`Ref: ${deleteConfirmReceipt.reference_number} · Submitted by ${deleteConfirmReceipt.user_name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Permanent Deletion Confirmation</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                Are you sure you want to permanently delete this manual receipt submission (Ref: <strong>{deleteConfirmReceipt.reference_number}</strong>)? This action cannot be undone.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-[#16335A]">{deleteConfirmReceipt.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student Email:</span>
                <span className="font-semibold text-slate-800">{deleteConfirmReceipt.user_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Plan & Amount:</span>
                <span className="font-bold text-[#16335A]">{deleteConfirmReceipt.plan_name} · ₱{deleteConfirmReceipt.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-slate-800">{deleteConfirmReceipt.status}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmReceipt(null)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDeleteReceipt(deleteConfirmReceipt.id)}
                disabled={isSubmitting}
                className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Deleting Receipt...' : 'Permanently Delete'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
