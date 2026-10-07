import React, { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import { playTickSound } from '../../utils/audio';

export default function ClearChatModal({ isOpen, onClose, onConfirm }) {
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

        <h3 className="modal-title">Clear this chat?</h3>
        <p className="modal-description">
          This removes the conversation from this device. Messages already saved elsewhere cannot be guaranteed to disappear.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ height: '42px' }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => { playTickSound(); onConfirm(); onClose(); }}
            style={{ height: '42px' }}
          >
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  );
}
