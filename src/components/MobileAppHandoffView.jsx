import React, { useState } from 'react';
import { Smartphone, Download, ArrowRight, ShieldCheck, Laptop } from 'lucide-react';
import { getAppDistributionConfig, generateAppDeepLink, setDesktopOverride } from '../utils/platformRouting';
import { playTickSound } from '../utils/audio';

export default function MobileAppHandoffView({
  token = '',
  passcode = '',
  onContinueDesktop,
  onGoHome
}) {
  const distConfig = getAppDistributionConfig();
  const deepLink = token ? generateAppDeepLink(token, passcode) : '';
  const [attemptedDeepLink, setAttemptedDeepLink] = useState(false);

  const handleOpenApp = () => {
    playTickSound();
    setAttemptedDeepLink(true);
    if (deepLink && typeof window !== 'undefined') {
      window.location.href = deepLink;
    }
  };

  const handleDesktopFallback = () => {
    playTickSound();
    setDesktopOverride(true);
    onContinueDesktop?.();
  };

  return (
    <div className="mobile-handoff-wrapper">
      <div className="mobile-handoff-card glass-panel">
        <div className="mobile-handoff-badge">
          <Smartphone size={16} />
          <span>Android Experience</span>
        </div>

        <h1 className="mobile-handoff-title">
          {token ? 'Open Invitation in U2U Android App' : 'Get U2U for Android'}
        </h1>

        <p className="mobile-handoff-description">
          For end-to-end encrypted messaging with resilient background connection on mobile devices, conversations require the official U2U Android app.
        </p>

        {token && (
          <div className="mobile-invite-box">
            <ShieldCheck size={18} className="mobile-invite-icon" />
            <div className="mobile-invite-details">
              <span className="mobile-invite-label">Encrypted Invitation Attached</span>
              <span className="mobile-invite-sub">Passcode preserved securely on device</span>
            </div>
          </div>
        )}

        {/* Primary Action: Open App if invitation, or Download */}
        <div className="mobile-handoff-actions">
          {token && (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleOpenApp}
              style={{ height: '50px' }}
            >
              <Smartphone size={18} />
              <span>Open in U2U App</span>
            </button>
          )}

          {attemptedDeepLink && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '4px', textAlign: 'center' }}>
              If the app didn't open automatically, download below.
            </p>
          )}

          {distConfig.isAvailable ? (
            <a
              href={distConfig.downloadUrl}
              className={`btn ${token ? 'btn-secondary' : 'btn-primary'} btn-block`}
              style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
              download
            >
              <Download size={18} />
              <span>Download U2U APK</span>
            </a>
          ) : (
            <div className="app-coming-soon-card">
              <div className="app-coming-soon-header">
                <Download size={18} />
                <span>U2U for Android — Coming Soon</span>
              </div>
              <p className="app-coming-soon-text">
                The verified standalone Android package is currently being finalized. Full web chat is available immediately on any desktop browser.
              </p>
            </div>
          )}
        </div>

        {/* Safe Recovery Paths */}
        <div className="mobile-recovery-section">
          <p className="mobile-recovery-heading">Alternative Options</p>
          
          <button
            type="button"
            className="mobile-recovery-btn"
            onClick={handleDesktopFallback}
          >
            <Laptop size={16} />
            <span>Continue in Desktop View (Tablets / Browsers)</span>
          </button>

          <button
            type="button"
            className="mobile-recovery-btn secondary"
            onClick={() => { playTickSound(); onGoHome?.(); }}
          >
            <span>Return to Public Website</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
