
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SortSelect from '../components/SortSelect.jsx';
import { sortProducts } from '../utils/productSort.js';

// Reuse the existing Express API.
const API_URL = 'http://localhost:3000/api/home';
const UPLOADS_URL = '/uploads/';

// Normalize image paths stored in the database.
function getImageUrl(image) {
  if (!image) return `${UPLOADS_URL}placeholder.png`;

  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  const filename = image
    .replace(/^\/+/, '')
    .replace(/^public\/uploads\//i, '')
    .replace(/^uploads\//i, '');

  return `${UPLOADS_URL}${filename}`;
}

// Format prices consistently across the page.
function formatPrice(price) {
  return `$${Number(price || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Display one discounted product.
function SaleProductCard({ product }) {
  const originalPrice = Number(product.price);
  const salePrice = Number(product.sale_price);

  const discount = originalPrice > 0
    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
    : 0;

  return (
    <article className="sale-card">
      <Link
        to={`/product/${product.id}`}
        className="sale-card-image"
      >
        <span className="sale-badge">
          {discount > 0 ? `-${discount}%` : 'SALE'}
        </span>

        <img
          src={getImageUrl(product.image)}
          alt={product.name || 'Furniture product'}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = `${UPLOADS_URL}placeholder.png`;
          }}
        />
      </Link>

      <div className="sale-card-content">
        <p className="sale-category">
          {product.category_name || 'Furniture'}
        </p>

        <h2>
          <Link to={`/product/${product.id}`}>
            {product.name}
          </Link>
        </h2>

        <div className="sale-prices">
          <span className="sale-current-price">
            {formatPrice(product.sale_price)}
          </span>

          <span className="sale-original-price">
            {formatPrice(product.price)}
          </span>
        </div>

        <p className="sale-stock">
          {Number(product.stock) > 0
            ? 'In stock'
            : 'Out of stock'}
        </p>

        <Link
          to={`/product/${product.id}`}
          className="sale-view-button"
        >
          View Product
        </Link>
      </div>
    </article>
  );
}

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('popularity');

  useEffect(() => {
    async function loadSaleProducts() {
      try {
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error(
            `Could not load sale products (HTTP ${response.status}).`
          );
        }

        const data = await response.json();

        // Only include products with a valid discount.
        const saleProducts = (data.products ?? []).filter(
          (product) =>
            Number(product.on_sale) === 1 &&
            Number(product.sale_price) > 0 &&
            Number(product.price) > Number(product.sale_price)
        );

        setProducts(saleProducts);
      } catch (err) {
        console.error('Failed to load sale products:', err);
        setError(err.message || 'Could not load sale products.');
      } finally {
        setLoading(false);
      }
    }

    loadSaleProducts();
  }, []);

  const sortedProducts = useMemo(
    () => sortProducts(products, sortBy),
    [products, sortBy]
  );

  return (
    <main className="sales-page">
      <section className="sales-hero">
        <p className="sales-eyebrow">SPECIAL OFFERS</p>
        <h1>Furniture Sale</h1>
        <p>
          Discover selected furniture at special prices
          and find something you love for your home.
        </p>
      </section>

      <section className="sales-products-section">
        <div className="sales-heading">
          <div>
            <p className="sales-eyebrow">LIMITED OFFERS</p>
            <h2>Shop the Sale</h2>
          </div>

          {!loading && !error && (
            <div className="sort-controls">
              <span className="sales-count">
                {products.length} products
              </span>
              <SortSelect value={sortBy} onChange={setSortBy} />
            </div>
          )}
        </div>

        {loading ? (
          <p className="sales-message">Loading sale products...</p>
        ) : error ? (
          <div className="sales-message sales-error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="sales-message">
            <h3>No sale products available</h3>
            <p>Check back later for special offers.</p>
            <Link to="/shop" className="sale-view-button">
              Browse All Products
            </Link>
          </div>
        ) : (
          <div className="sales-grid">
            {sortedProducts.map((product) => (
              <SaleProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
