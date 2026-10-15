import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { useCart } from '../context/cart-context.js';
import { formatPrice } from '../lib/format.js';

const API_URL = (
    import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '');

export default function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [quantity, setQuantity] = useState('1');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [adding, setAdding] = useState(false);
    const [cartMessage, setCartMessage] = useState(null);

    const [reviews, setReviews] = useState([]);
    const [reviewSummary, setReviewSummary] = useState({
        total_reviews: 0,
        average_rating: 0,
    });
    const [myReview, setMyReview] = useState(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [reviewsError, setReviewsError] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [reviewMessage, setReviewMessage] = useState('');

    // Load product details using the ID from the URL.
    useEffect(() => {
        const controller = new AbortController();

        async function loadProduct() {
            setLoading(true);
            setError('');
            setProduct(null);
            setQuantity('1');
            setCartMessage(null);

            try {
                const response = await fetch(
                    `${API_URL}/api/products/${id}`,
                    { signal: controller.signal }
                );
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.message || 'Unable to load product.');
                }

                setProduct(data.product);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError(err.message || 'Something went wrong.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadProduct();
        return () => controller.abort();
    }, [id]);

    // Load public reviews and the rating summary for this product.
    useEffect(() => {
        const controller = new AbortController();

        async function loadReviews() {
            setReviewsLoading(true);
            setReviewsError('');

            try {
                const response = await fetch(
                    `${API_URL}/api/products/${id}/reviews`,
                    { signal: controller.signal }
                );
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.message || 'Unable to load reviews.');
                }

                setReviews(data.reviews || []);
                setReviewSummary(
                    data.summary || {
                        total_reviews: 0,
                        average_rating: 0,
                    }
                );
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setReviewsError(err.message || 'Unable to load reviews.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setReviewsLoading(false);
                }
            }
        }

        loadReviews();
        return () => controller.abort();
    }, [id]);

    // Load the signed-in customer's existing review, if one exists.
    useEffect(() => {
        const controller = new AbortController();

        setMyReview(null);
        setReviewRating(5);
        setReviewComment('');
        setReviewError('');
        setReviewMessage('');

        if (!user) {
            return () => controller.abort();
        }

        async function loadMyReview() {
            try {
                const response = await fetch(
                    `${API_URL}/api/products/${id}/reviews/mine`,
                    {
                        credentials: 'include',
                        signal: controller.signal,
                    }
                );
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        data.message || 'Unable to load your review.'
                    );
                }

                const review = data.review || null;
                setMyReview(review);

                if (review) {
                    setReviewRating(Number(review.rating));
                    setReviewComment(review.comment || '');
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setReviewError(err.message || 'Unable to load your review.');
                }
            }
        }

        loadMyReview();
        return () => controller.abort();
    }, [id, user]);

    // Support remote URLs, absolute paths, and uploaded filenames.
    function getImageUrl(image) {
        if (!image) return '/uploads/on-sale.jpg';

        if (/^https?:\/\//i.test(image) || image.startsWith('/')) {
            return image;
        }

        return `/uploads/${image}`;
    }

    // Add this product to the signed-in customer's cart.
    async function handleAddToCart() {
        if (!user) {
            navigate('/account', { state: { from: location.pathname } });
            return;
        }

        const amount = Math.max(1, Math.floor(Number(quantity)) || 1);
        setAdding(true);
        setCartMessage(null);

        try {
            const text = await addToCart(product.id, amount);
            setCartMessage({ type: 'success', text });
        } catch (err) {
            setCartMessage({
                type: 'error',
                text: err.message || 'Unable to add this product to your cart.',
            });
        } finally {
            setAdding(false);
        }
    }

    async function handleReviewSubmit(event) {
        event.preventDefault();

        if (!user) {
            navigate('/account', { state: { from: location.pathname } });
            return;
        }

        setReviewSubmitting(true);
        setReviewError('');
        setReviewMessage('');

        try {
            const response = await fetch(
                `${API_URL}/api/products/${id}/reviews`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        rating: Number(reviewRating),
                        comment: reviewComment.trim(),
                    }),
                }
            );
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'Unable to save your review.');
            }

            setMyReview(data.review || null);
            if (data.review) {
                setReviewRating(Number(data.review.rating));
                setReviewComment(data.review.comment || '');
            }
            setReviewMessage(data.message || 'Review saved successfully.');

            // Refresh the public review list separately. A refresh failure
            // should not make a successful save appear to have failed.
            try {
                const refreshResponse = await fetch(
                    `${API_URL}/api/products/${id}/reviews`
                );

                if (refreshResponse.ok) {
                    const refreshedData = await refreshResponse.json();
                    setReviews(refreshedData.reviews || []);
                    setReviewSummary(
                        refreshedData.summary || {
                            total_reviews: 0,
                            average_rating: 0,
                        }
                    );
                    setReviewsError('');
                } else {
                    setReviewsError('Your review was saved, but the review list could not be refreshed.');
                }
            } catch (refreshError) {
                console.error(
                    'Review saved, but refreshing the list failed:',
                    refreshError
                );
                setReviewsError('Your review was saved, but the review list could not be refreshed.');
            }
        } catch (err) {
            setReviewError(err.message || 'Unable to save your review.');
        } finally {
            setReviewSubmitting(false);
        }
    }

    if (loading) {
        return (
            <main className="placeholder-page">
                <p>Loading product details...</p>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="placeholder-page">
                <h1>Product Not Found</h1>
                <p>{error || 'This product is unavailable.'}</p>
                <Link to="/shop" className="btn">
                    Back to Shop
                </Link>
            </main>
        );
    }

    const isOnSale = Boolean(product.on_sale) && Number(product.sale_price) > 0;
    const stock = Math.max(0, Number(product.stock) || 0);
    const roundedAverage = Math.min(
        5,
        Math.max(0, Math.round(Number(reviewSummary.average_rating) || 0))
    );

    return (
        <main className="product-details-page">
            <div className="product-details-layout">
                <div className="product-details-image">
                    <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = '/uploads/on-sale.jpg';
                        }}
                    />
                </div>

                <section className="product-details-info">
                    <p className="home-product-category">
                        {product.category_name || 'Uncategorized'}
                    </p>

                    <h1>{product.name}</h1>

                    <div className="home-price-box">
                        {isOnSale ? (
                            <>
                                <span className="home-old-price">
                                    {formatPrice(product.price)}
                                </span>
                                <span className="home-new-price">
                                    {formatPrice(product.sale_price)}
                                </span>
                            </>
                        ) : (
                            <span className="home-new-price">
                                {formatPrice(product.price)}
                            </span>
                        )}
                    </div>

                    <p
                        className={`product-stock ${stock > 0 ? 'in-stock' : 'out-of-stock'}`}
                    >
                        {stock > 0 ? `In Stock: ${stock}` : 'Out of stock'}
                    </p>

                    <div className="product-description">
                        <h2>Description</h2>
                        <p>
                            {product.description ||
                                'No description is available for this product.'}
                        </p>
                    </div>

                    <div className="product-quantity">
                        <label htmlFor="product-quantity">Quantity</label>
                        <input
                            id="product-quantity"
                            type="number"
                            min="1"
                            max={stock}
                            value={quantity}
                            disabled={stock === 0}
                            onChange={(event) => setQuantity(event.target.value)}
                            onBlur={() => {
                                if (stock === 0) {
                                    setQuantity('1');
                                    return;
                                }

                                const value = Math.floor(Number(quantity));
                                setQuantity(
                                    String(Math.min(Math.max(value || 1, 1), stock))
                                );
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        className="btn add-to-cart"
                        disabled={stock === 0 || adding}
                        onClick={handleAddToCart}
                    >
                        {adding
                            ? 'Adding...'
                            : stock > 0
                              ? 'Add to Cart'
                              : 'Out of Stock'}
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
                            {cartMessage.text}{' '}
                            {cartMessage.type === 'success' && (
                                <Link to="/cart">View cart</Link>
                            )}
                        </p>
                    )}

                    <Link to="/shop" className="back-link">
                        Back to shop
                    </Link>
                </section>
            </div>

            <section className="product-reviews" id="reviews">
                <div className="product-reviews-heading">
                    <div>
                        <h2>Customer Reviews</h2>
                        <p>
                            <span className="review-average-stars" aria-label={`${roundedAverage} out of 5 stars`}>
                                {'★'.repeat(roundedAverage)}
                                {'☆'.repeat(5 - roundedAverage)}
                            </span>{' '}
                            <strong>
                                {Number(reviewSummary.average_rating || 0).toFixed(1)}
                            </strong>{' '}
                            out of 5 · {reviewSummary.total_reviews} reviews
                        </p>
                    </div>
                </div>

                <div className="review-form-panel">
                    <h3>{myReview ? 'Edit Your Review' : 'Write a Review'}</h3>

                    {!user ? (
                        <p>
                            Please{' '}
                            <Link
                                to="/account"
                                state={{ from: location.pathname }}
                            >
                                sign in
                            </Link>{' '}
                            to rate this product and leave a comment.
                        </p>
                    ) : (
                        <form onSubmit={handleReviewSubmit}>
                            <p className="review-rating-label">
                                <strong>Your Rating</strong>
                            </p>

                            <div className="review-star-picker" role="group" aria-label="Choose a rating">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={
                                            star <= reviewRating
                                                ? 'review-star selected'
                                                : 'review-star'
                                        }
                                        aria-label={`${star} out of 5 stars`}
                                        aria-pressed={reviewRating === star}
                                        onClick={() => setReviewRating(star)}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>

                            <label htmlFor="review-comment">
                                Your Comment (optional)
                            </label>
                            <textarea
                                id="review-comment"
                                value={reviewComment}
                                onChange={(event) => setReviewComment(event.target.value)}
                                maxLength={2000}
                                rows={4}
                                placeholder="Share your experience with this product..."
                            />

                            <p className="review-character-count">
                                {reviewComment.length}/2000 characters
                            </p>

                            {reviewError && (
                                <p className="form-error" role="alert">
                                    {reviewError}
                                </p>
                            )}

                            {reviewMessage && (
                                <p className="form-success" role="status">
                                    {reviewMessage}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn"
                                disabled={reviewSubmitting}
                            >
                                {reviewSubmitting
                                    ? 'Saving...'
                                    : myReview
                                      ? 'Update Review'
                                      : 'Submit Review'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="review-list">
                    <h3>What Customers Say</h3>

                    {reviewsLoading ? (
                        <p>Loading reviews...</p>
                    ) : reviewsError ? (
                        <p className="form-error" role="alert">{reviewsError}</p>
                    ) : reviews.length === 0 ? (
                        <p>No reviews yet. Be the first to review this product!</p>
                    ) : (
                        reviews.map((review) => {
                            const rating = Math.min(
                                5,
                                Math.max(0, Number(review.rating) || 0)
                            );

                            return (
                                <article className="review-card" key={review.id}>
                                    <div className="review-card-header">
                                        <strong>{review.reviewer_name || 'Customer'}</strong>
                                        <span
                                            className="review-card-stars"
                                            aria-label={`${rating} out of 5 stars`}
                                        >
                                            {'★'.repeat(rating)}
                                            {'☆'.repeat(5 - rating)}
                                        </span>
                                    </div>

                                    <p className="review-date">
                                        {review.created_at
                                            ? new Date(review.created_at).toLocaleDateString()
                                            : ''}
                                    </p>

                                    {review.comment && (
                                        <p className="review-comment">{review.comment}</p>
                                    )}
                                </article>
                            );
                        })
                    )}
                </div>
            </section>
        </main>
    );
}
