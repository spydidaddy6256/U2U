import React, { useState } from 'react';
import { ArrowRight, KeyRound, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { playTickSound } from '../utils/audio';

export default function JoinSessionView({
  onJoinSubmit,
  onCreateClick,
  onBackClick
}) {
  const [sessionId, setSessionId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  // Handle intelligent formatting and auto-uppercasing of Session ID
  const handleSessionIdChange = (e) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Auto-hyphenate into 4-4-2 format
    let formatted = '';
    if (val.length > 0) {
      formatted += val.substring(0, 4);
    }
    if (val.length > 4) {
      formatted += '-' + val.substring(4, 8);
    }
    if (val.length > 8) {
      formatted += '-' + val.substring(8, 10);
    }

    setSessionId(formatted);
    if (error) setError('');
  };

  const handlePasscodeChange = (e) => {
    setPasscode(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sessionId.trim() || !passcode.trim()) {
      setError('Session ID and Passcode are required.');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      await onJoinSubmit(sessionId.trim(), passcode.trim());
    } catch (err) {
      setIsConnecting(false);
      setError(err.message || 'Session not found or credentials are incorrect.');
    }
  };

  if (isConnecting) {
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
              Checking session…
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
          <button 
            type="button"
            className="btn-ghost" 
            onClick={onBackClick}
            style={{ float: 'left', padding: '4px', marginTop: '-4px', color: 'var(--text-tertiary)' }}
            title="Back to home"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ clear: 'both' }}>Join a session</h2>
          <p>Enter the Session ID and Passcode you received.</p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.84rem',
            color: '#f17062',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="join-session-id">Session ID</label>
            <input
              id="join-session-id"
              className="form-input mono"
              type="text"
              placeholder="e.g. 7K4M-X92P-Q8"
              maxLength={12}
              value={sessionId}
              onChange={handleSessionIdChange}
              autoFocus
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="join-passcode">Passcode</label>
            <input
              id="join-passcode"
              className="form-input"
              type="password"
              placeholder="Enter session passcode"
              value={passcode}
              onChange={handlePasscodeChange}
              autoComplete="off"
            />
          </div>

          <button 
            type="submit"
            className="btn btn-primary" 
            disabled={!sessionId || !passcode}
            style={{ width: '100%', height: '48px', marginTop: '10px', fontSize: '0.96rem' }}
          >
            <span>Join Session</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            type="button"
            className="btn btn-ghost"
            onClick={onCreateClick}
            style={{ fontSize: '0.86rem', color: 'var(--text-tertiary)' }}
          >
            Don't have a session? <span style={{ color: 'var(--accent)', marginLeft: 4 }}>Create one →</span>
          </button>
        </div>
      </div>
    </div>
  );
}
