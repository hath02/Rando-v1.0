import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const dateLabel = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US');
};

function Stars({ rating }) {
    return (
        <span className="admin-stars" role="img" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= rating ? '' : 'off'}>★</span>
            ))}
        </span>
    );
}

// Customers write reviews on the storefront. Admins can only read them here:
// there is no edit or delete control, and the API has no write routes.
export default function AdminReviews() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [rating, setRating] = useState('all');

    useEffect(() => {
        const controller = new AbortController();
        const params = new URLSearchParams({ q: search, rating });

        setError('');

        apiFetch(`/api/admin/reviews?${params.toString()}`, { signal: controller.signal })
            .then(setData)
            .catch((err) => {
                if (err.name !== 'AbortError') setError(err.message || 'Could not load reviews.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [search, rating]);

    const summary = data?.summary;
    const reviews = data?.reviews ?? [];

    return (
        <div className="admin-page-content">
            <div className="admin-page-heading">
                <div>
                    <span className="admin-kicker">CUSTOMER FEEDBACK</span>
                    <h1>Reviews</h1>
                    <p>Read what customers say about your products.</p>
                </div>
            </div>

            {error && <p className="form-message form-error" role="alert">{error}</p>}

            {summary && summary.total > 0 && (
                <section className="admin-panel admin-rating-summary" aria-label="Rating summary">
                    <div className="admin-rating-score">
                        <strong>{summary.average.toFixed(1)}</strong>
                        <Stars rating={Math.round(summary.average)} />
                        <small>{summary.total} review{summary.total === 1 ? '' : 's'}</small>
                    </div>

                    <div className="admin-rating-bars">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = summary.distribution[star] || 0;
                            const share = summary.total ? (count / summary.total) * 100 : 0;

                            return (
                                <div className="admin-rating-row" key={star}>
                                    <span>{star} ★</span>
                                    <div className="admin-rating-track">
                                        <div className="admin-rating-fill" style={{ width: `${share}%` }} />
                                    </div>
                                    <span>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="admin-panel">
                <div className="admin-panel-heading admin-list-heading">
                    <div>
                        <h2>All reviews</h2>
                        <p>{reviews.length} review{reviews.length === 1 ? '' : 's'} matching the current filters</p>
                    </div>

                    <div className="admin-list-controls">
                        <form
                            className="admin-search-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                setSearch(searchInput.trim());
                            }}
                        >
                            <input
                                aria-label="Search reviews"
                                placeholder="Product, customer or comment"
                                value={searchInput}
                                onChange={(event) => setSearchInput(event.target.value)}
                            />
                            <button type="submit">Search</button>
                        </form>

                        <select
                            aria-label="Filter by rating"
                            value={rating}
                            onChange={(event) => setRating(event.target.value)}
                        >
                            <option value="all">All ratings</option>
                            {[5, 4, 3, 2, 1].map((star) => (
                                <option key={star} value={star}>{star} star{star === 1 ? '' : 's'}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="admin-loading">Loading reviews…</div>
                ) : reviews.length === 0 ? (
                    <div className="admin-empty-state">
                        {summary?.total ? 'No reviews match these filters.' : 'No customer has written a review yet.'}
                    </div>
                ) : (
                    <div className="admin-table-scroll">
                        <table className="admin-data-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Customer</th>
                                    <th>Rating</th>
                                    <th>Review</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map((review) => (
                                    <tr key={review.id}>
                                        <td>
                                            {review.product_name ? (
                                                <a
                                                    className="admin-order-link"
                                                    href={`/product/${review.product_id}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    {review.product_name}
                                                </a>
                                            ) : (
                                                <span className="admin-table-secondary">Deleted product</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className="admin-table-primary">{review.customer_name || 'Customer'}</span>
                                            <small className="admin-table-secondary">{review.customer_email || ''}</small>
                                        </td>
                                        <td><Stars rating={review.rating} /></td>
                                        <td>
                                            {review.comment ? (
                                                <p className="admin-review-comment">{review.comment}</p>
                                            ) : (
                                                <p className="admin-review-comment empty">No written comment</p>
                                            )}
                                        </td>
                                        <td>
                                            {dateLabel(review.created_at)}
                                            {review.updated_at && <small className="admin-table-secondary">Edited {dateLabel(review.updated_at)}</small>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <p className="admin-footnote admin-readonly-note">
                Reviews are read-only here. Only the customer who wrote a review can edit it.
            </p>
        </div>
    );
}
