import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/admin-auth-context.js';
import { useState } from 'react';

const navItems = [
    { to: '/admin', label: 'Overview', icon: '▦', end: true },
    { to: '/admin/products', label: 'Products', icon: '◇' },
    { to: '/admin/orders', label: 'Orders', icon: '▤' },
    { to: '/admin/customers', label: 'Customers', icon: '♙' },
    { to: '/admin/reviews', label: 'Reviews', icon: '★' },
    { to: '/admin/statistics', label: 'Statistics', icon: '◔' },
];

export default function AdminShell() {
    const { admin, logout } = useAdminAuth();
    const navigate = useNavigate();
    const [signingOut, setSigningOut] = useState(false);
    const [logoutError, setLogoutError] = useState('');

    async function handleLogout() {
        setSigningOut(true);
        setLogoutError('');
        try {
            await logout();
            navigate('/admin/login', { replace: true });
        } catch (error) {
            setLogoutError(error.message || 'Could not sign out.');
            setSigningOut(false);
        }
    }

    return (
        <div className="admin-app-shell">
            <aside className="admin-sidebar">
                <NavLink to="/admin" className="admin-brand" end>
                    <span className="admin-brand-mark">R</span>
                    <span>RANDO <small>ADMIN CONSOLE</small></span>
                </NavLink>

                <div className="admin-sidebar-caption">WORKSPACE</div>
                <nav className="admin-nav" aria-label="Admin navigation">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `admin-nav-link${isActive ? ' active' : ''}`}
                        >
                            <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-sidebar-bottom">
                    <div className="admin-sidebar-caption">SIGNED IN AS</div>
                    <div className="admin-user-chip">
                        <span className="admin-avatar">{(admin?.username || admin?.email || 'A').slice(0, 1).toUpperCase()}</span>
                        <span className="admin-user-copy">
                            <strong>{admin?.username || 'Administrator'}</strong>
                            <small>{admin?.email || ''}</small>
                        </span>
                    </div>
                    {logoutError && <p className="form-message form-error" role="alert">{logoutError}</p>}
                    <button type="button" className="admin-logout-button" onClick={handleLogout} disabled={signingOut}>
                        {signingOut ? 'Signing out…' : '↗  Sign out'}
                    </button>
                    <NavLink to="/" className="admin-back-store">← Back to storefront</NavLink>
                </div>
            </aside>

            <div className="admin-main-column">
                <header className="admin-topbar">
                    <div>
                        <span className="admin-topbar-eyebrow">RANDO SHOP / MANAGEMENT</span>
                        <span className="admin-topbar-title">Store administration</span>
                    </div>
                    <span className="admin-session-status"><i /> Secure admin session</span>
                </header>
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
