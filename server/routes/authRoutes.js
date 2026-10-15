import express from 'express';
import { createAuthController } from '../controllers/client/authController.js';
import { requireClient } from '../middleware/auth.js';
import { imageUpload } from '../middleware/imageUpload.js';

export default function createAuthRoutes(db) {
  const router = express.Router();
  const authController = createAuthController(db);
  const avatarUpload = imageUpload('avatar', 3 * 1024 * 1024);

  router.post('/register', authController.register);
  router.post('/login', authController.login);
  router.get('/me', authController.me);
  router.patch('/profile', requireClient, authController.updateProfile);
  router.post('/avatar', requireClient, avatarUpload, authController.updateAvatar);
  router.delete('/avatar', requireClient, authController.removeAvatar);
  router.post('/logout', authController.logout);

  return router;
}