import React, { useState, useRef, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  Mail,
  Check,
  Clock,
  ShieldCheck,
  FileText,
  HelpCircle,
  Users,
  Info,
  ChevronRight,
  Zap,
  CreditCard,
  Search,
  CheckCircle,
  ZoomIn,
  X,
  Award,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SECONDARY_EDUCATION_COURSES, DOCUMENT_TYPE_OPTIONS } from '../../data/boardContent';
import { Mascot, Word } from '../common/ThemeAssets';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { DataPrivacyModal } from '../common/DataPrivacyModal';
import { validateRegistrationEmail, verifyEmailWithServer } from '../../lib/emailValidation';
import { toSafeString, toSafeLower } from '../../lib/safeString';

interface DeckAuthProps {
  onSuccess: (user: any) => void;
  onAdminSuccess?: () => void;
}

const TEAM = [
  { 
    name: 'Jhacel De Los Reyes', 
    role: 'Project Leader', 
    initials: 'JD', 
    photo: '/assets/aistudio/image_5e9bbe6b.png',
    bio: 'Oversees project strategy, system architecture, team coordination, and core feature delivery for the BoardBuddy platform.'
  },
  { 
    name: 'Jahaziel Joy Campos', 
    role: 'Programmer', 
    initials: 'JC', 
    photo: '/assets/aistudio/image_efe5a237.png',
    bio: 'Engineers full-stack web applications, Supabase/Firebase backend integrations, and automated AI receipt verification workflows.'
  },
  { 
    name: 'Ivan Pulmones', 
    role: 'UX/UI Designer', 
    initials: 'IP', 
    photo: '/assets/aistudio/image_4f21f3c3.png',
    bio: 'Crafts user-centric study interfaces, responsive layouts, high-contrast visual hierarchy, and intuitive student user experiences.'
  },
  { 
    name: 'Nerifer Prochina', 
    role: 'Finance & Business Development', 
    initials: 'NP', 
    photo: '/assets/aistudio/image_f57d01a7.png',
    bio: 'Manages financial strategy, subscription pricing models (₱149/mo), manual payment auditing, and platform sustainability.'
  },
  { 
    name: 'John Laurence Plazo', 
    role: 'Marketing & Research Lead', 
    initials: 'JP', 
    photo: '/assets/aistudio/image_caa191b5.png',
    bio: 'Drives student outreach campaigns, market research, LET board examination syllabus alignment, and educational research.'
  },
];

