import { useState } from 'react';
import { useAuth } from '../context/auth-context.js';
import { checkImageFile, getImageUrl, ALLOWED_IMAGE_TYPES } from '../lib/images.js';

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export default function ProfileSettings() {
  const { user, updateProfile, updateAvatar, removeAvatar } = useAuth();
  const [form, setForm] = useState(() => ({
    username: user?.username ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setNotice('');
  }

  // Upload as soon as a photo is chosen; the server saves it in its uploads folder.
  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be chosen again later

    if (!file) return;

    setError('');
    setNotice('');

    const problem = checkImageFile(file, MAX_AVATAR_BYTES);
    if (problem) {
      setError(problem);
      return;
    }

    setUploading(true);

    try {
      await updateAvatar(file);
      setNotice('Your profile photo has been updated.');
    } catch (err) {
      setError(err.message || 'Could not upload your photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setError('');
    setNotice('');
    setUploading(true);

    try {
      await removeAvatar();
      setNotice('Your profile photo has been removed.');
    } catch (err) {
      setError(err.message || 'Could not remove your photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);

    try {
      const updatedUser = await updateProfile({
        username: form.username.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      });
      setForm({
        username: updatedUser.username ?? '',
        phone: updatedUser.phone ?? '',
        address: updatedUser.address ?? '',
      });
      setNotice('Your profile settings have been saved.');
    } catch (err) {
      setError(err.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-settings account-panel">
      <div className="account-content-heading">
        <p className="account-eyebrow">PERSONAL INFORMATION</p>
        <h2>Profile Settings</h2>
        <p>Keep your contact and delivery details current for a smoother checkout.</p>
      </div>

      {error && <p className="form-message form-error" role="alert">{error}</p>}
      {notice && <p className="form-message form-success" role="status">{notice}</p>}

      <div className="profile-photo">
        <span className="profile-photo-preview">
          {user?.avatar ? (
            <img src={getImageUrl(user.avatar)} alt="Your profile photo" />
          ) : (
            <span aria-hidden="true">
              {String(user?.username || user?.email || 'U').trim().slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>

        <div className="profile-photo-actions">
          <label className="btn profile-photo-button">
            {uploading ? 'Uploading...' : user?.avatar ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              onChange={handlePhotoChange}
              disabled={uploading}
            />
          </label>

          {user?.avatar && (
            <button
              type="button"
              className="text-button"
              onClick={handleRemovePhoto}
              disabled={uploading}
            >
              Remove photo
            </button>
          )}

          <small>JPG, PNG, WebP or GIF, up to 3 MB.</small>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="profile-form-grid">
          <div className="profile-field">
            <label htmlFor="profile-username">Full name</label>
            <input id="profile-username" name="username" type="text" autoComplete="name" maxLength={255} required value={form.username} onChange={handleChange} />
          </div>

          <div className="profile-field">
            <label htmlFor="profile-email">Email address</label>
            <input id="profile-email" type="email" value={user?.email ?? ''} readOnly aria-describedby="profile-email-note" />
            <small id="profile-email-note">Your sign-in email cannot be changed here.</small>
          </div>

          <div className="profile-field">
            <label htmlFor="profile-phone">Phone number</label>
            <input id="profile-phone" name="phone" type="tel" autoComplete="tel" maxLength={20} placeholder="Enter your phone number" value={form.phone} onChange={handleChange} />
          </div>

          <div className="profile-field profile-field-full">
            <label htmlFor="profile-address">Default delivery address</label>
            <textarea id="profile-address" name="address" autoComplete="street-address" rows={4} maxLength={1000} placeholder="Street, ward, district, city" value={form.address} onChange={handleChange} />
            <small>This address will be available to pre-fill your checkout form.</small>
          </div>
        </div>

        <div className="profile-form-actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving changes...' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
