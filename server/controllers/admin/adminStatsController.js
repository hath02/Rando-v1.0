import {
  fillSeries,
  percentChange,
  resolveRange,
  toSqlDate,
} from '../../utils/statsRange.js';

// Sales are every order that has not been cancelled, matching the
// "Order value" figure on the admin overview.
const SALES_FILTER = `o.status <> 'cancelled'
  AND o.created_at >= ? AND o.created_at < ?`;

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;

export function createAdminStatsController(db) {
  // Orders, revenue and units for one date range.
  async function totalsFor(from, to) {
    const [orderResult, unitResult] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(status <> 'cancelled'), 0) AS orders,
           COALESCE(SUM(CASE WHEN status <> 'cancelled'
                             THEN total_price ELSE 0 END), 0) AS revenue,
           COALESCE(SUM(status = 'cancelled'), 0) AS cancelled
         FROM orders
         WHERE created_at >= ? AND created_at < ?`,
        [from, to]
      ),
      db.query(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS units
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE ${SALES_FILTER}`,
        [from, to]
      ),
    ]);

    const orderRow = orderResult[0][0];
    const unitRow = unitResult[0][0];

    const orders = Number(orderRow.orders) || 0;
    const revenue = money(orderRow.revenue);

    return {
      orders,
      revenue,
      units: Number(unitRow.units) || 0,
      cancelled: Number(orderRow.cancelled) || 0,
      averageOrder: orders ? money(revenue / orders) : 0,
    };
  }

  // GET /api/admin/statistics?range=7d|30d|90d|12m
  async function sales(req, res) {
    const range = resolveRange(String(req.query.range ?? ''));

    const from = toSqlDate(range.start);
    const to = toSqlDate(range.end);
    const previousFrom = toSqlDate(range.previousStart);
    const previousTo = toSqlDate(range.previousEnd);

    const bucketFormat = range.unit === 'day' ? '%Y-%m-%d' : '%Y-%m';

    try {
      const [
        current,
        previous,
        seriesResult,
        topResult,
        categoryResult,
        statusResult,
      ] = await Promise.all([
        totalsFor(from, to),
        totalsFor(previousFrom, previousTo),
        db.query(
          `SELECT
             DATE_FORMAT(o.created_at, '${bucketFormat}') AS bucket,
             COUNT(*) AS orders,
             SUM(o.total_price) AS revenue
           FROM orders o
           WHERE ${SALES_FILTER}
           GROUP BY bucket
           ORDER BY bucket`,
          [from, to]
        ),
        db.query(
          `SELECT
             oi.product_id,
             COALESCE(p.name, 'Deleted product') AS name,
             SUM(oi.quantity) AS units,
             SUM(oi.quantity * oi.price) AS revenue
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           LEFT JOIN product p ON p.id = oi.product_id
           WHERE ${SALES_FILTER}
           GROUP BY oi.product_id, p.name
           ORDER BY units DESC, revenue DESC
           LIMIT 5`,
          [from, to]
        ),
        db.query(
          `SELECT
             COALESCE(c.name, 'Uncategorized') AS name,
             SUM(oi.quantity) AS units,
             SUM(oi.quantity * oi.price) AS revenue
           FROM order_items oi
           JOIN orders o ON o.id = oi.order_id
           LEFT JOIN product p ON p.id = oi.product_id
           LEFT JOIN category c ON c.id = p.category_id
           WHERE ${SALES_FILTER}
           GROUP BY c.id, c.name
           ORDER BY revenue DESC`,
          [from, to]
        ),
        db.query(
          `SELECT status, COUNT(*) AS count, SUM(total_price) AS value
           FROM orders
           WHERE created_at >= ? AND created_at < ?
           GROUP BY status`,
          [from, to]
        ),
      ]);

      const seriesRows = seriesResult[0];
      const topProducts = topResult[0];
      const categories = categoryResult[0];
      const statuses = statusResult[0];

      return res.json({
        range: { key: range.key, label: range.label, unit: range.unit },
        summary: current,
        previous,
        changes: {
          revenue: percentChange(current.revenue, previous.revenue),
          orders: percentChange(current.orders, previous.orders),
          units: percentChange(current.units, previous.units),
          averageOrder: percentChange(
            current.averageOrder,
            previous.averageOrder
          ),
        },
        series: fillSeries(range.buckets, seriesRows),
        topProducts: topProducts.map((row) => ({
          product_id: row.product_id,
          name: row.name,
          units: Number(row.units) || 0,
          revenue: money(row.revenue),
        })),
        categories: categories.map((row) => ({
          name: row.name,
          units: Number(row.units) || 0,
          revenue: money(row.revenue),
        })),
        statuses: statuses.map((row) => ({
          status: String(row.status || '').toLowerCase(),
          count: Number(row.count) || 0,
          value: money(row.value),
        })),
      });
    } catch (error) {
      console.error('Admin statistics failed:', error.message);

      return res.status(500).json({
        message: 'Could not load sales statistics.',
      });
    }
  }

  return { sales };
}
