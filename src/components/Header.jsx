import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Shield,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Trash2,
  Flame,
  LogOut,
  ShieldAlert,
  User,
  ArrowLeft,
  ChevronLeft,
  Menu,
  X,
  FileText,
  Lock
} from 'lucide-react';
import { isAudioEnabled, setAudioEnabled, playTickSound } from '../utils/audio';
import { isAndroidPlatform } from '../utils/platform';
import { getAvatarSvg } from '../data/avatars';

export default function Header({
  view,
  setView,
  isNative = false,
  sessionId: _sessionId,
  expiresAt,
  connectionStatus: _connectionStatus,
  peerPresent,
  isMenuOpen,
  onMenuOpenChange,
  onOpenSecurity,
  onOpenTerms,
  onOpenPrivacy,
  onOpenClearChat,
  onOpenBurnSession,
  onOpenLeave,
  onLeaveSession,
  theme,
  setTheme,
  chatHeaderVisible = true,
  onHeaderInteraction,
  onHeaderMenuChange,
  selfIdentity: _selfIdentity,
  peerIdentity,
  identityHeaderVisible: _identityHeaderVisible = true,
  activeProfile,
  onOpenDeleteProfile
}) {
  const [soundOn, setSoundOn] = useState(isAudioEnabled());
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const menuOpen = isMenuOpen !== undefined ? isMenuOpen : internalMenuOpen;
  const setMenuOpen = useCallback((next) => {
    setInternalMenuOpen((current) => {
      const active = isMenuOpen !== undefined ? isMenuOpen : current;
      const val = typeof next === 'function' ? next(active) : next;
      onMenuOpenChange?.(val);
      onHeaderMenuChange?.(val);
      return val;
    });
  }, [isMenuOpen, onMenuOpenChange, onHeaderMenuChange]);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  const menuRef = useRef(null);
  const hamburgerBtnRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerCloseBtnRef = useRef(null);
  const prevMenuOpenRef = useRef(menuOpen);
  const touchStartXRef = useRef(0);

  // Focus management when drawer opens / closes on native
  useEffect(() => {
    if (!isNative) return;
    if (menuOpen && !prevMenuOpenRef.current) {
      const timer = setTimeout(() => {
        drawerCloseBtnRef.current?.focus();
      }, 50);
      prevMenuOpenRef.current = true;
      return () => clearTimeout(timer);
    } else if (!menuOpen && prevMenuOpenRef.current) {
      hamburgerBtnRef.current?.focus();
      prevMenuOpenRef.current = false;
    }
  }, [menuOpen, isNative]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    if (diff < -50) {
      setMenuOpen(false);
      playTickSound();
    }
  };

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
  }, [setMenuOpen]);

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
    if (!identity) return <div className="identity-avatar-placeholder"><User size={14} /></div>;
    const avatar = identity.avatar || 'neon-neko';
    if (avatar.startsWith('data:')) {
      return <img src={avatar} alt={identity.displayName || fallbackName} className="identity-avatar-img" />;
    }
    return (
      <div
        className="identity-avatar-svg"
        dangerouslySetInnerHTML={{ __html: getAvatarSvg(avatar) }}
      />
    );
  };

  const renderDropdownMenu = () => (
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

      {/* Permanent Profile Deletion (if active profile exists) */}
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
  );

  const renderNativeDrawer = () => (
    <>
      <div
        className="native-drawer-scrim"
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className="native-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="native-drawer-header">
          <div className="native-drawer-brand">
            <div className="native-brand-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <span className="native-brand-text">U2U</span>
          </div>
          <button
            ref={drawerCloseBtnRef}
            type="button"
            className="native-drawer-close-btn"
            onClick={() => { setMenuOpen(false); playTickSound(); }}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="native-drawer-nav">
          <button
            type="button"
            className="native-drawer-item"
            onClick={() => {
              setMenuOpen(false);
              onOpenSecurity?.();
            }}
          >
            <div className="native-drawer-item-icon">
              <ShieldCheck size={20} />
            </div>
            <div className="native-drawer-item-text">
              <span className="native-drawer-item-title">Session & Security</span>
              <span className="native-drawer-item-sub">Zero-knowledge details</span>
            </div>
          </button>

          <div
            className="native-drawer-item native-drawer-switch-row"
            onClick={toggleSound}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleSound();
              }
            }}
          >
            <div className="native-drawer-item-icon">
              {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </div>
            <div className="native-drawer-item-text">
              <span className="native-drawer-item-title">Sound effects</span>
              <span className="native-drawer-item-sub">{soundOn ? 'Enabled' : 'Muted'}</span>
            </div>
            <div 
              className={`native-toggle-switch ${soundOn ? 'active' : ''}`}
              role="switch"
              aria-checked={soundOn}
              aria-label="Toggle sound effects"
            >
              <span className="native-toggle-switch-thumb" />
            </div>
          </div>

          <button
            type="button"
            className="native-drawer-item"
            onClick={toggleTheme}
          >
            <div className="native-drawer-item-icon">
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </div>
            <div className="native-drawer-item-text">
              <span className="native-drawer-item-title">Appearance</span>
              <span className="native-drawer-item-sub">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            </div>
          </button>

          <div className="native-drawer-divider" />

          <button
            type="button"
            className="native-drawer-item"
            onClick={() => {
              setMenuOpen(false);
              if (onOpenTerms) {
                onOpenTerms();
              } else {
                setView?.('terms');
              }
            }}
          >
            <div className="native-drawer-item-icon">
              <FileText size={20} />
            </div>
            <div className="native-drawer-item-text">
              <span className="native-drawer-item-title">Terms of Service</span>
            </div>
          </button>

          <button
            type="button"
            className="native-drawer-item"
            onClick={() => {
              setMenuOpen(false);
              if (onOpenPrivacy) {
                onOpenPrivacy();
              } else {
                setView?.('privacy');
              }
            }}
          >
            <div className="native-drawer-item-icon">
              <Lock size={20} />
            </div>
            <div className="native-drawer-item-text">
              <span className="native-drawer-item-title">Privacy Policy</span>
            </div>
          </button>

          {activeProfile && (
            <>
              <div className="native-drawer-divider" />
              <button
                type="button"
                className="native-drawer-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenDeleteProfile?.();
                }}
              >
                <div className="native-drawer-item-icon">
                  <ShieldAlert size={20} />
                </div>
                <div className="native-drawer-item-text">
                  <span className="native-drawer-item-title">Delete Permanent Profile</span>
                  <span className="native-drawer-item-sub">Wipe keys from device</span>
                </div>
              </button>
            </>
          )}
        </nav>

        <div className="native-drawer-footer">
          <span>U2U · RAM-Only Ephemeral Channel</span>
        </div>
      </aside>
    </>
  );

  return (
    <header className={headerClass} onPointerDown={() => onHeaderInteraction?.()} onClick={() => onHeaderInteraction?.()}>
      {isNative ? (
        /* Native Android Header (Scoped for Native App) */
        <div className="native-header-inner" ref={menuRef}>
          {view === 'chat' ? (
            /* Chat Mode (Matching Chat PNG) */
            <>
              <div className="native-chat-header-left">
                <button
                  type="button"
                  className="native-icon-btn native-back-btn"
                  onClick={() => {
                    playTickSound();
                    if (onOpenLeave) {
                      onOpenLeave();
                    } else if (onLeaveSession) {
                      onLeaveSession();
                    }
                  }}
                  title="Leave or return"
                  aria-label="Back"
                >
                  <ChevronLeft size={22} />
                </button>

                <div
                  className="native-peer-info-wrap"
                  onClick={onOpenSecurity}
                  title="Click to view end-to-end encryption details"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', minWidth: 0 }}
                >
                  <div className="native-peer-avatar-circle">
                    {peerPresent && peerIdentity?.avatar ? (
                      renderAvatarThumb(peerIdentity, 'Peer')
                    ) : (
                      <span>{(peerPresent && peerIdentity?.displayName ? peerIdentity.displayName : 'SF').slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="native-peer-meta">
                    <span className="native-peer-name">
                      {peerPresent && peerIdentity?.displayName ? peerIdentity.displayName : (peerPresent ? 'Peer' : 'Waiting for peer…')}
                    </span>
                    <span className="native-peer-status-line">
                      <span className={`native-status-dot ${peerPresent ? '' : 'waiting'}`} />
                      <span>{peerPresent ? 'Connected' : 'Waiting'}</span>
                      {timeRemaining ? <span> · {timeRemaining}</span> : null}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Header Burn Button */}
              <button
                type="button"
                className="native-header-burn-btn"
                onClick={() => {
                  playTickSound();
                  if (onOpenBurnSession) {
                    onOpenBurnSession();
                  } else {
                    setMenuOpen(!menuOpen);
                  }
                }}
                title="Burn session"
                aria-label="Burn session"
              >
                Burn
              </button>
            </>
          ) : (
            /* Non-Chat / Home Mode (Matching Home PNG) */
            <>
              {/* Home Screen: Left Hamburger opens Drawer. Sub-screens: Left button is Back */}
              {view === 'app-launcher' ? (
                <button
                  ref={hamburgerBtnRef}
                  type="button"
                  className="native-icon-btn native-menu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                    playTickSound();
                  }}
                  title="Session options & settings"
                  aria-label="Open navigation menu"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  <Menu size={20} />
                </button>
              ) : (
                <button
                  type="button"
                  className="native-icon-btn native-back-btn"
                  onClick={() => {
                    playTickSound();
                    if (view === 'identity-select') {
                      if (_sessionId) {
                        setView?.('create');
                      } else {
                        setView?.('app-launcher');
                      }
                    } else {
                      setView?.('app-launcher');
                    }
                  }}
                  title="Back"
                  aria-label="Back"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {/* Center U2U Wordmark (••• U2U) */}
              <div 
                className="native-header-brand" 
                onClick={() => {
                  if (view !== 'app-launcher') setView?.('app-launcher');
                }}
                title="U2U — User to User"
              >
                <div className="native-brand-dots">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <span className="native-brand-text">U2U</span>
              </div>

              {/* Round 44px Shield Button */}
              <button
                type="button"
                className="native-icon-btn native-shield-btn"
                onClick={() => {
                  playTickSound();
                  onOpenSecurity?.();
                }}
                title="Security & encryption details"
                aria-label="Security and encryption"
              >
                <Shield size={20} />
              </button>
            </>
          )}

          {/* Left Drawer Menu on native (Home screen only) */}
          {view === 'app-launcher' && menuOpen && renderNativeDrawer()}
        </div>
      ) : (
        /* Web / Desktop Header — 100% Unchanged */
        <div className="u2u-header-top">
          {/* Chat Mode: Compact Peer Conversation Header */}
          {view === 'chat' ? (
            <div className="header-chat-left">
              <button
                type="button"
                className="icon-btn header-back-btn"
                onClick={() => {
                  if (onOpenLeave) {
                    onOpenLeave();
                  } else if (onLeaveSession) {
                    onLeaveSession();
                  }
                }}
                title="Leave or return"
                aria-label="Back"
              >
                <ArrowLeft size={18} />
              </button>
              <div
                className="header-peer-info"
                onClick={onOpenSecurity}
                title="Click to view end-to-end encryption details"
              >
                <div className="header-peer-avatar-wrap">
                  {renderAvatarThumb(peerPresent && peerIdentity ? peerIdentity : null, 'Peer')}
                  <span className={`header-peer-dot ${peerPresent ? 'connected' : 'waiting'}`} />
                </div>
                <div className="header-peer-text-stack">
                  <span className="header-peer-name">
                    {peerPresent && peerIdentity?.displayName ? peerIdentity.displayName : (peerPresent ? 'Peer' : 'Waiting for peer…')}
                  </span>
                  <span className="header-peer-status">
                    <span className={`header-status-dot ${peerPresent ? 'connected' : 'waiting'}`} />
                    <span>{peerPresent ? 'Connected' : 'Waiting'}</span>
                    {timeRemaining ? <span className={`header-timer-span ${isWarning ? 'warning' : ''}`}> · {timeRemaining}</span> : null}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Non-Chat Mode: U2U Brand Wordmark */
            <div 
              className="u2u-brand" 
              onClick={() => {
                if (view === 'landing' || view === 'app-launcher') return;
                if (onLeaveSession) {
                  onLeaveSession();
                } else {
                  setView?.(isNative ? 'app-launcher' : 'landing');
                }
              }}
              style={{ cursor: (view === 'landing' || view === 'app-launcher') ? 'default' : 'pointer' }}
              title="U2U — User to User"
            >
              <div className="brand-dots-icon">
                <div className="brand-dot" />
                <div className="brand-line" />
                <div className="brand-dot" />
              </div>
              <span className="u2u-logo-text">U2U</span>
            </div>
          )}

          {/* Center privacy indicator (non-chat views) */}
          {view !== 'chat' && (
            <div 
              className="u2u-badge-private" 
              onClick={onOpenSecurity} 
              title="Click to view end-to-end encryption details"
            >
              <div className="status-indicator connected" />
              <span className="u2u-badge-status-text">
                <span className="u2u-badge-status-label">Private · </span>
                RAM Space
              </span>
            </div>
          )}

          {/* Right Corner Controls: Sound Toggle & 3-line Menu */}
          <div className="u2u-header-actions" ref={menuRef}>
            {/* Quick Sound Toggle */}
            <button 
              type="button"
              className="icon-btn header-quick-btn" 
              onClick={toggleSound} 
              title={soundOn ? 'Mute audio' : 'Enable audio'}
              aria-label="Toggle sound"
            >
              {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Accessible Three-Line Menu Button */}
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

            {/* Dropdown Menu */}
            {menuOpen && renderDropdownMenu()}
          </div>
        </div>
      )}
    </header>
  );
}
