import {
    isProductReviewable,
    getReviewSummary,
    getReviewsByProduct,
    getClientReview,
    saveClientReview,
} from '../../models/reviewModel.js';

function parseProductId(value) {
    const id = Number(value);

    return Number.isInteger(id) && id > 0 ? id : null;
}

export function createReviewController(db) {
    // Check whether a signed-in customer account is still active.
    async function isClientActive(clientId) {
        const [rows] = await db.query(
            `SELECT id
             FROM clients
             WHERE id = ? AND status = 'active'
             LIMIT 1`,
            [clientId]
        );

        return rows.length > 0;
    }

    // GET /api/products/:id/reviews
    async function list(req, res) {
        const productId = parseProductId(req.params.id);

        if (!productId) {
            return res.status(400).json({
                message: 'Invalid product ID.',
            });
        }

        try {
            if (!(await isProductReviewable(db, productId))) {
                return res.status(404).json({
                    message: 'Product not found.',
                });
            }

            const [summary, reviews] = await Promise.all([
                getReviewSummary(db, productId),
                getReviewsByProduct(db, productId),
            ]);

            return res.json({ summary, reviews });
        } catch (error) {
            console.error('Could not load reviews:', error.message);

            return res.status(500).json({
                message: 'Could not load product reviews.',
            });
        }
    }

    // GET /api/products/:id/reviews/mine
    async function mine(req, res) {
        const productId = parseProductId(req.params.id);

        if (!productId) {
            return res.status(400).json({
                message: 'Invalid product ID.',
            });
        }

        try {
            if (!(await isClientActive(req.session.client_id))) {
                return res.status(403).json({
                    message: 'Your account is inactive.',
                });
            }

            if (!(await isProductReviewable(db, productId))) {
                return res.status(404).json({
                    message: 'Product not found.',
                });
            }

            const review = await getClientReview(
                db,
                productId,
                req.session.client_id
            );

            return res.json({ review });
        } catch (error) {
            console.error('Could not load your review:', error.message);

            return res.status(500).json({
                message: 'Could not load your review.',
            });
        }
    }

    // POST /api/products/:id/reviews
    async function save(req, res) {
        const productId = parseProductId(req.params.id);
        const rating = Number(req.body.rating);
        const comment = String(req.body.comment ?? '').trim();

        if (!productId) {
            return res.status(400).json({
                message: 'Invalid product ID.',
            });
        }

        if (
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 5
        ) {
            return res.status(400).json({
                message: 'Rating must be an integer from 1 to 5.',
            });
        }

        if (comment.length > 2000) {
            return res.status(400).json({
                message: 'Comment cannot exceed 2,000 characters.',
            });
        }

        try {
            if (!(await isClientActive(req.session.client_id))) {
                return res.status(403).json({
                    message: 'Your account is inactive.',
                });
            }

            if (!(await isProductReviewable(db, productId))) {
                return res.status(404).json({
                    message: 'Product not found.',
                });
            }

            const review = await saveClientReview(
                db,
                productId,
                req.session.client_id,
                rating,
                comment
            );

            return res.status(200).json({
                message: 'Review saved successfully.',
                review,
            });
        } catch (error) {
            console.error('Could not save review:', error.message);

            return res.status(500).json({
                message: 'Could not save your review.',
            });
        }
    }

    return { list, mine, save };
}