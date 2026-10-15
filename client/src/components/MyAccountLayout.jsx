import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { getImageUrl } from '../lib/images.js';

export default function MyAccountLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <main className="placeholder-page">
        <p>Loading your account...</p>
      </main>
    );
  }

  // Keep the sign-in/register screen uncluttered when the visitor is a guest.
  if (!user) return <Outlet />;

  async function handleLogout() {
    try {
      await logout();
      navigate('/account', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  const initials = String(user.username || user.email || 'U')
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <main className="container customer-account-page">
      <header className="customer-account-heading">
        <p className="account-eyebrow">RANDO CUSTOMER AREA</p>
        <h1>My Account</h1>
        <p>Keep track of your orders and manage your personal information.</p>
      </header>

      <div className="customer-account-layout">
        <aside className="account-sidebar">
          <div className="account-sidebar-user">
            <span className="account-avatar" aria-hidden="true">
              {user.avatar ? <img src={getImageUrl(user.avatar)} alt="" /> : initials}
            </span>
            <span className="account-sidebar-user-text">
              <strong>{user.username || 'Customer'}</strong>
              <span title={user.email}>{user.email}</span>
            </span>
          </div>

          <p className="account-sidebar-label">ACCOUNT MENU</p>
          <nav className="account-sidebar-nav" aria-label="My Account">
            <NavLink to="/account" end className={({ isActive }) => isActive ? 'account-sidebar-link active' : 'account-sidebar-link'}>
              <span aria-hidden="true">⌂</span> Overview
            </NavLink>
            <NavLink to="/account/orders" className={({ isActive }) => isActive ? 'account-sidebar-link active' : 'account-sidebar-link'}>
              <span aria-hidden="true">▤</span> Order History
            </NavLink>
            <NavLink to="/account/profile" className={({ isActive }) => isActive ? 'account-sidebar-link active' : 'account-sidebar-link'}>
              <span aria-hidden="true">◎</span> Profile Settings
            </NavLink>
          </nav>

          <div className="account-sidebar-footer">
            <button type="button" onClick={handleLogout} className="account-sidebar-signout">
              <span aria-hidden="true">↪</span> Sign out
            </button>
          </div>
        </aside>

        <div className="customer-account-content">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
