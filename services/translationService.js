/**
 * Automated Notice Translation Service
 * Translates academic notices and circulars into supported Indian regional languages.
 * Languages:
 *   - kn: Kannada (ಕನ್ನಡ)
 *   - hi: Hindi (हिंदी)
 *   - te: Telugu (తెలుగు)
 *   - ta: Tamil (தமிழ்)
 *   - mr: Marathi (मराठी)
 */

const SUPPORTED_LANGUAGES = ['kn', 'hi', 'te', 'ta', 'mr'];

/**
 * Translates a single text string into the target language.
 * Uses Google Translate API endpoint with MyMemory fallback.
 */
export async function translateText(text, targetLang) {
    if (!text || typeof text !== 'string' || !text.trim()) {
        return '';
    }
    if (targetLang === 'en') {
        return text;
    }

    try {
        const fetch = global.fetch || (await import('node-fetch')).default;
        const trimmed = text.trim();

        // 1. Try Google Translate GTX endpoint
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(trimmed)}`;
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: AbortSignal.timeout(5000)
            });

            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && Array.isArray(data[0])) {
                    const result = data[0].map(item => item && item[0] ? item[0] : '').join('');
                    if (result && result.trim()) {
                        return result.trim();
                    }
                }
            }
        } catch (_) {}

        // 2. Fallback to MyMemory API
        try {
            const memUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 500))}&langpair=en|${targetLang}`;
            const memRes = await fetch(memUrl, { signal: AbortSignal.timeout(5000) });
            if (memRes.ok) {
                const memData = await memRes.json();
                const trans = memData.responseData?.translatedText;
                if (trans && !trans.toUpperCase().includes('MYMEMORY WARNING')) {
                    return trans.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
                }
            }
        } catch (_) {}

        return trimmed;

    } catch (error) {
        console.error(`Translation error for ${targetLang}:`, error.message);
        return text;
    }
}

/**
 * Translates a complete notice ({ title, content }) across all supported target languages.
 * Returns a dictionary mapping langCode -> { title, content }.
 */
export async function translateNotice({ title, content }, targetLanguages = SUPPORTED_LANGUAGES) {
    if (!title && !content) return {};

    const results = {};

    await Promise.all(targetLanguages.map(async (lang) => {
        try {
            const [translatedTitle, translatedContent] = await Promise.all([
                translateText(title, lang),
                translateText(content, lang)
            ]);

            results[lang] = {
                title: translatedTitle || title || '',
                content: translatedContent || content || ''
            };
        } catch (err) {
            results[lang] = {
                title: title || '',
                content: content || ''
            };
        }
    }));

    return results;
}
