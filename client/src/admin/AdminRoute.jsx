import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/admin-auth-context.js';

// Guard admin-only pages. Unauthenticated visitors are sent to admin login.
export default function AdminRoute() {
    const { admin, loading } = useAdminAuth();
    const location = useLocation();

    if (loading) {
        return (
            <main className="placeholder-page">
                <p>Checking your session...</p>
            </main>
        );
    }

    if (!admin) {
        return (
            <Navigate
                to="/admin/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return <Outlet />;
}
