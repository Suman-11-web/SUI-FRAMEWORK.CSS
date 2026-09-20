<div align="center">
  <img src="./logosui.png" alt="Sui.css Logo" width="120" style="margin-bottom: 20px;">
  <h1>Sui.css Architecture</h1>
  <p><strong>The Ultra Pro Max CSS Framework for Modern Web Applications.</strong></p>
  <p>Version 2.0.0 • Built with OKLCH • Zero Dependencies • Hardware Accelerated</p>
</div>

---

## 📖 Table of Contents
1. Introduction
2. Installation & Setup
3. Design Tokens (CSS Variables)
4. Layout Engine
5. Utility Classes
6. Component Library
7. Hardware-Accelerated Animations
8. JavaScript Core (sui.min.js)
9. Advanced Customization
10. Starter Templates
11. Author & Credits

---

## 1. Introduction

Sui.css is an advanced, lightweight, hybrid CSS framework that bridges the gap between the rapid development speed of utility-first CSS and the strict consistency of pre-built component libraries. Engineered to solve layout, performance, and scaling challenges for modern web applications, Sui.css strictly adheres to the latest web standards.

### The Core Philosophy
* OKLCH Perceptual Colors: Traditional RGB and HSL color spaces often result in muddy gradients and uneven contrast. Sui.css utilizes the modern OKLCH color space, guaranteeing mathematically perfect color scaling, flawless contrast, and native dark mode support without manual hex code tweaking.
* CSS Subgrid Matrices: Building complex card grids where headers and footers align perfectly has historically required JavaScript. Sui.css leverages native CSS Subgrid to ensure perfect vertical alignment across dynamic content lengths.
* Physics-Based Motion: Sui.css includes native 60fps CSS springs and transitions. By utilizing the browser's compositor thread (GPU acceleration), it eliminates the need for heavy JavaScript animation libraries.
* Zero Dependencies: There are no PostCSS plugins, no Tailwind compilers to configure, and no Node modules required for the end user. Sui.css is delivered as a single CSS file and one optional JS file.

---

## 2. Installation & Setup

Integrating Sui.css into your project is designed to be frictionless. We provide globally distributed CDNs for production environments and local files for offline development.

### Global CDN (Recommended)
Served via jsDelivr for maximum edge-caching speed and lowest latency. You can include these directly in your HTML files.

CSS Stylesheet URL:
https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css

JavaScript Core URL:
https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.js

HTML Implementation:
    <!-- 1. Place the CSS in your <head> tag -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css">

    <!-- 2. Place the JS right before your closing </body> tag -->
    <script src="https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.js"></script>

### Legacy CDN
If you are maintaining older prototypes utilizing the original routing, you can use this URL:
https://suman-11-web.github.io/SUI-FRAMEWORK.CSS/dist/sui.min.css

### Local Project Setup
For offline development, download the /dist folder directly from the repository and link it relatively in your project directory:
    <link rel="stylesheet" href="./dist/sui.min.css">
    <script src="./dist/sui.min.js"></script>

---

## 3. Design Tokens (CSS Variables)

Sui.css is powered by a central :root variable system. By leveraging OKLCH, the framework calculates its entire color palette from a single hue variable, making global theming instantaneous.

### Core Palette Variables
These variables control the semantic meaning and visual hierarchy of your application. Overwriting these in your own stylesheet instantly re-themes the framework.

* --sui-brand-hue : 250 (Indigo) - The master hue. Adjusting this (0-360) shifts the entire primary scheme.
* --sui-color-primary-500 : oklch(60% 0.2 var(--sui-brand-hue)) - Primary actions, buttons, active states, and focus rings.
* --sui-color-accent-500 : oklch(65% 0.22 300) - Gradients, badges, and secondary call-to-action elements.
* --sui-color-success-500 : oklch(65% 0.15 150) - Positive semantic actions (saving, completing, verifying).
* --sui-color-danger-500 : oklch(60% 0.2 25) - Destructive semantic actions (errors, deletions, warnings).
* --sui-color-warning-500 : oklch(75% 0.15 80) - Cautionary semantic elements (pending states, alerts).

### Surface & Background Tokens
Sui.css uses layered surfaces to create depth and visual hierarchy.
* --sui-bg: The deepest background layer, applied to the <body>.
* --sui-bg-canvas: An elevated background used for main content areas and complex layouts.
* --sui-surface: The default background for interactive components like Cards, Modals, and Dropdowns.
* --sui-surface-hover: A slightly lighter surface for hover states on data rows and ghost buttons.
* --sui-border: Default subtle border color for structural dividers.
* --sui-border-strong: High-contrast border for active form inputs and focused elements.

