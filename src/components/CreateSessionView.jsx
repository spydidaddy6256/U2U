import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Link2, 
  ArrowRight, 
  Clock
} from 'lucide-react';
import { playTickSound } from '../utils/audio';

export default function CreateSessionView({
  sessionId,
  passcode,
  expiresAt,
  joinToken,
  onEnterChat,
  onToast
}) {
  const [isCreating, setIsCreating] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const [copiedJoinLink, setCopiedJoinLink] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('23:59:59');

  // Simulated elegant "Creating your private space…" transition (< 800ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsCreating(false);
    }, 750);
    return () => clearTimeout(timer);
  }, []);

  // Expiration countdown
  useEffect(() => {
    if (!expiresAt) return;

    function update() {
      const ms = expiresAt - Date.now();
      if (ms <= 0) {
        setTimeRemaining('00:00:00');
        return;
      }
      const totalSec = Math.floor(ms / 1000);
      const hours = Math.floor(totalSec / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;
      const pad = (n) => String(n).padStart(2, '0');
      setTimeRemaining(`${pad(hours)}:${pad(mins)}:${pad(secs)}`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const copyTextToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    // Fallback using temporary textarea
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    } catch {
      return false;
    }
  };

  const handleCopyId = async () => {
    const success = await copyTextToClipboard(sessionId);
    playTickSound();
    setCopiedId(true);
    onToast(success ? 'Session ID copied' : 'Copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyPasscode = async () => {
    const success = await copyTextToClipboard(passcode);
    playTickSound();
    setCopiedPasscode(true);
    onToast(success ? 'Passcode copied' : 'Copied');
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  const handleCopyJoinLink = async () => {
    const joinUrl = `${window.location.origin}/join/${joinToken}#${encodeURIComponent(passcode)}`;
    const success = await copyTextToClipboard(joinUrl);
    playTickSound();
    setCopiedJoinLink(true);
    onToast(success ? 'Join link copied to clipboard' : 'Copied');
    setTimeout(() => setCopiedJoinLink(false), 2000);
  };

  if (isCreating) {
    return (
      <div className="flow-wrapper">
        <div className="flow-card flow-card-compact" style={{ textAlign: 'center' }}>
          <div className="connecting-overlay">
            <div className="connecting-points">
              <div className="connecting-point p1" />
              <div className="brand-line" style={{ width: '36px' }} />
              <div className="connecting-point p2" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', fontWeight: 500 }}>
              Creating your session…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-wrapper">
      <div className="flow-card">
        <div className="flow-header">
          <h2>Your session is ready.</h2>
          <p>Share the Session ID and Passcode with the person you want to connect with.</p>
        </div>

        {/* Session ID Box */}
        <div className="credential-block">
          <div className="credential-label">
            <span>Session ID</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Unique</span>
          </div>
          <div className="credential-box">
            <span className="credential-value">{sessionId}</span>
            <button 
              type="button"
              className={`copy-badge-btn ${copiedId ? 'copied' : ''}`}
              onClick={handleCopyId}
              title="Copy Session ID"
            >
              {copiedId ? (
                <>
                  <Check size={14} style={{ marginRight: 4 }} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} style={{ marginRight: 4 }} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Passcode Box */}
        <div className="credential-block">
          <div className="credential-label">
            <span>Passcode</span>
            <button 
              type="button"
              className="btn-ghost" 
              onClick={() => setShowPasscode(!showPasscode)}
              style={{ fontSize: '0.74rem', padding: '2px 6px', color: 'var(--text-tertiary)' }}
            >
              {showPasscode ? <EyeOff size={13} style={{ marginRight: 4 }} /> : <Eye size={13} style={{ marginRight: 4 }} />}
              <span>{showPasscode ? 'Hide' : 'Reveal'}</span>
            </button>
          </div>
          <div className="credential-box">
            <span className={`credential-value ${!showPasscode ? 'masked' : ''}`}>
              {showPasscode ? passcode : '••••••••••••'}
            </span>
            <button 
              type="button"
              className={`copy-badge-btn ${copiedPasscode ? 'copied' : ''}`}
              onClick={handleCopyPasscode}
              title="Copy Passcode"
            >
              {copiedPasscode ? (
                <>
                  <Check size={14} style={{ marginRight: 4 }} />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} style={{ marginRight: 4 }} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Join Link */}
        <div className="credential-block">
          <div className="credential-label">
            <span>Join Link</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Direct link</span>
          </div>
          <button 
            type="button"
            className={`btn btn-secondary ${copiedJoinLink ? 'copied' : ''}`}
            onClick={handleCopyJoinLink}
            style={{ 
              width: '100%', 
              height: '42px', 
              fontSize: '0.88rem',
              justifyContent: 'center',
              gap: '8px',
              borderColor: copiedJoinLink ? 'rgba(46, 204, 113, 0.45)' : undefined,
              color: copiedJoinLink ? 'var(--status-connected)' : undefined
            }}
          >
            {copiedJoinLink ? (
              <>
                <Check size={16} />
                <span>Join Link Copied</span>
              </>
            ) : (
              <>
                <Link2 size={16} />
                <span>Copy Join Link</span>
              </>
            )}
          </button>
        </div>

        {/* Expiration counter */}
        <div className="expiration-pill">
          <Clock size={15} style={{ color: 'var(--text-tertiary)' }} />
          <span>Expires in <strong>{timeRemaining}</strong></span>
        </div>

        {/* Enter Chat button */}
        <button 
          type="button"
          className="btn btn-primary" 
          onClick={() => { playTickSound(); onEnterChat(); }}
          style={{ width: '100%', height: '48px', fontSize: '0.96rem' }}
        >
          <span>Enter Chat</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
