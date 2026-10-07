import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import { playTickSound } from '../../utils/audio';

export default function LeaveSessionModal({ isOpen, onClose, onConfirm }) {
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
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-primary)'
          }}>
            <LogOut size={16} />
          </div>
          <h3 className="modal-title" style={{ margin: 0 }}>Leave this session?</h3>
        </div>

        <p className="modal-description">
          You'll disconnect from this private conversation. You can create or join another session later.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ height: '44px' }}
          >
            Stay
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              playTickSound();
              onConfirm();
              onClose();
            }}
            style={{ height: '44px' }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
