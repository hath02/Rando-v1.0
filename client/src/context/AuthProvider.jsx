import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { AuthContext } from './auth-context.js';

// Keeps the signed-in customer available to the whole storefront.
export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Ask the server who is signed in when the app first loads.
    useEffect(() => {
        const controller = new AbortController();

        apiFetch('/api/auth/me', { signal: controller.signal })
            .then((data) => setUser(data.user ?? null))
            .catch((error) => {
                if (error.name !== 'AbortError') setUser(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, []);

    const login = useCallback(async (email, password) => {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: { email, password },
        });

        setUser(data.user);
        return data.user;
    }, []);

    const register = useCallback(async (details) => {
        return apiFetch('/api/auth/register', {
            method: 'POST',
            body: details,
        });
    }, []);

    const logout = useCallback(async () => {
        await apiFetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
    }, []);

    const updateProfile = useCallback(async (details) => {
        const data = await apiFetch('/api/auth/profile', {
            method: 'PATCH',
            body: details,
        });

        setUser(data.user);
        return data.user;
    }, []);

    // Upload or replace the profile photo. The file is sent as multipart form data.
    const updateAvatar = useCallback(async (file) => {
        const body = new FormData();
        body.append('avatar', file);

        const data = await apiFetch('/api/auth/avatar', {
            method: 'POST',
            body,
        });

        setUser(data.user);
        return data.user;
    }, []);

    const removeAvatar = useCallback(async () => {
        const data = await apiFetch('/api/auth/avatar', { method: 'DELETE' });

        setUser(data.user);
        return data.user;
    }, []);

    const value = useMemo(
        () => ({
            user,
            loading,
            login,
            register,
            logout,
            updateProfile,
            updateAvatar,
            removeAvatar,
        }),
        [
            user,
            loading,
            login,
            register,
            logout,
            updateProfile,
            updateAvatar,
            removeAvatar,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
