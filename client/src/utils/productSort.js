// Shared sorting for the Shop, Sales and Category pages.

export const SORT_OPTIONS = [
    { value: 'popularity', label: 'Popular' },
    { value: 'price-low', label: 'Price: low to high' },
    { value: 'price-high', label: 'Price: high to low' },
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest'}
];

// Price shown to the customer: the sale price when a valid sale applies.
function getEffectivePrice(product) {
    const onSale =
        Boolean(product.on_sale) && Number(product.sale_price) > 0;

    return Number(onSale ? product.sale_price : product.price) || 0;
}

// Popularity uses the first matching column the product table provides.
function getPopularity(product) {
    return (
        Number(
            product.popularity ??
            product.sold ??
            product.sales_count ??
            product.views ??
            0
        ) || 0
    );
}

// Newest uses created_at when available, otherwise the higher id is newer.
function getNewestValue(product) {
    const time = Date.parse(product.created_at);

    return Number.isNaN(time) ? Number(product.id) || 0 : time;
}

const SORTERS = {
    popularity: (a, b) =>
        getPopularity(b) - getPopularity(a) ||
        getNewestValue(b) - getNewestValue(a),
    newest: (a, b) => getNewestValue(b) - getNewestValue(a),
    oldest: (a, b) => getNewestValue(a) - getNewestValue(b),
    'price-low': (a, b) => getEffectivePrice(a) - getEffectivePrice(b),
    'price-high': (a, b) => getEffectivePrice(b) - getEffectivePrice(a),
};

// Returns a new sorted array and leaves the original untouched.
export function sortProducts(products, sortBy) {
    return [...products].sort(SORTERS[sortBy] ?? SORTERS.popularity);
}
