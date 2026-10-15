
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { useCart } from '../context/cart-context.js';

// Existing Express API that returns products and categories.
const API_URL = 'http://localhost:3000/api/home';

export default function Navbar() {
    // Controls whether the Collections dropdown is open.
    const [collectionsOpen, setCollectionsOpen] = useState(false);

    // Categories retrieved from the MySQL database through Express.
    const [categories, setCategories] = useState([]);

    // Controls the mobile navigation menu.
    const [menuOpen, setMenuOpen] = useState(false);

    // Signed-in customer (null when signed out).
    const { user, logout } = useAuth();
    const { totalItems } = useCart();
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch categories when the navbar first mounts.
        async function loadCategories() {
            try {
                const response = await fetch(API_URL);

                // Handle unsuccessful HTTP responses.
                if (!response.ok) {
                    throw new Error('Could not load categories');
                }

                const data = await response.json();

                // Use an empty array if the API has no categories property.
                setCategories(data.categories ?? []);
            } catch (error) {
                // Log API errors for debugging in the browser console.
                console.error('Navbar categories:', error);
            }
        }

        loadCategories();
    }, []);

    // Sign the customer out and return to the homepage.
    async function handleLogout() {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    }

    // Close both menus after navigation.
    function closeMenus() {
        setMenuOpen(false);
        setCollectionsOpen(false);
    }

    return (
        <header className="navbar">
            <div className="nav-container">

                {/* Logo: clicking it navigates to the homepage. */}
                <div className="nav-left">
                    <Link to="/" className="logo" onClick={closeMenus}>
                        Rando
                    </Link>
                </div>

                {/* Mobile hamburger button. CSS controls when it appears. */}
                <button
                    className="nav-menu-toggle"
                    type="button"
                    aria-label="Toggle navigation"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    ☰
                </button>

                {/* Main navigation links. */}
                <nav className={`nav-center ${menuOpen ? 'nav-open' : ''}`}>

                    {/* The end prop matches only the exact homepage route. */}
                    <NavLink to="/" end onClick={closeMenus}>
                        Home
                    </NavLink>

                    <NavLink to="/shop" onClick={closeMenus}>
                        Shop
                    </NavLink>

                    <NavLink to="/sales" onClick={closeMenus}>
                        Sales
                    </NavLink>

                    {/* Collections dropdown populated from the API. */}
                    <div className="dropdown">
                        <button
                            className="dropdown-btn"
                            type="button"
                            aria-expanded={collectionsOpen}
                            onClick={() =>
                                setCollectionsOpen((open) => !open)
                            }
                        >
                            Collections ⏷
                        </button>

                        {/* CSS displays this element when dropdown-open is present. */}
                        <div
                            className={`dropdown-content ${
                                collectionsOpen ? 'dropdown-open' : ''
                            }`}
                        >
                            {categories.length > 0 ? (
                                // Create one link for each database category.
                                categories.map((category) => (
                                    <Link
                                        key={category.id}
                                        to={`/category/${category.id}`}
                                        onClick={closeMenus}
                                    >
                                        {category.name}
                                    </Link>
                                ))
                            ) : (
                                // Shown when categories are empty or not loaded yet.
                                <span className="dropdown-empty">
                                    No collections available
                                </span>
                            )}
                        </div>
                    </div>

                    <NavLink to="/account" onClick={closeMenus}>
                        My Account
                    </NavLink>

                    <NavLink to="/cart" onClick={closeMenus}>
                        Cart
                        {totalItems > 0 && (
                            <span
                                className="cart-count"
                                aria-label={`${totalItems} items in cart`}
                            >
                                {totalItems}
                            </span>
                        )}
                    </NavLink>
                </nav>

                {/* Account area shown separately on larger screens. */}
                <div className="nav-right">
                    {user ? (
                        <div className="nav-user">
                            <span>Hi, {user.username || user.email}</span>
                            <button
                                type="button"
                                className="text-button"
                                onClick={handleLogout}
                            >
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <Link to="/account" onClick={closeMenus}>
                            Sign in
                        </Link>
                    )}
                </div>

            </div>
        </header>
    );
}
