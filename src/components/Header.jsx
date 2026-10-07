import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  MoreVertical, 
  Trash2, 
  Flame, 
  Info, 
  LogOut,
  Clock
} from 'lucide-react';
import { isAudioEnabled, setAudioEnabled, playTickSound } from '../utils/audio';

export default function Header({
  view,
  setView,
  sessionId,
  expiresAt,
  connectionStatus,
  peerPresent,
  onOpenSecurity,
  onOpenClearChat,
  onOpenBurnSession,
  onOpenLeave,
  onLeaveSession,
  screenPrivacyEnabled,
  setScreenPrivacyEnabled,
  theme,
  setTheme
}) {
  const [soundOn, setSoundOn] = useState(isAudioEnabled());
  const [menuOpen, setMenuOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isWarning, setIsWarning] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        // Under 10 minutes: subtle warning format
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

  return (
    <header className="u2u-header">
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
          <span>
            {connectionStatus === 'connecting' 
              ? 'Connecting…' 
              : peerPresent 
                ? 'Private · Connected' 
                : 'Private · Waiting'}
          </span>
          {timeRemaining && (
            <span className={`u2u-session-timer ${isWarning ? 'warning' : ''}`} style={{ marginLeft: 6 }}>
              · {timeRemaining}
            </span>
          )}
        </div>
      )}

      {/* Right controls */}
      <div className="u2u-header-actions">
        {/* Sound toggle */}
        <button 
          className="icon-btn" 
          onClick={toggleSound} 
          title={soundOn ? 'Mute subtle audio cues' : 'Enable audio feedback'}
          aria-label="Toggle sound"
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Screen privacy toggle (chat view) */}
        {view === 'chat' && (
          <button 
            className="icon-btn" 
            onClick={() => setScreenPrivacyEnabled(!screenPrivacyEnabled)} 
            title={screenPrivacyEnabled ? 'Screen Privacy shield active' : 'Enable Screen Privacy shield'}
            aria-label="Toggle screen privacy"
          >
            {screenPrivacyEnabled ? <EyeOff size={18} style={{ color: 'var(--accent)' }} /> : <Eye size={18} />}
          </button>
        )}

        {/* Theme toggle */}
        <button 
          className="icon-btn" 
          onClick={toggleTheme} 
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Chat menu */}
        {view === 'chat' && (
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button 
              className="icon-btn" 
              onClick={() => setMenuOpen(!menuOpen)} 
              title="Session options"
              aria-label="Session options"
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div className="dropdown-menu">
                <button 
                  className="dropdown-item" 
                  onClick={() => { setMenuOpen(false); onOpenSecurity(); }}
                >
                  <ShieldCheck size={16} />
                  <span>Session Details</span>
                </button>

                <div className="dropdown-divider" />

                <button 
                  className="dropdown-item" 
                  onClick={() => { setMenuOpen(false); onOpenClearChat(); }}
                >
                  <Trash2 size={16} />
                  <span>Clear Chat</span>
                </button>

                <button 
                  className="dropdown-item danger" 
                  onClick={() => { setMenuOpen(false); onOpenBurnSession(); }}
                >
                  <Flame size={16} />
                  <span>Burn Session</span>
                </button>

                <div className="dropdown-divider" />

                <button 
                  className="dropdown-item" 
                  onClick={() => { setMenuOpen(false); onOpenLeave ? onOpenLeave() : onLeaveSession(); }}
                >
                  <LogOut size={16} />
                  <span>Leave Session</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
