import React, { useState } from 'react';
import { AlertTriangle, Trash2, ShieldAlert, X, ArrowRight, ArrowLeft } from 'lucide-react';
import { obliterateLocalProfile, deriveAuthProof, unlockStoredProfile } from '../../utils/profileCrypto';
import { getApiUrl } from '../../utils/apiConfig';
import { playErrorSound, playBurnSound, playTickSound } from '../../utils/audio';

export default function DeleteProfileModal({
  isOpen,
  onClose,
  activeProfile,
  onProfileDeleted,
  onToast
}) {
  const [step, setStep] = useState(1); // 1: Detailed Warning, 2: Explicit 'DELETE' confirmation
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [partialFailure, setPartialFailure] = useState(false);

  if (!isOpen) return null;

  const handleStepOneConfirm = () => {
    playTickSound();
    setStep(2);
    setErrorMsg('');
  };

  const handleExecuteDeletion = async () => {
    if (deleteConfirmationInput.trim() !== 'DELETE') {
      playErrorSound();
      setErrorMsg('Please type DELETE exactly to confirm permanent destruction');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let authProof = '';
      const profileId = activeProfile?.profileId;

      // 1. Try to unlock recovery key to compute cryptographic proof of possession for server revocation
      try {
        const decrypted = await unlockStoredProfile(password);
        if (decrypted?.recoveryKey) {
          authProof = await deriveAuthProof(decrypted.recoveryKey, 'AUTH');
        }
      } catch {
        // Fallback: if already unlocked in active state
        if (activeProfile?.recoveryKey) {
          authProof = await deriveAuthProof(activeProfile.recoveryKey, 'AUTH');
        }
      }

      // 2. Obliterate local storage, private keys, salt, ciphertext
      obliterateLocalProfile();

      // 3. Revoke from server records if profileId is present
      if (profileId && authProof) {
        try {
          const res = await fetch(getApiUrl('/api/profile/delete'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId, authProof })
          });
          if (!res.ok) {
            console.warn('[U2U] Server profile revocation returned non-200:', res.status);
            setPartialFailure(true);
          }
        } catch (serverErr) {
          console.warn('[U2U] Network error revoking server record:', serverErr.message);
          setPartialFailure(true);
        }
      }

      playBurnSound();
      onToast?.('Your permanent profile has been deleted. This action cannot be undone.');
      onProfileDeleted?.();
      onClose();
    } catch (err) {
      playErrorSound();
      setErrorMsg(err.message || 'Deletion error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-profile-title">
      <div className="modal-container glass-panel delete-profile-modal">
        <div className="modal-header">
          <div className="modal-title-row danger">
            <ShieldAlert size={20} className="modal-title-icon danger" />
            <h3 id="delete-profile-title">Delete Permanent Profile</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: Warning Screen */}
        {step === 1 && (
          <div className="modal-form-content">
            <div className="security-alert-box danger">
              <AlertTriangle size={24} className="alert-icon danger" />
              <div className="alert-text">
                <strong>Permanent & Irreversible Destruction</strong>
                <span>This action will permanently delete your profile and destroy all local private keys.</span>
              </div>
            </div>

            <ul className="deletion-warning-list">
              <li>Your private key on this device will be immediately wiped and cannot be recovered without an independent backup.</li>
              <li>Your username and avatar will be released from the server records.</li>
              <li>Existing temporary chat sessions will not be deleted unless you burn or leave them separately.</li>
              <li>Other participants may retain messages or photos previously delivered to their devices.</li>
            </ul>

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Keep My Profile
              </button>
              <button type="button" className="btn btn-danger" onClick={handleStepOneConfirm}>
                <span>I Understand · Continue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Explicit Confirmation Screen */}
        {step === 2 && (
          <div className="modal-form-content">
            <p className="wizard-description">
              To prevent accidental deletion, please type <strong className="text-danger">DELETE</strong> in capital letters below to confirm.
            </p>

            <div className="field-group">
              <label htmlFor="confirm-delete-input" className="field-label">Type DELETE to confirm</label>
              <input
                id="confirm-delete-input"
                type="text"
                className="input-field delete-confirm-input"
                value={deleteConfirmationInput}
                onChange={(e) => {
                  setDeleteConfirmationInput(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="DELETE"
                autoComplete="off"
                autoFocus
              />
            </div>

            {activeProfile?.hasPassword && (
              <div className="field-group">
                <label htmlFor="delete-profile-password" className="field-label">Profile Password (if set)</label>
                <input
                  id="delete-profile-password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to authenticate deletion"
                />
              </div>
            )}

            {errorMsg && <div className="modal-error-banner danger">{errorMsg}</div>}

            {partialFailure && (
              <div className="modal-error-banner warning">
                Local private keys and credentials were wiped. However, server-side revocation encountered a network issue.
              </div>
            )}

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleExecuteDeletion}
                disabled={loading || deleteConfirmationInput.trim() !== 'DELETE'}
              >
                <Trash2 size={16} />
                <span>{loading ? 'Deleting…' : 'Permanently Delete Profile'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
