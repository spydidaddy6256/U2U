import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { playTickSound, playErrorSound } from '../utils/audio';

export default function JoinLinkView({
  token,
  clientId,
  onJoinSuccess,
  onCreateClick,
  onGoHome,
  onToast
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [passcode, setPasscode] = useState(() => {
    try {
      const hash = window.location.hash;
      return hash ? decodeURIComponent(hash.replace(/^#/, '')).trim() : '';
    } catch {
      return '';
    }
  });

  // Check token status on mount
  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        const res = await fetch(`/api/session/join/${token}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.valid) {
          setError(data.message || 'This invite link is no longer valid.');
          playErrorSound();
        }
      } catch {
        if (isMounted) {
          setError('Unable to verify session. Please check your network connection.');
          playErrorSound();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleJoin = async () => {
    if (isJoining) return;

    const cleanPasscode = passcode.trim();
    if (!cleanPasscode) {
      setError('Please enter the session passcode to complete zero-knowledge key derivation.');
      playErrorSound();
      return;
    }

    setIsJoining(true);
    playTickSound();

    try {
      const res = await fetch(`/api/session/join/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "We couldn't verify this session.");
        playErrorSound();
        setIsJoining(false);
        return;
      }

      await onJoinSuccess(data.sessionId, cleanPasscode, data.ticket, data.expiresAt);
    } catch {
      setError('Unable to join session. Please try again.');
      playErrorSound();
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flow-wrapper">
        <div className="flow-card flow-card-compact" style={{ textAlign: 'center' }}>
          <div className="connecting-overlay">
            <div className="connecting-points">
              <div className="connecting-point p1" />
              <div className="brand-line" style={{ width: '32px' }} />
              <div className="connecting-point p2" />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', fontWeight: 500 }}>
              Verifying invitation…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !error.includes('passcode')) {
    return (
      <div className="flow-wrapper">
        <div className="flow-card">
          <div className="flow-header">
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(231, 76, 60, 0.12)',
                border: '1px solid rgba(231, 76, 60, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#f17062'
              }}
            >
              <AlertCircle size={24} />
            </div>
            <h2>Unable to Join</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5' }}>
              {error}
            </p>
          </div>

          <button 
            type="button"
            className="btn btn-primary"
            onClick={onCreateClick}
            style={{ width: '100%', height: '46px', fontSize: '0.92rem', marginBottom: '10px' }}
          >
            <span>Create a New Session</span>
            <ArrowRight size={16} />
          </button>

          <button 
            type="button"
            className="btn btn-secondary"
            onClick={onGoHome}
            style={{ width: '100%', height: '42px', fontSize: '0.88rem' }}
          >
            <span>Go to Home</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flow-wrapper">
      <div className="flow-card">
        <div className="flow-header">
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(235, 94, 60, 0.12)',
              border: '1px solid rgba(235, 94, 60, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--accent)',
              boxShadow: '0 0 24px rgba(224, 94, 70, 0.18)'
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <h2>You're invited to a private U2U session.</h2>
          <p>End-to-end encrypted • Temporary • Zero-knowledge</p>
        </div>

        <div className="credential-block" style={{ marginBottom: '18px' }}>
          <div className="credential-label">
            <span>Session Status</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--status-connected)' }}>● Participant waiting</span>
          </div>
          <div className="credential-box" style={{ justifyContent: 'center', padding: '13px 16px' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Zero-knowledge invitation verified
            </span>
          </div>
        </div>

        {/* If passcode was not in URL fragment, prompt user for passcode */}
        {!passcode && (
          <div className="credential-block" style={{ marginBottom: '18px' }}>
            <div className="credential-label">
              <span>Passcode</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Required for E2EE</span>
            </div>
            <div className="credential-box" style={{ padding: '4px 8px' }}>
              <KeyRound size={16} style={{ color: 'var(--text-tertiary)', marginLeft: 6, marginRight: 6 }} />
              <input
                type="text"
                className="credential-input"
                placeholder="word-word-word-word"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError('');
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.94rem',
                  outline: 'none',
                  padding: '8px 4px'
                }}
              />
            </div>
            {error && (
              <p style={{ color: '#f17062', fontSize: '0.78rem', marginTop: 6 }}>{error}</p>
            )}
          </div>
        )}

        <button 
          type="button"
          className="btn btn-primary"
          disabled={isJoining || (!passcode && !passcode.trim())}
          onClick={handleJoin}
          style={{ width: '100%', height: '48px', fontSize: '0.96rem' }}
        >
          {isJoining ? (
            <span>Connecting…</span>
          ) : (
            <>
              <span>Join Session</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onGoHome}
            style={{ fontSize: '0.84rem', color: 'var(--text-tertiary)' }}
          >
            Or enter credentials manually →
          </button>
        </div>
      </div>
    </div>
  );
}
