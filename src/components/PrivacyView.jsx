import React from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';

export default function PrivacyView({ onBack }) {
  return (
    <div className="legal-page-container">
      <div className="legal-header">
        <button className="btn btn-ghost" onClick={onBack} style={{ gap: 6, padding: '6px 12px' }}>
          <ArrowLeft size={16} />
          <span>Back to U2U</span>
        </button>
      </div>

      <div className="legal-content">
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div className="brand-dots-icon" style={{ marginBottom: 16 }}>
            <div className="brand-dot" />
            <div className="brand-line" style={{ width: 20 }} />
            <div className="brand-dot" />
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>
            U2U Privacy Policy
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 500 }}>
            How U2U protects your temporary communication.
          </p>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
            Last updated: October 2, 2026
          </div>
        </div>

        <div className="legal-section">
          <h2>1. Zero-Account Architecture</h2>
          <p>
            U2U does not collect, request, or store names, email addresses, telephone numbers, passwords, avatars, or permanent identity credentials. There are no profiles, follower graphs, or persistent directories.
          </p>
        </div>

        <div className="legal-section">
          <h2>2. End-to-End Encryption (E2EE)</h2>
          <p>
            Messages and photos are encrypted in your browser using the authenticated <strong>AES-256-GCM</strong> standard with unique 96-bit initialization vectors (IVs) and <strong>PBKDF2</strong> (100,000 rounds of SHA-256) key derivation. 
            The server relays only encrypted binary envelopes and never receives plaintext messages, unencrypted photos, or cryptographic keys.
          </p>
        </div>

        <div className="legal-section">
          <h2>3. Temporary Photos & 30-Second Expiration</h2>
          <p>
            Photos are compressed and encrypted locally before transmission. When the recipient opens an encrypted photo, an authoritative 30-second timer begins. Once 30 seconds elapse, the photo is permanently purged from memory and the temporary server object is irreversibly deleted.
          </p>
        </div>

        <div className="legal-section">
          <h2>4. Automatic 24-Hour Expiration & Session Burning</h2>
          <p>
            Every private session has a strict maximum lifetime of 24 hours. When this window expires or when either participant triggers <strong>Burn Session</strong>, all session envelopes and in-memory routing tables are wiped from the server.
          </p>
        </div>

        <div className="legal-section">
          <h2>5. Local Storage & Cookies</h2>
          <p>
            U2U does not use tracking cookies, advertising beacons, or surveillance telemetry. Browser <code>localStorage</code> is used exclusively for functional, client-side preferences (such as Light/Dark theme selection and audio mute toggles).
          </p>
        </div>

        <div className="legal-section">
          <h2>6. Infrastructure & Connection Metadata</h2>
          <p>
            To facilitate real-time WebSocket communication and protect against brute-force attacks, the server processes temporary IP addresses and rate-limit counters strictly in volatile memory. No permanent conversation logs are written to disk.
          </p>
        </div>

        <div className="legal-section">
          <h2>7. Contact & Security Reports</h2>
          <p>
            For privacy inquiries or responsible vulnerability disclosures, please contact: <strong>[Insert official support/legal contact]</strong>.
          </p>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={onBack} style={{ height: 44, padding: '0 28px' }}>
            Return to U2U
          </button>
        </div>
      </div>
    </div>
  );
}
