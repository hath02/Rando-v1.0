
/**
 * Retrieve all active products with their category names and sales counts.
 *
 * @param {object} db - MySQL connection or connection pool.
 * @returns {Promise<Array>} Array of product records.
 */
export async function getAllProducts(db) {
    // LEFT JOIN keeps products even if they have no matching category.
    // category_name and sold (units sold in non-cancelled orders)
    // are additional fields for the React frontend.
    const sql = `
        SELECT
            product.*,
            category.name AS category_name,
            COALESCE((
                SELECT SUM(order_items.quantity)
                FROM order_items
                JOIN orders ON orders.id = order_items.order_id
                WHERE order_items.product_id = product.id
                    AND orders.status <> 'cancelled'
            ), 0) AS sold
        FROM product
        LEFT JOIN category
            ON product.category_id = category.id
        WHERE product.status = 'active'
    `;

    // mysql2 returns [rows, fields]; we only need the rows.
    const [rows] = await db.query(sql);

    return rows;
}

/**
 * Retrieve all categories, sorted alphabetically.
 *
 * @param {object} db - MySQL connection or connection pool.
 * @returns {Promise<Array>} Array of category records.
 */
export async function getAllCategories(db) {
    const sql = `
        SELECT *
        FROM category
        ORDER BY name ASC
    `;

    // Return the category records to the controller.
    const [rows] = await db.query(sql);

    return rows;
}
