import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Star, 
  LogOut, 
  Edit3, 
  Key, 
  FileText, 
  CheckCircle2, 
  Lock,
  Camera,
  Loader2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { DeckStudentState, ManualPaymentReceipt } from '../../types';
import { T, C } from '../../data/boardContent';
import { Badge } from '../common/ThemeAssets';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { toSafeString } from '../../lib/safeString';
import { getAvatarUrl } from '../../lib/avatar';

interface DeckProfileProps {
  S: DeckStudentState;
  save: (fn: (prev: DeckStudentState) => DeckStudentState) => void;
  go: (tab: string) => void;
  logout: () => void;
}

export const DeckProfile: React.FC<DeckProfileProps> = ({
  S,
  save,
  go,
  logout,
}) => {
  const { currentUser, updateAvatar, removeAvatar } = useAuth();
  const u = S.user;
  const [nameInput, setNameInput] = useState(u.name || '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  const resolvedAvatarUrl = avatarPreviewUrl || getAvatarUrl(currentUser) || getAvatarUrl(u);

  useEffect(() => {
    setAvatarImgFailed(false);
  }, [resolvedAvatarUrl]);

  const [rejectedReceipt, setRejectedReceipt] = useState<ManualPaymentReceipt | null>(null);
  const [hasPendingReceipt, setHasPendingReceipt] = useState(false);

  const fetchReceipts = async () => {
    if (!currentUser?.id) return;
    try {
      const { data, error } = await supabase
        .from('manual_payment_receipts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const pending = data.some((r: any) => r.status === 'PENDING_VERIFICATION');
        setHasPendingReceipt(pending);

        const hasApproved = data.some((r: any) => r.status === 'APPROVED');
        const isUserPremium = Boolean(S.premium || currentUser?.is_premium || hasApproved);

        if (hasApproved || isUserPremium) {
          setRejectedReceipt(null);
        } else {
          // Only set rejected receipt if the latest submission was rejected
          const latest = data[0];
          if (latest && latest.status === 'REJECTED') {
            setRejectedReceipt(latest);
          } else {
            setRejectedReceipt(null);
          }
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchReceipts();

    const pollInterval = setInterval(() => {
      fetchReceipts();
    }, 4000);

    let subscription: any = null;
    if (supabase && currentUser?.id) {
      subscription = supabase
        .channel(`profile_receipt_updates_${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'manual_payment_receipts',
            filter: `user_id=eq.${currentUser.id}`,
          },
          () => {
            fetchReceipts();
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(pollInterval);
      if (supabase && subscription) supabase.removeChannel(subscription);
    };
  }, [currentUser?.id]);

  const handleRemoveAvatar = async () => {
    setIsUploadingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');
    const res = await removeAvatar();
    setIsUploadingAvatar(false);
    if (res.success) {
      setAvatarPreviewUrl(null);
      setAvatarImgFailed(false);
      save((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          avatar_url: undefined,
          avatarUrl: undefined,
          photoUrl: undefined,
        },
      }));
      setAvatarSuccess('Profile picture removed.');
      setTimeout(() => setAvatarSuccess(''), 3000);
    } else {
      setAvatarError(toSafeString(res?.error, 'Failed to remove picture.'));
      setTimeout(() => setAvatarError(''), 4000);
    }
  };

  const r = Object.values(S.res || {});
  const totalQuestions = r.reduce((acc, x) => acc + x.t, 0);
  const correctQuestions = r.reduce((acc, x) => acc + x.c, 0);
  const accuracyStr = totalQuestions
    ? `${Math.round((correctQuestions / totalQuestions) * 100)}%`
    : '—';

  const stats = [
    [T.filter((t) => S.done[t.id]).length, 'Topics done'],
    [accuracyStr, 'Accuracy'],
    [totalQuestions, 'Questions'],
    [Object.values(S.known || {}).filter(Boolean).length, 'Cards mastered'],
  ];

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setAvatarError('Please select a valid image (JPG, PNG, WEBP, or GIF).');
      setTimeout(() => setAvatarError(''), 4000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image file size must be less than 5MB.');
      setTimeout(() => setAvatarError(''), 4000);
      return;
    }

    const objectPreviewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(objectPreviewUrl);
    setAvatarImgFailed(false);
    setIsUploadingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');

    const res = await updateAvatar(file);
    setIsUploadingAvatar(false);

    if (res.success && res.avatar_url) {
      setAvatarPreviewUrl(res.avatar_url);
      save((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          avatar_url: res.avatar_url,
          avatarUrl: res.avatar_url,
          photoUrl: res.avatar_url,
        },
      }));
      setAvatarSuccess('Profile picture updated successfully!');
      setTimeout(() => setAvatarSuccess(''), 4000);
    } else if (res.success) {
      setAvatarSuccess('Profile picture updated successfully!');
      setTimeout(() => setAvatarSuccess(''), 4000);
    } else {
      setAvatarPreviewUrl(null);
      setAvatarError(toSafeString(res?.error, 'Failed to upload profile picture.'));
      setTimeout(() => setAvatarError(''), 4000);
    }
    try { URL.revokeObjectURL(objectPreviewUrl); } catch (_) {}
  };

  const handleSaveName = () => {
    if (nameInput.trim().length < 2) {
      setMsg('Name is too short.');
      return;
    }
    save((prev) => ({
      ...prev,
      user: { ...prev.user, name: nameInput.trim() },
    }));
    setMsg('Name updated successfully.');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSavePw = () => {
    if (oldPw !== (u.pw || 'demo123')) {
      setMsg('Current password is incorrect.');
      return;
    }
    if (newPw.length < 6) {
      setMsg('New password must be at least 6 characters.');
      return;
    }
    save((prev) => ({
      ...prev,
      user: { ...prev.user, pw: newPw },
    }));
    setOldPw('');
    setNewPw('');
    setMsg('Password changed successfully.');
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
            My Profile
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            Your account and study stats.
          </p>
        </div>
        <Badge size={52} />
      </div>

      {/* User Card */}
      <div className="bg-white rounded-3xl p-6 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 text-center flex flex-col items-center">
        {/* Avatar circle with green border & dynamic upload overlay */}
        <div className="relative group mt-1">
          <div className="w-24 h-24 aspect-square shrink-0 rounded-full bg-[#16335A] border-4 border-[#3E9B52] flex items-center justify-center text-white shadow-lg overflow-hidden relative">
            {resolvedAvatarUrl && !avatarImgFailed ? (
              <img
                src={resolvedAvatarUrl}
                alt={u.name || 'User avatar'}
                onError={() => setAvatarImgFailed(true)}
                className="w-full h-full object-cover object-center block"
              />
            ) : (
              <span className="font-heading text-4xl leading-none">
                {(u.name || 'S')[0].toUpperCase()}
              </span>
            )}

            {isUploadingAvatar && (
              <div className="absolute inset-0 bg-[#16335A]/80 flex flex-col items-center justify-center text-white text-[10px] font-bold">
                <Loader2 className="w-6 h-6 animate-spin text-[#A8D8B0]" />
                <span className="mt-1">Updating...</span>
              </div>
            )}
          </div>

          {/* Camera upload button */}
          <label
            htmlFor="deck-avatar-input"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#3E9B52] hover:bg-[#348345] text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer transition-transform hover:scale-110 active:scale-95"
            title="Upload new profile picture"
          >
            <Camera className="w-4 h-4" />
            <input
              id="deck-avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
              className="hidden"
              disabled={isUploadingAvatar}
              onChange={handleAvatarFileChange}
            />
          </label>
        </div>

        {resolvedAvatarUrl && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            disabled={isUploadingAvatar}
            className="text-[11px] text-slate-400 hover:text-rose-600 font-medium mt-1.5 transition-colors cursor-pointer"
          >
            Remove photo
          </button>
        )}

        {avatarSuccess && (
          <p className="text-xs text-[#3E9B52] font-semibold mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{avatarSuccess}</span>
          </p>
        )}

        {avatarError && (
          <p className="text-xs text-rose-600 font-semibold mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{avatarError}</span>
          </p>
        )}

        <h2 className="font-bold text-[#16335A] text-lg mt-3">{u.name}</h2>
        <span className="text-xs text-[#6B7C93]">{u.email}</span>

        {u.type && (
          <span className="text-xs font-semibold text-[#16335A] mt-1">
            {u.type}
          </span>
        )}

        {u.docLabel && (
          <span className="text-xs text-[#6B7C93] mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#3E9B52]" />
            <span>
              {u.docLabel} submitted ·{' '}
              {u.verified === 'approved' ? 'Verified' : 'Pending review'}
            </span>
          </span>
        )}

        {/* Plan pill */}
        <div
          className={`mt-3 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
            S.premium
              ? 'bg-[#E8C77A] text-[#16335A]'
              : 'bg-[#D5E2F2] text-[#16335A]'
          }`}
        >
          <Star className="w-3 h-3" />
          <span>
            {S.premium
              ? S.until
                ? `Premium until ${new Date(S.until).toLocaleDateString()}`
                : 'Premium · Review Package'
              : 'Free plan'}
          </span>
        </div>

        <span className="text-[11px] text-[#6B7C93] mt-2 block">
          Member since {new Date(u.joined || Date.now()).toLocaleDateString()}
        </span>
      </div>

      {/* 4 Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map(([val, label]) => (
          <div
            key={label as string}
            className="bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 text-center flex flex-col items-center justify-center"
          >
            <span className="font-heading text-3xl text-[#3E9B52] leading-none">
              {val}
            </span>
            <span className="text-xs text-[#6B7C93] mt-1 font-medium">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Edit Profile */}
      <div className="bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 space-y-3">
        <h3 className="font-bold text-[#16335A] text-sm">Edit profile</h3>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Full name"
          className="w-full bg-[#E8F1FB] rounded-xl px-4 py-2.5 text-sm text-[#1B2A41] placeholder-[#6B7C93] focus:outline-none"
        />
        <button
          onClick={handleSaveName}
          className="w-full py-2.5 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Save name
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 space-y-2.5">
        <h3 className="font-bold text-[#16335A] text-sm">Change password</h3>
        <input
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
          placeholder="Current password"
          className="w-full bg-[#E8F1FB] rounded-xl px-4 py-2.5 text-sm text-[#1B2A41] placeholder-[#6B7C93] focus:outline-none"
        />
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="New password (6+ characters)"
          className="w-full bg-[#E8F1FB] rounded-xl px-4 py-2.5 text-sm text-[#1B2A41] placeholder-[#6B7C93] focus:outline-none"
        />
        <button
          onClick={handleSavePw}
          className="w-full py-2.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
        >
          Update password
        </button>
      </div>

      {msg && (
        <p className="text-xs font-semibold text-[#16335A] text-center bg-white p-2.5 rounded-xl border border-[#D5E2F2]">
          {msg}
        </p>
      )}

      {/* Payment History */}
      {(S.pay || []).length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 space-y-2">
          <h3 className="font-bold text-[#16335A] text-sm">Payment history</h3>
          <div className="space-y-2 pt-1">
            {S.pay?.slice(0, 5).map((x) => (
              <div
                key={x.ref}
                className="py-1.5 border-t border-[#D5E2F2]/40 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-[#16335A] block">
                    {x.label} · ₱{x.amt}
                  </span>
                  <span className="text-[11px] text-[#6B7C93]">
                    {x.method} · {x.ref}
                  </span>
                </div>
                <span className="text-[11px] text-[#6B7C93]">
                  {new Date(x.at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permanent Progress Reassurance */}
      <div className="bg-[#E6F4E9] rounded-2xl p-4 border border-[#3E9B52]/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#3E9B52] shrink-0 mt-0.5" />
        <p className="text-xs text-[#1B2A41] leading-relaxed">
          Your progress is permanent and saved to your account. It can’t be deleted from the app, so every review session counts toward your board exam.
        </p>
      </div>

      {/* Rejection Warning Banner placed right above the Upgrade to Premium button as indicated in user screenshot */}
      {rejectedReceipt && !hasPendingReceipt && !S.premium && !currentUser?.is_premium && (
        <div className="bg-[#FFF0F3] rounded-2xl p-4 sm:p-5 border-2 border-rose-300 text-xs sm:text-sm text-rose-900 space-y-3 shadow-md animate-fade-in font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 font-bold text-[#A81538] text-sm sm:text-base">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Payment Receipt Rejected by Super Admin</span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono self-start sm:self-auto">
              Ref: {rejectedReceipt.reference_number}
            </span>
          </div>

          <div className="p-3.5 bg-white/95 rounded-xl border border-rose-200 text-xs space-y-1">
            <span className="font-bold text-[#A81538] uppercase tracking-wider text-[10px] block">
              SUPER ADMIN AUDIT REASON:
            </span>
            <p className="font-semibold text-slate-800 text-xs sm:text-sm leading-relaxed">
              "{rejectedReceipt.rejection_reason || 'Screenshot cut off / unreadable'}"
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium">
              Your payment upload form is unlocked. Please select your plan and upload a corrected receipt.
            </p>
            <button
              onClick={() => go('up')}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 shrink-0 uppercase tracking-wide"
            >
              <span>Re-Upload Payment Receipt</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upgrade to Premium Button */}
      <button
        onClick={() => go('up')}
        className="w-full py-3.5 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Star className="w-4 h-4 text-[#E8C77A] fill-[#E8C77A]" />
        <span>{S.premium ? 'Manage Premium' : 'Upgrade to Premium'}</span>
      </button>

      <button
        onClick={logout}
        className="w-full py-3 bg-white hover:bg-slate-50 border border-[#16335A] text-[#16335A] font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span>Log out</span>
      </button>
    </div>
  );
};

