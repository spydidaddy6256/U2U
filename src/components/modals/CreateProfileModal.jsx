import React, { useState, useRef } from 'react';
import { ShieldCheck, Copy, Check, KeyRound, ArrowRight, ArrowLeft, AlertTriangle, Eye, EyeOff, X, Upload } from 'lucide-react';
import { AVATAR_PRESETS, getAvatarSvg } from '../../data/avatars';
import { generateRandomDisplayName, sanitizeDisplayName, isValidDisplayName, validateAvatarFile } from '../../utils/identity';
import { generateMasterRecoveryKey, deriveProfileId, deriveAuthProof, saveProfileLocally } from '../../utils/profileCrypto';
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
  const [customAvatar, setCustomAvatar] = useState(null);
  const fileInputRef = useRef(null);
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      playErrorSound();
      setErrorMsg(validation.error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setCustomAvatar(reader.result);
      setSelectedAvatarId('custom');
      playTickSound();
    };
    reader.onerror = () => {
      playErrorSound();
      setErrorMsg('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomAvatar = () => {
    playTickSound();
    setCustomAvatar(null);
    setSelectedAvatarId(AVATAR_PRESETS[0].id);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTileClick = () => {
    if (!customAvatar) {
      fileInputRef.current?.click();
    } else {
      if (selectedAvatarId !== 'custom') {
        setSelectedAvatarId('custom');
        playTickSound();
      } else {
        fileInputRef.current?.click();
      }
    }
  };

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
    const cleanInput = confirmKeyInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const cleanActual = recoveryKey.trim().toUpperCase();

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
      const finalAvatar = selectedAvatarId === 'custom' && customAvatar ? customAvatar : selectedAvatarId;

      // 1. Encrypt and save locally
      await saveProfileLocally({
        profileId,
        username: cleanUser,
        avatar: finalAvatar,
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
          avatar: finalAvatar,
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
        avatar: finalAvatar
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
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-profile-title">
      <div className="modal-container glass-panel create-profile-modal">
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
          <>
            <div className="wizard-step-content">
            <p className="wizard-description">
              Choose your public username and avatar. Your profile is anchored to a cryptographic private key generated locally on this device.
            </p>

            {/* Avatar Preview Ring */}
            <div className="modal-avatar-preview-row">
              <div className="modal-avatar-preview-ring">
                {selectedAvatarId === 'custom' && customAvatar ? (
                  <img src={customAvatar} alt="Profile Avatar" className="modal-avatar-preview-img" />
                ) : (
                  <div
                    className="modal-avatar-preview-svg"
                    dangerouslySetInnerHTML={{ __html: getAvatarSvg(selectedAvatarId) }}
                    aria-label="Selected Avatar"
                  />
                )}
              </div>
              <div className="modal-avatar-preview-meta">
                <span className="modal-avatar-preview-name">@{sanitizeDisplayName(username, 'NewProfile')}</span>
                <span className="modal-avatar-preview-badge">
                  {selectedAvatarId === 'custom' && customAvatar ? 'Custom Photo' : 'Preset Avatar'}
                </span>
              </div>
            </div>

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
                placeholder="e.g. VelvetFox"
              />
            </div>

            {/* Hidden file input for custom photo upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              data-testid="profile-file-input"
              aria-label="Upload profile photo"
            />

            <div className="field-group">
              <div className="field-label-row">
                <label className="field-label">Select Avatar or Upload Photo</label>
                <span className="field-caption-inline">10 presets + custom</span>
              </div>
              <div className="avatar-grid compact" role="radiogroup" aria-label="Avatar options">
                {AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedAvatarId === preset.id}
                    className={`avatar-grid-item ${selectedAvatarId === preset.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedAvatarId(preset.id); playTickSound(); }}
                    title={preset.name}
                  >
                    <div className="avatar-thumb" dangerouslySetInnerHTML={{ __html: preset.svg }} />
                    <span className="avatar-thumb-name">{preset.name}</span>
                  </button>
                ))}

                {/* Upload Photo Tile */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedAvatarId === 'custom' && Boolean(customAvatar)}
                  className={`avatar-grid-item avatar-upload-tile ${selectedAvatarId === 'custom' && customAvatar ? 'selected' : ''}`}
                  onClick={handleTileClick}
                  title={customAvatar ? "Custom photo selected (Click to change)" : "Upload photo (Max 1 MB · JPG, PNG, WebP)"}
                  aria-label="Upload photo"
                  data-testid="upload-photo-tile"
                >
                  <div className="avatar-thumb avatar-upload-thumb">
                    {customAvatar ? (
                      <img src={customAvatar} alt="Custom" className="avatar-custom-thumb-img" />
                    ) : (
                      <Upload size={18} className="avatar-upload-icon" />
                    )}
                  </div>
                  <span className="avatar-thumb-name">{customAvatar ? 'Custom' : 'Upload'}</span>
                </button>
              </div>

              {/* Custom photo management preview card */}
              {customAvatar && (
                <div className="custom-photo-preview-card" data-testid="custom-photo-card">
                  <div className="custom-photo-info">
                    <img src={customAvatar} alt="Custom photo preview" className="custom-photo-thumb" />
                    <div className="custom-photo-meta">
                      <span className="custom-photo-title">
                        {selectedAvatarId === 'custom' ? 'Custom photo active' : 'Custom photo available'}
                      </span>
                      <span className="custom-photo-specs">JPG, PNG, WebP · Under 1 MB</span>
                    </div>
                  </div>
                  <div className="custom-photo-actions">
                    {selectedAvatarId !== 'custom' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setSelectedAvatarId('custom'); playTickSound(); }}
                      >
                        Use Photo
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                      title="Choose a different image file"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-danger-subtle"
                      onClick={handleRemoveCustomAvatar}
                      title="Remove custom photo"
                    >
                      <X size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}
          </div>

          <div className="modal-actions-footer">
            <button type="button" className="btn btn-primary" onClick={handleProceedToKey}>
              <span>Generate Private Key</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </>
      )}

        {/* STEP 2: Private Key Backup */}
        {step === 2 && (
          <>
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
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-primary" onClick={handleProceedToPassword}>
                <span>I've Saved It · Continue</span>
                <ArrowRight size={16} />
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 3: Optional Password Protection */}
        {step === 3 && (
          <>
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
                    placeholder="Repeat your password"
                  />
                </div>

                <p className="field-caption">
                  Uses PBKDF2 with 100,000 iterations to encrypt your private key locally. Your password is never sent to the server.
                </p>
              </div>
            )}

            {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}
          </div>

          <div className="modal-actions-footer">
            <button type="button" className="btn btn-primary" onClick={handleProceedToVerify}>
              <span>Proceed to Verification</span>
              <ArrowRight size={16} />
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          </div>
        </>
      )}

        {/* STEP 4: Confirm Recovery Key */}
        {step === 4 && (
          <>
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
                  placeholder="Paste U2U-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                />
              </div>

              {errorMsg && <div className="modal-error-banner">{errorMsg}</div>}
            </div>

            <div className="modal-actions-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalize}
                disabled={loading}
              >
                <span>{loading ? 'Creating Profile…' : 'Complete Profile'}</span>
                <ShieldCheck size={16} />
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
