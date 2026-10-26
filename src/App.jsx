import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
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
import NativeAppLauncher from './components/NativeAppLauncher';
import { getApiUrl, isNativeAndroid } from './utils/apiConfig';
import { canAccessWebChat, setDesktopOverride } from './utils/platformRouting';
import { getActiveProfile, obliterateLocalProfile } from './utils/profileCrypto';
import { generateAnonymousName } from './utils/identity';
import { getStoredActiveSession, saveActiveSession, clearActiveSession } from './utils/sessionStore';
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
  const isNative = isNativeAndroid();
  const initialSession = getStoredActiveSession();

  const [showLaunchReveal, setShowLaunchReveal] = useState(() => {
    try {
      if (sessionStorage.getItem('u2u-launch-seen')) return false;
      sessionStorage.setItem('u2u-launch-seen', '1');
      return true;
    } catch {
      return true;
    }
  });

  // Distinct top-level entry experiences:
  // - Native Android APK: opens directly into the dedicated native messaging app launcher
  // - Web (desktop/mobile browser): opens into the marketing website landing page
  // - Deep links (/join/:token) and active unexpired sessions take precedence
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined' && window.location) {
      const match = window.location.pathname.match(/^\/join\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        if (!isNative && !canAccessWebChat()) {
          return 'mobile-handoff';
        }
        return 'join-link';
      }
    }

    if (initialSession && initialSession.sessionId && initialSession.expiresAt > Date.now()) {
      return initialSession.view || 'chat';
    }

    return isNative ? 'app-launcher' : 'landing';
  });

  const [sessionId, setSessionId] = useState(() => initialSession?.sessionId || '');
  const [passcode, setPasscode] = useState(() => initialSession?.passcode || '');
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
  const [expiresAt, setExpiresAt] = useState(() => initialSession?.expiresAt || null);
  const [authTicket, setAuthTicket] = useState(() => initialSession?.authTicket || '');
  const [joinToken, setJoinToken] = useState(() => initialSession?.joinToken || '');

  const homeView = isNative ? 'app-launcher' : 'landing';

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
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Derive cryptographic key upon active session restoration if not yet cached in state
  useEffect(() => {
    if (sessionId && passcode && !cryptoKey) {
      let isCancelled = false;
      deriveKey(passcode, sessionId).then(key => {
        if (!isCancelled && key) {
          setCryptoKey(key);
        }
      }).catch(err => {
        console.warn('[U2U] Key derivation on session restoration failed:', err);
      });
      return () => { isCancelled = true; };
    }
  }, [sessionId, passcode, cryptoKey]);

  // Synchronize u2u-native class on html element strictly for native Android
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isNative) {
      document.documentElement.classList.add('u2u-native');
    } else {
      document.documentElement.classList.remove('u2u-native');
    }
  }, [isNative]);

  // Synchronize active chat session state to session store for resilient app resume
  useEffect(() => {
    if (view === 'chat' && sessionId && passcode && expiresAt) {
      saveActiveSession({
        sessionId,
        passcode,
        expiresAt,
        authTicket,
        joinToken,
        view: 'chat'
      });
    }
  }, [view, sessionId, passcode, expiresAt, authTicket, joinToken]);

  // Connection & peer presence state for header synchronization
  const [connectionStatus, setConnectionStatus] = useState('offline');
  const [peerPresent, setPeerPresent] = useState(false);

  // Theme
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('u2u-theme') || 'dark'; } catch { return 'dark'; }
  });

  // Android chat header state (permanently visible for native mobile reliability)
  const [chatHeaderVisible, setChatHeaderVisible] = useState(true);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const isHeaderMenuOpenRef = useRef(false);

  const resetHeaderHideTimer = useCallback(() => {
    setChatHeaderVisible(true);
  }, []);

  const handleHeaderMenuChange = useCallback((isOpen) => {
    isHeaderMenuOpenRef.current = isOpen;
    setIsHeaderMenuOpen(isOpen);
    setChatHeaderVisible(true);
  }, []);

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
      // 0. Close navigation drawer first if open
      if (isHeaderMenuOpenRef.current) {
        isHeaderMenuOpenRef.current = false;
        setIsHeaderMenuOpen(false);
        return;
      }

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

      // 2. Sub-views return to homeView (app-launcher on native, landing on web)
      if (view === 'create' || view === 'join' || view === 'join-link' || view === 'terms' || view === 'privacy' || view === 'mobile-handoff') {
        setView(homeView);
        return;
      }

      if (view === 'identity-select') {
        // Return to previous preparation screen
        if (sessionId && passcode) {
          setView('create');
        } else {
          setView(homeView);
        }
        return;
      }

      // 3. In active chat: open Leave confirmation modal so ephemeral session is never accidentally lost
      if (view === 'chat') {
        setLeaveModalOpen(true);
        return;
      }

      // 4. On home screen or expired: double-press back to exit app cleanly
      if (view === homeView || view === 'expired') {
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
          const hashMatch = urlStr.match(/#([a-zA-Z0-9_-]+)/);
          if (hashMatch && hashMatch[1] && typeof window !== 'undefined') {
            window.location.hash = hashMatch[1];
          }
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
    leaveModalOpen,
    homeView
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

  const handleJoinWithInvite = useCallback((invite) => {
    if (invite?.token) {
      if (invite.passcode && typeof window !== 'undefined') {
        window.location.hash = invite.passcode;
      } else if (typeof window !== 'undefined' && window.location.hash) {
        try { window.history.replaceState(null, '', window.location.pathname); } catch {}
      }
      setJoinToken(invite.token);
      setView('join-link');
    }
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
      saveActiveSession({
        sessionId: newSessionId,
        passcode: newPasscode,
        expiresAt: data.expiresAt,
        authTicket: data.ticket,
        joinToken: data.joinToken,
        view: 'create'
      });
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
    saveActiveSession({
      sessionId: targetSessionId,
      passcode: targetPasscode,
      expiresAt: expAt,
      authTicket: ticket,
      joinToken,
      view: 'identity-select'
    });

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
      saveActiveSession({
        sessionId: cleanId,
        passcode: cleanPasscode,
        expiresAt: data.expiresAt,
        authTicket: data.ticket,
        joinToken: '',
        view: 'identity-select'
      });

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

  // eslint-disable-next-line no-unused-vars -- retained for future use (Android back-button logic mirrors this inline)
  const _handleCancelIdentitySelection = () => {
    if (sessionId && passcode) {
      setView('create');
    } else {
      setView(homeView);
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
    setView(homeView);
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
    clearActiveSession();
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
    setView(homeView);
    addToast('Left session');
  };

  const handleSessionBurned = () => {
    resetSession();
    setView(homeView);
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

      {/*
        Single Header Architecture:
        - When on the website landing page (view === 'landing'), LandingView renders its own website navigation header (site-nav). Header.jsx is NOT rendered.
        - In the native app (isNative) or inside any session/chat view (view !== 'landing'), the app-owned Header.jsx is rendered.
        - Exactly one header is ever rendered; never both together.
      */}
      {view !== 'landing' && (
        <Header
          view={view}
          setView={setView}
          isNative={isNative}
          sessionId={sessionId}
          expiresAt={expiresAt}
          connectionStatus={view === 'chat' ? connectionStatus : undefined}
          peerPresent={view === 'chat' ? peerPresent : false}
          isMenuOpen={isHeaderMenuOpen}
          onMenuOpenChange={handleHeaderMenuChange}
          onOpenSecurity={() => setSecurityModalOpen(true)}
          onOpenTerms={() => setView('terms')}
          onOpenPrivacy={() => setView('privacy')}
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
            {/* Dedicated Native App Launcher (Native Android APK only) */}
            {view === 'app-launcher' && (
              <NativeAppLauncher
                onCreateClick={handleStartCreate}
                onJoinClick={(invite) => {
                  if (invite?.token) {
                    handleJoinWithInvite(invite);
                  } else {
                    setView('join');
                  }
                }}
                onJoinWithInvite={handleJoinWithInvite}
                onOpenCreateProfile={() => setCreateProfileModalOpen(true)}
                onOpenUnlockProfile={() => setUnlockProfileModalOpen(true)}
                onOpenDeleteProfile={() => setDeleteProfileModalOpen(true)}
                activeProfile={activeProfile}
                storedProfileMeta={activeProfile}
                activeSession={sessionId && expiresAt ? { sessionId, expiresAt, timeRemaining: '' } : null}
                onResumeActiveSession={() => setView('chat')}
                onBurnActiveSession={() => setBurnSessionModalOpen(true)}
                onOpenSecurity={() => setSecurityModalOpen(true)}
                onOpenTerms={() => setView('terms')}
                onOpenPrivacy={() => setView('privacy')}
                isCreating={isCreatingSession}
                onToast={addToast}
              />
            )}

            {/* Public Marketing Website Landing Page (Web browsers only) */}
            {view === 'landing' && (
              <LandingView
                onCreateClick={handleStartCreate}
                onJoinClick={() => setView('join')}
                onOpenSecurity={() => setSecurityModalOpen(true)}
                onOpenTerms={() => setView('terms')}
                onOpenPrivacy={() => setView('privacy')}
                onCreateProfileClick={() => setCreateProfileModalOpen(true)}
                onUnlockProfileClick={() => setUnlockProfileModalOpen(true)}
                onOpenAndroidGuidance={() => setView('mobile-handoff')}
                activeProfile={activeProfile}
                storedProfileMeta={activeProfile}
                onToast={addToast}
                isCreating={isCreatingSession}
              />
            )}

            {view === 'terms' && (
              <TermsView onBack={() => setView(homeView)} />
            )}

            {view === 'privacy' && (
              <PrivacyView onBack={() => setView(homeView)} />
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
                onBackClick={() => setView(homeView)}
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
                  setView(homeView);
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
                initialName={selfIdentity?.displayName}
                initialAvatar={selfIdentity?.avatar}
                onConfirmIdentity={handleConfirmIdentity}
              />
            )}

            {view === 'chat' && (
              cryptoKey ? (
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
              ) : (
                <div className="flow-wrapper">
                  <div className="flow-card flow-card-compact" style={{ textAlign: 'center' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '20px auto', color: 'var(--accent)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Restoring encrypted session…</p>
                  </div>
                </div>
              )
            )}

            {view === 'expired' && (
              <ExpiredView
                onCreateNew={handleStartCreate}
                onGoHome={() => setView(homeView)}
              />
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
