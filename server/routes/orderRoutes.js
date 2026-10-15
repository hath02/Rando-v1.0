import express from 'express';
import { createOrderController } from '../controllers/client/orderController.js';
import { requireClient } from '../middleware/auth.js';

// Mounted at /api/orders. Every route needs a signed-in customer.
export default function createOrderRoutes(db) {
  const router = express.Router();
  const controller = createOrderController(db);

  router.use(requireClient);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.details);

  return router;
}
