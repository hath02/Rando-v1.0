import {
  findClientByEmail,
  createClient,
  findClientById,
  updateClientProfile,
  updateClientAvatar,
} from '../../models/clientModel.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { regenerateSession, destroySession } from '../../utils/session.js';
import { ImageError, deleteImage, saveImage } from '../../utils/imageUploads.js';

const COOKIE_NAME = 'rando.sid';

export function createAuthController(db) {
  // Register a new customer.
  async function register(req, res) {
    const username = String(req.body.username ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    const address = String(req.body.address ?? '').trim();

    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: 'Please enter a valid email address.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.',
      });
    }

    try {
      if (await findClientByEmail(db, email)) {
        return res.status(409).json({ message: 'Email already exists.' });
      }

      // Never store a plain-text password in MySQL.
      const hashedPassword = await hashPassword(password);
      await createClient(db, username, email, hashedPassword, address);

      return res.status(201).json({
        message: 'Account created successfully. Please sign in.',
      });
    } catch (error) {
      // Handles two sign-ups racing for the same email.
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Email already exists.' });
      }

      console.error('Registration failed:', error.message);

      return res.status(500).json({
        message: 'Could not create your account.',
      });
    }
  }

  // Authenticate a customer and start a customer session.
  async function login(req, res) {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    try {
      const client = await findClientByEmail(db, email);

      // Same message for unknown email and wrong password.
      if (!client || !(await verifyPassword(password, client.password))) {
        return res.status(401).json({
          message: 'Invalid email or password.',
        });
      }

      if (client.status !== 'active') {
        return res.status(403).json({
          message: 'This account has been deactivated.',
        });
      }

      await regenerateSession(req);
      req.session.client_id = client.id;

      return res.json({
        message: 'Login successful.',
        user: {
          id: client.id,
          username: client.username,
          email: client.email,
          phone: client.phone,
          address: client.address,
          avatar: client.avatar,
        },
      });
    } catch (error) {
      console.error('Login failed:', error.message);

      return res.status(500).json({ message: 'Could not sign in.' });
    }
  }

  // Return the signed-in customer, or null when nobody is signed in.
  async function me(req, res) {
    if (!req.session.client_id) {
      return res.json({ user: null });
    }

    try {
      const client = await findClientById(db, req.session.client_id);

      if (!client || client.status !== 'active') {
        await destroySession(req);
        return res.json({ user: null });
      }

      const { status, ...user } = client;
      return res.json({ user });
    } catch (error) {
      console.error('Session lookup failed:', error.message);

      return res.status(500).json({
        message: 'Could not retrieve account information.',
      });
    }
  }

  // Update editable customer contact and delivery details.
  async function updateProfile(req, res) {
    const username = String(req.body.username ?? '').trim();
    const phone = String(req.body.phone ?? '').trim();
    const address = String(req.body.address ?? '').trim();

    if (!username) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (username.length > 255) {
      return res.status(400).json({ message: 'That name is too long.' });
    }
    if (phone && !/^[0-9+()\-\s]{7,20}$/.test(phone)) {
      return res.status(400).json({
        message: 'Please enter a valid phone number (7–20 characters).',
      });
    }
    if (address.length > 1000) {
      return res.status(400).json({ message: 'That address is too long.' });
    }

    try {
      const client = await updateClientProfile(db, req.session.client_id, {
        username,
        phone,
        address,
      });

      if (!client) {
        return res.status(404).json({ message: 'Customer account not found.' });
      }

      const { status, ...user } = client;
      return res.json({ message: 'Profile updated successfully.', user });
    } catch (error) {
      console.error('Profile update failed:', error.message);
      return res.status(500).json({ message: 'Could not save your profile.' });
    }
  }

  // Upload or replace the customer's profile photo (multipart field "avatar").
  async function updateAvatar(req, res) {
    if (!req.file) {
      return res.status(400).json({ message: 'Please choose an image to upload.' });
    }

    let saved = null;

    try {
      const current = await findClientById(db, req.session.client_id);

      if (!current) {
        return res.status(404).json({ message: 'Customer account not found.' });
      }

      // Remember the old photo now; it is deleted only after the new one is saved.
      const previousAvatar = current.avatar;

      saved = await saveImage(req.file, 'avatars');

      const client = await updateClientAvatar(db, req.session.client_id, saved);

      await deleteImage(previousAvatar);

      const { status, ...user } = client;
      return res.json({ message: 'Profile photo updated.', user });
    } catch (error) {
      // Do not leave an unused file behind if the database update failed.
      if (saved) await deleteImage(saved);

      if (error instanceof ImageError) {
        return res.status(400).json({ message: error.message });
      }

      console.error('Avatar upload failed:', error.message);
      return res.status(500).json({ message: 'Could not save your photo.' });
    }
  }

  // Remove the customer's profile photo.
  async function removeAvatar(req, res) {
    try {
      const current = await findClientById(db, req.session.client_id);

      if (!current) {
        return res.status(404).json({ message: 'Customer account not found.' });
      }

      const previousAvatar = current.avatar;

      const client = await updateClientAvatar(db, req.session.client_id, null);
      await deleteImage(previousAvatar);

      const { status, ...user } = client;
      return res.json({ message: 'Profile photo removed.', user });
    } catch (error) {
      console.error('Avatar removal failed:', error.message);
      return res.status(500).json({ message: 'Could not remove your photo.' });
    }
  }

  // End the customer session.
  async function logout(req, res) {
    try {
      await destroySession(req);

      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });

      return res.json({ message: 'Logged out successfully.' });
    } catch (error) {
      console.error('Logout failed:', error.message);

      return res.status(500).json({ message: 'Could not sign out.' });
    }
  }

  return { register, login, me, updateProfile, updateAvatar, removeAvatar, logout };
}
