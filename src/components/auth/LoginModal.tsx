import React, { useState, useRef, useEffect } from 'react';
import { Mail, Lock, LogIn, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { toSafeString, toSafeLower } from '../../lib/safeString';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  onSuccess?: () => void;
}

const ACCOUNT_APPROVAL_WARNING_MESSAGE =
  'Your newly registered account is still pending approval by the admin. Please wait for verification before logging in.';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
  onSuccess,
}) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const submitLockRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [accountApprovalWarning, setAccountApprovalWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setIsSlowConnection(false);
      return;
    }
    const timer = setTimeout(() => setIsSlowConnection(true), 3500);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || isLoading) return;
    submitLockRef.current = true;
    setErrorMessage('');
    setAccountApprovalWarning(null);
    setIsLoading(true);

    let result: Awaited<ReturnType<typeof login>>;
    try {
      result = await login(toSafeLower(email), toSafeString(password));
    } catch (unexpectedErr: any) {
      result = {
        success: false,
        error: toSafeString(unexpectedErr, 'Unable to sign in right now. Please try again.'),
      };
    } finally {
      submitLockRef.current = false;
      setIsLoading(false);
    }

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
        setErrorMessage(ACCOUNT_APPROVAL_WARNING_MESSAGE);
        setAccountApprovalWarning(ACCOUNT_APPROVAL_WARNING_MESSAGE);
        return;
      }

      setErrorMessage(msg);
      return;
    }

    if (
      toSafeString(result.user?.role).trim().toUpperCase() === 'STUDENT' &&
      toSafeString(result.user?.verification_status).trim().toUpperCase() !== 'APPROVED'
    ) {
      setErrorMessage(ACCOUNT_APPROVAL_WARNING_MESSAGE);
      setAccountApprovalWarning(ACCOUNT_APPROVAL_WARNING_MESSAGE);
      return;
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  const handleClose = () => {
    setAccountApprovalWarning(null);
    onClose();
  };

  const safeErrorMessageLower = toSafeLower(errorMessage);
  const isPendingError =
    safeErrorMessageLower.includes('pending') ||
    safeErrorMessageLower.includes('approval') ||
    safeErrorMessageLower.includes('wait for verification');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Welcome to BoardBuddy"
        subtitle="Sign in to your account to continue reviewing"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-[#D5E2F2] p-1 shadow-sm flex items-center justify-center overflow-hidden">
            <img
              src="/mascot-512.png"
              alt="BoardBuddy Mascot"
              className="w-full h-full object-contain object-center"
            />
          </div>
          {errorMessage && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed font-medium ${
              isPendingError
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              {isPendingError ? (
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-[#25223A] mb-1 uppercase tracking-wide">
                Gmail Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 outline-hidden transition-all text-[#25223A]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25223A] mb-1 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-[#6847E8] focus:ring-2 focus:ring-[#6847E8]/10 outline-hidden transition-all text-[#25223A]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-[#6847E8] hover:bg-[#5736D6] transition-all shadow-md shadow-[#6847E8]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
            {isLoading && isSlowConnection && (
              <p role="status" className="text-[11px] text-center text-slate-500 font-medium">
                Still connecting — verifying your credentials...
              </p>
            )}
          </form>

          <div className="pt-2 text-center text-xs text-slate-500">
            Don't have an account yet?{' '}
            <button
              type="button"
              onClick={() => {
                handleClose();
                onOpenRegister();
              }}
              className="font-bold text-[#6847E8] hover:underline cursor-pointer"
            >
              Register Here
            </button>
          </div>
        </div>
      </Modal>

      {/* Dedicated Account Approval Warning Modal for Newly Registered Accounts */}
      <Modal
        isOpen={Boolean(accountApprovalWarning)}
        onClose={() => setAccountApprovalWarning(null)}
        title="Account Approval Warning"
        subtitle="Newly registered account awaiting Super Admin verification"
        maxWidth="sm"
      >
        <div className="text-center space-y-4 py-2">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>Account Pending Verification</span>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm font-bold leading-relaxed">
            {accountApprovalWarning}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dashboard access is blocked for newly registered student accounts until the Super Admin verifies your submitted Student ID or Certificate and approves your account.
          </p>
          <button
            type="button"
            onClick={() => setAccountApprovalWarning(null)}
            className="w-full py-3 rounded-xl font-bold text-sm bg-[#16335A] hover:bg-[#1F4478] text-white transition-all cursor-pointer uppercase tracking-wider"
          >
            Okay, Understood
          </button>
        </div>
      </Modal>
    </>
  );
};
