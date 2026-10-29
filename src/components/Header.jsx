import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Trash2,
  Flame,
  LogOut,
  ShieldAlert,
  User,
  UserCheck
} from 'lucide-react';
import { isAudioEnabled, setAudioEnabled, playTickSound } from '../utils/audio';
import { isAndroidPlatform } from '../utils/platform';
import { getAvatarSvg } from '../data/avatars';

export default function Header({
  view,
  setView,
  sessionId: _sessionId,
  expiresAt,
  connectionStatus,
  peerPresent,
  onOpenSecurity,
  onOpenClearChat,
  onOpenBurnSession,
  onOpenLeave,
  onLeaveSession,
  theme,
  setTheme,
  chatHeaderVisible = true,
  onHeaderInteraction,
  onHeaderMenuChange,
  selfIdentity,
  peerIdentity,
  identityHeaderVisible = true,
  activeProfile,
  onOpenDeleteProfile,
  onOpenEditIdentity
}) {
  const [soundOn, setSoundOn] = useState(isAudioEnabled());
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  const menuRef = useRef(null);

  // Notify parent of menu open/close to pause auto-hide timer
  useEffect(() => {
    onHeaderMenuChange?.(menuOpen);
  }, [menuOpen, onHeaderMenuChange]);

  // Close dropdown on outside click or tap
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Expiration countdown
  useEffect(() => {
    if (!expiresAt) return;

    function updateTimer() {
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const totalSec = Math.floor(ms / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');

      if (totalSec < 600) {
        setIsWarning(true);
        setTimeRemaining(`${pad(mins)}:${pad(secs)} left`);
      } else if (hours < 1) {
        setIsWarning(false);
        setTimeRemaining(`00:${pad(mins)}:${pad(secs)}`);
      } else {
        setIsWarning(false);
        setTimeRemaining(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setAudioEnabled(next);
    if (next) playTickSound();
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isAndroidChat = view === 'chat' && isAndroidPlatform();
  const headerClass = [
    'u2u-header',
    isAndroidChat ? 'u2u-header-chat-android' : '',
    isAndroidChat && !chatHeaderVisible ? 'u2u-header-chat-hidden' : ''
  ].filter(Boolean).join(' ');

  const renderAvatarThumb = (identity, fallbackName = 'You') => {
    if (!identity) {
      return (
        <div className="identity-avatar-thumb">
          <div className="identity-avatar-placeholder"><User size={14} /></div>
        </div>
      );
    }
    const avatar = identity.avatar || 'neon-neko';
    if (typeof avatar === 'string' && avatar.startsWith('data:')) {
      return (
        <div className="identity-avatar-thumb">
          <img
            src={avatar}
            alt={identity.displayName || fallbackName}
            className="identity-avatar-img"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.identity-avatar-svg.fallback');
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div
            className="identity-avatar-svg fallback"
            style={{ display: 'none' }}
            dangerouslySetInnerHTML={{ __html: getAvatarSvg('neon-neko') }}
          />
        </div>
      );
    }
    return (
      <div className="identity-avatar-thumb">
        <div
          className="identity-avatar-svg"
          dangerouslySetInnerHTML={{ __html: getAvatarSvg(avatar) }}
        />
      </div>
    );
  };

  return (
    <header className={headerClass} onPointerDown={() => onHeaderInteraction?.()} onClick={() => onHeaderInteraction?.()}>
      <div className="u2u-header-top">
        {/* Brand */}
        <div 
          className="u2u-brand" 
          onClick={() => view === 'landing' ? null : onLeaveSession ? onLeaveSession() : setView('landing')} 
          style={{ cursor: view === 'landing' ? 'default' : 'pointer' }}
          title="U2U — User to User"
        >
          <div className="brand-dots-icon">
            <div className="brand-dot" />
            <div className="brand-line" />
            <div className="brand-dot" />
          </div>
          <span className="u2u-logo-text">U2U</span>
        </div>

        {/* Center status for Chat and Create views */}
        {view === 'chat' && (
          <div 
            className="u2u-badge-private" 
            onClick={onOpenSecurity} 
            title="Click to view end-to-end encryption details"
          >
            <div className={`status-indicator ${connectionStatus === 'connected' ? 'connected' : connectionStatus === 'connecting' ? 'connecting' : 'offline'}`} />
            <span className="u2u-badge-status-text">
              {connectionStatus === 'connecting' ? (
                'Connecting…'
              ) : (
                <>
                  <span className="u2u-badge-status-label">Private · </span>
                  {peerPresent ? 'Connected' : 'Waiting'}
                </>
              )}
            </span>
            {timeRemaining && (
              <span className={`u2u-session-timer ${isWarning ? 'warning' : ''}`} style={{ marginLeft: 6 }}>
                · {timeRemaining}
              </span>
            )}
          </div>
        )}

        {/* Right Corner Controls: 3-line hamburger menu */}
        <div className="u2u-header-actions" ref={menuRef}>
          {/* Direct Sound toggle for instant convenience */}
          <button 
            className="icon-btn header-quick-btn" 
            onClick={toggleSound} 
            title={soundOn ? 'Mute audio' : 'Enable audio'}
            aria-label="Toggle sound"
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>

          {/* Three-line hamburger menu button */}
          <button
            type="button"
            className={`icon-btn header-hamburger-btn ${menuOpen ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
              playTickSound();
            }}
            title="Session options & settings"
            aria-label="Session menu"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <div className="hamburger-lines">
              <span />
              <span />
              <span />
            </div>
          </button>

          {/* Slide-out / Dropdown Menu */}
          {menuOpen && (
            <div className="dropdown-menu glass-panel">
              {/* Security info */}
              <button 
                type="button"
                className="dropdown-item" 
                onClick={() => { setMenuOpen(false); onOpenSecurity(); }}
              >
                <ShieldCheck size={16} />
                <span>Session & Security Details</span>
              </button>

              <button 
                type="button"
                className="dropdown-item" 
                onClick={() => { setMenuOpen(false); toggleSound(); }}
              >
                {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>Sound Effects: {soundOn ? 'Enabled' : 'Muted'}</span>
              </button>

              <button 
                type="button"
                className="dropdown-item" 
                onClick={() => { setMenuOpen(false); toggleTheme(); }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span>Appearance: {theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
              </button>

              {/* Permanent Profile Deletion (if permanent profile active) */}
              {activeProfile && (
                <>
                  <div className="dropdown-divider" />
                  <button
                    type="button"
                    className="dropdown-item danger"
                    onClick={() => { setMenuOpen(false); onOpenDeleteProfile?.(); }}
                  >
                    <ShieldAlert size={16} />
                    <span>Delete Permanent Profile</span>
                  </button>
                </>
              )}

              {view === 'chat' && (
                <>
                  <div className="dropdown-divider" />

                  {onOpenEditIdentity && (
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => { setMenuOpen(false); onOpenEditIdentity(); }}
                    >
                      <UserCheck size={16} />
                      <span>Change Session Identity</span>
                    </button>
                  )}

                  <button 
                    type="button"
                    className="dropdown-item" 
                    onClick={() => { setMenuOpen(false); onOpenClearChat(); }}
                  >
                    <Trash2 size={16} />
                    <span>Clear Chat</span>
                  </button>

                  <button 
                    type="button"
                    className="dropdown-item danger" 
                    onClick={() => { setMenuOpen(false); onOpenBurnSession(); }}
                  >
                    <Flame size={16} />
                    <span>Burn Session</span>
                  </button>

                  <div className="dropdown-divider" />

                  <button 
                    type="button"
                    className="dropdown-item" 
                    onClick={() => { 
                      setMenuOpen(false); 
                      if (onOpenLeave) {
                        onOpenLeave();
                      } else {
                        onLeaveSession();
                      }
                    }}
                  >
                    <LogOut size={16} />
                    <span>Leave Session</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Collapsing Identity Sub-Header ── */}
      {view === 'chat' && selfIdentity && (
        <div className={`u2u-identity-subbar ${identityHeaderVisible ? 'visible' : 'collapsed'}`}>
          <div className="identity-subbar-inner">
            {/* Self Identity */}
            <div
              className={`identity-participant self ${onOpenEditIdentity ? 'clickable' : ''}`}
              title="Your anonymous identity for this session (click to edit)"
              onClick={() => onOpenEditIdentity?.()}
            >
              {renderAvatarThumb(selfIdentity, 'You')}
              <div className="identity-participant-meta">
                <span className="identity-participant-name">{selfIdentity.displayName || 'You'}</span>
                <span className="identity-participant-role">You</span>
              </div>
            </div>

            {/* Encrypted Connector */}
            <div className="identity-subbar-connector" title="End-to-End Encrypted Peer Channel">
              <span className="connector-dot" />
              <span className="connector-line" />
              <span className="connector-dot" />
            </div>

            {/* Peer Identity */}
            <div className="identity-participant peer" title="Peer identity in this session">
              {peerPresent ? (
                <>
                  {renderAvatarThumb(peerIdentity, 'Peer')}
                  <div className="identity-participant-meta">
                    <span className="identity-participant-name">{peerIdentity?.displayName || 'Peer'}</span>
                    <span className="identity-participant-role connected">Connected</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="identity-avatar-placeholder waiting">
                    <User size={14} />
                  </div>
                  <div className="identity-participant-meta">
                    <span className="identity-participant-name muted">Waiting for peer…</span>
                    <span className="identity-participant-role waiting">Private</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
