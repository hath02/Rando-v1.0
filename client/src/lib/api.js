// Shared fetch helper for the Express API.
// credentials: 'include' sends the session cookie with every request.

export const API_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiFetch(path, { method = 'GET', body, signal } = {}) {
    let response;

    // FormData (file uploads) must not be JSON-encoded, and the browser has to
    // set the multipart Content-Type itself so it includes the boundary.
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            credentials: 'include',
            headers: body && !isFormData ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
            signal,
        });
    } catch (error) {
        // Let callers handle cancelled requests themselves.
        if (error.name === 'AbortError') throw error;

        throw new Error(
            'Cannot reach the server. Please check that it is running.',
            { cause: error }
        );
    }

    // Tolerate empty or non-JSON error bodies.
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data.message || `Request failed (HTTP ${response.status}).`
        );
        error.status = response.status;
        throw error;
    }

    return data;
}
