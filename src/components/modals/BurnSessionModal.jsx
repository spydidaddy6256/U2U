import React, { useEffect } from 'react';
import { Flame, X } from 'lucide-react';
import { playBurnSound } from '../../utils/audio';

export default function BurnSessionModal({ isOpen, onClose, onConfirm }) {
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(231, 76, 60, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f17062'
          }}>
            <Flame size={18} />
          </div>
          <h3 className="modal-title" style={{ margin: 0 }}>Burn this session?</h3>
        </div>

        <p className="modal-description">
          This will immediately end the conversation for both participants. Temporary server data will be deleted and this session will become unusable.
          <br /><br />
          You'll need to create a new session to chat again.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ height: '44px' }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-danger" 
            onClick={() => {
              playBurnSound();
              onConfirm();
              onClose();
            }}
            style={{ height: '44px' }}
          >
            Burn Session
          </button>
        </div>
      </div>
    </div>
  );
}
