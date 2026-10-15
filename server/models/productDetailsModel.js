
// Retrieve a single product and its category name by product ID.
export async function getProductById(db, productId) {
    const sql = `
        SELECT
            product.*,
            category.name AS category_name
        FROM product
        LEFT JOIN category
            ON product.category_id = category.id
        WHERE product.id = ?
            AND product.status = 'active'
        LIMIT 1
    `;

    // Use a parameterized query to prevent SQL injection.
    const [rows] = await db.query(sql, [productId]);

    return rows[0] ?? null;
}
