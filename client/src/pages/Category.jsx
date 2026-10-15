
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SortSelect from '../components/SortSelect.jsx';
import { sortProducts } from '../utils/productSort.js';

const API_URL = 'http://localhost:3000/api/home';
const UPLOADS_URL = '/uploads/';

function getImageUrl(image) {
  if (!image) return `${UPLOADS_URL}placeholder.png`;

  if (/^https?:\/\//i.test(image)) return image;

  const filename = image
    .replace(/^\/+/, '')
    .replace(/^public\/uploads\//i, '')
    .replace(/^uploads\//i, '');

  return `${UPLOADS_URL}${filename}`;
}

function formatPrice(price) {
  return `$${Number(price || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function CategoryProductCard({ product }) {
  const isOnSale =
    Number(product.on_sale) === 1 &&
    Number(product.sale_price) > 0 &&
    Number(product.sale_price) < Number(product.price);

  return (
    <article className="category-product-card">
      <Link
        to={`/product/${product.id}`}
        className="category-product-image"
      >
        {isOnSale && <span className="category-sale-badge">Sale</span>}

        <img
          src={getImageUrl(product.image)}
          alt={product.name || 'Furniture product'}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = `${UPLOADS_URL}placeholder.png`;
          }}
        />
      </Link>

      <div className="category-product-info">
        <h2>
          <Link to={`/product/${product.id}`}>
            {product.name}
          </Link>
        </h2>

        <div className="category-product-prices">
          {isOnSale ? (
            <>
              <span className="category-sale-price">
                {formatPrice(product.sale_price)}
              </span>
              <span className="category-original-price">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span className="category-regular-price">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <p className="category-stock">
          {Number(product.stock) > 0 ? 'In stock' : 'Out of stock'}
        </p>

        <Link
          to={`/product/${product.id}`}
          className="category-view-button"
        >
          View Product
        </Link>
      </div>
    </article>
  );
}

export default function Category() {
  const { id } = useParams();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('popularity');

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategory() {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed (HTTP ${response.status}).`);
        }

        const data = await response.json();

        setCategories(data.categories ?? []);

        // Only display products belonging to this category.
        const matchingProducts = (data.products ?? []).filter(
          (product) => String(product.category_id) === id
        );

        setProducts(matchingProducts);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to load category:', err);
          setError(err.message || 'Could not load this category.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCategory();

    return () => controller.abort();
  }, [id]);

  const sortedProducts = useMemo(
    () => sortProducts(products, sortBy),
    [products, sortBy]
  );

  const category = categories.find(
    (item) => String(item.id) === id
  );

  return (
    <main className="category-page">
      <section className="category-page-banner">
        <p className="category-page-eyebrow">EXPLORE OUR COLLECTION</p>
        <h1>{category?.name || 'Furniture Collection'}</h1>
        <p>
          {category?.description ||
            'Discover furniture designed for your home.'}
        </p>
      </section>

      <section className="category-page-content">
        <div className="category-page-heading">
          <h2>Our Products</h2>
          {!loading && !error && (
            <div className="sort-controls">
              <span>{products.length} products</span>
              <SortSelect value={sortBy} onChange={setSortBy} />
            </div>
          )}
        </div>

        {loading ? (
          <p className="category-page-message">Loading products...</p>
        ) : error ? (
          <div className="category-page-message">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        ) : !category ? (
          <div className="category-page-message">
            <h3>Category not found</h3>
            <p>This category may no longer be available.</p>
            <Link to="/shop">Browse all products</Link>
          </div>
        ) : products.length === 0 ? (
          <div className="category-page-message">
            <h3>No products in this category yet</h3>
            <p>Please explore our other furniture collections.</p>
            <Link to="/shop">Browse all products</Link>
          </div>
        ) : (
          <div className="category-products-grid">
            {sortedProducts.map((product) => (
              <CategoryProductCard
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
