import React, { useState, useEffect } from 'react';
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
import JoinLinkView from './components/JoinLinkView';
import { generateSessionId, generatePasscode, deriveKey, hashPasscode } from './utils/crypto';
import { 
  playBurnSound, 
  playTickSound, 
  playSessionCreatedSound, 
  playConnectedSound, 
  playErrorSound, 
  playNotificationSound 
} from './utils/audio';
import './App.css';

export default function App() {
  const [view, setView] = useState('landing'); // landing|create|join|chat|expired|terms|privacy
  const [sessionId, setSessionId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [cryptoKey, setCryptoKey] = useState(null);
  const [clientId, setClientId] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [authTicket, setAuthTicket] = useState('');

  // Header-managed modals
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [clearChatModalOpen, setClearChatModalOpen] = useState(false);
  const [burnSessionModalOpen, setBurnSessionModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [joinToken, setJoinToken] = useState('');

  // Screen privacy
  const [screenPrivacyEnabled, setScreenPrivacyEnabled] = useState(false);
  const [isWindowBlurred, setIsWindowBlurred] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('u2u-theme') || 'dark'; } catch { return 'dark'; }
  });

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = (message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message }]);

    // Play appropriate notification sound
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

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('u2u-theme', theme); } catch {}
  }, [theme]);

  // Ephemeral client ID (session-scoped)
  useEffect(() => {
    let storedId = sessionStorage.getItem('u2u-client-id');
    if (!storedId) {
      storedId = 'c-' + Math.random().toString(36).slice(2, 9) + '-' + Date.now();
      sessionStorage.setItem('u2u-client-id', storedId);
    }
    setClientId(storedId);
  }, []);

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

  // ── Create Session (now server-authoritative) ──
  const handleStartCreate = async () => {
    const newSessionId = generateSessionId();
    const newPasscode = generatePasscode();
    const pcHash = await hashPasscode(newPasscode);
    const key = await deriveKey(newPasscode, newSessionId);

    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId: newSessionId, 
          passcodeHash: pcHash,
          passcode: newPasscode
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

  // ── Join with verified join link ──
  const handleJoinWithLink = async (targetSessionId, targetPasscode, ticket, expAt) => {
    const key = await deriveKey(targetPasscode, targetSessionId);

    setSessionId(targetSessionId);
    setPasscode(targetPasscode);
    setCryptoKey(key);
    setExpiresAt(expAt);
    setAuthTicket(ticket);

    try {
      window.history.pushState(null, '', '/');
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

  // ── Join Session (strict server verification) ──
  const handleJoinSubmit = async (inputSessionId, inputPasscode) => {
    const cleanId = inputSessionId.trim().toUpperCase();
    const cleanPasscode = inputPasscode.trim();
    const pcHash = await hashPasscode(cleanPasscode);
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

    // Small connection animation delay
    return new Promise(resolve => {
      setTimeout(() => {
        playConnectedSound();
        setView('chat');
        addToast('Connected securely');
        resolve();
      }, 650);
    });
  };

  // ── Enter chat from Create flow (re-auth with creator ticket) ──
  const handleEnterChat = async () => {
    // Creator already has ticket from create API; get a fresh one via re-auth
    const pcHash = await hashPasscode(passcode);
    try {
      const res = await fetch('/api/session/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, passcodeHash: pcHash, clientId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAuthTicket(data.ticket);
    } catch {
      // Fallback to existing creator ticket (still valid for 60s)
    }
    playConnectedSound();
    setView('chat');
    addToast('Connected securely');
  };

  const resetSession = () => {
    setSessionId('');
    setPasscode('');
    setCryptoKey(null);
    setExpiresAt(null);
    setAuthTicket('');
    setJoinToken('');
    try {
      if (window.location.pathname !== '/') {
        window.history.pushState(null, '', '/');
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

  // Connection status for header (passed down from ChatView via prop drilling or via ref — simplified here)
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [peerPresent, setPeerPresent] = useState(false);

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
        connectionStatus={connectionStatus}
        peerPresent={peerPresent}
        onOpenSecurity={() => setSecurityModalOpen(true)}
        onOpenClearChat={() => setClearChatModalOpen(true)}
        onOpenBurnSession={() => setBurnSessionModalOpen(true)}
        onOpenLeave={() => setLeaveModalOpen(true)}
        onLeaveSession={handleLeaveSession}
        screenPrivacyEnabled={screenPrivacyEnabled}
        setScreenPrivacyEnabled={setScreenPrivacyEnabled}
        theme={theme}
        setTheme={setTheme}
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
              try { window.history.pushState(null, '', '/'); } catch {}
              setView('landing');
            }}
            onToast={addToast}
          />
        )}

        {view === 'chat' && cryptoKey && (
          <ChatView
            sessionId={sessionId}
            passcode={passcode}
            cryptoKey={cryptoKey}
            clientId={clientId}
            authTicket={authTicket}
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

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">{t.message}</div>
        ))}
      </div>
    </div>
  );
}
