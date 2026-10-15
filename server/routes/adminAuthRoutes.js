import express from 'express';
import { createAdminAuthController } from '../controllers/admin/adminAuthController.js';

// Mounted at /api/admin/auth. There is no public admin registration:
// admin accounts are created by an existing admin or directly in MySQL.
export default function createAdminAuthRoutes(db) {
  const router = express.Router();
  const controller = createAdminAuthController(db);

  router.post('/login', controller.login);
  router.get('/me', controller.me);
  router.post('/logout', controller.logout);

  return router;
}
