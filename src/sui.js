/**
 * Sui.css - Ultra Pro Max Interactive Engine v2.0
 * Architecture: Zero-Dependency Pure Vanilla JavaScript
 * Author: Suman M. (Sui.css Core Team)
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.SUI = factory());
})(this, (function () {
  'use strict';

  /* ==========================================================================
     GLOBAL CONFIGURATION & REGISTRY
     ========================================================================== */
  const SUI_CONFIG = {
    themeKey: 'sui-theme',
    toastContainerId: 'sui-toast-container',
    scrollOffset: 80,
    animationThreshold: 0.15
  };

  /* ==========================================================================
     1. UTILITY HELPER METHODS
     ========================================================================== */
  const Utils = {
    isTouchDevice() {
      return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    },
    escapeHTML(str) {
      return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
      );
    },
    createElement(tag, classes = [], attributes = {}) {
      const el = document.createElement(tag);
      if (Array.isArray(classes)) classes.forEach(c => c && el.classList.add(c));
      else if (typeof classes === 'string') el.className = classes;
      for (const [key, val] of Object.entries(attributes)) {
        el.setAttribute(key, val);
      }
      return el;
    },
    triggerReflow(element) {
      void element.offsetWidth;
    }
  };

  /* ==========================================================================
     2. THEME ENGINE (OKLCH Reactive Engine)
     ========================================================================== */
  const ThemeEngine = {
    init() {
      const stored = localStorage.getItem(SUI_CONFIG.themeKey);
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = stored || (systemPrefersDark ? 'dark' : 'light');
      
      this.set(initialTheme, false);

      // System Preference Listener
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(SUI_CONFIG.themeKey)) {
          this.set(e.matches ? 'dark' : 'light', false);
        }
      });

      // Bind all toggle buttons
      document.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.sui-theme-toggle');
        if (toggleBtn) {
          e.preventDefault();
          this.toggle();
        }
      });
    },
    get() {
      return document.documentElement.getAttribute('data-theme') || 'light';
    },
    set(theme, store = true) {
      document.documentElement.setAttribute('data-theme', theme);
      if (store) localStorage.setItem(SUI_CONFIG.themeKey, theme);
      
      // Dispatch reactive event
      window.dispatchEvent(new CustomEvent('sui:theme-change', { detail: { theme } }));
    },
    toggle() {
      const current = this.get();
      const next = current === 'dark' ? 'light' : 'dark';
      this.set(next, true);
    }
  };

  /* ==========================================================================
     3. TOAST NOTIFICATION ENGINE
     ========================================================================== */
  const Toast = {
    getContainer() {
      let container = document.getElementById(SUI_CONFIG.toastContainerId);
      if (!container) {
        container = Utils.createElement('div', ['sui-toast-container'], {
          id: SUI_CONFIG.toastContainerId,
          style: 'position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.75rem; max-width: 420px; width: calc(100% - 3rem); pointer-events: none;'
        });
        document.body.appendChild(container);
      }
      return container;
    },
    show({ title = '', message = '', type = 'info', duration = 4000, dismissible = true }) {
      const container = this.getContainer();
      const toast = Utils.createElement('div', ['sui-toast', 'sui-animate-spring-up'], {
        style: 'pointer-events: auto; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;'
      });

      if (type === 'success') toast.style.borderLeftColor = 'var(--sui-color-success-500)';
      if (type === 'danger') toast.style.borderLeftColor = 'var(--sui-color-danger-500)';
      if (type === 'warning') toast.style.borderLeftColor = 'var(--sui-color-warning-500)';

      const content = document.createElement('div');
      if (title) {
        const strong = Utils.createElement('strong', ['sui-block', 'sui-text-sm'], { style: 'margin-bottom: 0.25rem;' });
        strong.textContent = title;
        content.appendChild(strong);
      }
      if (message) {
        const text = Utils.createElement('p', ['sui-text-xs', 'sui-text-muted'], { style: 'margin: 0;' });
        text.textContent = message;
        content.appendChild(text);
      }
      toast.appendChild(content);

      if (dismissible) {
        const closeBtn = Utils.createElement('button', ['sui-btn-icon'], {
          style: 'background: transparent; border: none; cursor: pointer; color: var(--sui-text-muted); padding: 0.25rem;'
        });
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.dismiss(toast));
        toast.appendChild(closeBtn);
      }

      container.appendChild(toast);

      if (duration > 0) {
        let timer = setTimeout(() => this.dismiss(toast), duration);
        // Pause timeout on mouse hover
        toast.addEventListener('mouseenter', () => clearTimeout(timer));
        toast.addEventListener('mouseleave', () => {
          timer = setTimeout(() => this.dismiss(toast), duration / 2);
        });
      }

      return toast;
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
     4. MODAL & DIALOG ENGINE
     ========================================================================== */
  const Modal = {
    open(targetId) {
      const modal = document.getElementById(targetId);
      if (!modal) return;
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
      
      // Auto-focus first input or button
      const focusable = modal.querySelector('input, button:not([data-sui-modal-close])');
      if (focusable) focusable.focus();

      window.dispatchEvent(new CustomEvent('sui:modal-open', { detail: { id: targetId } }));
    },
    close(modalElement) {
      if (!modalElement) return;
      modalElement.classList.remove('active');
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('sui:modal-close', { detail: { element: modalElement } }));
    },
    closeAll() {
      document.querySelectorAll('.sui-dialog-overlay.active').forEach(m => this.close(m));
    },
    init() {
      // Trigger buttons
      document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('[data-sui-modal-target]');
        if (openBtn) {
          e.preventDefault();
          const targetId = openBtn.getAttribute('data-sui-modal-target');
          this.open(targetId);
        }

        const closeBtn = e.target.closest('[data-sui-modal-close]');
        if (closeBtn) {
          e.preventDefault();
          const modal = closeBtn.closest('.sui-dialog-overlay');
          this.close(modal);
        }

        // Close on backdrop overlay click
        if (e.target.classList.contains('sui-dialog-overlay')) {
          this.close(e.target);
        }
      });

      // ESC Key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeAll();
      });
    }
  };

  /* ==========================================================================
     5. HARDWARE ACCELERATED RIPPLE EFFECT
     ========================================================================== */
  const Ripple = {
    init() {
      document.addEventListener('pointerdown', (e) => {
        const target = e.target.closest('.sui-btn, .sui-ripple');
        if (!target) return;

        const rect = target.getBoundingClientRect();
        const circle = document.createElement('span');
        const diameter = Math.max(rect.width, rect.height);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${e.clientX - rect.left - radius}px`;
        circle.style.top = `${e.clientY - rect.top - radius}px`;
        circle.classList.add('sui-ripple-wave');

        // Style ripple dynamically
        circle.style.position = 'absolute';
        circle.style.borderRadius = '50%';
        circle.style.transform = 'scale(0)';
        circle.style.animation = 'sui-ripple-anim 0.6s linear';
        circle.style.backgroundColor = 'oklch(100% 0 0 / 0.3)';
        circle.style.pointerEvents = 'none';

        target.style.position = target.style.position === 'relative' ? target.style.position : 'relative';
        target.style.overflow = 'hidden';

        // Remove old ripples
        const existing = target.querySelector('.sui-ripple-wave');
        if (existing) existing.remove();

        target.appendChild(circle);
        setTimeout(() => circle.remove(), 600);
      });
    }
  };

  /* ==========================================================================
     6. ACCORDION & COLLAPSIBLE SYSTEM
     ========================================================================== */
  const Accordion = {
    init() {
      document.addEventListener('click', (e) => {
        const header = e.target.closest('.sui-accordion-header, [data-sui-accordion-trigger]');
        if (!header) return;

        const accordionItem = header.closest('.sui-accordion-item');
        const parentAccordion = header.closest('.sui-accordion');
        const content = accordionItem ? accordionItem.querySelector('.sui-accordion-content') : null;
        
        if (!accordionItem || !content) return;

        const isCurrentlyOpen = accordionItem.classList.contains('is-open');

        // Close siblings if parent doesn't allow multi-open
        if (parentAccordion && !parentAccordion.hasAttribute('data-sui-multi')) {
          parentAccordion.querySelectorAll('.sui-accordion-item.is-open').forEach(item => {
            if (item !== accordionItem) {
              item.classList.remove('is-open');
              const c = item.querySelector('.sui-accordion-content');
              if (c) c.style.maxHeight = null;
            }
          });
        }

        // Toggle state
        if (isCurrentlyOpen) {
          accordionItem.classList.remove('is-open');
          content.style.maxHeight = null;
        } else {
          accordionItem.classList.add('is-open');
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      });
    }
  };

  /* ==========================================================================
     7. FORM UTILITIES (OTP Auto-Advance, Password Revealer & Auto-Resize)
     ========================================================================== */
  const FormUtilities = {
    init() {
      // OTP 6-Digit Auto-Focusing & Backspacing
      document.querySelectorAll('.sui-otp-group').forEach(group => {
        const inputs = Array.from(group.querySelectorAll('input'));
        
        inputs.forEach((input, index) => {
          // Keydown handler
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
              inputs[index - 1].focus();
              inputs[index - 1].value = '';
            }
          });

          // Input handler
          input.addEventListener('input', (e) => {
            const val = input.value;
            if (val.length === 1 && index < inputs.length - 1) {
              inputs[index + 1].focus();
            }
          });

          // Paste listener
          input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (!pasteData) return;

            const digits = pasteData.replace(/\D/g, '').split('');
            digits.forEach((digit, i) => {
              if (inputs[i]) {
                inputs[i].value = digit;
                if (inputs[i + 1]) inputs[i + 1].focus();
              }
            });
          });
        });
      });

      // Password Eye Revealer
      document.addEventListener('click', (e) => {
        const eyeBtn = e.target.closest('[data-sui-toggle-password]');
        if (!eyeBtn) return;
        const targetInput = eyeBtn.parentElement.querySelector('input');
        if (!targetInput) return;

        if (targetInput.type === 'password') {
          targetInput.type = 'text';
          eyeBtn.classList.add('is-visible');
        } else {
          targetInput.type = 'password';
          eyeBtn.classList.remove('is-visible');
        }
      });

      // Auto-resizing Textareas
      document.querySelectorAll('textarea.sui-auto-resize').forEach(textarea => {
        textarea.addEventListener('input', () => {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        });
      });
    }
  };

  /* ==========================================================================
     8. CLIPBOARD ONE-CLICK COPY ENGINE
     ========================================================================== */
  const Clipboard = {
    init() {
      document.addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('[data-sui-copy], .btn-copy-code');
        if (!copyBtn) return;

        let textToCopy = copyBtn.getAttribute('data-sui-copy');
        
        // If no explicit attribute, attempt to copy sibling code block
        if (!textToCopy) {
          const container = copyBtn.closest('.code-reveal-panel, .u-card, .demo-section, article');
          const codeEl = container ? container.querySelector('code, pre') : null;
          if (codeEl) textToCopy = codeEl.textContent;
        }

        if (!textToCopy) return;

        try {
          await navigator.clipboard.writeText(textToCopy.trim());
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
     9. SCROLL ANIMATION & INTERSECTION OBSERVER
     ========================================================================== */
  const ScrollEngine = {
    init() {
      if (!('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            entry.target.style.animationPlayState = 'running';
            obs.unobserve(entry.target);
          }
        });
      }, {
        threshold: SUI_CONFIG.animationThreshold,
        rootMargin: '0px 0px -40px 0px'
      });

      document.querySelectorAll('.reveal-on-scroll, [class*="sui-animate-"]:not(.sui-floating-nav)').forEach(el => {
        // Only pause if not already triggered
        if (!el.classList.contains('is-visible')) {
          el.style.animationPlayState = 'paused';
          observer.observe(el);
        }
      });
    }
  };

  /* ==========================================================================
     10. TAB SWITCHER & SHOWCASE LOGIC
     ========================================================================== */
  const TabEngine = {
    init() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn, .sui-tab');
        if (!btn) return;

        const container = btn.closest('.showcase-block, .sui-tabs-container, .showcase-tabs, .sui-card');
        if (!container) return;

        const targetId = btn.getAttribute('data-target');
        
        // Remove active states within scope
        container.querySelectorAll('.tab-btn, .sui-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (targetId) {
          const parentContext = container.parentElement || document;
          parentContext.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
          const targetPanel = document.getElementById(targetId);
          if (targetPanel) targetPanel.classList.add('active');
        }
      });
    }
  };

  /* ==========================================================================
     11. DROPDOWNS & TOOLTIPS (FLOATING ENGINE)
     ========================================================================== */
  const FloatingEngine = {
    init() {
      // Dropdown Click Handlers
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-sui-dropdown-trigger]');
        const activeDropdowns = document.querySelectorAll('.sui-dropdown.is-open');

        // Close opened dropdowns if clicked outside
        activeDropdowns.forEach(dd => {
          if (!dd.contains(e.target) && (!trigger || trigger.getAttribute('data-sui-dropdown-trigger') !== dd.id)) {
            dd.classList.remove('is-open');
          }
        });

        if (trigger) {
          e.preventDefault();
          const targetId = trigger.getAttribute('data-sui-dropdown-trigger');
          const dropdown = document.getElementById(targetId);
          if (dropdown) dropdown.classList.toggle('is-open');
        }
      });
    }
  };

  /* ==========================================================================
     12. SUI NATIVE SYNTAX HIGHLIGHTER (Zero Dependency Tokenizer)
     ========================================================================== */
  const SyntaxHighlighter = {
    highlightAll() {
      document.querySelectorAll('pre code:not(.sui-highlighted)').forEach(block => {
        let code = block.innerHTML;
        const isHTML = code.includes('&lt;') || code.includes('<');

        if (!isHTML) {
          // CSS Highlighter
          code = code
            .replace(/(\/\*[\s\S]*?\*\/)/g, '§COMMENT§$1§END§')
            .replace(/([a-zA-Z0-9\-\.\:]+)(?=\s*\{)/g, '§SELECTOR§$1§END§')
            .replace(/(--[a-zA-Z0-9\-]+|[a-zA-Z\-]+)(?=\s*:)/g, '§PROP§$1§END§')
            .replace(/(oklch|clamp|var|calc)(?=\()/g, '§FUNC§$1§END§')
            .replace(/(:?\s*)([0-9\.]+[a-zA-Z%]*|#[0-9a-fA-F]+)(?=[;\s}])/g, '$1§VAL§$2§END§');
        } else {
          // HTML Highlighter
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
     GLOBAL INITIALIZATION LIFECYCLE
     ========================================================================== */
  function initialize() {
    ThemeEngine.init();
    Modal.init();
    Ripple.init();
    Accordion.init();
    FormUtilities.init();
    Clipboard.init();
    ScrollEngine.init();
    TabEngine.init();
    FloatingEngine.init();
    SyntaxHighlighter.highlightAll();

    // Replay Buttons Engine (Found on animations documentation page)
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

    console.log('%c🚀 Sui.css Engine initialized with Ultra Pro Max capabilities.', 'color: #3b82f6; font-weight: bold;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  /* ==========================================================================
     EXPORT PUBLIC GLOBAL API (window.SUI)
     ========================================================================== */
  return {
    version: '2.0.0',
    theme: ThemeEngine,
    modal: Modal,
    toast: Toast,
    clipboard: Clipboard,
    highlight: SyntaxHighlighter.highlightAll
  };

}));