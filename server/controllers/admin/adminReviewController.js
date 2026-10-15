// Read-only access to customer reviews for the admin area.
// This controller deliberately has no create, update or delete
// functions, and the routes expose GET only.

function clean(value, max = 150) {
  return String(value ?? '').trim().slice(0, max);
}

export function createAdminReviewController(db) {
  // GET /api/admin/reviews?q=&rating=
  async function list(req, res) {
    const q = clean(req.query.q);
    const rating = Number(req.query.rating);

    try {
      const conditions = [];
      const values = [];

      if (q) {
        conditions.push(
          `(p.name LIKE ? OR c.username LIKE ? OR c.email LIKE ?
            OR r.comment LIKE ?)`
        );
        values.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }

      if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
        conditions.push('r.rating = ?');
        values.push(rating);
      }

      const where = conditions.length
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const [reviewResult, summaryResult, distributionResult] =
        await Promise.all([
          db.query(
            `SELECT
               r.id, r.product_id, r.rating, r.comment,
               r.created_at, r.updated_at,
               p.name AS product_name,
               c.username AS customer_name,
               c.email AS customer_email
             FROM review r
             LEFT JOIN product p ON p.id = r.product_id
             LEFT JOIN clients c ON c.id = r.account_id
             ${where}
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 300`,
            values
          ),
          // The summary covers every review, regardless of the filters.
          db.query(
            `SELECT COUNT(*) AS total, COALESCE(AVG(rating), 0) AS average
             FROM review`
          ),
          db.query(
            `SELECT rating, COUNT(*) AS count
             FROM review
             GROUP BY rating`
          ),
        ]);

      const reviews = reviewResult[0];
      const summary = summaryResult[0][0];
      const distribution = distributionResult[0];

      const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const row of distribution) {
        counts[row.rating] = Number(row.count) || 0;
      }

      return res.json({
        summary: {
          total: Number(summary.total) || 0,
          average: Math.round((Number(summary.average) || 0) * 10) / 10,
          distribution: counts,
        },
        reviews: reviews.map((row) => ({
          ...row,
          rating: Number(row.rating) || 0,
        })),
      });
    } catch (error) {
      console.error('Admin review list failed:', error.message);

      return res.status(500).json({
        message: 'Could not load reviews.',
      });
    }
  }

  return { list };
}
