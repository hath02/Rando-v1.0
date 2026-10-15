import { Outlet } from 'react-router-dom';
import AdminAuthProvider from '../context/AdminAuthProvider.jsx';

// Admin shell: admin session only, and no storefront navbar.
export default function AdminLayout() {
    return (
        <AdminAuthProvider>
            <Outlet />
        </AdminAuthProvider>
    );
}
