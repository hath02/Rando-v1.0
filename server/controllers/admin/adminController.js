import { ImageError, deleteImage, isGeneratedImageName, saveImage } from '../../utils/imageUploads.js';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const PRODUCT_STATUSES = ['active', 'inactive'];
const CUSTOMER_STATUSES = ['active', 'inactive'];

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function clean(value, max = 5000) {
  return String(value ?? '').trim().slice(0, max);
}

function parseProductPayload(body = {}) {
  const name = clean(body.name, 255);
  const description = clean(body.description, 5000);
  const image = clean(body.image, 2048);
  const rawCategory = body.category_id;
  const categoryId = rawCategory === '' || rawCategory === null || rawCategory === undefined
    ? null
    : Number(rawCategory);
  const price = Number(body.price);
  const stock = Number(body.stock);
  const requestedSalePrice = body.sale_price === '' || body.sale_price === null || body.sale_price === undefined
    ? 0
    : Number(body.sale_price);
  const onSale = body.on_sale === true || body.on_sale === 1 || body.on_sale === '1' || body.on_sale === 'true';
  const status = clean(body.status || 'active', 20).toLowerCase();

  if (!name) return { error: 'Product name is required.' };
  if (!Number.isFinite(price) || price < 0 || price > 999999999) {
    return { error: 'Enter a valid non-negative product price.' };
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > 2147483647) {
    return { error: 'Stock must be a non-negative whole number.' };
  }
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    return { error: 'Choose a valid category.' };
  }
  if (!PRODUCT_STATUSES.includes(status)) {
    return { error: 'Product status must be active or inactive.' };
  }
  if (onSale && (!Number.isFinite(requestedSalePrice) || requestedSalePrice <= 0 || requestedSalePrice >= price)) {
    return { error: 'Sale price must be greater than zero and lower than the regular price.' };
  }

  return {
    value: {
      name,
      description,
      image,
      categoryId,
      price,
      salePrice: onSale ? requestedSalePrice : 0,
      onSale: onSale ? 1 : 0,
      stock,
      status,
    },
  };
}

