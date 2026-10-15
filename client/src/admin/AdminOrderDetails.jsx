import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
const dateLabel = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-US');
};
const label = (value) => String(value || '').replace(/^./, (c) => c.toUpperCase());
const transitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
};

export default function AdminOrderDetails() {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [nextStatus, setNextStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        apiFetch(`/api/admin/orders/${id}`, { signal: controller.signal })
            .then((result) => {
                setOrder(result.order);
                setItems(result.items || []);
                const currentStatus = String(result.order?.status || '').toLowerCase();
                setNextStatus(transitions[currentStatus]?.[0] || currentStatus);
            })
            .catch((err) => { if (err.name !== 'AbortError') setError(err.message || 'Could not load the order.'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [id, reloadKey]);

    async function saveStatus(event) {
        event.preventDefault();
        if (!order || !nextStatus || nextStatus === order.status) return;
        if (nextStatus === 'cancelled' && !window.confirm('Cancel this order and restore its items to stock? This action cannot be undone.')) return;
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await apiFetch(`/api/admin/orders/${id}/status`, { method: 'PATCH', body: { status: nextStatus } });
            setNotice(result.message || 'Order status updated.');
            setReloadKey((value) => value + 1);
        } catch (err) {
            setError(err.message || 'Could not update the order status.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="admin-page-content">
            <div className="admin-breadcrumb"><Link to="/admin/orders">← Back to orders</Link><span>/</span><span>Order #{id}</span></div>
            {error && <p className="form-message form-error" role="alert">{error}</p>}
            {notice && <p className="form-message form-success" role="status">{notice}</p>}
            {loading ? <div className="admin-loading">Loading order details…</div> : order ? (
                <>
                    <div className="admin-page-heading">
                        <div><span className="admin-kicker">ORDER MANAGEMENT</span><h1>Order #{order.id}</h1><p>Placed on {dateLabel(order.created_at)}</p></div>
                        <span className={`admin-status admin-status-large status-${String(order.status).toLowerCase()}`}>{label(order.status)}</span>
                    </div>
                    <div className="admin-order-detail-grid">
                        <section className="admin-panel admin-order-items-panel">
                            <div className="admin-panel-heading"><div><h2>Items ordered</h2><p>{items.length} line item{items.length === 1 ? '' : 's'}</p></div></div>
                            {items.length ? <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>Product</th><th>Unit price</th><th>Quantity</th><th>Subtotal</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.product_id}-${index}`}><td><div className="admin-product-cell">{item.image ? <img src={item.image} alt="" /> : <span className="admin-product-placeholder">◇</span>}<span><strong>{item.name || `Product #${item.product_id}`}</strong><small>Product ID #{item.product_id}</small></span></div></td><td>{money(item.price)}</td><td>{item.quantity}</td><td><strong>{money(Number(item.price) * Number(item.quantity))}</strong></td></tr>)}</tbody></table></div> : <div className="admin-empty-state">No items were found for this order.</div>}
                            <div className="admin-order-total"><span>Order total</span><strong>{money(order.total_price)}</strong></div>
                        </section>

                        <aside className="admin-order-side-stack">
                            <section className="admin-panel">
                                <div className="admin-panel-heading"><div><h2>Update status</h2><p>Allowed next steps only</p></div></div>
                                {transitions[String(order.status).toLowerCase()]?.length ? <form className="admin-status-form" onSubmit={saveStatus}>
                                    <label className="admin-field">Move order to<select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{transitions[String(order.status).toLowerCase()].map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
                                    <button type="submit" className="admin-primary-button" disabled={saving || nextStatus === order.status}>{saving ? 'Saving…' : 'Update order status'}</button>
                                </form> : <p className="admin-readonly-note">This order is {order.status}. Its status cannot be changed further.</p>}
                                {String(order.status).toLowerCase() === 'pending' || String(order.status).toLowerCase() === 'processing' ? <p className="admin-stock-note">Cancelling restores the ordered quantities to product stock.</p> : null}
                            </section>
                            <section className="admin-panel">
                                <div className="admin-panel-heading"><div><h2>Customer & delivery</h2><p>Details captured at checkout</p></div></div>
                                <dl className="admin-detail-list">
                                    <div><dt>Name</dt><dd>{order.name || '—'}</dd></div>
                                    <div><dt>Email</dt><dd>{order.customer_email || '—'}</dd></div>
                                    <div><dt>Phone</dt><dd>{order.phone || '—'}</dd></div>
                                    <div><dt>Delivery address</dt><dd>{order.address || '—'}</dd></div>
                                </dl>
                            </section>
                            <section className="admin-panel">
                                <div className="admin-panel-heading"><div><h2>Payment</h2><p>Recorded payment details</p></div></div>
                                <dl className="admin-detail-list">
                                    <div><dt>Method</dt><dd>{order.payment_method || '—'}</dd></div>
                                    <div><dt>Payment status</dt><dd>{order.payment_status || '—'}</dd></div>
                                    <div><dt>Customer account</dt><dd>#{order.account_id}</dd></div>
                                </dl>
                            </section>
                        </aside>
                    </div>
                </>
            ) : <div className="admin-empty-state">Order not found.</div>}
        </div>
    );
}
