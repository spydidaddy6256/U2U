import React, { useEffect, useState, useCallback } from 'react';
import { X, Clock, Eye } from 'lucide-react';
import { formatCountdownSec } from '../../utils/time';

export default function ImageViewerModal({
  isOpen,
  onClose,
  photoUrl,
  messageId,
  expiresAt,
  isExpired,
  onPhotoExpired
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (expiresAt) {
      return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    }
    return 8;
  });

  // Strictly enforce permanent expiration when viewer is closed
  const handleImmediateClose = useCallback(() => {
    if (onPhotoExpired && messageId) {
      onPhotoExpired(messageId);
    }
    onClose();
  }, [onPhotoExpired, messageId, onClose]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleImmediateClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleImmediateClose]);

  // Track 8-second countdown
  useEffect(() => {
    if (!isOpen || !expiresAt) return;

    function updateTimer() {
      const msRemaining = expiresAt - Date.now();
      const sec = Math.ceil(msRemaining / 1000);

      if (sec <= 0) {
        setSecondsLeft(0);
        handleImmediateClose();
      } else {
        setSecondsLeft(sec);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [isOpen, expiresAt, handleImmediateClose]);

  if (!isOpen) return null;

  if (isExpired || !photoUrl) {
    return (
      <div
        className="image-viewer-backdrop"
        onClick={handleImmediateClose}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ textAlign: 'center', color: '#ffffff' }} onClick={(e) => e.stopPropagation()}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Photo expired</p>
          <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.6)' }}>This one-view photo has disappeared.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="image-viewer-backdrop"
      onClick={handleImmediateClose}
      role="dialog"
      aria-modal="true"
      aria-label="One-view photo viewer"
    >
      <div className="viewer-header" onClick={(e) => e.stopPropagation()}>
        {expiresAt ? (
          <div className="viewer-countdown-pill">
            <Clock size={15} className="countdown-pulse-icon" />
            <span>Expires in {formatCountdownSec(secondsLeft)}</span>
          </div>
        ) : (
          <div className="viewer-countdown-pill">
            <Eye size={15} />
            <span>8s viewing limit</span>
          </div>
        )}

        <button 
          type="button"
          className="viewer-close-btn" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleImmediateClose();
          }}
          aria-label="Close photo (consumes one-view)"
          title="Close photo"
        >
          <X size={22} />
        </button>
      </div>

      <img 
        src={photoUrl} 
        alt="Temporary one-view photo" 
        className="viewer-image"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
