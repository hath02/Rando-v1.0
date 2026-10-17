import { Outlet } from 'react-router-dom';
import AuthProvider from '../context/AuthProvider.jsx';
import CartProvider from '../context/CartProvider.jsx';
import Navbar from './Navbar.jsx';
import Chatbot from './Chatbot.jsx';

// Storefront shell: customer session, cart and navbar around every client page.
export default function ClientLayout() {
    return (
        <AuthProvider>
            <CartProvider>
                <Navbar />
                <Outlet />
                <Chatbot />
            </CartProvider>
        </AuthProvider>
    );
}
