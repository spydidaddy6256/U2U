import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { playTickSound } from '../utils/audio';
import { isSupportedMobilePlatform } from '../utils/platform';
import { CURRENT_VERSION } from '../data/releaseNotes';
import './UpdateBanner.css';

const DISMISS_KEY = `u2u_update_banner_dismissed_${CURRENT_VERSION}`;

// Session-level flag to ensure entrance animation plays exactly once on genuine app launch
let sessionEntrancePlayed = false;

export default function UpdateBanner({ onViewUpdates }) {
  const [shouldRender, setShouldRender] = useState(() => {
    if (!isSupportedMobilePlatform()) return false;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return false;
    } catch {
      return false;
    }
    return true;
  });

  const [isDismissing, setIsDismissing] = useState(false);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(sessionEntrancePlayed);

  useEffect(() => {
    if (!sessionEntrancePlayed && shouldRender) {
      const timer = setTimeout(() => {
        sessionEntrancePlayed = true;
        setHasAnimatedIn(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldRender]);

  if (!shouldRender) return null;

  const handleDismiss = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playTickSound();
    setIsDismissing(true);

    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}

    // Allow smooth fade/collapse animation to finish before unmounting
    setTimeout(() => {
      setShouldRender(false);
    }, 280);
  };

  const handleViewUpdates = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    playTickSound();
    if (onViewUpdates) {
      onViewUpdates();
    }
  };

  const animClass = isDismissing
    ? 'update-banner-dismissing'
    : hasAnimatedIn
    ? 'update-banner-stable'
    : 'update-banner-entrance';

  return (
    <section 
      className={`update-banner-container ${animClass}`}
      role="region"
      aria-label="Application update announcement"
    >
      <div className="update-banner-card">
        {/* Decorative subtle ambient gradient accent */}
        <div className="update-banner-ambient" aria-hidden="true" />

        {/* Dismiss Button */}
        <button
          type="button"
          className="update-banner-close-btn"
          onClick={handleDismiss}
          aria-label="Dismiss update banner"
          title="Dismiss banner"
        >
          <X size={16} />
        </button>

        {/* Header Row: Badge & Version */}
        <div className="update-banner-meta-row">
          <span className="update-banner-badge">
            <Sparkles size={12} className="update-banner-badge-icon" />
            <span>Update v{CURRENT_VERSION}</span>
          </span>
        </div>

        {/* Content */}
        <div className="update-banner-body">
          <h3 className="update-banner-title">What's New in U2U</h3>
          <p className="update-banner-description">
            Cinematic 3D launch, enhanced privacy blur & security refinements.
          </p>
        </div>

        {/* Actions */}
        <div className="update-banner-actions">
          <button
            type="button"
            className="update-banner-cta"
            onClick={handleViewUpdates}
          >
            <span>View Updates</span>
            <ArrowRight size={14} className="update-banner-cta-icon" />
          </button>
        </div>
      </div>
    </section>
  );
}
