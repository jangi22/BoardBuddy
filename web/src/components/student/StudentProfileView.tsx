import { supabase } from "../../lib/supabaseClient";
import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Building, GraduationCap, ShieldCheck, FileText, CheckCircle2, Eye, Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/Badge';
import { getAvatarUrl } from '../../lib/avatar';

export const StudentProfileView: React.FC = () => {
  const { currentUser, updateAvatar } = useAuth();
  const [docInfo, setDocInfo] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarSrc = getAvatarUrl(currentUser);

  useEffect(() => {
    setAvatarImgFailed(false);
  }, [avatarSrc]);

  useEffect(() => {
    if (currentUser) {
      const fetchDoc = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('*, document:student_documents(*)')
            .eq('email', currentUser.email)
            .maybeSingle();

          if (data?.document) {
            setDocInfo(data.document);
          }
        } catch (e) {
          console.warn(e);
        }
      };
      fetchDoc();
    }
  }, [currentUser]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadMsg({ text: 'Please select a valid image file (PNG, JPG, WEBP).', error: true });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadMsg({ text: 'Image file size must be less than 5MB.', error: true });
      return;
    }

    try {
      setIsUploading(true);
      setUploadMsg(null);
      const res = await updateAvatar(file);
      if (res.success) {
        setUploadMsg({ text: 'Profile picture updated successfully!' });
      } else {
        setUploadMsg({ text: res.error || 'Failed to update profile picture.', error: true });
      }
    } catch (err: any) {
      setUploadMsg({ text: err.message || 'An error occurred during upload.', error: true });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadMsg(null), 4000);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#25223A]">Reviewee Profile & Credentials</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified candidate profile, educational institution affiliation, and stored credentials.
          </p>
        </div>
        <StatusBadge status={currentUser.verification_status} />
      </div>

      {currentUser.verification_status === 'REJECTED' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
          <p className="font-bold text-sm">Registration Status: Declined / Rejected</p>
          <p className="text-rose-800 leading-relaxed">
            <strong>Reason:</strong> {currentUser.rejection_reason || 'Verification document did not meet institutional accreditation standards.'}
          </p>
        </div>
      )}

      {currentUser.verification_status === 'NEEDS_CLEARER_COPY' && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
          <p className="font-bold text-sm">Registration Status: Clearer Document Copy Required</p>
          <p className="text-blue-800 leading-relaxed">
            <strong>Feedback:</strong> {currentUser.rejection_reason || 'The uploaded file was blurry or unreadable. Please re-upload a clear copy.'}
          </p>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarSrc && !avatarImgFailed ? (
                <div className="w-16 h-16 aspect-square shrink-0 rounded-full overflow-hidden border-2 border-purple-200 shadow-xs bg-[#16335A]">
                  <img
                    src={avatarSrc}
                    alt={currentUser.full_name}
                    onError={() => setAvatarImgFailed(true)}
                    className="w-full h-full object-cover object-center block"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#6847E8]/10 text-[#6847E8] font-black text-xl flex items-center justify-center border border-purple-200">
                  {currentUser.full_name?.charAt(0) || 'R'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Upload profile picture"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-[#6847E8] text-white hover:bg-[#5739c9] shadow-sm transition-transform hover:scale-110 cursor-pointer disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#25223A]">{currentUser.full_name}</h3>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Email Authenticated
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-[#6847E8] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Uploading...' : 'Change Photo'}</span>
          </button>
        </div>

        {uploadMsg && (
          <div className={`p-3 rounded-xl text-xs font-semibold ${uploadMsg.error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
            {uploadMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Reviewee Category</span>
            <p className="font-bold text-[#25223A] text-sm">{currentUser.reviewee_type}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Educational Institution</span>
            <p className="font-bold text-[#25223A] text-sm">{currentUser.institution}</p>
          </div>

          {currentUser.course && (
            <div className="p-4 bg-slate-50 rounded-2xl space-y-1 md:col-span-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Course / Degree Program</span>
              <p className="font-bold text-[#25223A] text-sm">{currentUser.course}</p>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Account Role</span>
            <p className="font-bold text-slate-700 text-sm">{currentUser.role}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Registration Date</span>
            <p className="font-bold text-slate-700 text-sm">{new Date(currentUser.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Stored Document Details */}
        {docInfo && (
          <div className="p-4 bg-[#FAF9FF] rounded-2xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#25223A] uppercase tracking-wide">
                Verified Credential Artifact: {docInfo.document_type === 'STUDENT_ID' ? 'Student ID' : 'Certificate'}
              </span>
              <a
                href={docInfo.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#6847E8] hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Document</span>
              </a>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>File Name: <strong className="text-slate-800">{docInfo.file_name}</strong></p>
              <p>Authenticity Status: <strong className="text-emerald-700">{docInfo.authenticity_status}</strong></p>
              {docInfo.ocr_extracted_data && (
                <p className="text-[11px] text-slate-500">
                  OCR Match: {docInfo.ocr_extracted_data.extracted_name} ({docInfo.ocr_extracted_data.extracted_institution})
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
