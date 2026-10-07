import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { playTickSound } from '../utils/audio';

const DISMISS_KEY = 'u2u_pwa_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // Check if user recently dismissed the prompt
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) {
        return;
      }
    } catch {}

    // Check for iOS / iPadOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
      // Small delay so it doesn't immediately flash on load
      const timer = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android / Chromium beforeinstallprompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    playTickSound();
    setVisible(false);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
      }
    } catch {}
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    playTickSound();
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  if (!visible) return null;

  return (
    <aside className="pwa-install-banner" role="complementary" aria-label="Install App Banner">
      <div className="pwa-install-content">
        <div className="pwa-install-icon-wrapper" aria-hidden="true">
          {isIOS ? <Share size={18} /> : <Download size={18} />}
        </div>
        <div className="pwa-install-text">
          <h3 className="pwa-install-title">Install U2U</h3>
          <p className="pwa-install-subtitle">
            {isIOS 
              ? "Tap the Share button in Safari, then select 'Add to Home Screen'."
              : "Add U2U to your home screen for a faster, full-screen private chat experience."}
          </p>
        </div>
      </div>

      <div className="pwa-install-actions">
        {!isIOS && deferredPrompt && (
          <button 
            type="button" 
            className="btn btn-primary pwa-install-btn"
            onClick={handleInstallClick}
          >
            <span>Install</span>
          </button>
        )}
        <button 
          type="button" 
          className="btn btn-ghost pwa-dismiss-btn"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          {isIOS ? 'Got it' : 'Not now'}
        </button>
      </div>

      <button 
        type="button" 
        className="pwa-close-btn" 
        onClick={handleDismiss}
        aria-label="Close prompt"
      >
        <X size={16} />
      </button>
    </aside>
  );
}
