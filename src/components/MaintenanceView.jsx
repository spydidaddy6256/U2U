import React, { useState } from 'react';
import { RefreshCw, Wrench, ShieldCheck, Clock } from 'lucide-react';
import { playTickSound } from '../utils/audio';

export default function MaintenanceView({
  message,
  estimatedReturn,
  onRetry
}) {
  const [retrying, setRetrying] = useState(false);

  const handleRetryClick = async () => {
    playTickSound();
    setRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setTimeout(() => setRetrying(false), 800);
    }
  };

  return (
    <div className="maintenance-wrapper">
      <div className="maintenance-card glass-panel">
        {/* Brand Dot Animation */}
        <div className="brand-dots-icon maintenance-pulse" style={{ transform: 'scale(1.4)' }}>
          <div className="brand-dot" />
          <div className="brand-line" style={{ width: '28px' }} />
          <div className="brand-dot" />
        </div>

        <div className="maintenance-badge">
          <Wrench size={16} />
          <span>Scheduled Infrastructure Maintenance</span>
        </div>

        <h1 className="maintenance-title">U2U Maintenance in Progress</h1>

        <p className="maintenance-message">
          {message || 'U2U is currently undergoing scheduled infrastructure maintenance to ensure the highest standards of security and reliability.'}
        </p>

        {estimatedReturn && (
          <div className="maintenance-time-box">
            <Clock size={16} className="maintenance-time-icon" />
            <span>Estimated Return: <strong>{estimatedReturn}</strong></span>
          </div>
        )}

        <div className="maintenance-info-box">
          <ShieldCheck size={18} className="maintenance-info-icon" />
          <div className="maintenance-info-text">
            <strong>Your Privacy is Preserved:</strong>
            <span>Active sessions and encrypted credentials are kept safe in memory and will be available once maintenance completes.</span>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleRetryClick}
          disabled={retrying}
          style={{ height: '48px', marginTop: '16px' }}
        >
          <RefreshCw size={18} className={retrying ? 'animate-spin' : ''} />
          <span>{retrying ? 'Checking System Status…' : 'Check Status & Reconnect'}</span>
        </button>
      </div>
    </div>
  );
}
