
const usdFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
});

export function formatPrice(value) {
    const amount = Number(value ?? 0);

    return usdFormatter.format(
        Number.isFinite(amount) ? amount : 0
    );
}

export function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function capitalize(text) {
    const value = String(text ?? '');

    return value.charAt(0).toUpperCase() + value.slice(1);
}
