/**
 * Page Builder Service - Handles section management and template initialization
 */

export const SECTION_TYPES = {
    HERO: 'hero',
    NOTICES: 'notices',
    FEATURES: 'features',
    PLACEMENT_STATS: 'placement_stats',
    FACULTY: 'faculty',
    PROGRAMS: 'programs',
    TESTIMONIALS: 'testimonials',
    CONTACT: 'contact',
    FOOTER: 'footer'
};

export const DEFAULT_SECTION_DATA = {
    [SECTION_TYPES.HERO]: {
        title: "Welcome to Our Institute",
        subtitle: "Empowering students through quality education and professional training.",
        backgroundImage: "https://images.unsplash.com/photo-1523050853064-59f602992d42?q=80&w=2000",
        ctaText: "Explore Programs",
        ctaLink: "#",
        alignment: "center"
    },
    [SECTION_TYPES.FEATURES]: {
        title: "Why Choose Us?",
        subtitle: "Experience excellence in education with our modern facilities and expert faculty.",
        features: [
            { id: 1, title: "Expert Faculty", desc: "Learn from industry professionals and experienced teachers.", icon: 'users' },
            { id: 2, title: "Modern Facilities", desc: "State-of-the-art labs and classrooms for hands-on learning.", icon: 'zap' },
            { id: 3, title: "Global Recognition", desc: "Certificates and degrees recognized worldwide.", icon: 'globe' }
        ]
    },
    [SECTION_TYPES.CONTACT]: {
        title: "Get in Touch",
        subtitle: "Have questions? We're here to help. Reach out to us anytime.",
        email: "info@institute.com",
        phone: "+91 98765 43210",
        address: "123 Education Square, Knowledge City",
        showForm: true
    },
    [SECTION_TYPES.NOTICES]: {
        showTitle: true
    },
    [SECTION_TYPES.PLACEMENT_STATS]: {
        title: "Our Placement Success",
        subtitle: "We bridge the gap between education and employment with our strong industry ties.",
        stats: [
            { id: 1, label: "Placement Rate", value: "95%", icon: 'briefcase' },
            { id: 2, label: "Hiring Partners", value: "200+", icon: 'building' },
            { id: 3, label: "Avg. Salary", value: "4.5 LPA", icon: 'trend' },
            { id: 4, label: "Certifications", value: "50+", icon: 'award' }
        ]
    },
    [SECTION_TYPES.FACULTY]: {
        title: "Our Expert Faculty",
        subtitle: "Meet the dedicated professionals who shape the future of our students.",
        members: [
            { id: 1, name: "Dr. Sarah Wilson", role: "Principal", dept: "Administration", image: "https://i.pravatar.cc/150?u=sarah" },
            { id: 2, name: "Mr. James Bond", role: "Sr. Teacher", dept: "Mathematics", image: "https://i.pravatar.cc/150?u=james" },
            { id: 3, name: "Ms. Elena Gilbert", role: "Teacher", dept: "Science", image: "https://i.pravatar.cc/150?u=elena" },
            { id: 4, name: "Mr. Damon Salvatore", role: "Coach", dept: "Sports", image: "https://i.pravatar.cc/150?u=damon" }
        ]
    },
    [SECTION_TYPES.PROGRAMS]: {
        title: "Our Educational Programs",
        subtitle: "We offer a wide range of courses designed to meet global standards and industry needs.",
        courses: [] // Will be populated from Course model or manually
    },
    [SECTION_TYPES.TESTIMONIALS]: {
        title: "What Our Students Say",
        subtitle: "Hear from our alumni and students about their journey with us.",
        items: [
            { id: 1, name: "Alex Johnson", role: "Graduate", text: "The best learning experience I've ever had. The faculty is amazing!", image: "https://i.pravatar.cc/150?u=alex" },
            { id: 2, name: "Maria Garcia", role: "Student", text: "State-of-the-art facilities and a very supportive environment.", image: "https://i.pravatar.cc/150?u=maria" }
        ]
    }
};

export const getTemplateSections = (type) => {
    if (type === 'VOCATIONAL') {
        return [
            { id: 'notices-1', type: SECTION_TYPES.NOTICES, content: DEFAULT_SECTION_DATA[SECTION_TYPES.NOTICES] },
            { id: 'hero-1', type: SECTION_TYPES.HERO, content: DEFAULT_SECTION_DATA[SECTION_TYPES.HERO] },
            { id: 'stats-1', type: SECTION_TYPES.PLACEMENT_STATS, content: DEFAULT_SECTION_DATA[SECTION_TYPES.PLACEMENT_STATS] },
            { id: 'features-1', type: SECTION_TYPES.FEATURES, content: DEFAULT_SECTION_DATA[SECTION_TYPES.FEATURES] },
            { id: 'contact-1', type: SECTION_TYPES.CONTACT, content: DEFAULT_SECTION_DATA[SECTION_TYPES.CONTACT] }
        ];
    }
    
    // Default SCHOOL template
    return [
        { id: 'notices-1', type: SECTION_TYPES.NOTICES, content: DEFAULT_SECTION_DATA[SECTION_TYPES.NOTICES] },
        { id: 'hero-1', type: SECTION_TYPES.HERO, content: DEFAULT_SECTION_DATA[SECTION_TYPES.HERO] },
        { id: 'faculty-1', type: SECTION_TYPES.FACULTY, content: DEFAULT_SECTION_DATA[SECTION_TYPES.FACULTY] },
        { id: 'features-1', type: SECTION_TYPES.FEATURES, content: DEFAULT_SECTION_DATA[SECTION_TYPES.FEATURES] },
        { id: 'contact-1', type: SECTION_TYPES.CONTACT, content: DEFAULT_SECTION_DATA[SECTION_TYPES.CONTACT] }
    ];
};
