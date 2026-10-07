import React from 'react';
import { Eye, Lock, Clock } from 'lucide-react';
import { formatCountdownSec } from '../utils/time';

/**
 * PhotoBubble Component
 * Features:
 * - One-view image: ALWAYS blurred in the chat view with the actual image visible underneath (Telegram/Instagram style)
 * - Tapping immediately opens the clear image in the in-app fullscreen ImageViewerModal
 * - Never navigates to the image's raw data URL and prevents default click/drag behavior
 * - Closing the viewer immediately returns to the chat with the image heavily blurred again
 * - Actual received image data (msg.photoUrl) is the direct image source
 * - Expiration countdown badge when active
 * - Expired tombstone when time hits 0
 */
export default function PhotoBubble({
  msg,
  isSelf,
  timer,
  onExpandViewer
}) {
  if (msg.isUnsent) {
    return null;
  }

  const isExpired = msg.isExpired || (timer && timer.secondsLeft <= 0);

  if (isExpired) {
    return (
      <div className="photo-expired-card">
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

    // Open image in full-screen in-app viewer directly
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
      aria-label="Tap to view private photo in viewer"
    >
      {/* Actual received image — heavily blurred in the chat view */}
      <img
        src={msg.photoUrl}
        alt="Private photo preview"
        className="photo-image blurred"
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Telegram-style spoiler overlay with 'Tap to view' */}
      <div className="photo-spoiler-overlay">
        <div className="photo-spoiler-badge">
          <div className="photo-spoiler-icon-wrapper">
            <Eye size={18} />
          </div>
          <span className="photo-spoiler-label">Tap to view</span>
          <span className="photo-spoiler-sublabel">
            {timer ? `Disappears in ${formatCountdownSec(timer.secondsLeft)}` : 'Disappears in 30s'}
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
