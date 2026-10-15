// Route guards. Customers and admins use separate sessions,
// so each guard checks only its own session key.
export async function requireClient(req, res, next) {
  const clientId = req.session?.client_id;
  if (!clientId) {
    return res.status(401).json({ message: 'Please sign in first.' });
  }

  // Also re-check account status on protected requests. This ensures that
  // deactivating an already signed-in customer takes effect immediately.
  try {
    const db = req.app.locals.db;
    if (db) {
      const [rows] = await db.query(
        'SELECT status FROM clients WHERE id = ? LIMIT 1',
        [clientId]
      );
      if (!rows[0] || rows[0].status !== 'active') {
        req.session.destroy(() => {});
        res.clearCookie('rando.sid', {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        });
        return res.status(403).json({ message: 'Your customer account is inactive.' });
      }
    }
    return next();
  } catch (error) {
    console.error('Customer authorization check failed:', error.message);
    return res.status(500).json({ message: 'Could not verify your account.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.session?.admin_id) {
    return res.status(401).json({ message: 'Admin sign-in required.' });
  }

  next();
}
