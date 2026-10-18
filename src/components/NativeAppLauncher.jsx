import React, { useState } from 'react';
import {
  User,
  Key,
  ArrowUpRight,
  Search
} from 'lucide-react';
import { playTickSound } from '../utils/audio';
import { getAvatarSvg } from '../data/avatars';
import './NativeAppLauncher.css';

export default function NativeAppLauncher({
  onCreateClick,
  onJoinClick,
  onOpenCreateProfile,
  onOpenUnlockProfile,
  onOpenDeleteProfile,
  activeProfile,
  storedProfileMeta: _storedProfileMeta,
  activeSession,
  onResumeActiveSession,
  onBurnActiveSession,
  onOpenSecurity,
  onOpenTerms,
  onOpenPrivacy,
  isCreating = false,
  onToast: _onToast
}) {
  const [quickRoomInput, setQuickRoomInput] = useState('');

  const handleQuickJoinSubmit = (e) => {
    e.preventDefault();
    playTickSound();
    onJoinClick?.();
  };

  const renderAvatar = (avatarKey, name) => {
    if (!avatarKey) return <User size={22} />;
    if (avatarKey.startsWith('data:')) {
      return <img src={avatarKey} alt={name || 'Avatar'} className="launcher-profile-avatar-img" />;
    }
    return (
      <div
        className="launcher-profile-avatar-svg"
        dangerouslySetInnerHTML={{ __html: getAvatarSvg(avatarKey) }}
      />
    );
  };

  return (
    <div className="native-launcher-container" data-testid="native-app-launcher">
      {/* ── Status Pill ── */}
      <div className="home-status-row">
        <div className="home-status-pill">
          <span className="home-status-dot" />
          <span>End-to-end encrypted · 24h</span>
        </div>
      </div>

      {/* ── Hero Area ── */}
      <div className="home-hero">
        <h1 className="home-headline">
          Your space.<br />
          <span className="home-headline-coral">Your conversation.</span>
        </h1>
        <p className="home-subhead">
          Private, encrypted messaging between two people. Gone after 24 hours.
        </p>
      </div>

      {/* ── Search / Invite Input Pill ── */}
      <form onSubmit={handleQuickJoinSubmit} className="home-search-pill">
        <Search size={18} className="home-search-icon" />
        <input
          type="text"
          className="home-search-input"
          value={quickRoomInput}
          onChange={(e) => setQuickRoomInput(e.target.value)}
          placeholder="Session ID or invite link"
          onFocus={() => { playTickSound(); onJoinClick?.(); }}
        />
        <button
          type="submit"
          className="home-search-join-btn"
          onClick={() => { playTickSound(); onJoinClick?.(); }}
          aria-label="Join session"
        >
          Join
        </button>
      </form>

      {/* ── Dual Side-by-Side Action Cards ── */}
      <div className="home-cards-grid">
        {/* Card 1: Start a temporary session */}
        <button
          type="button"
          className="home-action-card home-card-coral"
          onClick={() => { playTickSound(); onCreateClick?.(); }}
          disabled={isCreating}
          aria-label="Start Temporary Session"
          title="Start Temporary Session"
        >
          <span className="home-card-badge">24H · AUTO-BURN</span>
          <div className="home-card-title">
            {isCreating ? 'Creating…' : 'Start a temporary session'}
          </div>
          <div className="home-card-action-circle coral-circle">
            <ArrowUpRight size={20} />
          </div>
        </button>

        {/* Card 2: Join a session */}
        <button
          type="button"
          className="home-action-card home-card-dark"
          onClick={() => { playTickSound(); onJoinClick?.(); }}
          disabled={isCreating}
          aria-label="Join a Session"
          title="Join a Session"
        >
          <span className="home-card-badge">ROOM ID + PASSCODE</span>
          <div className="home-card-title">Join a session</div>
          <div className="home-card-action-circle dark-circle">
            <ArrowUpRight size={20} />
          </div>
        </button>
      </div>

      {/* ── Active Session Section (Cream Card with -1deg rotation) ── */}
      {activeSession && activeSession.sessionId && (
        <section className="home-section" aria-label="Active session">
          <div className="home-section-header">
            <h2 className="home-section-title">Active session</h2>
            <span className="home-section-count">1 open</span>
          </div>

          <div className="home-active-session-card" data-testid="active-session-card">
            <div className="active-card-top-row">
              <div className="active-card-avatar">
                {activeProfile?.avatar ? (
                  renderAvatar(activeProfile.avatar, activeProfile.username)
                ) : (
                  <span className="active-avatar-initials">
                    {(activeProfile?.username || 'SF').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="active-card-info">
                <div className="active-card-name">
                  {activeProfile?.username || 'Silver Fox'}
                </div>
                <div className="active-card-status">
                  Connected · {activeSession.timeRemaining || '23:41:08 left'}
                </div>
              </div>
              <span className="active-card-dot" />
            </div>

            <div className="active-card-buttons-row">
              <button
                type="button"
                className="active-btn-resume"
                onClick={() => { playTickSound(); onResumeActiveSession?.(); }}
              >
                Resume
              </button>
              <button
                type="button"
                className="active-btn-burn"
                onClick={() => { playTickSound(); onBurnActiveSession?.(); }}
              >
                Burn
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── Identity & Vault Section ── */}
      <section className="home-section" aria-label="Permanent Profile and Identity Vault">
        <div className="home-section-header">
          <h2 className="home-section-title">Identity & vault</h2>
          <span className="home-section-count">Device only</span>
        </div>

        <div className="native-profile-card home-vault-card" data-testid="native-profile-card">
          <div className="vault-top-row">
            <div className="vault-key-icon-circle">
              <Key size={18} />
            </div>
            <div className="vault-text-stack">
              <div className="vault-title">
                {activeProfile?.username ? `@${activeProfile.username}` : 'Anonymous mode'}
              </div>
              <div className="vault-subtitle">
                {activeProfile?.username
                  ? 'Permanent Profile active on device'
                  : 'No profile needed for temporary chats.'}
              </div>
            </div>
          </div>

          <div className="vault-buttons-row">
            {activeProfile ? (
              <>
                <button
                  type="button"
                  className="vault-btn vault-btn-coral"
                  onClick={() => { playTickSound(); onOpenUnlockProfile?.(); }}
                >
                  Profile settings
                </button>
                <button
                  type="button"
                  className="vault-btn vault-btn-dark danger-text"
                  onClick={() => { playTickSound(); onOpenDeleteProfile?.(); }}
                >
                  Delete profile
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="vault-btn vault-btn-coral"
                  onClick={() => { playTickSound(); onOpenCreateProfile?.(); }}
                  title="Create Permanent Profile"
                >
                  Create profile
                </button>
                <button
                  type="button"
                  className="vault-btn vault-btn-dark"
                  onClick={() => { playTickSound(); onOpenUnlockProfile?.(); }}
                  title="Restore key"
                >
                  Restore key
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer Links ── */}
      <footer className="native-security-strip home-footer">
        <button
          type="button"
          className="home-footer-link"
          onClick={() => { playTickSound(); onOpenSecurity?.(); }}
        >
          Security
        </button>
        <button
          type="button"
          className="home-footer-link"
          onClick={() => { playTickSound(); onOpenTerms?.(); }}
        >
          Terms
        </button>
        <button
          type="button"
          className="home-footer-link"
          onClick={() => { playTickSound(); onOpenPrivacy?.(); }}
        >
          Privacy
        </button>
      </footer>
    </div>
  );
}
