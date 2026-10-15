import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';

// Guards customer-only pages. Guests are sent to sign in and then
// returned to the page they asked for.
export default function RequireClient() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <main className="placeholder-page">
                <p>Loading...</p>
            </main>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/account"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return <Outlet />;
}
