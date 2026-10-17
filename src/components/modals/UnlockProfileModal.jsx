import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { unlockStoredProfile, isValidRecoveryKeyFormat, deriveProfileId, deriveAuthProof, saveProfileLocally } from '../../utils/profileCrypto';
import { sanitizeDisplayName } from '../../utils/identity';
import { AVATAR_PRESETS } from '../../data/avatars';
import { getApiUrl } from '../../utils/apiConfig';
import { playTickSound, playErrorSound, playConnectedSound } from '../../utils/audio';

export default function UnlockProfileModal({
  isOpen,
  onClose,
  hasStoredProfile,
  storedProfileMeta,
  onProfileUnlocked,
  onToast
}) {
  const [mode, setMode] = useState(() => (hasStoredProfile ? 'unlock' : 'import'));
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importUsername, setImportUsername] = useState('');
  const [importPassword, setImportPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Unlock existing saved profile
  const handleUnlock = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const profile = await unlockStoredProfile(password);
      playConnectedSound();
      onToast?.(`Welcome back, ${profile.username}`);
      onProfileUnlocked?.(profile);
      onClose();
    } catch (err) {
      playErrorSound();
      setErrorMsg(err.message || 'Incorrect password or corrupt key');
    } finally {
      setLoading(false);
    }
  };

  // Restore/Import using recovery key
  const handleImport = async (e) => {
    e.preventDefault();
    if (!isValidRecoveryKeyFormat(importKey)) {
      playErrorSound();
      setErrorMsg('Invalid recovery key format. Expected U2U-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const derivedId = await deriveProfileId(importKey);
      const authProof = await deriveAuthProof(importKey, 'AUTH');

      // Check if profile exists on server
      let finalUsername = importUsername.trim() || 'RestoredUser';
      let finalAvatar = AVATAR_PRESETS[0].id;

      try {
        const verifyRes = await fetch(getApiUrl('/api/profile/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId: derivedId })
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.username) finalUsername = verifyData.username;
          if (verifyData.avatar) finalAvatar = verifyData.avatar;
        }
      } catch {}

      // Save locally with optional password
      await saveProfileLocally({
        profileId: derivedId,
        username: sanitizeDisplayName(finalUsername),
        avatar: finalAvatar,
        recoveryKey: importKey,
        password: importPassword
      });

      // Also ensure registered on server if fresh device
      await fetch(getApiUrl('/api/profile/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: derivedId,
          username: sanitizeDisplayName(finalUsername),
          avatar: finalAvatar,
          authProof
        })
      }).catch(() => {});

      playConnectedSound();
      onToast?.('Profile restored successfully!');
      onProfileUnlocked?.({
        profileId: derivedId,
        username: finalUsername,
        avatar: finalAvatar
      });
      onClose();
    } catch (err) {
      playErrorSound();
      setErrorMsg(err.message || 'Could not restore profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="unlock-profile-title">
      <div className="modal-container glass-panel unlock-profile-modal">
        <div className="modal-header">
          <div className="modal-title-row">
            <Lock size={20} className="modal-title-icon" />
            <h3 id="unlock-profile-title">
              {mode === 'unlock' ? 'Unlock Permanent Profile' : 'Restore from Private Key'}
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {hasStoredProfile && (
          <div className="avatar-tabs-row" role="tablist">
            <button
              type="button"
              className={`avatar-tab ${mode === 'unlock' ? 'active' : ''}`}
              onClick={() => { setMode('unlock'); setErrorMsg(''); playTickSound(); }}
            >
              Saved Profile
            </button>
            <button
              type="button"
              className={`avatar-tab ${mode === 'import' ? 'active' : ''}`}
              onClick={() => { setMode('import'); setErrorMsg(''); playTickSound(); }}
            >
              Import Recovery Key
            </button>
          </div>
        )}

        {/* UNLOCK MODE */}
        {mode === 'unlock' && storedProfileMeta && (
          <form onSubmit={handleUnlock} className="modal-form-content">
            <div className="profile-identity-chip">
              <span className="profile-chip-name">{storedProfileMeta.username}</span>
              <span className="profile-chip-id">{storedProfileMeta.profileId}</span>
            </div>

            {storedProfileMeta.hasPassword ? (
              <div className="field-group">
                <label htmlFor="unlock-pass-input" className="field-label">Profile Password</label>
                <div className="password-input-row">
                  <input
                    id="unlock-pass-input"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                    placeholder="Enter profile password"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="icon-btn pass-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ) : (
              <p className="field-caption">
                This profile is stored securely in this browser's device vault. Click below to unlock.
              </p>
            )}

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <span>{loading ? 'Unlocking…' : 'Unlock Profile'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* IMPORT / RESTORE MODE */}
        {mode === 'import' && (
          <form onSubmit={handleImport} className="modal-form-content">
            <p className="wizard-description">
              Enter your 256-bit recovery key to restore your profile on this device.
            </p>

            <div className="field-group">
              <label htmlFor="import-key-input" className="field-label">Recovery Key</label>
              <textarea
                id="import-key-input"
                className="input-field key-confirm-textarea"
                rows={3}
                value={importKey}
                onChange={(e) => { setImportKey(e.target.value); setErrorMsg(''); }}
                placeholder="U2U-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                autoFocus
              />
            </div>

            <div className="field-group">
              <label htmlFor="import-user-input" className="field-label">Username (Optional fallback)</label>
              <input
                id="import-user-input"
                type="text"
                className="input-field"
                value={importUsername}
                maxLength={24}
                onChange={(e) => setImportUsername(e.target.value)}
                placeholder="e.g. VelvetFox"
              />
            </div>

            <div className="field-group">
              <label htmlFor="import-pass-input" className="field-label">Device Password (Optional)</label>
              <input
                id="import-pass-input"
                type="password"
                className="input-field"
                value={importPassword}
                onChange={(e) => setImportPassword(e.target.value)}
                placeholder="Optional password to protect key locally"
              />
            </div>

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <span>{loading ? 'Restoring…' : 'Restore Profile'}</span>
                <ShieldCheck size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