### Spacing & Radius Tokens
Built on a mathematical 4px/8px modular scale to ensure rhythmic consistency.
* Spacing: --sui-space-1 (0.25rem) scaling sequentially up to --sui-space-12 (3rem).
* Radius: --sui-radius-sm (4px), --sui-radius-md (8px), --sui-radius-lg (12px), --sui-radius-xl (16px), and --sui-radius-full (9999px) for pill shapes and avatars.

---

## 4. Layout Engine

The Sui.css layout engine drastically reduces the need for custom CSS media queries. It provides robust Flexbox and Grid utilities that handle responsive scaling automatically.

### Flexbox Primitives
Flexbox utilities are ideal for one-dimensional layouts (rows or columns).
* .sui-flex - Initializes a flexbox container.
* .sui-flex-col - Orients children vertically (column).
* .sui-flex-row - Orients children horizontally (row).
* .sui-flex-wrap - Allows children to wrap to the next line when space is constrained.
* .sui-flex-1 - Forces a child element to absorb all remaining available space.

### Grid Primitives
Grid utilities are designed for two-dimensional layouts and complex page structures.
* .sui-grid - Initializes a CSS Grid container.
* .sui-grid-cols-1 through .sui-grid-cols-12 - Defines strict, explicit column counts.
* .sui-subgrid-matrix - Activates the advanced subgrid layout, allowing nested children to inherit the parent grid's sizing.
* .sui-subgrid-item - A specific child element designed to align its internal header, body, and footer across an entire grid row flawlessly.

### Alignment & Spacing Utilities
* .sui-items-start, .sui-items-center, .sui-items-end - Controls cross-axis alignment.
* .sui-justify-start, .sui-justify-center, .sui-justify-between, .sui-justify-end - Controls main-axis alignment.
* .sui-gap-1 through .sui-gap-8 - Injects precise spacing between flex or grid children without margin collapsing issues.

### Responsive Modifiers (Mobile-First)
Sui.css adheres strictly to a mobile-first philosophy. Base classes apply to all screen sizes, while breakpoint prefixes apply styles from that specific width and above.
* md: (Medium devices / Tablets / > 768px)
* lg: (Large devices / Desktops / > 1024px)

Comprehensive Layout Example:
    <!-- On mobile: 1 column, stacked. On tablets and above: 3 equal columns -->
    <div class="sui-grid sui-grid-cols-1 md:sui-grid-cols-3 sui-gap-6 sui-items-start">
      <div class="sui-p-4 sui-bg-surface">Column 1 Content</div>
      <div class="sui-p-4 sui-bg-surface">Column 2 Content</div>
      <div class="sui-p-4 sui-bg-surface">Column 3 Content</div>
    </div>

---

## 5. Utility Classes

Utilities are single-purpose, highly specific CSS classes designed to style elements directly in your HTML, allowing for rapid iteration.

### Typography Utilities
* Scale: .sui-text-xs, .sui-text-sm, .sui-text-base, .sui-text-lg, .sui-text-xl, .sui-text-2xl, .sui-text-3xl, .sui-text-4xl, .sui-text-hero (A massive, responsive headline size).
* Weights: .sui-font-normal (400), .sui-font-medium (500), .sui-font-bold (700), .sui-font-black (900).
* Alignment: .sui-text-left, .sui-text-center, .sui-text-right.
* Colors: 
  * .sui-text (Primary high-contrast text for readability).
  * .sui-text-muted (Secondary low-contrast text for descriptions and timestamps).
  * .sui-text-inverse (Text color guaranteed to contrast against dark backgrounds).
  * .sui-text-primary, .sui-text-danger, .sui-text-success (Semantic text colors).

### Spacing (Margin & Padding)
Sui.css uses standard industry shorthand for spacing: p (padding), m (margin), x (horizontal left/right), y (vertical top/bottom), t/b/l/r (top, bottom, left, right).
* .sui-p-4 - Applies 1rem padding to all four sides.
* .sui-px-6 - Applies 1.5rem padding to the left and right.
* .sui-my-8 - Applies 2rem margin to the top and bottom.
* .sui-mt-4 - Applies 1rem margin to the top only.
* .sui-mx-auto - Automatically calculates left/right margins to center a block-level element.

