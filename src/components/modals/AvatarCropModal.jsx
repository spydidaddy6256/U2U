import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { playTickSound } from '../../utils/audio';

const CROP_SIZE = 240; // Diameter of circular crop aperture in px

export default function AvatarCropModal({
  isOpen,
  imageSrc,
  onApplyCrop,
  onCancel
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef(null);
  const viewportRef = useRef(null);

  const dragRef = useRef({
    isDragging: false,
    isPinching: false,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    startPinchDist: 0,
    startZoom: 1
  });

  // Calculate clamped offset ensuring image always covers the circle
  const getClampedOffset = useCallback((x, y, currentZoom, naturalW, naturalH) => {
    if (!naturalW || !naturalH) return { x: 0, y: 0 };
    const baseScale = Math.max(CROP_SIZE / naturalW, CROP_SIZE / naturalH);
    const effScale = baseScale * currentZoom;
    const rendW = naturalW * effScale;
    const rendH = naturalH * effScale;
    const maxX = Math.max(0, (rendW - CROP_SIZE) / 2);
    const maxY = Math.max(0, (rendH - CROP_SIZE) / 2);
    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY)
    };
  }, []);

  // When image loads, compute natural dimensions and reset transforms
  const handleImageLoaded = (e) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Keyboard accessibility (Escape to cancel)
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.min(Math.max(newZoom, 1), 4);
    setZoom(clampedZoom);
    setOffset(prev => getClampedOffset(prev.x, prev.y, clampedZoom, naturalSize.width, naturalSize.height));
  };

  // Touch handlers for mobile pan & pinch-to-zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        isDragging: true,
        isPinching: false,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
        startPinchDist: 0,
        startZoom: zoom
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      dragRef.current = {
        isDragging: false,
        isPinching: true,
        startX: 0,
        startY: 0,
        startOffsetX: offset.x,
        startOffsetY: offset.y,
        startPinchDist: dist || 1,
        startZoom: zoom
      };
    }
  };

  const handleTouchMove = (e) => {
    if (dragRef.current.isPinching && e.touches.length === 2) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / (dragRef.current.startPinchDist || 1);
      const nextZoom = Math.min(Math.max(dragRef.current.startZoom * ratio, 1), 4);
      setZoom(nextZoom);
      setOffset(prev => getClampedOffset(prev.x, prev.y, nextZoom, naturalSize.width, naturalSize.height));
    } else if (dragRef.current.isDragging && e.touches.length === 1) {
      if (e.cancelable) e.preventDefault();
      const dx = e.touches[0].clientX - dragRef.current.startX;
      const dy = e.touches[0].clientY - dragRef.current.startY;
      const clamped = getClampedOffset(
        dragRef.current.startOffsetX + dx,
        dragRef.current.startOffsetY + dy,
        zoom,
        naturalSize.width,
        naturalSize.height
      );
      setOffset(clamped);
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.isDragging = false;
    dragRef.current.isPinching = false;
  };

  // Pointer events (Mouse / Trackpad)
  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    dragRef.current = {
      isDragging: true,
      isPinching: false,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      startPinchDist: 0,
      startZoom: zoom
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current.isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const clamped = getClampedOffset(
      dragRef.current.startOffsetX + dx,
      dragRef.current.startOffsetY + dy,
      zoom,
      naturalSize.width,
      naturalSize.height
    );
    setOffset(clamped);
  };

  const handlePointerUp = (e) => {
    dragRef.current.isDragging = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    handleZoomChange(zoom + delta);
  };

  // Generate cropped image on canvas and apply
  const handleApplyCrop = () => {
    if (!imageRef.current || !naturalSize.width || !naturalSize.height) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const baseScale = Math.max(CROP_SIZE / naturalSize.width, CROP_SIZE / naturalSize.height);
    const effScale = baseScale * zoom;
    const rendW = naturalSize.width * effScale;
    const rendH = naturalSize.height * effScale;

    // Crop circle top-left in rendered image coordinate space
    const rendCropLeft = (rendW / 2 - offset.x) - (CROP_SIZE / 2);
    const rendCropTop = (rendH / 2 - offset.y) - (CROP_SIZE / 2);

    // Convert to source image natural coordinate space
    const srcX = Math.max(0, rendCropLeft / effScale);
    const srcY = Math.max(0, rendCropTop / effScale);
    const srcSize = CROP_SIZE / effScale;

    ctx.drawImage(
      imageRef.current,
      srcX, srcY, srcSize, srcSize,
      0, 0, 512, 512
    );

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    playTickSound();
    onApplyCrop(croppedDataUrl);
  };

  if (!isOpen) return null;

  // Render sizing
  const baseScale = naturalSize.width && naturalSize.height
    ? Math.max(CROP_SIZE / naturalSize.width, CROP_SIZE / naturalSize.height)
    : 1;
  const effScale = baseScale * zoom;
  const rendWidth = naturalSize.width * effScale;
  const rendHeight = naturalSize.height * effScale;

  return (
    <div className="modal-backdrop avatar-crop-backdrop" onClick={onCancel}>
      <div 
        className="modal-dialog avatar-crop-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
      >
        <button 
          type="button" 
          className="icon-btn modal-close-btn" 
          onClick={onCancel} 
          aria-label="Close crop editor"
        >
          <X size={18} />
        </button>

        <h3 id="avatar-crop-title" className="modal-title">Crop Profile Picture</h3>
        <p className="modal-description avatar-crop-subtitle">
          Drag to reposition · Pinch or slide to zoom
        </p>

        <div className="modal-body avatar-crop-modal-body">
          {/* Interactive Crop Viewport */}
          <div
            ref={viewportRef}
            className="avatar-crop-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onWheel={handleWheel}
            data-testid="avatar-crop-viewport"
          >
            {/* The Image being cropped */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="avatar-crop-image"
              onLoad={handleImageLoaded}
              draggable={false}
              style={{
                width: rendWidth ? `${rendWidth}px` : 'auto',
                height: rendHeight ? `${rendHeight}px` : 'auto',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`
              }}
            />

            {/* Circular Preview Cut-Out Aperture & Mask */}
            <div 
              className="avatar-crop-mask-circle"
              style={{
                width: `${CROP_SIZE}px`,
                height: `${CROP_SIZE}px`
              }}
              data-testid="avatar-crop-circle-mask"
            >
              <div className="avatar-crop-crosshair" aria-hidden="true">
                <span className="crosshair-v" />
                <span className="crosshair-h" />
              </div>
            </div>
          </div>

          {/* Zoom Adjustment Controls */}
          <div className="avatar-crop-controls">
            <div className="avatar-crop-zoom-row">
              <button
                type="button"
                className="avatar-crop-zoom-btn"
                onClick={() => handleZoomChange(zoom - 0.25)}
                aria-label="Zoom out"
                disabled={zoom <= 1}
              >
                <ZoomOut size={16} />
              </button>

              <input
                type="range"
                className="avatar-crop-slider"
                min="1"
                max="3.5"
                step="0.01"
                value={zoom}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                aria-label="Zoom adjustment"
                data-testid="avatar-crop-zoom-slider"
              />

              <button
                type="button"
                className="avatar-crop-zoom-btn"
                onClick={() => handleZoomChange(zoom + 0.25)}
                aria-label="Zoom in"
                disabled={zoom >= 3.5}
              >
                <ZoomIn size={16} />
              </button>
            </div>

            <span className="avatar-crop-zoom-label">
              <Move size={12} style={{ display: 'inline', marginRight: 4 }} />
              {Math.round(zoom * 100)}% zoom · Circular crop preview
            </span>
          </div>
        </div>

        {/* Modal Actions Footer with Cancel and Apply Crop */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyCrop}
            data-testid="apply-crop-btn"
          >
            Apply Crop
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            data-testid="cancel-crop-btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

