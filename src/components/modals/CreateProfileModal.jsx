import React, { useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, KeyRound, ArrowRight, ArrowLeft, AlertTriangle, Eye, EyeOff, X } from 'lucide-react';
import { AVATAR_PRESETS } from '../../data/avatars';
import { generateRandomDisplayName, sanitizeDisplayName, isValidDisplayName } from '../../utils/identity';
import { generateMasterRecoveryKey, deriveProfileId, deriveAuthProof, saveProfileLocally, normalizeRecoveryKey } from '../../utils/profileCrypto';
import { getApiUrl } from '../../utils/apiConfig';
import { playTickSound, playErrorSound, playConnectedSound } from '../../utils/audio';

export default function CreateProfileModal({
  isOpen,
  onClose,
  onProfileCreated,
  onToast
}) {
  const [step, setStep] = useState(1); // 1: Identity, 2: Key Generation & Backup, 3: Optional Password, 4: Verify
  const [username, setUsername] = useState(() => generateRandomDisplayName());
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATAR_PRESETS[0].id);
  const [recoveryKey, setRecoveryKey] = useState('');
  const [profileId, setProfileId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enablePassword, setEnablePassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [confirmKeyInput, setConfirmKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset wizard on opening
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react/set-state-in-effect
      setStep(1);
      setUsername(generateRandomDisplayName());
      setSelectedAvatarId(AVATAR_PRESETS[0].id);
      setRecoveryKey('');
      setProfileId('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setEnablePassword(false);
      setCopiedKey(false);
      setConfirmKeyInput('');
      setLoading(false);
      setErrorMsg('');
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Step 1 -> Step 2
  const handleProceedToKey = async () => {
    const clean = sanitizeDisplayName(username);
    if (!isValidDisplayName(clean)) {
      playErrorSound();
      setErrorMsg('Username must be between 2 and 24 characters');
      return;
    }
    setErrorMsg('');
    playTickSound();

    const masterKey = generateMasterRecoveryKey();
    const pId = await deriveProfileId(masterKey);
    setRecoveryKey(masterKey);
    setProfileId(pId);
    setStep(2);
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopiedKey(true);
      playTickSound();
      onToast?.('Recovery key copied to clipboard');
      setTimeout(() => setCopiedKey(false), 2500);
    } catch {
      onToast?.('Failed to copy key');
    }
  };

  // Step 2 -> Step 3
  const handleProceedToPassword = () => {
    playTickSound();
    setErrorMsg('');
    setStep(3);
  };

  // Step 3 -> Step 4
  const handleProceedToVerify = () => {
    if (enablePassword) {
      if (password.length < 8) {
        playErrorSound();
        setErrorMsg('Password must be at least 8 characters');
        return;
      }
      if (password !== confirmPassword) {
        playErrorSound();
        setErrorMsg('Passwords do not match');
        return;
      }
    }
    playTickSound();
    setErrorMsg('');
    setStep(4);
  };

  // Finalize Creation
  const handleFinalize = async () => {
    const cleanInput = normalizeRecoveryKey(confirmKeyInput);
    const cleanActual = normalizeRecoveryKey(recoveryKey);

    if (cleanInput !== cleanActual) {
      playErrorSound();
      setErrorMsg('Entered key does not match your generated recovery key. Please check carefully.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const cleanUser = sanitizeDisplayName(username);
      const authProof = await deriveAuthProof(recoveryKey, 'AUTH');

      // 1. Encrypt and save locally
      await saveProfileLocally({
        profileId,
        username: cleanUser,
        avatar: selectedAvatarId,
        recoveryKey,
        password: enablePassword ? password : ''
      });

      // 2. Register profile on server (zero-knowledge: only public ID, username, avatar, and authProof)
      const res = await fetch(getApiUrl('/api/profile/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          username: cleanUser,
          avatar: selectedAvatarId,
          authProof
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Server registration failed');
      }

      playConnectedSound();
      onToast?.('Permanent profile created successfully!');
      onProfileCreated?.({
        profileId,
        username: cleanUser,
        avatar: selectedAvatarId
      });
      onClose();
    } catch (err) {
      console.warn('[U2U] Profile creation error:', err.message);
      playErrorSound();
      setErrorMsg(err.message || 'Could not complete profile creation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-profile-title"
      onClick={onClose}
    >
      <div
        className="modal-container glass-panel create-profile-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <KeyRound size={20} className="modal-title-icon" />
            <h3 id="create-profile-title">Create Permanent Profile</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="wizard-step-indicator">
          <span className={`wizard-dot ${step >= 1 ? 'active' : ''}`}>1</span>
          <div className="wizard-line" />
          <span className={`wizard-dot ${step >= 2 ? 'active' : ''}`}>2</span>
          <div className="wizard-line" />
          <span className={`wizard-dot ${step >= 3 ? 'active' : ''}`}>3</span>
          <div className="wizard-line" />
          <span className={`wizard-dot ${step >= 4 ? 'active' : ''}`}>4</span>
        </div>

        {/* STEP 1: Choose Username & Avatar */}
        {step === 1 && (
          <div className="wizard-step-content">
            <p className="wizard-description">
              Choose your public username and avatar. Your profile is anchored to a cryptographic private key generated locally on this device.
            </p>

            <div className="field-group">
              <label htmlFor="modal-username-input" className="field-label">Username</label>
              <input
                id="modal-username-input"
                type="text"
                className="input-field"
                value={username}
                maxLength={24}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleProceedToKey();
                  }
                }}
                placeholder="e.g. VelvetFox"
                autoFocus
              />
            </div>

            <div className="field-group">
              <label className="field-label">Select Avatar</label>
              <div className="avatar-grid compact">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`avatar-grid-item ${selectedAvatarId === preset.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedAvatarId(preset.id); playTickSound(); }}
                    title={preset.name}
                  >
                    <div className="avatar-thumb" dangerouslySetInnerHTML={{ __html: preset.svg }} />
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleProceedToKey}>
                <span>Generate Private Key</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Private Key Backup */}
        {step === 2 && (
          <div className="wizard-step-content">
            <div className="security-alert-box warning">
              <AlertTriangle size={20} className="alert-icon" />
              <div className="alert-text">
                <strong>Save this Recovery Key safely!</strong>
                <span>U2U is zero-knowledge. Your private key never touches our servers. If you lose this key, your profile cannot be recovered.</span>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Your Cryptographic Recovery Key</label>
              <div className="recovery-key-card">
                <code className="recovery-key-text">{recoveryKey}</code>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm copy-key-btn"
                  onClick={handleCopyKey}
                >
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                </button>
              </div>
            </div>

            <div className="profile-id-preview">
              <span>Public Profile ID: </span>
              <code>{profileId}</code>
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={handleProceedToPassword}>
                <span>I've Saved It · Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Optional Password Protection */}
        {step === 3 && (
          <div className="wizard-step-content">
            <p className="wizard-description">
              You can optionally protect your locally stored private key with a password.
            </p>

            <label className="checkbox-row" htmlFor="enable-pass-checkbox">
              <input
                id="enable-pass-checkbox"
                type="checkbox"
                checked={enablePassword}
                onChange={(e) => {
                  setEnablePassword(e.target.checked);
                  setErrorMsg('');
                }}
              />
              <span className="checkbox-label">Protect my private key with a password on this device</span>
            </label>

            {enablePassword && (
              <div className="password-fields-container">
                <div className="field-group">
                  <label htmlFor="profile-pass-input" className="field-label">Password (Min 8 characters)</label>
                  <div className="password-input-row">
                    <input
                      id="profile-pass-input"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleProceedToVerify();
                        }
                      }}
                      placeholder="Enter a strong password"
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

                <div className="field-group">
                  <label htmlFor="profile-confirm-pass" className="field-label">Confirm Password</label>
                  <input
                    id="profile-confirm-pass"
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrorMsg(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleProceedToVerify();
                      }
                    }}
                    placeholder="Repeat your password"
                  />
                </div>

                <p className="field-caption">
                  Uses PBKDF2 with 100,000 iterations to encrypt your private key locally. Your password is never sent to the server.
                </p>
              </div>
            )}

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button type="button" className="btn btn-primary" onClick={handleProceedToVerify}>
                <span>Proceed to Verification</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm Recovery Key */}
        {step === 4 && (
          <div className="wizard-step-content">
            <p className="wizard-description">
              Please paste or type your Recovery Key below to verify that you have safely recorded your backup.
            </p>

            <div className="field-group">
              <label htmlFor="verify-key-input" className="field-label">Confirm Recovery Key</label>
              <textarea
                id="verify-key-input"
                className="input-field key-confirm-textarea"
                rows={3}
                value={confirmKeyInput}
                onChange={(e) => {
                  setConfirmKeyInput(e.target.value);
                  setErrorMsg('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFinalize();
                  }
                }}
                placeholder="Paste U2U-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                autoFocus
              />
            </div>

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={loading}
              >
                <span>{loading ? 'Creating Profile…' : 'Complete Profile'}</span>
                <ShieldCheck size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
