import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import LandingView from './components/LandingView';
import CreateSessionView from './components/CreateSessionView';
import JoinSessionView from './components/JoinSessionView';
import ChatView from './components/ChatView';
import ExpiredView from './components/ExpiredView';
import TermsView from './components/TermsView';
import PrivacyView from './components/PrivacyView';
import SecurityModal from './components/modals/SecurityModal';
import JoinLinkView from './components/JoinLinkView';
import IdentitySelectionView from './components/IdentitySelectionView';
import MaintenanceView from './components/MaintenanceView';
import MobileAppHandoffView from './components/MobileAppHandoffView';
import CreateProfileModal from './components/modals/CreateProfileModal';
import UnlockProfileModal from './components/modals/UnlockProfileModal';
import DeleteProfileModal from './components/modals/DeleteProfileModal';
import PwaInstallPrompt from './components/PwaInstallPrompt';
import CinematicLaunch from './components/CinematicLaunch';
import { isAndroidPlatform } from './utils/platform';
import { getApiUrl } from './utils/apiConfig';
import { canAccessWebChat, setDesktopOverride } from './utils/platformRouting';
import { getActiveProfile, obliterateLocalProfile } from './utils/profileCrypto';
import { generateAnonymousName } from './utils/identity';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { generateSessionId, generatePasscode, deriveKey, hashPasscode } from './utils/crypto';
import { 
  playSessionCreatedSound, 
  playConnectedSound, 
  playErrorSound, 
  playNotificationSound
} from './utils/audio';
import './App.css';

