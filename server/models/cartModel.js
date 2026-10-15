// Shopping cart rows. cart.account_id now refers to clients.id.

// Every cart row for a client, joined with its product details.
export async function getCartRows(db, clientId) {
  const sql = `
    SELECT
      cart.id,
      cart.product_id,
      cart.quantity,
      product.name,
      product.image,
      product.price,
      product.sale_price,
      product.on_sale,
      product.stock,
      product.status
    FROM cart
    JOIN product ON product.id = cart.product_id
    WHERE cart.account_id = ?
    ORDER BY cart.id
  `;

  const [rows] = await db.query(sql, [clientId]);
  return rows;
}

// One cart row, but only if it belongs to this client.
export async function findCartRow(db, clientId, cartId) {
  const sql = `
    SELECT cart.id, cart.quantity, product.stock, product.status
    FROM cart
    JOIN product ON product.id = cart.product_id
    WHERE cart.id = ? AND cart.account_id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [cartId, clientId]);
  return rows[0] ?? null;
}

// Add a product, or increase its quantity, without exceeding stock.
// Returns a result code so the controller can pick the HTTP response.
export async function addToCart(db, clientId, productId, quantity) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.query(
      'SELECT id, stock, status FROM product WHERE id = ? LIMIT 1',
      [productId]
    );
    const product = products[0];

    if (!product || product.status !== 'active') {
      await connection.rollback();
      return { result: 'not_found' };
    }

    const stock = Number(product.stock) || 0;

    if (stock < 1) {
      await connection.rollback();
      return { result: 'out_of_stock' };
    }

    // Lock this client's row for the product while we change it.
    const [rows] = await connection.query(
      `SELECT id, quantity FROM cart
       WHERE account_id = ? AND product_id = ?
       LIMIT 1 FOR UPDATE`,
      [clientId, productId]
    );
    const existing = rows[0];
    const current = existing ? Number(existing.quantity) || 0 : 0;

    if (current >= stock) {
      await connection.rollback();
      return { result: 'max_in_cart', stock };
    }

    const wanted = current + quantity;
    const newQuantity = Math.min(wanted, stock);

    if (existing) {
      await connection.query(
        'UPDATE cart SET quantity = ? WHERE id = ?',
        [newQuantity, existing.id]
      );
    } else {
      await connection.query(
        `INSERT INTO cart (account_id, product_id, quantity)
         VALUES (?, ?, ?)`,
        [clientId, productId, newQuantity]
      );
    }

    await connection.commit();

    return { result: 'added', capped: wanted > stock, stock };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Set a quantity on one of this client's cart rows.
export async function updateCartQuantity(db, clientId, cartId, quantity) {
  const [result] = await db.query(
    'UPDATE cart SET quantity = ? WHERE id = ? AND account_id = ?',
    [quantity, cartId, clientId]
  );

  return result.affectedRows;
}

// Remove one of this client's cart rows.
export async function removeCartRow(db, clientId, cartId) {
  const [result] = await db.query(
    'DELETE FROM cart WHERE id = ? AND account_id = ?',
    [cartId, clientId]
  );

  return result.affectedRows;
}

// Remove everything in this client's cart.
export async function clearCartRows(db, clientId) {
  await db.query('DELETE FROM cart WHERE account_id = ?', [clientId]);
}
