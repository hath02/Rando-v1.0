import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { useCart } from '../context/cart-context.js';
import { formatPrice } from '../lib/format.js';

const UPLOADS_URL = '/uploads/';

// Resolve product image paths.
function getImageUrl(image) {
  if (!image) return `${UPLOADS_URL}placeholder.png`;

  if (/^https?:\/\//i.test(image) || image.startsWith('/')) {
    return image;
  }

  return `${UPLOADS_URL}${image}`;
}

function Cart() {
  const { user, loading: authLoading } = useAuth();
  const {
    items,
    totalItems,
    subtotal,
    loading: cartLoading,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  // The cart row being changed, so its buttons can be disabled.
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  // Run a cart change and surface any server message.
  async function runChange(id, action) {
    setError('');
    setBusyId(id);

    try {
      await action();
    } catch (err) {
      setError(err.message || 'Could not update your cart.');
    } finally {
      setBusyId(null);
    }
  }

  function changeQuantity(item, value) {
    const quantity = Math.floor(Number(value));

    // Ignore empty or invalid input and unchanged values.
    if (!quantity || quantity < 1 || quantity === item.quantity) return;

    runChange(item.id, () => updateQuantity(item.id, quantity));
  }

  if (authLoading || (user && cartLoading)) {
    return (
      <main className="placeholder-page">
        <p>Loading your cart...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container">
        <div className="empty-cart">
          <h1>Sign in to see your cart</h1>
          <p>Your cart is saved to your account.</p>
          <Link to="/account" state={{ from: '/cart' }} className="btn">
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container">
        <div className="empty-cart">
          <h1>Your cart is empty</h1>
          <p>Discover furniture for your home.</p>
          <Link to="/shop" className="btn">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Shopping Cart</h1>

      {error && (
        <p className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      <div className="cart-layout">
        {/* Products in the cart */}
        <section className="cart-items">
          {items.map((item) => {
            const busy = busyId === item.id;
            const onSale = item.unit_price < item.price;

            return (
              <article className="cart-item-modern" key={item.id}>
                <Link to={`/product/${item.product_id}`}>
                  <img
                    className="cart-img-modern"
                    src={getImageUrl(item.image)}
                    alt={item.name}
                  />
                </Link>

                <div className="cart-info">
                  <h4>
                    <Link to={`/product/${item.product_id}`}>
                      {item.name}
                    </Link>
                  </h4>

                  <p className="cart-price">
                    {onSale && (
                      <span className="old">{formatPrice(item.price)}</span>
                    )}
                    <span className="new">
                      {formatPrice(item.unit_price)}
                    </span>
                  </p>

                  {!item.available && (
                    <p className="cart-note cart-note-error">
                      This product is currently unavailable.
                    </p>
                  )}

                  {item.available && item.quantity > item.stock && (
                    <p className="cart-note cart-note-error">
                      Only {item.stock} left in stock.
                    </p>
                  )}

                  <div className="cart-actions">
                    <div className="qty-box">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        disabled={busy || item.quantity <= 1}
                        onClick={() =>
                          changeQuantity(item, item.quantity - 1)
                        }
                      >
                        −
                      </button>

                      {/* Commits on blur or Enter, so typing sends one request. */}
                      <input
                        type="number"
                        min="1"
                        max={item.stock > 0 ? item.stock : undefined}
                        aria-label={`Quantity of ${item.name}`}
                        key={item.quantity}
                        defaultValue={item.quantity}
                        disabled={busy || !item.available}
                        onBlur={(event) =>
                          changeQuantity(item, event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur();
                        }}
                      />

                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={
                          busy ||
                          !item.available ||
                          item.quantity >= item.stock
                        }
                        onClick={() =>
                          changeQuantity(item, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="remove-btn"
                      aria-label={`Remove ${item.name}`}
                      disabled={busy}
                      onClick={() =>
                        runChange(item.id, () => removeItem(item.id))
                      }
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="cart-total">
                  {item.available ? formatPrice(item.line_total) : '—'}
                </div>
              </article>
            );
          })}
        </section>

        {/* Order summary */}
        <aside className="cart-summary">
          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Items ({totalItems})</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <div className="summary-row">
            <span>Shipping</span>
            <span>Calculated at checkout</span>
          </div>

          <div className="summary-total">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>

          <Link to="/checkout" className="checkout-btn">
            Checkout
          </Link>

          <Link to="/shop" className="text-button cart-clear">
            Continue shopping
          </Link>

          <button
            type="button"
            className="text-button cart-clear"
            disabled={busyId !== null}
            onClick={() => runChange('all', clearCart)}
          >
            Clear cart
          </button>
        </aside>
      </div>
    </main>
  );
}

export default Cart;
