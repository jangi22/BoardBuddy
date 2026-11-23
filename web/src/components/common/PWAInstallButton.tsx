import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, CheckCircle, X, Zap, Package, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    deferredPWAInstallPrompt?: any;
  }
}

function getApkDownloadUrl(): string {
  const raw = String(import.meta.env.VITE_APK_DOWNLOAD_URL || '').trim();
  if (!raw || raw.toLowerCase() === 'undefined' || raw.toLowerCase() === 'null') {
    return '/boardbuddy.apk';
  }
  return raw;
}

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pwaStatus, setPwaStatus] = useState<'idle' | 'prompting' | 'installed' | 'manual'>('idle');
  const [pwaMessage, setPwaMessage] = useState<string>('');
  const [apkCheckState, setApkCheckState] = useState<'idle' | 'checking' | 'started' | 'unavailable'>('idle');
  const [apkMessage, setApkMessage] = useState<string>('');

  const apkUrl = getApkDownloadUrl();

  useEffect(() => {
    // Check if app is running in standalone mode (already installed)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if global prompt was already captured in index.html
    if (window.deferredPWAInstallPrompt) {
      setDeferredPrompt(window.deferredPWAInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      window.deferredPWAInstallPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      window.deferredPWAInstallPrompt = null;
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const closeModal = () => {
    setShowModal(false);
    setPwaStatus('idle');
    setPwaMessage('');
    setApkCheckState('idle');
    setApkMessage('');
  };

  const getManualInstallNotice = (): string => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }

    if (isIOS) {
      return 'Automatic install prompts are not supported in iOS Safari. Tap the Share button in Safari and choose "Add to Home Screen" to install BoardBuddy.';
    }
    if (isInIframe) {
      return 'One-tap browser installation is unavailable inside an embedded frame. Open BoardBuddy directly in Chrome, then tap the browser menu (⋮) → "Install app" or "Add to Home screen".';
    }
    return 'Browser install prompt is not available right now. Tap the browser menu (three dots ⋮ in the top-right corner) and select "Install app" or "Add to Home screen".';
  };

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const activePrompt = deferredPrompt || window.deferredPWAInstallPrompt;

    if (activePrompt && !isStandalone) {
      try {
        // Trigger native Chrome / Edge / Brave installation dialog directly
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        setDeferredPrompt(null);
        window.deferredPWAInstallPrompt = null;
        if (outcome === 'accepted') {
          setIsStandalone(true);
          closeModal();
          return;
        }
      } catch (err) {
        console.warn('Native PWA install prompt error:', err);
        setDeferredPrompt(null);
        window.deferredPWAInstallPrompt = null;
      }
    }

    // Show options modal
    setPwaStatus('idle');
    setPwaMessage('');
    setApkCheckState('idle');
    setApkMessage('');
    setShowModal(true);
  };

  const handleDirectPwaInstall = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isStandalone) {
      setPwaStatus('installed');
      setPwaMessage('BoardBuddy is already installed and running in standalone app mode.');
      return;
    }

    const activePrompt = deferredPrompt || window.deferredPWAInstallPrompt;

    if (!activePrompt || typeof activePrompt.prompt !== 'function') {
      setPwaStatus('manual');
      setPwaMessage(getManualInstallNotice());
      return;
    }

    setPwaStatus('prompting');
    setPwaMessage('');

    try {
      await activePrompt.prompt();
      const choiceResult = await activePrompt.userChoice;
      const outcome = choiceResult?.outcome;
      setDeferredPrompt(null);
      window.deferredPWAInstallPrompt = null;

      if (outcome === 'accepted') {
        setIsStandalone(true);
        setPwaStatus('installed');
        setPwaMessage('BoardBuddy installation started! Look for BoardBuddy on your home screen or app launcher.');
      } else {
        setPwaStatus('manual');
        setPwaMessage(
          'Install prompt was dismissed. You can still install anytime via your browser menu (three dots ⋮ → "Install app" or "Add to Home screen").'
        );
      }
    } catch (err) {
      console.warn('Native PWA install prompt error:', err);
      setDeferredPrompt(null);
      window.deferredPWAInstallPrompt = null;
      setPwaStatus('manual');
      setPwaMessage(getManualInstallNotice());
    }
  };

  const triggerBrowserFileDownload = (href: string) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = 'BoardBuddy.apk';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApkDownload = async () => {
    setApkCheckState('checking');
    setApkMessage('');

    let resolvedUrl: URL;
    try {
      resolvedUrl = new URL(apkUrl, window.location.origin);
    } catch {
      setApkCheckState('unavailable');
      setApkMessage('The configured APK download URL is invalid. Please use Direct PWA Installation above or check VITE_APK_DOWNLOAD_URL.');
      return;
    }

    const isSameOrigin = resolvedUrl.origin === window.location.origin;

    if (isSameOrigin) {
      try {
        let resp = await fetch(resolvedUrl.toString(), { method: 'HEAD', cache: 'no-store' });
        if (resp.status === 405) {
          resp = await fetch(resolvedUrl.toString(), {
            method: 'GET',
            headers: { Range: 'bytes=0-15' },
            cache: 'no-store',
          });
        }

        const contentType = String(resp.headers.get('content-type') || '').toLowerCase();
        const contentLengthHeader = resp.headers.get('content-length');
        const contentLength = contentLengthHeader !== null ? Number(contentLengthHeader) : null;

        // Treat missing status, non-binary fallback payloads (HTML/text/JSON), or empty files as unavailable
        const isNonBinaryFallback =
          contentType.includes('text/html') ||
          contentType.startsWith('text/') ||
          contentType.includes('application/json');
        const isEmptyFile = contentLength !== null && Number.isFinite(contentLength) && contentLength <= 0;

        if (!resp.ok || isNonBinaryFallback || isEmptyFile) {
          setApkCheckState('unavailable');
          setApkMessage(
            `Android .apk installer is not yet available at "${apkUrl}". Place the signed build at public/boardbuddy.apk or set VITE_APK_DOWNLOAD_URL, or use Direct PWA Installation above.`
          );
          return;
        }
      } catch {
        setApkCheckState('unavailable');
        setApkMessage(
          `Unable to verify the Android .apk file at "${apkUrl}" right now. Please check your connection or use Direct PWA Installation above.`
        );
        return;
      }
    } else {
      // Best-effort check for external URLs when CORS allows; fall back to triggering download if CORS blocks HEAD
      try {
        const resp = await fetch(resolvedUrl.toString(), { method: 'HEAD', cache: 'no-store' });
        const contentType = String(resp.headers.get('content-type') || '').toLowerCase();
        if (
          !resp.ok ||
          contentType.includes('text/html') ||
          contentType.startsWith('text/') ||
          contentType.includes('application/json')
        ) {
          setApkCheckState('unavailable');
          setApkMessage(
            `The Android .apk file could not be found at the configured download URL. Please verify VITE_APK_DOWNLOAD_URL or use Direct PWA Installation above.`
          );
          return;
        }
      } catch {
        // Cross-origin servers without CORS headers still allow direct anchor downloads
      }
    }

    triggerBrowserFileDownload(resolvedUrl.toString());
    setApkCheckState('started');
    setApkMessage('Download started! Open BoardBuddy.apk on your Android device once complete to install.');
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`group flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#3E9B52] to-[#348345] hover:from-[#348345] hover:to-[#2b6e39] text-white text-xs font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer border border-emerald-400/30 ${className}`}
        title="Install BoardBuddy App on your device"
      >
        {isStandalone ? (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-200" />
            <span>App Installed</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4 text-emerald-100 group-hover:translate-y-0.5 transition-transform" />
            <span>Install App</span>
          </>
        )}
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeModal}
                  className="absolute inset-0 bg-[#16335A]/65"
                />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="w-full max-w-xl bg-white rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-[#D5E2F2] font-body"
            >
              {/* Modal Header */}
              <div className="bg-[#16335A] px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#3E9B52] flex items-center justify-center text-white shadow-md shrink-0">
                    <Download className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-lg sm:text-xl text-white">BoardBuddy Installation Options</h3>
                    <p className="text-[10px] text-[#A8D8B0] font-bold uppercase tracking-wider">Choose your preferred download method</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close installation options"
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer font-bold shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar text-[#1B2A41]">
                {/* Option 1: Progressive Web App (PWA) - RECOMMENDED */}
                <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 border-2 border-[#3E9B52] shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#3E9B52] flex items-center justify-center text-white shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-sm text-[#16335A]">Direct PWA Installation</h4>
                        <span className="px-2 py-0.5 rounded-full bg-[#16335A] text-white text-[9px] font-black uppercase tracking-wider">Official &amp; Safe</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">Installs BoardBuddy to your home screen instantly with zero storage impact.</p>
                    </div>
                  </div>

                  {/* PWA Specs Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-emerald-100 text-center">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Storage</span>
                      <span className="text-xs font-extrabold text-[#16335A]">&lt; 1 MB</span>
                    </div>
                    <div className="border-x border-slate-100">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Updates</span>
                      <span className="text-xs font-extrabold text-[#16335A]">Instant</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reliability</span>
                      <span className="text-xs font-extrabold text-[#3E9B52]">100%</span>
                    </div>
                  </div>

                  {/* PWA Action Button */}
                  <button
                    type="button"
                    onClick={handleDirectPwaInstall}
                    className="w-full py-3.5 bg-[#3E9B52] hover:bg-[#348345] active:scale-[0.99] text-white font-extrabold text-xs rounded-2xl shadow-md shadow-[#3E9B52]/25 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    {pwaStatus === 'prompting' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>OPENING INSTALL PROMPT...</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span>INSTALL NOW (OFFICIAL CHROME METHOD)</span>
                      </>
                    )}
                  </button>

                  {pwaMessage && (
                    <div
                      role="status"
                      className={`p-3 rounded-2xl border text-[11px] font-semibold leading-relaxed flex items-start gap-2 ${
                        pwaStatus === 'installed'
                          ? 'bg-white border-emerald-300 text-emerald-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      {pwaStatus === 'installed' ? (
                        <CheckCircle className="w-4 h-4 text-[#3E9B52] shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <span>{pwaMessage}</span>
                    </div>
                  )}
                </div>

                {/* Option 2: Android APK Download for Instructors & Testers */}
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 border border-[#D5E2F2] shadow-xs space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#16335A] flex items-center justify-center text-white shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-sm text-[#16335A]">Android APK Download</h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black uppercase tracking-wider">For Instructors &amp; Testers</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">Download the standalone Android package (.apk) for direct device testing and sideloading.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApkDownload}
                    disabled={apkCheckState === 'checking'}
                    className={`w-full py-3.5 font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wider ${
                      apkCheckState === 'checking'
                        ? 'bg-slate-300 text-slate-600 cursor-wait'
                        : 'bg-[#16335A] hover:bg-[#1F4478] active:scale-[0.99] text-white cursor-pointer shadow-[#16335A]/20'
                    }`}
                  >
                    {apkCheckState === 'checking' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Checking Android APK Availability...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 shrink-0" />
                        <span>Download Android APK (.apk)</span>
                      </>
                    )}
                  </button>

                  {apkMessage && (
                    <div
                      role="status"
                      className={`p-3 rounded-2xl border text-[11px] font-semibold leading-relaxed flex items-start gap-2 ${
                        apkCheckState === 'started'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      {apkCheckState === 'started' ? (
                        <CheckCircle className="w-4 h-4 text-[#3E9B52] shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <span>{apkMessage}</span>
                    </div>
                  )}
                </div>

                {/* Quick Manual Installation Guide */}
                <div className="p-4 rounded-2xl bg-[#E8F1FB] border border-[#D5E2F2] space-y-2.5">
                  <span className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider block">How to Install in 3 Steps on Android:</span>
                  <div className="bg-white p-3.5 rounded-xl border border-[#D5E2F2] text-xs text-slate-700 font-medium leading-relaxed space-y-2.5">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold text-[#3E9B52] uppercase tracking-wider block">Option A — Chrome PWA (Recommended)</span>
                      <p>1. Open BoardBuddy in <strong className="text-[#16335A]">Google Chrome</strong> on your Android phone.</p>
                      <p>2. Tap the <strong className="text-[#16335A]">three dots (⋮)</strong> in the top-right corner of Chrome.</p>
                      <p>3. Tap <strong className="text-[#3E9B52]">&quot;Install app&quot;</strong> (or <strong className="text-[#3E9B52]">&quot;Add to Home screen&quot;</strong>) to open BoardBuddy in full-screen standalone mode.</p>
                    </div>
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-extrabold text-[#16335A] uppercase tracking-wider block">Option B — Android APK Package</span>
                      <p>1. Tap <strong className="text-[#16335A]">&quot;DOWNLOAD ANDROID APK (.APK)&quot;</strong> above to save <strong className="text-[#16335A]">BoardBuddy.apk</strong>.</p>
                      <p>2. Open the downloaded <strong className="text-[#16335A]">BoardBuddy.apk</strong> file from your browser downloads or notifications.</p>
                      <p>3. If prompted, allow <strong className="text-[#16335A]">Install unknown apps / from this browser</strong> in Android settings, then tap <strong className="text-[#3E9B52]">Install</strong>.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-100 px-5 sm:px-6 py-4 flex items-center justify-between border-t border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">BoardBuddy Review System</span>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};



