# CSS Conversion Guide

## New Structure

We've resolved CSS conflicts by creating a clean separation:

### 1. `app/assets/tailwind/application.css`
- **Imports Tailwind CSS**
- **CSS variable utilities** (`.text-primary`, `.bg-accent`, etc.)
- **ONLY utility classes** - no component styles

### 2. `app/assets/stylesheets/application.css`  
- **Imports the Tailwind file**
- **CSS variables** (colors, spacing, shadows)
- **Complex custom components** that can't be done with Tailwind utilities
- **Font imports**

## Conversion Strategy

### ✅ Use Tailwind Utilities For:
- **Basic layout**: `flex`, `grid`, `gap-4`, `p-4`, `m-2`
- **Colors**: `text-gray-500`, `bg-white`, `border-gray-300`
- **Typography**: `text-sm`, `font-semibold`, `leading-relaxed`
- **Spacing**: `px-3`, `py-2`, `mb-4`, `mt-6`
- **Borders**: `border`, `rounded-md`, `border-gray-300`
- **Shadows**: Use custom utilities like `shadow-custom-sm`

### ⚠️ Keep Custom CSS For:
- **Complex hover effects** (like navigation expansion)
- **Animations** (pulse, slide-in, spin)
- **Custom pseudo-elements** (::after, ::before content)
- **Multi-step interactions** (accordion expansion)
- **Complex positioning** (calendar modal, wins sidebar)

## Examples

### OLD WAY (Removed):
```html
<div class="task-header">
  <input class="task-title">
  <div class="header-actions">
    <button class="icon-btn">
```

### NEW WAY (Tailwind):
```html
<div class="flex items-center justify-between mb-0">
  <input class="text-sm font-semibold text-gray-800 bg-transparent w-full p-0 outline-none">
  <div class="flex gap-4 items-center">
    <button class="bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-800">
```

## Custom Utility Classes Available

Use these for theme consistency:
- `.text-primary` - Main text color
- `.text-secondary` - Secondary text
- `.text-muted` - Muted text
- `.bg-surface` - Surface background
- `.bg-accent` - Accent background
- `.border-custom` - Border color
- `.shadow-custom-sm` - Small shadow
- `.shadow-custom-md` - Medium shadow

## Complex Components Still Custom

These remain as custom CSS classes:
- `.dashboard-nav` - Sidebar with hover expansion
- `.wins-sidebar` - Right sidebar with animation
- `.calendar-modal` - Calendar popup with grid
- `.profile-modal` - Profile photo modal
- `.task-card` - Border-left styling
- `.calendar-icon` - Icon positioning
- `.accordion-*` - Accordion expansion
- `.wins-*` - Wins sidebar interactions

## Quick Conversion Reference

| Old Class | New Tailwind |
|-----------|-------------|
| `.btn` | `px-6 py-3 mx-2 my-2 text-base font-medium rounded-md border-none cursor-pointer` |
| `.btn-primary` | `bg-accent text-white hover:bg-blue-600` |
| `.card` | `rounded-lg p-6 bg-surface shadow-custom-sm` |
| `.field` | `mb-5` |
| `.section-header` | `flex justify-between items-center mb-3` |
| `.icon-btn` | `bg-transparent border-none cursor-pointer p-0` |

## Tips

1. **Start with Tailwind utilities** - they're faster to write
2. **Use custom CSS variables** for theme colors (`.text-primary` not `.text-gray-800`)
3. **Keep complex interactions** in custom CSS
4. **Test responsively** - many old responsive styles were removed
5. **Use semantic color utilities** where possible

## No More Conflicts! 🎉

- ✅ Tailwind imported once
- ✅ No duplicate styles  
- ✅ Clear separation of concerns
- ✅ Smaller CSS bundle
- ✅ Easier to maintain 