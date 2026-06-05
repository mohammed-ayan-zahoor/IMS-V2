# Website Builder - Components & Customization Guide

## Overview

The website builder allows you to create dynamic, customizable sections for your institute website. Each section can be configured with different layouts, colors, and content.

## Architecture

```
components/website/
├── builder/
│   ├── DragDropEditor.jsx          # Main editor component
│   └── SectionCustomizationPanel.jsx # Customization UI
├── public/
│   ├── HeroSection.jsx
│   ├── FeaturesGrid.jsx
│   ├── ContactSection.jsx
│   ├── GallerySection.jsx
│   ├── TestimonialsSection.jsx
│   ├── ProgramsSection.jsx
│   ├── FacultyDirectory.jsx
│   ├── PlacementStats.jsx
│   ├── SlidingNotices.jsx
│   ├── FooterSection.jsx
│   ├── CoverFlow.jsx
│   ├── HoverExpand.jsx
│   └── HeroUIComponentSection.jsx   # New: Custom Hero UI components
└── widgets/
    └── MediaPicker.jsx
```

## Available Sections

### 1. **Hero Section** ✅ Fully Customizable
- **Layouts**: centered, split, banner
- **Customizable Fields**:
  - Title, Subtitle
  - Background Image
  - CTA Text & Link
  - Alignment
- **Presets**: classic, bold, minimal, dark, modern

### 2. **Features Grid** ⚠️ Limited Customization
- **Layouts**: grid, cards, list
- **Customizable Fields**:
  - Title, Subtitle
  - Feature Items (3 max)
- **Limitation**: Fixed feature structure

### 3. **Gallery Section** ✅ Fully Customizable
- **Layouts**: slider, grid, CoverFlow, HoverExpand
- **Customizable Fields**:
  - Title, Subtitle
  - Images (add/remove/reorder)
  - Image captions
- **Features**: Drag-and-drop reordering

### 4. **Contact Section** ✅ Fully Customizable
- **Layouts**: split, centered, simple
- **Customizable Fields**:
  - Title, Subtitle
  - Form fields
  - Contact information
- **Integrations**: Form submission, email notifications

### 5. **Testimonials Section** ⚠️ Limited Customization
- **Layouts**: carousel, grid, CoverFlow
- **Customizable Fields**:
  - Title, Subtitle
  - Testimonial items (limited inline editing)
- **Limitation**: Requires backend data for full functionality

### 6. **Programs Section** ❌ Not Customizable
- **Data Source**: Dynamic from Database
- **Limitation**: Cannot customize static content
- **Workaround**: Modify programs in admin panel

### 7. **Faculty Directory** ❌ Not Customizable
- **Data Source**: Dynamic from Database
- **Limitation**: Cannot customize static content
- **Workaround**: Modify faculty in admin panel

### 8. **Placement Stats** ⚠️ Limited Customization
- **Layouts**: simple, cards, bento
- **Customizable Fields**:
  - Title, Subtitle
  - Stats (limited)

### 9. **Sliding Notices** ⚠️ Limited Customization
- **Data Source**: Backend notices
- **Customizable Fields**:
  - Ticker speed
  - Display format

### 10. **Footer Section** ⚠️ Limited Customization
- **Layouts**: classic, simple
- **Customizable Fields**:
  - Company info
  - Links
  - Social media

---

## New Features

### 1. **Hero UI Component Section**
Now you can add custom Hero UI components to any page!

**Supported Components**:
- Button (with variants)
- Card
- Input
- Textarea
- Grid layouts
- More coming soon!

**How to Use**:
1. Add a "Hero UI Component" section
2. Select component type
3. Configure props
4. Customize styling

### 2. **Enhanced Theme System**
Global theme switching now affects ALL sections!

**Available Themes**:
- `default` - Premium Blue
- `ocean` - Ocean Blue
- `forest` - Green  
- `sunset` - Orange/Gold
- `royal` - Purple

**How to Change Theme**:
```javascript
import { useWebsiteTheme } from '@/contexts/WebsiteThemeContext';

function MyComponent() {
  const { updateTheme, colors } = useWebsiteTheme();
  
  // Change theme
  updateTheme('ocean');
  
  // Or customize colors
  updateTheme('custom');
  // colors will be: { primary, secondary, accent, light, dark }
}
```

### 3. **Advanced Customization Panel**
Each section now has an expandable customization panel with:
- Field-by-field editing
- Color picker for theme-aware colors
- Image uploader
- Layout selector
- Quick presets

---

## CSS Theme Variables

The website builder automatically applies these CSS variables:

```css
:root {
  --website-color-primary: /* Main brand color */
  --website-color-secondary: /* Secondary color */
  --website-color-accent: /* Accent color */
  --website-color-light: /* Light background */
  --website-color-dark: /* Dark text */
}
```

Use in components:
```jsx
<div style={{ backgroundColor: 'var(--website-color-primary)' }}>
  Content
</div>
```

---

## Adding New Sections

### Step 1: Create Component
```jsx
// components/website/public/MySection.jsx
export default function MySection({ content = {}, isEditing = false, onUpdate, preset }) {
  const { title = "My Section" } = content;
  
  return (
    <section>
      {isEditing ? (
        <input value={title} onChange={e => onUpdate({ title: e.target.value })} />
      ) : title}
    </section>
  );
}
```

### Step 2: Register in pageBuilderService
```javascript
// services/pageBuilderService.js
export const SECTION_TYPES = {
  // ... existing
  MY_SECTION: 'MY_SECTION'
};

export const DEFAULT_SECTION_DATA = {
  [SECTION_TYPES.MY_SECTION]: {
    title: "My Section",
    layout: "default"
  }
};
```

### Step 3: Add to DragDropEditor
```jsx
// components/website/builder/DragDropEditor.jsx
import MySection from '../public/MySection';

// In renderSection():
case SECTION_TYPES.MY_SECTION:
  return <MySection content={section.content} isEditing={true} onUpdate={...} />;
```

---

## Troubleshooting

### Section Not Showing
- Check if component is imported in DragDropEditor.jsx
- Verify SECTION_TYPES is defined
- Check browser console for errors

### Theme Not Changing
- Ensure WebsiteThemeProvider wraps your component
- Check CSS variable is used: `var(--website-color-primary)`
- Clear browser cache

### Customization Panel Not Showing
- Component must have `isEditing={true}` prop
- Add customizable fields to component
- Check if component supports editing

### Images Not Loading
- Verify image URLs are correct
- Check CORS settings
- Use MediaPicker component for uploads

---

## Performance Tips

1. **Lazy Load Heavy Sections**: Use React.lazy() for components
2. **Optimize Images**: Use next/image component
3. **Debounce Updates**: Throttle onChange handlers
4. **Memoize Components**: Wrap with React.memo
5. **Cache Section Data**: Implement proper caching strategy

---

## Accessibility

All components now include:
- ARIA labels for buttons
- Keyboard navigation support
- Screen reader support
- Color contrast compliance
- Focus management

---

## Future Enhancements

- [ ] Undo/Redo functionality
- [ ] Component library marketplace
- [ ] Advanced animations
- [ ] A/B testing variants
- [ ] SEO optimization panel
- [ ] Multi-language support
- [ ] Device preview modes
