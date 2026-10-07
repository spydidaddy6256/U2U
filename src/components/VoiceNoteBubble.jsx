import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Mic, Square, X, Send, Trash2, Timer } from 'lucide-react';
import * as audioUtils from '../utils/audio.js';

// ─────────────────────────────────────────────
// VoiceRecorder — inline recorder UI rendered in the composer area
// ─────────────────────────────────────────────
export function VoiceRecorder({ onSend, onCancel }) {
  const [phase, setPhase] = useState('recording'); // 'recording' | 'preview'
  const [recordingMs, setRecordingMs] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const tickIntervalRef = useRef(null);
  const previewAudioRef = useRef(null);
  const previewRafRef = useRef(null);
  const streamRef = useRef(null);
  const recordingMsRef = useRef(0);

  // Keep recordingMsRef in sync for use in onstop closure
  useEffect(() => {
    recordingMsRef.current = recordingMs;
  }, [recordingMs]);

  // Start recording immediately on mount
  useEffect(() => {
    let cancelled = false;

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        // Prefer audio/webm; fallback to audio/ogg; fallback to default
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : '';

        const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = mr;
        chunksRef.current = [];

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
          const capturedMs = recordingMsRef.current;
          setAudioBlob(blob);
          setPhase('preview');

          // Extract duration via a temporary audio element
          const tempUrl = URL.createObjectURL(blob);
          const tempAudio = new Audio(tempUrl);
          tempAudio.onloadedmetadata = () => {
            let dur = tempAudio.duration;
            // Some browsers report Infinity for duration in certain codecs
            if (!isFinite(dur) || dur === 0) dur = capturedMs / 1000;
            setAudioDuration(Math.max(dur, capturedMs / 1000));
            URL.revokeObjectURL(tempUrl);
          };
          tempAudio.onerror = () => {
            setAudioDuration(capturedMs / 1000);
            URL.revokeObjectURL(tempUrl);
          };
        };

        mr.start(100); // Collect chunks every 100ms

        // Tick ms counter
        tickIntervalRef.current = setInterval(() => {
          setRecordingMs(prev => prev + 100);
        }, 100);

      } catch (err) {
        console.error('Mic error:', err);
        onCancel('mic_denied');
      }
    }

    startRecording();

    return () => {
      cancelled = true;
      clearInterval(tickIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stop the recording and move to preview
  const handleStopRecording = () => {
    clearInterval(tickIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
  };

  // Cancel — discard everything
  const handleCancel = () => {
    clearInterval(tickIntervalRef.current);
    cancelAnimationFrame(previewRafRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      if (previewAudioRef.current.src) URL.revokeObjectURL(previewAudioRef.current.src);
    }
    onCancel('user_cancelled');
  };

  // Preview play/pause
  const togglePreviewPlay = () => {
    if (!audioBlob) return;

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(URL.createObjectURL(audioBlob));
      previewAudioRef.current.onended = () => {
        setPreviewPlaying(false);
        setPreviewProgress(1);
        cancelAnimationFrame(previewRafRef.current);
      };
    }

    if (previewPlaying) {
      previewAudioRef.current.pause();
      setPreviewPlaying(false);
      cancelAnimationFrame(previewRafRef.current);
    } else {
      if (previewProgress >= 1) {
        previewAudioRef.current.currentTime = 0;
        setPreviewProgress(0);
      }
      previewAudioRef.current.play();
      setPreviewPlaying(true);

      const tick = () => {
        const a = previewAudioRef.current;
        if (a && a.duration) {
          setPreviewProgress(a.currentTime / a.duration);
        }
        previewRafRef.current = requestAnimationFrame(tick);
      };
      previewRafRef.current = requestAnimationFrame(tick);
    }
  };

  // Send
  const handleSend = async () => {
    if (!audioBlob || isSending) return;
    setIsSending(true);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    cancelAnimationFrame(previewRafRef.current);
    if (previewAudioRef.current?.src) URL.revokeObjectURL(previewAudioRef.current.src);
    await onSend(audioBlob, audioDuration);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(previewRafRef.current);
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        if (previewAudioRef.current.src) URL.revokeObjectURL(previewAudioRef.current.src);
      }
    };
  }, []);

  const fmtMs = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const fmtSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (phase === 'recording') {
    return (
      <div className="voice-recorder-bar">
        <button className="voice-recorder-cancel-btn" onClick={handleCancel} title="Cancel recording" aria-label="Cancel recording">
          <X size={16} />
        </button>

        <div className="voice-recorder-center">
          <span className="voice-rec-dot" aria-hidden="true" />
          <span className="voice-rec-waveform">
            {[...Array(7)].map((_, i) => (
              <span key={i} className="voice-rec-bar" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </span>
          <span className="voice-rec-timer">{fmtMs(recordingMs)}</span>
        </div>

        <button className="voice-recorder-stop-btn" onClick={handleStopRecording} title="Stop recording" aria-label="Stop recording">
          <Square size={14} fill="currentColor" />
        </button>
      </div>
    );
  }

  // Phase: preview
  return (
    <div className="voice-recorder-bar voice-preview-bar">
      <button className="voice-recorder-cancel-btn" onClick={handleCancel} title="Discard voice note" aria-label="Discard">
        <Trash2 size={15} />
      </button>

      <div className="voice-preview-player">
        <button className="voice-preview-play-btn" onClick={togglePreviewPlay} aria-label={previewPlaying ? 'Pause' : 'Play'}>
          {previewPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>

        <div className="voice-preview-track">
          <div className="voice-preview-track-fill" style={{ width: `${previewProgress * 100}%` }} />
        </div>

        <span className="voice-preview-dur">
          {previewPlaying
            ? fmtSec(previewProgress * audioDuration)
            : fmtSec(audioDuration)}
        </span>
      </div>

      <button
        className="voice-recorder-send-btn"
        onClick={handleSend}
        disabled={isSending}
        title="Send voice note"
        aria-label="Send voice note"
      >
        {isSending ? <span className="voice-sending-dot" /> : <Send size={16} />}
      </button>
    </div>
  );
}


// ─────────────────────────────────────────────
// VoiceNoteBubble — renders a received/sent voice note in the chat
// ─────────────────────────────────────────────
export function VoiceNoteBubble({ msg, isSelf, voiceTimer, onPlaybackEnded }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [hasPlayedToEnd, setHasPlayedToEnd] = useState(msg.voiceEnded || false);

  const audioRef = useRef(null);
  const rafRef = useRef(null);

  // Sync hasPlayedToEnd if msg.voiceEnded becomes true
  useEffect(() => {
    if (msg.voiceEnded) setHasPlayedToEnd(true);
  }, [msg.voiceEnded]);

  const initAudio = useCallback(() => {
    if (!msg.audioDataUrl || msg.isExpired) return null;
    if (audioRef.current) return audioRef.current;

    const audio = new Audio(msg.audioDataUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setPlaying(false);
      setProgress(1);
      setCurrentSec(msg.duration || 0);
      cancelAnimationFrame(rafRef.current);
      audioUtils.playVoiceNoteEndedSound?.();

      setHasPlayedToEnd(prev => {
        if (!prev) {
          // Notify parent so it can cancel 180s timer and start 60s post-listen timer
          if (!isSelf) {
            onPlaybackEnded(msg.id);
          }
          return true;
        }
        return prev;
      });
    };

    audio.onerror = () => {
      setPlaying(false);
    };

    return audio;
  }, [msg.audioDataUrl, msg.isExpired, msg.id, msg.duration, isSelf, onPlaybackEnded]);

  const togglePlay = () => {
    if (msg.isExpired) return;

    const audio = initAudio();
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    } else {
      if (progress >= 1) {
        audio.currentTime = 0;
        setProgress(0);
        setCurrentSec(0);
      }
      audio.play().catch(() => {});
      setPlaying(true);

      const tick = () => {
        if (audio.duration) {
          const p = audio.currentTime / audio.duration;
          setProgress(p);
          setCurrentSec(audio.currentTime);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  // Pause when message expires mid-play
  useEffect(() => {
    if (msg.isExpired && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    }
  }, [msg.isExpired]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current = null;
      }
    };
  }, []);

  const fmtSec = (sec) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}:${ss.toString().padStart(2, '0')}`;
  };

  const duration = msg.duration || 0;
  const displayTime = playing ? fmtSec(currentSec) : fmtSec(duration);

  // Determine active timer (from voiceTimer prop or falling back to msg timestamps)
  const activeTimer = voiceTimer || (msg.voiceExpiresAt && !msg.isExpired ? {
    expiresAt: msg.voiceExpiresAt,
    secondsLeft: Math.max(0, Math.ceil((msg.voiceExpiresAt - Date.now()) / 1000)),
    timerType: msg.voiceTimerType || (msg.voiceEnded ? 'listened' : 'unread')
  } : null);

  if (msg.isExpired || msg.isUnsent || (activeTimer && activeTimer.secondsLeft <= 0)) {
    return null;
  }

  return (
    <div className={`voice-note-bubble ${isSelf ? 'self' : 'peer'} ${playing ? 'playing' : ''}`}>
      {/* Play / Pause button */}
      <button
        className="vn-play-btn"
        onClick={togglePlay}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing
          ? <Pause size={15} fill="currentColor" />
          : <Play size={15} fill="currentColor" style={{ marginLeft: 1 }} />
        }
      </button>

      {/* Waveform track */}
      <div className="vn-track-area">
        <div className="vn-waveform">
          {/* Static waveform bars – visual decoration */}
          {[...Array(22)].map((_, i) => {
            const filled = progress * 22 > i;
            const heights = [40,60,80,55,75,90,65,50,85,70,45,80,60,75,50,65,90,70,55,80,45,60];
            return (
              <span
                key={i}
                className={`vn-bar ${filled ? 'filled' : ''}`}
                style={{ height: `${heights[i] || 60}%` }}
              />
            );
          })}
        </div>

        <div className="vn-time-row">
          <span className="vn-time">{displayTime}</span>
          {/* Active countdown: State 1 ("Expires in 180s") or State 2 ("Deletes in 60s") */}
          {activeTimer && (
            <span
              className={`vn-expiry-countdown ${activeTimer.timerType === 'listened' ? 'deletes' : 'expires'}`}
              title={activeTimer.timerType === 'listened' ? 'Deletes in 60s after playing' : 'Expires in 180s if unplayed'}
            >
              <Timer size={10} />
              {activeTimer.timerType === 'listened'
                ? `Deletes in ${activeTimer.secondsLeft}s`
                : `Expires in ${activeTimer.secondsLeft}s`}
            </span>
          )}
        </div>
      </div>

      {/* Mic icon on the right */}
      <Mic size={13} className="vn-mic-icon" />
    </div>
  );
}