### Backgrounds & Borders
* .sui-bg-surface - Applies the default card/container background color.
* .sui-bg-primary, .sui-bg-danger, .sui-bg-success - Applies solid semantic backgrounds.
* .sui-border - Adds a 1px solid border utilizing the global subtle border token.
* .sui-border-t, .sui-border-b - Applies top or bottom borders exclusively (great for list items).
* .sui-rounded-sm, .sui-rounded-md, .sui-rounded-lg, .sui-rounded-full - Precise border radius control.

---

## 6. Component Library

While utilities handle the micro-level styling, the Component Library provides highly intelligent, pre-constructed relational UI patterns. These components automatically manage their own internal spacing, typography, and interaction states.

### Buttons
Buttons feature built-in focus rings for accessibility, active compression states for tactile feedback, and smooth hover transitions.
* .sui-btn (The required base class that handles structure, padding, and font).
* Semantic Variants: .sui-btn-primary, .sui-btn-outline, .sui-btn-subtle, .sui-btn-ghost, .sui-btn-danger.
* Size Modifiers: .sui-btn-sm (Compact), .sui-btn-lg (Prominent).
* Icon Support: .sui-btn-icon (Perfectly squares the button dimensions to wrap SVG icons cleanly).

    <button class="sui-btn sui-btn-primary sui-active-push">
      <svg width="16" height="16" viewBox="0 0 24 24"><!-- Icon --></svg>
      Save Configuration
    </button>

### Cards
Cards are the structural foundation of modern web interfaces, used for dashboards, profiles, and data displays.
* .sui-card - Automatically applies the surface background, structural borders, border radius, internal padding (1.5rem), and premium soft shadows.
* Relational Logic: Sui.css heavily utilizes modern CSS :has() pseudo-classes. For example, if a .sui-card contains a .sui-btn-primary, the card can automatically adapt its hover states to emphasize the primary action.

    <article class="sui-card sui-hover-lift">
      <h3 class="sui-text-xl sui-font-bold sui-mb-2">System Architecture</h3>
      <p class="sui-text-muted sui-mb-6">Review the latest deployment logs and server metrics.</p>
      <button class="sui-btn sui-btn-outline sui-w-full">View Logs</button>
    </article>

### Forms & Inputs
Form elements are notoriously difficult to style consistently across browsers. Sui.css normalizes them with clean, modern aesthetics and proper OKLCH focus rings that scale with your brand color.
* .sui-input - Styles standard <input>, <textarea>, and <select> elements, handling padding, borders, and focus states.
* .sui-label - Styles <label> tags with proper font weight, color, and bottom spacing.
* .sui-form-group - A wrapper class that perfectly spaces a label and its corresponding input.

    <div class="sui-form-group">
      <label class="sui-label" for="emailAddress">Email Address</label>
      <input class="sui-input" id="emailAddress" type="email" placeholder="admin@example.com">
    </div>

### Badges & Avatars
Small indicator components essential for data tables and user profiles.
* .sui-badge - Base class for compact, pill-shaped indicators.
* Variants: .sui-badge-primary, .sui-badge-success, .sui-badge-warning, .sui-badge-danger, .sui-badge-outline.
* .sui-avatar - Creates a mathematically perfect circle, automatically centering text initials or scaling an <img> tag to fit within its bounds.

    <div class="sui-flex sui-gap-4 sui-items-center">
      <div class="sui-avatar" style="background: var(--sui-color-primary-500); color: white;">SM</div>
      <div>
        <strong class="sui-block">Suman M.</strong>
        <span class="sui-badge sui-badge-success sui-mt-1">Active Now</span>
      </div>
    </div>

---

## 7. Hardware-Accelerated Animations

Sui.css moves beyond basic ease-in-out transitions. It provides a suite of native CSS physics animations. By strictly animating properties like transform and opacity, Sui.css forces the browser to hand the animation workload to the GPU compositor thread, guaranteeing 60fps performance without jank.

### Entry Transitions (Load States)
Apply these to elements to choreograph how they enter the DOM on page load.
* .sui-animate-blur-in - The element fades from 0 to 1 opacity while simultaneously unblurring from a 10px radius. This creates a highly polished, Apple-style reveal.
* .sui-animate-slide-up - Smoothly translates the element upward by 20px while fading it in.
* .sui-animate-spring-up - Similar to slide-up, but utilizes a custom cubic-bezier curve to slightly overshoot its final position before snapping back, mimicking natural spring physics.

