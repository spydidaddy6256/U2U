import React from 'react';
import { Copy, Trash2, X } from 'lucide-react';

export default function MessageActionModal({ isOpen, onClose, targetMessage, isSelf, onCopy, onUnsend }) {
  if (!isOpen || !targetMessage || targetMessage.isUnsent) return null;

  const isPhoto = targetMessage.type === 'photo';
  const isVoice = targetMessage.type === 'voice';
  const isExpired = targetMessage.isExpired;

  const handleCopy = () => {
    if (targetMessage.type === 'text' && targetMessage.text) {
      onCopy(targetMessage.text);
    }
    onClose();
  };

  const handleUnsend = () => {
    onUnsend(targetMessage.id);
    onClose();
  };

  const title = isPhoto ? 'Photo' : isVoice ? 'Voice Note' : 'Message';

  return (
    <div className="action-sheet-backdrop" onClick={onClose}>
      <div className="action-sheet-container" onClick={e => e.stopPropagation()}>
        <div className="action-sheet-handle" />

        <div className="action-sheet-header">
          <span className="action-sheet-title">{title}</span>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ position: 'static', marginLeft: 'auto' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="action-sheet-options">
          {/* Copy — only for text messages */}
          {!isPhoto && !isVoice && targetMessage.text && (
            <button className="action-sheet-btn" onClick={handleCopy}>
              <Copy size={18} />
              <span>Copy</span>
            </button>
          )}

          {/* Unsend — only sender, only if not expired */}
          {isSelf && !isExpired && (
            <button className="action-sheet-btn danger" onClick={handleUnsend}>
              <Trash2 size={18} />
              <span>Unsend</span>
            </button>
          )}

          {/* If no actions available */}
          {((!isSelf && isPhoto) || (!isSelf && isVoice) || (isSelf && isExpired)) && (
            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', padding: '16px 0' }}>
              No actions available for this message.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
