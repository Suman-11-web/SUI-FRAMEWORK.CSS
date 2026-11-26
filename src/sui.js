/**
 * SUI.css - Interactive Runtime Engine v3.0.0
 * Architecture: Zero-Dependency Pure Vanilla JavaScript (Unified UMD)
 * Author: Suman M. (Sui.css Core Team)
 */

(function (global, factory) {
  const api = factory();
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = api;
  } else if (typeof define === 'function' && define.amd) {
    define(function () { return api; });
  }
  const root = typeof globalThis !== 'undefined' ? globalThis : global || self;
  if (root) root.SUI = api;
})(this, function () {
  'use strict';

  const SUI_CONFIG = {
    themeKey: 'sui-theme',
    toastContainerId: 'sui-toast-container',
    animationThreshold: 0.15
  };

  let initialized = false;

  /* ==========================================================================
     1. UTILITIES
     ========================================================================== */
  const Utils = {
    prefersReducedMotion() {
      return (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    },
    createElement(tag, classes = [], attributes = {}) {
      const el = document.createElement(tag);
      if (Array.isArray(classes)) classes.forEach((c) => c && el.classList.add(c));
      else if (typeof classes === 'string') el.className = classes;
      for (const [key, val] of Object.entries(attributes)) {
        el.setAttribute(key, val);
      }
      return el;
    },
    triggerReflow(element) {
      if (element) void element.offsetWidth;
    }
  };

  /* ==========================================================================
     2. THEME ENGINE (Unified data-theme with prefers-color-scheme sync)
     ========================================================================== */
  const ThemeEngine = {
    init() {
      let stored = null;
      try {
        stored = localStorage.getItem(SUI_CONFIG.themeKey);
      } catch (_) {
        /* ignore storage restrictions */
      }
      const declaredTheme = document.documentElement.getAttribute('data-theme');
      const mql =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)')
          : null;
      let initialTheme = stored || declaredTheme || 'light';
      if (initialTheme === 'auto') {
        initialTheme = mql && mql.matches ? 'dark' : 'light';
      }

      this.set(initialTheme, false);

      if (mql && typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', (e) => {
          let currentStored = null;
          try {
            currentStored = localStorage.getItem(SUI_CONFIG.themeKey);
          } catch (_) {
            /* ignore */
          }
          if (!currentStored && declaredTheme === 'auto') {
            this.set(e.matches ? 'dark' : 'light', false);
          }
        });
      }

      document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.sui-theme-toggle');
        if (toggleBtn) {
          e.preventDefault();
          this.toggle();
        }
      });
    },
    get() {
      return (
        document.documentElement.getAttribute('data-theme') ||
        document.documentElement.getAttribute('data-sui-theme') ||
        'light'
      );
    },
    set(theme, store = true) {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.removeAttribute('data-sui-theme');
      if (store) {
        try {
          localStorage.setItem(SUI_CONFIG.themeKey, theme);
        } catch (_) {
          /* ignore */
        }
      }
      window.dispatchEvent(new CustomEvent('sui:theme-change', { detail: { theme } }));
    },
    toggle() {
      const next = this.get() === 'dark' ? 'light' : 'dark';
      this.set(next, true);
      return next;
    }
  };

  /* ==========================================================================
     3. TOAST NOTIFICATION ENGINE (Supports both v2 .show() and v3 helpers)
     ========================================================================== */
  const Toast = {
    getContainer() {
      let container = document.getElementById(SUI_CONFIG.toastContainerId);
      if (!container) {
        container = Utils.createElement('div', ['sui-toast-container'], {
          id: SUI_CONFIG.toastContainerId,
          role: 'status',
          'aria-live': 'polite',
          style:
            'position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.75rem; max-width: 420px; width: calc(100% - 3rem); pointer-events: none;'
        });
        document.body.appendChild(container);
      }
      return container;
    },
    show({ title = '', message = '', type = 'info', duration = 4000, dismissible = true } = {}) {
      const normalizedType = type === 'error' ? 'danger' : type;
      const container = this.getContainer();
      const toast = Utils.createElement(
        'div',
        ['sui-toast', `sui-toast-${normalizedType}`, 'sui-animate-spring-up'],
        {
          style:
            'pointer-events: auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;'
        }
      );

      if (normalizedType === 'success') toast.style.borderLeftColor = 'var(--sui-color-success-500)';
      if (normalizedType === 'danger') toast.style.borderLeftColor = 'var(--sui-color-danger-500)';
      if (normalizedType === 'warning') toast.style.borderLeftColor = 'var(--sui-color-warning-500)';
      if (normalizedType === 'info') toast.style.borderLeftColor = 'var(--sui-color-info-500)';

      const content = document.createElement('div');
      if (title) {
        const strong = Utils.createElement('strong', ['sui-block', 'sui-text-sm'], {
          style: 'margin-bottom: 0.25rem;'
        });
        strong.textContent = title;
        content.appendChild(strong);
      }
      if (message) {
        const text = Utils.createElement('p', ['sui-text-xs', 'sui-text-muted'], {
          style: 'margin: 0;'
        });
        text.textContent = message;
        content.appendChild(text);
      }
      toast.appendChild(content);

      if (dismissible) {
        const closeBtn = Utils.createElement('button', ['sui-btn-icon'], {
          type: 'button',
          'aria-label': 'Dismiss notification',
          style:
            'background: transparent; border: none; cursor: pointer; color: var(--sui-text-muted); padding: 0.25rem;'
        });
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', () => this.dismiss(toast));
        toast.appendChild(closeBtn);
      }

      container.appendChild(toast);

      if (duration > 0) {
        let timer = setTimeout(() => this.dismiss(toast), duration);
        toast.addEventListener('mouseenter', () => clearTimeout(timer));
        toast.addEventListener('mouseleave', () => {
          timer = setTimeout(() => this.dismiss(toast), Math.max(duration / 2, 1000));
        });
      }

      return toast;
    },
    success(message, title = '') {
      return this.show({ title, message, type: 'success' });
    },
    error(message, title = '') {
      return this.show({ title, message, type: 'danger' });
    },
    danger(message, title = '') {
      return this.show({ title, message, type: 'danger' });
    },
    warning(message, title = '') {
      return this.show({ title, message, type: 'warning' });
    },
    info(message, title = '') {
      return this.show({ title, message, type: 'info' });
    },
    dismiss(toast) {
      if (!toast) return;
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }
  };

  /* ==========================================================================
     4. MODAL & DIALOG ENGINE (Multi-instance, Escape, Focus Restoration)
     Supports both v3 (.sui-modal + .is-open) and v2 (.sui-dialog-overlay + .active)
     ========================================================================== */
  const Modal = {
    _stack: [],
    _resolveElement(target) {
      if (!target) return null;
      return typeof target === 'string' ? document.getElementById(target) : target;
    },
    _isLegacyDialog(el) {
      return el.classList.contains('sui-dialog-overlay') && !el.classList.contains('sui-modal');
    },
    open(target, triggerElement = null) {
      const modal = this._resolveElement(target);
      if (!modal) return false;

      const returnFocusTo = triggerElement || document.activeElement;
      const existingIdx = this._stack.findIndex((entry) => entry.modal === modal);
      if (existingIdx !== -1) {
        this._stack.splice(existingIdx, 1);
      }
      this._stack.push({ modal, returnFocusTo });

      if (this._isLegacyDialog(modal)) {
        modal.classList.add('active');
      } else {
        modal.classList.add('is-open');
        modal.classList.add('active');
      }
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Flush style/layout so visibility: visible is active before focusing
      Utils.triggerReflow(modal);

      const focusable = modal.querySelector(
        '[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-sui-modal-close]):not(.sui-modal-close), [tabindex]:not([tabindex="-1"])'
      ) || modal.querySelector('button:not([disabled])');
      if (focusable && typeof focusable.focus === 'function') {
        focusable.focus();
      }

      window.dispatchEvent(
        new CustomEvent('sui:modal-open', { detail: { id: modal.id, element: modal } })
      );
      return true;
    },
    close(target) {
      let modal = this._resolveElement(target);
      if (!modal && this._stack.length > 0) {
        modal = this._stack[this._stack.length - 1].modal;
      }
      if (!modal) {
        modal = document.querySelector('.sui-modal.is-open, .sui-dialog-overlay.active');
      }
      if (!modal) return false;

      modal.classList.remove('is-open', 'active');
      modal.setAttribute('aria-hidden', 'true');

      let returnFocusTo = null;
      const idx = this._stack.findIndex((entry) => entry.modal === modal);
      if (idx !== -1) {
        returnFocusTo = this._stack[idx].returnFocusTo;
        this._stack.splice(idx, 1);
      }

      if (this._stack.length === 0) {
        document.body.style.overflow = '';
      }

      if (
        returnFocusTo &&
        typeof returnFocusTo.focus === 'function' &&
        document.contains(returnFocusTo)
      ) {
        returnFocusTo.focus();
      }

      window.dispatchEvent(
        new CustomEvent('sui:modal-close', { detail: { id: modal.id, element: modal } })
      );
      return true;
    },
    closeAll() {
      while (this._stack.length > 0) {
        this.close(this._stack[this._stack.length - 1].modal);
      }
      document
        .querySelectorAll('.sui-modal.is-open, .sui-dialog-overlay.active')
        .forEach((m) => this.close(m));
    },
    init() {
      document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('[data-sui-modal-target]');
        if (openBtn) {
          e.preventDefault();
          const targetId = openBtn.getAttribute('data-sui-modal-target');
          this.open(targetId, openBtn);
          return;
        }

        const closeBtn = e.target.closest('[data-sui-modal-close], .sui-modal-close');
        if (closeBtn) {
          e.preventDefault();
          const modal = closeBtn.closest('.sui-modal, .sui-dialog-overlay');
          this.close(modal);
          return;
        }

        if (
          e.target.classList.contains('sui-modal-overlay') ||
          e.target.classList.contains('sui-dialog-overlay') ||
          e.target.classList.contains('sui-modal')
        ) {
          const modal = e.target.closest('.sui-modal, .sui-dialog-overlay');
          this.close(modal);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this._stack.length > 0) {
          this.close(this._stack[this._stack.length - 1].modal);
        }
      });
    }
  };

  /* ==========================================================================
     5. RESPONSIVE NAVBAR & MOBILE DRAWER ENGINE
     ========================================================================== */
  const Navbar = {
    _resolveMenu(toggleBtn) {
      const targetId =
        toggleBtn.getAttribute('data-sui-navbar-target') ||
        toggleBtn.getAttribute('aria-controls');
      if (targetId) return document.getElementById(targetId);
      const nav = toggleBtn.closest('.sui-navbar');
      return nav ? nav.querySelector('.sui-navbar-menu') : null;
    },
    toggle(toggleBtn) {
      const menu = this._resolveMenu(toggleBtn);
      if (!menu) return false;
      const isOpen = menu.classList.toggle('is-open');
      const nav = toggleBtn.closest('.sui-navbar');
      if (nav) nav.classList.toggle('is-open', isOpen);
      toggleBtn.setAttribute('aria-expanded', String(isOpen));
      return isOpen;
    },
    closeAll(restoreFocus = false) {
      document.querySelectorAll('.sui-navbar-menu.is-open').forEach((menu) => {
        menu.classList.remove('is-open');
        const nav = menu.closest('.sui-navbar');
        if (nav) {
          nav.classList.remove('is-open');
          const btn = nav.querySelector('.sui-navbar-toggle, [data-sui-navbar-toggle]');
          if (btn) {
            btn.setAttribute('aria-expanded', 'false');
            if (restoreFocus && typeof btn.focus === 'function') btn.focus();
          }
        }
      });
    },
    init() {
      document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.sui-navbar-toggle, [data-sui-navbar-toggle]');
        if (toggleBtn) {
          e.preventDefault();
          this.toggle(toggleBtn);
          return;
        }

        // Legacy landing-page mobile drawer compatibility
        if (e.target.closest('#mobileMenuBtn')) {
          const drawer = document.getElementById('mobileDrawer');
          if (drawer) drawer.classList.add('is-open');
          return;
        }
        if (e.target.closest('.js-drawer-close')) {
          const drawer = document.getElementById('mobileDrawer');
          if (drawer) drawer.classList.remove('is-open');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeAll(true);
          const drawer = document.getElementById('mobileDrawer');
          if (drawer) drawer.classList.remove('is-open');
        }
      });
    }
  };

  /* ==========================================================================
     6. DROPDOWN ENGINE (Multi-instance, Outside-click, Escape, ARIA)
     ========================================================================== */
  const Dropdown = {
    open(target, trigger = null) {
      const dd = typeof target === 'string' ? document.getElementById(target) : target;
      if (!dd) return false;
      dd.classList.add('is-open');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      return true;
    },
    close(target = null) {
      if (target) {
        const dd = typeof target === 'string' ? document.getElementById(target) : target;
        if (dd) {
          dd.classList.remove('is-open');
          const trigger = document.querySelector(`[data-sui-dropdown-trigger="${dd.id}"]`);
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }
        return;
      }
      document.querySelectorAll('.sui-dropdown.is-open').forEach((dd) => this.close(dd));
    },
    toggle(target, trigger = null) {
      const dd = typeof target === 'string' ? document.getElementById(target) : target;
      if (!dd) return false;
      if (dd.classList.contains('is-open')) {
        this.close(dd);
        return false;
      }
      this.open(dd, trigger);
      return true;
    },
    init() {
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-sui-dropdown-trigger]');
        const targetId = trigger ? trigger.getAttribute('data-sui-dropdown-trigger') : null;

        document.querySelectorAll('.sui-dropdown.is-open').forEach((dd) => {
          if (!dd.contains(e.target) && (!targetId || targetId !== dd.id)) {
            this.close(dd);
          }
        });

        if (trigger && targetId) {
          e.preventDefault();
          this.toggle(targetId, trigger);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.close();
      });
    }
  };

  /* ==========================================================================
     7. ACCORDION & COLLAPSIBLE SYSTEM
     ========================================================================== */
  const Accordion = {
    init() {
      document.addEventListener('click', (e) => {
        const header = e.target.closest('.sui-accordion-header, [data-sui-accordion-trigger]');
        if (!header) return;

        const accordionItem = header.closest('.sui-accordion-item');
        const parentAccordion = header.closest('.sui-accordion');
        const content = accordionItem
          ? accordionItem.querySelector('.sui-accordion-content, .sui-accordion-body')
          : null;
        if (!accordionItem || !content) return;

        const isOpen = accordionItem.classList.contains('is-open');

        if (parentAccordion && !parentAccordion.hasAttribute('data-sui-multi')) {
          parentAccordion.querySelectorAll('.sui-accordion-item.is-open').forEach((item) => {
            if (item !== accordionItem) {
              item.classList.remove('is-open');
              const h = item.querySelector('.sui-accordion-header, [data-sui-accordion-trigger]');
              if (h) h.setAttribute('aria-expanded', 'false');
              const c = item.querySelector('.sui-accordion-content, .sui-accordion-body');
              if (c) c.style.maxHeight = null;
            }
          });
        }

        if (isOpen) {
          accordionItem.classList.remove('is-open');
          header.setAttribute('aria-expanded', 'false');
          content.style.maxHeight = null;
        } else {
          accordionItem.classList.add('is-open');
          header.setAttribute('aria-expanded', 'true');
          content.style.maxHeight = `${content.scrollHeight}px`;
        }
      });
    }
  };

  /* ==========================================================================
     8. TAB SWITCHER & SLIDING INDICATOR
     ========================================================================== */
  const TabEngine = {
    _updateIndicator(tabList, activeBtn) {
      if (!tabList || !activeBtn) return;
      tabList.style.setProperty('--sui-tab-left', `${activeBtn.offsetLeft}px`);
      tabList.style.setProperty('--sui-tab-width', `${activeBtn.offsetWidth}px`);
    },
    init() {
      document.querySelectorAll('.sui-tabs').forEach((tabList) => {
        const active = tabList.querySelector(
          '.sui-tab.active, .sui-tab.sui-tab-active, .sui-tab[aria-selected="true"]'
        );
        if (active) this._updateIndicator(tabList, active);
      });

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn, .sui-tab');
        if (!btn) return;

        const container = btn.closest(
          '.sui-tabs, .showcase-block, .sui-tabs-container, .showcase-tabs, .sui-card'
        );
        if (!container) return;

        container.querySelectorAll('.tab-btn, .sui-tab').forEach((b) => {
          b.classList.remove('active', 'sui-tab-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active', 'sui-tab-active');
        btn.setAttribute('aria-selected', 'true');

        if (container.classList.contains('sui-tabs')) {
          this._updateIndicator(container, btn);
        }

        const targetId = btn.getAttribute('data-target') || btn.getAttribute('aria-controls');
        if (targetId) {
          const parentContext = container.parentElement || document;
          parentContext.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
          const targetPanel = document.getElementById(targetId);
          if (targetPanel) targetPanel.classList.add('active');
        }
      });
    }
  };

  /* ==========================================================================
     9. FORM UTILITIES (OTP Auto-Advance, Password Toggle, Auto-Resize)
     ========================================================================== */
  const FormUtilities = {
    init() {
      document.querySelectorAll('.sui-otp-group').forEach((group) => {
        const inputs = Array.from(group.querySelectorAll('input'));
        inputs.forEach((input, index) => {
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
              inputs[index - 1].focus();
              inputs[index - 1].value = '';
            }
          });
          input.addEventListener('input', () => {
            if (input.value.length === 1 && index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
          });
          input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (!pasteData) return;
            pasteData
              .replace(/\D/g, '')
              .split('')
              .forEach((digit, i) => {
                if (inputs[i]) {
                  inputs[i].value = digit;
                  if (inputs[i + 1]) inputs[i + 1].focus();
                }
              });
          });
        });
      });

      document.addEventListener('click', (e) => {
        const eyeBtn = e.target.closest('[data-sui-toggle-password]');
        if (!eyeBtn) return;
        const targetInput = eyeBtn.parentElement && eyeBtn.parentElement.querySelector('input');
        if (!targetInput) return;

        const revealing = targetInput.type === 'password';
        targetInput.type = revealing ? 'text' : 'password';
        eyeBtn.classList.toggle('is-visible', revealing);
        eyeBtn.setAttribute('aria-pressed', String(revealing));
      });

      document.querySelectorAll('textarea.sui-auto-resize').forEach((textarea) => {
        textarea.addEventListener('input', () => {
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
        });
      });
    }
  };

  /* ==========================================================================
     10. HARDWARE-ACCELERATED RIPPLE (Respects prefers-reduced-motion)
     ========================================================================== */
  const Ripple = {
    init() {
      document.addEventListener('pointerdown', (e) => {
        if (Utils.prefersReducedMotion()) return;
        const target = e.target.closest('.sui-btn, .sui-ripple');
        if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;

        const rect = target.getBoundingClientRect();
        const circle = document.createElement('span');
        const diameter = Math.max(rect.width, rect.height);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.className = 'sui-ripple-wave';
        circle.style.position = 'absolute';
        circle.style.borderRadius = '50%';
        circle.style.transform = 'scale(0)';
        circle.style.animation = 'sui-ripple-anim 0.6s linear';
        circle.style.backgroundColor = 'oklch(100% 0 0 / 0.3)';
        circle.style.pointerEvents = 'none';

        if (getComputedStyle(target).position === 'static') {
          target.style.position = 'relative';
        }
        target.style.overflow = 'hidden';

        const existing = target.querySelector('.sui-ripple-wave');
        if (existing) existing.remove();

        target.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
      });
    }
  };

  /* ==========================================================================
     11. CLIPBOARD ONE-CLICK COPY ENGINE
     ========================================================================== */
  const Clipboard = {
    async text(str) {
      if (!navigator.clipboard) return false;
      await navigator.clipboard.writeText(String(str).trim());
      return true;
    },
    async element(selector) {
      const el = document.querySelector(selector);
      if (!el) return false;
      return this.text(el.value || el.textContent || '');
    },
    init() {
      document.addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('[data-sui-copy], .btn-copy-code, .sui-copy-btn');
        if (!copyBtn) return;

        let textToCopy = copyBtn.getAttribute('data-sui-copy');
        if (!textToCopy) {
          const container = copyBtn.closest('.code-reveal-panel, .u-card, .demo-section, article');
          const codeEl = container ? container.querySelector('code, pre') : null;
          if (codeEl) textToCopy = codeEl.textContent;
        }
        if (!textToCopy) return;

        try {
          await this.text(textToCopy);
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '✓ Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('[Sui.css] Clipboard copy failed:', err);
        }
      });
    }
  };

  /* ==========================================================================
     12. SCROLL REVEAL & NATIVE SYNTAX HIGHLIGHTER
     ========================================================================== */
  const ScrollEngine = {
    init() {
      if (!('IntersectionObserver' in window)) {
        document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
          el.classList.add('is-visible');
        });
        return;
      }

      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              entry.target.style.animationPlayState = 'running';
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: SUI_CONFIG.animationThreshold, rootMargin: '0px 0px -40px 0px' }
      );

      document
        .querySelectorAll('.reveal-on-scroll, [class*="sui-animate-"]:not(.sui-floating-nav)')
        .forEach((el) => {
          if (!el.classList.contains('is-visible')) {
            if (!el.classList.contains('reveal-on-scroll')) {
              el.style.animationPlayState = 'paused';
            }
            observer.observe(el);
          }
        });
    }
  };

  const SyntaxHighlighter = {
    highlightAll() {
      document.querySelectorAll('pre code:not(.sui-highlighted)').forEach((block) => {
        let code = block.innerHTML;
        const isHTML = code.includes('&lt;') || code.includes('<');

        if (!isHTML) {
          code = code
            .replace(/(\/\*[\s\S]*?\*\/)/g, '§COMMENT§$1§END§')
            .replace(/([a-zA-Z0-9\-\.\:]+)(?=\s*\{)/g, '§SELECTOR§$1§END§')
            .replace(/(--[a-zA-Z0-9\-]+|[a-zA-Z\-]+)(?=\s*:)/g, '§PROP§$1§END§')
            .replace(/(oklch|clamp|var|calc)(?=\()/g, '§FUNC§$1§END§')
            .replace(/(:?\s*)([0-9\.]+[a-zA-Z%]*|#[0-9a-fA-F]+)(?=[;\s}])/g, '$1§VAL§$2§END§');
        } else {
          code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          code = code
            .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '§COMMENT§$1§END§')
            .replace(/("[^"]*")/g, '§VALUE§$1§END§')
            .replace(/(&lt;\/?)([a-zA-Z0-9\-]+)/g, '$1§TAG§$2§END§')
            .replace(/([a-zA-Z\-]+)(?=\=)/g, '§ATTR§$1§END§')
            .replace(/(&lt;|&gt;)/g, '§PUNC§$1§END§');
        }

        block.innerHTML = code
          .replace(/§COMMENT§/g, '<span class="token comment">')
          .replace(/§VALUE§/g, '<span class="token attr-value">')
          .replace(/§TAG§/g, '<span class="token tag">')
          .replace(/§ATTR§/g, '<span class="token attr-name">')
          .replace(/§PUNC§/g, '<span class="token punctuation">')
          .replace(/§SELECTOR§/g, '<span class="token selector">')
          .replace(/§PROP§/g, '<span class="token property">')
          .replace(/§FUNC§/g, '<span class="token function">')
          .replace(/§VAL§/g, '<span class="token value">')
          .replace(/§END§/g, '</span>');

        block.classList.add('sui-highlighted');
      });
    }
  };

  /* ==========================================================================
     LIFECYCLE INITIALIZATION
     ========================================================================== */
  function initialize() {
    if (initialized) return;
    initialized = true;

    ThemeEngine.init();
    Modal.init();
    Navbar.init();
    Dropdown.init();
    Accordion.init();
    TabEngine.init();
    FormUtilities.init();
    Ripple.init();
    Clipboard.init();
    ScrollEngine.init();
    SyntaxHighlighter.highlightAll();

    document.addEventListener('click', (e) => {
      const replayBtn = e.target.closest('.btn-replay');
      if (!replayBtn) return;
      const card = replayBtn.closest('.sui-card, .u-card, article');
      const target = card ? card.querySelector('.js-anim-target') : null;
      if (!target) return;
      const animClass = target.getAttribute('data-anim');
      if (animClass) {
        target.classList.remove(animClass);
        Utils.triggerReflow(target);
        target.classList.add(animClass);
      }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  }

  return {
    version: '3.0.0',
    init: initialize,
    theme: ThemeEngine,
    modal: Modal,
    navbar: Navbar,
    dropdown: Dropdown,
    accordion: Accordion,
    tabs: TabEngine,
    toast: Toast,
    clipboard: Clipboard,
    copy: Clipboard,
    highlight: SyntaxHighlighter.highlightAll
  };
});
