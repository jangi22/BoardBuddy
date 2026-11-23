import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Smartphone, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  QrCode, 
  Upload, 
  Clock, 
  ArrowRight,
  ExternalLink,
  Copy,
  CheckCircle,
  History,
  RefreshCw,
  XCircle,
  X
} from 'lucide-react';
import { DeckStudentState, DeckPaymentRecord, SubscriptionPlan, ManualPaymentReceipt } from '../../types';
import { Badge } from '../common/ThemeAssets';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toSafeString } from '../../lib/safeString';

interface DeckUpgradeProps {
  S: DeckStudentState;
  save: (fn: (prev: DeckStudentState) => DeckStudentState) => void;
  go: (tab: string) => void;
}

export const DeckUpgrade: React.FC<DeckUpgradeProps> = ({ S, save, go }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    {
      id: 'plan-premium-149',
      code: 'p149',
      name: 'Monthly Premium Plan',
      price: 149,
      currency: 'PHP',
      duration_months: 1,
      features: [
        'Full LET review materials & syllabus coverage',
        'Unlimited randomized practice quizzes & choices',
        'AI Study Assistant powered by Gemini',
        'Personalized study plans & weak area recommendations',
        'Mock board exams with timed conditions',
        'Administrator GCash QR Verification'
      ],
      is_active: true,
    },
  ]);

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(plans[0]);
  const [selectedMethod] = useState<string>('gcash');

  // Interactive GCash Linking State
  const [userGcashPhone, setUserGcashPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('boardbuddy_linked_gcash') || '';
    } catch {
      return '';
    }
  });
  const [isPhoneLinked, setIsPhoneLinked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('boardbuddy_linked_gcash') || '';
      return /^09\d{9}$/.test(saved.trim());
    } catch {
      return false;
    }
  });
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [directPaySuccess, setDirectPaySuccess] = useState<string | null>(null);

  // Manual QR Receipt Form
  const [manualRef, setManualRef] = useState('');
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [myReceipts, setMyReceipts] = useState<ManualPaymentReceipt[]>([]);
  const [submittedReceipt, setSubmittedReceipt] = useState<ManualPaymentReceipt | null>(null);

  const [err, setErr] = useState('');
  const [receipt, setReceipt] = useState<DeckPaymentRecord | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true);
        
        if (!error && Array.isArray(data) && data.length > 0) {
          const filtered = data.filter((p: any) => p.price === 149 || p.code === 'p149');
          if (filtered.length > 0) {
            setPlans(filtered as any);
            setSelectedPlan(filtered[0] as any);
          }
        }
      } catch (e) {}
    };

    fetchPlans();
    fetchMyReceipts();

    // Polling interval fallback for instant status detection
    const pollInterval = setInterval(() => {
      fetchMyReceipts();
    }, 4000);

    // Real-time listener for current student's receipts
    let subscription: any = null;
    if (supabase && currentUser?.id) {
      subscription = supabase
        .channel(`student_receipt_updates_${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'manual_payment_receipts',
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => {
            console.log('[Student] Real-time receipt update detected. Re-fetching receipts...');
            fetchMyReceipts();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(pollInterval);
      if (supabase && subscription) supabase.removeChannel(subscription);
    };
  }, [currentUser?.id]);

  const fetchMyReceipts = async (showSpinner = false) => {
    if (!currentUser?.id) return;
    if (showSpinner) setIsRefreshingHistory(true);
    try {
      let fetchedRows: ManualPaymentReceipt[] | null = null;

      const { data, error } = await supabase
        .from('manual_payment_receipts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        fetchedRows = data as ManualPaymentReceipt[];
      } else {
        // Fallback to backend API endpoint when direct Supabase client query fails
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';
          if (token) {
            const resp = await fetch('/api/payments/my-receipts', {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (resp.ok) {
              const apiRows = await resp.json();
              if (Array.isArray(apiRows)) fetchedRows = apiRows;
            }
          }
        } catch (_) {}
      }

      if (Array.isArray(fetchedRows)) {
        setMyReceipts(fetchedRows);

        // Instant approval sync
        const hasApproved = fetchedRows.some((r: any) => r.status === 'APPROVED');
        if (hasApproved && !S.premium) {
          save((prev) => ({ ...prev, premium: true }));
        }

        // If currently on submission screen (step 4) and receipt was rejected, switch back to step 0 with alert
        const hasPending = fetchedRows.some((r: any) => r.status === 'PENDING_VERIFICATION');
        const hasRejected = fetchedRows.some((r: any) => r.status === 'REJECTED');

        if (!hasPending && hasRejected && step === 4) {
          setStep(0);
        }

        if (submittedReceipt) {
          const updated = fetchedRows.find((r: any) => r.id === submittedReceipt.id);
          if (updated) {
            setSubmittedReceipt(updated);
            if (updated.status === 'REJECTED') {
              setStep(0);
            }
          }
        }
      }
    } catch (e) {
    } finally {
      if (showSpinner) setIsRefreshingHistory(false);
    }
  };

  const handleCancelReceipt = async (receiptId: string) => {
    if (!window.confirm('Are you sure you want to cancel this payment request?')) return;
    setIsBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch('/api/payments/cancel-receipt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ receipt_id: receiptId }),
      });
      if (resp.ok) {
        await fetchMyReceipts();
      }
    } catch (e) {}
    setIsBusy(false);
  };

  const handleLinkGcashPhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = userGcashPhone.trim().replace(/[-\s]/g, '');
    if (!/^09\d{9}$/.test(clean)) {
      setErr('Please enter a valid 11-digit Philippine GCash mobile number starting with 09 (e.g., 09171234567).');
      return;
    }
    setUserGcashPhone(clean);
    setIsPhoneLinked(true);
    try {
      localStorage.setItem('boardbuddy_linked_gcash', clean);
    } catch (_) {}
    setErr('');
  };

  const handleCopyAdminGcash = () => {
    const adminNum = '09856255822';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(adminNum);
    }
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleOpenAndPayGcash = async () => {
    setErr('');
    setIsBusy(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_code: selectedPlan.code,
          payment_method: 'GCASH',
          gcash_number: userGcashPhone || undefined,
        }),
      });

      const data = await resp.json();
      setIsBusy(false);

      if (data?.invoice_url && typeof data.invoice_url === 'string' && data.invoice_url.startsWith('http')) {
        window.open(data.invoice_url, '_blank');
        setDirectPaySuccess(`GCash checkout opened! After sending ₱${selectedPlan.price}, enter your 13-digit reference number and upload your receipt screenshot below.`);
      } else {
        const gcashDeepLink = `gcash://pay?recipient=09856255822&amount=${selectedPlan.price}&ref=BoardBuddy-${selectedPlan.code}`;
        window.location.href = gcashDeepLink;
        setDirectPaySuccess(`GCash app requested for ₱${selectedPlan.price}. Send to 09856255822, then enter your 13-digit reference number and upload your receipt screenshot below.`);
      }
    } catch (payErr: any) {
      setIsBusy(false);
      const gcashDeepLink = `gcash://pay?recipient=09856255822&amount=${selectedPlan.price}&ref=BoardBuddy-${selectedPlan.code}`;
      window.location.href = gcashDeepLink;
      setDirectPaySuccess(`GCash app requested for ₱${selectedPlan.price}. Send to 09856255822, then enter your 13-digit reference number and upload your receipt screenshot below.`);
    }
  };

  const processManualQRSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = manualRef.trim().replace(/\D/g, '');
    if (!cleanRef) {
      setErr('Please enter your 13-digit GCash transaction reference number.');
      return;
    }
    if (cleanRef.length !== 13) {
      setErr('GCash reference number must be exactly 13 digits (e.g. 1029384756123).');
      return;
    }
    if (!manualFile) {
      setErr('Please upload your Administrator GCash payment receipt screenshot.');
      return;
    }
    if (manualFile.size > 3.5 * 1024 * 1024) {
      setErr('Receipt file size exceeds the 3.5MB limit. Please choose a smaller image.');
      return;
    }

    setErr('');
    setIsBusy(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const formData = new FormData();
      formData.append('plan_code', selectedPlan.code);
      formData.append('payment_method', 'GCASH_QR');
      formData.append('payment_reference', cleanRef);
      formData.append('receipt_file', manualFile);

      const resp = await fetch('/api/payments/upload-manual-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      const data = await resp.json().catch(() => ({}));
      setIsBusy(false);

      if (!resp.ok) {
        setErr(toSafeString(data?.error ?? data?.message ?? data, 'Receipt upload failed.'));
        return;
      }

      // Always route to Step 4 (Pending Verification screen) for Super Admin audit
      setSubmittedReceipt(data.receipt);
      setStep(4);
      await fetchMyReceipts();
    } catch (e: any) {
      setIsBusy(false);
      setErr(toSafeString(e, 'Error submitting payment receipt.'));
    }
  };

  const pendingManualReceipt = myReceipts.find(r => r.status === 'PENDING_VERIFICATION');
  const hasApprovedReceipt = myReceipts.some(r => r.status === 'APPROVED');
  const isUserPremium = Boolean(S.premium || currentUser?.is_premium || hasApprovedReceipt);
  const latestReceipt = myReceipts[0];
  const latestRejectedReceipt = (!hasApprovedReceipt && !isUserPremium && latestReceipt?.status === 'REJECTED') ? latestReceipt : null;

  const stepSubtitles = [
    'Step 1 of 3 · Select a plan',
    'Step 2 of 3 · Administrator GCash Payment',
    'Step 3 of 3 · Complete payment & upload receipt',
    'Thank you! 1-Month access is active.',
    'Processing Submission',
  ];

  const formatReceiptPlan = (r: ManualPaymentReceipt) => {
    if (r.plan_name) return r.plan_name;
    return r.plan_code === 'p' || r.plan_code === 'p149'
      ? 'Monthly Premium Plan'
      : 'Monthly Premium Plan';
  };

  const renderStatusBadge = (status: ManualPaymentReceipt['status']) => {
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved</span>
        </span>
      );
    }
    if (status === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
        </span>
      );
    }
    if (status === 'CANCELLED' || status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold whitespace-nowrap">
          <X className="w-3.5 h-3.5" />
          <span>{status === 'CANCELLED' ? 'Cancelled' : 'Expired'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        <span>Pending Verification</span>
      </span>
    );
  };

  const renderPaymentHistoryPanel = () => (
    <div className="bg-white rounded-3xl p-5 shadow-md border border-[#D5E2F2] space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#D5E2F2]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8F1FB] text-[#16335A] flex items-center justify-center shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#16335A] text-sm sm:text-base leading-tight">
              Payment History
            </h3>
            <p className="text-[11px] text-[#6B7C93]">
              {myReceipts.length} {myReceipts.length === 1 ? 'submission' : 'submissions'} · Real-time status updates active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fetchMyReceipts(true)}
            disabled={isRefreshingHistory}
            title="Refresh payment history"
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#16335A] border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHistory ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            title="Close payment history"
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {myReceipts.length === 0 ? (
        <div className="text-center py-8 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-1.5">
          <History className="w-7 h-7 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-[#16335A]">No payment submissions yet</p>
          <p className="text-[11px] text-[#6B7C93]">
            Your ₱149 Monthly Premium GCash receipt submissions and live verification statuses will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-0.5">
          {myReceipts.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-[#D5E2F2]/80 bg-[#FAF9FF]/60 hover:bg-white transition-colors space-y-2.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-bold text-[#16335A] text-xs sm:text-sm block">
                    {formatReceiptPlan(item)} · ₱{item.amount} {item.currency || 'PHP'}
                  </span>
                  <span className="text-[11px] text-[#6B7C93] block mt-0.5">
                    Method: {item.payment_method ? item.payment_method.replace('_', ' ') : 'GCash QR'}
                  </span>
                </div>
                {renderStatusBadge(item.status)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#D5E2F2]/50 text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B7C93] block">
                    Reference Number
                  </span>
                  <span className="font-mono font-bold text-[#16335A] text-xs">
                    {item.reference_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B7C93] block">
                    Submitted On
                  </span>
                  <span className="font-medium text-[#1B2A41] text-xs">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {item.status === 'REJECTED' && item.rejection_reason && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800">
                  <span className="font-bold block">Super Admin Note:</span>
                  <span>{item.rejection_reason}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (pendingManualReceipt && step < 3) {
    return (
      <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex-1">
            <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
              BoardBuddy Premium
            </h1>
            <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
              Payment Verification in Progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !showHistory;
                setShowHistory(next);
                if (next) fetchMyReceipts(true);
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                showHistory
                  ? 'bg-[#16335A] text-white border-[#16335A]'
                  : 'bg-white text-[#16335A] border-[#D5E2F2] hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Payment History ({myReceipts.length})</span>
            </button>
            <Badge size={52} />
          </div>
        </div>

        {showHistory && renderPaymentHistoryPanel()}

        <div className="bg-white rounded-3xl p-6 shadow-md border border-amber-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            {renderStatusBadge('PENDING_VERIFICATION')}
            <h2 className="font-heading text-2xl text-[#16335A]">
              Payment Pending Verification
            </h2>
            <p className="text-xs text-[#6B7C93] mt-1">
              Your receipt (Ref: <code className="font-mono font-bold text-[#16335A]">{pendingManualReceipt.reference_number}</code>) is currently awaiting Super Admin verification. You can continue using free study features while we audit your payment.
            </p>
          </div>

          <div className="bg-[#FAF9FF] rounded-2xl p-4 border border-purple-100 space-y-2 text-xs text-left">
            <div className="flex justify-between py-1 border-b border-purple-50">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold text-[#16335A]">
                {formatReceiptPlan(pendingManualReceipt)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-purple-50">
              <span className="text-slate-500">Amount:</span>
              <span className="font-bold text-[#16335A]">₱{pendingManualReceipt.amount}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-purple-50">
              <span className="text-slate-500">Submitted:</span>
              <span className="font-bold text-[#16335A]">
                {new Date(pendingManualReceipt.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => go('home')}
              className="w-full py-3 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
            >
              Continue with Free Access
            </button>
            <button
              onClick={() => handleCancelReceipt(pendingManualReceipt.id)}
              disabled={isBusy}
              className="w-full py-3 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              {isBusy ? 'Cancelling...' : 'Cancel Request & Try Again'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
            Payment verification usually takes 1-6 hours during business hours. Automated AI pre-auditing is active for clear Administrator GCash screenshots.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
            {step === 4 ? 'Receipt Submitted' : step === 3 ? 'Payment Confirmed' : 'BoardBuddy Premium'}
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            {stepSubtitles[step]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !showHistory;
              setShowHistory(next);
              if (next) fetchMyReceipts(true);
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              showHistory
                ? 'bg-[#16335A] text-white border-[#16335A]'
                : 'bg-white text-[#16335A] border-[#D5E2F2] hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Payment History ({myReceipts.length})</span>
          </button>
          <Badge size={52} />
        </div>
      </div>

      {/* Expandable Payment History Panel */}
      {showHistory && renderPaymentHistoryPanel()}

      {/* Pending Manual Verification Warning Banner */}
      {pendingManualReceipt && step < 3 && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs md:text-sm text-amber-900 space-y-1.5 shadow-xs">
          <span className="font-bold text-amber-800 block flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>Manual Payment Receipt Pending Super Admin Verification</span>
          </span>
          <p className="text-amber-800/90 leading-relaxed">
            Reference Number: <code className="font-mono font-bold">{pendingManualReceipt.reference_number}</code> · ₱{pendingManualReceipt.amount} PHP
          </p>
          <div className="p-2.5 bg-white/80 rounded-xl text-[11px] text-amber-950 font-medium">
            Status: <strong>UNVERIFIED</strong>. Premium subscription access will unlock automatically once Super Admin verifies your payment receipt.
          </div>
        </div>
      )}

      {/* Active Premium Banner */}
      {S.premium && step < 3 && (
        <div className="bg-[#E6F4E9] rounded-2xl p-4 border border-[#3E9B52]/40 text-xs md:text-sm text-[#1B2A41] space-y-1">
          <span className="font-bold text-[#3E9B52] block flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>Premium 1-Month Access Active</span>
          </span>
          <p className="text-[#6B7C93]">
            {S.until
              ? `Your subscription expires on ${new Date(S.until).toLocaleDateString()}. You can renew anytime.`
              : 'Active review subscription.'}
          </p>
        </div>
      )}

      {/* STEP 0: CHOOSE PLAN */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-[#16335A] rounded-3xl p-5 md:p-6 shadow-xl shadow-[#16335A]/15 text-white space-y-3">
            <span className="font-heading text-lg text-white block">
              What’s included in 1-Month Premium Access
            </span>
            <div className="space-y-2 text-xs md:text-sm text-white/95">
              {[
                'Full LET review materials & syllabus coverage',
                'Unlimited randomized practice quizzes & choices',
                'AI Study Assistant powered by Gemini',
                'Personalized study plans & weak area recommendations',
                'Mock board exams with timed conditions',
                'Administrator GCash QR Verification',
              ].map((p) => (
                <div key={p} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#A8D8B0] shrink-0 mt-0.5" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {plans.map((p) => {
              const isSelected = selectedPlan.code === p.code;
              return (
                <button
                  key={p.code}
                  onClick={() => setSelectedPlan(p)}
                  className={`w-full bg-white rounded-2xl p-4 text-left border-2 transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'border-[#3E9B52] shadow-md shadow-[#3E9B52]/10'
                      : 'border-[#D5E2F2] hover:border-[#16335A]/40'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-[#16335A] text-base">
                      {p.name} · ₱{p.price}
                    </h3>
                    <p className="text-xs text-[#6B7C93] mt-0.5">
                      ₱{p.price} per month · Exactly 1 calendar month access
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-[#3E9B52] bg-[#3E9B52]'
                        : 'border-[#6B7C93]'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Rejection Warning Banner right above the Upgrade / Continue Button */}
          {latestRejectedReceipt && !pendingManualReceipt && !S.premium && !currentUser?.is_premium && (
            <div className="bg-[#FFF0F3] rounded-3xl p-5 border-2 border-rose-300 text-xs md:text-sm text-rose-900 space-y-3 shadow-md animate-fade-in font-sans">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 font-bold text-[#A81538] text-sm sm:text-base">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Payment Receipt Rejected by Super Admin</span>
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-rose-200/80 text-rose-900 font-mono">
                  Ref: {latestRejectedReceipt.reference_number}
                </span>
              </div>

              <div className="p-4 bg-white/95 rounded-2xl border border-rose-200/80 text-xs space-y-1.5 shadow-xs">
                <span className="font-bold text-[#A81538] uppercase tracking-wider text-[10px] block">
                  SUPER ADMIN AUDIT REASON:
                </span>
                <p className="font-semibold text-slate-800 text-sm leading-relaxed">
                  "{latestRejectedReceipt.rejection_reason || 'Screenshot cut off / unreadable'}"
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed">
                  Your payment upload form is unlocked. Please select your plan and upload a corrected receipt.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setManualRef('');
                    setManualFile(null);
                    setStep(1);
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wide"
                >
                  <span>RE-UPLOAD PAYMENT RECEIPT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(1)}
            className="w-full py-3.5 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#3E9B52]/20 transition-all cursor-pointer"
          >
            Continue to Payment Method
          </button>
        </div>
      )}

      {/* STEP 1: CHOOSE PAYMENT MODE */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-3">
            <div
              className="w-full bg-white rounded-2xl p-4 text-left border-2 border-[#3E9B52] shadow-md shadow-[#3E9B52]/10 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-[#3E9B52]">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-[#16335A] text-sm block uppercase">
                    Administrator GCash QR Verification
                  </span>
                  <span className="text-[10px] text-[#6B7C93]">
                    Scan official Admin GCash QR, send exactly ₱{selectedPlan.price}, and upload receipt for verification
                  </span>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-[#3E9B52] bg-[#3E9B52] flex items-center justify-center shrink-0">
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#6847E8] shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">
              <strong>Official Payment Method:</strong> All subscription payments are processed exclusively through the Administrator's official GCash account and verified by the Super Admin.
            </span>
          </div>

          {err && <p className="text-xs text-[#D9534F] text-center font-semibold">{err}</p>}

          <button
            onClick={() => {
              setErr('');
              setStep(2);
            }}
            className="w-full py-3.5 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Continue to Order Summary
          </button>

          <button
            onClick={() => setStep(0)}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-[#16335A] text-[#16335A] font-bold text-xs rounded-2xl transition-all cursor-pointer"
          >
            Back to plans
          </button>
        </div>
      )}

      {/* STEP 2: ORDER SUMMARY & PAYMENT EXECUTION */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Order Summary Header */}
          <div className="bg-[#16335A] rounded-3xl p-5 md:p-6 shadow-xl text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs tracking-wider uppercase text-[#A8D8B0] block">
                {selectedPlan.name}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Administrator GCash Direct
              </span>
            </div>
            <span className="font-heading text-5xl block my-1">
              ₱{selectedPlan.price}
            </span>
            <p className="text-xs text-white/90">
              Duration: Exactly 1 Calendar Month • Access to all subjects, drills & AI assistant
            </p>
          </div>

          {/* SECTION 1: LINK PERSONAL GCASH ACCOUNT */}
          <div className="bg-white rounded-2xl p-5 border border-[#D5E2F2] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#16335A]">
                    1. Link Your Personal GCash Account
                  </h3>
                  <p className="text-[11px] text-[#6B7C93]">
                    Associate your personal GCash mobile number with this ₱{selectedPlan.price} transaction
                  </p>
                </div>
              </div>
              {isPhoneLinked && (
                <span className="text-[11px] font-bold text-[#3E9B52] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Linked</span>
                </span>
              )}
            </div>

            {isPhoneLinked ? (
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-emerald-800 font-medium block">
                    Active Linked GCash Mobile:
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-base text-[#16335A] tracking-wider">
                      {userGcashPhone}
                    </span>
                    <span className="text-[10px] bg-white text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
                      Associated: ₱{selectedPlan.price} ({selectedPlan.name})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhoneLinked(false)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline font-semibold self-start sm:self-auto cursor-pointer"
                >
                  Edit / Change Number
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={userGcashPhone}
                    onChange={(e) => setUserGcashPhone(e.target.value)}
                    placeholder="09XX-XXX-XXXX (e.g., 09171234567)"
                    maxLength={13}
                    className="flex-1 bg-[#E8F1FB] rounded-xl px-4 py-2.5 text-sm text-[#1B2A41] font-mono placeholder-[#6B7C93] focus:outline-none border border-transparent focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleLinkGcashPhone}
                    className="px-4 py-2.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Link GCash</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Enter your 11-digit mobile number starting with 09.
                </p>
              </div>
            )}
          </div>

          {/* SECTION 2: OFFICIAL ADMINISTRATOR GCASH QR CODE & ACCOUNT */}
          <div className="bg-white rounded-2xl p-5 border border-[#D5E2F2] shadow-sm text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-[#3E9B52]">
              <QrCode className="w-5 h-5" />
              <h3 className="text-sm font-bold text-[#16335A]">
                2. Official Administrator GCash Payment Account
              </h3>
            </div>

            <p className="text-xs text-[#6B7C93]">
              Send exactly <strong className="text-[#16335A]">₱{selectedPlan.price}</strong> to the official Administrator GCash number or scan the QR code below:
            </p>

            {/* Recipient Details & Copy Card */}
            <div className="p-3.5 bg-[#FAF9FF] rounded-xl border border-purple-100 text-xs font-mono space-y-2 text-left">
              <div className="flex justify-between items-center py-0.5 border-b border-purple-50">
                <span className="text-slate-500 font-sans">Recipient Name:</span>
                <span className="font-bold text-[#16335A]">BoardBuddy Review Center</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-purple-50">
                <span className="text-slate-500 font-sans">Admin GCash Number:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-600 text-sm tracking-wider font-mono">
                    09856255822
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAdminGcash}
                    className="inline-flex items-center gap-1 text-[11px] font-sans font-bold px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-300 transition-all cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedNumber ? 'Copied 09856255822!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-slate-500 font-sans">Exact Amount:</span>
                <span className="font-bold text-[#16335A] font-sans">₱{selectedPlan.price} PHP</span>
              </div>
            </div>

            {/* Dynamic Scannable GCash QR Code */}
            <div className="bg-gradient-to-b from-emerald-50/60 to-white p-5 rounded-2xl border border-emerald-100 flex flex-col items-center space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-emerald-500/30">
                <img
                  src="/assets/aistudio/image_5a7fe6d8.png"
                  alt="Administrator InstaPay GCash QR Code"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                  loading="eager"
                />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan with GCash App Camera</span>
                </span>
                <p className="text-[11px] text-[#6B7C93] max-w-sm mx-auto">
                  Scan this dynamic QR code with your phone's GCash scanner to automatically load the payment amount of ₱{selectedPlan.price} for Admin 09856255822.
                </p>
              </div>
            </div>

            {/* Direct Pay Action Button */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleOpenAndPayGcash}
                disabled={isBusy}
                className="w-full py-3.5 bg-[#005CE6] hover:bg-[#004BBF] text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open & Pay in GCash (₱{selectedPlan.price})</span>
              </button>
            </div>

            {directPaySuccess && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{directPaySuccess}</span>
              </div>
            )}
          </div>

          {/* SECTION 3: REQUIRE REFERENCE NUMBER & RECEIPT UPLOAD FOR SUPER ADMIN VERIFICATION */}
          <form onSubmit={processManualQRSubmission} className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-[#D5E2F2] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#16335A]">
                <Upload className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold">
                  3. Enter GCash Reference Number & Upload Receipt Screenshot
                </h3>
              </div>
              <p className="text-[11px] text-[#6B7C93]">
                Enter your 13-digit GCash transaction reference number and upload your GCash payment screenshot. Your payment will be submitted to the Super Admin for audit and approval (Status: <strong className="text-amber-700">PENDING_VERIFICATION</strong>).
              </p>

              {/* Reference Number Input */}
              <div className="space-y-1.5 pt-1 text-left">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#16335A] text-xs block">
                    GCash Transaction Reference Number (13 Digits) <span className="text-rose-500">*</span>
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${manualRef.length === 13 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {manualRef.length}/13 digits
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={13}
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value.replace(/\D/g, '').slice(0, 13))}
                  placeholder="e.g. 1029384756123"
                  className="w-full bg-[#E8F1FB] rounded-xl px-4 py-2.5 text-sm text-[#1B2A41] font-mono placeholder-[#6B7C93] focus:outline-none border border-transparent focus:border-blue-400"
                />
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-1.5 text-left">
                <label className="font-bold text-[#16335A] text-xs block">
                  Upload Administrator GCash Receipt Screenshot <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(e) => setManualFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 border border-[#D5E2F2] rounded-xl p-2 cursor-pointer"
                />
                {manualFile && (
                  <p className="text-[11px] text-[#3E9B52] font-semibold flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selected file: {manualFile.name}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isBusy || manualRef.trim().length !== 13 || !manualFile}
                className="w-full py-3.5 bg-[#16335A] hover:bg-[#1F4478] disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isBusy ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting for Super Admin Review...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-[#A8D8B0]" />
                    <span>Submit Payment for Super Admin Verification</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {err && <p className="text-xs text-[#D9534F] text-center font-semibold">{err}</p>}

          <button
            onClick={() => setStep(1)}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-[#16335A] text-[#16335A] font-bold text-xs rounded-2xl transition-all cursor-pointer"
          >
            Back to Payment Method
          </button>
        </div>
      )}

      {/* STEP 3: PAYMENT CONFIRMED */}
      {step === 3 && receipt && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-[#D5E2F2]/60 text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-[#3E9B52] text-white flex items-center justify-center mx-auto shadow-md">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h2 className="font-heading text-2xl text-[#16335A]">
              1-Month Subscription Active!
            </h2>
            <p className="text-xs text-[#6B7C93]">
              {receipt.until
                ? `Valid until ${new Date(receipt.until).toLocaleDateString()}`
                : '1-Month Access Active'}
            </p>
          </div>

          <button
            onClick={() => go('home')}
            className="w-full py-3.5 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Start LET Review
          </button>
        </div>
      )}

      {/* STEP 4: MANUAL RECEIPT SUBMITTED (PENDING VERIFICATION) */}
      {step === 4 && submittedReceipt && (
        <div className="space-y-4 font-sans">
          <div className="bg-white rounded-3xl p-6 shadow-md border border-amber-200 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-md">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h2 className="font-heading text-2xl text-[#16335A]">
                Receipt Submitted for Verification
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>Status: Pending Verification</span>
              </span>
            </div>

            <p className="text-xs text-[#6B7C93] max-w-md mx-auto leading-relaxed">
              Your payment receipt (Ref: <code className="font-mono font-bold text-[#16335A]">{submittedReceipt.reference_number}</code>) has been uploaded and saved to your Payment History. Premium access will unlock automatically once a Super Admin verifies your transaction.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-md border border-[#D5E2F2]/60 space-y-2 text-xs">
            <h4 className="font-bold text-[#16335A] text-sm mb-1">Receipt Submission Details</h4>
            {[
              ['Reference Number', submittedReceipt.reference_number],
              ['Plan Selected', formatReceiptPlan(submittedReceipt)],
              ['Amount Submitted', '₱' + submittedReceipt.amount],
              ['Payment Method', submittedReceipt.payment_method.replace('_', ' ')],
              ['Submission Date', new Date(submittedReceipt.created_at).toLocaleString()],
              ['Verification Status', 'Pending Verification'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1 border-t border-[#D5E2F2]/40">
                <span className="text-[#6B7C93]">{k}</span>
                <span className="font-semibold text-[#1B2A41]">{v}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => go('home')}
            className="w-full py-3.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-sm rounded-2xl shadow-md transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
