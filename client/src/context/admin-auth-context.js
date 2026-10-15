import { createContext, useContext } from 'react';

// Administrator authentication state, provided by AdminAuthProvider.
export const AdminAuthContext = createContext(null);

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);

    if (!context) {
        throw new Error(
            'useAdminAuth must be used inside <AdminAuthProvider>.'
        );
    }

    return context;
}
