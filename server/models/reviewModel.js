// Check that the product exists and is active.
export async function isProductReviewable(db, productId) {
    const [rows] = await db.query(
        `SELECT id
         FROM product
         WHERE id = ? AND status = 'active'
         LIMIT 1`,
        [productId]
    );

    return rows.length > 0;
}

// Get the average rating and number of reviews.
export async function getReviewSummary(db, productId) {
    const [rows] = await db.query(
        `SELECT
            COUNT(*) AS total_reviews,
            COALESCE(AVG(rating), 0) AS average_rating
         FROM review
         WHERE product_id = ?`,
        [productId]
    );

    return {
        total_reviews: Number(rows[0].total_reviews),
        average_rating: Number(rows[0].average_rating),
    };
}

// Get the latest reviews for a product.
export async function getReviewsByProduct(db, productId) {
    const [rows] = await db.query(
        `SELECT
            r.id,
            r.product_id,
            r.rating,
            r.comment,
            r.created_at,
            r.updated_at,
            COALESCE(NULLIF(c.username, ''), 'Customer')
                AS reviewer_name
         FROM review r
         JOIN clients c ON c.id = r.account_id
         WHERE r.product_id = ?
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT 50`,
        [productId]
    );

    return rows;
}

// Get the signed-in customer's review for a product.
export async function getClientReview(
    db,
    productId,
    clientId
) {
    const [rows] = await db.query(
        `SELECT id, product_id, rating, comment,
                created_at, updated_at
         FROM review
         WHERE product_id = ? AND account_id = ?
         LIMIT 1`,
        [productId, clientId]
    );

    return rows[0] ?? null;
}

// Create a review, or update the existing review
// when this customer has already reviewed this product.
export async function saveClientReview(
    db,
    productId,
    clientId,
    rating,
    comment
) {
    await db.query(
        `INSERT INTO review
            (product_id, account_id, rating, comment)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            rating = VALUES(rating),
            comment = VALUES(comment),
            updated_at = CURRENT_TIMESTAMP`,
        [productId, clientId, rating, comment]
    );

    return getClientReview(db, productId, clientId);
}