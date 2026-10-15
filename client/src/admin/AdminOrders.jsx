import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
const dateLabel = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-US');
};
const label = (value) => String(value || '').replace(/^./, (c) => c.toUpperCase());

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ q: search, status });
        apiFetch(`/api/admin/orders?${params.toString()}`, { signal: controller.signal })
            .then((result) => setOrders(result.orders || []))
            .catch((err) => { if (err.name !== 'AbortError') setError(err.message || 'Could not load orders.'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [search, status]);

    return (
        <div className="admin-page-content">
            <div className="admin-page-heading">
                <div><span className="admin-kicker">FULFILLMENT</span><h1>Orders</h1><p>Review customer purchases and keep fulfillment moving.</p></div>
            </div>
            {error && <p className="form-message form-error" role="alert">{error}</p>}
            <section className="admin-panel">
                <div className="admin-panel-heading admin-list-heading">
                    <div><h2>All orders</h2><p>Showing up to 300 most recent orders</p></div>
                    <div className="admin-list-controls">
                        <form className="admin-search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
                            <input aria-label="Search orders" placeholder="Order ID, customer or phone" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
                            <button type="submit">Search</button>
                        </form>
                        <select aria-label="Filter order status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select>
                    </div>
                </div>
                {loading ? <div className="admin-loading">Loading orders…</div> : orders.length === 0 ? <div className="admin-empty-state">No orders match these filters.</div> : (
                    <div className="admin-table-scroll">
                        <table className="admin-data-table">
                            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr></thead>
                            <tbody>{orders.map((order) => (
                                <tr key={order.id}>
                                    <td><Link className="admin-order-link" to={`/admin/orders/${order.id}`}>#{order.id}</Link></td>
                                    <td><span className="admin-table-primary">{order.name || 'Customer'}</span><small className="admin-table-secondary">{order.customer_email || order.phone || ''}</small></td>
                                    <td>{dateLabel(order.created_at)}</td>
                                    <td>{order.item_count}</td>
                                    <td><strong>{money(order.total_price)}</strong></td>
                                    <td><span>{order.payment_method || '—'}</span><small className="admin-table-secondary">{order.payment_status || ''}</small></td>
                                    <td><span className={`admin-status status-${String(order.status).toLowerCase()}`}>{label(order.status)}</span></td>
                                    <td><Link className="admin-small-button" to={`/admin/orders/${order.id}`}>Review</Link></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
