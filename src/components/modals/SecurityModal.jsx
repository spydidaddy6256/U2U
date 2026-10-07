import React, { useEffect } from 'react';
import { ShieldCheck, Check, X } from 'lucide-react';

export default function SecurityModal({ isOpen, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <button className="icon-btn modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <h3 className="modal-title">Your private session</h3>
        <p className="modal-description">
          Cryptographically isolated channel for exactly two participants.
        </p>

        <div className="security-checklist">
          <div className="security-check-item">
            <Check size={16} className="security-check-icon" />
            <span><strong>End-to-end encrypted:</strong> AES-256-GCM cipher with PBKDF2 key derivation.</span>
          </div>

          <div className="security-check-item">
            <Check size={16} className="security-check-icon" />
            <span><strong>No account:</strong> No phone numbers, emails, tracking, or permanent identity.</span>
          </div>

          <div className="security-check-item">
            <Check size={16} className="security-check-icon" />
            <span><strong>Temporary session:</strong> Automatic 24-hour expiration window.</span>
          </div>

          <div className="security-check-item">
            <Check size={16} className="security-check-icon" />
            <span><strong>Zero-knowledge server:</strong> Plaintext and cryptographic keys never leave your device.</span>
          </div>

          <div className="security-check-item">
            <Check size={16} className="security-check-icon" />
            <span><strong>Encrypted media:</strong> Photos compressed and encrypted locally before transmission.</span>
          </div>
        </div>

        <div className="security-honest-note">
          U2U encrypts messages before they leave your device. The service is designed not to receive message plaintext or encryption keys. However, no web application can guarantee protection against screenshots, malware, compromised devices, or someone photographing the screen.
        </div>

        <button 
          className="btn btn-primary" 
          onClick={onClose}
          style={{ width: '100%', height: '42px' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
