
import {
    getAllProducts,
    getAllCategories
} from '../../models/productModel.js';

// Factory function that creates the homepage controller.
// The database connection/pool is injected from the server setup.
export function createHomeController(db) {

    // Controller function called when the homepage API is requested.
    async function getHomeData(req, res) {
        try {
            // Fetch products and categories concurrently.
            // Promise.all waits for both database queries to finish.
            const [products, categories] = await Promise.all([
                getAllProducts(db),
                getAllCategories(db)
            ]);

            // Send both results to the React frontend as JSON.
            // Expected structure: { products: [...], categories: [...] }
            res.json({
                products,
                categories
            });
        } catch (error) {
            // Log the detailed error on the backend for debugging.
            console.error('Failed to load homepage:', error.message);

            // Send a generic error message to the client.
            // Avoid exposing internal database details in the response.
            res.status(500).json({
                message: 'Failed to load homepage data.'
            });
        }
    }

    // Return the controller so the route can register it as a handler.
    return { getHomeData };
}
