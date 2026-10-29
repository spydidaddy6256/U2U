import React, { useState, useRef } from 'react';
import { ShieldCheck, RefreshCw, Upload, X, Check, Crop } from 'lucide-react';
import { AVATAR_PRESETS, getAvatarSvg } from '../../data/avatars';
import { generateRandomDisplayName, sanitizeDisplayName, isValidDisplayName } from '../../utils/identity';
import { playTickSound, playErrorSound } from '../../utils/audio';
import AvatarCropModal from './AvatarCropModal';

const MAX_CUSTOM_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB before cropping
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function EditIdentityModal({
  isOpen,
  currentIdentity,
  onClose,
  onConfirmIdentity
}) {
  const [displayName, setDisplayName] = useState(() => (
    currentIdentity?.displayName || generateRandomDisplayName()
  ));
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => (
    currentIdentity?.avatar && !currentIdentity.avatar.startsWith('data:')
      ? currentIdentity.avatar
      : AVATAR_PRESETS[0].id
  ));
  const [customAvatarData, setCustomAvatarData] = useState(() => (
    currentIdentity?.avatar?.startsWith('data:') ? currentIdentity.avatar : null
  ));
  const [activeTab, setActiveTab] = useState(() => (
    currentIdentity?.avatar?.startsWith('data:') ? 'custom' : 'presets'
  ));
  const [errorMsg, setErrorMsg] = useState('');

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

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
      setErrorMsg('Image size must be under 5MB');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageForCrop(reader.result);
      setCropperOpen(true);
      playTickSound();
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (croppedDataUrl) => {
    setCustomAvatarData(croppedDataUrl);
    setSelectedAvatarId('custom');
    setCropperOpen(false);
    playTickSound();
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    if (!customAvatarData && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
    onClose();
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-dialog glass-panel"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '440px' }}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="icon-btn modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="identity-header" style={{ marginBottom: '16px' }}>
            <div className="identity-badge">
              <ShieldCheck size={16} />
              <span>Session Identity</span>
            </div>
            <h3 className="modal-title" style={{ marginTop: '8px' }}>Update Profile Picture & Name</h3>
            <p className="modal-description">
              Changes update immediately for your peer in this session.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="identity-form">
            {/* Avatar Preview */}
            <div className="avatar-preview-container identity-preview-badge" style={{ marginBottom: '16px' }}>
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

            {/* Name Field */}
            <div className="identity-field">
              <label htmlFor="edit-display-name-input" className="field-label">
                <span>Anonymous Display Name</span>
                <span className="char-count">{displayName.length}/24</span>
              </label>
              <div className="name-input-row identity-name-input-group">
                <input
                  id="edit-display-name-input"
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
            <div className="avatar-tabs-row avatar-tabs" role="tablist" style={{ marginTop: '12px' }}>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'presets'}
                className={`avatar-tab avatar-tab-btn ${activeTab === 'presets' ? 'active' : ''}`}
                onClick={() => { setActiveTab('presets'); playTickSound(); }}
              >
                Choose Preset
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'custom'}
                className={`avatar-tab avatar-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
                onClick={() => { setActiveTab('custom'); playTickSound(); }}
              >
                Custom Picture
              </button>
            </div>

            {/* Presets Grid */}
            {activeTab === 'presets' && (
              <div className="avatar-grid avatar-presets-grid" role="radiogroup" style={{ maxHeight: '180px', overflowY: 'auto' }}>
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
              <div className="custom-upload-section" style={{ marginTop: '8px' }}>
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
                      <span className="custom-uploaded-sub">Cropped & optimized for this session</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setRawImageForCrop(customAvatarData);
                          setCropperOpen(true);
                        }}
                        title="Re-crop picture"
                      >
                        <Crop size={14} />
                        <span>Crop</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleRemoveCustom}
                        title="Remove custom picture"
                      >
                        <X size={14} />
                      </button>
                    </div>
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
                    <Upload size={22} className="upload-icon" />
                    <span className="upload-title">Select picture to crop</span>
                    <span className="upload-desc">JPG, PNG, or WebP</span>
                  </div>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="identity-error-banner" role="alert" style={{ marginTop: '10px' }}>
                {errorMsg}
              </div>
            )}

            {/* Actions */}
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                <Check size={16} />
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Crop Modal */}
      <AvatarCropModal
        isOpen={cropperOpen}
        imageSrc={rawImageForCrop}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </>
  );
}
