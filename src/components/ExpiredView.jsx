import React from 'react';
import { Clock, Plus } from 'lucide-react';
import { playTickSound } from '../utils/audio';

export default function ExpiredView({ onCreateNew, onGoHome }) {
  return (
    <div className="flow-wrapper">
      <div className="flow-card flow-card-compact" style={{ textAlign: 'center' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: 'var(--accent)'
        }}>
          <Clock size={26} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
          This session has expired.
        </h2>

        <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 28 }}>
          The 24-hour window is over. Create a new private session to start another conversation.
        </p>

        <button 
          type="button"
          className="btn btn-primary" 
          onClick={() => { playTickSound(); onCreateNew(); }}
          style={{ width: '100%', height: '46px' }}
        >
          <Plus size={18} />
          <span>Create New Session</span>
        </button>

        {onGoHome && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => { playTickSound(); onGoHome(); }}
            style={{ width: '100%', height: '42px', marginTop: '10px' }}
          >
            <span>Return to Home</span>
          </button>
        )}
      </div>
    </div>
  );
}
