import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Ban, 
  Eye, 
  RefreshCw, 
  Building, 
  Mail, 
  GraduationCap,
  Calendar,
  MoreVertical,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { supabase, isSupabaseReady } from '../../lib/supabaseClient';
import { toSafeLower, toSafeString } from '../../lib/safeString';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Error & Deletion Modal state
  const [fetchError, setFetchError] = useState('');
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState('');

  useEffect(() => {
    fetchStudents();
  }, [statusFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    setFetchError('');
    try {
      let mapped: any[] | null = null;
      let backendError = '';
      const { data: { session } } = isSupabaseReady
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      try {
        const resp = await fetch(`/api/admin/students?status=${encodeURIComponent(statusFilter)}`, {
          cache: 'no-store',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            mapped = data;
          }
        } else {
          const errJson = await resp.json().catch(() => ({}));
          backendError = errJson?.error || errJson?.message || `Failed to load student list (HTTP ${resp.status}).`;
        }
      } catch (apiErr: any) {
        backendError = apiErr?.message || 'Unable to reach student list server.';
      }

      if ((!mapped || mapped.length === 0) && isSupabaseReady) {
        let query = supabase
          .from('profiles')
          .select('*, student_documents(*)')
          .or('role.neq.SUPERADMIN,role.is.null')
          .order('created_at', { ascending: false });

        if (statusFilter && statusFilter !== 'ALL') {
          const s = String(statusFilter).trim();
          const withUnderscore = s.replace(/\s+/g, '_').toUpperCase();
          const withSpace = s.replace(/_/g, ' ').toUpperCase();
          if (withUnderscore === 'PENDING_VERIFICATION') {
            query = query.or(`verification_status.eq.PENDING_VERIFICATION,verification_status.eq."PENDING VERIFICATION",verification_status.eq.PENDING,verification_status.eq.PENDING_REVIEW,verification_status.eq.SUBMITTED,verification_status.eq.UNVERIFIED,verification_status.is.null`);
          } else {
            query = query.or(`verification_status.eq.${withUnderscore},verification_status.eq."${withSpace}",verification_status.eq.${s}`);
          }
        }

        const { data, error } = await query;
        if (error) {
          if (!backendError) backendError = error.message;
        } else if (data) {
          mapped = data.map((s: any) => {
            const doc = s.student_documents?.[0] || null;
            return {
              ...s,
              course: s.course || doc?.ocr_extracted_data?.course || undefined,
              document: doc
            };
          });
        }
      }

      if (backendError) {
        setFetchError(backendError);
      }

      if (mapped) {
        setStudents(mapped.map((s: any) => ({
          ...s,
          course: s.course || s.document?.ocr_extracted_data?.course || undefined,
        })));
      }
    } catch (e: any) {
      console.warn('Error fetching student list', e);
      setFetchError(e?.message || 'Error fetching student list.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStatus = async (id: string, newStatus: string) => {
    if (!isSupabaseReady) return;
    setFetchError('');

    let reason: string | undefined = undefined;
    if (newStatus === 'REJECTED' || newStatus === 'NEEDS_CLEARER_COPY') {
      const promptTitle = newStatus === 'REJECTED' ? 'Reason for rejecting applicant:' : 'Instructions for requesting clearer copy:';
      const userReason = window.prompt(promptTitle);
      if (userReason === null) return; // Action cancelled by admin
      reason = userReason.trim() || undefined;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch(`/api/admin/students/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (resp.ok) {
        await fetchStudents();
        if (selectedStudent && selectedStudent.id === id) {
          setSelectedStudent({ ...selectedStudent, verification_status: newStatus });
        }
      } else {
        const errData = await resp.json().catch(() => ({}));
        setFetchError(toSafeString(errData?.error ?? errData?.message, 'Failed to update student verification status.'));
      }
    } catch (e: any) {
      console.error('Status update error:', e);
      setFetchError(toSafeString(e, 'Error updating status.'));
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('boardbuddy_auth_token') || '';

      const resp = await fetch(`/api/admin/students/${studentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await resp.json().catch(() => ({}));
      setIsDeleting(false);

      if (resp.ok && data.success) {
        setStudents(prev => prev.filter(s => s.id !== studentToDelete.id));
        if (selectedStudent && selectedStudent.id === studentToDelete.id) {
          setSelectedStudent(null);
        }
        setDeleteSuccessMsg(toSafeString(data?.message, `Deleted account ${studentToDelete.full_name}.`));
        setStudentToDelete(null);
        setTimeout(() => setDeleteSuccessMsg(''), 4000);
      } else {
        setDeleteError(toSafeString(data?.error ?? data?.message, 'Failed to delete student account.'));
      }
    } catch (e: any) {
      setIsDeleting(false);
      setDeleteError(toSafeString(e, 'Error occurred while deleting student account.'));
    }
  };

  const searchLower = toSafeLower(search);
  const filtered = students.filter(s =>
    toSafeLower(s?.full_name).includes(searchLower) ||
    toSafeLower(s?.email).includes(searchLower) ||
    toSafeLower(s?.institution).includes(searchLower) ||
    toSafeLower(s?.course).includes(searchLower)
  );

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Reviewee Account Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor, approve, suspend, delete, or update verification statuses for all registered examinees.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, university..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] outline-hidden text-[#25223A]"
            />
          </div>

          <button
            type="button"
            onClick={fetchStudents}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer disabled:opacity-60"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Notification Banner */}
      {fetchError && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchStudents}
            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {deleteSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{deleteSuccessMsg}</span>
          </div>
          <button onClick={() => setDeleteSuccessMsg('')} className="text-emerald-600 hover:text-emerald-900 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['ALL', 'APPROVED', 'PENDING_VERIFICATION', 'NEEDS_CLEARER_COPY', 'REJECTED', 'SUSPENDED'].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === st
                ? 'bg-[#6847E8] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st === 'ALL' ? 'All Reviewees' : st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9FF] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3.5 px-4">Reviewee</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Institution</th>
                <th className="py-3.5 px-4">Email Status</th>
                <th className="py-3.5 px-4">Verification</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No student reviewees found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-[#25223A] block">{s.full_name}</span>
                        <span className="text-[11px] text-slate-400">{s.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="block">{s.reviewee_type}</span>
                      {s.course && (
                        <span className="text-[10px] text-[#6847E8] font-semibold block max-w-[180px] truncate" title={s.course}>
                          {s.course}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5 max-w-[200px] truncate" title={s.institution}>
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{s.institution}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {s.email_confirmed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle className="w-3 h-3" /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={s.verification_status} />
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="px-2.5 py-1 text-xs font-semibold text-[#6847E8] bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Inspect
                      </button>

                      {s.verification_status !== 'APPROVED' && (
                        <button
                          onClick={() => handleQuickStatus(s.id, 'APPROVED')}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                          title="Approve"
                        >
                          Approve
                        </button>
                      )}

                      {s.verification_status !== 'SUSPENDED' ? (
                        <button
                          onClick={() => handleQuickStatus(s.id, 'SUSPENDED')}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Suspend Account"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickStatus(s.id, 'APPROVED')}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Reactivate
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setStudentToDelete(s);
                          setDeleteError('');
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Delete Student Account Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Student Modal */}
      {selectedStudent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStudent(null)}
          title={`Reviewee Details: ${selectedStudent.full_name}`}
          subtitle={`Student ID: ${selectedStudent.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#FAF9FF] rounded-xl border border-purple-100">
              <div>
                <p className="text-sm font-bold text-[#25223A]">{selectedStudent.full_name}</p>
                <p className="text-xs text-slate-500">{selectedStudent.email}</p>
              </div>
              <StatusBadge status={selectedStudent.verification_status} />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Reviewee Type</span>
                <span className="font-semibold text-slate-700">{selectedStudent.reviewee_type}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Educational Institution</span>
                <span className="font-semibold text-slate-700">{selectedStudent.institution}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Course / Degree Program</span>
                <span className="font-semibold text-slate-700">{selectedStudent.course || 'Not specified'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Registered At</span>
                <span className="font-semibold text-slate-700">{new Date(selectedStudent.created_at).toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Email Confirmation</span>
                <span className="font-semibold text-slate-700">
                  {selectedStudent.email_confirmed ? 'Confirmed via Supabase Auth' : 'Pending'}
                </span>
              </div>
            </div>

            {selectedStudent.document && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#25223A] block uppercase">Uploaded Document</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-800">{selectedStudent.document.file_name}</p>
                    <p className="text-[11px] text-slate-400">Authenticity: {selectedStudent.document.authenticity_status}</p>
                  </div>
                  {(selectedStudent.document.signed_url || selectedStudent.document.file_url?.startsWith('http') || selectedStudent.document.file_url?.startsWith('data:')) && (
                    <a
                      href={selectedStudent.document.signed_url || selectedStudent.document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-[#6847E8] hover:bg-purple-50"
                    >
                      View File
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Student Confirmation Modal */}
      {studentToDelete && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isDeleting) {
              setStudentToDelete(null);
              setDeleteError('');
            }
          }}
          title="Delete student account?"
          subtitle={`Target Account: ${studentToDelete.full_name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Student Details Summary */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
              <p className="text-sm font-bold text-[#25223A]">{studentToDelete.full_name}</p>
              <p className="text-xs text-slate-500">{studentToDelete.email}</p>
              <p className="text-xs text-slate-400 mt-1">{studentToDelete.institution || 'No Institution'} • {studentToDelete.reviewee_type}</p>
            </div>

            {/* Warning Box */}
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

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setStudentToDelete(null);
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
