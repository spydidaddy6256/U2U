import React, { useEffect, useState } from 'react';
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
    return 30;
  });

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Track 30-second countdown
  useEffect(() => {
    if (!isOpen || !expiresAt) return;

    function updateTimer() {
      const msRemaining = expiresAt - Date.now();
      const sec = Math.ceil(msRemaining / 1000);

      if (sec <= 0) {
        setSecondsLeft(0);
        if (onPhotoExpired && messageId) {
          onPhotoExpired(messageId);
        }
        onClose();
      } else {
        setSecondsLeft(sec);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [isOpen, expiresAt, messageId, onPhotoExpired, onClose]);

  if (!isOpen) return null;

  if (isExpired || !photoUrl) {
    return (
      <div
        className="image-viewer-backdrop"
        onClick={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        <div style={{ textAlign: 'center', color: '#ffffff' }} onClick={(e) => e.stopPropagation()}>
          <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8 }}>Photo expired</p>
          <p style={{ fontSize: '0.86rem', color: 'rgba(255, 255, 255, 0.6)' }}>This photo is no longer available.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="image-viewer-backdrop"
      onClick={(e) => {
        e.preventDefault();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="viewer-header" onClick={(e) => e.stopPropagation()}>
        {expiresAt ? (
          <div className="viewer-countdown-pill">
            <Clock size={14} className="countdown-pulse-icon" />
            <span>Expires in {formatCountdownSec(secondsLeft)}</span>
          </div>
        ) : (
          <div className="viewer-countdown-pill">
            <Eye size={14} />
            <span>30s viewing limit applies once opened</span>
          </div>
        )}

        <button 
          className="icon-btn" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          style={{ color: '#ffffff', background: 'rgba(255, 255, 255, 0.12)', width: 36, height: 36 }}
          aria-label="Close viewer"
        >
          <X size={20} />
        </button>
      </div>

      <img 
        src={photoUrl} 
        alt="Temporary encrypted photo" 
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