export default function App() {
  const [showLaunchReveal, setShowLaunchReveal] = useState(() => {
    try {
      if (sessionStorage.getItem('u2u-launch-seen')) return false;
      sessionStorage.setItem('u2u-launch-seen', '1');
      return true;
    } catch {
      return true;
    }
  });
  const [view, setView] = useState('landing'); // landing|create|join|join-link|identity-select|chat|expired|terms|privacy|mobile-handoff
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

  // Permanent Profile & Identity State
  const [activeProfile, setActiveProfile] = useState(() => getActiveProfile());
  const [selfIdentity, setSelfIdentity] = useState(() => {
    const profile = getActiveProfile();
    if (profile) {
      return { displayName: profile.username, avatar: profile.avatar, isPermanent: true };
    }
    return { displayName: generateAnonymousName(), avatar: 'neon-neko' };
  });
  const [peerIdentity, setPeerIdentity] = useState(null);
  const [identityHeaderVisible, setIdentityHeaderVisible] = useState(true);

  // Profile Modals
  const [createProfileModalOpen, setCreateProfileModalOpen] = useState(false);
  const [unlockProfileModalOpen, setUnlockProfileModalOpen] = useState(false);
  const [deleteProfileModalOpen, setDeleteProfileModalOpen] = useState(false);

  // Maintenance State
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceData, setMaintenanceData] = useState(null);

  // Mobile handoff state
  const [handoffToken, setHandoffToken] = useState('');
  const [handoffPasscode, setHandoffPasscode] = useState('');

  // Header-managed modals
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [clearChatModalOpen, setClearChatModalOpen] = useState(false);
  const [burnSessionModalOpen, setBurnSessionModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [joinToken, setJoinToken] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Connection & peer presence state for header synchronization
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [peerPresent, setPeerPresent] = useState(false);

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

  // ── Maintenance Status Polling ──
  const checkMaintenanceStatus = useCallback(async () => {
    try {
      const res = await fetch(getApiUrl('/api/maintenance/status'));
      if (res.ok) {
        const data = await res.json();
        if (data.maintenance) {
          setMaintenanceMode(true);
          setMaintenanceData(data);
          return true;
        } else {
          setMaintenanceMode(false);
          setMaintenanceData(null);
          return false;
        }
      }
    } catch {}
    return false;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    checkMaintenanceStatus();
    const interval = setInterval(checkMaintenanceStatus, 30000);
    return () => clearInterval(interval);
  }, [checkMaintenanceStatus]);

  // Refresh ticket on token expiration using session credentials
  const handleRefreshTicket = useCallback(async () => {
    if (!passcode || !sessionId) return null;
    try {
      const pcHash = await hashPasscode(passcode, sessionId);
      const res = await fetch(getApiUrl('/api/session/auth'), {
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

  // Native Android hardware back-button and StatusBar integration
  const lastBackPressRef = useRef(0);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#0e0f12' });
    } catch {}

    const backListenerPromise = CapApp.addListener('backButton', () => {
      // 1. Close any open modal first
      if (createProfileModalOpen) {
        setCreateProfileModalOpen(false);
        return;
      }
      if (unlockProfileModalOpen) {
        setUnlockProfileModalOpen(false);
        return;
      }
      if (deleteProfileModalOpen) {
        setDeleteProfileModalOpen(false);
        return;
      }
      if (securityModalOpen) {
        setSecurityModalOpen(false);
        return;
      }
      if (clearChatModalOpen) {
        setClearChatModalOpen(false);
        return;
      }
      if (burnSessionModalOpen) {
        setBurnSessionModalOpen(false);
        return;
      }
      if (leaveModalOpen) {
        setLeaveModalOpen(false);
        return;
      }

      // 2. Sub-views return to landing
      if (view === 'create' || view === 'join' || view === 'join-link' || view === 'terms' || view === 'privacy' || view === 'mobile-handoff') {
        setView('landing');
        return;
      }

      if (view === 'identity-select') {
        // Return to previous preparation screen
        if (sessionId && passcode) {
          setView('create');
        } else {
          setView('landing');
        }
        return;
      }

      // 3. In active chat: open Leave confirmation modal so ephemeral session is never accidentally lost
      if (view === 'chat') {
        setLeaveModalOpen(true);
        return;
      }

      // 4. On landing or expired: double-press back to exit app cleanly
      if (view === 'landing' || view === 'expired') {
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          addToast('Press back again to exit');
        }
      }
    });

    const urlListenerPromise = CapApp.addListener('appUrlOpen', (data) => {
      try {
        const urlStr = data.url;
        const match = urlStr.match(/\/join\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          setJoinToken(match[1]);
          setView('join-link');
        }
      } catch {}
    });

    return () => {
      backListenerPromise.then(l => l.remove()).catch(() => {});
      urlListenerPromise.then(l => l.remove()).catch(() => {});
    };
  }, [
    view,
    sessionId,
    passcode,
    createProfileModalOpen,
    unlockProfileModalOpen,
    deleteProfileModalOpen,
    securityModalOpen,
    clearChatModalOpen,
    burnSessionModalOpen,
    leaveModalOpen
  ]);

  // Route detection: Listen for /join/:token in URL
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/join\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        if (!canAccessWebChat()) {
          // Mobile browser without desktop override: show handoff & installation guidance
          const fragmentPasscode = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
          setHandoffToken(match[1]);
          setHandoffPasscode(fragmentPasscode);
          setView('mobile-handoff');
        } else {
          setJoinToken(match[1]);
          setView('join-link');
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // ── Create Session (Server-Authoritative & Zero-Knowledge) ──
  const handleStartCreate = async () => {
    if (!canAccessWebChat()) {
      setView('mobile-handoff');
      return;
    }

    if (isCreatingSession) return;
    setIsCreatingSession(true);

    const targetUrl = getApiUrl('/api/session/create');
    console.log('[U2U] Create Session initiated, target:', targetUrl);

    try {
      const newSessionId = generateSessionId();
      const newPasscode = generatePasscode();
      const pcHash = await hashPasscode(newPasscode, newSessionId);
      const key = await deriveKey(newPasscode, newSessionId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ 
          sessionId: newSessionId, 
          passcodeHash: pcHash
        })
      });
      clearTimeout(timeoutId);

      let data = null;
      try {
        data = await res.json();
      } catch {}

      if (res.status === 503 && data?.code === 'MAINTENANCE_MODE') {
        setMaintenanceMode(true);
        setMaintenanceData(data);
        return;
      }

      if (!res.ok) {
        const errorMsg = data?.error || data?.message ||
          (res.status === 429 ? 'Too many session requests. Please wait a moment.' :
           res.status >= 500 ? 'Server is currently waking up or unavailable. Please retry in a few seconds.' :
           `Could not create session (HTTP ${res.status}).`);
        throw new Error(errorMsg);
      }

      setSessionId(newSessionId);
      setPasscode(newPasscode);
      setCryptoKey(key);
      setExpiresAt(data.expiresAt);
      setAuthTicket(data.ticket);
      setJoinToken(data.joinToken);
      playSessionCreatedSound();
      setView('create');
      console.log('[U2U] Session created successfully');
    } catch (err) {
      console.warn('[U2U] Session creation failed:', err.name, err.message);
      let userMsg = err.message || 'Could not create session';
      if (err.name === 'AbortError') {
        userMsg = 'Connection timed out. The server may be waking up, please try again.';
      } else if (err.name === 'TypeError' || userMsg.includes('fetch') || userMsg.includes('NetworkError')) {
        userMsg = 'Unable to connect to the U2U server. Please check your internet connection.';
      }
      addToast(userMsg);
    } finally {
      setIsCreatingSession(false);
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

    // Immediately sanitize browser URL and clear fragment
    try {
      const search = window.location.search;
      window.history.replaceState(null, '', '/' + (search || ''));
    } catch {}

    // Show identity selection before chat entry
    setView('identity-select');
    return Promise.resolve();
  };

  // ── Join Session (Strict server verification + client key derivation) ──
  const handleJoinSubmit = async (inputSessionId, inputPasscode) => {
    const cleanId = inputSessionId.trim().toUpperCase();
    const cleanPasscode = inputPasscode.trim();
    const pcHash = await hashPasscode(cleanPasscode, cleanId);
    const key = await deriveKey(cleanPasscode, cleanId);

    const targetUrl = getApiUrl('/api/session/auth');

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: cleanId, passcodeHash: pcHash, clientId })
      });

      let data = null;
      try {
        data = await res.json();
      } catch {}

      if (res.status === 503 && data?.code === 'MAINTENANCE_MODE') {
        setMaintenanceMode(true);
        setMaintenanceData(data);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "We couldn't verify this session.");
      }

      setSessionId(cleanId);
      setPasscode(cleanPasscode);
      setCryptoKey(key);
      setExpiresAt(data.expiresAt);
      setAuthTicket(data.ticket);

      setView('identity-select');
      return Promise.resolve();
    } catch (err) {
      console.warn('[U2U] Join session failed:', err.message);
      let userMsg = err.message || "We couldn't verify this session.";
      if (err.name === 'TypeError' || userMsg.includes('fetch')) {
        userMsg = 'Unable to connect to U2U server. Please check your internet connection.';
      }
      throw new Error(userMsg);
    }
  };

  // ── Enter identity-select from Create flow ──
  const handleEnterChatFromCreate = async () => {
    const pcHash = await hashPasscode(passcode, sessionId);
    try {
      const res = await fetch(getApiUrl('/api/session/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, passcodeHash: pcHash, clientId })
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setAuthTicket(data.ticket);
      }
    } catch {}
    setView('identity-select');
  };

  // ── Identity confirmed -> Enter Chat ──
  const handleConfirmIdentity = (chosenIdentity) => {
    setSelfIdentity(chosenIdentity);
    setIdentityHeaderVisible(true);
    playConnectedSound();
    setView('chat');
    addToast('Connected securely');
  };

  const handleCancelIdentitySelection = () => {
    if (sessionId && passcode) {
      setView('create');
    } else {
      setView('landing');
    }
  };

  // ── Permanent Profile Handlers ──
  const handleProfileCreated = (profile) => {
    setActiveProfile(profile);
    setSelfIdentity({
      displayName: profile.username,
      avatar: profile.avatar,
      isPermanent: true
    });
    setCreateProfileModalOpen(false);
    addToast(`Permanent profile created: @${profile.username}`);
  };

  const handleProfileUnlocked = (profile) => {
    setActiveProfile(profile);
    setSelfIdentity({
      displayName: profile.username,
      avatar: profile.avatar,
      isPermanent: true
    });
    setUnlockProfileModalOpen(false);
    addToast(`Welcome back, @${profile.username}`);
  };

  const handleProfileDeleted = () => {
    obliterateLocalProfile();
    setActiveProfile(null);
    setSelfIdentity({
      displayName: generateAnonymousName(),
      avatar: 'neon-neko'
    });
    setDeleteProfileModalOpen(false);
    setView('landing');
    addToast('Your permanent profile has been deleted. This action cannot be undone.');
  };

  // ── Mobile handoff fallback to desktop ──
  const handleContinueWebFromHandoff = () => {
    setDesktopOverride(true);
    if (handoffToken) {
      setJoinToken(handoffToken);
      setView('join-link');
    } else {
      setView('landing');
    }
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
    setPeerIdentity(null);
    setIdentityHeaderVisible(true);
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

      {/* Header rendered for all views EXCEPT the marketing landing page (which owns its own .site-nav) */}
      {view !== 'landing' && (
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
          theme={theme}
          setTheme={setTheme}
          chatHeaderVisible={chatHeaderVisible}
          onHeaderInteraction={resetHeaderHideTimer}
          onHeaderMenuChange={handleHeaderMenuChange}
          selfIdentity={selfIdentity}
          peerIdentity={peerIdentity}
          identityHeaderVisible={identityHeaderVisible}
          activeProfile={activeProfile}
          onOpenDeleteProfile={() => setDeleteProfileModalOpen(true)}
        />
      )}

      <main className="u2u-main">
        {/* Maintenance View takes full precedence when operator activates it */}
        {maintenanceMode ? (
          <MaintenanceView
            status={maintenanceData}
            onRetry={checkMaintenanceStatus}
          />
        ) : (
          <>
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
                onOpenCreateProfile={() => setCreateProfileModalOpen(true)}
                onOpenUnlockProfile={() => setUnlockProfileModalOpen(true)}
                activeProfile={activeProfile}
                onToast={addToast}
                isCreating={isCreatingSession}
              />
            )}

            {view === 'create' && (
              <CreateSessionView
                sessionId={sessionId}
                passcode={passcode}
                expiresAt={expiresAt}
                joinToken={joinToken}
                onEnterChat={handleEnterChatFromCreate}
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

            {view === 'mobile-handoff' && (
              <MobileAppHandoffView
                token={handoffToken}
                passcode={handoffPasscode}
                onContinueWeb={handleContinueWebFromHandoff}
                onGoHome={() => setView('landing')}
              />
            )}

            {view === 'identity-select' && (
              <IdentitySelectionView
                initialIdentity={selfIdentity}
                onConfirm={handleConfirmIdentity}
                onCancel={handleCancelIdentitySelection}
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
                selfIdentity={selfIdentity}
                onPeerIdentityChange={setPeerIdentity}
                onScrollDirectionChange={(dir) => setIdentityHeaderVisible(dir === 'up')}
              />
            )}

            {view === 'expired' && (
              <ExpiredView onCreateNew={handleStartCreate} />
            )}
          </>
        )}
      </main>

      {/* Global Security Modal */}
      {view !== 'chat' && (
        <SecurityModal isOpen={securityModalOpen} onClose={() => setSecurityModalOpen(false)} />
      )}

      {/* Profile Modals */}
      <CreateProfileModal
        isOpen={createProfileModalOpen}
        onClose={() => setCreateProfileModalOpen(false)}
        onProfileCreated={handleProfileCreated}
      />
      <UnlockProfileModal
        isOpen={unlockProfileModalOpen}
        onClose={() => setUnlockProfileModalOpen(false)}
        onProfileUnlocked={handleProfileUnlocked}
      />
      <DeleteProfileModal
        isOpen={deleteProfileModalOpen}
        onClose={() => setDeleteProfileModalOpen(false)}
        activeProfile={activeProfile}
        onProfileDeleted={handleProfileDeleted}
      />

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
