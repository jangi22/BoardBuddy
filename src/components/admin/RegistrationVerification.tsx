import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Search, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  Eye, 
  Clock, 
  RefreshCw,
  Building,
  User,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { VerificationStatus } from '../../types';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';
import { toSafeLower, toSafeString } from '../../lib/safeString';

export const RegistrationVerification: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('PENDING_VERIFICATION');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [fetchError, setFetchError] = useState<string>('');
  const [serviceRoleOperational, setServiceRoleOperational] = useState<boolean | null>(null);
  const [dbPendingCount, setDbPendingCount] = useState<number | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [filterStatus]);

  useEffect(() => {
    if (!isSupabaseReady) return;
    const channel = supabase
      .channel(`admin-verification-queue-${filterStatus}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchStudents();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_documents' }, () => {
        fetchStudents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterStatus]);

  useEffect(() => {
    const doc = selectedStudent?.document;
    if (!doc?.file_url) return;
    if (doc.signed_url || doc.file_url.startsWith('http') || doc.file_url.startsWith('data:')) return;
    if (signedUrls[doc.id || doc.file_url]) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.storage
          .from('student-documents')
          .createSignedUrl(doc.file_url, 3600);
        if (!cancelled && data?.signedUrl) {
          setSignedUrls(prev => ({ ...prev, [doc.id || doc.file_url]: data.signedUrl }));
          return;
        }
      } catch (_) {}

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';
        if (doc.id && token) {
          const resp = await fetch(`/api/documents/${doc.id}/signed-url`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (resp.ok) {
            const j = await resp.json();
            if (!cancelled && j?.signedUrl) {
              setSignedUrls(prev => ({ ...prev, [doc.id || doc.file_url]: j.signedUrl }));
            }
          }
        }
      } catch (_) {}
    })();

    return () => { cancelled = true; };
  }, [selectedStudent?.id, selectedStudent?.document?.id, selectedStudent?.document?.file_url]);

  const getDocumentUrl = (doc: any) => {
    if (!doc) return '';
    if (doc.signed_url) return doc.signed_url;
    if (signedUrls[doc.id || doc.file_url]) return signedUrls[doc.id || doc.file_url];
    if (!doc.file_url) return '';
    if (doc.file_url.startsWith('http') || doc.file_url.startsWith('data:')) {
      return doc.file_url;
    }
    return '';
  };

  const isPdfDocument = (doc: any) => {
    if (!doc) return false;
    return (
      doc.mime_type === 'application/pdf' ||
      toSafeLower(doc.mime_type).includes('pdf') ||
      toSafeLower(doc.file_name).endsWith('.pdf') ||
      toSafeString(doc.file_url).startsWith('data:application/pdf')
    );
  };

  const fetchStudents = async () => {
    setLoading(true);
    setFetchError('');
    try {
      fetch('/api/health', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((h) => {
          if (h?.supabase && typeof h.supabase.serviceRoleKeyOperational === 'boolean') {
            setServiceRoleOperational(h.supabase.serviceRoleKeyOperational);
          }
          const pCount = h?.pendingCount ?? h?.supabase?.pendingCount;
          setDbPendingCount(typeof pCount === 'number' ? pCount : null);
        })
        .catch(() => {});

      let mapped: any[] | null = null;
      let backendError = '';
      const { data: { session } } = isSupabaseReady
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      // 1. Primary: Attempt backend admin endpoint
      try {
        const resp = await fetch(`/api/admin/students?status=${encodeURIComponent(filterStatus)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            mapped = data;
          } else {
            backendError = toSafeString(data?.error ?? data?.message, 'Unexpected response format from verification queue API.');
          }
        } else {
          const rawText = await resp.text().catch(() => '');
          let errJson: any = {};
          try {
            errJson = rawText ? JSON.parse(rawText) : {};
          } catch (_) {}
          backendError =
            errJson?.error ||
            errJson?.message ||
            (rawText && rawText.length < 300 ? rawText : '') ||
            `Failed to load verification queue (HTTP ${resp.status}).`;
          console.warn('[RegistrationVerification] Backend endpoint returned status:', resp.status, backendError);
        }
      } catch (apiErr: any) {
        backendError = apiErr?.message || 'Unable to connect to the verification server.';
        console.warn('[RegistrationVerification] Backend fetch error:', apiErr);
      }

      // 2. Direct Supabase Query Fallback if backend failed or returned empty (and client is configured)
      if ((!mapped || mapped.length === 0) && isSupabaseReady) {
        let query = supabase
          .from('profiles')
          .select('*, student_documents(*)')
          .or('role.neq.SUPERADMIN,role.is.null')
          .order('created_at', { ascending: false });

        if (filterStatus && filterStatus !== 'ALL') {
          const s = String(filterStatus).trim();
          const withUnderscore = s.replace(/\s+/g, '_').toUpperCase();
          const withSpace = s.replace(/_/g, ' ').toUpperCase();

          if (withUnderscore === 'PENDING_VERIFICATION') {
            query = query.or(`verification_status.eq.PENDING_VERIFICATION,verification_status.eq."PENDING VERIFICATION",verification_status.eq.PENDING,verification_status.is.null`);
          } else {
            query = query.or(`verification_status.eq.${withUnderscore},verification_status.eq."${withSpace}",verification_status.eq.${s}`);
          }
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          mapped = data.map((s: any) => {
            const doc = Array.isArray(s.student_documents) && s.student_documents.length > 0
              ? s.student_documents[0]
              : s.student_documents || null;
            return {
              ...s,
              course: s.course || doc?.ocr_extracted_data?.course || undefined,
              document: doc,
            };
          });
        } else if (error) {
          console.warn('[RegistrationVerification] Direct query with relation failed, attempting flat select:', error.message);
          let flatQuery = supabase
            .from('profiles')
            .select('*')
            .or('role.neq.SUPERADMIN,role.is.null')
            .order('created_at', { ascending: false });

          if (filterStatus && filterStatus !== 'ALL') {
            const withUnderscore = filterStatus.replace(/\s+/g, '_').toUpperCase();
            if (withUnderscore === 'PENDING_VERIFICATION') {
              flatQuery = flatQuery.or(`verification_status.eq.PENDING_VERIFICATION,verification_status.eq."PENDING VERIFICATION",verification_status.eq.PENDING,verification_status.is.null`);
            } else {
              flatQuery = flatQuery.eq('verification_status', filterStatus);
            }
          }

          const { data: flatData, error: flatErr } = await flatQuery;
          if (flatErr) {
            if (!backendError) {
              backendError = flatErr.message || 'Unable to load registration queue.';
            }
          } else if (flatData && flatData.length > 0) {
            const userIds = flatData.map((f: any) => f.id);
            const { data: docs } = await supabase
              .from('student_documents')
              .select('*')
              .in('user_id', userIds);

            const docMap = new Map<string, any>();
            (docs || []).forEach((d: any) => {
              if (!docMap.has(d.user_id)) docMap.set(d.user_id, d);
            });

            mapped = flatData.map((s: any) => {
              const doc = docMap.get(s.id) || null;
              return {
                ...s,
                course: s.course || doc?.ocr_extracted_data?.course || undefined,
                document: doc,
              };
            });
          }
        }
      }

      if (backendError) {
        setFetchError(backendError);
      }

      const finalStudents = (mapped || []).map((s: any) => ({
        ...s,
        course: s.course || s.document?.ocr_extracted_data?.course || undefined,
      }));
      setStudents(finalStudents);

      if (finalStudents.length > 0) {
        setSelectedStudent((prev: any) => {
          if (!prev) return finalStudents[0];
          const exists = finalStudents.find((s: any) => s.id === prev.id);
          return exists || finalStudents[0];
        });
      } else {
        setSelectedStudent(null);
      }
    } catch (e: any) {
      console.warn('Failed to fetch verification list', e);
      setFetchError(e?.message || 'Failed to fetch verification queue.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: VerificationStatus) => {
    if (!selectedStudent || !isSupabaseReady) return;
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      let success = false;
      let errorMsg = '';

      // 1. Try server PATCH endpoint
      try {
        const resp = await fetch(`/api/admin/students/${selectedStudent.id}/status`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            status,
            reason: actionReason || undefined,
          }),
        });

        if (resp.ok) {
          success = true;
        } else {
          const errData = await resp.json().catch(() => ({}));
          errorMsg = errData.error || '';
        }
      } catch (apiErr: any) {
        errorMsg = apiErr.message;
      }

      // 2. Direct Supabase update fallback if server endpoint had an issue
      if (!success) {
        const defaultReason = status === 'REJECTED' 
          ? 'Registration verification declined by administrator.' 
          : status === 'NEEDS_CLEARER_COPY' 
            ? 'The uploaded document was unreadable. Please upload a clear copy of your Student ID or Certificate.' 
            : null;

        const { error: directErr } = await supabase
          .from('profiles')
          .update({
            verification_status: status,
            rejection_reason: status === 'APPROVED' ? null : (actionReason || defaultReason),
            email_confirmed: status === 'APPROVED' ? true : undefined,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedStudent.id);

        if (!directErr) {
          success = true;
          // Also try to update document status if possible
          try {
            const docStatus = status === 'APPROVED' ? 'MANUALLY_VERIFIED' : status === 'REJECTED' ? 'REJECTED' : 'FLAGGED_SUSPICIOUS';
            await supabase.from('student_documents').update({ authenticity_status: docStatus }).eq('user_id', selectedStudent.id);
          } catch (_) {}
        } else if (!errorMsg) {
          errorMsg = directErr.message;
        }
      }

      if (success) {
        setActionReason('');
        await fetchStudents();
      } else {
        setFetchError(errorMsg || 'Failed to update verification status.');
      }
    } catch (e: any) {
      console.error('Failed to update status', e);
      setFetchError(e.message || 'Error updating status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteStudent = async () => {
    if (!selectedStudent || !isSupabaseReady) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch(`/api/admin/students/${selectedStudent.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await resp.json().catch(() => ({}));
      setIsDeleting(false);

      if (resp.ok && data.success) {
        setShowDeleteModal(false);
        setSelectedStudent(null);
        await fetchStudents();
      } else {
        setDeleteError(toSafeString(data?.error ?? data?.message, 'Failed to delete student account.'));
      }
    } catch (e: any) {
      setIsDeleting(false);
      setDeleteError(toSafeString(e, 'Error deleting student account.'));
    }
  };

  const searchLower = toSafeLower(searchQuery);
  const filteredStudents = students.filter(s =>
    toSafeLower(s?.full_name).includes(searchLower) ||
    toSafeLower(s?.email).includes(searchLower) ||
    toSafeLower(s?.institution).includes(searchLower) ||
    toSafeLower(s?.course).includes(searchLower)
  );

  return (
    <div className="space-y-6">
      {/* Title & Authentic Rule Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Registration Verification Workstation</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit applicant Student IDs and Graduation Certificates analyzed by Gemini Multimodal AI.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStudents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-[#6847E8] text-xs font-bold border border-purple-100">
            <Sparkles className="w-4 h-4" />
            Gemini Multimodal OCR Active
          </span>
        </div>
      </div>

      {/* Critical Authenticity Disclaimer Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900 leading-relaxed">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Institutional Authenticity Rule:</span> OCR or Gemini image analysis alone cannot prove that a document is authentic. Verified approval requires confirmation through legitimate educational institutions, official registrar registries, QR credentials, or authorized human review. Never claim a document is authentic without reliable source confirmation.
        </div>
      </div>

      {serviceRoleOperational === false && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">New student registrations &amp; automatic queue sync are currently blocked</span>
            <p className="text-amber-900/90 leading-relaxed">
              The server&apos;s <code className="px-1 py-0.5 bg-amber-100 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is returning <strong>Unregistered API key</strong> from Supabase. Set the valid <strong>service_role</strong> secret key from Supabase Dashboard → Project Settings → API, and run <code className="px-1 py-0.5 bg-amber-100 rounded">supabase_fix.sql</code> in Supabase SQL Editor to move existing registered users into Pending Verification.
            </p>
          </div>
        </div>
      )}

      {fetchError && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <span className="font-bold block text-rose-900">Unable to load verification queue</span>
              <span className="text-rose-700 font-medium">{fetchError}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchStudents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-all cursor-pointer shrink-0 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Retry Refresh
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['PENDING_VERIFICATION', 'NEEDS_CLEARER_COPY', 'APPROVED', 'REJECTED', 'ALL'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setFilterStatus(status);
                setSelectedStudent(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-[#6847E8] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status === 'ALL' ? 'All Applicants' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, school..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden text-[#25223A]"
          />
        </div>
      </div>

      {/* Database Pending Counter */}
      <div className="text-xs font-semibold text-slate-600 flex items-center gap-2 px-1">
        <Clock className="w-3.5 h-3.5 text-[#6847E8]" />
        <span>
          Pending in database:{' '}
          <strong className="text-[#25223A]">
            {dbPendingCount !== null ? dbPendingCount : 'Unavailable'}
          </strong>
        </span>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-[#FAF9FF]">
            <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide">
              Queue ({filteredStudents.length})
            </span>
            <button
              type="button"
              onClick={fetchStudents}
              disabled={loading}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#6847E8]" />
                <span className="font-semibold text-slate-500">Loading verification queue...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                {fetchError ? (
                  <>
                    <p className="font-bold text-rose-700">Queue unavailable due to a server error</p>
                    <p className="text-rose-600">{fetchError}</p>
                  </>
                ) : (
                  <p className="text-slate-400">No reviewee cases found matching this filter.</p>
                )}
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = selectedStudent?.id === s.id;
                const doc = s.document;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className={`p-4 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/80 border-l-4 border-l-[#6847E8]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#25223A] truncate">{s.full_name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{s.email}</p>
                        <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                          <Building className="w-3 h-3 shrink-0" />
                          <span className="truncate">{s.institution}</span>
                        </p>
                        {s.course && (
                          <p className="text-[10px] text-[#6847E8] font-semibold mt-0.5 truncate" title={s.course}>
                            {s.course}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={s.verification_status} />
                    </div>

                    {doc && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-semibold text-[#6847E8]">
                          {doc.document_type === 'STUDENT_ID' ? 'Valid Student ID' : 'Certificate / Diploma / TOR'}
                        </span>
                        <span>
                          OCR Confidence: {Math.round((doc.ocr_extracted_data?.confidence_score || 0.85) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Audit Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-5">
          {selectedStudent ? (
            <>
              {/* Reviewee Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-[#25223A]">{selectedStudent.full_name}</h3>
                    <StatusBadge status={selectedStudent.verification_status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedStudent.email} • {selectedStudent.reviewee_type}
                  </p>
                  <p className="text-xs font-medium text-slate-700 mt-0.5">
                    Institution: <span className="font-semibold text-[#6847E8]">{selectedStudent.institution}</span>
                  </p>
                  {selectedStudent.course && (
                    <p className="text-xs font-medium text-slate-700 mt-0.5">
                      Course / Program: <span className="font-semibold text-[#25223A]">{selectedStudent.course}</span>
                    </p>
                  )}
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span>Registered: {new Date(selectedStudent.created_at).toLocaleDateString()}</span>
                  <div className="mt-1">
                    {selectedStudent.email_confirmed ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle className="w-3 h-3" /> Supabase Email Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                        <Clock className="w-3 h-3" /> Email Confirmation Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Uploaded Document Display */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide">
                    Uploaded Document Artifact
                  </span>
                  {selectedStudent.document && getDocumentUrl(selectedStudent.document) && (
                    <a
                      href={getDocumentUrl(selectedStudent.document)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#6847E8] hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View High-Res
                    </a>
                  )}
                </div>

                {selectedStudent.document ? (
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 group">
                    {getDocumentUrl(selectedStudent.document) ? (
                      isPdfDocument(selectedStudent.document) ? (
                        <iframe
                          title="Student PDF Credential"
                          src={getDocumentUrl(selectedStudent.document)}
                          className="w-full h-72 bg-white"
                        />
                      ) : (
                        <img
                          src={getDocumentUrl(selectedStudent.document)}
                          alt="Student Credential"
                          className="w-full max-h-72 object-contain mx-auto"
                        />
                      )
                    ) : (
                      <div className="p-8 text-center text-slate-300 text-xs">
                        Generating secure preview link...
                      </div>
                    )}
                    <div className="p-2.5 bg-slate-900/90 text-white text-[11px] flex items-center justify-between backdrop-blur-xs">
                      <span>{selectedStudent.document.file_name}</span>
                      <span className="text-emerald-400 font-semibold">
                        Status: {selectedStudent.document.authenticity_status}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    No document file attached to this record.
                  </div>
                )}
              </div>

              {/* Gemini AI OCR Extraction & Analysis */}
              {selectedStudent.document?.ocr_extracted_data && (
                <div className="p-4 bg-[#FAF9FF] rounded-2xl border border-purple-100/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#6847E8]" />
                      <h4 className="text-xs font-bold text-[#25223A]">Gemini Multimodal OCR Findings</h4>
                    </div>
                    <span className="text-[11px] font-bold text-[#6847E8]">
                      Readability: {selectedStudent.document.ocr_extracted_data.readability || 'HIGH'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Extracted Name</span>
                      <span className="font-bold text-[#25223A]">
                        {selectedStudent.document.ocr_extracted_data.extracted_name || 'N/A'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Extracted Institution</span>
                      <span className="font-bold text-[#25223A] truncate block">
                        {selectedStudent.document.ocr_extracted_data.extracted_institution || 'N/A'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Document Type</span>
                      <span className="font-bold text-[#25223A]">
                        {selectedStudent.document.ocr_extracted_data.document_type_detected || 'Student ID'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-semibold block">Credential / ID No.</span>
                      <span className="font-bold text-[#25223A]">
                        {selectedStudent.document.ocr_extracted_data.id_or_cert_number || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {selectedStudent.document.ai_analysis && (
                    <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100 space-y-1">
                      <span className="font-bold text-[#25223A] block">AI Analysis Summary:</span>
                      <p>{selectedStudent.document.ai_analysis.summary}</p>
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        Authenticity Note: {selectedStudent.document.ai_analysis.authenticity_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action / Reason Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#25223A] uppercase tracking-wide">
                  Super Admin Decision Note / Feedback for Reviewee
                </label>
                <textarea
                  rows={2}
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  placeholder="Optional rationale for approval, or specific instructions if requesting a clearer copy or rejecting..."
                  className="w-full p-3 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden text-[#25223A]"
                />
              </div>

              {/* Verification Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <button
                  onClick={() => handleUpdateStatus('APPROVED')}
                  disabled={isProcessing}
                  className="py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve Account</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus('NEEDS_CLEARER_COPY')}
                  disabled={isProcessing}
                  className="py-3 px-4 rounded-xl font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Request Clearer Copy</span>
                </button>

                <button
                  onClick={() => handleUpdateStatus('REJECTED')}
                  disabled={isProcessing}
                  className="py-3 px-4 rounded-xl font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Application</span>
                </button>
              </div>

              {/* Permanent Deletion Action */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => {
                    setDeleteError('');
                    setShowDeleteModal(true);
                  }}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account Permanently</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-24 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">Select a reviewee from the queue to inspect document details and issue verification decisions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedStudent && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setDeleteError('');
            }
          }}
          title="Delete student account?"
          subtitle={`Target Account: ${selectedStudent.full_name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <p className="text-sm font-bold text-[#25223A]">{selectedStudent.full_name}</p>
              <p className="text-xs text-slate-500">{selectedStudent.email}</p>
              <p className="text-xs text-slate-400 mt-1">{selectedStudent.institution || 'No Institution'} • {selectedStudent.reviewee_type}</p>
            </div>

            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs leading-relaxed">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block mb-0.5">Permanent Account Deletion Warning:</span>
                This permanently deletes the account, uploaded documents, quiz history, payments and progress. This cannot be undone. Use <strong className="underline font-bold">Suspend</strong> instead if you only want to block access.
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteStudent}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, delete permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
