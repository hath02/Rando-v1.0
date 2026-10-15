import { getUnitPrice } from '../utils/pricing.js';

// Turn the cart into an order in ONE transaction: the order, its items,
// the payment record, the stock reduction and the cart clearing either
// all succeed or none of them do.
export async function createOrder(db, clientId, { name, phone, address }) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock the cart rows and their products so two checkouts
    // cannot sell the same last item twice.
    const [cartRows] = await connection.query(
      `SELECT
         cart.id,
         cart.product_id,
         cart.quantity,
         product.name,
         product.price,
         product.sale_price,
         product.on_sale,
         product.stock,
         product.status
       FROM cart
       JOIN product ON product.id = cart.product_id
       WHERE cart.account_id = ?
       ORDER BY product.id
       FOR UPDATE`,
      [clientId]
    );

    if (cartRows.length === 0) {
      await connection.rollback();
      return { result: 'empty' };
    }

    // Prices and stock always come from the database, never the browser.
    const problems = [];

    for (const row of cartRows) {
      const stock = Number(row.stock) || 0;
      const active = row.status === 'active';

      if (!active || stock < row.quantity) {
        problems.push({ name: row.name, stock: active ? stock : 0 });
      }
    }

    if (problems.length > 0) {
      await connection.rollback();
      return { result: 'unavailable', problems };
    }

    // Total in cents to avoid floating-point drift.
    let totalCents = 0;

    for (const row of cartRows) {
      totalCents += Math.round(getUnitPrice(row) * 100) * row.quantity;
    }

    const total = totalCents / 100;

    const [orderResult] = await connection.query(
      `INSERT INTO orders (account_id, name, phone, address, total_price, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [clientId, name, phone, address, total]
    );

    const orderId = orderResult.insertId;

    for (const row of cartRows) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, price, quantity)
         VALUES (?, ?, ?, ?)`,
        [orderId, row.product_id, getUnitPrice(row), row.quantity]
      );

      // The stock >= ? check is a final safety net.
      const [stockResult] = await connection.query(
        'UPDATE product SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [row.quantity, row.product_id, row.quantity]
      );

      if (stockResult.affectedRows !== 1) {
        throw new Error(`Stock update failed for product ${row.product_id}`);
      }
    }

    await connection.query(
      `INSERT INTO payments (order_id, payment_method, amount, payment_status)
       VALUES (?, 'cod', ?, 'Pending')`,
      [orderId, total]
    );

    await connection.query('DELETE FROM cart WHERE account_id = ?', [
      clientId,
    ]);

    await connection.commit();

    return { result: 'created', orderId, total };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// A client's orders, newest first, with a total item count each.
export async function getOrdersByClient(db, clientId) {
  const sql = `
    SELECT
      orders.id,
      orders.total_price,
      orders.status,
      orders.created_at,
      COALESCE(SUM(order_items.quantity), 0) AS item_count
    FROM orders
    LEFT JOIN order_items ON order_items.order_id = orders.id
    WHERE orders.account_id = ?
    GROUP BY orders.id
    ORDER BY orders.created_at DESC, orders.id DESC
  `;

  const [rows] = await db.query(sql, [clientId]);
  return rows;
}

// One order with its items and payment, only if it belongs to this client.
export async function getOrderForClient(db, clientId, orderId) {
  const [orders] = await db.query(
    `SELECT id, total_price, status, created_at, name, phone, address
     FROM orders
     WHERE id = ? AND account_id = ?
     LIMIT 1`,
    [orderId, clientId]
  );

  const order = orders[0];
  if (!order) return null;

  const [items] = await db.query(
    `SELECT
       order_items.product_id,
       order_items.price,
       order_items.quantity,
       product.name,
       product.image
     FROM order_items
     LEFT JOIN product ON product.id = order_items.product_id
     WHERE order_items.order_id = ?
     ORDER BY order_items.id`,
    [orderId]
  );

  const [payments] = await db.query(
    `SELECT payment_method, payment_status
     FROM payments
     WHERE order_id = ?
     LIMIT 1`,
    [orderId]
  );

  return { order, items, payment: payments[0] ?? null };
}
