import express from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { imageUpload } from '../middleware/imageUpload.js';
import { createAdminController } from '../controllers/admin/adminController.js';
import { createAdminReviewController } from '../controllers/admin/adminReviewController.js';
import { createAdminStatsController } from '../controllers/admin/adminStatsController.js';

// Mounted at /api/admin. All management endpoints require an admin session.
export default function createAdminRoutes(db) {
  const router = express.Router();
  const controller = createAdminController(db);
  const reviewController = createAdminReviewController(db);
  const statsController = createAdminStatsController(db);
  const productImage = imageUpload('image', 5 * 1024 * 1024);

  router.use(requireAdmin);
  router.get('/dashboard', controller.dashboard);

  router.get('/categories', controller.categories);
  router.get('/products', controller.listProducts);
  // Product forms are sent as multipart so they can include an image file.
  router.post('/products', productImage, controller.createProduct);
  router.put('/products/:id', productImage, controller.updateProduct);
  router.patch('/products/:id/status', controller.setProductStatus);

  router.get('/orders', controller.listOrders);
  router.get('/orders/:id', controller.orderDetails);
  router.patch('/orders/:id/status', controller.updateOrderStatus);

  // Reviews are read-only for admins: GET only, no write routes.
  router.get('/reviews', reviewController.list);

  router.get('/statistics', statsController.sales);

  router.get('/customers', controller.listCustomers);
  router.patch('/customers/:id/status', controller.setCustomerStatus);

  return router;
}
