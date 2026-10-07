import React from 'react';
import { Eye, Lock, Clock } from 'lucide-react';
import { formatCountdownSec } from '../utils/time';

/**
 * PhotoBubble Component
 * Features:
 * - One-view image: ALWAYS blurred in the chat view with the actual image visible underneath
 * - Tapping opens the clear image in the in-app fullscreen ImageViewerModal
 * - 8-second authoritative lifetime upon reveal
 * - Closing viewer or timer expiration permanently consumes and locks the photo
 * - Never navigates to raw data URLs
 * - Expired tombstone when consumed
 */
export default function PhotoBubble({
  msg,
  timer,
  onExpandViewer
}) {
  if (msg.isUnsent) {
    return null;
  }

  const isExpired = msg.isExpired || (timer && timer.secondsLeft <= 0) || (msg.photoOpened && !timer);

  if (isExpired) {
    return (
      <div className="photo-expired-card" aria-label="Expired one-view photo">
        <Lock size={15} />
        <span>Photo expired</span>
      </div>
    );
  }

  const handleTap = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isExpired) return;

    onExpandViewer(msg);
  };

  return (
    <div
      className="photo-bubble-container blurred"
      onClick={handleTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap(e);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="Tap to view private 8-second photo in viewer"
    >
      {/* Received image — heavily blurred in chat */}
      <img
        src={msg.photoUrl}
        alt="Private photo preview"
        className="photo-image blurred"
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Spoiler overlay with 'Tap to view' */}
      <div className="photo-spoiler-overlay">
        <div className="photo-spoiler-badge">
          <div className="photo-spoiler-icon-wrapper">
            <Eye size={18} />
          </div>
          <span className="photo-spoiler-label">Tap to view</span>
          <span className="photo-spoiler-sublabel">
            {timer ? `Disappears in ${formatCountdownSec(timer.secondsLeft)}` : 'Disappears in 8s'}
          </span>
        </div>
      </div>

      {/* Active countdown badge if timer is running */}
      {timer && (
        <div className="photo-active-timer-badge">
          <Clock size={12} style={{ marginRight: 4 }} />
          <span>{formatCountdownSec(timer.secondsLeft)}</span>
        </div>
      )}
    </div>
  );
}
