# Tailwind CSS Template Guide

This guide explains how to use the comprehensive Tailwind CSS template created for the md-ticket-board project.

## Overview

The `tailwind-template.css` file provides a complete, production-ready Tailwind CSS setup that's fully compatible with Tailwind CSS v3.4.17. It includes:

- **Complete component library** with buttons, cards, modals, forms, etc.
- **Custom utilities** for common UI patterns
- **Dark mode support** with automatic detection
- **Accessibility features** including high contrast and reduced motion support
- **Print styles** for better document printing
- **Responsive design** utilities
- **Animation utilities** for smooth interactions

## File Structure

```
md-ticket-board/
├── tailwind-template.css      # Complete Tailwind CSS template
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
├── src/
│   └── index.css              # Main CSS file (imports Tailwind)
└── TAILWIND_CSS_GUIDE.md      # This guide
```

## How to Use

### 1. Basic Setup

The template is already integrated into your project. The main CSS file (`src/index.css`) imports Tailwind CSS:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 2. Component Classes

#### Buttons

```html
<!-- Basic buttons -->
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-outline">Outline</button>
<button class="btn btn-danger">Danger</button>

<!-- Button sizes -->
<button class="btn btn-sm">Small</button>
<button class="btn btn-lg">Large</button>

<!-- Icon buttons -->
<button class="btn btn-icon">
  <svg>...</svg>
</button>
```

#### Cards

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <button>...</button>
  </div>
  <div class="card-body">
    <p class="card-description">Card description</p>
    <!-- Card content -->
  </div>
  <div class="card-footer">
    <!-- Footer content -->
  </div>
</div>
```

#### Forms

```html
<label class="label label-required">Email</label>
<input type="email" class="input" placeholder="Enter your email">
<input type="email" class="input input-error" placeholder="Error state">
<input type="email" class="input input-success" placeholder="Success state">
```

#### Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
<span class="badge badge-outline">Outline</span>
```

#### Modals

```html
<div class="modal">
  <div class="modal-overlay"></div>
  <div class="modal-content">
    <div class="modal-header">
      <h3 class="modal-title">Modal Title</h3>
    </div>
    <div class="modal-body">
      <!-- Modal content -->
    </div>
    <div class="modal-footer">
      <!-- Footer buttons -->
    </div>
  </div>
</div>
```

### 3. Utility Classes

#### Text Utilities

```html
<!-- Text truncation -->
<p class="text-clip">This text will be truncated with ellipsis</p>
<p class="text-clip-2">This text will be truncated to 2 lines</p>

<!-- Text wrapping -->
<p class="text-balance">This text will wrap with balanced lines</p>
<p class="text-pretty">This text will wrap with pretty formatting</p>
```

#### Animation Utilities

```html
<div class="animate-fade-in">Fade in animation</div>
<div class="animate-slide-up">Slide up animation</div>
<div class="animate-scale-in">Scale in animation</div>
<div class="animate-bounce-in">Bounce in animation</div>
<div class="animate-pulse-once">Pulse once animation</div>
```

#### Transform Utilities

```html
<div class="scale-hover hover:scale-105">Hover to scale</div>
<div class="rotate-hover hover:rotate-1">Hover to rotate</div>
<div class="shadow-hover hover:shadow-lg">Hover for shadow</div>
```

#### Responsive Utilities

```html
<div class="mobile-full-width">Full width on mobile</div>
<div class="mobile-stack">Stack on mobile</div>
<div class="mobile-hidden">Hidden on mobile</div>
<div class="tablet-hidden">Hidden on tablet</div>
<div class="desktop-hidden">Hidden on desktop</div>
```

### 4. Dark Mode

The template supports automatic dark mode detection based on system preferences:

```html
<!-- Dark mode classes will be applied automatically -->
<div class="dark:bg-gray-900 dark:text-gray-100">
  <!-- Content -->
</div>

<!-- Or use the .dark class -->
<div class="dark">
  <!-- Content -->
</div>
```

### 5. Print Styles

