import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { capitalize, formatDate, formatPrice } from '../lib/format.js';

const STATUS_FILTERS = [
    { value: 'all', label: 'All orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        apiFetch('/api/orders', { signal: controller.signal })
            .then((data) => setOrders(data.orders ?? []))
            .catch((err) => {
                if (err.name !== 'AbortError') setError(err.message || 'Could not load your orders.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, []);

    const filteredOrders = useMemo(() => {
        const query = searchTerm.trim().replace(/^#/, '').toLowerCase();
        return orders.filter((order) => {
            const matchesStatus = statusFilter === 'all' || String(order.status).toLowerCase() === statusFilter;
            const matchesSearch = !query || String(order.id).toLowerCase().includes(query);
            return matchesStatus && matchesSearch;
        });
    }, [orders, searchTerm, statusFilter]);

    if (loading) return <div className="account-panel account-loading"><p>Loading your orders...</p></div>;

    return (
        <section className="order-history account-panel">
            <div className="account-content-heading order-history-heading">
                <p className="account-eyebrow">YOUR PURCHASES</p>
                <h2>Order History</h2>
                <p>Review your past purchases and check the latest order status.</p>
            </div>

            {error && <p className="form-message form-error" role="alert">{error}</p>}

            {!error && orders.length === 0 && (
                <div className="checkout-empty order-history-empty">
                    <span className="order-empty-icon" aria-hidden="true">▤</span>
                    <h3>No orders yet</h3>
                    <p>Your orders will appear here after you complete checkout.</p>
                    <Link to="/shop" className="btn">Explore the collection</Link>
                </div>
            )}

            {orders.length > 0 && (
                <>
                    <div className="order-history-toolbar">
                        <label className="order-search-field">
                            <span>Search by order number</span>
                            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="e.g. 1042" aria-label="Search by order number" />
                        </label>
                        <label className="order-status-filter">
                            <span>Filter status</span>
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                {STATUS_FILTERS.map((filter) => <option value={filter.value} key={filter.value}>{filter.label}</option>)}
                            </select>
                        </label>
                    </div>

                    <div className="order-results-count">
                        Showing <strong>{filteredOrders.length}</strong> of <strong>{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'}
                    </div>

                    {filteredOrders.length > 0 ? (
                        <div className="order-table-wrapper">
                            <table className="order-table">
                                <thead><tr><th>Order</th><th>Date placed</th><th>Items</th><th>Total</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead>
                                <tbody>
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id}>
                                            <td className="order-number-cell">#{order.id}</td>
                                            <td>{formatDate(order.created_at)}</td>
                                            <td>{order.item_count} {order.item_count === 1 ? 'item' : 'items'}</td>
                                            <td className="order-total-cell">{formatPrice(order.total_price)}</td>
                                            <td><span className={`order-status status-${String(order.status).toLowerCase()}`}>{capitalize(order.status)}</span></td>
                                            <td className="order-action"><Link to={`/account/orders/${order.id}`} aria-label={`View order ${order.id}`}>View details <span aria-hidden="true">→</span></Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="order-no-match">
                            <h3>No matching orders</h3>
                            <p>Try another order number or clear the status filter.</p>
                            <button type="button" className="text-button" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>Clear filters</button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
