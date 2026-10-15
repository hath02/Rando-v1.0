import {
  getCartRows,
  findCartRow,
  addToCart,
  updateCartQuantity,
  removeCartRow,
  clearCartRows,
} from '../../models/cartModel.js';
import { getUnitPrice } from '../../utils/pricing.js';

// Shape the cart response. Money is summed in cents to avoid
// floating-point drift, and unavailable items are left out of the total.
function buildCart(rows) {
  let subtotalCents = 0;
  let totalItems = 0;

  const items = rows.map((row) => {
    const quantity = Number(row.quantity) || 0;
    const stock = Number(row.stock) || 0;
    const available = row.status === 'active' && stock > 0;
    const unitPrice = getUnitPrice(row);
    const lineCents = Math.round(unitPrice * 100) * quantity;

    if (available) {
      subtotalCents += lineCents;
      totalItems += quantity;
    }

    return {
      id: row.id,
      product_id: row.product_id,
      name: row.name,
      image: row.image,
      price: Number(row.price) || 0,
      unit_price: unitPrice,
      quantity,
      stock,
      available,
      line_total: lineCents / 100,
    };
  });

  return { items, totalItems, subtotal: subtotalCents / 100 };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function createCartController(db) {
  async function respondWithCart(res, clientId, extra = {}) {
    const rows = await getCartRows(db, clientId);
    return res.json({ ...buildCart(rows), ...extra });
  }

  function serverError(res, label, error) {
    console.error(`${label}:`, error.message);

    return res.status(500).json({
      message: 'Something went wrong with your cart. Please try again.',
    });
  }

  // GET /api/cart
  async function list(req, res) {
    try {
      return await respondWithCart(res, req.session.client_id);
    } catch (error) {
      return serverError(res, 'Cart load failed', error);
    }
  }

  // POST /api/cart/items  { productId, quantity }
  async function add(req, res) {
    const productId = parseId(req.body.productId);
    const quantity = Number(req.body.quantity ?? 1);

    if (!productId || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: 'Please choose a valid product and quantity.',
      });
    }

    try {
      const outcome = await addToCart(
        db,
        req.session.client_id,
        productId,
        quantity
      );

      if (outcome.result === 'not_found') {
        return res.status(404).json({
          message: 'This product is no longer available.',
        });
      }

      if (outcome.result === 'out_of_stock') {
        return res.status(409).json({
          message: 'Sorry, this product is out of stock.',
        });
      }

      if (outcome.result === 'max_in_cart') {
        return res.status(409).json({
          message: `You already have all ${outcome.stock} available in your cart.`,
        });
      }

      const message = outcome.capped
        ? `Only ${outcome.stock} in stock, so your cart now holds the maximum.`
        : 'Added to your cart.';

      return await respondWithCart(res, req.session.client_id, { message });
    } catch (error) {
      return serverError(res, 'Add to cart failed', error);
    }
  }

  // PATCH /api/cart/items/:id  { quantity }
  async function update(req, res) {
    const cartId = parseId(req.params.id);
    const quantity = Number(req.body.quantity);

    if (!cartId || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({
        message: 'Quantity must be a whole number of at least 1.',
      });
    }

    try {
      const row = await findCartRow(db, req.session.client_id, cartId);

      if (!row) {
        return res.status(404).json({ message: 'Cart item not found.' });
      }

      const stock = Number(row.stock) || 0;

      if (quantity > stock) {
        return res.status(409).json({
          message:
            stock > 0
              ? `Only ${stock} in stock.`
              : 'Sorry, this product is out of stock.',
        });
      }

      await updateCartQuantity(db, req.session.client_id, cartId, quantity);

      return await respondWithCart(res, req.session.client_id);
    } catch (error) {
      return serverError(res, 'Cart update failed', error);
    }
  }

  // DELETE /api/cart/items/:id
  async function remove(req, res) {
    const cartId = parseId(req.params.id);

    if (!cartId) {
      return res.status(400).json({ message: 'Invalid cart item.' });
    }

    try {
      const removed = await removeCartRow(
        db,
        req.session.client_id,
        cartId
      );

      if (!removed) {
        return res.status(404).json({ message: 'Cart item not found.' });
      }

      return await respondWithCart(res, req.session.client_id);
    } catch (error) {
      return serverError(res, 'Cart remove failed', error);
    }
  }

  // DELETE /api/cart
  async function clear(req, res) {
    try {
      await clearCartRows(db, req.session.client_id);

      return await respondWithCart(res, req.session.client_id);
    } catch (error) {
      return serverError(res, 'Cart clear failed', error);
    }
  }

  return { list, add, update, remove, clear };
}
