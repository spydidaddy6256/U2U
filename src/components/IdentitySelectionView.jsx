import React, { useState, useRef } from 'react';
import { RefreshCw, Upload, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { AVATAR_PRESETS, getAvatarSvg } from '../data/avatars';
import { generateRandomDisplayName, sanitizeDisplayName, isValidDisplayName, validateAvatarFile } from '../utils/identity';
import { playTickSound, playErrorSound } from '../utils/audio';

export default function IdentitySelectionView({
  onConfirmIdentity,
  initialName = '',
  initialAvatar = '',
  title = 'Choose Your Session Identity',
  subtitle = 'Pick a temporary anonymous name and avatar. No real personal information required.'
}) {
  const [displayName, setDisplayName] = useState(() => initialName || generateRandomDisplayName());
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    if (initialAvatar && initialAvatar.startsWith('data:')) return 'custom';
    return initialAvatar || AVATAR_PRESETS[0].id;
  });
  const [customAvatarData, setCustomAvatarData] = useState(() => {
    if (initialAvatar && initialAvatar.startsWith('data:')) return initialAvatar;
    return null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (initialAvatar && initialAvatar.startsWith('data:')) return 'custom';
    return 'presets';
  });
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
  };

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
      setCustomAvatarData(reader.result);
      setSelectedAvatarId('custom');
      playTickSound();
    };
    reader.onerror = () => {
      playErrorSound();
      setErrorMsg('Failed to read image file');
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
    onConfirmIdentity({
      displayName: clean,
      avatar: finalAvatar
    });
  };

  return (
    <div className="identity-selection-wrapper">
      <div className="identity-card glass-panel">
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
          <div className="avatar-preview-container">
            <div className="avatar-preview-ring">
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
            <div className="name-input-row">
              <input
                id="display-name-input"
                type="text"
                className="input-field name-input"
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

          {/* Hidden File Input for Custom Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            data-testid="identity-file-input"
            aria-label="Upload custom picture"
          />

          {/* Avatar Source Tabs */}
          <div className="avatar-tabs-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'presets'}
              className={`avatar-tab ${activeTab === 'presets' ? 'active' : ''}`}
              onClick={() => { setActiveTab('presets'); playTickSound(); }}
            >
              Choose an Avatar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'custom'}
              className={`avatar-tab ${activeTab === 'custom' ? 'active' : ''}`}
              onClick={() => { setActiveTab('custom'); playTickSound(); }}
            >
              Use Your Own Picture
            </button>
          </div>

          {/* Presets Grid */}
          {activeTab === 'presets' && (
            <div className="field-group">
              <div className="avatar-grid" role="radiogroup" aria-label="Avatar options">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = selectedAvatarId === preset.id && !customAvatarData;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`avatar-grid-item ${isSelected ? 'selected' : ''}`}
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

                {/* Upload Photo Tile alongside built-in presets */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedAvatarId === 'custom' && Boolean(customAvatarData)}
                  className={`avatar-grid-item avatar-upload-tile ${selectedAvatarId === 'custom' && customAvatarData ? 'selected' : ''}`}
                  onClick={() => {
                    if (!customAvatarData) {
                      fileInputRef.current?.click();
                    } else {
                      if (selectedAvatarId !== 'custom') {
                        setSelectedAvatarId('custom');
                        playTickSound();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }
                  }}
                  title={customAvatarData ? "Custom photo selected (Click to change)" : "Upload photo (Max 1 MB · JPG, PNG, WebP)"}
                  aria-label="Upload photo"
                  data-testid="identity-upload-tile"
                >
                  <div className="avatar-thumb avatar-upload-thumb">
                    {customAvatarData ? (
                      <img src={customAvatarData} alt="Custom" className="avatar-custom-thumb-img" />
                    ) : (
                      <Upload size={20} className="avatar-upload-icon" />
                    )}
                  </div>
                  <span className="avatar-thumb-name">{customAvatarData ? 'Custom' : 'Upload'}</span>
                </button>
              </div>

              {/* Custom photo management preview card */}
              {customAvatarData && (
                <div className="custom-photo-preview-card" data-testid="identity-custom-card">
                  <div className="custom-photo-info">
                    <img src={customAvatarData} alt="Uploaded" className="custom-photo-thumb" />
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
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm btn-danger-subtle"
                      onClick={handleRemoveCustom}
                    >
                      <X size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Picture Upload */}
          {activeTab === 'custom' && (
            <div className="custom-upload-section">
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
                    onClick={() => fileInputRef.current?.click()}
                    title="Change picture"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm btn-danger-subtle"
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
          </div>
        </form>
      </div>
    </div>
  );
}
