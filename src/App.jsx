import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import LandingView from './components/LandingView';
import CreateSessionView from './components/CreateSessionView';
import JoinSessionView from './components/JoinSessionView';
import ChatView from './components/ChatView';
import ExpiredView from './components/ExpiredView';
import ScreenPrivacyShield from './components/ScreenPrivacyShield';
import TermsView from './components/TermsView';
import PrivacyView from './components/PrivacyView';
import SecurityModal from './components/modals/SecurityModal';
import WhatsNewModal from './components/modals/WhatsNewModal';
import JoinLinkView from './components/JoinLinkView';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import CinematicLaunch from './components/CinematicLaunch';
import { isAndroidPlatform } from './utils/platform';
import { generateSessionId, generatePasscode, deriveKey, hashPasscode } from './utils/crypto';
import { 
  playSessionCreatedSound, 
  playConnectedSound, 
  playErrorSound, 
  playNotificationSound 
} from './utils/audio';
import './App.css';

export default function App() {
  const [showLaunchReveal, setShowLaunchReveal] = useState(true);
  const [view, setView] = useState('landing'); // landing|create|join|chat|expired|terms|privacy
  const [sessionId, setSessionId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [cryptoKey, setCryptoKey] = useState(null);
  const [clientId] = useState(() => {
    try {
      let storedId = sessionStorage.getItem('u2u-client-id');
      if (!storedId) {
        storedId = 'c-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now();
        sessionStorage.setItem('u2u-client-id', storedId);
      }
      return storedId;
    } catch {
      return 'c-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now();
    }
  });
  const [expiresAt, setExpiresAt] = useState(null);
  const [authTicket, setAuthTicket] = useState('');

  // Header-managed modals
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [whatsNewModalOpen, setWhatsNewModalOpen] = useState(false);
  const [clearChatModalOpen, setClearChatModalOpen] = useState(false);
  const [burnSessionModalOpen, setBurnSessionModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [joinToken, setJoinToken] = useState('');

  // Connection & peer presence state for header synchronization
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [peerPresent, setPeerPresent] = useState(false);

  // Screen privacy
  const [screenPrivacyEnabled, setScreenPrivacyEnabled] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('u2u-theme') || 'dark'; } catch { return 'dark'; }
  });

  // Android chat-only header auto-hide state & timer
  const [chatHeaderVisible, setChatHeaderVisible] = useState(true);
  const [_isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const isHeaderMenuOpenRef = useRef(false);
  const headerHideTimerRef = useRef(null);

  const resetHeaderHideTimer = useCallback(() => {
    if (headerHideTimerRef.current) {
      clearTimeout(headerHideTimerRef.current);
      headerHideTimerRef.current = null;
    }
    setChatHeaderVisible(true);
    // Never auto-hide while the header dropdown menu is open
    if (isHeaderMenuOpenRef.current) {
      return;
    }
    // Auto-hide after approximately 3 seconds of inactivity
    headerHideTimerRef.current = setTimeout(() => {
      if (!isHeaderMenuOpenRef.current) {
        setChatHeaderVisible(false);
      }
    }, 3000);
  }, []);

  const handleHeaderMenuChange = useCallback((isOpen) => {
    isHeaderMenuOpenRef.current = isOpen;
    setIsHeaderMenuOpen(isOpen);
    if (isOpen) {
      if (headerHideTimerRef.current) {
        clearTimeout(headerHideTimerRef.current);
        headerHideTimerRef.current = null;
      }
      setChatHeaderVisible(true);
    } else {
      if (view === 'chat' && isAndroidPlatform()) {
        resetHeaderHideTimer();
      }
    }
  }, [view, resetHeaderHideTimer]);

  // Start 3-second timer only upon successfully entering active chat; clean up on leave
  useEffect(() => {
    if (view === 'chat' && isAndroidPlatform()) {
      // eslint-disable-next-line react/set-state-in-effect
      resetHeaderHideTimer();
    } else {
      if (headerHideTimerRef.current) {
        clearTimeout(headerHideTimerRef.current);
        headerHideTimerRef.current = null;
      }
      // eslint-disable-next-line react/set-state-in-effect
      setChatHeaderVisible(true);
    }
    return () => {
      if (headerHideTimerRef.current) {
        clearTimeout(headerHideTimerRef.current);
        headerHideTimerRef.current = null;
      }
    };
  }, [view, resetHeaderHideTimer]);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message }]);

    const lower = String(message || '').toLowerCase();
    if (lower.includes('error') || lower.includes('fail') || lower.includes('denied') || lower.includes("couldn't")) {
      playErrorSound();
    } else {
      playNotificationSound();
    }

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2800);
  };

  // Refresh ticket on token expiration using session credentials
  const handleRefreshTicket = useCallback(async () => {
    if (!passcode || !sessionId) return null;
    try {
      const pcHash = await hashPasscode(passcode, sessionId);
      const res = await fetch('/api/session/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, passcodeHash: pcHash, clientId })
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setAuthTicket(data.ticket);
        return data.ticket;
      }
    } catch {}
    return null;
  }, [passcode, sessionId, clientId]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('u2u-theme', theme); } catch {}
  }, [theme]);

  // Screen privacy: blur on tab change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && screenPrivacyEnabled && view === 'chat') {
        setIsWindowBlurred(true);
      }
    };
    const handleBlur = () => {
      if (screenPrivacyEnabled && view === 'chat') setIsWindowBlurred(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [screenPrivacyEnabled, view]);

  // Route detection: Listen for /join/:token in URL
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/join\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setJoinToken(match[1]);
        setView('join-link');
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // ── Create Session (Server-Authoritative & Zero-Knowledge) ──
  const handleStartCreate = async () => {
    const newSessionId = generateSessionId();
    const newPasscode = generatePasscode();
    const pcHash = await hashPasscode(newPasscode, newSessionId);
    const key = await deriveKey(newPasscode, newSessionId);

    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: newSessionId, 
          passcodeHash: pcHash
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create session');

      setSessionId(newSessionId);
      setPasscode(newPasscode);
      setCryptoKey(key);
      setExpiresAt(data.expiresAt);
      setAuthTicket(data.ticket);
      setJoinToken(data.joinToken);
      playSessionCreatedSound();
      setView('create');
    } catch (err) {
      addToast(err.message || 'Could not create session');
    }
  };

  // ── Join with verified zero-knowledge join link ──
  const handleJoinWithLink = async (targetSessionId, targetPasscode, ticket, expAt) => {
    const key = await deriveKey(targetPasscode, targetSessionId);

    setSessionId(targetSessionId);
    setPasscode(targetPasscode);
    setCryptoKey(key);
    setExpiresAt(expAt);
    setAuthTicket(ticket);

    // Immediately sanitize browser URL and clear fragment (preserving query params)
    try {
      const search = window.location.search;
      window.history.replaceState(null, '', '/' + (search || ''));
    } catch {}

    return new Promise(resolve => {
      setTimeout(() => {
        playConnectedSound();
        setView('chat');
        addToast('Connected securely');
        resolve();
      }, 450);
    });
  };

  // ── Join Session (Strict server verification + client key derivation) ──
  const handleJoinSubmit = async (inputSessionId, inputPasscode) => {
    const cleanId = inputSessionId.trim().toUpperCase();
    const cleanPasscode = inputPasscode.trim();
    const pcHash = await hashPasscode(cleanPasscode, cleanId);
    const key = await deriveKey(cleanPasscode, cleanId);

    const res = await fetch('/api/session/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: cleanId, passcodeHash: pcHash, clientId })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "We couldn't verify this session.");

    setSessionId(cleanId);
    setPasscode(cleanPasscode);
    setCryptoKey(key);
    setExpiresAt(data.expiresAt);
    setAuthTicket(data.ticket);

    return new Promise(resolve => {
      setTimeout(() => {
        playConnectedSound();
        setView('chat');
        addToast('Connected securely');
        resolve();
      }, 650);
    });
  };

  // ── Enter chat from Create flow ──
  const handleEnterChat = async () => {
    const pcHash = await hashPasscode(passcode, sessionId);
    try {
      const res = await fetch('/api/session/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, passcodeHash: pcHash, clientId })
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setAuthTicket(data.ticket);
      }
    } catch {
      // Fallback to existing creator ticket
    }
    playConnectedSound();
    setView('chat');
    addToast('Connected securely');
  };

  const resetSession = () => {
    if (headerHideTimerRef.current) {
      clearTimeout(headerHideTimerRef.current);
      headerHideTimerRef.current = null;
    }
    setSessionId('');
    setPasscode('');
    setCryptoKey(null);
    setExpiresAt(null);
    setAuthTicket('');
    setJoinToken('');
    setConnectionStatus('offline');
    setPeerPresent(false);
    setChatHeaderVisible(true);
    try {
      if (window.location.pathname !== '/') {
        const search = window.location.search;
        window.history.replaceState(null, '', '/' + (search || ''));
      }
    } catch {}
  };

  const handleLeaveSession = () => {
    resetSession();
    setView('landing');
    addToast('Left session');
  };

  const handleSessionBurned = () => {
    resetSession();
    setView('landing');
    addToast("It's gone.");
  };

  const handleSessionExpired = () => {
    resetSession();
    setView('expired');
  };

  return (
    <div className="u2u-container">
      {/* Ambient background lighting for glass depth */}
      <div className="ambient-background" aria-hidden="true">
        <div className="ambient-orb ambient-orb-1" />
        <div className="ambient-orb ambient-orb-2" />
        <div className="ambient-orb ambient-orb-3" />
        <div className="ambient-subtle-glow" />
      </div>

      <Header
        view={view}
        setView={setView}
        sessionId={sessionId}
        expiresAt={expiresAt}
        connectionStatus={view === 'chat' ? connectionStatus : undefined}
        peerPresent={view === 'chat' ? peerPresent : false}
        onOpenSecurity={() => setSecurityModalOpen(true)}
        onOpenClearChat={() => setClearChatModalOpen(true)}
        onOpenBurnSession={() => setBurnSessionModalOpen(true)}
        onOpenLeave={() => setLeaveModalOpen(true)}
        onLeaveSession={handleLeaveSession}
        screenPrivacyEnabled={screenPrivacyEnabled}
        setScreenPrivacyEnabled={setScreenPrivacyEnabled}
        theme={theme}
        setTheme={setTheme}
        chatHeaderVisible={chatHeaderVisible}
        onHeaderInteraction={resetHeaderHideTimer}
        onHeaderMenuChange={handleHeaderMenuChange}
      />

      <main className="u2u-main">
        {view === 'terms' && (
          <TermsView onBack={() => setView('landing')} />
        )}

        {view === 'privacy' && (
          <PrivacyView onBack={() => setView('landing')} />
        )}

        {view === 'landing' && (
          <LandingView
            onCreateClick={handleStartCreate}
            onJoinClick={() => setView('join')}
            onOpenSecurity={() => setSecurityModalOpen(true)}
            onOpenTerms={() => setView('terms')}
            onOpenPrivacy={() => setView('privacy')}
            onOpenWhatsNew={() => setWhatsNewModalOpen(true)}
          />
        )}

        {view === 'create' && (
          <CreateSessionView
            sessionId={sessionId}
            passcode={passcode}
            expiresAt={expiresAt}
            joinToken={joinToken}
            onEnterChat={handleEnterChat}
            onToast={addToast}
          />
        )}

        {view === 'join' && (
          <JoinSessionView
            onJoinSubmit={handleJoinSubmit}
            onCreateClick={handleStartCreate}
            onBackClick={() => setView('landing')}
          />
        )}

        {view === 'join-link' && (
          <JoinLinkView
            token={joinToken}
            clientId={clientId}
            onJoinSuccess={handleJoinWithLink}
            onCreateClick={handleStartCreate}
            onGoHome={() => {
              try { window.history.replaceState(null, '', '/'); } catch {}
              setView('landing');
            }}
            onToast={addToast}
          />
        )}

        {view === 'chat' && cryptoKey && (
          <ChatView
            sessionId={sessionId}
            cryptoKey={cryptoKey}
            clientId={clientId}
            authTicket={authTicket}
            connectionStatus={connectionStatus}
            setConnectionStatus={setConnectionStatus}
            peerPresent={peerPresent}
            setPeerPresent={setPeerPresent}
            onRefreshTicket={handleRefreshTicket}
            onLeave={handleLeaveSession}
            onSessionBurned={handleSessionBurned}
            onSessionExpired={handleSessionExpired}
            onToast={addToast}
            securityModalOpen={securityModalOpen}
            setSecurityModalOpen={setSecurityModalOpen}
            clearChatModalOpen={clearChatModalOpen}
            setClearChatModalOpen={setClearChatModalOpen}
            burnSessionModalOpen={burnSessionModalOpen}
            setBurnSessionModalOpen={setBurnSessionModalOpen}
            leaveModalOpen={leaveModalOpen}
            setLeaveModalOpen={setLeaveModalOpen}
            onRevealHeader={resetHeaderHideTimer}
          />
        )}

        {view === 'expired' && (
          <ExpiredView onCreateNew={handleStartCreate} />
        )}

        {/* Screen Privacy Shield */}
        {screenPrivacyEnabled && isWindowBlurred && view === 'chat' && (
          <ScreenPrivacyShield onDismiss={() => setIsWindowBlurred(false)} />
        )}
      </main>

      {/* Global modals for landing/create */}
      {view !== 'chat' && (
        <SecurityModal isOpen={securityModalOpen} onClose={() => setSecurityModalOpen(false)} />
      )}
      <WhatsNewModal isOpen={whatsNewModalOpen} onClose={() => setWhatsNewModalOpen(false)} />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">{t.message}</div>
        ))}
      </div>

      {/* PWA Install Prompt */}
      <PwaInstallPrompt />

      {/* Cinematic Launch — 3D Logo Reveal */}
      {showLaunchReveal && (
        <CinematicLaunch onComplete={() => setShowLaunchReveal(false)} />
      )}
    </div>
  );
}