```html
<div class="print-hidden">Hidden when printing</div>
<div class="print-block">Displayed as block when printing</div>
<div class="print-break-before">Page break before this element</div>
<div class="print-break-inside-avoid">Avoid page break inside this element</div>
```

### 6. Accessibility

```html
<!-- Screen reader only content -->
<span class="sr-only">This text is only visible to screen readers</span>

<!-- Focus visible styles -->
<button class="focus-visible:ring-2 focus-visible:ring-blue-500">
  Button with focus ring
</button>

<!-- High contrast support -->
<div class="high-contrast">
  <!-- Content with enhanced contrast -->
</div>
```

### 7. Custom Components

The template includes several custom components:

#### Progress Bars

```html
<div class="progress">
  <div class="progress-bar progress-bar-primary" style="width: 75%"></div>
</div>
```

#### Tabs

```html
<div class="tabs">
  <button class="tab tab-active">Active Tab</button>
  <button class="tab">Inactive Tab</button>
</div>
```

#### Pagination

```html
<div class="pagination">
  <button class="pagination-item pagination-item-disabled">Previous</button>
  <button class="pagination-item pagination-item-active">1</button>
  <button class="pagination-item">2</button>
  <button class="pagination-item">Next</button>
</div>
```

#### Tables

```html
<table class="table">
  <thead>
    <tr>
      <th>Name</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
    </tr>
  </tbody>
</table>
```

### 8. Customization

#### Extending the Theme

To add custom colors or styles, modify `tailwind.config.js`:

```javascript
export default {
  theme: {
    extend: {
      colors: {
        custom: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... more shades
        }
      }
    }
  }
}
```

#### Adding Custom Components

Add new components to the `src/index.css` file:

```css
@layer components {
  .custom-component {
    @apply bg-blue-500 text-white p-4 rounded-lg;
  }
}
```

### 9. Performance Tips

1. **Use PurgeCSS** - The template is already configured for production builds
2. **Minimize custom CSS** - Use Tailwind utilities when possible
3. **Use JIT mode** - Tailwind CSS v3 includes Just-In-Time compilation
4. **Tree-shaking** - Only the classes you use will be included in the final CSS

### 10. Browser Support

The template supports all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 11. Troubleshooting

#### Common Issues

1. **Missing classes**: Make sure you're using the correct class names
2. **Build errors**: Check your Tailwind CSS version compatibility
3. **Styling conflicts**: Use `!important` sparingly and check specificity

#### Debug Mode

Enable Tailwind CSS debug mode by adding this to your `tailwind.config.js`:

```javascript
export default {
  // ... other config
  debug: process.env.NODE_ENV === 'development'
}
```

### 12. Migration Guide

If you're migrating from another CSS framework:

1. **Replace utility classes** with Tailwind equivalents
2. **Update component classes** to use the new naming convention
3. **Remove custom CSS** that duplicates Tailwind functionality
4. **Update build process** to include Tailwind CSS

### 13. Best Practices

1. **Use semantic HTML** with utility classes for styling
2. **Create reusable components** for complex UI patterns
3. **Use responsive prefixes** (`sm:`, `md:`, `lg:`, `xl:`)
4. **Leverage dark mode** for better accessibility
5. **Test on multiple devices** and screen sizes

### 14. Integration with Existing Code

The template is designed to work seamlessly with your existing React components. Simply replace your current CSS imports with the new template:

```javascript
// Instead of importing individual CSS files
import './styles/buttons.css';
import './styles/cards.css';
import './styles/forms.css';

// Use the template classes directly in your components
function MyComponent() {
  return (
    <button className="btn btn-primary">Click me</button>
  );
}
```

### 15. Future Enhancements

The template can be extended with:
- **Custom plugins** for specific functionality
- **Additional color schemes** for branding
- **Advanced animations** and transitions
- **Internationalization** support
- **Accessibility testing** utilities

## Support

For issues or questions:
1. Check the Tailwind CSS documentation: https://tailwindcss.com/docs
2. Review the existing component classes in the template
3. Test in different browsers and devices
4. Use browser dev tools to inspect styles

This template provides a solid foundation for building modern, responsive, and accessible web applications with Tailwind CSS.