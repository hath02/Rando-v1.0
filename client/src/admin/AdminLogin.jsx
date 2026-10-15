import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/admin-auth-context.js';

export default function AdminLogin() {
    const { admin, loading, login } = useAdminAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Already signed in as an admin: go straight to the dashboard.
    if (!loading && admin) {
        return <Navigate to="/admin" replace />;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const data = new FormData(event.currentTarget);
        const email = String(data.get('email') ?? '').trim();
        const password = String(data.get('password') ?? '');

        setError('');
        setSubmitting(true);

        try {
            await login(email, password);
            navigate(location.state?.from || '/admin', { replace: true });
        } catch (err) {
            setError(err.message || 'Could not sign in.');
            setSubmitting(false);
        }
    }

    return (
        <main className="auth-page">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Admin sign in</h2>

                {error && (
                    <p className="form-message form-error" role="alert">
                        {error}
                    </p>
                )}

                <label htmlFor="admin-email">Email</label>
                <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                />

                <label htmlFor="admin-password">Password</label>
                <input
                    id="admin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                />

                <button
                    type="submit"
                    className="btn"
                    disabled={submitting || loading}
                >
                    {submitting ? 'Signing in...' : 'Sign in'}
                </button>

                <p className="link">
                    <Link to="/">Back to the shop</Link>
                </p>
            </form>
        </main>
    );
}
