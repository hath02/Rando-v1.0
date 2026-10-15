import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { capitalize, formatDate, formatPrice } from '../lib/format.js';

const UPLOADS_URL = '/uploads/';

function getImageUrl(image) {
    if (!image) return `${UPLOADS_URL}placeholder.png`;

    if (/^https?:\/\//i.test(image) || image.startsWith('/')) {
        return image;
    }

    return `${UPLOADS_URL}${image}`;
}

// The database stores 'cod'; show something friendly.
function paymentLabel(method) {
    return method === 'cod' ? 'Cash on delivery' : capitalize(method);
}

export default function OrderDetails() {
    const { id } = useParams();

    const [result, setResult] = useState({ id: null, data: null, loading: true, error: '' });

    useEffect(() => {
        const controller = new AbortController();

        apiFetch(`/api/orders/${id}`, { signal: controller.signal })
            .then((data) => {
                setResult({ id, data, loading: false, error: '' });
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    setResult({
                        id,
                        data: null,
                        loading: false,
                        error: err.message || 'Could not load this order.',
                    });
                }
            });

        return () => controller.abort();
    }, [id]);

    const isCurrentResult = result.id === id;
    const loading = !isCurrentResult || result.loading;
    const data = isCurrentResult ? result.data : null;
    const error = isCurrentResult ? result.error : '';

    if (loading) {
        return (
            <section className="placeholder-page account-order-placeholder">
                <p>Loading order...</p>
            </section>
        );
    }

    if (error || !data) {
        return (
            <section className="placeholder-page account-order-placeholder">
                <h1>Order not found</h1>
                <p>{error || 'We could not find this order.'}</p>
                <Link to="/account/orders" className="btn">
                    Back to my orders
                </Link>
            </section>
        );
    }

    const { order, items, payment } = data;

    return (
        <section className="order-details-page account-panel">
            <h2>Order #{order.id}</h2>

            <div className="order-info-box">
                <h3>Summary</h3>
                <p>
                    <strong>Status:</strong>{' '}
                    <span className={`order-status status-${order.status}`}>
                        {capitalize(order.status)}
                    </span>
                </p>
                <p>
                    <strong>Placed on:</strong> {formatDate(order.created_at)}
                </p>
                {payment && (
                    <p>
                        <strong>Payment:</strong>{' '}
                        {paymentLabel(payment.payment_method)} (
                        {String(payment.payment_status ?? '').toLowerCase()})
                    </p>
                )}
                <p>
                    <strong>Total:</strong> {formatPrice(order.total_price)}
                </p>
            </div>

            <div className="order-info-box">
                <h3>Delivery</h3>
                <p>{order.name}</p>
                <p>{order.phone}</p>
                <p className="order-address">{order.address}</p>
            </div>

            <div className="order-items">
                {items.map((item, index) => (
                    <div className="order-item" key={`${item.product_id}-${index}`}>
                        <div className="order-item-img">
                            <img
                                src={getImageUrl(item.image)}
                                alt={item.name || 'Product'}
                            />
                        </div>

                        <div className="order-item-info">
                            <h4>
                                {item.name ? (
                                    <Link to={`/product/${item.product_id}`}>
                                        {item.name}
                                    </Link>
                                ) : (
                                    'Product no longer available'
                                )}
                            </h4>
                            <p>
                                {formatPrice(item.price)} × {item.quantity}
                            </p>
                        </div>

                        <div className="order-item-total">
                            {formatPrice(item.price * item.quantity)}
                        </div>
                    </div>
                ))}
            </div>

            <p>
                <Link to="/account/orders" className="back-link">
                    Back to my orders
                </Link>
            </p>
        </section>
    );
}
