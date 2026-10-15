import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

const money = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(Number(value) || 0);

const dateLabel = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US');
};

const statusLabel = (status) => ({
    pending: 'Pending', processing: 'Processing', shipped: 'Shipped',
    delivered: 'Delivered', cancelled: 'Cancelled',
}[String(status || '').toLowerCase()] || status || 'Unknown');

export default function AdminDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        apiFetch('/api/admin/dashboard', { signal: controller.signal })
            .then(setData)
            .catch((err) => {
                if (err.name !== 'AbortError') setError(err.message || 'Could not load dashboard.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    const stats = data?.stats;
    const cards = [
        { label: 'Order value', value: money(stats?.revenue), note: 'Total excluding cancelled orders', tone: 'ink', link: '/admin/orders' },
        { label: 'Orders', value: stats?.totalOrders ?? '—', note: `${stats?.pendingOrders ?? 0} waiting for processing`, tone: 'blue', link: '/admin/orders' },
        { label: 'Products', value: stats?.totalProducts ?? '—', note: `${stats?.activeProducts ?? 0} active in the store`, tone: 'sand', link: '/admin/products' },
        { label: 'Customers', value: stats?.totalCustomers ?? '—', note: 'Registered customer accounts', tone: 'green', link: '/admin/customers' },
    ];

    return (
        <div className="admin-page-content">
            <div className="admin-page-heading">
                <div>
                    <span className="admin-kicker">OVERVIEW</span>
                    <h1>Good to see you.</h1>
                    <p>Here’s what’s happening across your store today.</p>
                </div>
                <Link className="admin-primary-button" to="/admin/products">＋ Add product</Link>
            </div>

            {error && <p className="form-message form-error" role="alert">{error}</p>}
            {loading ? <div className="admin-loading">Loading your store overview…</div> : (
                <>
                    <section className="admin-stat-grid" aria-label="Store metrics">
                        {cards.map((card) => (
                            <Link to={card.link} className={`admin-stat-card ${card.tone}`} key={card.label}>
                                <span className="admin-stat-label">{card.label}</span>
                                <strong>{card.value}</strong>
                                <small>{card.note}</small>
                                <span className="admin-stat-arrow" aria-hidden="true">↗</span>
                            </Link>
                        ))}
                    </section>

                    <section className="admin-dashboard-lower">
                        <div className="admin-panel admin-recent-orders">
                            <div className="admin-panel-heading">
                                <div><h2>Recent orders</h2><p>Latest activity from customers</p></div>
                                <Link to="/admin/orders">View all →</Link>
                            </div>
                            {data?.recentOrders?.length ? (
                                <div className="admin-table-scroll">
                                    <table className="admin-data-table">
                                        <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                                        <tbody>
                                            {data.recentOrders.map((order) => (
                                                <tr key={order.id}>
                                                    <td><Link className="admin-order-link" to={`/admin/orders/${order.id}`}>#{order.id}</Link></td>
                                                    <td><span className="admin-table-primary">{order.name || 'Customer'}</span><small className="admin-table-secondary">{order.customer_email || ''}</small></td>
                                                    <td>{dateLabel(order.created_at)}</td>
                                                    <td>{money(order.total_price)}</td>
                                                    <td><span className={`admin-status status-${String(order.status).toLowerCase()}`}>{statusLabel(order.status)}</span></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <div className="admin-empty-state">No orders have been placed yet.</div>}
                        </div>

                        <aside className="admin-panel admin-quick-panel">
                            <div className="admin-panel-heading"><div><h2>Order pipeline</h2><p>Orders by current status</p></div></div>
                            {[
                                ['Pending', stats?.pendingOrders, 'pending'],
                                ['Processing', stats?.processingOrders, 'processing'],
                                ['Shipped', stats?.shippedOrders, 'shipped'],
                                ['Delivered', stats?.deliveredOrders, 'delivered'],
                                ['Cancelled', stats?.cancelledOrders, 'cancelled'],
                            ].map(([label, count, key]) => (
                                <div className="admin-pipeline-row" key={key}>
                                    <span><i className={`admin-pipeline-dot status-${key}`} />{label}</span>
                                    <strong>{count ?? 0}</strong>
                                </div>
                            ))}
                            <Link className="admin-secondary-button admin-full-button" to="/admin/orders">Manage orders</Link>
                        </aside>
                    </section>
                </>
            )}
        </div>
    );
}
