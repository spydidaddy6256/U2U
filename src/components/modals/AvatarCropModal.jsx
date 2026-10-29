import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { playTickSound, playErrorSound } from '../../utils/audio';

const PREVIEW_SIZE = 280; // Display canvas size in pixels
const CROP_DIAMETER = 220; // Circular crop window diameter
const OUTPUT_SIZE = 256; // Final square output image size

export default function AvatarCropModal({
  isOpen,
  imageSrc,
  onConfirm,
  onCancel
}) {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState('');

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const baseScaleRef = useRef(1.0);

  // Reset state and load image on open/source change
  useEffect(() => {
    if (!isOpen || !imageSrc) {
      // eslint-disable-next-line react/set-state-in-effect
      setImageLoaded(false);
      setImageError(false);
      setPreviewDataUrl('');
      return;
    }

    // eslint-disable-next-line react/set-state-in-effect
    setImageLoaded(false);
    setImageError(false);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      imageRef.current = img;
      // Calculate scale to at least cover the crop diameter
      const minDim = Math.min(img.width, img.height);
      const baseScale = minDim > 0 ? CROP_DIAMETER / minDim : 1;
      baseScaleRef.current = baseScale;
      setImageLoaded(true);
    };

    img.onerror = () => {
      setImageError(true);
      playErrorSound();
    };

    img.src = imageSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isOpen, imageSrc]);

  // Redraw preview canvas whenever zoom, pan, or image changes
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const cx = cw / 2;
    const cy = ch / 2;

    ctx.clearRect(0, 0, cw, ch);

    // Draw background grid pattern for visual depth
    ctx.fillStyle = '#0d0f15';
    ctx.fillRect(0, 0, cw, ch);

    // Draw user image with zoom and pan
    const scale = baseScaleRef.current * zoom;
    const iw = img.width * scale;
    const ih = img.height * scale;
    const ix = cx - iw / 2 + pan.x;
    const iy = cy - ih / 2 + pan.y;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();

    // Dark mask outside circular crop area
    const radius = CROP_DIAMETER / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10, 11, 16, 0.76)';
    ctx.fill();

    // Crop border ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(224, 94, 70, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(224, 94, 70, 0.4)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    // Subtle center guide lines
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy);
    ctx.lineTo(cx + 16, cy);
    ctx.moveTo(cx, cy - 16);
    ctx.lineTo(cx, cy + 16);
    ctx.stroke();
    ctx.restore();
  }, [imageLoaded, zoom, pan]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Update live thumbnail preview
  useEffect(() => {
    if (!imageLoaded || !imageRef.current) return;
    const timer = setTimeout(() => {
      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = OUTPUT_SIZE;
        offscreen.height = OUTPUT_SIZE;
        const octx = offscreen.getContext('2d');
        if (!octx) return;

        const img = imageRef.current;
        const scale = baseScaleRef.current * zoom;
        const scaleFactor = OUTPUT_SIZE / CROP_DIAMETER;

        const iw = img.width * scale * scaleFactor;
        const ih = img.height * scale * scaleFactor;
        const ix = OUTPUT_SIZE / 2 - iw / 2 + pan.x * scaleFactor;
        const iy = OUTPUT_SIZE / 2 - ih / 2 + pan.y * scaleFactor;

        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(img, ix, iy, iw, ih);

        setPreviewDataUrl(offscreen.toDataURL('image/jpeg', 0.88));
      } catch {}
    }, 120);

    return () => clearTimeout(timer);
  }, [imageLoaded, zoom, pan]);

  // Pointer dragging handlers for image repositioning
  const handlePointerDown = (e) => {
    if (!imageLoaded) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !imageLoaded) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    if (!imageLoaded) return;
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom(prev => Math.min(3.5, Math.max(0.8, Number((prev + delta).toFixed(2)))));
  };

  const handleZoomIn = () => {
    playTickSound();
    setZoom(prev => Math.min(3.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    playTickSound();
    setZoom(prev => Math.max(0.8, Number((prev - 0.15).toFixed(2))));
  };

  const handleReset = () => {
    playTickSound();
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleSaveCrop = () => {
    const img = imageRef.current;
    if (!img || !imageLoaded) return;

    try {
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = OUTPUT_SIZE;
      outputCanvas.height = OUTPUT_SIZE;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) return;

      const scale = baseScaleRef.current * zoom;
      const scaleFactor = OUTPUT_SIZE / CROP_DIAMETER;

      const iw = img.width * scale * scaleFactor;
      const ih = img.height * scale * scaleFactor;
      const ix = OUTPUT_SIZE / 2 - iw / 2 + pan.x * scaleFactor;
      const iy = OUTPUT_SIZE / 2 - ih / 2 + pan.y * scaleFactor;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, ix, iy, iw, ih);

      // Export high-quality, practical file-size JPEG (< 35KB)
      const croppedDataUrl = outputCanvas.toDataURL('image/jpeg', 0.88);
      playTickSound();
      onConfirm(croppedDataUrl);
    } catch (err) {
      console.error('Failed to crop avatar:', err);
      playErrorSound();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop avatar-crop-backdrop" onClick={onCancel}>
      <div
        className="modal-dialog avatar-crop-dialog glass-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-modal-title"
      >
        <button
          type="button"
          className="icon-btn modal-close-btn"
          onClick={onCancel}
          aria-label="Cancel and close"
          title="Cancel"
        >
          <X size={18} />
        </button>

        <div className="crop-modal-header">
          <div className="crop-badge">
            <ImageIcon size={15} />
            <span>Profile Picture</span>
          </div>
          <h3 id="crop-modal-title" className="modal-title">Adjust & Crop Picture</h3>
          <p className="modal-description">
            Drag to reposition. Use the slider or buttons to zoom into your profile avatar.
          </p>
        </div>

        {imageError ? (
          <div className="crop-error-state">
            <AlertCircle size={36} className="crop-error-icon" />
            <h4>Unable to load image</h4>
            <p>Please select a valid JPG, PNG, or WebP picture.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel}>
              Choose another image
            </button>
          </div>
        ) : (
          <>
            {/* Interactive Canvas Area */}
            <div className="crop-canvas-wrapper">
              <canvas
                ref={canvasRef}
                width={PREVIEW_SIZE}
                height={PREVIEW_SIZE}
                className={`crop-canvas ${isDragging ? 'dragging' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
                style={{ touchAction: 'none' }}
              />
              {!imageLoaded && (
                <div className="crop-loading-overlay">
                  <div className="spinner-sm" />
                  <span>Loading image…</span>
                </div>
              )}
            </div>

            {/* Controls: Zoom Slider & Quick Buttons */}
            <div className="crop-controls">
              <div className="crop-zoom-row">
                <button
                  type="button"
                  className="icon-btn crop-ctrl-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>

                <input
                  type="range"
                  min="0.8"
                  max="3.5"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="crop-zoom-slider"
                  aria-label="Zoom level"
                />

                <button
                  type="button"
                  className="icon-btn crop-ctrl-btn"
                  onClick={handleZoomIn}
                  title="Zoom In"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>

                <button
                  type="button"
                  className="icon-btn crop-ctrl-btn reset-btn"
                  onClick={handleReset}
                  title="Reset Position & Zoom"
                  aria-label="Reset position and zoom"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* Live Circular Preview Badge */}
              {previewDataUrl && (
                <div className="crop-live-preview-row">
                  <div className="crop-live-thumb-ring">
                    <img
                      src={previewDataUrl}
                      alt="Crop Result Preview"
                      className="crop-live-thumb-img"
                    />
                  </div>
                  <div className="crop-live-meta">
                    <span className="crop-live-title">Circular Avatar Preview</span>
                    <span className="crop-live-sub">Optimized for fast encryption</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="crop-actions-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  playTickSound();
                  onCancel();
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCrop}
                disabled={!imageLoaded}
              >
                <Check size={16} />
                <span>Save Profile Picture</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
