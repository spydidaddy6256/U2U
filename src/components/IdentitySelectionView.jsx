import React, { useState, useRef } from 'react';
import { RefreshCw, Upload, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { AVATAR_PRESETS, getAvatarSvg } from '../data/avatars';
import { generateRandomDisplayName, sanitizeDisplayName, isValidDisplayName } from '../utils/identity';
import { playTickSound, playErrorSound } from '../utils/audio';

const MAX_CUSTOM_IMAGE_SIZE = 1024 * 1024; // 1MB safe limit
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function IdentitySelectionView({
  onConfirmIdentity,
  onConfirm,
  onCancel,
  initialIdentity,
  initialName = '',
  initialAvatar = '',
  title = 'Choose Your Session Identity',
  subtitle = 'Pick a temporary anonymous name and avatar. No real personal information required.'
}) {
  const [displayName, setDisplayName] = useState(() => (
    initialName ||
    initialIdentity?.displayName ||
    generateRandomDisplayName()
  ));
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => (
    initialAvatar ||
    initialIdentity?.avatar ||
    AVATAR_PRESETS[0].id
  ));
  const [customAvatarData, setCustomAvatarData] = useState(null);
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'custom'
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleRefreshName = () => {
    playTickSound();
    setDisplayName(generateRandomDisplayName());
    setErrorMsg('');
  };

  const handleSelectPreset = (id) => {
    playTickSound();
    setSelectedAvatarId(id);
    setCustomAvatarData(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      playErrorSound();
      setErrorMsg('Please select a JPG, PNG, or WebP image');
      return;
    }

    if (file.size > MAX_CUSTOM_IMAGE_SIZE) {
      playErrorSound();
      setErrorMsg('Image size must be under 1MB');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setCustomAvatarData(reader.result);
      setSelectedAvatarId('custom');
      playTickSound();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustom = () => {
    playTickSound();
    setCustomAvatarData(null);
    setSelectedAvatarId(AVATAR_PRESETS[0].id);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = sanitizeDisplayName(displayName);
    if (!isValidDisplayName(clean)) {
      playErrorSound();
      setErrorMsg('Name must be between 2 and 24 characters');
      return;
    }

    const finalAvatar = customAvatarData || selectedAvatarId;
    playTickSound();
    const confirmFn = onConfirmIdentity || onConfirm;
    if (typeof confirmFn === 'function') {
      confirmFn({
        displayName: clean,
        avatar: finalAvatar
      });
    }
  };

  return (
    <div className="identity-selection-wrapper identity-select-view flow-wrapper">
      <div className="identity-card identity-select-card glass-panel flow-card">
        {/* Header */}
        <div className="identity-header">
          <div className="identity-badge">
            <ShieldCheck size={16} />
            <span>Anonymous Presence</span>
          </div>
          <h2 className="identity-title">{title}</h2>
          <p className="identity-subtitle">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="identity-form">
          {/* Avatar Preview */}
          <div className="avatar-preview-container identity-preview-badge">
            <div className="avatar-preview-ring identity-preview-avatar">
              {customAvatarData ? (
                <img
                  src={customAvatarData}
                  alt="Custom Avatar Preview"
                  className="avatar-preview-img"
                />
              ) : (
                <div
                  className="avatar-preview-svg"
                  dangerouslySetInnerHTML={{ __html: getAvatarSvg(selectedAvatarId) }}
                  aria-label="Selected Avatar"
                />
              )}
            </div>
            <span className="avatar-preview-label">{sanitizeDisplayName(displayName, 'Anonymous')}</span>
          </div>

          {/* Name Field with Randomizer */}
          <div className="identity-field">
            <label htmlFor="display-name-input" className="field-label">
              <span>Anonymous Display Name</span>
              <span className="char-count">{displayName.length}/24</span>
            </label>
            <div className="name-input-row identity-name-input-group">
              <input
                id="display-name-input"
                type="text"
                className="input-field name-input identity-name-input"
                value={displayName}
                maxLength={24}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="e.g. VelvetFox"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                className="btn btn-secondary icon-btn-square"
                onClick={handleRefreshName}
                title="Generate another anonymous name"
                aria-label="Generate random name"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          {/* Avatar Source Tabs */}
          <div className="avatar-tabs-row avatar-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'presets'}
              className={`avatar-tab avatar-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => { setActiveTab('presets'); playTickSound(); }}
            >
              Choose an Avatar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'custom'}
              className={`avatar-tab avatar-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => { setActiveTab('custom'); playTickSound(); }}
            >
              Use Your Own Picture
            </button>
          </div>

          {/* Presets Grid */}
          {activeTab === 'presets' && (
            <div className="avatar-grid avatar-presets-grid" role="radiogroup" aria-label="Avatar options">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = selectedAvatarId === preset.id && !customAvatarData;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`avatar-grid-item avatar-preset-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectPreset(preset.id)}
                    title={preset.name}
                  >
                    <div
                      className="avatar-thumb"
                      dangerouslySetInnerHTML={{ __html: preset.svg }}
                    />
                    <span className="avatar-thumb-name">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Custom Picture Upload */}
          {activeTab === 'custom' && (
            <div className="custom-upload-section">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {customAvatarData ? (
                <div className="custom-uploaded-card">
                  <img src={customAvatarData} alt="Uploaded" className="custom-uploaded-thumb" />
                  <div className="custom-uploaded-meta">
                    <span className="custom-uploaded-text">Custom Picture Ready</span>
                    <span className="custom-uploaded-sub">Stored locally for this session</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleRemoveCustom}
                    title="Remove custom picture"
                  >
                    <X size={14} />
                    <span>Remove</span>
                  </button>
                </div>
              ) : (
                <div
                  className="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                  }}
                >
                  <Upload size={24} className="upload-icon" />
                  <span className="upload-title">Click to upload your picture</span>
                  <span className="upload-desc">JPG, PNG, or WebP · Max 1MB</span>
                  <span className="upload-privacy-note">
                    Stored locally in your browser memory for this session. Never saved to public directories.
                  </span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="identity-error-banner" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="identity-actions">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ height: '48px' }}
            >
              <span>Continue to Chat</span>
              <ArrowRight size={18} />
            </button>
            {onCancel && (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={onCancel}
                style={{ marginTop: '8px', fontSize: '0.86rem', color: 'var(--text-tertiary)' }}
              >
                <span>Back</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
