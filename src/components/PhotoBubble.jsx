import React from 'react';
import { Eye, Lock, Clock, Smartphone } from 'lucide-react';
import { formatCountdownSec } from '../utils/time';
import { isNativeAndroid } from '../utils/apiConfig';

const ONE_VIEW_RESTRICTED_MESSAGE = 'One-View Photos are available exclusively in the U2U Android app. Please use the app to send and view One-View Photos.';

/**
 * PhotoBubble Component
 * 
 * Features:
 * 1. One-View Photos:
 *    - EXCLUSIVELY available in the native U2U Android app.
 *    - On website (desktop & mobile browsers): displays secure guidance card directing user to Android app.
 *      Never displays image content, blurred preview, or allows reveal.
 *    - On native Android app: ALWAYS blurred in chat view with "Tap to view" overlay.
 *      8-second authoritative lifetime upon reveal in ImageViewerModal.
 *      Permanently consumed and locked once closed or expired.
 * 2. Normal Photos:
 *    - Fully supported on desktop website, mobile website, and native Android app.
 *    - Clear unblurred display, preserved encryption and delivery without 8s self-destruct timer.
 */
export default function PhotoBubble({
  msg,
  timer,
  onExpandViewer,
  onToast
}) {
  if (msg.isUnsent) {
    return null;
  }

  const isNative = isNativeAndroid();
  const isOneView = Boolean(msg.isViewOnce);

  // ── One-View Photos: Website Access Restriction ──
  if (isOneView && !isNative) {
    const handleRestrictedTap = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      onToast?.(ONE_VIEW_RESTRICTED_MESSAGE);
    };

    return (
      <div
        className="photo-restricted-card"
        onClick={handleRestrictedTap}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRestrictedTap(e);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={ONE_VIEW_RESTRICTED_MESSAGE}
        title={ONE_VIEW_RESTRICTED_MESSAGE}
      >
        <div className="photo-restricted-header">
          <div className="photo-restricted-icon-box">
            <Smartphone size={18} />
          </div>
          <div className="photo-restricted-title-group">
            <span className="photo-restricted-title">One-View Photo</span>
            <span className="photo-restricted-badge">Android app only</span>
          </div>
        </div>
        <p className="photo-restricted-text">
          {ONE_VIEW_RESTRICTED_MESSAGE}
        </p>
      </div>
    );
  }

  // ── One-View Photos: Native Android Functionality ──
  if (isOneView) {
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

  // ── Normal Photos: Universal Support (Desktop, Mobile Web, Android) ──
  const handleNormalTap = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onExpandViewer) {
      onExpandViewer(msg);
    }
  };

  return (
    <div
      className="photo-bubble-container normal-photo"
      onClick={handleNormalTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNormalTap(e);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="View photo"
    >
      <img
        src={msg.photoUrl}
        alt="Chat photo"
        className="photo-image normal revealed"
        loading="lazy"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
