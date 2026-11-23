import React, { useState, useRef } from 'react';
import { 
  Clock, 
  AlertCircle, 
  XCircle, 
  UploadCloud, 
  CheckCircle2, 
  Mail, 
  Sparkles, 
  FileText, 
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/Badge';
import { toSafeString } from '../../lib/safeString';
export const VerificationGate: React.FC = () => {
  const { currentUser, reuploadDocument, refreshProfile, logout } = useAuth();
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3.5 * 1024 * 1024) {
        setUploadError('File size exceeds the 3.5MB limit. Please choose a smaller image.');
        return;
      }
      setReuploadFile(file);
      setUploadError('');
    }
  };

  const handleReuploadSubmit = async () => {
    if (!reuploadFile) return;
    setIsUploading(true);
    setUploadError('');

    const res = await reuploadDocument(reuploadFile);
    setIsUploading(false);

    if (res.success) {
      setUploadSuccess(true);
      setReuploadFile(null);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 4000);
    } else {
      setUploadError(toSafeString(res?.error, 'Failed to submit document.'));
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7FC] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#6847E8] to-[#5132D4] p-6 text-white text-center">
          <div className="inline-flex p-1.5 bg-white rounded-2xl shadow-md mb-3 overflow-hidden">
            <img
              src="/mascot-512.png"
              alt="BoardBuddy Mascot Logo"
              className="w-12 h-12 object-contain object-center"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">BoardBuddy Verification Portal</h1>
          <p className="text-xs text-purple-100 mt-1 max-w-md mx-auto">
            Account security and institutional accreditation compliance protocol
          </p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6">
          {/* User ID card summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FAF9FF] rounded-2xl border border-purple-100/60">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reviewee Profile</p>
              <h2 className="text-lg font-bold text-[#25223A] mt-0.5">{currentUser.full_name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{currentUser.email} • {currentUser.institution}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={currentUser.verification_status} />
            </div>
          </div>

          {/* Verification Status Specific Views */}
          {currentUser.verification_status === 'PENDING_VERIFICATION' && (
            <div className="space-y-5">
              <div className="p-6 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-4 text-center">
                <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Clock className="w-8 h-8 animate-pulse text-amber-700" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-amber-950">Registration Under Super Admin Review</h3>
                  <p className="text-xs text-amber-900/90 max-w-md mx-auto leading-relaxed">
                    Please wait for the Super Admin to approve your account.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Once approved by the Super Admin, you will automatically gain full access to all board subjects, AI practice drills, and reviewers.</span>
                <button
                  onClick={refreshProfile}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6847E8] bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors shrink-0 ml-3 cursor-pointer"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}

          {currentUser.verification_status === 'NEEDS_CLEARER_COPY' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-blue-900">Clearer Document Copy Required</h3>
                    <p className="text-xs text-blue-800/90 mt-1 leading-relaxed">
                      {currentUser.rejection_reason || 
                        'The previous document uploaded was partially unreadable or blurred. Please upload a clear, high-resolution scan or photo of your official Student ID or Certificate.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Input */}
              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-[#6847E8] text-center space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {reuploadFile ? (
                  <div className="flex items-center justify-between bg-purple-50 p-3 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-[#6847E8]" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-[#25223A]">{reuploadFile.name}</p>
                        <p className="text-[11px] text-slate-500">{(reuploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReuploadFile(null)}
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer py-3">
                    <UploadCloud className="w-8 h-8 text-[#6847E8] mx-auto mb-1" />
                    <p className="text-xs font-bold text-[#25223A]">Choose or drag a clearer document file</p>
                    <p className="text-[11px] text-slate-500">JPG, JPEG, PNG, or PDF</p>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-rose-600 font-semibold">{uploadError}</p>
                )}

                {uploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Clearer copy submitted! Status updated to Pending Verification.</span>
                  </div>
                )}

                <button
                  onClick={handleReuploadSubmit}
                  disabled={!reuploadFile || isUploading}
                  className="w-full py-2.5 rounded-xl font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] disabled:opacity-50 transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Uploading & Processing with Gemini AI...</span>
                    </>
                  ) : (
                    <span>Submit Clearer Document</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {currentUser.verification_status === 'REJECTED' && (
            <div className="p-6 rounded-3xl bg-rose-50/95 border-2 border-rose-300 shadow-xs space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl shrink-0 mt-0.5">
                  <XCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-rose-950">Registration Verification Declined</h3>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Your examinee registration could not be verified by the BoardBuddy Administration.
                  </p>
                </div>
              </div>

              {/* Warning Banner Callout with Exact Rejection Reason */}
              <div className="p-4 bg-white rounded-2xl border border-rose-200/80 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Super Admin Rejection Rationale:</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 bg-rose-50/60 p-3 rounded-xl border border-rose-100 leading-relaxed italic">
                  "{currentUser.rejection_reason || 'The uploaded document did not meet institutional authentication standards.'}"
                </p>
              </div>

              <p className="text-xs text-rose-800 font-medium">
                For appeals, corrected institutional documentation, or manual verification assistance, please contact the Super Admin at <strong className="underline text-rose-950">boardbuddy.team@gmail.com</strong>.
              </p>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={logout}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={refreshProfile}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Check Approval Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
