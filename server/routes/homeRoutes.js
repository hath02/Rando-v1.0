
import express from 'express';
import { createHomeController } from '../controllers/client/homeController.js';

// Create and configure the homepage router.
// The database pool is passed in from the main server file.
export default function createHomeRoutes(db) {
    // Create a separate router for homepage-related API endpoints.
    const router = express.Router();

    // Create the controller and inject the database connection.
    const homeController = createHomeController(db);

    // Handle GET requests to the router's root path.
    // When mounted at /api/home, this becomes GET /api/home.
    router.get('/', homeController.getHomeData);

    // Return the router so index.js can mount it.
    return router;
}
