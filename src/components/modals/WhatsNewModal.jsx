import React, { useEffect, useRef } from 'react';
import { X, Sparkles, CheckCircle2, Calendar, Tag } from 'lucide-react';
import { playTickSound } from '../../utils/audio';
import { RELEASES, CURRENT_VERSION, CURRENT_RELEASE_DATE } from '../../data/releaseNotes';
import './WhatsNewModal.css';

export default function WhatsNewModal({ isOpen, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        playTickSound();
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      // Accessibility: focus dialog
      if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClose = () => {
    playTickSound();
    onClose();
  };

  return (
    <div 
      className="whatsnew-backdrop" 
      onClick={handleClose} 
      role="presentation"
    >
      <div 
        className="whatsnew-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whatsnew-title"
        aria-describedby="whatsnew-subtitle"
        tabIndex={-1}
        ref={dialogRef}
      >
        {/* Header Bar */}
        <div className="whatsnew-header">
          <div className="whatsnew-title-group">
            <div className="whatsnew-badge">
              <Sparkles size={14} className="whatsnew-badge-icon" />
              <span>Update</span>
            </div>
            <h2 id="whatsnew-title" className="whatsnew-title">What's New in U2U</h2>
            <p id="whatsnew-subtitle" className="whatsnew-subtitle">
              <span className="whatsnew-version">v{CURRENT_VERSION}</span>
              <span className="whatsnew-dot">·</span>
              <Calendar size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              <span>{CURRENT_RELEASE_DATE}</span>
            </p>
          </div>

          <button 
            className="icon-btn whatsnew-close-btn" 
            onClick={handleClose} 
            aria-label="Close What's New"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="whatsnew-scroll-body">
          {RELEASES.map((rel) => (
            <div key={rel.version} className={`whatsnew-release-block ${rel.isLatest ? 'is-latest' : ''}`}>
              <div className="whatsnew-release-meta">
                <div className="whatsnew-release-heading">
                  <span className="whatsnew-release-v">v{rel.version}</span>
                  {rel.isLatest && <span className="whatsnew-tag-latest">Current</span>}
                </div>
                <span className="whatsnew-release-date">{rel.date}</span>
              </div>

              <div className="whatsnew-release-summary">{rel.summary}</div>

              <div className="whatsnew-highlights-list">
                {rel.highlights.map((item, idx) => (
                  <div key={idx} className="whatsnew-item">
                    <div className="whatsnew-item-bullet">
                      <CheckCircle2 size={15} />
                    </div>
                    <div className="whatsnew-item-content">
                      <div className="whatsnew-item-header">
                        <span className="whatsnew-item-title">{item.title}</span>
                        {item.category && (
                          <span className="whatsnew-category-pill">
                            <Tag size={10} style={{ marginRight: 3 }} />
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="whatsnew-item-desc">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Action */}
        <div className="whatsnew-footer">
          <button 
            className="btn btn-primary whatsnew-done-btn" 
            onClick={handleClose}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
