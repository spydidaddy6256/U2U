/**
 * Tactile Micro-Audio Synthesizer for U2U
 * Generates soft, calm, non-intrusive sound cues via Web Audio API.
 * 100% client-synthesized without external audio assets.
 * 
 * Design philosophy:
 * - Extremely gentle, organic acoustic curves (frequencies 200Hz - 1100Hz)
 * - Low-pass filtered to eliminate harsh digital edges
 * - Low gain (whisper levels) to avoid cognitive fatigue
 * - Browser autoplay safe with automatic user gesture unlocking
 * - Strict preference enforcement (isAudioEnabled)
 */

let audioCtx = null;
let soundEnabled = true;
let isUnlocked = false;

// Initialize stored preference
try {
  const stored = localStorage.getItem('u2u-sound');
  if (stored !== null) soundEnabled = stored === 'true';
} catch {}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

// User-gesture unlocker for browser autoplay policies
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (isUnlocked) return;
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isUnlocked = true;
        }).catch(() => {});
      } else {
        isUnlocked = true;
      }
    }
    window.removeEventListener('click', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
    window.removeEventListener('touchstart', unlockAudio, true);
  };

  window.addEventListener('click', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);
  window.addEventListener('touchstart', unlockAudio, true);
}

export function setAudioEnabled(enabled) {
  soundEnabled = enabled;
  try {
    localStorage.setItem('u2u-sound', enabled ? 'true' : 'false');
  } catch {}
}

export function isAudioEnabled() {
  try {
    const stored = localStorage.getItem('u2u-sound');
    if (stored !== null) return stored === 'true';
  } catch {}
  return soundEnabled;
}

/** Helper to create a warm band-limited tone with smooth ADSR envelope */
function playTone({ freq, type = 'sine', startTime, duration, gainValue, endFreq, filterFreq = 2200 }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, startTime);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  } catch {}
}

// 1. Gentle tactile pop when text message is sent
export function playSentSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 520, endFreq: 760, duration: 0.048, gainValue: 0.038, filterFreq: 2400, startTime: now });
}

// 2. Warm acoustic twin chime when text message arrives
export function playReceivedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 587, duration: 0.09, gainValue: 0.032, filterFreq: 1800, startTime: now });
  playTone({ freq: 880, duration: 0.13, gainValue: 0.026, filterFreq: 2200, startTime: now + 0.055 });
}

// 3. Subtle micro-tap when message is delivered
export function playDeliveredSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 940, type: 'triangle', duration: 0.024, gainValue: 0.016, filterFreq: 1600, startTime: now });
}

// 4. Soft dual micro-chirp when message is read/seen
export function playSeenSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 740, duration: 0.03, gainValue: 0.02, filterFreq: 2000, startTime: now });
  playTone({ freq: 980, duration: 0.045, gainValue: 0.022, filterFreq: 2400, startTime: now + 0.025 });
}

// 5. Resonant warm pulse when voice note is sent
export function playVoiceNoteSentSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 340, endFreq: 540, duration: 0.07, gainValue: 0.04, filterFreq: 1600, startTime: now });
}

// 6. Melodic three-harmonic chime when voice note is received
export function playVoiceNoteReceivedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 440, duration: 0.08, gainValue: 0.03, filterFreq: 1600, startTime: now });
  playTone({ freq: 659, duration: 0.09, gainValue: 0.026, filterFreq: 1900, startTime: now + 0.045 });
  playTone({ freq: 880, duration: 0.14, gainValue: 0.022, filterFreq: 2200, startTime: now + 0.09 });
}

// 7. Gentle downward release chime when voice note completes playback
export function playVoiceNoteEndedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 554, endFreq: 440, duration: 0.08, gainValue: 0.025, filterFreq: 1500, startTime: now });
}

// 8. Crystalline optical ping when image is received
export function playImageReceivedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 640, duration: 0.07, gainValue: 0.028, filterFreq: 2200, startTime: now });
  playTone({ freq: 1046, duration: 0.12, gainValue: 0.024, filterFreq: 2600, startTime: now + 0.04 });
}

// 9. Soft mechanical shutter / aperture click when view-once photo is opened
export function playViewOnceOpenedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 880, endFreq: 1200, type: 'triangle', duration: 0.035, gainValue: 0.028, filterFreq: 3000, startTime: now });
  playTone({ freq: 1100, endFreq: 600, duration: 0.04, gainValue: 0.018, filterFreq: 2000, startTime: now + 0.02 });
}

// 10. Delicate vanish flutter when photo expires
export function playImageExpiredSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 420, endFreq: 200, duration: 0.11, gainValue: 0.025, filterFreq: 1200, startTime: now });
}

// 11. Soft reverse vaporize sweep when message is unsent/deleted
export function playUnsentSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 460, endFreq: 160, duration: 0.12, gainValue: 0.03, filterFreq: 1400, startTime: now });
}

// 12. Harmonic chord when session is created
export function playSessionCreatedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 392, duration: 0.12, gainValue: 0.03, filterFreq: 1800, startTime: now });
  playTone({ freq: 493, duration: 0.14, gainValue: 0.028, filterFreq: 2000, startTime: now + 0.04 });
  playTone({ freq: 587, duration: 0.22, gainValue: 0.032, filterFreq: 2400, startTime: now + 0.08 });
}

// 13. Reassuring lock confirmation when session connects
export function playConnectedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 523, duration: 0.09, gainValue: 0.035, filterFreq: 2000, startTime: now });
  playTone({ freq: 784, duration: 0.16, gainValue: 0.032, filterFreq: 2200, startTime: now + 0.05 });
}

// 14. Warm arrival chime when peer joins session
export function playUserJoinedSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 523, duration: 0.11, gainValue: 0.035, filterFreq: 1800, startTime: now });
  playTone({ freq: 659, duration: 0.18, gainValue: 0.032, filterFreq: 2200, startTime: now + 0.06 });
}

// 15. Gentle departure note when peer leaves session
export function playUserLeftSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 587, duration: 0.09, gainValue: 0.03, filterFreq: 1700, startTime: now });
  playTone({ freq: 440, duration: 0.16, gainValue: 0.026, filterFreq: 1400, startTime: now + 0.05 });
}

// 16. Deep disintegrate swoosh for burning session
export function playBurnSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 360, endFreq: 80, duration: 0.32, gainValue: 0.045, filterFreq: 900, startTime: now });
  playTone({ freq: 240, endFreq: 60, duration: 0.28, gainValue: 0.035, filterFreq: 600, startTime: now + 0.04 });
}

// 17. Subtle non-jarring low double-tap for error or invalid action
export function playErrorSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 260, duration: 0.05, gainValue: 0.03, filterFreq: 900, startTime: now });
  playTone({ freq: 200, duration: 0.07, gainValue: 0.028, filterFreq: 800, startTime: now + 0.055 });
}

// 18. Subtle crystalline alert for toast / notifications
export function playNotificationSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 700, duration: 0.07, gainValue: 0.025, filterFreq: 2200, startTime: now });
  playTone({ freq: 1050, duration: 0.11, gainValue: 0.022, filterFreq: 2600, startTime: now + 0.035 });
}

// 19. Tiny tactile haptic tick for buttons, copies, and switches
export function playTickSound() {
  if (!isAudioEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone({ freq: 820, type: 'triangle', duration: 0.022, gainValue: 0.018, filterFreq: 1800, startTime: now });
}
