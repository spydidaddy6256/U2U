import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef(null);

  // Strictly enforce permanent expiration when viewer is closed
  const handleImmediateClose = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (onPhotoExpired && messageId) {
      onPhotoExpired(messageId);
    }
    onClose();
  }, [onPhotoExpired, messageId, onClose]);

  // Controls auto-hide manager
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2600);
  }, []);

  // Lock body scroll & hide header when viewer is open, setup auto-hide timer
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('photo-viewer-active');
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2600);
    } else {
      document.body.classList.remove('photo-viewer-active');
    }
    return () => {
      document.body.classList.remove('photo-viewer-active');
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isOpen]);

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

  const content = isExpired || !photoUrl ? (
    <div
      className="image-viewer-backdrop"
      onClick={handleImmediateClose}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ textAlign: 'center', color: '#ffffff', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <p style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Photo expired</p>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>This one-view photo has disappeared.</p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 18 }}
          onClick={handleImmediateClose}
        >
          Close
        </button>
      </div>
    </div>
  ) : (
    <div
      className="image-viewer-backdrop"
      onClick={handleImmediateClose}
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      role="dialog"
      aria-modal="true"
      aria-label="One-view photo viewer"
    >
      {/* Floating Top Control Bar (Auto-hides after inactivity, reveals on tap) */}
      <div 
        className={`viewer-header ${showControls ? 'viewer-header-visible' : 'viewer-header-hidden'}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="viewer-header-left">
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
        </div>

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

      {/* Centered Protected Image */}
      <div 
        className="viewer-image-container"
        onClick={(e) => {
          e.stopPropagation();
          setShowControls(prev => !prev);
          if (!showControls) resetHideTimer();
        }}
      >
        <img 
          src={photoUrl} 
          alt="Temporary one-view photo" 
          className="viewer-image"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Bottom Hint on Mobile */}
      <div className={`viewer-tap-hint ${showControls ? 'hint-visible' : 'hint-hidden'}`}>
        Tap photo to toggle controls · Tap outside or close to exit
      </div>
    </div>
  );

  // Mount at document body to guarantee top-level stacking context
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}