export function createAdminController(db) {
  async function dashboard(_req, res) {
    try {
      const [productRows, orderRows, customerRows, revenueRows, recentRows] = await Promise.all([
        db.query(`SELECT COUNT(*) AS total, SUM(status = 'active') AS active FROM product`),
        db.query(`SELECT
          COUNT(*) AS total,
          COALESCE(SUM(status = 'pending'), 0) AS pending,
          COALESCE(SUM(status = 'processing'), 0) AS processing,
          COALESCE(SUM(status = 'shipped'), 0) AS shipped,
          COALESCE(SUM(status = 'delivered'), 0) AS delivered,
          COALESCE(SUM(status = 'cancelled'), 0) AS cancelled
        FROM orders`),
        db.query('SELECT COUNT(*) AS total FROM clients'),
        db.query(`SELECT COALESCE(SUM(total_price), 0) AS revenue
          FROM orders WHERE status <> 'cancelled'`),
        db.query(`SELECT
          orders.id, orders.name, orders.total_price, orders.status, orders.created_at,
          clients.email AS customer_email,
          COALESCE(item_counts.item_count, 0) AS item_count
        FROM orders
        LEFT JOIN clients ON clients.id = orders.account_id
        LEFT JOIN (
          SELECT order_id, SUM(quantity) AS item_count
          FROM order_items GROUP BY order_id
        ) item_counts ON item_counts.order_id = orders.id
        ORDER BY orders.created_at DESC, orders.id DESC
        LIMIT 8`),
      ]);

      const products = productRows[0][0] ?? {};
      const orders = orderRows[0][0] ?? {};
      const customers = customerRows[0][0] ?? {};
      const revenue = revenueRows[0][0] ?? {};

      return res.json({
        stats: {
          totalProducts: Number(products.total) || 0,
          activeProducts: Number(products.active) || 0,
          totalOrders: Number(orders.total) || 0,
          pendingOrders: Number(orders.pending) || 0,
          processingOrders: Number(orders.processing) || 0,
          shippedOrders: Number(orders.shipped) || 0,
          deliveredOrders: Number(orders.delivered) || 0,
          cancelledOrders: Number(orders.cancelled) || 0,
          totalCustomers: Number(customers.total) || 0,
          revenue: Number(revenue.revenue) || 0,
        },
        recentOrders: recentRows[0].map((row) => ({
          ...row,
          total_price: Number(row.total_price) || 0,
          item_count: Number(row.item_count) || 0,
        })),
      });
    } catch (error) {
      console.error('Admin dashboard failed:', error.message);
      return res.status(500).json({ message: 'Could not load dashboard data.' });
    }
  }

  async function categories(_req, res) {
    try {
      const [rows] = await db.query('SELECT id, name FROM category ORDER BY name ASC');
      return res.json({ categories: rows });
    } catch (error) {
      console.error('Admin category list failed:', error.message);
      return res.status(500).json({ message: 'Could not load categories.' });
    }
  }

  async function listProducts(req, res) {
    const q = clean(req.query.q, 150);
    const status = clean(req.query.status || 'all', 20).toLowerCase();

    try {
      const conditions = [];
      const values = [];
      if (q) {
        conditions.push('(product.name LIKE ? OR CAST(product.id AS CHAR) LIKE ?)');
        values.push(`%${q}%`, `%${q}%`);
      }
      if (PRODUCT_STATUSES.includes(status)) {
        conditions.push('product.status = ?');
        values.push(status);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [rows] = await db.query(`
        SELECT product.*, category.name AS category_name
        FROM product
        LEFT JOIN category ON category.id = product.category_id
        ${where}
        ORDER BY product.id DESC
      `, values);
      return res.json({ products: rows });
    } catch (error) {
      console.error('Admin product list failed:', error.message);
      return res.status(500).json({ message: 'Could not load products.' });
    }
  }

  // Delete a replaced or removed upload, but only when no other product
  // still uses the same file. Cleanup problems never fail the request.
  async function removeUnusedProductImage(stored) {
    if (!isGeneratedImageName(stored)) return;

    try {
      const [rows] = await db.query('SELECT COUNT(*) AS n FROM product WHERE image = ?', [stored]);
      if (Number(rows[0].n) === 0) await deleteImage(stored);
    } catch (error) {
      console.error('Image cleanup failed:', error.message);
    }
  }

  async function createProduct(req, res) {
    const parsed = parseProductPayload(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const p = parsed.value;

    let savedImage = null;

    try {
      if (p.categoryId !== null) {
        const [categoriesFound] = await db.query('SELECT id FROM category WHERE id = ? LIMIT 1', [p.categoryId]);
        if (!categoriesFound.length) return res.status(400).json({ message: 'The selected category does not exist.' });
      }

      // The uploaded file (if any) is saved on the server; only its generated
      // name goes into the database.
      if (req.file) savedImage = await saveImage(req.file);

      const [result] = await db.query(`
        INSERT INTO product
          (name, description, category_id, price, sale_price, on_sale, stock, image, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [p.name, p.description, p.categoryId, p.price, p.salePrice, p.onSale, p.stock, savedImage ?? '', p.status]);

      return res.status(201).json({ message: 'Product created successfully.', productId: result.insertId });
    } catch (error) {
      if (savedImage) await deleteImage(savedImage);
      if (error instanceof ImageError) return res.status(400).json({ message: error.message });

      console.error('Admin product create failed:', error.message);
      return res.status(500).json({ message: 'Could not create this product. Check the product fields and database schema.' });
    }
  }

  async function updateProduct(req, res) {
    const id = positiveId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid product ID.' });
    const parsed = parseProductPayload(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const p = parsed.value;

    const removeImage = ['true', '1', true, 1].includes(req.body?.remove_image);
    let savedImage = null;

    try {
      if (p.categoryId !== null) {
        const [categoriesFound] = await db.query('SELECT id FROM category WHERE id = ? LIMIT 1', [p.categoryId]);
        if (!categoriesFound.length) return res.status(400).json({ message: 'The selected category does not exist.' });
      }

      const [existing] = await db.query('SELECT image FROM product WHERE id = ? LIMIT 1', [id]);
      if (!existing.length) return res.status(404).json({ message: 'Product not found.' });

      // Keep the current image unless a new file was uploaded or removal was requested.
      const previousImage = existing[0].image || '';
      let image = previousImage;

      if (req.file) {
        savedImage = await saveImage(req.file);
        image = savedImage;
      } else if (removeImage) {
        image = '';
      }

      await db.query(`
        UPDATE product SET
          name = ?, description = ?, category_id = ?, price = ?, sale_price = ?,
          on_sale = ?, stock = ?, image = ?, status = ?
        WHERE id = ?
      `, [p.name, p.description, p.categoryId, p.price, p.salePrice, p.onSale, p.stock, image, p.status, id]);

      // The old file is deleted only after the database points at the new one.
      if (image !== previousImage) await removeUnusedProductImage(previousImage);

      return res.json({ message: 'Product updated successfully.' });
    } catch (error) {
      if (savedImage) await deleteImage(savedImage);
      if (error instanceof ImageError) return res.status(400).json({ message: error.message });

      console.error('Admin product update failed:', error.message);
      return res.status(500).json({ message: 'Could not update this product.' });
    }
  }

  async function setProductStatus(req, res) {
    const id = positiveId(req.params.id);
    const status = clean(req.body.status, 20).toLowerCase();
    if (!id) return res.status(400).json({ message: 'Invalid product ID.' });
    if (!PRODUCT_STATUSES.includes(status)) return res.status(400).json({ message: 'Status must be active or inactive.' });

    try {
      const [result] = await db.query('UPDATE product SET status = ? WHERE id = ?', [status, id]);
      if (!result.affectedRows) {
        const [existing] = await db.query('SELECT id FROM product WHERE id = ? LIMIT 1', [id]);
        if (!existing.length) return res.status(404).json({ message: 'Product not found.' });
      }
      return res.json({ message: status === 'active' ? 'Product activated.' : 'Product deactivated.' });
    } catch (error) {
      console.error('Admin product status update failed:', error.message);
      return res.status(500).json({ message: 'Could not update product status.' });
    }
  }

  async function listOrders(req, res) {
    const q = clean(req.query.q, 150);
    const status = clean(req.query.status || 'all', 20).toLowerCase();

    try {
      const conditions = [];
      const values = [];
      if (q) {
        conditions.push('(CAST(orders.id AS CHAR) LIKE ? OR orders.name LIKE ? OR orders.phone LIKE ? OR clients.email LIKE ?)');
        values.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      if (ORDER_STATUSES.includes(status)) {
        conditions.push('orders.status = ?');
        values.push(status);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [rows] = await db.query(`
        SELECT
          orders.id, orders.account_id, orders.name, orders.phone, orders.address,
          orders.total_price, orders.status, orders.created_at,
          clients.email AS customer_email,
          COALESCE(item_counts.item_count, 0) AS item_count,
          payment.payment_method, payment.payment_status
        FROM orders
        LEFT JOIN clients ON clients.id = orders.account_id
        LEFT JOIN (
          SELECT order_id, SUM(quantity) AS item_count FROM order_items GROUP BY order_id
        ) item_counts ON item_counts.order_id = orders.id
        LEFT JOIN (
          SELECT order_id, MAX(payment_method) AS payment_method, MAX(payment_status) AS payment_status
          FROM payments GROUP BY order_id
        ) payment ON payment.order_id = orders.id
        ${where}
        ORDER BY orders.created_at DESC, orders.id DESC
        LIMIT 300
      `, values);

      return res.json({ orders: rows.map((row) => ({
        ...row,
        total_price: Number(row.total_price) || 0,
        item_count: Number(row.item_count) || 0,
      })) });
    } catch (error) {
      console.error('Admin order list failed:', error.message);
      return res.status(500).json({ message: 'Could not load orders.' });
    }
  }

  async function orderDetails(req, res) {
    const id = positiveId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid order ID.' });

    try {
      const [orders] = await db.query(`
        SELECT orders.id, orders.account_id, orders.name, orders.phone, orders.address,
          orders.total_price, orders.status, orders.created_at, clients.email AS customer_email,
          payment.payment_method, payment.payment_status
        FROM orders
        LEFT JOIN clients ON clients.id = orders.account_id
        LEFT JOIN (
          SELECT order_id, MAX(payment_method) AS payment_method, MAX(payment_status) AS payment_status
          FROM payments GROUP BY order_id
        ) payment ON payment.order_id = orders.id
        WHERE orders.id = ? LIMIT 1
      `, [id]);
      if (!orders.length) return res.status(404).json({ message: 'Order not found.' });

      const [items] = await db.query(`
        SELECT order_items.product_id, order_items.price, order_items.quantity,
          product.name, product.image
        FROM order_items
        LEFT JOIN product ON product.id = order_items.product_id
        WHERE order_items.order_id = ?
        ORDER BY order_items.id
      `, [id]);

      return res.json({
        order: { ...orders[0], total_price: Number(orders[0].total_price) || 0 },
        items: items.map((item) => ({
          ...item,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 0,
        })),
      });
    } catch (error) {
      console.error('Admin order details failed:', error.message);
      return res.status(500).json({ message: 'Could not load order details.' });
    }
  }

  async function updateOrderStatus(req, res) {
    const id = positiveId(req.params.id);
    const nextStatus = clean(req.body.status, 20).toLowerCase();
    if (!id) return res.status(400).json({ message: 'Invalid order ID.' });
    if (!ORDER_STATUSES.includes(nextStatus)) return res.status(400).json({ message: 'Invalid order status.' });

    const transitions = {
      pending: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };
    const connection = await db.getConnection();
    let transactionOpen = false;

    try {
      await connection.beginTransaction();
      transactionOpen = true;
      const [rows] = await connection.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(404).json({ message: 'Order not found.' });
      }

      const currentStatus = String(rows[0].status || '').toLowerCase();
      if (currentStatus === nextStatus) {
        await connection.commit();
        transactionOpen = false;
        return res.json({ message: 'Order status is unchanged.', status: currentStatus });
      }
      if (!transitions[currentStatus]?.includes(nextStatus)) {
        await connection.rollback();
        transactionOpen = false;
        return res.status(409).json({
          message: `Cannot move an order from ${currentStatus || 'unknown'} to ${nextStatus}.`,
        });
      }

      // Checkout reduces stock. Cancelling a pending/processing order restores it once.
      if (nextStatus === 'cancelled') {
        const [items] = await connection.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = ? FOR UPDATE',
          [id]
        );
        for (const item of items) {
          if (item.product_id) {
            await connection.query('UPDATE product SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
          }
        }
      }

      await connection.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, id]);
      await connection.commit();
      transactionOpen = false;
      return res.json({ message: 'Order status updated.', status: nextStatus });
    } catch (error) {
      if (transactionOpen) await connection.rollback();
      console.error('Admin order status update failed:', error.message);
      return res.status(500).json({ message: 'Could not update order status.' });
    } finally {
      connection.release();
    }
  }

  async function listCustomers(req, res) {
    const q = clean(req.query.q, 150);
    const status = clean(req.query.status || 'all', 20).toLowerCase();

    try {
      const conditions = [];
      const values = [];
      if (q) {
        conditions.push('(clients.username LIKE ? OR clients.email LIKE ? OR clients.phone LIKE ? OR CAST(clients.id AS CHAR) LIKE ?)');
        values.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
      }
      if (CUSTOMER_STATUSES.includes(status)) {
        conditions.push('clients.status = ?');
        values.push(status);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [rows] = await db.query(`
        SELECT clients.id, clients.username, clients.email, clients.phone, clients.address,
          clients.avatar, clients.status, COALESCE(order_totals.order_count, 0) AS order_count,
          COALESCE(order_totals.total_spent, 0) AS total_spent
        FROM clients
        LEFT JOIN (
          SELECT account_id, COUNT(*) AS order_count,
            SUM(CASE WHEN status <> 'cancelled' THEN total_price ELSE 0 END) AS total_spent
          FROM orders GROUP BY account_id
        ) order_totals ON order_totals.account_id = clients.id
        ${where}
        ORDER BY clients.id DESC
        LIMIT 500
      `, values);

      return res.json({ customers: rows.map((row) => ({
        ...row,
        order_count: Number(row.order_count) || 0,
        total_spent: Number(row.total_spent) || 0,
      })) });
    } catch (error) {
      console.error('Admin customer list failed:', error.message);
      return res.status(500).json({ message: 'Could not load customers.' });
    }
  }

  async function setCustomerStatus(req, res) {
    const id = positiveId(req.params.id);
    const status = clean(req.body.status, 20).toLowerCase();
    if (!id) return res.status(400).json({ message: 'Invalid customer ID.' });
    if (!CUSTOMER_STATUSES.includes(status)) return res.status(400).json({ message: 'Status must be active or inactive.' });

    try {
      const [result] = await db.query('UPDATE clients SET status = ? WHERE id = ?', [status, id]);
      if (!result.affectedRows) {
        const [existing] = await db.query('SELECT id FROM clients WHERE id = ? LIMIT 1', [id]);
        if (!existing.length) return res.status(404).json({ message: 'Customer not found.' });
      }
      return res.json({ message: status === 'active' ? 'Customer activated.' : 'Customer deactivated.' });
    } catch (error) {
      console.error('Admin customer status update failed:', error.message);
      return res.status(500).json({ message: 'Could not update customer status.' });
    }
  }

  return {
    dashboard,
    categories,
    listProducts,
    createProduct,
    updateProduct,
    setProductStatus,
    listOrders,
    orderDetails,
    updateOrderStatus,
    listCustomers,
    setCustomerStatus,
  };
}
