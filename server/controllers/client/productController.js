
import { getProductById } from '../../models/productDetailsModel.js';

// Create the controller using the existing database connection.
export function createProductController(db) {
    async function getProduct(req, res) {
        const productId = Number(req.params.id);

        // Validate the product ID before querying the database.
        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                message: 'Invalid product ID.',
            });
        }

        try {
            const product = await getProductById(db, productId);

            if (!product) {
                return res.status(404).json({
                    message: 'Product not found.',
                });
            }

            res.json({ product });
        } catch (error) {
            console.error('Failed to load product:', error.message);

            res.status(500).json({
                message: 'Failed to load product details.',
            });
        }
    }

    return { getProduct };
}
