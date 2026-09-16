/**
 * Attempt to fetch a cover image URL for an ISBN from Open Library.
 * Returns a URL string on success, null if no cover found.
 * No API key required. Falls back to null (caller shows a placeholder).
 *
 * ponytail: no Google Books fallback in v1 — Open Library covers the vast majority
 * of books with ISBNs. Add a GOOGLE_BOOKS_API_KEY env branch here if needed later.
 */
export async function fetchCoverUrl(isbn) {
    if (!isbn) return null;
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(4000) });
        // Open Library returns a 1x1 gif (404-equivalent) when no cover exists
        // We check Content-Type: image/jpeg to confirm a real cover
        if (res.ok && res.headers.get('content-type')?.includes('jpeg')) return url;
        return null;
    } catch {
        return null;
    }
}
