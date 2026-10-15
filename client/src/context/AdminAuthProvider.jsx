import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { AdminAuthContext } from './admin-auth-context.js';

// Keeps the signed-in administrator available to the admin area.
// This is independent from the customer session.
export default function AdminAuthProvider({ children }) {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        apiFetch('/api/admin/auth/me', { signal: controller.signal })
            .then((data) => setAdmin(data.admin ?? null))
            .catch((error) => {
                if (error.name !== 'AbortError') setAdmin(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, []);

    const login = useCallback(async (email, password) => {
        const data = await apiFetch('/api/admin/auth/login', {
            method: 'POST',
            body: { email, password },
        });

        setAdmin(data.admin);
        return data.admin;
    }, []);

    const logout = useCallback(async () => {
        await apiFetch('/api/admin/auth/logout', { method: 'POST' });
        setAdmin(null);
    }, []);

    const value = useMemo(
        () => ({ admin, loading, login, logout }),
        [admin, loading, login, logout]
    );

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
}