export const DeckAuth: React.FC<DeckAuthProps> = ({ onSuccess, onAdminSuccess }) => {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showInfo, setShowInfo] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<typeof TEAM[0] | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [course, setCourse] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [userType, setUserType] = useState('Graduating Education Student');
  const [docType, setDocType] = useState<'STUDENT_ID' | 'CERTIFICATE'>('STUDENT_ID');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const submitLockRef = useRef(false);
  const [err, setErr] = useState('');
  const [accountApprovalWarning, setAccountApprovalWarning] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerifiedDomain, setEmailVerifiedDomain] = useState<string | null>(null);
  const [confirmationSuccess, setConfirmationSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isSubmitting) {
      setIsSlowConnection(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowConnection(true), 3500);
    return () => clearTimeout(timer);
  }, [isSubmitting]);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  const isSignup = mode === 'signup';
  const selectedDocMeta = DOCUMENT_TYPE_OPTIONS.find(d => d.value === docType) || DOCUMENT_TYPE_OPTIONS[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setErr('Invalid file format. Please upload JPG, PNG, or PDF.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErr('File size must not exceed 10MB.');
        return;
      }
      setErr('');
      setDocFile(file);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setDocPreview(url);
      } else {
        setDocPreview(null);
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setErr('');
    setAccountApprovalWarning(null);
    setIsSubmitting(true);

    let result: Awaited<ReturnType<typeof login>>;
    try {
      result = await login(toSafeLower(email), toSafeString(pw));
    } catch (unexpectedErr: any) {
      result = {
        success: false,
        error: toSafeString(unexpectedErr, 'Unable to sign in right now. Please try again.'),
      };
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }

    const accountApprovalWarningMsg =
      'Your newly registered account is still pending approval by the admin. Please wait for verification before logging in.';

    if (!result.success) {
      const msg = toSafeString(result?.error, 'Invalid email or password.');
      const msgLower = toSafeLower(msg);
      const isRejectedOrUnreadable =
        result.code === 'REJECTED' ||
        result.code === 'NEEDS_CLEARER_COPY' ||
        msgLower.includes('declined') ||
        msgLower.includes('unreadable');

      const isAccountPendingApproval =
        result.code === 'ACCOUNT_PENDING_VERIFICATION' ||
        (result.code === 'PENDING_VERIFICATION' && result.pendingType !== 'payment') ||
        (result.status === 403 && !isRejectedOrUnreadable && result.pendingType !== 'payment') ||
        msgLower.includes('newly registered account') ||
        msgLower.includes('pending approval');

      if (isAccountPendingApproval) {
        setErr(accountApprovalWarningMsg);
        setAccountApprovalWarning(accountApprovalWarningMsg);
        return;
      }

      setErr(msg);
      return;
    }

    const userRole = toSafeString(result.user?.role).trim().toUpperCase();
    if (
      userRole === 'STUDENT' &&
      toSafeString(result.user?.verification_status).trim().toUpperCase() !== 'APPROVED'
    ) {
      setErr(accountApprovalWarningMsg);
      setAccountApprovalWarning(accountApprovalWarningMsg);
      return;
    }

    if (userRole === 'SUPERADMIN') {
      if (onAdminSuccess) onAdminSuccess();
      return;
    }
    onSuccess(result.user);
  };

  const handleEmailBlurVerification = async (rawVal: string) => {
    const trimmed = toSafeLower(rawVal);
    if (!isSignup || !trimmed) return;

    const localErr = validateRegistrationEmail(trimmed);
    if (localErr) {
      setEmailError(localErr);
      setEmailVerifiedDomain(null);
      return;
    }

    setIsVerifyingEmail(true);
    const serverCheck = await verifyEmailWithServer(trimmed);
    setIsVerifyingEmail(false);

    if (!serverCheck.valid) {
      setEmailError(toSafeString(serverCheck.error, 'Email domain could not be verified.'));
      setEmailVerifiedDomain(null);
    } else {
      setEmailError('');
      setEmailVerifiedDomain(serverCheck.domain || trimmed.split('@')[1] || 'verified');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isSubmitting) return;
    const em = toSafeLower(email);
    setErr('');

    if (fullName.trim().length < 2) {
      setErr('Enter your complete name.');
      return;
    }
    const emailValidationError = validateRegistrationEmail(em);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      setErr(emailValidationError);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      setIsVerifyingEmail(true);
      const serverEmailCheck = await verifyEmailWithServer(em);
      setIsVerifyingEmail(false);
      if (!serverEmailCheck.valid) {
        const msg = toSafeString(serverEmailCheck.error, 'Please enter an active, real email address with a valid mail domain.');
        setEmailError(msg);
        setEmailVerifiedDomain(null);
        setErr(msg);
        return;
      }
      setEmailError('');
      setEmailVerifiedDomain(serverEmailCheck.domain || em.split('@')[1] || 'verified');
      if (!institution.trim()) {
        setErr('Enter your educational institution.');
        return;
      }
      if (!course.trim()) {
        setErr('Please select your course or degree program.');
        return;
      }
      if (!docFile) {
        setErr(`Please upload your ${selectedDocMeta.label}.`);
        return;
      }
      if (docFile.size > 3.5 * 1024 * 1024) {
        setErr('File size exceeds the 3.5MB limit. Please choose a smaller image or compress it.');
        return;
      }
      if (pw.length < 8 || !/[A-Z]/.test(pw) || !/[a-z]/.test(pw)) {
        setErr('Password must be at least 8 characters long and contain at least one uppercase and one lowercase letter.');
        return;
      }
      if (pw !== pw2) {
        setErr('Passwords do not match.');
        return;
      }
      if (!agreePrivacy) {
        setErr('Please agree to the BoardBuddy Student Data Privacy Policy under RA 10173 to proceed with registration.');
        return;
      }

      const formData = new FormData();
      formData.append('full_name', fullName.trim());
      formData.append('email', em);
      formData.append('institution', institution.trim());
      formData.append('course', course.trim());
      formData.append('reviewee_type', userType);
      formData.append('document_type', docType);
      formData.append('password', pw);
      if (docFile) formData.append('document', docFile);

      const regResult = await register(formData);

      if (!regResult.success) {
        const errMsg = toSafeString(regResult?.error, 'Failed to submit registration.');
        setErr(errMsg);
        if (errMsg.toLowerCase().includes('already registered')) {
          setEmailError(errMsg);
          setEmailVerifiedDomain(null);
        }
        return;
      }

      setRegistrationSubmitted(true);
    } finally {
      setIsVerifyingEmail(false);
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setErr('');
    setAccountApprovalWarning(null);
    setEmailError('');
    setIsVerifyingEmail(false);
    setEmailVerifiedDomain(null);
    setConfirmationSuccess(null);
    setRegistrationSubmitted(false);
    setPw('');
    setPw2('');
    setCourse('');
    setDocType('STUDENT_ID');
    setDocFile(null);
    setDocPreview(null);
    setAgreePrivacy(false);
  };

  return (
    <div className="min-h-screen bg-[#16335A] text-white flex flex-col justify-center items-center px-4 py-10 relative overflow-x-hidden font-body">
      {/* Crisp High-Res Campus Background Image */}
      <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
        <img 
          src="/assets/aistudio/image_021d4126.png" 
          alt="BoardBuddy Campus Background" 
          className="w-full h-full object-cover object-center"
        />
        {/* Soft Vignette Overlay to Enhance Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#16335A]/30 via-transparent to-[#16335A]/40 pointer-events-none" />
      </div>

      {/* PWA Install Button */}
      <div className="absolute top-4 right-4 z-20">
        <PWAInstallButton />
      </div>

      <div className="w-full max-w-md mx-auto flex flex-col items-center text-center relative z-10">
        {/* Animated Mascot with Revolving/Orbiting Loading Ring */}
        <div className="relative mb-3 flex items-center justify-center">
          {/* Outer Revolving Orbit Ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-3.5 rounded-full border-3 border-transparent border-t-[#3E9B52] border-r-[#A8D8B0] border-b-[#348345]/30 border-l-transparent shadow-[0_0_25px_rgba(62,155,82,0.5)] pointer-events-none"
          />
          {/* Inner Counter-Rotating Dashed Orbit */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-6 rounded-full border border-dashed border-[#A8D8B0]/50 pointer-events-none"
          />
          {/* Orbiting Sparkle Particle */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-3.5 rounded-full pointer-events-none flex items-start justify-center"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#A8D8B0] shadow-[0_0_12px_#3E9B52] -mt-1.5" />
          </motion.div>

          {/* Center Mascot Badge */}
          <motion.div 
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 md:w-36 md:h-36 rounded-full bg-white flex items-center justify-center shadow-2xl relative z-10 ring-8 ring-white/10 overflow-hidden p-2"
          >
            <Mascot size={108} />
          </motion.div>
        </div>

        <Word size={38} light />
        <p className="font-bold text-sm md:text-base text-white/90 mt-1">
          Don’t study alone. Study with a <span className="text-[#A8D8B0]">buddy.</span>
        </p>

        <motion.div initial={{ width: 0 }} animate={{ width: 96 }} className="h-1 bg-[#E8C77A] rounded-full my-4 shadow-sm" />

        <AnimatePresence mode="wait">
          {registrationSubmitted ? (
            <motion.div 
              key="submitted-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full bg-white text-[#1B2A41] rounded-3xl p-8 shadow-2xl text-center space-y-5"
            >
              <div className="w-16 h-16 bg-[#3E9B52]/10 text-[#3E9B52] rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Clock className="w-10 h-10 animate-pulse text-[#3E9B52]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-heading text-2xl font-bold text-[#16335A]">Registration Submitted</h3>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                  Please wait for the Super Admin to approve your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRegistrationSubmitted(false);
                  setMode('login');
                  setErr('');
                }}
                className="w-full py-3.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all cursor-pointer uppercase tracking-wider"
              >
                Back to Login
              </button>
            </motion.div>
          ) : (
            <motion.div key="auth-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl text-[#1B2A41] text-left border border-white/30">
                <h2 className="font-heading text-2xl md:text-3xl text-[#16335A] mb-5 text-center font-bold">{isSignup ? 'Create account' : 'Welcome Back'}</h2>
                
                {confirmationSuccess && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>{confirmationSuccess}</span></div>}
                {err && (() => {
                  const safeErrText = toSafeString(err);
                  const safeErrLower = safeErrText.toLowerCase();
                  const isPendingNotice =
                    safeErrLower.includes('pending') ||
                    safeErrLower.includes('approve') ||
                    safeErrLower.includes('wait');
                  return (
                    <div className={`mb-4 p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 leading-relaxed font-medium ${
                      isPendingNotice
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {isPendingNotice ? (
                        <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <span>{safeErrText}</span>
                    </div>
                  );
                })()}

                <form onSubmit={isSignup ? handleSignupSubmit : handleLoginSubmit} className="space-y-4">
                  {isSignup && (
                    <>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider mb-1 block">Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Juan C. Dela Cruz" className="w-full bg-slate-100/90 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#3E9B52]/30 transition-all font-medium" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider mb-1 block">Institution</label>
                        <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Philippine Normal University" className="w-full bg-slate-100/90 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#3E9B52]/30 transition-all font-medium" required />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider mb-1 block">Course / Degree Program <span className="text-rose-500">*</span></label>
                        <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full bg-slate-100/90 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#3E9B52]/30 transition-all font-medium text-slate-800 cursor-pointer" required>
                          <option value="" disabled>Select Secondary Education Major</option>
                          <optgroup label="Secondary Education">
                            {SECONDARY_EDUCATION_COURSES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider block">
                          Document Type <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {DOCUMENT_TYPE_OPTIONS.map((opt) => {
                            const active = docType === opt.value;
                            return (
                              <label
                                key={opt.value}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                                  active
                                    ? 'bg-[#16335A] text-white border-[#16335A] shadow-xs'
                                    : 'bg-slate-100/90 text-slate-700 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="deck_document_type"
                                  value={opt.value}
                                  checked={active}
                                  onChange={() => setDocType(opt.value)}
                                  className="accent-[#3E9B52] shrink-0"
                                />
                                <span className="leading-tight">{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="bg-[#FAF9FF] rounded-xl p-3 border border-purple-100 space-y-2">
                          <span className="text-[10px] font-bold text-purple-700 uppercase block">{selectedDocMeta.requiredLabel}</span>
                          <p className="text-[10px] text-slate-500 leading-relaxed">{selectedDocMeta.helper}</p>
                          <label className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold flex items-center justify-center gap-2 rounded-lg cursor-pointer transition-all">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{docFile ? 'Change File' : 'Upload File'}</span>
                            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
                          </label>
                          {docFile && <p className="text-[10px] text-purple-600 truncate font-medium">{docFile.name}</p>}
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider mb-1 block">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmail(val);
                        setEmailVerifiedDomain(null);
                        if (isSignup && emailError) {
                          setEmailError(validateRegistrationEmail(val) || '');
                        }
                      }}
                      onBlur={() => {
                        if (isSignup && email.trim()) {
                          void handleEmailBlurVerification(email);
                        }
                      }}
                      placeholder="name@gmail.com"
                      className={`w-full bg-slate-100/90 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 transition-all font-medium text-slate-800 ${
                        isSignup && emailError
                          ? 'ring-2 ring-rose-400 focus:ring-rose-400/40 bg-rose-50/40'
                          : isSignup && emailVerifiedDomain
                            ? 'ring-2 ring-emerald-400/70 focus:ring-[#3E9B52]/30'
                            : 'focus:ring-[#3E9B52]/30'
                      }`}
                      required
                    />
                    {isSignup && isVerifyingEmail && (
                      <p className="mt-1.5 text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16335A] shrink-0" />
                        <span>Verifying email domain &amp; mail servers...</span>
                      </p>
                    )}
                    {isSignup && !isVerifyingEmail && emailError && (
                      <p className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{emailError}</span>
                      </p>
                    )}
                    {isSignup && !isVerifyingEmail && !emailError && emailVerifiedDomain && (
                      <p className="mt-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#3E9B52]" />
                        <span>Verified active mail domain (@{emailVerifiedDomain})</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider mb-1 block">Password</label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min 8 chars with Uppercase & Lowercase" className="w-full bg-slate-100/90 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#3E9B52]/30 transition-all pr-10 font-medium text-slate-800" required />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  {isSignup && (
                    <div>
                      <label className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider mb-1 block">Confirm Password</label>
                      <input type={showPw ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Re-type password" className="w-full bg-slate-100/90 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#3E9B52]/30 transition-all font-medium text-slate-800" required />
                    </div>
                  )}

                  {/* RA 10173 Data Privacy Compliance Checkbox */}
                  {isSignup && (
                    <div className="pt-1 pb-1">
                      <div className={`p-3.5 rounded-2xl border transition-all ${
                        agreePrivacy 
                          ? 'bg-emerald-50/80 border-[#3E9B52]/40 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}>
                        <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={agreePrivacy}
                            onChange={(e) => setAgreePrivacy(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded text-[#3E9B52] focus:ring-[#3E9B52] border-slate-300 accent-[#3E9B52] cursor-pointer shrink-0"
                          />
                          <span className="text-[11px] text-slate-700 leading-relaxed font-medium">
                            I agree to the{' '}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowPrivacyModal(true);
                              }}
                              className="font-extrabold text-[#16335A] hover:text-[#3E9B52] underline transition-colors cursor-pointer inline"
                            >
                              BoardBuddy Student Data Privacy Policy
                            </button>
                            . I consent to the collection and secure processing of my student ID, academic program, contact details, and review records strictly for BoardBuddy review access and admin verification.
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isSubmitting || (isSignup && !agreePrivacy)} 
                    className={`w-full py-3.5 font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                      isSubmitting || (isSignup && !agreePrivacy)
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-[#3E9B52] hover:bg-[#348345] active:scale-[0.99] text-white shadow-[#3E9B52]/25 cursor-pointer'
                    }`}
                    title={isSignup && !agreePrivacy ? 'Please agree to the Student Data Privacy Policy first' : undefined}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#16335A] border-t-transparent rounded-full animate-spin shrink-0" />
                        <span className="text-[#16335A]">{isSignup ? 'Creating Account...' : 'Signing in...'}</span>
                      </>
                    ) : (
                      <span>{isSignup ? 'Create Account' : 'Log In'}</span>
                    )}
                  </button>
                  {isSubmitting && isSlowConnection && (
                    <p role="status" className="text-[11px] text-center text-slate-500 font-medium">
                      Still connecting — verifying your session securely...
                    </p>
                  )}
                </form>
                <div className="mt-5 text-center">
                  <button onClick={switchMode} className="text-xs text-[#6B7C93] hover:text-[#3E9B52] transition-colors">{isSignup ? 'Already have an account? ' : 'New to BoardBuddy? '}<span className="font-extrabold text-[#16335A] underline">{isSignup ? 'Log in' : 'Register'}</span></button>
                </div>
              </div>

              {/* Landing Section Action Buttons */}
              <div className="mt-8 grid grid-cols-3 gap-3">
                {[
                  { id: 'how', label: 'Steps', icon: HelpCircle },
                  { id: 'why', label: 'Benefits', icon: Zap },
                  { id: 'about', label: 'Team', icon: Users },
                ].map((item) => (
                  <button key={item.id} onClick={() => setShowInfo(item.id)} className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#1F4478]/75 hover:bg-[#1F4478]/90 border border-white/15 hover:border-[#3E9B52] transition-all duration-300 cursor-pointer shadow-xl">
                    <item.icon className="w-5 h-5 text-[#A8D8B0] group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/90">{item.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/40 mt-8 font-medium">© 2026 BoardBuddy Review System. All Rights Reserved.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Modals */}
      <AnimatePresence>
        {showInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInfo(null)} className="absolute inset-0 bg-[#16335A]/65" />
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 30, scale: 0.95 }} className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl relative z-10 border border-[#D5E2F2] overflow-hidden">
              <div className="p-8 md:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E8F1FB] flex items-center justify-center text-[#16335A] shadow-inner">
                      {showInfo === 'how' ? <HelpCircle size={24} /> : showInfo === 'why' ? <Zap size={24} /> : <Users size={24} />}
                    </div>
                    <div>
                      <h2 className="font-heading text-2xl font-black text-[#16335A] uppercase">{showInfo === 'how' ? 'How it Works' : showInfo === 'why' ? 'Why BoardBuddy' : 'Our Team'}</h2>
                      <p className="text-[10px] text-[#6B7C93] font-bold uppercase tracking-widest">{showInfo === 'how' ? 'Getting Started' : showInfo === 'why' ? 'Features & Benefits' : 'Project Contributors'}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowInfo(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all cursor-pointer font-bold">✕</button>
                </div>

                <div className="text-slate-600">
                  {showInfo === 'how' && (
                    <div className="space-y-4">
                      {[
                        { s: 1, t: 'Register & Verify', d: 'Create an account and upload your Student ID for automated verification.', i: ShieldCheck, c: 'text-emerald-600 bg-emerald-50' },
                        { s: 2, t: 'Choose Plan', d: 'Upgrade to Premium for ₱149/month via Administrator GCash QR verification.', i: CreditCard, c: 'text-blue-600 bg-blue-50' },
                        { s: 3, t: 'Study with AI', d: 'Access customized summaries and randomized drills built by Gemini AI.', i: Search, c: 'text-amber-600 bg-amber-50' },
                        { s: 4, t: 'Pass the Boards', d: 'Track your progress and readiness scores to ensure success.', i: CheckCircle, c: 'text-purple-600 bg-purple-50' },
                      ].map(item => (
                        <div key={item.s} className="flex gap-4 p-5 rounded-3xl bg-slate-50/50 border border-slate-100">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm ${item.c}`}>{item.s}</div>
                          <div>
                            <h4 className="font-bold text-[#16335A] text-sm flex items-center gap-2 mb-1"><item.i size={16} />{item.t}</h4>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.d}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showInfo === 'why' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { t: 'AI Customization', d: 'Summaries and quizzes tailored to your syllabus.', i: Zap, c: 'text-amber-600 bg-amber-50' },
                        { t: 'Affordable', d: 'Just ₱149/month for full premium access.', i: DollarSignIcon, c: 'text-emerald-600 bg-emerald-50' },
                        { t: 'Secure', d: 'Verified payments and secure user data.', i: ShieldCheck, c: 'text-blue-600 bg-blue-50' },
                        { t: 'PRC Aligned', d: 'Updated based on latest LET competencies.', i: FileText, c: 'text-purple-600 bg-purple-50' },
                      ].map(benefit => (
                        <div key={benefit.t} className="p-6 rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${benefit.c}`}><benefit.i size={24} /></div>
                          <h4 className="font-bold text-[#16335A] text-sm mb-1">{benefit.t}</h4>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{benefit.d}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {showInfo === 'about' && (
                    <div className="space-y-8">
                      <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#3E9B52]/10 text-[#3E9B52] text-xs font-bold uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Meet The Creators</span>
                        </div>
                        <p className="text-xl font-heading italic text-[#3E9B52] font-extrabold">"Your Study Partner for the Boards"</p>
                        <p className="text-xs leading-relaxed max-w-lg mx-auto font-medium text-slate-500">
                          BoardBuddy is an AI-powered educational platform dedicated to helping graduating education students achieve their license through structured, digital, and affordable review materials.
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                          <ZoomIn className="w-3 h-3 text-[#3E9B52]" />
                          <span>Click any member card below to zoom profile</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {TEAM.map((member) => (
                          <motion.div
                            key={member.name}
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedMember(member)}
                            className="group relative flex flex-col items-center gap-3 p-6 rounded-[32px] bg-gradient-to-b from-white to-slate-50 border border-slate-200/80 shadow-md hover:shadow-xl hover:border-[#3E9B52] transition-all duration-300 cursor-pointer overflow-hidden"
                          >
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[#3E9B52] text-white p-1.5 rounded-full shadow">
                              <ZoomIn className="w-3.5 h-3.5" />
                            </div>
                            
                            <div className="relative w-24 h-24 rounded-full bg-slate-100 overflow-hidden border-3 border-[#3E9B52]/30 group-hover:border-[#3E9B52] shadow-md group-hover:shadow-lg transition-all duration-300">
                              {member.photo ? (
                                <img src={member.photo} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full text-[#16335A] font-black text-2xl flex items-center justify-center">{member.initials}</div>
                              )}
                            </div>

                            <div className="text-center space-y-1">
                              <h4 className="font-bold text-[#16335A] text-sm group-hover:text-[#3E9B52] transition-colors">{member.name}</h4>
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#3E9B52]/10 text-[#3E9B52] text-[10px] font-black uppercase tracking-wider">
                                {member.role}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <button onClick={() => setShowInfo(null)} className="w-full py-4 bg-[#16335A] hover:bg-[#1F4478] text-white font-black text-xs rounded-2xl shadow-xl transition-all cursor-pointer uppercase tracking-widest">Close Guide</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enlarged Zoomed Member Profile Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMember(null)}
              className="absolute inset-0 bg-[#16335A]/65"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              className="w-full max-w-md bg-white rounded-[36px] shadow-2xl relative z-20 overflow-hidden border-2 border-[#3E9B52]/40"
            >
              {/* Header Banner */}
              <div className="h-28 bg-gradient-to-r from-[#16335A] via-[#1F4478] to-[#16335A] relative flex items-start justify-between p-4">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-wider">
                  <Award className="w-3.5 h-3.5 text-[#A8D8B0]" />
                  <span>BoardBuddy Core Team</span>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Content */}
              <div className="px-6 pb-6 text-center relative -mt-14 space-y-4">
                <div className="relative inline-block">
                  <div className="w-28 h-28 mx-auto rounded-full bg-white p-1 shadow-2xl ring-4 ring-[#3E9B52]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                      {selectedMember.photo ? (
                        <img src={selectedMember.photo} alt={selectedMember.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-[#16335A] font-black text-3xl">{selectedMember.initials}</div>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-[#3E9B52] text-white p-1.5 rounded-full shadow-lg border-2 border-white">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <h3 className="font-heading text-xl font-bold text-[#16335A]">{selectedMember.name}</h3>
                  <div className="inline-block mt-1 px-3 py-1 rounded-full bg-[#3E9B52] text-white text-xs font-black uppercase tracking-wider shadow-sm">
                    {selectedMember.role}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#3E9B52]">Role & Contribution</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {selectedMember.bio}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedMember(null)}
                  className="w-full py-3 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer uppercase tracking-wider"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dedicated Account Approval Warning Modal for Newly Registered Accounts */}
      <AnimatePresence>
        {accountApprovalWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAccountApprovalWarning(null)}
              className="absolute inset-0 bg-[#16335A]/65"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="account-approval-warning-title"
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl relative z-20 overflow-hidden border-2 border-amber-300 p-7 text-center space-y-5 text-[#1B2A41]"
            >
              <button
                type="button"
                onClick={() => setAccountApprovalWarning(null)}
                aria-label="Close alert"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner border border-amber-200">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Account Approval Required</span>
                </div>
                <h3 id="account-approval-warning-title" className="font-heading text-xl font-extrabold text-[#16335A]">
                  Account Approval Warning
                </h3>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-sm font-bold leading-relaxed">
                  {accountApprovalWarning}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pt-1">
                  Dashboard access for newly registered accounts remains blocked until the Super Admin verifies your submitted Student ID or Certificate and approves your account.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAccountApprovalWarning(null)}
                className="w-full py-3.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer uppercase tracking-wider"
              >
                Okay, Understood
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RA 10173 Compliant Student Data Privacy Modal */}
      <DataPrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => setAgreePrivacy(true)}
      />
    </div>
  );
};

const DollarSignIcon = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
);
