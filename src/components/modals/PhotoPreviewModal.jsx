import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Eye, ShieldCheck, X } from 'lucide-react';
import { playTickSound } from '../../utils/audio';

export default function PhotoPreviewModal({
  isOpen,
  onClose,
  photoData,
  onSendPhoto
}) {
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Stable ref for onClose to avoid dependency cycles and re-render resets
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Track modal opening transition — reset viewOnce only when freshly opened for a new photo
  const prevOpenRef = useRef(false);
  const currentPhotoUrlRef = useRef(null);

  useEffect(() => {
    const isNewOpen = isOpen && !prevOpenRef.current;
    const isDifferentPhoto = photoData?.dataUrl && photoData.dataUrl !== currentPhotoUrlRef.current;

    if (isNewOpen || (isOpen && isDifferentPhoto)) {
      setIsViewOnce(false);
      setIsEncrypting(false);
      currentPhotoUrlRef.current = photoData?.dataUrl || null;
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, photoData?.dataUrl]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !isEncrypting) {
        e.preventDefault();
        onCloseRef.current?.();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEncrypting]);

  if (!isOpen || !photoData) return null;

  // Single deterministic toggle handler for both the card and the switch
  const handleToggle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isEncrypting) return;
    setIsViewOnce(prev => {
      const next = !prev;
      playTickSound();
      return next;
    });
  };

  const handleCardKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle(e);
    }
  };

  const handleSend = async () => {
    if (isEncrypting) return;
    setIsEncrypting(true);
    playTickSound();
    try {
      await onSendPhoto({
        ...photoData,
        isViewOnce
      });
      onClose();
    } catch (err) {
      console.error('Failed to encrypt and send photo:', err);
      setIsEncrypting(false);
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={!isEncrypting ? onClose : null}
      role="presentation"
    >
      <div 
        className="modal-dialog photo-send-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-preview-title"
      >
        {!isEncrypting && (
          <button 
            className="icon-btn modal-close-btn" 
            onClick={onClose} 
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        <h3 id="photo-preview-title" className="modal-title">Send photo?</h3>

        {/* Image Preview */}
        <div className="photo-preview-frame">
          <img 
            src={photoData.dataUrl} 
            alt="Preview" 
            className="photo-preview-img"
          />
        </div>

        {/* View Once Card / Toggle */}
        <div
          className={`view-once-toggle-card ${isViewOnce ? 'active' : ''}`}
          onClick={handleToggle}
          onKeyDown={handleCardKeyDown}
          role="switch"
          aria-checked={isViewOnce}
          tabIndex={0}
          title="Click to toggle View once mode"
        >
          <div className="view-once-card-left">
            <div className={`view-once-icon-box ${isViewOnce ? 'active' : ''}`}>
              <Eye size={18} />
            </div>
            <div className="view-once-text-group">
              <div className="view-once-title">
                <span>View once</span>
                {isViewOnce && <span className="view-once-badge">Active</span>}
              </div>
              <div className="view-once-subtitle">Photo disappears after opening</div>
            </div>
          </div>

          <div className="view-once-switch" aria-hidden="true">
            <div className={`view-once-switch-track ${isViewOnce ? 'on' : 'off'}`}>
              <div className="view-once-switch-thumb" />
            </div>
          </div>
        </div>

        <p className="photo-encryption-notice">
          <ShieldCheck size={15} className="photo-encryption-icon" />
          <span>This photo will be encrypted on-device before transmission.</span>
        </p>

        <div className="photo-modal-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isEncrypting}
          >
            Cancel
          </button>

          <button 
            className="btn btn-primary photo-send-submit-btn" 
            onClick={handleSend}
            disabled={isEncrypting}
          >
            {isEncrypting ? (
              <span className="btn-loading-text">
                <span className="loading-spinner-dot" />
                Encrypting photo…
              </span>
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
