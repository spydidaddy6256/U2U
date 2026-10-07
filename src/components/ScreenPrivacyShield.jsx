import React from 'react';
import { EyeOff } from 'lucide-react';

export default function ScreenPrivacyShield({ onDismiss }) {
  return (
    <div className="screen-privacy-shield" onClick={onDismiss} tabIndex={0}>
      <div style={{
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        color: 'var(--accent)'
      }}>
        <EyeOff size={26} />
      </div>

      <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.08em', marginBottom: 6, color: 'var(--text-primary)' }}>
        U2U
      </div>

      <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
        Content hidden
      </div>

      <div style={{ fontSize: '0.86rem', color: 'var(--text-tertiary)', maxWidth: 260 }}>
        Return to this window or click anywhere to continue.
      </div>
    </div>
  );
}
