import React, { useState, useEffect } from 'react';
import './CinematicLaunch.css';

/**
 * CinematicLaunch — 3D Logo Reveal
 * 
 * Target duration: 1.5 seconds.
 * Triggers when the webapp/PWA launches or reloads.
 * Does not replay on in-app re-renders, route switches, or tab returns.
 * 
 * Visual experience:
 * 1. Dark entrance matching the current #0e0f12 U2U splash screen.
 * 2. 3D logo emergence with realistic depth, subtle perspective, and orange-red lighting.
 * 3. Glowing sphere cores, soft outer bloom, and translucent reflective connector.
 * 4. Gentle 3D tilt, subtle scale-in, and brief light pulse across the connector.
 * 5. Smooth settle and dissolve into the U2U interface without layout shift.
 */
export default function CinematicLaunch({ onComplete }) {
  const [phase, setPhase] = useState(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('holdLaunch')) {
      return 'settled';
    }
    return 'entering';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('holdLaunch')) {
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const settleTimer = setTimeout(() => setPhase('settled'), 500);
      const revealTimer = setTimeout(() => setPhase('revealing'), 850);
      const doneTimer = setTimeout(() => {
        setPhase('done');
        onComplete?.();
      }, 1100);
      return () => {
        clearTimeout(settleTimer);
        clearTimeout(revealTimer);
        clearTimeout(doneTimer);
      };
    }

    // 1500ms total cinematic choreography
    // 0 - 1050ms: 3D emergence, tilt, core bloom, and connector pulse
    // 1050 - 1300ms: logo settles in center with radiant glow
    // 1300 - 1500ms: smooth dissolve into the U2U interface
    const settleTimer = setTimeout(() => {
      setPhase('settled');
    }, 1050);

    const revealTimer = setTimeout(() => {
      setPhase('revealing');
    }, 1300);

    const doneTimer = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, 1500);

    return () => {
      clearTimeout(settleTimer);
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  if (phase === 'done') return null;

  return (
    <div
      className={`cinematic-launch-overlay phase-${phase}`}
      aria-label="U2U Launching"
      aria-hidden={phase === 'revealing'}
      role="presentation"
    >
      {/* Dark entrance ambient lighting */}
      <div className="launch-ambient-vignette" />
      <div className="launch-volumetric-glow" />

      {/* 3D Perspective Stage */}
      <div className="launch-3d-stage">
        {/* Soft floor reflection beneath 3D logo */}
        <div className="launch-floor-reflection" />

        {/* 3D Floating Logo Container */}
        <div className="launch-logo-3d-container">
          <div className="launch-logo-assembly">
            {/* High-performance local U2U brand mark with exact dimensions */}
            <img
              src="/icon-192x192.png"
              alt="U2U"
              className="launch-logo-base-image"
              width="160"
              height="160"
              draggable="false"
              loading="eager"
              decoding="async"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/favicon.svg';
              }}
            />

            {/* Subsurface glowing cores for the two orange-red spheres */}
            <div className="launch-sphere-glow launch-sphere-glow-left" />
            <div className="launch-sphere-glow launch-sphere-glow-right" />

            {/* Soft outer bloom halos */}
            <div className="launch-sphere-bloom launch-sphere-bloom-left" />
            <div className="launch-sphere-bloom launch-sphere-bloom-right" />

            {/* Central translucent glass connector highlights & pulse */}
            <div className="launch-connector-capsule">
              <div className="launch-connector-rim" />
              <div className="launch-connector-neck launch-connector-neck-left" />
              <div className="launch-connector-neck launch-connector-neck-right" />
              <div className="launch-connector-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
