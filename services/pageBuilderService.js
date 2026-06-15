/**
 * Page Builder Service
 * Thin helper module — block presets for GrapesJS.
 * V2 node-tree data removed; GrapesJS manages all page structure.
 */

export const SECTION_TYPES = {
    HERO: 'hero',
    NOTICES: 'notices',
    FEATURES: 'features',
    PLACEMENT_STATS: 'placement_stats',
    FACULTY: 'faculty',
    PROGRAMS: 'programs',
    TESTIMONIALS: 'testimonials',
    GALLERY: 'gallery',
    CONTACT: 'contact',
    FOOTER: 'footer',
};

/**
 * Returns an empty sections array.
 * GrapesJS initialises from gjsData saved in draftContent / liveContent.
 * This function is kept for backwards-compatible call-sites.
 */
export const getTemplateSections = (_type) => [];
