/**
 * SUI.css - Interactive Runtime Engine v3.0.0
 * Architecture: Zero-Dependency Pure Vanilla JavaScript (Unified UMD)
 * Supports: <script defer>, plain <script>, CommonJS, AMD, and dynamic HTML fragments
 * Author: Suman M. (Sui.css Core Team)
 */

(function (global, factory) {
  const api = factory();
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = api;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return api;
    });
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
  let globalController = null;
  let domObserver = null;
  const activeObservers = new Set();
  const activeTimers = new Set();
  const activeIntervals = new Set();

  /* ==========================================================================
     1. UTILITIES, TIMERS & SHARED SCROLL LOCK
     ========================================================================== */
  const Utils = {
    prefersReducedMotion() {
      return (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    },
    isTouchDevice() {
      return (
        (typeof window !== 'undefined' && 'ontouchstart' in window) ||
        (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0)
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
    },
    emit(name, detail = {}, target = window) {
      if (!target || typeof target.dispatchEvent !== 'function') return;
      target.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    },
    emitCancelable(name, detail = {}, target = window) {
      if (!target || typeof target.dispatchEvent !== 'function') return true;
      const ev = new CustomEvent(name, { detail, bubbles: true, cancelable: true });
      return target.dispatchEvent(ev);
    },
    setTimer(fn, ms) {
      const id = setTimeout(() => {
        activeTimers.delete(id);
        fn();
      }, ms);
      activeTimers.add(id);
      return id;
    },
    clearTimer(id) {
      if (id != null) {
        clearTimeout(id);
        activeTimers.delete(id);
      }
    },
    listen(target, event, handler, options) {
      if (!target || typeof target.addEventListener !== 'function') return;
      const opts =
        typeof options === 'boolean'
          ? { capture: options }
          : { ...(options || {}) };
      if (globalController && typeof AbortController !== 'undefined') {
        opts.signal = globalController.signal;
      }
      target.addEventListener(event, handler, opts);
    },
    closestTarget(e, selector) {
      return e && e.target && typeof e.target.closest === 'function'
        ? e.target.closest(selector)
        : null;
    }
  };

  /* Shared reference-counted ScrollLock across Modal, Offcanvas, and Command */
  const ScrollLock = {
    _count: 0,
    lock() {
      this._count += 1;
      document.body.style.overflow = 'hidden';
    },
    unlock() {
      this._count = Math.max(0, this._count - 1);
      if (this._count === 0) {
        document.body.style.overflow = '';
      }
    },
    reset() {
      this._count = 0;
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = '';
      }
    }
  };

  /* Smart Viewport Edge-Flip Positioner for Dropdowns & Popovers */
  const Positioner = {
    reset(panel) {
      if (!panel) return;
      panel.classList.remove('sui-flip-top', 'sui-flip-end');
    },
    adjust(panel) {
      if (!panel || typeof panel.getBoundingClientRect !== 'function') return;
      this.reset(panel);
      const rect = panel.getBoundingClientRect();
      const vw = (typeof window !== 'undefined' && window.innerWidth) || 1024;
      const vh = (typeof window !== 'undefined' && window.innerHeight) || 768;
      if (rect.bottom > vh - 8 && rect.top > rect.height) {
        panel.classList.add('sui-flip-top');
      }
      if (rect.right > vw - 8 && rect.left > rect.width * 0.5) {
        panel.classList.add('sui-flip-end');
      }
    }
  };

  /* Instance Registry Factory (Bootstrap-style getOrCreateInstance + options) */
  function createInstanceRegistry(api) {
    const instances = new WeakMap();
    return function getOrCreateInstance(target, options = {}) {
      const el = typeof target === 'string' ? document.getElementById(target) : target;
      if (!el) return null;
      if (instances.has(el)) {
        const existing = instances.get(el);
        Object.assign(existing.options, options);
        return existing;
      }
      const inst = {
        element: el,
        options: { ...options },
        open: (trig) => api.open(el, trig),
        close: () => api.close(el),
        toggle: (trig) => api.toggle(el, trig),
        dispose: () => {
          api.close(el);
          instances.delete(el);
        }
      };
      if (options.backdrop === 'static') el.setAttribute('data-sui-backdrop', 'static');
      if (options.keyboard === false) el.setAttribute('data-sui-keyboard', 'false');
      instances.set(el, inst);
      return inst;
    };
  }

  /* ==========================================================================
     2. THEME ENGINE (light | dark | oled | auto/system)
     ========================================================================== */
  const ThemeEngine = {
    _mode: 'light',
    _mql: null,
    _resolveEffective(mode) {
      if (mode === 'auto' || mode === 'system') {
        const prefersDark = Boolean(this._mql && this._mql.matches);
        return prefersDark ? 'dark' : 'light';
      }
      return mode || 'light';
    },
    init() {
      let stored = null;
      try {
        stored = localStorage.getItem(SUI_CONFIG.themeKey);
      } catch (_) {
        /* ignore storage restrictions */
      }

      const declared =
        document.documentElement.getAttribute('data-theme') ||
        document.documentElement.getAttribute('data-sui-theme');
      const hasToggleControl = Boolean(
        document.querySelector('.sui-theme-toggle, [data-sui-theme-toggle], [data-sui-theme-set]')
      );
      this._mql =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-color-scheme: dark)')
          : null;

      // Respect explicit HTML data-theme on pages without a theme switcher so stale localStorage
      // from another local page never hijacks <html data-theme="light|oled|dark|auto">
      const initialMode = (hasToggleControl && stored) ? stored : (declared || 'light');
      this.set(initialMode, false);

      if (this._mql && typeof this._mql.addEventListener === 'function') {
        Utils.listen(this._mql, 'change', () => {
          if (this._mode === 'auto' || this._mode === 'system') {
            const effective = this._resolveEffective('auto');
            document.documentElement.setAttribute('data-theme', effective);
            Utils.emit('sui:theme-change', { theme: effective, mode: 'auto' });
          }
        });
      }

      Utils.listen(document, 'click', (e) => {
        const toggleBtn = Utils.closestTarget(e, '.sui-theme-toggle, [data-sui-theme-toggle]');
        if (toggleBtn) {
          e.preventDefault();
          const explicitMode = toggleBtn.getAttribute('data-sui-theme-set');
          if (explicitMode) this.set(explicitMode, true);
          else this.toggle();
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
    getMode() {
      return this._mode;
    },
    set(mode, store = true) {
      const normalized = mode === 'system' ? 'auto' : mode || 'light';
      this._mode = normalized;
      const effective = this._resolveEffective(normalized);
      document.documentElement.setAttribute('data-theme', effective);
      document.documentElement.removeAttribute('data-sui-theme');
      if (store) {
        try {
          localStorage.setItem(SUI_CONFIG.themeKey, normalized);
        } catch (_) {
          /* ignore */
        }
      }
      Utils.emit('sui:theme-change', { theme: effective, mode: normalized });
      return effective;
    },
    toggle() {
      const current = this.get();
      const next = current === 'dark' || current === 'oled' ? 'light' : 'dark';
      this.set(next, true);
      return next;
    }
  };

  /* ==========================================================================
     3. TOAST NOTIFICATION ENGINE (Hover + Focus Pause, Clean Timer Cleanup)
     ========================================================================== */
  const Toast = {
    _position: 'bottom-right',
    _timers: new Map(),
    setPosition(pos = 'bottom-right') {
      this._position = pos;
      const container = document.getElementById(SUI_CONFIG.toastContainerId);
      if (container) {
        container.classList.remove(
          'sui-toast-top-right',
          'sui-toast-top-left',
          'sui-toast-top-center',
          'sui-toast-bottom-left'
        );
        if (pos !== 'bottom-right') container.classList.add(`sui-toast-${pos}`);
      }
    },
    getContainer() {
      let container = document.getElementById(SUI_CONFIG.toastContainerId);
      if (!container) {
        const classes = ['sui-toast-container'];
        if (this._position && this._position !== 'bottom-right') {
          classes.push(`sui-toast-${this._position}`);
        }
        container = Utils.createElement('div', classes, {
          id: SUI_CONFIG.toastContainerId,
          role: 'status',
          'aria-live': 'polite'
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
          role: normalizedType === 'danger' ? 'alert' : 'status',
          'aria-live': normalizedType === 'danger' ? 'assertive' : 'polite',
          tabindex: '0'
        }
      );

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
            'background: transparent; border: none; cursor: pointer; color: var(--sui-text-muted); padding: 0.25rem; margin-left: auto;'
        });
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', () => this.dismiss(toast));
        toast.appendChild(closeBtn);
      }

      container.appendChild(toast);

      if (duration > 0) {
        let remaining = duration;
        let startedAt = Date.now();
        const schedule = (ms) => {
          this._clearToastTimer(toast);
          startedAt = Date.now();
          const id = Utils.setTimer(() => this.dismiss(toast), ms);
          this._timers.set(toast, id);
        };
        const pause = () => {
          this._clearToastTimer(toast);
          remaining = Math.max(800, remaining - (Date.now() - startedAt));
        };
        const resume = () => {
          if (toast.parentNode) schedule(remaining);
        };

        schedule(duration);
        toast.addEventListener('mouseenter', pause);
        toast.addEventListener('mouseleave', resume);
        toast.addEventListener('focusin', pause);
        toast.addEventListener('focusout', resume);
      }

      Utils.emit('sui:toast-show', { element: toast, type: normalizedType, title, message });
      return toast;
    },
    _clearToastTimer(toast) {
      const id = this._timers.get(toast);
      if (id != null) {
        Utils.clearTimer(id);
        this._timers.delete(toast);
      }
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
      if (!toast) return false;
      this._clearToastTimer(toast);
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      Utils.setTimer(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
      Utils.emit('sui:toast-dismiss', { element: toast });
      return true;
    },
    dismissAll() {
      const container = document.getElementById(SUI_CONFIG.toastContainerId);
      if (!container) return;
      Array.from(container.querySelectorAll('.sui-toast')).forEach((t) => this.dismiss(t));
    }
  };

  /* ==========================================================================
     4. MODAL & DIALOG ENGINE (Reference Component)
     Multi-instance, Tab Focus Trap, Escape, Focus Restore, DOM-Removal Safe
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

      const existingIdx = this._stack.findIndex((entry) => entry.modal === modal);
      if (existingIdx !== -1) {
        // Already open: bring to top without double-locking scroll
        const entry = this._stack.splice(existingIdx, 1)[0];
        this._stack.push(entry);
        return true;
      }

      if (!Utils.emitCancelable('sui:modal-before-open', { id: modal.id, element: modal })) return false;
      const returnFocusTo = triggerElement || document.activeElement;
      this._stack.push({ modal, returnFocusTo });

      if (this._isLegacyDialog(modal)) {
        modal.classList.add('active');
      } else {
        modal.classList.add('is-open', 'active');
      }
      modal.setAttribute('aria-hidden', 'false');
      ScrollLock.lock();
      Utils.triggerReflow(modal);

      const focusable =
        modal.querySelector(
          '[autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-sui-modal-close]):not(.sui-modal-close), [tabindex]:not([tabindex="-1"])'
        ) || modal.querySelector('button:not([disabled])');
      if (focusable && typeof focusable.focus === 'function') {
        focusable.focus();
      }

      Utils.emit('sui:modal-open', { id: modal.id, element: modal });
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

      const idx = this._stack.findIndex((entry) => entry.modal === modal);
      const wasOpen = idx !== -1 || modal.classList.contains('is-open') || modal.classList.contains('active');
      if (!wasOpen) return false;
      if (!Utils.emitCancelable('sui:modal-before-close', { id: modal.id, element: modal })) return false;

      modal.classList.remove('is-open', 'active');
      modal.setAttribute('aria-hidden', 'true');

      let returnFocusTo = null;
      if (idx !== -1) {
        returnFocusTo = this._stack[idx].returnFocusTo;
        this._stack.splice(idx, 1);
        ScrollLock.unlock();
      }

      if (
        returnFocusTo &&
        typeof returnFocusTo.focus === 'function' &&
        document.contains(returnFocusTo)
      ) {
        returnFocusTo.focus();
      }

      Utils.emit('sui:modal-close', { id: modal.id, element: modal });
      return true;
    },
    toggle(target, triggerElement = null) {
      const modal = this._resolveElement(target);
      if (!modal) return false;
      if (modal.classList.contains('is-open') || modal.classList.contains('active')) {
        return this.close(modal);
      }
      return this.open(modal, triggerElement);
    },
    closeAll() {
      while (this._stack.length > 0) {
        this.close(this._stack[this._stack.length - 1].modal);
      }
      document
        .querySelectorAll('.sui-modal.is-open, .sui-dialog-overlay.active')
        .forEach((m) => this.close(m));
    },
    _handleDetached() {
      for (let i = this._stack.length - 1; i >= 0; i -= 1) {
        const entry = this._stack[i];
        if (!document.contains(entry.modal)) {
          this._stack.splice(i, 1);
          ScrollLock.unlock();
          if (
            entry.returnFocusTo &&
            typeof entry.returnFocusTo.focus === 'function' &&
            document.contains(entry.returnFocusTo)
          ) {
            entry.returnFocusTo.focus();
          }
          Utils.emit('sui:modal-close', { id: entry.modal.id, element: entry.modal, detached: true });
        }
      }
    },
    init() {
      Utils.listen(document, 'click', (e) => {
        const openBtn = Utils.closestTarget(e, '[data-sui-modal-target]');
        if (openBtn) {
          e.preventDefault();
          const targetId = openBtn.getAttribute('data-sui-modal-target');
          this.open(targetId, openBtn);
          return;
        }

        const closeBtn = Utils.closestTarget(e, '[data-sui-modal-close], .sui-modal-close');
        if (closeBtn) {
          e.preventDefault();
          const modal = closeBtn.closest('.sui-modal, .sui-dialog-overlay');
          this.close(modal);
          return;
        }

        if (
          e.target &&
          e.target.classList &&
          (e.target.classList.contains('sui-modal-overlay') ||
            e.target.classList.contains('sui-dialog-overlay') ||
            e.target.classList.contains('sui-modal'))
        ) {
          const modal = e.target.closest('.sui-modal, .sui-dialog-overlay');
          if (modal && modal.getAttribute('data-sui-backdrop') !== 'static') {
            this.close(modal);
          }
        }
      });

      Utils.listen(document, 'keydown', (e) => {
        if (this._stack.length === 0) return;
        const activeModal = this._stack[this._stack.length - 1].modal;
        if (e.key === 'Escape') {
          if (activeModal.getAttribute('data-sui-keyboard') !== 'false') {
            this.close(activeModal);
          }
          return;
        }
        if (e.key === 'Tab') {
          const focusables = Array.from(
            activeModal.querySelectorAll(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => el.offsetParent !== null || el === document.activeElement);
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      });
    }
  };

  /* ==========================================================================
     5. OFFCANVAS / DRAWER ENGINE (DOM-Removal Safe + Shared ScrollLock)
     ========================================================================== */
  const Offcanvas = {
    _active: null,
    _returnFocusTo: null,
    _backdrop: null,
    _ensureBackdrop() {
      if (!this._backdrop || !document.contains(this._backdrop)) {
        this._backdrop = document.querySelector('.sui-offcanvas-backdrop');
        if (!this._backdrop) {
          this._backdrop = Utils.createElement('div', ['sui-offcanvas-backdrop']);
          document.body.appendChild(this._backdrop);
        }
      }
      return this._backdrop;
    },
    open(target, trigger = null) {
      const panel = typeof target === 'string' ? document.getElementById(target) : target;
      if (!panel) return false;
      if (this._active === panel) return true;
      if (!Utils.emitCancelable('sui:offcanvas-before-open', { id: panel.id, element: panel })) return false;
      if (this._active && this._active !== panel) this.close(this._active);

      this._returnFocusTo = trigger || document.activeElement;
      this._active = panel;
      const backdrop = this._ensureBackdrop();
      backdrop.classList.add('is-open');
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      ScrollLock.lock();
      Utils.triggerReflow(panel);

      const focusable = panel.querySelector(
        '[autofocus], button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable && typeof focusable.focus === 'function') focusable.focus();
      Utils.emit('sui:offcanvas-open', { id: panel.id, element: panel });
      return true;
    },
    close(target = null) {
      const panel = target
        ? typeof target === 'string'
          ? document.getElementById(target)
          : target
        : this._active;
      if (!panel || (this._active !== panel && !panel.classList.contains('is-open'))) return false;
      if (!Utils.emitCancelable('sui:offcanvas-before-close', { id: panel.id, element: panel })) return false;

      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      if (this._backdrop) this._backdrop.classList.remove('is-open');
      if (this._active === panel) {
        this._active = null;
        ScrollLock.unlock();
      }

      const returnTarget = this._returnFocusTo;
      this._returnFocusTo = null;
      if (returnTarget && typeof returnTarget.focus === 'function' && document.contains(returnTarget)) {
        returnTarget.focus();
      }
      Utils.emit('sui:offcanvas-close', { id: panel.id, element: panel });
      return true;
    },
    toggle(target, trigger = null) {
      const panel = typeof target === 'string' ? document.getElementById(target) : target;
      if (!panel) return false;
      if (panel.classList.contains('is-open')) return this.close(panel);
      return this.open(panel, trigger);
    },
    _handleDetached() {
      if (this._active && !document.contains(this._active)) {
        const panel = this._active;
        this._active = null;
        if (this._backdrop) this._backdrop.classList.remove('is-open');
        ScrollLock.unlock();
        const returnTarget = this._returnFocusTo;
        this._returnFocusTo = null;
        if (returnTarget && typeof returnTarget.focus === 'function' && document.contains(returnTarget)) {
          returnTarget.focus();
        }
        Utils.emit('sui:offcanvas-close', { id: panel.id, element: panel, detached: true });
      }
    },
    init() {
      Utils.listen(document, 'click', (e) => {
        const trigger = Utils.closestTarget(e, '[data-sui-offcanvas-target]');
        if (trigger) {
          e.preventDefault();
          this.open(trigger.getAttribute('data-sui-offcanvas-target'), trigger);
          return;
        }
        const closeBtn = Utils.closestTarget(e, '[data-sui-offcanvas-close]');
        if (closeBtn) {
          e.preventDefault();
          this.close(closeBtn.closest('.sui-offcanvas'));
          return;
        }
        if (e.target && e.target.classList && e.target.classList.contains('sui-offcanvas-backdrop')) {
          if (!this._active || this._active.getAttribute('data-sui-backdrop') !== 'static') {
            this.close();
          }
        }
      });
      Utils.listen(document, 'keydown', (e) => {
        if (e.key === 'Escape' && this._active) this.close(this._active);
      });
    }
  };

  /* ==========================================================================
     6. RESPONSIVE NAVBAR & MOBILE DRAWER ENGINE
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
      Utils.emit('sui:navbar-toggle', { open: isOpen, menu, trigger: toggleBtn });
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
      Utils.listen(document, 'click', (e) => {
        const toggleBtn = Utils.closestTarget(e, '.sui-navbar-toggle, [data-sui-navbar-toggle]');
        if (toggleBtn) {
          e.preventDefault();
          this.toggle(toggleBtn);
          return;
        }
        if (Utils.closestTarget(e, '#mobileMenuBtn')) {
          const drawer = document.getElementById('mobileDrawer');
          if (drawer) drawer.classList.add('is-open');
          return;
        }
        if (Utils.closestTarget(e, '.js-drawer-close')) {
          const drawer = document.getElementById('mobileDrawer');
          if (drawer) drawer.classList.remove('is-open');
        }
      });

      Utils.listen(document, 'keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeAll(true);
          const drawer = document.getElementById('mobileDrawer');
          if (drawer) drawer.classList.remove('is-open');
        }
      });
    }
  };

  /* ==========================================================================
     7. DROPDOWN ENGINE (Outside-Click, Escape + Focus Restore, Arrow Keys)
     ========================================================================== */
  const Dropdown = {
    _triggers: new Map(),
    open(target, trigger = null) {
      const dd = typeof target === 'string' ? document.getElementById(target) : target;
      if (!dd) return false;
      if (!Utils.emitCancelable('sui:dropdown-before-open', { id: dd.id, element: dd })) return false;
      dd.classList.add('is-open');
      const menu = dd.querySelector('.sui-dropdown-menu');
      if (menu) Positioner.adjust(menu);
      const trig =
        trigger ||
        (dd.id ? document.querySelector(`[data-sui-dropdown-trigger="${dd.id}"]`) : null);
      if (trig) {
        trig.setAttribute('aria-expanded', 'true');
        this._triggers.set(dd, trig);
      }
      Utils.emit('sui:dropdown-open', { id: dd.id, element: dd });
      return true;
    },
    close(target = null, restoreFocus = false) {
      if (target) {
        const dd = typeof target === 'string' ? document.getElementById(target) : target;
        if (!dd || !dd.classList.contains('is-open')) return false;
        if (!Utils.emitCancelable('sui:dropdown-before-close', { id: dd.id, element: dd })) return false;
        dd.classList.remove('is-open');
        const menu = dd.querySelector('.sui-dropdown-menu');
        if (menu) Positioner.reset(menu);
        const trig =
          this._triggers.get(dd) ||
          (dd.id ? document.querySelector(`[data-sui-dropdown-trigger="${dd.id}"]`) : null);
        this._triggers.delete(dd);
        if (trig) {
          trig.setAttribute('aria-expanded', 'false');
          if (restoreFocus && typeof trig.focus === 'function' && document.contains(trig)) {
            trig.focus();
          }
        }
        Utils.emit('sui:dropdown-close', { id: dd.id, element: dd });
        return true;
      }
      document.querySelectorAll('.sui-dropdown.is-open').forEach((dd) => this.close(dd, restoreFocus));
      return true;
    },
    toggle(target, trigger = null) {
      const dd = typeof target === 'string' ? document.getElementById(target) : target;
      if (!dd) return false;
      if (dd.classList.contains('is-open')) {
        this.close(dd, false);
        return false;
      }
      this.open(dd, trigger);
      return true;
    },
    init() {
      Utils.listen(document, 'click', (e) => {
        const trigger = Utils.closestTarget(e, '[data-sui-dropdown-trigger]');
        const targetId = trigger ? trigger.getAttribute('data-sui-dropdown-trigger') : null;

        document.querySelectorAll('.sui-dropdown.is-open').forEach((dd) => {
          if (!dd.contains(e.target) && (!targetId || targetId !== dd.id)) {
            this.close(dd, false);
          }
        });

        if (trigger && targetId) {
          e.preventDefault();
          this.toggle(targetId, trigger);
        }
      });

      Utils.listen(document, 'keydown', (e) => {
        const openDd = document.querySelector('.sui-dropdown.is-open');
        if (!openDd) return;
        if (e.key === 'Escape') {
          this.close(openDd, true);
          return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
          const items = Array.from(openDd.querySelectorAll('.sui-dropdown-item:not([disabled])'));
          if (items.length === 0) return;
          e.preventDefault();
          const currentIdx = items.indexOf(document.activeElement);
          let nextIdx = 0;
          if (e.key === 'ArrowDown') nextIdx = (currentIdx + 1) % items.length;
          else if (e.key === 'ArrowUp') nextIdx = currentIdx <= 0 ? items.length - 1 : currentIdx - 1;
          else if (e.key === 'End') nextIdx = items.length - 1;
          items[nextIdx].focus();
        }
      });
    }
  };

  /* ==========================================================================
     8. ACCORDION & COLLAPSIBLE SECTIONS
     ========================================================================== */
  const Accordion = {
    open(item) {
      if (!item) return false;
      const header = item.querySelector('.sui-accordion-header, [data-sui-accordion-trigger]');
      const content = item.querySelector('.sui-accordion-content, .sui-accordion-body');
      if (!content) return false;

      const parentAccordion = item.closest('.sui-accordion');
      if (parentAccordion && !parentAccordion.hasAttribute('data-sui-multi')) {
        parentAccordion.querySelectorAll('.sui-accordion-item.is-open').forEach((sibling) => {
          if (sibling !== item) this.close(sibling);
        });
      }

      item.classList.add('is-open');
      if (header) header.setAttribute('aria-expanded', 'true');
      content.setAttribute('aria-hidden', 'false');
      if (content.classList.contains('sui-accordion-content')) {
        content.style.maxHeight = `${content.scrollHeight + 40}px`;
      }
      Utils.emit('sui:accordion-toggle', { open: true, item });
      return true;
    },
    close(item) {
      if (!item) return false;
      const header = item.querySelector('.sui-accordion-header, [data-sui-accordion-trigger]');
      const content = item.querySelector('.sui-accordion-content, .sui-accordion-body');
      if (!content) return false;

      item.classList.remove('is-open');
      if (header) header.setAttribute('aria-expanded', 'false');
      content.setAttribute('aria-hidden', 'true');
      if (content.classList.contains('sui-accordion-content')) {
        content.style.maxHeight = null;
      }
      Utils.emit('sui:accordion-toggle', { open: false, item });
      return true;
    },
    toggle(item) {
      if (!item) return false;
      return item.classList.contains('is-open') ? this.close(item) : this.open(item);
    },
    init() {
      Utils.listen(document, 'click', (e) => {
        const collapseBtn = Utils.closestTarget(e, '[data-sui-collapse-target]');
        if (collapseBtn) {
          e.preventDefault();
          const targetId = collapseBtn.getAttribute('data-sui-collapse-target');
          const panel = document.getElementById(targetId);
          if (panel) {
            const isOpen = panel.classList.toggle('is-open');
            collapseBtn.setAttribute('aria-expanded', String(isOpen));
            panel.setAttribute('aria-hidden', String(!isOpen));
            Utils.emit('sui:collapse-toggle', { open: isOpen, element: panel });
          }
          return;
        }

        const header = Utils.closestTarget(e, '.sui-accordion-header, [data-sui-accordion-trigger]');
        if (!header) return;
        const accordionItem = header.closest('.sui-accordion-item');
        if (accordionItem) this.toggle(accordionItem);
      });
    }
  };

  /* ==========================================================================
     9. TAB SWITCHER (Arrow Keys, Home, End, Dynamic Fragment Support)
     ========================================================================== */
  const TabEngine = {
    _updateIndicator(tabList, activeBtn) {
      if (!tabList || !activeBtn) return;
      tabList.style.setProperty('--sui-tab-left', `${activeBtn.offsetLeft}px`);
      tabList.style.setProperty('--sui-tab-width', `${activeBtn.offsetWidth}px`);
    },
    select(btn) {
      if (!btn) return false;
      const container = btn.closest(
        '.sui-tabs, .showcase-block, .sui-tabs-container, .showcase-tabs, .sui-card'
      );
      if (!container) return false;

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
        parentContext.querySelectorAll('.tab-panel').forEach((p) => {
          p.classList.remove('active');
          p.setAttribute('aria-hidden', 'true');
        });
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) {
          targetPanel.classList.add('active');
          targetPanel.setAttribute('aria-hidden', 'false');
        }
      }
      Utils.emit('sui:tab-change', { tab: btn, targetId });
      return true;
    },
    hydrate(root = document) {
      root.querySelectorAll('.sui-tabs').forEach((tabList) => {
        const active = tabList.querySelector(
          '.sui-tab.active, .sui-tab.sui-tab-active, .sui-tab[aria-selected="true"]'
        );
        if (active) this._updateIndicator(tabList, active);
      });
    },
    init() {
      this.hydrate(document);

      Utils.listen(document, 'click', (e) => {
        const btn = Utils.closestTarget(e, '.tab-btn, .sui-tab');
        if (btn) this.select(btn);
      });

      Utils.listen(document, 'keydown', (e) => {
        const currentTab = Utils.closestTarget(e, '.sui-tab, .tab-btn');
        if (!currentTab || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
        const container = currentTab.closest('.sui-tabs, .sui-tabs-container, .showcase-tabs');
        if (!container) return;
        const tabs = Array.from(
          container.querySelectorAll('.sui-tab:not([disabled]), .tab-btn:not([disabled])')
        );
        if (tabs.length < 2) return;
        e.preventDefault();
        const idx = tabs.indexOf(currentTab);
        let nextIdx = idx;
        if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabs.length - 1;
        tabs[nextIdx].focus();
        this.select(tabs[nextIdx]);
      });
    }
  };

  /* ==========================================================================
     10. POPOVERS & TOUCH-FRIENDLY TOOLTIPS
     ========================================================================== */
  const Popover = {
    _triggers: new Map(),
    closeAll(restoreFocus = false) {
      document.querySelectorAll('.sui-popover-panel.is-open').forEach((p) => {
        p.classList.remove('is-open');
        p.setAttribute('aria-hidden', 'true');
        const trigger =
          this._triggers.get(p) ||
          (p.id ? document.querySelector(`[data-sui-popover-target="${p.id}"]`) : null);
        this._triggers.delete(p);
        if (trigger) {
          trigger.setAttribute('aria-expanded', 'false');
          if (restoreFocus && typeof trigger.focus === 'function' && document.contains(trigger)) {
            trigger.focus();
          }
        }
        Utils.emit('sui:popover-close', { id: p.id, element: p });
      });
    },
    open(targetId, trigger = null) {
      const panel = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
      if (!panel) return false;
      this.closeAll(false);
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden', 'false');
      Positioner.adjust(panel);
      const trig =
        trigger ||
        (panel.id ? document.querySelector(`[data-sui-popover-target="${panel.id}"]`) : null);
      if (trig) {
        trig.setAttribute('aria-expanded', 'true');
        this._triggers.set(panel, trig);
      }
      Utils.emit('sui:popover-open', { id: panel.id, element: panel });
      return true;
    },
    close(targetId, restoreFocus = false) {
      const panel = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
      if (!panel || !panel.classList.contains('is-open')) return false;
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      Positioner.reset(panel);
      const trig = this._triggers.get(panel);
      this._triggers.delete(panel);
      if (trig) {
        trig.setAttribute('aria-expanded', 'false');
        if (restoreFocus && typeof trig.focus === 'function' && document.contains(trig)) {
          trig.focus();
        }
      }
      Utils.emit('sui:popover-close', { id: panel.id, element: panel });
      return true;
    },
    toggle(targetId, trigger = null) {
      const panel = typeof targetId === 'string' ? document.getElementById(targetId) : targetId;
      if (!panel) return false;
      if (panel.classList.contains('is-open')) {
        this.close(panel, false);
        return false;
      }
      this.open(panel, trigger);
      return true;
    },
    init() {
      Utils.listen(document, 'click', (e) => {
        const trigger = Utils.closestTarget(e, '[data-sui-popover-target]');
        if (trigger) {
          e.preventDefault();
          this.toggle(trigger.getAttribute('data-sui-popover-target'), trigger);
          return;
        }
        if (!Utils.closestTarget(e, '.sui-popover-panel')) {
          this.closeAll(false);
        }

        // Touch-friendly tooltip activation for [data-sui-tooltip]
        const tooltipEl = Utils.closestTarget(e, '[data-sui-tooltip]');
        document.querySelectorAll('[data-sui-tooltip].is-tooltip-open').forEach((el) => {
          if (el !== tooltipEl) el.classList.remove('is-tooltip-open');
        });
        if (tooltipEl && Utils.isTouchDevice()) {
          tooltipEl.classList.toggle('is-tooltip-open');
        }
      });

      Utils.listen(document, 'keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeAll(true);
          document.querySelectorAll('[data-sui-tooltip].is-tooltip-open').forEach((el) => {
            el.classList.remove('is-tooltip-open');
          });
        }
      });
    }
  };

  /* ==========================================================================
     11. FORM ENHANCEMENTS (Delegated & Opt-In, Native Submission Preserved)
     OTP, Password Toggle, Auto-Resize, Character Counters, Accessible Validation
     ========================================================================== */
  const FormUtilities = {
    _updateCounter(input) {
      const counterRef = input.getAttribute('data-sui-counter');
      if (!counterRef) return;
      const counterEl = document.getElementById(counterRef.replace(/^#/, ''));
      if (!counterEl) return;
      const max = input.getAttribute('maxlength');
      const len = (input.value || '').length;
      counterEl.textContent = max ? `${len} / ${max}` : String(len);
    },
    _syncFieldValidity(field) {
      if (!field || typeof field.checkValidity !== 'function') return;
      const valid = field.checkValidity();
      field.classList.toggle('is-invalid', !valid);
      field.classList.toggle('is-valid', valid && Boolean(field.value));
      field.setAttribute('aria-invalid', String(!valid));
    },
    hydrate(root = document) {
      root.querySelectorAll('[data-sui-counter]').forEach((input) => this._updateCounter(input));
    },
    init() {
      this.hydrate(document);

      // Delegated Password Revealer (works on dynamically inserted fragments)
      Utils.listen(document, 'click', (e) => {
        const eyeBtn = Utils.closestTarget(e, '[data-sui-toggle-password]');
        if (!eyeBtn) return;
        const targetId = eyeBtn.getAttribute('data-sui-toggle-password');
        const targetInput =
          (targetId && document.getElementById(targetId)) ||
          (eyeBtn.parentElement && eyeBtn.parentElement.querySelector('input'));
        if (!targetInput) return;

        const revealing = targetInput.type === 'password';
        targetInput.type = revealing ? 'text' : 'password';
        eyeBtn.classList.toggle('is-visible', revealing);
        eyeBtn.setAttribute('aria-pressed', String(revealing));
      });

      // Delegated Input Handler: OTP advance, Auto-Resize Textarea, Character Counters, Opt-in Validation
      Utils.listen(document, 'input', (e) => {
        const target = e.target;
        if (!target) return;

        if (target.matches && target.matches('.sui-otp-group input')) {
          const inputs = Array.from(target.closest('.sui-otp-group').querySelectorAll('input'));
          const idx = inputs.indexOf(target);
          if (target.value.length === 1 && idx !== -1 && idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          }
        }

        if (target.matches && target.matches('textarea.sui-auto-resize')) {
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }

        if (target.hasAttribute && target.hasAttribute('data-sui-counter')) {
          this._updateCounter(target);
        }

        if (
          target.hasAttribute &&
          (target.hasAttribute('data-sui-validate') || target.closest('form[data-sui-validate]'))
        ) {
          if (target.classList.contains('is-invalid') || target.classList.contains('is-valid')) {
            this._syncFieldValidity(target);
          }
        }
      });

      // Delegated OTP Backspace
      Utils.listen(document, 'keydown', (e) => {
        if (e.key !== 'Backspace') return;
        const target = e.target;
        if (!target || !target.matches || !target.matches('.sui-otp-group input')) return;
        const inputs = Array.from(target.closest('.sui-otp-group').querySelectorAll('input'));
        const idx = inputs.indexOf(target);
        if (!target.value && idx > 0) {
          inputs[idx - 1].focus();
          inputs[idx - 1].value = '';
        }
      });

      // Delegated OTP Paste
      Utils.listen(document, 'paste', (e) => {
        const target = e.target;
        if (!target || !target.matches || !target.matches('.sui-otp-group input')) return;
        e.preventDefault();
        const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
        if (!pasteData) return;
        const inputs = Array.from(target.closest('.sui-otp-group').querySelectorAll('input'));
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

      // Opt-in Accessible Validation (never blocks native submission)
      Utils.listen(
        document,
        'invalid',
        (e) => {
          const field = e.target;
          if (
            field &&
            field.hasAttribute &&
            (field.hasAttribute('data-sui-validate') || field.closest('form[data-sui-validate]'))
          ) {
            this._syncFieldValidity(field);
          }
        },
        true
      );

      Utils.listen(
        document,
        'blur',
        (e) => {
          const field = e.target;
          if (
            field &&
            field.hasAttribute &&
            (field.hasAttribute('data-sui-validate') || field.closest('form[data-sui-validate]'))
          ) {
            this._syncFieldValidity(field);
          }
        },
        true
      );
    }
  };

  /* ==========================================================================
     12. ALERTS, RIPPLE, CLIPBOARD, CAROUSEL, SCROLLSPY & COMMAND PALETTE
     ========================================================================== */
  const Alert = {
    dismiss(alertEl) {
      if (!alertEl) return false;
      alertEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      alertEl.style.opacity = '0';
      alertEl.style.transform = 'translateY(-4px)';
      Utils.setTimer(() => {
        if (alertEl.parentNode) alertEl.parentNode.removeChild(alertEl);
      }, 200);
      Utils.emit('sui:alert-dismiss', { element: alertEl });
      return true;
    },
    init() {
      Utils.listen(document, 'click', (e) => {
        const btn = Utils.closestTarget(e, '[data-sui-dismiss="alert"], .sui-alert-close');
        if (!btn) return;
        e.preventDefault();
        const alertEl = btn.closest('.sui-alert');
        if (alertEl) this.dismiss(alertEl);
      });
    }
  };

  const Ripple = {
    init() {
      Utils.listen(document, 'pointerdown', (e) => {
        if (Utils.prefersReducedMotion()) return;
        const target = Utils.closestTarget(e, '.sui-btn, .sui-ripple');
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
        Utils.setTimer(() => circle.remove(), 600);
      });
    }
  };

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
      Utils.listen(document, 'click', async (e) => {
        const copyBtn = Utils.closestTarget(e, '[data-sui-copy], .btn-copy-code, .sui-copy-btn');
        if (!copyBtn) return;

        let textToCopy = copyBtn.getAttribute('data-sui-copy');
        if (!textToCopy) {
          const container = copyBtn.closest('.docs-demo, .code-reveal-panel, .u-card, .demo-section, article');
          const codeEl = container ? container.querySelector('code, pre') : null;
          if (codeEl) textToCopy = codeEl.textContent;
        }
        if (!textToCopy) return;

        try {
          await this.text(textToCopy);
          const originalText = copyBtn.textContent;
          copyBtn.textContent = '\u2713 Copied!';
          copyBtn.classList.add('copied');
          Utils.setTimer(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('[Sui.css] Clipboard copy failed:', err);
        }
      });
    }
  };

  const Carousel = {
    goTo(wrapper, index) {
      if (!wrapper) return;
      const track = wrapper.querySelector('.sui-carousel');
      const slides = track ? Array.from(track.querySelectorAll('.sui-carousel-slide')) : [];
      if (!track || slides.length === 0) return;

      const clamped = ((index % slides.length) + slides.length) % slides.length;
      wrapper.setAttribute('data-sui-carousel-index', String(clamped));
      const targetSlide = slides[clamped];
      if (typeof track.scrollTo === 'function') {
        track.scrollTo({
          left: targetSlide.offsetLeft,
          behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth'
        });
      }
      wrapper.querySelectorAll('.sui-carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('is-active', i === clamped);
        dot.setAttribute('aria-current', i === clamped ? 'true' : 'false');
      });
      Utils.emit('sui:carousel-change', { index: clamped, wrapper });
    },
    hydrate(root = document) {
      root.querySelectorAll('.sui-carousel-wrapper[data-sui-interval]').forEach((wrapper) => {
        if (wrapper._suiAutoplayInit) return;
        const ms = parseInt(wrapper.getAttribute('data-sui-interval') || '0', 10);
        if (!ms || ms < 500 || Utils.prefersReducedMotion()) return;
        wrapper._suiAutoplayInit = true;
        let paused = false;
        const timerId = setInterval(() => {
          if (paused || !document.contains(wrapper)) return;
          const current = parseInt(wrapper.getAttribute('data-sui-carousel-index') || '0', 10);
          this.goTo(wrapper, current + 1);
        }, ms);
        activeIntervals.add(timerId);
        wrapper.addEventListener('mouseenter', () => { paused = true; });
        wrapper.addEventListener('mouseleave', () => { paused = false; });
        wrapper.addEventListener('focusin', () => { paused = true; });
        wrapper.addEventListener('focusout', () => { paused = false; });
      });
    },
    init() {
      this.hydrate(document);
      let touchStartX = 0;

      Utils.listen(document, 'click', (e) => {
        const prev = Utils.closestTarget(e, '[data-sui-carousel-prev]');
        const next = Utils.closestTarget(e, '[data-sui-carousel-next]');
        const dot = Utils.closestTarget(e, '[data-sui-carousel-slide-to]');
        if (!prev && !next && !dot) return;

        const wrapper = (prev || next || dot).closest('.sui-carousel-wrapper');
        if (!wrapper) return;
        const current = parseInt(wrapper.getAttribute('data-sui-carousel-index') || '0', 10);

        if (prev) this.goTo(wrapper, current - 1);
        else if (next) this.goTo(wrapper, current + 1);
        else if (dot) this.goTo(wrapper, parseInt(dot.getAttribute('data-sui-carousel-slide-to') || '0', 10));
      });

      Utils.listen(document, 'keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const wrapper = Utils.closestTarget(e, '.sui-carousel-wrapper');
        if (!wrapper) return;
        e.preventDefault();
        const current = parseInt(wrapper.getAttribute('data-sui-carousel-index') || '0', 10);
        this.goTo(wrapper, e.key === 'ArrowRight' ? current + 1 : current - 1);
      });

      Utils.listen(document, 'touchstart', (e) => {
        const wrapper = Utils.closestTarget(e, '.sui-carousel-wrapper');
        if (wrapper && e.touches && e.touches[0]) touchStartX = e.touches[0].clientX;
      }, { passive: true });

      Utils.listen(document, 'touchend', (e) => {
        const wrapper = Utils.closestTarget(e, '.sui-carousel-wrapper');
        if (!wrapper || !e.changedTouches || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) >= 40) {
          const current = parseInt(wrapper.getAttribute('data-sui-carousel-index') || '0', 10);
          this.goTo(wrapper, dx < 0 ? current + 1 : current - 1);
        }
      }, { passive: true });
    }
  };

  const ScrollEngine = {
    hydrate(root = document) {
      if (!('IntersectionObserver' in window)) {
        root.querySelectorAll('.reveal-on-scroll').forEach((el) => el.classList.add('is-visible'));
        return;
      }
      const targets = root.querySelectorAll('.reveal-on-scroll:not(.is-visible)');
      if (targets.length === 0) return;
      const observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.01, rootMargin: '0px 0px 40px 0px' }
      );
      activeObservers.add(observer);
      targets.forEach((el) => observer.observe(el));
    }
  };

  const ScrollSpy = {
    init(root = document) {
      return this.hydrate(root);
    },
    hydrate(root = document) {
      const navs = root.querySelectorAll('[data-sui-scrollspy]');
      if (navs.length === 0 || !('IntersectionObserver' in window)) return;
      navs.forEach((nav) => {
        const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
        const targets = links
          .map((link) => {
            const id = link.getAttribute('href').slice(1);
            const section = id ? document.getElementById(id) : null;
            return section ? { link, section } : null;
          })
          .filter(Boolean);
        if (targets.length === 0) return;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              links.forEach((l) => l.classList.remove('active'));
              nav.querySelectorAll('.has-active-child').forEach((g) => g.classList.remove('has-active-child'));
              const match = targets.find((t) => t.section === entry.target);
              if (match) {
                match.link.classList.add('active');
                let parent = match.link.parentElement;
                while (parent && parent !== nav) {
                  if (parent.matches && parent.matches('li, .docs-nav-group, [data-sui-scrollspy-group]')) {
                    parent.classList.add('has-active-child');
                  }
                  parent = parent.parentElement;
                }
              }
            });
          },
          { rootMargin: '-25% 0px -65% 0px' }
        );
        activeObservers.add(observer);
        targets.forEach((t) => observer.observe(t.section));
      });
    }
  };

  const Command = {
    _active: null,
    _returnFocusTo: null,
    open(target = null, trigger = null) {
      const palette = target
        ? typeof target === 'string'
          ? document.getElementById(target)
          : target
        : document.querySelector('.sui-command');
      if (!palette) return false;
      if (this._active === palette) return true;

      this._returnFocusTo = trigger || document.activeElement;
      this._active = palette;
      palette.classList.add('is-open');
      palette.setAttribute('aria-hidden', 'false');
      ScrollLock.lock();
      Utils.triggerReflow(palette);

      const input = palette.querySelector('.sui-command-input');
      if (input) {
        input.value = '';
        this.filter(palette, '');
        if (typeof input.focus === 'function') input.focus();
      }
      Utils.emit('sui:command-open', { id: palette.id, element: palette });
      return true;
    },
    close(target = null) {
      const palette = target
        ? typeof target === 'string'
          ? document.getElementById(target)
          : target
        : this._active;
      if (!palette || !palette.classList.contains('is-open')) return false;

      palette.classList.remove('is-open');
      palette.setAttribute('aria-hidden', 'true');
      if (this._active === palette) {
        this._active = null;
        ScrollLock.unlock();
      }
      const returnTarget = this._returnFocusTo;
      this._returnFocusTo = null;
      if (returnTarget && typeof returnTarget.focus === 'function' && document.contains(returnTarget)) {
        returnTarget.focus();
      }
      Utils.emit('sui:command-close', { id: palette.id, element: palette });
      return true;
    },
    filter(palette, query) {
      const q = String(query || '').trim().toLowerCase();
      const items = Array.from(palette.querySelectorAll('.sui-command-item, [data-sui-command-item]'));
      let visibleCount = 0;
      items.forEach((item) => {
        const hay = `${item.textContent || ''} ${item.getAttribute('data-sui-keywords') || ''}`.toLowerCase();
        const show = !q || hay.includes(q);
        item.style.display = show ? '' : 'none';
        item.classList.remove('is-active');
        if (show) {
          if (visibleCount === 0) item.classList.add('is-active');
          visibleCount += 1;
        }
      });
      const empty = palette.querySelector('.sui-command-empty');
      if (empty) empty.style.display = visibleCount === 0 ? '' : 'none';
      return visibleCount;
    },
    _handleDetached() {
      if (this._active && !document.contains(this._active)) {
        this._active = null;
        ScrollLock.unlock();
      }
    },
    init() {
      Utils.listen(document, 'click', (e) => {
        const openBtn = Utils.closestTarget(e, '[data-sui-command-target]');
        if (openBtn) {
          e.preventDefault();
          this.open(openBtn.getAttribute('data-sui-command-target'), openBtn);
          return;
        }
        if (e.target && e.target.classList && e.target.classList.contains('sui-command')) {
          this.close(e.target);
          return;
        }
        const chipClose = Utils.closestTarget(e, '[data-sui-dismiss="chip"], .sui-chip-close');
        if (chipClose) {
          const chip = chipClose.closest('.sui-chip');
          if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
        }
      });

      Utils.listen(document, 'input', (e) => {
        const input = Utils.closestTarget(e, '.sui-command-input');
        if (!input) return;
        const palette = input.closest('.sui-command');
        if (palette) this.filter(palette, input.value);
      });

      Utils.listen(document, 'keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          const defaultPalette = document.querySelector('.sui-command');
          if (defaultPalette) {
            e.preventDefault();
            if (this._active) this.close(this._active);
            else this.open(defaultPalette);
          }
          return;
        }
        if (!this._active) return;
        if (e.key === 'Escape') {
          this.close(this._active);
          return;
        }
        const visibleItems = Array.from(
          this._active.querySelectorAll('.sui-command-item, [data-sui-command-item]')
        ).filter((el) => el.style.display !== 'none');
        if (visibleItems.length === 0) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const currentIdx = visibleItems.findIndex((el) => el.classList.contains('is-active'));
          visibleItems.forEach((el) => el.classList.remove('is-active'));
          const nextIdx =
            e.key === 'ArrowDown'
              ? (currentIdx + 1) % visibleItems.length
              : currentIdx <= 0
                ? visibleItems.length - 1
                : currentIdx - 1;
          visibleItems[nextIdx].classList.add('is-active');
        } else if (e.key === 'Enter') {
          const activeItem = visibleItems.find((el) => el.classList.contains('is-active'));
          if (activeItem) {
            e.preventDefault();
            if (typeof activeItem.click === 'function') activeItem.click();
            this.close(this._active);
          }
        }
      });
    }
  };

  const SyntaxHighlighter = {
    highlightAll(root = document) {
      root.querySelectorAll('pre code:not(.sui-highlighted)').forEach((block) => {
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
     LIFECYCLE: init(root?) & destroy()
     ========================================================================== */
  function startDomGuard() {
    if (domObserver || typeof MutationObserver === 'undefined' || !document.body) return;
    domObserver = new MutationObserver((mutations) => {
      let hasRemoval = false;
      for (const m of mutations) {
        if (m.removedNodes && m.removedNodes.length > 0) {
          hasRemoval = true;
          break;
        }
      }
      if (hasRemoval) {
        Modal._handleDetached();
        Offcanvas._handleDetached();
        Command._handleDetached();
      }
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  function initialize(root = document) {
    if (!initialized) {
      initialized = true;
      globalController = typeof AbortController !== 'undefined' ? new AbortController() : null;

      ThemeEngine.init();
      Modal.init();
      Offcanvas.init();
      Alert.init();
      Popover.init();
      Carousel.init();
      Command.init();
      Navbar.init();
      Dropdown.init();
      Accordion.init();
      TabEngine.init();
      FormUtilities.init();
      Ripple.init();
      Clipboard.init();
      startDomGuard();

      Utils.listen(document, 'click', (e) => {
        const replayBtn = Utils.closestTarget(e, '.btn-replay');
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

    // Safe to call repeatedly for newly injected Flask/Django/HTMX fragments
    const scope = root && typeof root.querySelectorAll === 'function' ? root : document;
    TabEngine.hydrate(scope);
    Carousel.hydrate(scope);
    FormUtilities.hydrate(scope);
    ScrollEngine.hydrate(scope);
    ScrollSpy.hydrate(scope);
    SyntaxHighlighter.highlightAll(scope);
  }

  function destroy() {
    if (!initialized) return;
    if (globalController) {
      globalController.abort();
      globalController = null;
    }
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    activeObservers.forEach((obs) => {
      if (typeof obs.disconnect === 'function') obs.disconnect();
    });
    activeObservers.clear();
    activeTimers.forEach((id) => clearTimeout(id));
    activeTimers.clear();
    activeIntervals.forEach((id) => clearInterval(id));
    activeIntervals.clear();
    Toast._timers.clear();

    Modal._stack = [];
    Offcanvas._active = null;
    Offcanvas._returnFocusTo = null;
    if (Offcanvas._backdrop) Offcanvas._backdrop.classList.remove('is-open');
    Command._active = null;
    Command._returnFocusTo = null;
    Dropdown._triggers.clear();
    Popover._triggers.clear();
    ScrollLock.reset();
    initialized = false;
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initialize(document), { once: true });
    } else {
      initialize(document);
    }
  }

  Modal.getOrCreateInstance = createInstanceRegistry(Modal);
  Offcanvas.getOrCreateInstance = createInstanceRegistry(Offcanvas);
  Dropdown.getOrCreateInstance = createInstanceRegistry(Dropdown);

  return {
    version: '3.0.2',
    positioner: Positioner,
    init: initialize,
    destroy,
    theme: ThemeEngine,
    modal: Modal,
    offcanvas: Offcanvas,
    alert: Alert,
    popover: Popover,
    carousel: Carousel,
    scrollspy: ScrollSpy,
    command: Command,
    navbar: Navbar,
    dropdown: Dropdown,
    accordion: Accordion,
    tabs: TabEngine,
    forms: FormUtilities,
    toast: Toast,
    clipboard: Clipboard,
    copy: Clipboard,
    highlight: SyntaxHighlighter.highlightAll
  };
});
