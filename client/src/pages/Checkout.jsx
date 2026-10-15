import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { useCart } from '../context/cart-context.js';
import { apiFetch } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';

export default function Checkout() {
    const { user } = useAuth();
    const { items, totalItems, subtotal, loading, reloadCart } = useCart();
    const navigate = useNavigate();

    // Pre-fill the form from the customer's account details.
    const [form, setForm] = useState({
        name: user?.username ?? '',
        phone: user?.phone ?? '',
        address: user?.address ?? '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Items that cannot be ordered right now (removed or out of stock).
    const blocked = items.some(
        (item) => !item.available || item.quantity > item.stock
    );

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError('');
        setSubmitting(true);

        try {
            const data = await apiFetch('/api/orders', {
                method: 'POST',
                body: form,
            });

            // Leave the page first so the emptied cart is not flashed here.
            navigate(`/order-success/${data.orderId}`, { replace: true });
            reloadCart().catch(() => {});
        } catch (err) {
            setError(err.message || 'We could not place your order.');
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <main className="placeholder-page">
                <p>Loading your cart...</p>
            </main>
        );
    }

    if (items.length === 0) {
        return (
            <main className="container">
                <div className="checkout-empty">
                    <h1>Your cart is empty</h1>
                    <p>Add something to your cart before checking out.</p>
                    <Link to="/shop" className="btn">
                        Continue Shopping
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="container">
            <h1>Checkout</h1>

            <div className="checkout-wrapper">
                <form className="checkout-form" onSubmit={handleSubmit}>
                    <h3>Delivery details</h3>

                    {error && (
                        <p className="form-message form-error" role="alert">
                            {error}
                        </p>
                    )}

                    <label htmlFor="checkout-name">Full name</label>
                    <input
                        id="checkout-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        maxLength={255}
                        value={form.name}
                        onChange={handleChange}
                    />

                    <label htmlFor="checkout-phone">Phone</label>
                    <input
                        id="checkout-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={form.phone}
                        onChange={handleChange}
                    />

                    <label htmlFor="checkout-address">Delivery address</label>
                    <textarea
                        id="checkout-address"
                        name="address"
                        rows={4}
                        autoComplete="street-address"
                        required
                        maxLength={1000}
                        value={form.address}
                        onChange={handleChange}
                    />

                    <p className="checkout-note">
                        <strong>Payment:</strong> cash on delivery. You pay
                        when your order arrives.
                    </p>

                    <button
                        type="submit"
                        className="btn"
                        disabled={submitting || blocked}
                    >
                        {submitting ? 'Placing order...' : 'Place order'}
                    </button>
                </form>

                <aside className="checkout-summary">
                    <h3>Your order</h3>

                    {items.map((item) => (
                        <div className="checkout-item" key={item.id}>
                            <span>
                                {item.name} × {item.quantity}
                            </span>
                            <span>
                                {item.available
                                    ? formatPrice(item.line_total)
                                    : 'Unavailable'}
                            </span>
                        </div>
                    ))}

                    {blocked && (
                        <p className="form-message form-error" role="alert">
                            Some items are unavailable or low in stock.{' '}
                            <Link to="/cart">Update your cart</Link> to
                            continue.
                        </p>
                    )}

                    <div className="checkout-item">
                        <span>Items ({totalItems})</span>
                        <span>{formatPrice(subtotal)}</span>
                    </div>

                    <div className="checkout-total">
                        Total: {formatPrice(subtotal)}
                    </div>
                </aside>
            </div>
        </main>
    );
}
