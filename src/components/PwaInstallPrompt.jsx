import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Share2, Smartphone } from 'lucide-react';
import { playTickSound } from '../utils/audio';

const DISMISS_KEY = 'u2u_pwa_install_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = (window.navigator?.userAgent || '').toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent);
    return Boolean(isIosDevice && isSafari);
  });
  const [showManualGuide, setShowManualGuide] = useState(false);

  const handleDismiss = useCallback(() => {
    playTickSound();
    setVisible(false);
    setShowManualGuide(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }, []);

  useEffect(() => {
    // Check if already running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Check if user recently dismissed the prompt
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) {
        return;
      }
    } catch {}

    // Check for iOS / iPadOS
    if (isIOS) {
      const timer = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(timer);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();

    // Android & Chromium beforeinstallprompt handler
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setVisible(true), 1400);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If on mobile Android Chrome and beforeinstallprompt event might already have been dispatched
    const isAndroid = /android/.test(userAgent);
    let fallbackTimer = null;
    if (isAndroid) {
      fallbackTimer = setTimeout(() => {
        setVisible(true);
      }, 2000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [isIOS]);

  // Handle Escape key to dismiss dialog
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && visible) {
        e.preventDefault();
        handleDismiss();
      }
    }
    if (visible) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleDismiss]);

  const handleInstallClick = async () => {
    playTickSound();

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
          setVisible(false);
        }
      } catch {
        setShowManualGuide(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowManualGuide(true);
    }
  };

  if (!visible) return null;

  return (
    <div 
      className="pwa-install-overlay"
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-dialog-title"
      aria-describedby="pwa-dialog-desc"
    >
      <div 
        className="pwa-install-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pwa-install-dialog-header">
          <div className="pwa-install-badge">
            <div className="brand-dot" style={{ width: 6, height: 6 }} />
            <span>WEB APP</span>
          </div>

          <button 
            type="button" 
            className="pwa-dialog-close-btn" 
            onClick={handleDismiss}
            aria-label="Close install prompt"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="pwa-install-dialog-body">
          <div className="pwa-install-icon-frame" aria-hidden="true">
            {isIOS ? <Share2 size={24} /> : <Smartphone size={24} />}
          </div>

          <div className="pwa-install-dialog-content">
            <h2 id="pwa-dialog-title" className="pwa-dialog-title">Install U2U</h2>
            <p id="pwa-dialog-desc" className="pwa-dialog-description">
              Get a cleaner, full-screen chat experience from your home screen.
            </p>
          </div>
        </div>

        {showManualGuide && (
          <div className="pwa-dialog-guide">
            <p>
              Tap the browser menu <strong>(⋮)</strong> and select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
            </p>
          </div>
        )}

        {isIOS && (
          <div className="pwa-dialog-guide">
            <p>
              Tap <strong>Share</strong> <Share2 size={13} style={{ display: 'inline', verticalAlign: 'middle', margin: '0 2px' }} /> in Safari, then tap <strong>&quot;Add to Home Screen&quot;</strong>.
            </p>
          </div>
        )}

        <div className="pwa-dialog-actions">
          {!isIOS && !showManualGuide && (
            <button 
              type="button" 
              className="btn btn-primary pwa-dialog-install-btn"
              onClick={handleInstallClick}
            >
              <Download size={16} />
              <span>Install U2U</span>
            </button>
          )}

          <button 
            type="button" 
            className="btn btn-ghost pwa-dialog-dismiss-btn"
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
          >
            {isIOS || showManualGuide ? 'Got it' : 'Not now'}
          </button>
        </div>
      </div>
    </div>
  );
}
