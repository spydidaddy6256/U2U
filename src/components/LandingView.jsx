import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, KeyRound, ShieldCheck, FileText } from 'lucide-react';
import { playTickSound } from '../utils/audio';

export default function LandingView({ onCreateClick, onJoinClick, onOpenSecurity, onOpenTerms, onOpenPrivacy }) {
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <div className="landing-wrapper">
      {/* Visual Identity Mark */}
      <div className="landing-hero-mark">
        <div className="brand-dots-icon" style={{ transform: 'scale(1.3)' }}>
          <div className="brand-dot" />
          <div className="brand-line" style={{ width: '22px' }} />
          <div className="brand-dot" />
        </div>
      </div>

      {/* Wordmark & Tagline */}
      <h1 className="landing-title">U2U</h1>
      <p className="landing-tagline">Private conversations, built to disappear.</p>
      <p className="landing-description">Temporary encrypted sessions for two people. No account required.</p>

      {/* Terms Acceptance */}
      <label className="terms-acceptance-row" htmlFor="terms-checkbox">
        <input
          id="terms-checkbox"
          type="checkbox"
          className="terms-checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <span className="terms-text">
          I am 18 or older and I agree to the{' '}
          <button
            className="terms-link"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenTerms(); }}
          >
            Terms & Conditions
          </button>
          {' '}and{' '}
          <button
            className="terms-link"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPrivacy(); }}
          >
            Privacy Policy
          </button>
          .
        </span>
      </label>

      {/* Primary Actions */}
      <div className="landing-actions">
        <button
          className="btn btn-primary"
          onClick={() => { if (!termsAccepted) return; playTickSound(); onCreateClick(); }}
          disabled={!termsAccepted}
          style={{ width: '100%', height: '48px' }}
          title={!termsAccepted ? 'Accept the Terms & Conditions to continue' : 'Create a new private session'}
        >
          <Plus size={18} />
          <span>Create a Session</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => { if (!termsAccepted) return; playTickSound(); onJoinClick(); }}
          disabled={!termsAccepted}
          style={{ width: '100%', height: '48px' }}
          title={!termsAccepted ? 'Accept the Terms & Conditions to continue' : 'Join an existing session'}
        >
          <KeyRound size={18} />
          <span>Join a Session</span>
        </button>
      </div>

      {/* Subtle Privacy Statement */}
      <div className="landing-footer-statement">
        <span>End-to-end encrypted</span>
        <span className="bullet">·</span>
        <span>No account</span>
        <span className="bullet">·</span>
        <span>Expires in 24 hours</span>
      </div>

      <div className="landing-footer-links">
        <button
          className="terms-link"
          onClick={onOpenSecurity}
          style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}
        >
          <ShieldCheck size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          How this works
        </button>
        <button
          className="terms-link"
          onClick={onOpenTerms}
          style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}
        >
          <FileText size={13} style={{ marginRight: 5, verticalAlign: 'middle' }} />
          Terms
        </button>
      </div>
    </div>
  );
}
