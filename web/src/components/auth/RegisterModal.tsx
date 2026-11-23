import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  Building2, 
  GraduationCap, 
  UploadCloud, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  X,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { DataPrivacyModal } from '../common/DataPrivacyModal';
import { RevieweeType } from '../../types';
import { SECONDARY_EDUCATION_COURSES, DOCUMENT_TYPE_OPTIONS } from '../../data/boardContent';
import { validateRegistrationEmail, verifyEmailWithServer } from '../../lib/emailValidation';
import { toSafeLower, toSafeString } from '../../lib/safeString';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { register } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [revieweeType, setRevieweeType] = useState<RevieweeType>('Graduating Education Student');
  const [institution, setInstitution] = useState('');
  const [course, setCourse] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<'STUDENT_ID' | 'CERTIFICATE'>('STUDENT_ID');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailVerifiedDomain, setEmailVerifiedDomain] = useState<string | null>(null);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDocMeta = DOCUMENT_TYPE_OPTIONS.find(d => d.value === documentType) || DOCUMENT_TYPE_OPTIONS[0];
  const requiredDocName = selectedDocMeta.label;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Invalid file format. Please upload JPG, PNG, or PDF.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size must not exceed 10MB.');
        return;
      }

      setErrorMessage('');
      setSelectedFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileChange(fakeEvent);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmailBlurVerification = async (rawVal: string) => {
    const trimmed = toSafeLower(rawVal);
    if (!trimmed) return;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Field validation
    if (!fullName.trim()) {
      setErrorMessage('Please enter your complete name.');
      return;
    }

    const trimmedEmail = toSafeLower(email);
    const emailValidationError = validateRegistrationEmail(trimmedEmail);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      setErrorMessage(emailValidationError);
      return;
    }

    setIsVerifyingEmail(true);
    const serverEmailCheck = await verifyEmailWithServer(trimmedEmail);
    setIsVerifyingEmail(false);
    if (!serverEmailCheck.valid) {
      const msg = toSafeString(serverEmailCheck.error, 'Please enter an active, real email address with a valid mail domain.');
      setEmailError(msg);
      setEmailVerifiedDomain(null);
      setErrorMessage(msg);
      return;
    }
    setEmailError('');
    setEmailVerifiedDomain(serverEmailCheck.domain || trimmedEmail.split('@')[1] || 'verified');

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
      setErrorMessage('Password must be at least 8 characters long and contain at least one uppercase and one lowercase letter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!institution.trim()) {
      setErrorMessage('Please specify your educational institution or university.');
      return;
    }

    if (!course.trim()) {
      setErrorMessage('Please select your course or degree program.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage(`Please upload your ${requiredDocName} to proceed.`);
      return;
    }

    if (selectedFile.size > 3.5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 3.5MB limit. Please choose a smaller image or compress it.');
      return;
    }

    if (!agreePrivacy) {
      setErrorMessage('Please agree to the BoardBuddy Student Data Privacy Policy under RA 10173 to proceed.');
      return;
    }

    setIsLoading(true);

    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('email', trimmedEmail);
    formData.append('password', password);
    formData.append('reviewee_type', revieweeType);
    formData.append('institution', institution);
    formData.append('course', course);
    formData.append('document_type', documentType);
    formData.append('document', selectedFile);

    const result = await register(formData);
    setIsLoading(false);

    if (!result.success) {
      const errMsg = toSafeString(result?.error, 'Registration failed.');
      setErrorMessage(errMsg);
      if (errMsg.toLowerCase().includes('already registered')) {
        setEmailError(errMsg);
        setEmailVerifiedDomain(null);
      }
      return;
    }

    setIsSubmitted(true);
  };

  const handleClose = () => {
    setIsSubmitted(false);
    setIsVerifyingEmail(false);
    setEmailVerifiedDomain(null);
    setEmailError('');
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={isSubmitted ? "Registration Submitted" : "Register as Board Reviewee"}
        subtitle={isSubmitted ? "Account pending Super Admin verification" : "Create your account to start your AI-guided professional board exam preparation"}
        maxWidth="xl"
      >
        {isSubmitted ? (
          <div className="py-8 px-4 text-center space-y-5">
            <div className="w-16 h-16 bg-[#3E9B52]/10 text-[#3E9B52] rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#16335A]">Registration Submitted</h3>
              <p className="text-sm font-medium text-slate-600 max-w-md mx-auto leading-relaxed">
                Please wait for the Super Admin to approve your account.
              </p>
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-[#16335A] hover:bg-[#1F4478] text-white shadow-md transition-all cursor-pointer uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-[#25223A] mb-1.5 uppercase tracking-wide">
                Complete Name (as appearing on official school records)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Maria Elena Santos"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 transition-all outline-hidden text-[#25223A]"
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#25223A] uppercase tracking-wide">
                  Email Address
                </label>
                <span className="text-[11px] font-semibold text-[#6847E8]">e.g. name@gmail.com</span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    const val = e.target.value;
                    setEmail(val);
                    setEmailVerifiedDomain(null);
                    if (emailError) {
                      setEmailError(validateRegistrationEmail(val) || '');
                    }
                  }}
                  onBlur={() => {
                    if (email.trim()) {
                      void handleEmailBlurVerification(email);
                    }
                  }}
                  placeholder="name@gmail.com"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-white border rounded-xl focus:ring-2 transition-all outline-hidden text-[#25223A] ${
                    emailError
                      ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15 bg-rose-50/30'
                      : emailVerifiedDomain
                        ? 'border-emerald-400 focus:border-[#3E9B52] focus:ring-[#3E9B52]/15'
                        : 'border-slate-200 focus:border-[#6847E8] focus:ring-[#6847E8]/10'
                  }`}
                  required
                />
              </div>
              {isVerifyingEmail && (
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6847E8] shrink-0" />
                  <span>Verifying email domain &amp; mail servers...</span>
                </p>
              )}
              {!isVerifyingEmail && emailError && (
                <p className="mt-1.5 text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
              {!isVerifyingEmail && !emailError && emailVerifiedDomain && (
                <p className="mt-1.5 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0 text-[#3E9B52]" />
                  <span>Verified active mail domain (@{emailVerifiedDomain})</span>
                </p>
              )}
            </div>

            {/* Password & Confirm */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#25223A] mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 8 chars with Uppercase & Lowercase"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 transition-all outline-hidden text-[#25223A]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#25223A] mb-1.5 uppercase tracking-wide">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 transition-all outline-hidden text-[#25223A]"
                    required
                  />
                </div>
              </div>
            </div>

             {/* Course / Degree Program */}
             <div>
               <label className="block text-xs font-bold text-[#25223A] mb-1.5 uppercase tracking-wide">
                 Course / Degree Program <span className="text-rose-500">*</span>
               </label>
               <div className="relative">
                 <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                 <select
                   value={course}
                   onChange={e => setCourse(e.target.value)}
                   className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 transition-all outline-hidden text-[#25223A] cursor-pointer"
                   required
                 >
                   <option value="" disabled>Select Secondary Education Major</option>
                   <optgroup label="Secondary Education">
                     {SECONDARY_EDUCATION_COURSES.map((c) => (
                       <option key={c} value={c}>{c}</option>
                     ))}
                   </optgroup>
                 </select>
               </div>
             </div>

             {/* Reviewee Type & Institution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#25223A] mb-1.5 uppercase tracking-wide">
                  Reviewee Category
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <select
                    value={revieweeType}
                    onChange={e => setRevieweeType(e.target.value as RevieweeType)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 transition-all outline-hidden text-[#25223A] cursor-pointer"
                  >
                    <option value="Graduating Education Student">Graduating Education Student</option>
                    <option value="Other Reviewee">Other Reviewee (Graduate / Repeater / Other Board)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#25223A] mb-1.5 uppercase tracking-wide">
                  Educational Institution
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={institution}
                    onChange={e => setInstitution(e.target.value)}
                    placeholder="e.g. Philippine Normal University"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 transition-all outline-hidden text-[#25223A]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Document Type Selection & Upload Section */}
            <div className="pt-2 space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-[#25223A] mb-1.5 uppercase tracking-wide">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => {
                    const active = documentType === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          active
                            ? 'bg-[#16335A] text-white border-[#16335A] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal_document_type"
                          value={opt.value}
                          checked={active}
                          onChange={() => setDocumentType(opt.value)}
                          className="accent-[#3E9B52] shrink-0"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#6847E8] uppercase tracking-wide">
                  {selectedDocMeta.requiredLabel} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">JPG, JPEG, PNG, or PDF (Max 10MB)</span>
              </div>

              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  selectedFile 
                    ? 'border-emerald-300 bg-emerald-50/30' 
                    : 'border-slate-300 hover:border-[#6847E8] hover:bg-purple-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-left">
                      {filePreview ? (
                        <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-emerald-200" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-[#25223A] truncate max-w-xs">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI verification</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedFile();
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-[#6847E8]/10 text-[#6847E8] flex items-center justify-center mb-2">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-[#25223A]">
                      Click or drag & drop your {requiredDocName} here
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedDocMeta.helper}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-2 p-2.5 bg-purple-50/70 border border-purple-100 rounded-lg flex items-start gap-2 text-[11px] text-slate-600">
                <Sparkles className="w-4 h-4 text-[#6847E8] shrink-0 mt-0.5" />
                <span>
                  <strong>AI Pre-Check Enabled:</strong> Gemini AI inspects document readability and extracts information for rapid review. Authenticity is validated through institutional verification protocols.
                </span>
              </div>
            </div>

            {/* RA 10173 Data Privacy Compliance Checkbox */}
            <div className="pt-2">
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

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !agreePrivacy}
                className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                  isLoading || !agreePrivacy
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#3E9B52] hover:bg-[#348345] active:scale-[0.99] text-white shadow-md shadow-[#3E9B52]/20 cursor-pointer'
                }`}
                title={!agreePrivacy ? 'Please agree to the Student Data Privacy Policy first' : undefined}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Document with Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Registration & Upload</span>
                    <CheckCircle className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* RA 10173 Compliant Student Data Privacy Modal */}
      <DataPrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => setAgreePrivacy(true)}
      />
    </>
  );
};
