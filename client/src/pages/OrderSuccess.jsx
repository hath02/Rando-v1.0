import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { formatPrice } from '../lib/format.js';

export default function OrderSuccess() {
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
            <main className="placeholder-page">
                <p>Loading your order...</p>
            </main>
        );
    }

    if (error || !data) {
        return (
            <main className="placeholder-page">
                <h1>Order not found</h1>
                <p>{error || 'We could not find this order.'}</p>
                <Link to="/account/orders" className="btn">
                    My orders
                </Link>
            </main>
        );
    }

    const { order } = data;

    return (
        <main className="container order-success">
            <div className="order-success-box">
                <h1>Thank you for your order!</h1>

                <p>
                    Order #{order.id} for {formatPrice(order.total_price)} has
                    been placed. We will call {order.phone} to confirm
                    delivery, and you pay when it arrives.
                </p>

                <div className="order-success-actions">
                    <Link to={`/account/orders/${order.id}`} className="primary">
                        View order
                    </Link>
                    <Link to="/shop" className="secondary">
                        Continue shopping
                    </Link>
                </div>
            </div>
        </main>
    );
}
