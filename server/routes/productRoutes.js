import express from 'express';
import {
    createProductController,
} from '../controllers/client/productController.js';
import {
    createReviewController,
} from '../controllers/client/reviewController.js';
import { requireClient } from '../middleware/auth.js';

export default function createProductRoutes(db) {
    const router = express.Router();

    const productController = createProductController(db);
    const reviewController = createReviewController(db);

    // Public: anyone can read reviews.
    router.get('/:id/reviews', reviewController.list);

    // Private: customers can read their own review.
    router.get(
        '/:id/reviews/mine',
        requireClient,
        reviewController.mine
    );

    // Private: customers can create or update their review.
    router.post(
        '/:id/reviews',
        requireClient,
        reviewController.save
    );

    // Existing product details endpoint.
    router.get('/:id', productController.getProduct);

    return router;
}