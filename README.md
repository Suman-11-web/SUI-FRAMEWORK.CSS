<div align="center">
  <div style="width: 80px; height: 80px; background: #6366f1; color: white; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; margin: 0 auto 20px auto;">S</div>
  <h1>Sui.css Architecture</h1>
  <p><strong>The Ultra Pro Max CSS Framework for Modern Web Applications.</strong></p>
  <p>Version 2.0.0 • Built with OKLCH • Zero Dependencies • Hardware Accelerated</p>
</div>

---

## 📖 Table of Contents
1. [Introduction](#1-introduction)
2. [Installation & Setup](#2-installation--setup)
3. [Design Tokens (CSS Variables)](#3-design-tokens)
4. [Layout Engine](#4-layout-engine)
5. [Utility Classes](#5-utility-classes)
6. [Component Library](#6-component-library)
7. [Hardware-Accelerated Animations](#7-animation-engine)
8. [JavaScript Core (`sui.min.js`)](#8-javascript-core)
9. [Advanced Customization](#9-advanced-customization)
10. [Starter Templates](#10-starter-templates)
11. [Author & Credits](#11-author--credits)

---

## 1. Introduction

**Sui.css** is a lightweight, hybrid CSS framework that combines the speed of utility-first CSS with the consistency of pre-built components. Engineered specifically to solve the layout and performance challenges of modern web applications (like social media feeds, dashboards, and interactive portals), it strictly uses modern web standards.

### Core Philosophy
*   **OKLCH Perceptual Colors:** Flawless contrast, mathematically perfect color scaling, and native dark mode support.
*   **CSS Subgrid Matrices:** Perfect vertical alignment across complex card grids regardless of content length.
*   **Physics-Based Motion:** Native 60fps CSS springs and transitions, eliminating the need for heavy JS animation libraries like GSAP or Framer Motion.
*   **Zero Dependencies:** No PostCSS plugins, no Tailwind compilers, no Node modules required for the end user. Just one CSS file and one optional JS file.

---

## 2. Installation & Setup

Integrate Sui.css into your project in seconds. We provide global CDNs for production and local files for offline development.

### Global CDN (Recommended)
Served via jsDelivr for maximum edge-caching speed. Add these to your `index.html`.

```html
<!-- 1. Place this in the <head> -->
<link rel="stylesheet" href="[https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css](https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css)">

<!-- 2. Place this right before the closing </body> tag -->
<script src="[https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.js](https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.js)"></script>
```

### Legacy GitHub Pages CDN
If you are maintaining older v1.x prototypes:
```html
<link rel="stylesheet" href="[https://suman-11-web.github.io/SUI-FRAMEWORK.CSS/dist/sui.min.css](https://suman-11-web.github.io/SUI-FRAMEWORK.CSS/dist/sui.min.css)">
```

### Local Project Setup
Download the `/dist` folder from the repository and link it relatively:
```html
<link rel="stylesheet" href="./dist/sui.min.css">
<script src="./dist/sui.min.js"></script>
```

---

## 3. Design Tokens

Sui.css is powered by a central `:root` variable system. By leveraging OKLCH, the framework generates its entire color palette from a single `hue` variable. 

### Core Palette Variables
These variables control the entire look and feel of the framework. You can overwrite them in your own CSS to instantly re-theme the app.

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `--sui-brand-hue` | `250` (Blue/Indigo) | The master hue. Changing this (0-360) shifts the entire primary color scheme. |
| `--sui-color-primary-500` | `oklch(60% 0.2 var(--sui-brand-hue))` | The main brand color used for buttons, active states, and focus rings. |
| `--sui-color-accent-500` | `oklch(65% 0.22 300)` | Used for gradients, badges, and secondary attention elements. |
| `--sui-color-success-500` | `oklch(65% 0.15 150)` | Green semantic color. |
| `--sui-color-danger-500` | `oklch(60% 0.2 25)` | Red semantic color for errors/deletions. |
| `--sui-color-warning-500` | `oklch(75% 0.15 80)` | Yellow/Orange semantic color. |

### Surface & Background Tokens
Sui.css uses layered surfaces to create depth, particularly in dark mode.

*   `--sui-bg`: The deepest background layer (used on `<body>`).
*   `--sui-bg-canvas`: A slightly elevated background for main content areas.
*   `--sui-surface`: The default background for Cards, Modals, and Dropdowns.
*   `--sui-surface-hover`: A slightly lighter surface used for hover states on rows and buttons.
*   `--sui-border`: Default subtle border color for structural lines.
*   `--sui-border-strong`: High-contrast border for form inputs.

### Spacing & Radius Tokens
Based on a 4px/8px modular scale.

*   **Spacing:** `--sui-space-1` (0.25rem) up to `--sui-space-12` (3rem).
*   **Radius:** `--sui-radius-sm` (4px), `--sui-radius-md` (8px), `--sui-radius-lg` (12px), `--sui-radius-xl` (16px), `--sui-radius-full` (9999px).

---

## 4. Layout Engine

The layout engine eliminates the need for custom CSS media queries. It provides Flexbox and Grid utilities that handle responsive scaling automatically.

### Flexbox Primitives
*   `.sui-flex` - Activates flexbox.
*   `.sui-flex-col` - Stacks children vertically.
*   `.sui-flex-row` - Aligns children horizontally.
*   `.sui-flex-wrap` - Allows children to wrap to the next line.
*   `.sui-flex-1` - Forces a child to take up remaining available space (`flex: 1`).

### Grid Primitives
*   `.sui-grid` - Activates CSS Grid.
*   `.sui-grid-cols-1`, `.sui-grid-cols-2`, `.sui-grid-cols-3`, `.sui-grid-cols-4`, `.sui-grid-cols-12` - Defines explicit columns.
*   `.sui-subgrid-matrix` - Activates the advanced subgrid layout for complex card alignment.
*   `.sui-subgrid-item` - A child of the matrix that aligns its internal header, body, and footer across the entire row.

### Alignment & Spacing
*   `.sui-items-start`, `.sui-items-center`, `.sui-items-end` - Cross-axis alignment (`align-items`).
*   `.sui-justify-start`, `.sui-justify-center`, `.sui-justify-between`, `.sui-justify-end` - Main-axis alignment (`justify-content`).
*   `.sui-gap-1` to `.sui-gap-8` - Controls the space between flex/grid children.

### Responsive Modifiers
Sui.css is mobile-first. By default, classes apply to all screen sizes. Prefixing a class with a breakpoint changes its behavior at that specific screen width.

*   `md:` (Medium / Tablet / > 768px)
*   `lg:` (Large / Desktop / > 1024px)

**Example Layout:**
```html
<!-- Stacks vertically on mobile, switches to 3 columns on desktop -->
<div class="sui-grid sui-grid-cols-1 md:sui-grid-cols-3 sui-gap-6">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>
```

---

## 5. Utility Classes

Utilities are single-purpose classes designed to quickly style elements without touching CSS.

### Typography
*   **Scale:** `.sui-text-xs`, `.sui-text-sm`, `.sui-text-base`, `.sui-text-lg`, `.sui-text-xl`, `.sui-text-2xl`, `.sui-text-3xl`, `.sui-text-4xl`, `.sui-text-hero`
*   **Weights:** `.sui-font-normal`, `.sui-font-medium`, `.sui-font-bold`, `.sui-font-black`
*   **Alignment:** `.sui-text-left`, `.sui-text-center`, `.sui-text-right`
*   **Colors:** 
    *   `.sui-text` (Primary high-contrast text)
    *   `.sui-text-muted` (Secondary low-contrast text)
    *   `.sui-text-inverse` (Text color for dark backgrounds)
    *   `.sui-text-primary`, `.sui-text-danger`, `.sui-text-success`

### Spacing (Margin & Padding)
Uses standard shorthand: `p` (padding), `m` (margin), `x` (horizontal), `y` (vertical), `t/b/l/r` (top, bottom, left, right).
*   `.sui-p-4` - 1rem padding on all sides.
*   `.sui-px-6` - 1.5rem padding left and right.
*   `.sui-my-8` - 2rem margin top and bottom.
*   `.sui-mt-4` - 1rem margin top.
*   `.sui-mx-auto` - Centers a block-level element horizontally.

### Backgrounds & Borders
*   `.sui-bg-surface` - Applies the default surface background color.
*   `.sui-bg-primary`, `.sui-bg-danger`, `.sui-bg-success` - Semantic backgrounds.
*   `.sui-border` - Adds a 1px solid border using the token color.
*   `.sui-border-t`, `.sui-border-b` - Adds top/bottom borders only.
*   `.sui-rounded-sm`, `.sui-rounded-md`, `.sui-rounded-lg`, `.sui-rounded-full` - Border radius control.

---

## 6. Component Library

Sui.css provides highly intelligent relational components. Unlike raw utilities, these components adapt to their surroundings.

### Buttons
Buttons include built-in focus rings, active compression states, and hover transitions.
*   `.sui-btn` (Base class required for all buttons)
*   **Variants:** `.sui-btn-primary`, `.sui-btn-outline`, `.sui-btn-subtle`, `.sui-btn-danger`
*   **Sizes:** `.sui-btn-sm`, `.sui-btn-lg`
*   **Icon Buttons:** `.sui-btn-icon` (Perfectly squares the button for SVG icons)

```html
<button class="sui-btn sui-btn-primary sui-active-push">
  Save Changes
</button>
```

### Cards
Cards are the structural backbone of dashboards and feeds.
*   `.sui-card` - Applies surface background, borders, radius, padding, and subtle shadows.
*   **Relational Logic:** If a `.sui-card` contains a `.sui-btn-primary`, the card will automatically enhance its own border on hover using CSS `:has()` logic.

```html
<article class="sui-card sui-hover-lift">
  <h3 class="sui-text-xl sui-mb-2">Card Title</h3>
  <p class="sui-text-muted sui-mb-4">Card content goes here.</p>
  <button class="sui-btn sui-btn-outline">Action</button>
</article>
```

### Forms
Form inputs are styled for maximum accessibility, featuring proper OKLCH focus rings.
*   `.sui-input` - Styles `<input>`, `<textarea>`, and `<select>` elements.
*   `.sui-label` - Styles `<label>` tags with proper weight and spacing.

```html
<form class="sui-flex sui-flex-col sui-gap-2">
  <label class="sui-label" for="username">Username</label>
  <input class="sui-input" id="username" type="text" placeholder="@suman">
</form>
```

### Badges & Avatars
*   `.sui-badge` - Base class for pill-shaped indicators.
*   **Variants:** `.sui-badge-primary`, `.sui-badge-success`, `.sui-badge-warning`, `.sui-badge-danger`.
*   `.sui-avatar` - Creates a perfect circle for profile pictures or initials.

```html
<div class="sui-flex sui-gap-4 sui-items-center">
  <div class="sui-avatar" style="background: var(--sui-color-primary-500); color: white;">SM</div>
  <span class="sui-badge sui-badge-success">Online</span>
</div>
```

---

## 7. Animation Engine

Sui.css abandons old `ease-in-out` transitions in favor of native CSS physics and hardware acceleration (GPU rendering).

### Entry Transitions (Load States)
Apply these to elements as they enter the DOM.
*   `.sui-animate-blur-in` - The element fades in while unblurring (Apple-style reveal).
*   `.sui-animate-slide-up` - Fades in while translating upward.
*   `.sui-animate-spring-up` - Translates upward but slightly overshoots its target before bouncing back to rest.

### Micro-Interactions (Hover/Active)
*   `.sui-hover-lift` - On cursor hover, the element scales up by `1.02` and increases its shadow depth.
*   `.sui-active-push` - On mouse click (active state), the element compresses to `0.95` scale, providing tactile physical feedback.
*   `.sui-hover-glow` - Emits an OKLCH colored box-shadow on hover.

### Continuous Motion
*   `.sui-animate-pulse-glow` - Creates a continuous, breathing radar-ring effect (perfect for "Live" indicators or recording buttons).
*   `.sui-animate-float` - The element smoothly levitates up and down continuously on the Y-axis.
*   `.sui-animate-spin` - Continuous 360-degree rotation (useful for loading spinners).

---

## 8. JavaScript Core (`sui.min.js`)

The `sui.min.js` file is extremely lightweight and strictly provides UI logic that CSS cannot handle alone. It does not manipulate the Virtual DOM or require a framework like React.

### 1. Mobile Drawer Engine
The JS listens for specific classes to manage the mobile navigation overlay.
*   **Trigger:** Any button with `id="mobileMenuBtn"`.
*   **Target:** The framework looks for `id="mobileDrawer"` and applies the `.is-open` class, sliding it into the viewport.
*   **Close Triggers:** Clicking any element with `.js-drawer-close` (usually a close button or the backdrop overlay) will strip the `.is-open` class, dismissing the drawer.

### 2. Live Playground Syntax Highlighter
Included in the core is a custom, zero-dependency Regex Syntax engine designed specifically for the SUI documentation playground.
*   **How it works:** It intercepts raw HTML inside textareas, escapes it safely, wraps attributes, strings, and tags in temporary placeholder strings, and finally converts them into colored `.sui-hl-*` spans.
*   **Why:** It allows the live "Try Sui.css" editor to function smoothly without injecting a massive 500kb library like CodeMirror.

### 3. Scroll Synchronization
For the Live Editor, the JS synchronizes the scroll position of the invisible `<textarea>` (where the user types) with the underlying `<pre>` layer (where the colored syntax is rendered).

---

## 9. Advanced Customization

### Overriding Tokens
Because Sui.css relies heavily on CSS variables, you do not need to recompile the framework to change its appearance. Simply create a `styles.css` file, load it *after* `sui.min.css`, and redefine the `:root` scope.

```css
/* Customizing the entire framework with one file */
:root {
  /* 1. Change the primary brand color to a deep red */
  --sui-brand-hue: 15;
  
  /* 2. Make all buttons and cards perfectly square */
  --sui-radius-sm: 0px;
  --sui-radius-md: 0px;
  --sui-radius-lg: 0px;
  --sui-radius-xl: 0px;
  --sui-radius-full: 0px;

  /* 3. Change the base font to a serif */
  --sui-font-family: 'Georgia', serif;
}
```

### Theming / Dark Mode
Sui.css utilizes semantic surface tokens. If you wish to implement a light mode or specific theme variants, target a data attribute on the `<html>` tag:

```css
html[data-theme="light"] {
  --sui-bg: #ffffff;
  --sui-bg-canvas: #f8f9fa;
  --sui-surface: #ffffff;
  --sui-text: #111827;
  --sui-text-muted: #6b7280;
  --sui-border: #e5e7eb;
}
```

---

## 10. Starter Templates

### The 60-Second Landing Page
Copy and paste this layout to see the framework in action. It utilizes the Flex layout, Fluid Typography, Spring Animations, and Relational Components.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page - Sui.css</title>
  <link rel="stylesheet" href="[https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css](https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css)">
</head>
<body class="sui-bg">

  <!-- Navbar -->
  <nav class="sui-flex sui-items-center sui-justify-between sui-p-6 sui-border-b sui-border-subtle">
    <strong class="sui-text-xl">Brand.</strong>
    <div class="sui-flex sui-gap-4">
      <a href="#" class="sui-text-muted">Features</a>
      <a href="#" class="sui-text-muted">Pricing</a>
    </div>
  </nav>

  <!-- Hero Section -->
  <main class="sui-flex sui-flex-col sui-items-center sui-justify-center sui-text-center sui-p-8 sui-mt-12">
    <span class="sui-badge sui-badge-primary sui-animate-spring-up sui-mb-6">Version 2.0 is Live</span>
    
    <h1 class="sui-text-hero sui-animate-blur-in sui-delay-1 sui-max-w-4xl sui-mb-6">
      Design Faster. Build Better.
    </h1>
    
    <p class="sui-text-xl sui-text-muted sui-animate-slide-up sui-delay-2 sui-max-w-2xl sui-mb-8">
      The most advanced UI toolkit for modern web applications.
    </p>
    
    <div class="sui-flex sui-gap-4 sui-animate-spring-up sui-delay-3">
      <button class="sui-btn sui-btn-primary sui-btn-lg sui-active-push">Get Started</button>
      <button class="sui-btn sui-btn-outline sui-btn-lg sui-hover-lift">Read Docs</button>
    </div>
  </main>

  <script src="[https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.js](https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.js)"></script>
</body>
</html>
```

---

## 11. Author & Credits

**Architected & Developed by:**  
**Suman M.**  
*Software Developer & UI Architect*

**Project Origins:**  
Sui.css was initially conceptualized and built as the proprietary UI engine for **Novasocial**, a modern social media web application. It was designed to solve the specific challenges of complex feed layouts, real-time animation performance, and mobile responsiveness. It has since been extracted and open-sourced as a standalone framework.

**License:**  
MIT License. Sui.css is free to use for both personal and commercial projects. Built in public, available on GitHub.