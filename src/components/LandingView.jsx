import React, { useState } from 'react';
import {
  Plus,
  KeyRound,
  ShieldCheck,
  FileText,
  Loader2,
  User,
  Key,
  Smartphone,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Eye,
  Mic,
  Clock,
  Mail,
  Flame,
  CheckCircle2,
  Sparkles,
  Zap,
  Laptop
} from 'lucide-react';
import { playTickSound, playErrorSound } from '../utils/audio';
import { canAccessWebChat } from '../utils/platformRouting';
import { isAndroidPlatform, isSupportedMobilePlatform } from '../utils/platform';

const CURRENT_YEAR = new Date().getFullYear();

export default function LandingView({
  onCreateClick,
  onJoinClick,
  onCreateProfileClick,
  onUnlockProfileClick,
  onOpenSecurity,
  onOpenTerms,
  onOpenPrivacy,
  onOpenAndroidGuidance,
  activeProfile,
  storedProfileMeta,
  onToast,
  isCreating = false
}) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsWarning, setTermsWarning] = useState(false);
  const [activeFaqIndex, setActiveFaqIndex] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isMobile = isSupportedMobilePlatform() || isAndroidPlatform();

  const handleActionWithTerms = (actionFn) => {
    if (!termsAccepted) {
      setTermsWarning(true);
      playErrorSound();
      onToast?.('Please accept the Terms & Conditions to continue');
      setTimeout(() => setTermsWarning(false), 2000);
      return;
    }
    if (isCreating) return;

    // Check desktop vs mobile browser restriction
    if (isMobile && !canAccessWebChat()) {
      playTickSound();
      if (onOpenAndroidGuidance) {
        onOpenAndroidGuidance();
      } else {
        onToast?.('U2U chat requires the Android App on mobile devices.');
      }
      return;
    }

    playTickSound();
    actionFn?.();
  };

  const scrollToSection = (id) => {
    playTickSound();
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleFaq = (index) => {
    playTickSound();
    setActiveFaqIndex(prev => prev === index ? null : index);
  };

  const FAQ_ITEMS = [
    {
      q: 'Do I need an account to use U2U?',
      a: 'No. Temporary sessions are completely anonymous and require no account, email address, or phone number. You simply create a session, share the private invitation link, and chat.'
    },
    {
      q: 'How do private invitation links work?',
      a: 'Invitation links contain a temporary routing token and a cryptographic passcode stored exclusively in the URL fragment (#passcode). Because URL fragments are handled entirely in your browser and never transmitted to our servers, the server cannot access your session passcode.'
    },
    {
      q: 'What happens if I lose my private key for a permanent profile?',
      a: 'Because U2U is strictly zero-knowledge, your private key is generated locally on your device and never sent to our servers. If you lose your recovery key, it cannot be restored by us or anyone else. Always back up your recovery key in a secure location.'
    },
    {
      q: 'How do temporary sessions expire?',
      a: 'Temporary sessions have an authoritative 24-hour lifetime. When the 24 hours elapse, or when either participant taps "Burn Session", the room and all ephemeral memory records are permanently erased.'
    },
    {
      q: 'Can U2U or network operators read my messages?',
      a: 'No. All messages, voice notes, and photos are encrypted on your device using AES-GCM with keys derived from your secret passcode. The server only sees encrypted blobs and envelope routing metadata.'
    },
    {
      q: 'How do I delete a permanent profile?',
      a: 'You can delete your permanent profile at any time in Profile Settings. Deletion is irreversible: it requires typing DELETE to confirm, destroys your locally stored private keys, and revokes your public identifier from the server.'
    },
    {
      q: 'How does Android installation work?',
      a: 'U2U for Android runs as a secure native package with client-side end-to-end encryption and background reconnection handling. On mobile devices, invitation links hand off directly into the installed app.'
    },
    {
      q: 'What happens if the network disconnects?',
      a: 'U2U uses rolling single-use reconnect tickets. If your connection drops temporarily or your mobile app resumes from the background, U2U seamlessly re-establishes your session without falsely reporting that a participant has permanently left.'
    }
  ];

  return (
    <div className="landing-website-container">
      {/* ── Public Website Navigation Header ── */}
      <nav className="site-nav glass-panel" aria-label="Main Navigation">
        <div className="site-nav-inner">
          <div className="site-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="brand-dots-icon">
              <div className="brand-dot" />
              <div className="brand-line" />
              <div className="brand-dot" />
            </div>
            <span className="site-logo-text">U2U</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="site-nav-links">
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection('features')}>
              Features
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection('how-it-works')}>
              How It Works
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection('privacy-design')}>
              Privacy
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection('temp-vs-perm')}>
              Comparison
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection('faq')}>
              FAQ
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection('support')}>
              Support
            </button>
          </div>

          {/* Nav CTA */}
          <div className="site-nav-actions">
            {isMobile ? (
              <button
                type="button"
                className="btn btn-primary btn-sm nav-cta-btn"
                onClick={onOpenAndroidGuidance}
              >
                <Smartphone size={15} />
                <span>Get the App</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm nav-cta-btn"
                onClick={() => scrollToSection('chat-launcher')}
              >
                <Zap size={15} />
                <span>Open U2U</span>
              </button>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              className="icon-btn mobile-menu-toggle"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle menu"
            >
              <div className="hamburger-icon-lines">
                <span />
                <span />
                <span />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileNavOpen && (
          <div className="mobile-nav-dropdown glass-panel">
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('privacy-design')}>Privacy by Design</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('temp-vs-perm')}>Temporary vs Permanent</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('faq')}>FAQ</button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToSection('support')}>Support</button>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-badge">
          <ShieldCheck size={16} />
          <span>Zero-Knowledge · Ephemeral · Encrypted</span>
        </div>

        <h1 className="hero-headline">
          Your conversations.<br />
          <span className="hero-headline-gradient">Your privacy. Your control.</span>
        </h1>

        <p className="hero-subtext">
          U2U is an encrypted communication platform engineered for two people.
          Share disposable invitation links, exchange self-destructing voice notes and 8-second photos,
          with zero mandatory registration.
        </p>

        {/* Primary Hero Entry CTAs */}
        <div className="hero-cta-group">
          {isMobile ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onOpenAndroidGuidance}
            >
              <Smartphone size={20} />
              <span>Get U2U for Android</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => scrollToSection('chat-launcher')}
            >
              <Laptop size={20} />
              <span>Continue on Desktop</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-lg"
            onClick={() => scrollToSection('how-it-works')}
          >
            <span>See How It Works</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* ── Interactive Chat Launcher / Action Hub ── */}
        <div id="chat-launcher" className="launcher-hub-card glass-panel">
          <div className="launcher-hub-header">
            <div className="launcher-indicator">
              <span className="live-node" />
              <span>Session Launcher</span>
            </div>
            {activeProfile && (
              <div className="launcher-active-profile">
                <User size={14} />
                <span>Signed in: <strong>{activeProfile.username}</strong></span>
              </div>
            )}
          </div>

          {/* Terms Acceptance Checkbox */}
          <label
            className="terms-acceptance-row"
            htmlFor="terms-checkbox"
            style={termsWarning ? { outline: '2px solid var(--accent, #e5a93c)', borderRadius: '8px', padding: '6px 10px', transition: 'all 0.2s ease' } : {}}
          >
            <input
              id="terms-checkbox"
              type="checkbox"
              className="terms-checkbox"
              checked={termsAccepted}
              onChange={(e) => {
                setTermsAccepted(e.target.checked);
                if (e.target.checked) setTermsWarning(false);
              }}
            />
            <span className="terms-text">
              I am 18 or older and I agree to the{' '}
              <button
                type="button"
                className="terms-link"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenTerms(); }}
              >
                Terms & Conditions
              </button>
              {' '}and{' '}
              <button
                type="button"
                className="terms-link"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenPrivacy(); }}
              >
                Privacy Policy
              </button>
              .
            </span>
          </label>

          {/* Launcher Grid */}
          <div className="launcher-options-grid">
            {/* 1. Start Temporary Session */}
            <button
              type="button"
              className="launcher-card primary-launcher"
              onClick={() => handleActionWithTerms(onCreateClick)}
              disabled={isCreating}
            >
              <div className="launcher-icon-wrap">
                {isCreating ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
              </div>
              <div className="launcher-card-body">
                <span className="launcher-card-title">
                  {isCreating ? 'Creating Session…' : 'Start a Temporary Session'}
                </span>
                <span className="launcher-card-sub">
                  Default 24h room · No profile required · E2EE
                </span>
              </div>
            </button>

            {/* 2. Join a Session */}
            <button
              type="button"
              className="launcher-card"
              onClick={() => handleActionWithTerms(onJoinClick)}
              disabled={isCreating}
            >
              <div className="launcher-icon-wrap">
                <KeyRound size={22} />
              </div>
              <div className="launcher-card-body">
                <span className="launcher-card-title">Join a Session</span>
                <span className="launcher-card-sub">
                  Enter an existing Session ID and Passcode
                </span>
              </div>
            </button>

            {/* 3. Create Permanent Profile */}
            <button
              type="button"
              className="launcher-card"
              onClick={() => handleActionWithTerms(onCreateProfileClick)}
              disabled={isCreating}
            >
              <div className="launcher-icon-wrap">
                <Key size={22} />
              </div>
              <div className="launcher-card-body">
                <span className="launcher-card-title">Create Permanent Profile</span>
                <span className="launcher-card-sub">
                  Optional local keypair · Zero-knowledge identity
                </span>
              </div>
            </button>

            {/* 4. I Already Have a Profile */}
            <button
              type="button"
              className="launcher-card"
              onClick={() => handleActionWithTerms(onUnlockProfileClick)}
              disabled={isCreating}
            >
              <div className="launcher-icon-wrap">
                <User size={22} />
              </div>
              <div className="launcher-card-body">
                <span className="launcher-card-title">
                  {storedProfileMeta ? 'Unlock Saved Profile' : 'I Have a Profile'}
                </span>
                <span className="launcher-card-sub">
                  {storedProfileMeta ? `Saved: ${storedProfileMeta.username}` : 'Import from 256-bit recovery key'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* ── Visual Showcase Mockup ── */}
        <div className="hero-mockup-showcase">
          <div className="mockup-glass-device glass-panel">
            <div className="mockup-header-bar">
              <div className="mockup-dots">
                <span className="dot dot-red" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <div className="mockup-badge-center">
                <span className="status-indicator connected" />
                <span>U2U Encrypted Channel</span>
              </div>
              <div className="mockup-timer">23:59:42 left</div>
            </div>

            <div className="mockup-chat-body">
              <div className="mockup-bubble peer">
                <div className="mockup-bubble-author">MidnightMochi</div>
                <div className="mockup-bubble-text">Hey! Did you send the new project brief?</div>
                <div className="mockup-bubble-meta">10:42 AM</div>
              </div>

              <div className="mockup-bubble self">
                <div className="mockup-bubble-text">Yes, sent as an 8-second self-destructing view. Check it out.</div>
                <div className="mockup-bubble-meta">10:43 AM · Seen</div>
              </div>

              <div className="mockup-bubble peer photo-preview-bubble">
                <div className="mockup-photo-badge">
                  <Flame size={14} />
                  <span>View-Once Photo · 8s remaining</span>
                </div>
                <div className="mockup-photo-mock" />
              </div>

              <div className="mockup-bubble self voice-bubble">
                <div className="mockup-voice-bar">
                  <Mic size={16} />
                  <div className="mockup-waveform" />
                  <span>0:14</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="section-block">
        <div className="section-header">
          <h2 className="section-title">Engineered for True Confidentiality</h2>
          <p className="section-subtitle">
            Every feature in U2U is built with rigorous zero-knowledge principles. We only advertise capabilities that are genuinely implemented in our stack.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card glass-panel">
            <div className="feature-icon-box">
              <Sparkles size={24} />
            </div>
            <h3 className="feature-card-title">Anonymous Temporary Sessions</h3>
            <p className="feature-card-desc">
              Start chatting immediately without providing phone numbers, emails, or personal identifiers. The fastest, cleanest way to speak privately.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-box">
              <Lock size={24} />
            </div>
            <h3 className="feature-card-title">End-to-End Encryption</h3>
            <p className="feature-card-desc">
              Messages, photos, and voice notes are encrypted locally with AES-GCM using client-derived session keys. The server routes ciphertext blindly.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-box">
              <Eye size={24} />
            </div>
            <h3 className="feature-card-title">8-Second Disappearing Photos</h3>
            <p className="feature-card-desc">
              View-once photos trigger an authoritative server-enforced 8-second countdown upon first reveal. Once opened or closed, payloads are permanently wiped.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-box">
              <Mic size={24} />
            </div>
            <h3 className="feature-card-title">Ephemeral Voice Notes</h3>
            <p className="feature-card-desc">
              Encrypted audio notes with automatic expiration timers. Once listened to or expired, voice payloads are purged completely from server memory.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-box">
              <Clock size={24} />
            </div>
            <h3 className="feature-card-title">Authoritative 24h Expiry</h3>
            <p className="feature-card-desc">
              Rooms self-destruct 24 hours after creation. Tap "Burn Session" at any moment to instantly obliterate all room state across all participants.
            </p>
          </div>

          <div className="feature-card glass-panel">
            <div className="feature-icon-box">
              <Key size={24} />
            </div>
            <h3 className="feature-card-title">Optional Permanent Profiles</h3>
            <p className="feature-card-desc">
              Generate a local 256-bit cryptographic identity with a recovery key phrase. Zero password storage on servers, and full irreversible deletion anytime.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section id="how-it-works" className="section-block">
        <div className="section-header">
          <h2 className="section-title">How U2U Works</h2>
          <p className="section-subtitle">Private communication in four clear, frictionless steps.</p>
        </div>

        <div className="workflow-steps-container">
          <div className="workflow-step-card glass-panel">
            <div className="step-number">01</div>
            <h3 className="step-title">Create or Join</h3>
            <p className="step-desc">
              Generate a temporary session or enter an invitation token. Your browser derives a unique 256-bit AES key from the passcode.
            </p>
          </div>

          <div className="workflow-step-card glass-panel">
            <div className="step-number">02</div>
            <h3 className="step-title">Share Privately</h3>
            <p className="step-desc">
              Share the invitation link with your intended participant. The passcode is embedded only in the URL fragment (#passcode), keeping it safe from servers.
            </p>
          </div>

          <div className="workflow-step-card glass-panel">
            <div className="step-number">03</div>
            <h3 className="step-title">Connect & Communicate</h3>
            <p className="step-desc">
              Both participants enter a private, two-person end-to-end encrypted channel. Send text, one-view photos, and disappearing voice notes.
            </p>
          </div>

          <div className="workflow-step-card glass-panel">
            <div className="step-number">04</div>
            <h3 className="step-title">Disappear Completely</h3>
            <p className="step-desc">
              Let the session expire automatically after 24 hours, or hit "Burn Session" to immediately erase all records from all devices and memory.
            </p>
          </div>
        </div>
      </section>

      {/* ── Privacy by Design Section ── */}
      <section id="privacy-design" className="section-block">
        <div className="section-header">
          <h2 className="section-title">Privacy by Design, Not by Promise</h2>
          <p className="section-subtitle">
            We don't ask you to trust our word. Here is the actual technical reality of our architecture.
          </p>
        </div>

        <div className="privacy-breakdown-grid">
          <div className="privacy-card glass-panel">
            <h3 className="privacy-card-title">What U2U Encrypts</h3>
            <p className="privacy-card-text">
              Every message string, photo image data, and audio recording buffer is encrypted in your browser or native Android app using authenticated <strong>AES-GCM (256-bit)</strong> with a unique initialization vector for every single transmission.
            </p>
          </div>

          <div className="privacy-card glass-panel">
            <h3 className="privacy-card-title">What the Server Accesses</h3>
            <p className="privacy-card-text">
              The server acts solely as a blind WebSocket router. It inspects only message routing envelope IDs, delivery acknowledgments, and timestamps. It possesses no keys to read message text, view photos, or listen to voice notes.
            </p>
          </div>

          <div className="privacy-card glass-panel">
            <h3 className="privacy-card-title">In-Memory Lifecycle</h3>
            <p className="privacy-card-text">
              Temporary sessions reside strictly in volatile RAM memory. There are no relational database records, no message log archives, and no disk backups of temporary conversations.
            </p>
          </div>

          <div className="privacy-card glass-panel">
            <h3 className="privacy-card-title">Zero Analytics & AI</h3>
            <p className="privacy-card-text">
              U2U contains zero third-party advertising trackers, zero telemetry analytics, and zero external AI integrations. Your private words are never ingested, trained upon, or shared with third parties.
            </p>
          </div>
        </div>
      </section>

      {/* ── Temporary vs Permanent Profiles ── */}
      <section id="temp-vs-perm" className="section-block">
        <div className="section-header">
          <h2 className="section-title">Temporary Sessions vs. Permanent Profiles</h2>
          <p className="section-subtitle">Choose the model that best fits your communication needs.</p>
        </div>

        <div className="comparison-cards-row">
          {/* Temporary */}
          <div className="comparison-card glass-panel">
            <div className="comparison-tag">Default & Pure Privacy</div>
            <h3 className="comparison-title">Temporary Sessions</h3>
            <p className="comparison-desc">Ideal for spontaneous, confidential conversations with zero footprint.</p>
            <ul className="comparison-features">
              <li><CheckCircle2 size={16} /> No account or registration of any kind</li>
              <li><CheckCircle2 size={16} /> Ephemeral 24-hour lifetime in volatile memory</li>
              <li><CheckCircle2 size={16} /> End-to-end encrypted AES-GCM channel</li>
              <li><CheckCircle2 size={16} /> Single-click instant "Burn Session"</li>
              <li><CheckCircle2 size={16} /> Anonymous random display name per session</li>
            </ul>
          </div>

          {/* Permanent */}
          <div className="comparison-card glass-panel highlighted">
            <div className="comparison-tag accent">Optional Convenience</div>
            <h3 className="comparison-title">Permanent Profiles</h3>
            <p className="comparison-desc">Ideal if you want to retain a consistent identity across sessions.</p>
            <ul className="comparison-features">
              <li><CheckCircle2 size={16} /> 256-bit cryptographic keypair generated locally</li>
              <li><CheckCircle2 size={16} /> Private key never leaves your device in plaintext</li>
              <li><CheckCircle2 size={16} /> Optional PBKDF2 device password protection</li>
              <li><CheckCircle2 size={16} /> Portable across devices via recovery key phrase</li>
              <li><CheckCircle2 size={16} /> 100% Irreversible deletion anytime with DELETE confirm</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faq" className="section-block">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">Clear, honest answers about U2U's security and behavior.</p>
        </div>

        <div className="faq-accordion">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = activeFaqIndex === idx;
            return (
              <div key={idx} className={`faq-item glass-panel ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-question-text">{item.q}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                {isOpen && (
                  <div className="faq-answer-content">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Support & Footer ── */}
      <footer id="support" className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <div className="site-brand">
              <div className="brand-dots-icon">
                <div className="brand-dot" />
                <div className="brand-line" />
                <div className="brand-dot" />
              </div>
              <span className="site-logo-text">U2U</span>
            </div>
            <p className="footer-tagline">Private conversations, built to disappear.</p>
            <div className="footer-support-contact">
              <Mail size={15} />
              <a href="mailto:u2u.contactus@gmail.com" className="support-email-link">
                u2u.contactus@gmail.com
              </a>
            </div>
          </div>

          <div className="footer-links-col">
            <span className="footer-links-title">Security & Legal</span>
            <button type="button" className="footer-link-btn" onClick={onOpenSecurity}>
              <ShieldCheck size={14} />
              <span>Cryptographic Architecture</span>
            </button>
            <button type="button" className="footer-link-btn" onClick={onOpenTerms}>
              <FileText size={14} />
              <span>Terms & Conditions</span>
            </button>
            <button type="button" className="footer-link-btn" onClick={onOpenPrivacy}>
              <Lock size={14} />
              <span>Privacy Policy</span>
            </button>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>&copy; {CURRENT_YEAR} U2U. All rights reserved. Zero-knowledge communication platform.</span>
        </div>
      </footer>
    </div>
  );
}
