import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SortSelect from '../components/SortSelect.jsx';
import { sortProducts } from '../utils/productSort.js';
import { formatPrice } from '../lib/format.js';

// Use the configured API URL or fall back to the local backend.
const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Shop() {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('popularity');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Load products and categories from existing API.
    useEffect(() => {
        async function loadShopData() {
            try {
                const response = await fetch(`${API_URL}/api/home`);

                if (!response.ok) {
                    throw new Error('Unable to load products.');
                }

                const data = await response.json();
                setProducts(data.products ?? []);
            } catch (err) {
                setError(err.message || 'Something went wrong.');
            } finally {
                setLoading(false);
            }
        }

        loadShopData();
    }, []);

    // Filter products by search text, then order them by the chosen sort.
    const visibleProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        const matches = products.filter((product) =>
            (product.name ?? '').toLowerCase().includes(term)
        );

        return sortProducts(matches, sortBy);
    }, [products, search, sortBy]);

    // Support image URLs, absolute paths, and filenames.
    function getImageUrl(image) {
        if (!image) return '/uploads/placeholder.png';

        if (/^https?:\/\//i.test(image) || image.startsWith('/')) {
            return image;
        }

        return `/uploads/${image}`;
    }

    if (loading) {
        return <main className="placeholder-page"><p>Loading products...</p></main>;
    }

    if (error) {
        return <main className="placeholder-page"><p>{error}</p></main>;
    }

    return (
        <main className='shop-page'>
            <section className='shop-page-banner'>
                <div className='shop-page-banner-content'>

                    <p className="shop-page-eyebrow">RANDO SHOP</p>

                    <h1>Shop All Products!</h1>

                    <p>
                        Find thoughtfully chosen furniture and home decor
                        to make your space feel like home.
                    </p>
                </div>
            </section>

            <section className='shop-toolbar'>
                <input
                    type="search"
                    placeholder='Search products...'
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    aria-label='Search products'
                />

                <SortSelect value={sortBy} onChange={setSortBy} />
            </section>

            <section className='shop-products'>
                <p>{visibleProducts.length} product(s) found</p>

                {visibleProducts.length === 0 ? (
                    <p>No products match your search.</p>
                ) : (
                    <div className='home-products-grid'>
                        {visibleProducts.map((product) => (
                            <article className='home-product-card' key={product.id}>
                                <Link to={`/product/${product.id}`}>
                                    <div className='home-product-image'>
                                        {Boolean(product.on_sale) && (
                                            <span className='home-sale-badge'>Sale</span>
                                        )}

                                        <img
                                            src={getImageUrl(product.image)}
                                            alt={product.name}
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src = '/uploads/placeholder.png';
                                            }}
                                        />
                                    </div>
                                </Link>

                                <div className='home-product-info'>
                                    <p className='home-product-category'>
                                        {product.category_name || 'Uncategorized'}
                                    </p>

                                    <h3>
                                        <Link to={`/product/${product.id}`}>
                                            {product.name}
                                        </Link>
                                    </h3>

                                    <div className='home-price-box'>
                                        {Boolean(product.on_sale) &&
                                        Number(product.sale_price) > 0 ? (
                                            <>
                                                <span className='home-old-price'>
                                                    {formatPrice(product.price)}
                                                </span>
                                                <span className='home-new-price'>
                                                    {formatPrice(product.sale_price)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className='home-new-price'>
                                                {formatPrice(product.price)}
                                            </span>
                                        )}
                                    </div>

                                    <p>
                                        {Number(product.stock) > 0
                                            ? `In Stock: ${product.stock}`
                                            : 'Out of stock'}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
