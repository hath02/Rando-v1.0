import {
  createOrder,
  getOrdersByClient,
  getOrderForClient,
} from '../../models/orderModel.js';

function cleanText(value) {
  return String(value ?? '').trim();
}

export function createOrderController(db) {
  // POST /api/orders  { name, phone, address }
  async function create(req, res) {
    const name = cleanText(req.body.name);
    const phone = cleanText(req.body.phone);
    const address = cleanText(req.body.address);

    if (!name || !phone || !address) {
      return res.status(400).json({
        message: 'Name, phone, and address are required.',
      });
    }

    if (name.length > 255) {
      return res.status(400).json({ message: 'That name is too long.' });
    }

    if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) {
      return res.status(400).json({
        message: 'Please enter a valid phone number.',
      });
    }

    if (address.length > 1000) {
      return res.status(400).json({ message: 'That address is too long.' });
    }

    try {
      const outcome = await createOrder(db, req.session.client_id, {
        name,
        phone,
        address,
      });

      if (outcome.result === 'empty') {
        return res.status(400).json({ message: 'Your cart is empty.' });
      }

      if (outcome.result === 'unavailable') {
        const list = outcome.problems
          .map((item) =>
            item.stock > 0
              ? `${item.name} (only ${item.stock} left)`
              : `${item.name} (unavailable)`
          )
          .join(', ');

        return res.status(409).json({
          message: `Some items cannot be ordered: ${list}. Please update your cart.`,
          problems: outcome.problems,
        });
      }

      return res.status(201).json({
        message: 'Order placed successfully.',
        orderId: outcome.orderId,
        total: outcome.total,
      });
    } catch (error) {
      console.error('Order creation failed:', error.message);

      return res.status(500).json({
        message: 'We could not place your order. Please try again.',
      });
    }
  }

  // GET /api/orders
  async function list(req, res) {
    try {
      const rows = await getOrdersByClient(db, req.session.client_id);

      return res.json({
        orders: rows.map((row) => ({
          id: row.id,
          total_price: Number(row.total_price) || 0,
          status: row.status,
          created_at: row.created_at,
          item_count: Number(row.item_count) || 0,
        })),
      });
    } catch (error) {
      console.error('Order list failed:', error.message);

      return res.status(500).json({
        message: 'Could not load your orders.',
      });
    }
  }

  // GET /api/orders/:id
  async function details(req, res) {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: 'Invalid order.' });
    }

    try {
      const found = await getOrderForClient(
        db,
        req.session.client_id,
        orderId
      );

      // Same answer for "missing" and "someone else's order".
      if (!found) {
        return res.status(404).json({ message: 'Order not found.' });
      }

      return res.json({
        order: {
          ...found.order,
          total_price: Number(found.order.total_price) || 0,
        },
        items: found.items.map((item) => ({
          product_id: item.product_id,
          name: item.name,
          image: item.image,
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 0,
        })),
        payment: found.payment,
      });
    } catch (error) {
      console.error('Order details failed:', error.message);

      return res.status(500).json({
        message: 'Could not load this order.',
      });
    }
  }

  return { create, list, details };
}
