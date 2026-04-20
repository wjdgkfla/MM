# Mason Market - UI Directions (Future Reference)

**Status:** Potential design directions | No implementation required

Reference inspiration: **당근마켓** (Danggeun Market) - Korean marketplace app

---

## Potential UI Improvements (Backlog)

### 1. Home Page Hero Section
**Concept:** Dark-mode hero with engaging copy

```
Dark background (--air-surface)
Large headline: "Looking for [category] on Mason Market?"
Prominent search bar
Category cards grid below with icons
Location/campus chips
```

**Benefits:**
- More engaging than current title
- Drives category discovery
- Modern, aspirational feel

---

### 2. Category Cards with Icons
**Concept:** Visual category navigation instead of text dropdown

```
Cards layout:
┌─────────┬─────────┬─────────┬─────────┐
│ 📱 Elec │ 📚 Books│ 🏠 Dorm │ 👔 Fashion│
├─────────┼─────────┼─────────┼─────────┤
│ 🍽️ Furn │ 🎮 Games│ ✏️ Supplies│ ⚽ Sports│
└─────────┴─────────┴─────────┴─────────┘
```

**Benefits:**
- Visual discovery
- Faster browsing
- Modern marketplace pattern (like Mercari, Poshmark, 당근마켓)

---

### 3. Listing Card Redesign (Image-First)
**Current:** Small 4:3 image + text below

**Potential:** 
- Larger 1:1 square images (image-dominant)
- Minimal text overlay
- Price badge on bottom-left of image
- Seller avatar + rating in corner
- Condition/location as small chips below

**Example structure:**
```
┌──────────────────┐
│    [IMAGE]       │ ← 1:1, large
│  ⭐4.8  [NEW]    │
│  $25            │
└──────────────────┘
📍Dorm • Good
2 hours ago
```

**Benefits:**
- Matches modern marketplace UX
- More eye-catching
- Faster visual scanning
- Better on mobile

---

### 4. Dark Mode Support
**Concept:** System dark mode preference + toggle

**Includes:**
- CSS variables for dark palette
- Respects `@media (prefers-color-scheme: dark)`
- Optional user toggle in header
- Updated card backgrounds, text colors
- Adjusted shadows/borders for dark mode

**Benefits:**
- Modern expectation (Discord, Slack, Instagram all offer dark mode)
- Better accessibility (eye strain reduction)
- Signals maturity of product

---

### 5. Sidebar Filters (Collapsible)
**Current:** Full-width filter panel on home page

**Potential:**
- Collapsible sidebar on desktop (left side)
- Slide-out drawer on mobile
- Keeps main content area spacious
- Better home page hierarchy

**Benefits:**
- Less clutter on main page
- Better use of space
- Modern e-commerce pattern

---

### 6. Skeleton Loaders: Shimmer Effect
**Current:** Flat `animate-pulse`

**Potential:** 
- Shimmer gradient (left-to-right sweep)
- More premium feel
- Used by Instagram, LinkedIn, major platforms

```css
animation: shimmer 2s infinite
background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)
background-size: 200% 100%
```

**Benefits:**
- Premium perceived performance
- Better UX during load

---

### 7. Home Page Copy Variants
**Concept:** Engaging, category-specific headlines

Instead of generic "Browse what GMU students are selling..."

**Potential examples:**
- "Looking for textbooks on Mason Market?"
- "Need dorm supplies? Browse listings now."
- "Selling your stuff? Post in seconds."
- "Find deals from GMU students near you."

**Benefits:**
- More personality
- Better engagement
- Category-aware messaging

---

## Design Reference: 당근마켓
Key visual patterns to study:
- Image-dominant card grid
- Dark mode as standard
- Category icons + text
- Hero search with engaging copy
- Minimal text on cards
- Seller trust signals (rating visible)
- Location-aware UX
- Clean, spacious layout

---

## Not Implementing Yet
This document serves as:
- ✓ Design inspiration reference
- ✓ Future roadmap ideas
- ✓ Team alignment on direction
- ✓ Backlog for next phases

**Current focus:** Core functionality, user feedback, bug fixes

---

**Last Updated:** April 2026
**Maintained by:** Mason Market Team
