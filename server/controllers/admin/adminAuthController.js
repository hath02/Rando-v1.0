import { findAdminByEmail, findAdminById } from '../../models/adminModel.js';
import { verifyPassword } from '../../utils/password.js';
import { regenerateSession, destroySession } from '../../utils/session.js';

const COOKIE_NAME = 'rando.admin.sid';

export function createAdminAuthController(db) {
  // Authenticate an administrator and start an admin session.
  async function login(req, res) {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    try {
      const admin = await findAdminByEmail(db, email);

      // Same message for unknown email and wrong password.
      if (!admin || !(await verifyPassword(password, admin.password))) {
        return res.status(401).json({
          message: 'Invalid email or password.',
        });
      }

      if (admin.status !== 'active') {
        return res.status(403).json({
          message: 'This admin account has been deactivated.',
        });
      }

      await regenerateSession(req);
      req.session.admin_id = admin.id;

      return res.json({
        message: 'Login successful.',
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          avatar: admin.avatar,
        },
      });
    } catch (error) {
      console.error('Admin login failed:', error.message);

      return res.status(500).json({ message: 'Could not sign in.' });
    }
  }

  // Return the signed-in admin, or null when nobody is signed in.
  async function me(req, res) {
    if (!req.session.admin_id) {
      return res.json({ admin: null });
    }

    try {
      const admin = await findAdminById(db, req.session.admin_id);

      if (!admin || admin.status !== 'active') {
        await destroySession(req);
        return res.json({ admin: null });
      }

      const { status, ...safeAdmin } = admin;
      return res.json({ admin: safeAdmin });
    } catch (error) {
      console.error('Admin session lookup failed:', error.message);

      return res.status(500).json({
        message: 'Could not retrieve admin information.',
      });
    }
  }

  // End the admin session.
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
      console.error('Admin logout failed:', error.message);

      return res.status(500).json({ message: 'Could not sign out.' });
    }
  }

  return { login, me, logout };
}