### Micro-Interactions (Hover & Active States)
* .sui-hover-lift - On cursor hover, the element scales up seamlessly to 1.02 and increases its shadow depth, indicating interactivity.
* .sui-active-push - On mouse click (the :active state), the element compresses to a 0.95 scale, providing satisfying tactile physical feedback to the user.
* .sui-hover-glow - Emits a soft, OKLCH-colored box-shadow on hover, ideal for emphasizing primary buttons.

### Continuous Motion
* .sui-animate-pulse-glow - Creates a continuous, breathing radar-ring effect utilizing box-shadow expansion. Perfect for "Live" indicators, recording buttons, or critical alerts.
* .sui-animate-float - The element smoothly levitates up and down continuously on the Y-axis (ideal for hero section illustrations or floating action buttons).
* .sui-animate-spin - Continuous 360-degree linear rotation (used for loading spinners and sync icons).

---

## 8. JavaScript Core (sui.min.js)

While Sui.css is fundamentally a CSS architecture, the accompanying sui.min.js file provides critical UI logic that CSS cannot handle independently. It is dependency-free, operates entirely via event delegation, and does not manipulate the Virtual DOM.

### 1. Mobile Drawer Engine
The script manages the complex state toggling required for the off-canvas mobile navigation drawer.
* Trigger Mechanism: It listens for clicks on any element with id="mobileMenuBtn".
* Target Execution: It locates the id="mobileDrawer" element and injects the .is-open class, triggering the CSS hardware-accelerated slide-in animation.
* Dismissal Logic: Clicking any element with the .js-drawer-close class (which is applied to the close button and the dark backdrop overlay) strips the .is-open class, dismissing the drawer cleanly.

### 2. Live Playground Syntax Highlighter
Included directly in the JS core is a bespoke, zero-dependency Regex Syntax parser designed specifically for the SUI documentation's interactive code editor.
* Architecture: It intercepts raw HTML typed into a <textarea>, escapes dangerous characters, and wraps attributes, strings, and tags in unique placeholder markers. It then safely converts these markers into beautifully colored .sui-hl-* spans.
* Performance: By handling this natively, Sui.css avoids forcing users to download massive 500kb+ external libraries like CodeMirror or Prism.js just to view code documentation.

### 3. Scroll Synchronization
To make the Live Editor function flawlessly, the JavaScript precisely synchronizes the scroll position (both scrollTop and scrollLeft) of the invisible, writable <textarea> with the underlying, read-only <pre> layer where the colored syntax spans are rendered.

---

## 9. Advanced Customization

Sui.css is designed to be completely overridden without ever needing to edit the source code or recompile the framework. 

### Overriding Global Tokens
By defining CSS variables in the :root pseudo-class in your own styles.css file (loaded after sui.min.css), you can fundamentally alter the framework's DNA.

    /* Your custom styles.css */
    :root {
      /* 1. Shift the primary brand color from Indigo to a deep Crimson */
      --sui-brand-hue: 15;
      
      /* 2. Create a brutalist, sharp-edged aesthetic by removing all border radii */
      --sui-radius-sm: 0px;
      --sui-radius-md: 0px;
      --sui-radius-lg: 0px;
      --sui-radius-xl: 0px;
      --sui-radius-full: 0px;

      /* 3. Swap the typography system to a serif font */
      --sui-font-family: 'Georgia', 'Times New Roman', serif;
    }

### Implementing Theming / Light & Dark Modes
Sui.css utilizes semantic surface tokens, making theme switching incredibly straightforward. By targeting a data-theme attribute on the <html> tag, you can define completely new surface colors for different environments.

    /* Defining a specific Light Mode theme override */
    html[data-theme="light"] {
      --sui-bg: #ffffff;
      --sui-bg-canvas: #f3f4f6;
      --sui-surface: #ffffff;
      --sui-surface-hover: #f9fafb;
      --sui-text: #111827;
      --sui-text-muted: #6b7280;
      --sui-border: #e5e7eb;
    }

---

## 10. Starter Templates

To accelerate your workflow, here are fully configured architectural templates demonstrating how Sui.css utility and component classes interlock.

