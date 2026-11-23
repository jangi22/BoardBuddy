import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Lock, FileText, CheckCircle2, X, Eye, Database, UserCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DataPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const DataPrivacyModal: React.FC<DataPrivacyModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#16335A]/65 transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-[#D5E2F2] flex flex-col max-h-[88vh] z-10 text-[#1B2A41]"
          >
            {/* Header */}
            <div className="bg-[#16335A] px-6 py-5 text-white flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#3E9B52] flex items-center justify-center text-white shadow-md shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-extrabold text-lg sm:text-xl text-white">
                      BoardBuddy Student Data Privacy Policy
                    </h3>
                  </div>
                  <p className="text-[10px] text-[#A8D8B0] font-bold uppercase tracking-wider">
                    Republic Act No. 10173 · Data Privacy Act of 2012 Compliance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed custom-scrollbar">
              {/* Compliance Badge */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-[#3E9B52]/30 flex items-start gap-3">
                <Lock className="w-5 h-5 text-[#3E9B52] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#16335A] text-xs sm:text-sm">
                    Republic Act No. 10173 (Data Privacy Act of 2012)
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    BoardBuddy is committed to protecting the privacy, confidentiality, and security of all examinees and reviewees. This policy outlines how your personal data is collected, stored, encrypted, and processed in strict adherence to Philippine data privacy standards.
                  </p>
                </div>
              </div>

              {/* Section 1: Purpose of Data Collection */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#16335A] font-extrabold text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-[#3E9B52]" />
                  <span>1. Purpose of Data Collection</span>
                </div>
                <p className="text-slate-600 pl-6">
                  BoardBuddy collects and processes your personal data strictly for legitimate educational review purposes, including:
                </p>
                <ul className="list-disc pl-11 space-y-1 text-slate-600 text-[11px] sm:text-xs">
                  <li>Verifying your identity and student eligibility for board exam review access.</li>
                  <li>Ensuring authentic examinee registration and preventing fraudulent or duplicated accounts.</li>
                  <li>Providing personalized drill recommendations, performance analytics, and syllabus tracking.</li>
                  <li>Delivering automated board exam notifications, confirmation codes, and account security notices.</li>
                  <li>Administering manual proof-of-payment review and 1-month premium subscription activations.</li>
                </ul>
              </div>

              {/* Section 2: Personal Data Processed */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#16335A] font-extrabold text-xs uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-[#3E9B52]" />
                  <span>2. Personal Data Processed</span>
                </div>
                <p className="text-slate-600 pl-6">
                  During registration and platform use, the following personal data categories are processed:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-6 pt-1">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-[#16335A] block text-[11px]">Identifying Information</span>
                    <span className="text-[10px] text-slate-500">Full legal name, email address (@gmail.com), profile avatar, and verified user ID.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-[#16335A] block text-[11px]">Academic & Verification Records</span>
                    <span className="text-[10px] text-slate-500">Degree program, educational institution, uploaded student ID, or graduation completion certificate.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-[#16335A] block text-[11px]">Review Performance Records</span>
                    <span className="text-[10px] text-slate-500">Simulated quiz scores, competency mastery metrics, study time logs, and AI session history.</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="font-bold text-[#16335A] block text-[11px]">Transaction & Audit Proofs</span>
                    <span className="text-[10px] text-slate-500">Official Administrator GCash reference numbers, payment receipt image screenshots, and subscription expiry timestamps.</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Storage & Encryption Security */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#16335A] font-extrabold text-xs uppercase tracking-wider">
                  <Database className="w-4 h-4 text-[#3E9B52]" />
                  <span>3. Storage, Encryption & Security Safeguards</span>
                </div>
                <p className="text-slate-600 pl-6">
                  In compliance with Section 20 of RA 10173, BoardBuddy implements rigorous technical, organizational, and physical safeguards:
                </p>
                <ul className="list-disc pl-11 space-y-1 text-slate-600 text-[11px] sm:text-xs">
                  <li><strong>Storage Encryption:</strong> All uploaded student ID images and certificates are stored in private Supabase Storage buckets encrypted at rest via AES-256.</li>
                  <li><strong>In-Transit Security:</strong> All client-to-server traffic is transmitted over Transport Layer Security (TLS 1.3 / SSL) with HTTPS encryption.</li>
                  <li><strong>Row Level Security (RLS):</strong> Database tables enforce Postgres RLS policies ensuring examinees can only read and write their own documents and answer records.</li>
                  <li><strong>Access Control:</strong> Document and payment verification is strictly restricted to authenticated Super Administrators. Unauthorized third parties cannot access reviewee files.</li>
                  <li><strong>No Commercial Sale:</strong> BoardBuddy never sells, rents, or monetizes reviewee personal data to third-party marketing companies.</li>
                </ul>
              </div>

              {/* Section 4: Rights of the Data Subject */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#16335A] font-extrabold text-xs uppercase tracking-wider">
                  <Eye className="w-4 h-4 text-[#3E9B52]" />
                  <span>4. Your Rights Under Republic Act No. 10173</span>
                </div>
                <p className="text-slate-600 pl-6">
                  As a registered reviewee and Data Subject, you are entitled to the full protection of your statutory rights:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-6 pt-1 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#16335A] block">Right to be Informed</span>
                    <span className="text-[9px] text-slate-500">Know how data is used</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#16335A] block">Right to Access</span>
                    <span className="text-[9px] text-slate-500">Request copy of records</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#16335A] block">Right to Rectify</span>
                    <span className="text-[9px] text-slate-500">Correct inaccurate data</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-[#16335A] block">Right to Erasure</span>
                    <span className="text-[9px] text-slate-500">Request account deletion</span>
                  </div>
                </div>
              </div>

              {/* Section 5: Data Retention & Inquiries */}
              <div className="p-4 rounded-2xl bg-[#E8F1FB] border border-[#D5E2F2] space-y-1.5 text-xs text-slate-700">
                <span className="font-extrabold text-[#16335A] uppercase tracking-wider text-[10px] block">
                  Data Retention & Inquiries:
                </span>
                <p className="text-[11px] leading-relaxed">
                  Student documents and verification files are retained only for the duration of your active board examination review cycle and will be securely expunged upon account closure. For privacy concerns or data subject rights requests, you may contact the BoardBuddy Data Protection Officer at:
                  <strong className="text-[#16335A] block mt-0.5 font-mono">boardbuddy.team@gmail.com</strong>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 shrink-0">
              <span className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider">
                BoardBuddy Governance & Privacy
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                {onAccept && (
                  <button
                    type="button"
                    onClick={() => {
                      onAccept();
                      onClose();
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 bg-[#3E9B52] hover:bg-[#348345] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wide"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>I Understand & Agree</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
