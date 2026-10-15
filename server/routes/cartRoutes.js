import express from 'express';
import { createCartController } from '../controllers/client/cartController.js';
import { requireClient } from '../middleware/auth.js';

// Mounted at /api/cart. Every route needs a signed-in customer.
export default function createCartRoutes(db) {
  const router = express.Router();
  const controller = createCartController(db);

  router.use(requireClient);

  router.get('/', controller.list);
  router.post('/items', controller.add);
  router.patch('/items/:id', controller.update);
  router.delete('/items/:id', controller.remove);
  router.delete('/', controller.clear);

  return router;
}