### The Marketing Landing Page
A high-converting hero section utilizing fluid typography, flexbox navigation, and spring animations.

    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Product Launch - Sui.css</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css">
    </head>
    <body class="sui-bg">

      <!-- Application Navbar -->
      <nav class="sui-flex sui-items-center sui-justify-between sui-p-6 sui-border-b sui-border-subtle sui-bg-surface">
        <strong class="sui-text-xl sui-font-black">Platform.</strong>
        <div class="sui-flex sui-gap-6 sui-items-center">
          <a href="#" class="sui-text-muted sui-font-medium">Features</a>
          <a href="#" class="sui-text-muted sui-font-medium">Pricing</a>
          <button class="sui-btn sui-btn-sm sui-btn-primary">Sign In</button>
        </div>
      </nav>

      <!-- Animated Hero Section -->
      <main class="sui-flex sui-flex-col sui-items-center sui-justify-center sui-text-center sui-px-6 sui-py-20 sui-mt-8">
        <span class="sui-badge sui-badge-primary sui-badge-outline sui-animate-spring-up sui-mb-6">System v2.0 is Live</span>
        
        <h1 class="sui-text-hero sui-font-black sui-animate-blur-in sui-delay-1 sui-max-w-4xl sui-mb-6" style="line-height: 1.1;">
          Design Faster.<br>Build Better Interfaces.
        </h1>
        
        <p class="sui-text-xl sui-text-muted sui-animate-slide-up sui-delay-2 sui-max-w-2xl sui-mb-10">
          The most advanced UI toolkit for modern web applications. Combine components, utilities, and raw CSS power seamlessly.
        </p>
        
        <div class="sui-flex sui-gap-4 sui-animate-spring-up sui-delay-3">
          <button class="sui-btn sui-btn-primary sui-btn-lg sui-active-push">Start Building Free</button>
          <button class="sui-btn sui-btn-outline sui-btn-lg sui-hover-lift">Read Documentation</button>
        </div>
      </main>

      <script src="https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.js"></script>
    </body>
    </html>

### The Dashboard Interface Shell
A complex, application-style layout featuring a fixed sidebar and a responsive grid dashboard.

    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard - Sui.css</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/Suman-11-web/SUI-FRAMEWORK.CSS@v2.0.0/dist/sui.min.css">
    </head>
    <body class="sui-bg sui-flex" style="min-height: 100vh;">

      <!-- Sidebar (Hidden on Mobile) -->
      <aside class="sui-hidden md:sui-flex sui-flex-col sui-w-64 sui-border-r sui-border-subtle sui-bg-surface sui-p-6">
        <strong class="sui-text-xl sui-mb-8">Admin Panel</strong>
        <nav class="sui-flex sui-flex-col sui-gap-2">
          <a href="#" class="sui-btn sui-btn-subtle sui-justify-start">Overview</a>
          <a href="#" class="sui-btn sui-btn-ghost sui-text-muted sui-justify-start">Analytics</a>
          <a href="#" class="sui-btn sui-btn-ghost sui-text-muted sui-justify-start">Settings</a>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="sui-flex-1 sui-flex sui-flex-col">
        <header class="sui-flex sui-justify-between sui-items-center sui-p-6 sui-border-b sui-border-subtle">
          <h2 class="sui-text-2xl sui-font-bold">System Overview</h2>
          <div class="sui-avatar" style="background: var(--sui-color-accent-500); color: white;">Admin</div>
        </header>

        <div class="sui-p-6 sui-grid sui-grid-cols-1 md:sui-grid-cols-3 sui-gap-6">
          <div class="sui-card">
            <h3 class="sui-text-sm sui-text-muted sui-mb-2">Total Users</h3>
            <p class="sui-text-3xl sui-font-black">14,205</p>
          </div>
          <div class="sui-card">
            <h3 class="sui-text-sm sui-text-muted sui-mb-2">Revenue</h3>
            <p class="sui-text-3xl sui-font-black">$84,392</p>
          </div>
          <div class="sui-card">
            <h3 class="sui-text-sm sui-text-muted sui-mb-2">Server Status</h3>
            <p class="sui-text-3xl sui-font-black sui-text-success">Healthy</p>
          </div>
        </div>
      </main>

    </body>
    </html>

---

## 11. Author & Credits

Architected & Developed by:
Suman M.
Software Developer, UI Engineer & Architect

Project Overview:
Sui.css was engineered from the ground up to solve demanding layout, speed, and scaling challenges faced when building highly interactive, modern web applications. By completely discarding legacy CSS practices in favor of mathematical OKLCH color models, native subgrids, and GPU-accelerated motion, Sui.css provides developers with an elite toolkit that is both powerful and incredibly lightweight.

License & Usage:
Released under the MIT License. Sui.css is free and open-source for both personal hobby projects and large-scale commercial applications. It is built in public and continuously improved on GitHub.