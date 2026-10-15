
import { useEffect, useState } from 'react';
import { formatPrice } from '../lib/format.js';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { useCart } from '../context/cart-context.js';

// API endpoint provided by your Express backend.
// If your backend port changes, update this URL.
const API_URL =
    (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/home';

// Vite serves files inside client/public at the root URL.
// Example: public/uploads/decor.jpg becomes /uploads/decor.jpg.
const UPLOADS_URL = '/uploads/';

// Normalize image paths stored in the database.
// Supports: "image.jpg", "uploads/image.jpg",
// "public/uploads/image.jpg", and external HTTP(S) URLs.
function getImageUrl(image) {
    // Use a default image if the database has no filename.
    if (!image) return `${UPLOADS_URL}placeholder.png`;

    // Preserve a complete external image URL.
    if (/^https?:\/\//i.test(image)) {
        return image;
    }

    // Remove old PHP-style path prefixes from stored filenames.
    const filename = image
        .replace(/^\/+/, '')
        .replace(/^public\/uploads\//i, '')
        .replace(/^uploads\//i, '');

    return `${UPLOADS_URL}${filename}`;
}

// Reusable card for displaying one product.
function ProductCard({ product }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { addToCart } = useCart();

    const [adding, setAdding] = useState(false);
    const [cartMessage, setCartMessage] = useState(null);

    // Add one unit to the signed-in customer's cart.
    async function handleAddToCart() {
        // Guests sign in first, then come back to this page.
        if (!user) {
            navigate('/account', { state: { from: location.pathname } });
            return;
        }

        setAdding(true);
        setCartMessage(null);

        try {
            const text = await addToCart(product.id, 1);
            setCartMessage({ type: 'success', text });
        } catch (err) {
            setCartMessage({ type: 'error', text: err.message });
        } finally {
            setAdding(false);
        }
    }

    // Treat a product as on sale only if it has a valid sale price.
    const isOnSale =
        Number(product.on_sale) === 1 &&
        Number(product.sale_price) > 0;

    return (
        <article className="home-product-card">
            {/* Display the Sale badge only for sale products. */}
            {isOnSale && (
                <span className="home-sale-badge">Sale!</span>
            )}

            <div className="home-product-image">
                {/* Open the product details route when the image is clicked. */}
                <Link to={`/product/${product.id}`}>
                    <img
                        src={getImageUrl(product.image)}
                        alt={product.name || 'Product'}
                        onError={(event) => {
                            // Avoid an infinite loop if the fallback is also missing.
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = `${UPLOADS_URL}placeholder.png`;
                        }}
                    />
                </Link>
            </div>

            <div className="home-product-info">
                <p className="home-product-category">
                    {product.category_name || 'Other'}
                </p>

                <h3>{product.name}</h3>

                <div className="home-price-box">
                    {/* Show the original price only when on sale. */}
                    {isOnSale && (
                        <span className="home-old-price">
                            {formatPrice(product.price)}
                        </span>
                    )}

                    {/* Show the discounted price or the regular price. */}
                    <span className="home-new-price">
                        {formatPrice(
                            isOnSale ? product.sale_price : product.price
                        )}
                    </span>
                </div>

                <button
                    className="btn add-to-cart"
                    type="button"
                    disabled={adding || Number(product.stock) <= 0}
                    onClick={handleAddToCart}
                >
                    {adding
                        ? 'Adding...'
                        : Number(product.stock) <= 0
                          ? 'Out of stock'
                          : 'Add to cart'}
                </button>

                {cartMessage && (
                    <p
                        className={`form-message ${
                            cartMessage.type === 'success'
                                ? 'form-success'
                                : 'form-error'
                        }`}
                        role="status"
                    >
                        {cartMessage.text}
                    </p>
                )}
            </div>
        </article>
    );
}

// Reusable section containing a category banner and up to three products.
function CategorySection({ category, categoryId, products }) {
    // Convert "Living Room" to "living-room.jpg".
    // If your actual filenames differ, change this logic or use a mapping.
    const slug = category.toLowerCase().replaceAll(' ', '-');

    return (
        <div className="category-section">
            <div className="category-banner">
                <img
                    src={getImageUrl(`${slug}.jpg`)}
                    alt={category}
                    onError={(event) => {
                        // Some categories may not have matching banner images.
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = `${UPLOADS_URL}placeholder.png`;
                    }}
                />

                <div className="category-overlay">
                    <span>Collection</span>
                    <h2>{category}</h2>

                    {/* categoryId comes from the database product records. */}
                    <Link
                        to={`/category/${categoryId}`}
                        className="category-btn"
                    >
                        See more
                    </Link>
                </div>
            </div>

            <div className="home-products-grid">
                {/* Show at most three products for each category. */}
                {products.slice(0, 3).map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}

export default function Home() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch homepage data from Express when this page first loads.
        async function loadHome() {
            try {
                const response = await fetch(API_URL);

                if (!response.ok) {
                    throw new Error(
                        `Could not load homepage data (HTTP ${response.status}).`
                    );
                }

                const data = await response.json();

                // The homepage only needs the products array.
                // The Navbar fetches categories independently.
                setProducts(data.products ?? []);
            } catch (err) {
                // Show a readable message if the API request fails.
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                // Stop displaying the loading message in every case.
                setLoading(false);
            }
        }

        loadHome();
    }, []);

    // Display a loading message while waiting for the API.
    if (loading) {
        return (
            <main>
                <p>Loading products...</p>
            </main>
        );
    }

    // Display the API error rather than a blank homepage.
    if (error) {
        return (
            <main>
                <p>{error}</p>
                <button type="button" onClick={() => window.location.reload()}>
                    Try again
                </button>
            </main>
        );
    }

    // Group products by category name for the homepage layout.
    const groupedProducts = products.reduce((groups, product) => {
        const category = product.category_name || 'Other';

        if (!groups[category]) {
            groups[category] = [];
        }

        groups[category].push(product);
        return groups;
    }, {});

    // Only show products that have a valid sale price.
    const saleProducts = products.filter(
        (product) =>
            Number(product.on_sale) === 1 &&
            Number(product.sale_price) > 0
    );

    return (
        <main>
            {/* Main promotional hero banner. */}
            <section className="hero-section hero-primary">
                <div className="hero-overlay">
                    <div className="hero-content-primary">
                        <h1>Better Furniture. Better Living.</h1>
                        <p>
                            Turn your house into a home with furniture that brings
                            warmth, comfort, and meaningful moments to every corner.
                        </p>

                        {/* React Router navigates without a full page reload. */}
                        <Link to="/shop" className="hero-btn-primary">
                            See More
                        </Link>
                    </div>
                </div>
            </section>

            {/* Main product collections. */}
            <section
                className="featured-section featured-primary"
                id="shop"
            >
                <div className="featured-content">
                    {Object.entries(groupedProducts).map(
                        ([category, items]) => (
                            <CategorySection
                                key={category}
                                category={category}
                                // Each product includes category_id from the API.
                                categoryId={items[0]?.category_id}
                                products={items}
                            />
                        )
                    )}
                </div>
            </section>

            {/* Second hero banner promoting discounted products. */}
            <section className="hero-section hero-secondary">
                <div className="hero-overlay">
                    <div className="hero-content-secondary">
                        <h1>Discounted Furniture</h1>

                        <Link to="/sales" className="hero-btn-secondary">
                            Shop now
                        </Link>
                    </div>
                </div>
            </section>

            {/* Sale products section. */}
            <section
                className="featured-section featured-secondary"
                id="sales"
            >
                <div className="featured-content">
                    <div className="category-section">
                        <div className="category-banner">
                            <img
                                src={`${UPLOADS_URL}on-sale.jpg`}
                                alt="Sale"
                                onError={(event) => {
                                    event.currentTarget.onerror = null;
                                    event.currentTarget.src =
                                        `${UPLOADS_URL}placeholder.png`;
                                }}
                            />

                            <div className="category-overlay">
                                <span>Don't miss out on</span>
                                <h2>Our Sale!</h2>

                                <Link
                                    to="/sales"
                                    className="category-btn"
                                >
                                    See more
                                </Link>
                            </div>
                        </div>

                        <div className="home-products-grid">
                            {saleProducts.slice(0, 3).map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
