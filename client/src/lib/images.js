// Helpers for uploaded images.

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
];

// Database values are either a stored upload name ("1760...-ab12.jpg",
// "avatars/1760...-ab12.png"), an absolute path, or a full URL.
export function getImageUrl(image) {
    if (!image) return '';

    if (/^https?:\/\//i.test(image) || image.startsWith('/')) {
        return image;
    }

    return `/uploads/${image}`;
}

// Quick check before uploading. The server checks the file again;
// this only gives instant feedback. Returns an error message or ''.
export function checkImageFile(file, maxBytes) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return 'Please choose a JPG, PNG, WebP or GIF image.';
    }

    if (file.size > maxBytes) {
        const megabytes = Math.round(maxBytes / (1024 * 1024));
        return `That image is too large. The maximum size is ${megabytes} MB.`;
    }

    return '';
}
