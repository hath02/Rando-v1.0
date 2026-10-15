import { createContext, useContext } from 'react';

// Customer authentication state, provided by AuthProvider.
export const AuthContext = createContext(null);

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside <AuthProvider>.');
    }

    return context;
}
