import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { getImageUrl } from '../lib/images.js';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function AdminCustomers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ q: search, status });
        apiFetch(`/api/admin/customers?${params.toString()}`, { signal: controller.signal })
            .then((result) => setCustomers(result.customers || []))
            .catch((err) => { if (err.name !== 'AbortError') setError(err.message || 'Could not load customers.'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [search, status, reloadKey]);

    async function changeStatus(customer) {
        const nextStatus = customer.status === 'active' ? 'inactive' : 'active';
        const action = nextStatus === 'inactive' ? 'deactivate' : 'reactivate';
        if (!window.confirm(`Are you sure you want to ${action} ${customer.username}?`)) return;
        setError('');
        setNotice('');
        try {
            const result = await apiFetch(`/api/admin/customers/${customer.id}/status`, { method: 'PATCH', body: { status: nextStatus } });
            setNotice(result.message || 'Customer status updated.');
            setReloadKey((value) => value + 1);
        } catch (err) {
            setError(err.message || 'Could not update customer status.');
        }
    }

    return (
        <div className="admin-page-content">
            <div className="admin-page-heading"><div><span className="admin-kicker">CUSTOMER CARE</span><h1>Customers</h1><p>Review customer accounts, purchase activity, and account access.</p></div></div>
            {error && <p className="form-message form-error" role="alert">{error}</p>}
            {notice && <p className="form-message form-success" role="status">{notice}</p>}
            <section className="admin-panel">
                <div className="admin-panel-heading admin-list-heading">
                    <div><h2>Customer directory</h2><p>{customers.length} customer{customers.length === 1 ? '' : 's'} matching the current filters</p></div>
                    <div className="admin-list-controls">
                        <form className="admin-search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}><input aria-label="Search customers" placeholder="Name, email, phone or ID" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /><button type="submit">Search</button></form>
                        <select aria-label="Filter customer status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
                    </div>
                </div>
                {loading ? <div className="admin-loading">Loading customers…</div> : customers.length === 0 ? <div className="admin-empty-state">No customers match these filters.</div> : (
                    <div className="admin-table-scroll"><table className="admin-data-table">
                        <thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total spend</th><th>Status</th><th>Account access</th></tr></thead>
                        <tbody>{customers.map((customer) => <tr key={customer.id}>
                            <td><div className="admin-customer-cell"><span className="admin-avatar customer-avatar">{customer.avatar ? <img src={getImageUrl(customer.avatar)} alt="" /> : (customer.username || 'C').slice(0, 1).toUpperCase()}</span><span><strong>{customer.username || 'Customer'}</strong><small>Customer #{customer.id}</small></span></div></td>
                            <td><span className="admin-table-primary">{customer.email || '—'}</span><small className="admin-table-secondary">{customer.phone || 'No phone added'}</small></td>
                            <td>{customer.order_count}</td><td><strong>{money(customer.total_spent)}</strong></td>
                            <td><span className={`admin-status ${customer.status === 'active' ? 'status-active' : 'status-inactive'}`}>{customer.status || 'unknown'}</span></td>
                            <td><button type="button" className={`admin-small-button ${customer.status === 'active' ? 'danger' : ''}`} onClick={() => changeStatus(customer)}>{customer.status === 'active' ? 'Deactivate' : 'Reactivate'}</button></td>
                        </tr>)}</tbody>
                    </table></div>
                )}
            </section>
            <p className="admin-footnote">Deactivated customers cannot sign in while their account is inactive. Their order history is retained.</p>
        </div>
    );
}
