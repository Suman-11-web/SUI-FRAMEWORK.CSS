import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const checks = [];

function assert(name, condition, detail = '') {
  checks.push({ name, pass: Boolean(condition), detail });
  if (!condition) failures.push(`${name}${detail ? ` (${detail})` : ''}`);
}

// 1. Verify dist files exist and are non-empty
const distCssPath = path.join(root, 'dist/sui.min.css');
const distJsPath = path.join(root, 'dist/sui.min.js');
const distCss = fs.readFileSync(distCssPath, 'utf8');
const distJs = fs.readFileSync(distJsPath, 'utf8');

assert('dist/sui.min.css exists and is non-empty', distCss.length > 10000, `${distCss.length} bytes`);
assert('dist/sui.min.js exists and is non-empty', distJs.length > 5000, `${distJs.length} bytes`);

// 2. Verify @layer cascade order is preserved in built dist/sui.min.css
const layerOrder = ['reset', 'tokens', 'base', 'layout', 'components', 'overlays', 'animations', 'utilities'];
const layerIndices = layerOrder.map((l) => distCss.indexOf(`@layer ${l}{`));
assert(
  'dist/sui.min.css preserves 8-layer cascade in ascending order',
  layerIndices.every((idx, i) => idx !== -1 && (i === 0 || idx > layerIndices[i - 1])),
  layerOrder.map((l, i) => `${l}@${layerIndices[i]}`).join(', ')
);
for (const layerName of layerOrder) {
  assert(`dist/sui.min.css contains @layer ${layerName}{...}`, distCss.includes(`@layer ${layerName}{`));
}

// 3. Verify zero undefined --sui-* CSS variables in src/
const srcCssFiles = fs
  .readdirSync(path.join(root, 'src/layers'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => path.join(root, 'src/layers', f));
const definedVars = new Set();
const usedVars = new Map();
for (const file of srcCssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const m of content.matchAll(/(--sui-[a-zA-Z0-9_-]+)\s*:/g)) definedVars.add(m[1]);
  for (const m of content.matchAll(/var\(\s*(--sui-[a-zA-Z0-9_-]+)\s*(,)?/g)) {
    const varName = m[1];
    const hasFallback = Boolean(m[2]);
    if (!hasFallback) {
      if (!usedVars.has(varName)) usedVars.set(varName, new Set());
      usedVars.get(varName).add(path.relative(root, file));
    }
  }
}
const missingVarsNoFallback = [...usedVars.keys()].filter((v) => !definedVars.has(v));
assert(
  'Zero undefined --sui-* CSS variables without fallbacks',
  missingVarsNoFallback.length === 0,
  missingVarsNoFallback.join(', ')
);

// 4. Verify zero missing documented .sui-* classes across docs & examples
const cssClasses = new Set();
for (const file of srcCssFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const m of content.matchAll(/\.(sui-[a-zA-Z0-9_-]+)/g)) cssClasses.add(m[1]);
}
const htmlFiles = [
  'README.md',
  'index.html',
  'how-to-use.html',
  'docs/index.html',
  'tests/index.html',
  'tests/regression.html',
  'tests/integration.html',
  ...fs.readdirSync(path.join(root, 'example')).filter((f) => f.endsWith('.html')).map((f) => `example/${f}`)
];
const missingDocClasses = new Set();
for (const rel of htmlFiles) {
  const content = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const m of content.matchAll(/\b(sui-[a-zA-Z0-9_-]+)\b/g)) {
    const cls = m[1];
    const idx = m.index;
    if (idx >= 2 && content.slice(idx - 2, idx) === '--') continue;
    if (idx >= 5 && content.slice(idx - 5, idx) === 'data-') continue;
    const after = content.slice(idx + cls.length, idx + cls.length + 2);
    if (after.startsWith('-*') || after.startsWith('/') || after.startsWith('-[') || after.startsWith(':')) continue;
    if (
      cls.endsWith('.css') ||
      cls.endsWith('.js') ||
      ['sui-css', 'sui-theme', 'sui-theme-toggle', 'sui-highlighted', 'sui-toast-container', 'sui-ripple-anim'].includes(cls)
    )
      continue;
    if (!cssClasses.has(cls)) missingDocClasses.add(`${cls} (${rel})`);
  }
}
assert(
  'All documented/used .sui-* classes exist in source CSS',
  missingDocClasses.size === 0,
  [...missingDocClasses].slice(0, 10).join(', ')
);

// 5. Verify key fixes in dist/sui.min.css
assert('dist/sui.min.css defines @keyframes sui-ripple-anim', distCss.includes('sui-ripple-anim'));
assert('dist/sui.min.css defines --sui-color-info-500', distCss.includes('--sui-color-info-500'));
assert('dist/sui.min.css defines responsive .sui-navbar-toggle collapse', distCss.includes('.sui-navbar-toggle'));
assert('dist/sui.min.css does not force body{...overflow-x:hidden}', !/body\{[^}]*overflow-x:hidden/.test(distCss));
assert('dist/sui.min.css .sui-hidden has no !important', !distCss.includes('.sui-hidden{display:none!important}'));
assert('dist/sui.min.css keeps plain HTML in light mode by default (no :root:not([data-theme=light]) dark hijack)', !distCss.includes(":root:not([data-theme=light])") && !distCss.includes(":root:not([data-theme='light'])"));
assert('dist/sui.min.css uses color-scheme:light by default', distCss.includes('color-scheme:light') && !distCss.includes('color-scheme:light dark'));
assert('dist/sui.min.css makes .sui-modal.is-open visibility immediate (0s)', /\.sui-modal\.is-open\{[^}]*visibility\s+0s/.test(distCss) || /\.sui-modal\.is-open\{[^}]*visibility:visible/.test(distCss));
assert('dist/sui.min.css includes Bootstrap-parity components (offcanvas, list-group, pagination, form-floating, btn-close)',
  distCss.includes('.sui-offcanvas') &&
  distCss.includes('.sui-list-group') &&
  distCss.includes('.sui-pagination') &&
  distCss.includes('.sui-form-floating') &&
  distCss.includes('.sui-btn-close')
);
assert('dist/sui.min.css includes Tailwind-parity utilities (ring, divide-y, space-y, object-cover, aspect-video, text-gradient)',
  distCss.includes('.sui-ring-2') &&
  distCss.includes('.sui-divide-y') &&
  distCss.includes('.sui-space-y-4') &&
  distCss.includes('.sui-object-cover') &&
  distCss.includes('.sui-aspect-video') &&
  distCss.includes('.sui-text-gradient')
);
assert('dist/sui.min.css removes stale position:fixed from .sui-toast so toasts stack cleanly', !/\.sui-toast\{[^}]*position:fixed/.test(distCss));
assert('dist/sui.min.css collapses .sui-accordion-content by default (max-height:0)', /\.sui-accordion-content\{[^}]*max-height:0/.test(distCss));
assert('dist/sui.min.css includes v3 premium components (command, stepper, chip, stat-card, empty-state, kbd, toast-top-right)',
  distCss.includes('.sui-command') &&
  distCss.includes('.sui-stepper') &&
  distCss.includes('.sui-chip') &&
  distCss.includes('.sui-stat-card') &&
  distCss.includes('.sui-empty-state') &&
  distCss.includes('.sui-kbd') &&
  distCss.includes('.sui-toast-top-right')
);
assert('dist/sui.min.css includes touch tooltip .is-tooltip-open state', distCss.includes('.is-tooltip-open'));
const badResponsiveTypos = [];
for (const rel of htmlFiles.filter((f) => f.endsWith('.html'))) {
  const c = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/(?:sm|md|lg|xl):sui-/.test(c)) badResponsiveTypos.push(rel);
}
assert('Zero invalid Tailwind-colon responsive class typos (e.g. md:sui-*) across HTML pages', badResponsiveTypos.length === 0, badResponsiveTypos.join(', '));
const staleV2Pages = [];
for (const rel of htmlFiles.filter((f) => f.endsWith('.html'))) {
  const c = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/v2\.0\.0/.test(c)) staleV2Pages.push(rel);
}
assert('Zero stale v2.0.0 version badges across all HTML pages', staleV2Pages.length === 0, staleV2Pages.join(', '));
const staleV300Cdn = [];
for (const rel of htmlFiles) {
  const c = fs.readFileSync(path.join(root, rel), "utf8");
  if (c.includes("@v3.0.0")) staleV300Cdn.push(rel);
}
assert("Zero stale @v3.0.0 CDN links across HTML/README files (all use @v3.0.1)", staleV300Cdn.length === 0, staleV300Cdn.join(", "));

// 6. Verify README.md has no broken markdown links inside HTML attributes
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
assert(
  'README.md has zero malformed markdown links in href/src attributes',
  !/(?:href|src)=["']\[https?:\/\//.test(readme)
);

// 7. Verify relative asset paths across all HTML files resolve to existing non-empty files
const brokenAssets = [];
for (const rel of htmlFiles.filter((f) => f.endsWith('.html'))) {
  const full = path.join(root, rel);
  const dir = path.dirname(full);
  const content = fs.readFileSync(full, 'utf8').replace(/<pre[\s\S]*?<\/pre>/gi, '');
  for (const m of content.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
    const url = m[1];
    if (
      url.startsWith('http') ||
      url.startsWith('#') ||
      url.startsWith('mailto:') ||
      url.startsWith('data:') ||
      url.startsWith('javascript:')
    )
      continue;
    const cleanUrl = url.split('?')[0].split('#')[0];
    if (!cleanUrl) continue;
    const target = path.resolve(dir, cleanUrl);
    if (!fs.existsSync(target) || fs.statSync(target).size === 0) {
      brokenAssets.push(`${rel} -> ${url}`);
    }
  }
}
assert('All relative HTML asset & page links exist and are non-empty', brokenAssets.length === 0, brokenAssets.join(', '));

// 8. Runtime JS behavioral tests on built dist/sui.min.js using a lightweight DOM harness
class MiniElement {
  constructor(tag, id = '', classes = [], attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this._classes = new Set(classes);
    this._attrs = { ...attrs };
    this.style = { setProperty: () => {} };
    this.children = [];
    this.parentNode = null;
    this.parentElement = null;
    this.textContent = '';
    this.value = '';
    this.disabled = false;
    this.offsetLeft = 0;
    this.offsetWidth = 100;
    this.scrollHeight = 120;
    this._listeners = {};
    const self = this;
    this.classList = {
      add: (...cs) => cs.forEach((c) => self._classes.add(c)),
      remove: (...cs) => cs.forEach((c) => self._classes.delete(c)),
      contains: (c) => self._classes.has(c),
      toggle: (c, force) => {
        if (force === true) {
          self._classes.add(c);
          return true;
        }
        if (force === false) {
          self._classes.delete(c);
          return false;
        }
        if (self._classes.has(c)) {
          self._classes.delete(c);
          return false;
        }
        self._classes.add(c);
        return true;
      }
    };
  }
  appendChild(child) {
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
    child.parentNode = null;
    child.parentElement = null;
  }
  setAttribute(k, v) {
    this._attrs[k] = String(v);
    if (k === 'id') this.id = String(v);
  }
  getAttribute(k) {
    return Object.prototype.hasOwnProperty.call(this._attrs, k) ? this._attrs[k] : null;
  }
  hasAttribute(k) {
    return Object.prototype.hasOwnProperty.call(this._attrs, k);
  }
  removeAttribute(k) {
    delete this._attrs[k];
  }
  addEventListener(ev, fn) {
    (this._listeners[ev] ||= []).push(fn);
  }
  focus() {
    doc.activeElement = this;
  }
  matches(sel) {
    return sel.split(',').some((part) => {
      const s = part.trim();
      if (s.startsWith('#')) return this.id === s.slice(1);
      if (s.startsWith('.')) return s.slice(1).split('.').every((c) => this._classes.has(c));
      const attrMatch = s.match(/^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]$/);
      if (attrMatch) {
        const [, k, v] = attrMatch;
        return v !== undefined ? this.getAttribute(k) === v : this.hasAttribute(k);
      }
      if (s.startsWith('input') && this.tagName === 'INPUT') return !this.disabled;
      if (s.startsWith('button') && this.tagName === 'BUTTON') return !this.disabled;
      return false;
    });
  }
  closest(sel) {
    let cur = this;
    while (cur) {
      if (cur.matches(sel)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }
  querySelector(sel) {
    for (const c of this.children) {
      if (c.matches(sel)) return c;
      const found = c.querySelector(sel);
      if (found) return found;
    }
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    for (const c of this.children) {
      if (c.matches(sel)) out.push(c);
      out.push(...c.querySelectorAll(sel));
    }
    return out;
  }
  contains(node) {
    let cur = node;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
  }
}

const docListeners = {};
const winListeners = {};
const docRoot = new MiniElement('html', '', [], { 'data-theme': 'light' });
const body = new MiniElement('body');
docRoot.appendChild(body);

// Build fixtures: theme button, navbar + toggle + menu, two modals
const themeBtn = new MiniElement('button', 'theme-btn', ['sui-theme-toggle']);
const nav = new MiniElement('nav', 'nav1', ['sui-navbar']);
const navToggle = new MiniElement('button', 'nav-btn', ['sui-navbar-toggle'], {
  'aria-controls': 'nav-menu-1',
  'aria-expanded': 'false'
});
const navMenu = new MiniElement('ul', 'nav-menu-1', ['sui-navbar-menu']);
nav.appendChild(navToggle);
nav.appendChild(navMenu);

const openA = new MiniElement('button', 'open-a', ['sui-btn'], { 'data-sui-modal-target': 'modal-a' });
const openB = new MiniElement('button', 'open-b', ['sui-btn'], { 'data-sui-modal-target': 'modal-b' });
const modalA = new MiniElement('div', 'modal-a', ['sui-modal'], { 'aria-hidden': 'true' });
const inputA = new MiniElement('input', 'input-a', ['sui-input']);
modalA.appendChild(inputA);
const modalB = new MiniElement('div', 'modal-b', ['sui-modal'], { 'aria-hidden': 'true' });
const inputB = new MiniElement('input', 'input-b', ['sui-input']);
modalB.appendChild(inputB);

[themeBtn, nav, openA, openB, modalA, modalB].forEach((el) => body.appendChild(el));

const doc = {
  readyState: 'complete',
  documentElement: docRoot,
  body,
  activeElement: body,
  createElement: (tag) => new MiniElement(tag),
  getElementById: (id) => {
    const all = [docRoot, ...docRoot.querySelectorAll('.sui-navbar,.sui-navbar-toggle,.sui-navbar-menu,.sui-modal,.sui-input,.sui-btn,.sui-theme-toggle,.sui-toast-container')];
    const search = (node) => {
      if (node.id === id) return node;
      for (const c of node.children) {
        const r = search(c);
        if (r) return r;
      }
      return null;
    };
    return search(docRoot);
  },
  querySelector: (sel) => docRoot.querySelector(sel),
  querySelectorAll: (sel) => docRoot.querySelectorAll(sel),
  contains: (el) => docRoot.contains(el),
  addEventListener: (ev, fn, opts) => {
    const entry = { fn, signal: opts && typeof opts === 'object' ? opts.signal : null };
    (docListeners[ev] ||= []).push(entry);
    if (entry.signal) {
      entry.signal.addEventListener('abort', () => {
        docListeners[ev] = (docListeners[ev] || []).filter((x) => x !== entry);
      });
    }
  },
  dispatchClick: (target) => {
    const evt = { target, preventDefault: () => {} };
    (docListeners.click || []).forEach((e) => e.fn(evt));
  },
  dispatchInput: (target) => {
    const evt = { target, preventDefault: () => {} };
    (docListeners.input || []).forEach((e) => e.fn(evt));
  },
  dispatchKey: (key) => {
    const evt = { key, target: doc.activeElement, preventDefault: () => {} };
    (docListeners.keydown || []).forEach((e) => e.fn(evt));
  }
};

const storage = new Map();
const sandbox = {
  window: null,
  document: doc,
  localStorage: {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v))
  },
  CustomEvent: class {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
      this.cancelable = Boolean(init?.cancelable);
      this.defaultPrevented = false;
    }
    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }
  },
  getComputedStyle: () => ({ position: 'relative' }),
  console,
  AbortController,
  setTimeout,
  clearTimeout
};
sandbox.window = sandbox;
sandbox.innerWidth = 1024;
sandbox.innerHeight = 768;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.matchMedia = () => ({ matches: false, addEventListener: () => {} });
sandbox.dispatchEvent = (ev) => {
  (winListeners[ev.type] || []).forEach((fn) => fn(ev));
  return !ev.defaultPrevented;
};
sandbox.addEventListener = (ev, fn) => (winListeners[ev] ||= []).push(fn);

vm.runInNewContext(distJs, sandbox);

const SUI = sandbox.SUI;
assert('dist/sui.min.js exposes single unified window.SUI v3.0.0', SUI && SUI.version === '3.0.1', SUI?.version);
assert('SUI.toast supports both v2 .show() and v3 .success()', typeof SUI.toast.show === 'function' && typeof SUI.toast.success === 'function');

// Theme toggle test
doc.dispatchClick(themeBtn);
assert('Clicking .sui-theme-toggle flips data-theme from light to dark once', docRoot.getAttribute('data-theme') === 'dark' && !docRoot.hasAttribute('data-sui-theme'));
doc.dispatchClick(themeBtn);
assert('Clicking .sui-theme-toggle again flips data-theme back to light', docRoot.getAttribute('data-theme') === 'light');

// Navbar toggle + Escape test
doc.dispatchClick(navToggle);
assert('Navbar toggle opens menu & sets aria-expanded="true"', navMenu.classList.contains('is-open') && navToggle.getAttribute('aria-expanded') === 'true');
doc.dispatchKey('Escape');
assert('Escape closes navbar menu & restores focus to toggle button', !navMenu.classList.contains('is-open') && navToggle.getAttribute('aria-expanded') === 'false' && doc.activeElement === navToggle);

// Dual modal + focus restoration + repeated open/close test
openA.focus();
doc.dispatchClick(openA);
assert('Modal A opens, focuses input A, and locks body overflow', modalA.classList.contains('is-open') && doc.activeElement === inputA && body.style.overflow === 'hidden');
doc.dispatchKey('Escape');
assert('Escape closes Modal A, restores focus to openA, and unlocks body overflow', !modalA.classList.contains('is-open') && doc.activeElement === openA && body.style.overflow === '');

openB.focus();
doc.dispatchClick(openB);
assert('Modal B opens independently and focuses input B', modalB.classList.contains('is-open') && doc.activeElement === inputB);
SUI.modal.close('modal-b');
assert('Closing Modal B restores focus to openB and unlocks body overflow', !modalB.classList.contains('is-open') && doc.activeElement === openB && body.style.overflow === '');

// Toast test
const toastEl = SUI.toast.success('Saved!');
assert('SUI.toast.success creates toast inside #sui-toast-container with aria-live', Boolean(toastEl && doc.getElementById('sui-toast-container')?.getAttribute('aria-live') === 'polite'));

// Offcanvas + Popover + Alert API checks
assert('SUI v3.0.0 exposes offcanvas, alert, popover, carousel, and scrollspy APIs',
  typeof SUI.offcanvas?.open === 'function' &&
  typeof SUI.alert?.dismiss === 'function' &&
  typeof SUI.popover?.toggle === 'function' &&
  typeof SUI.carousel?.goTo === 'function' &&
  typeof SUI.scrollspy?.init === 'function'
);

const offcanvasEl = doc.createElement('div');
offcanvasEl.setAttribute('id', 'drawer-test');
offcanvasEl.classList.add('sui-offcanvas', 'sui-offcanvas-end');
const offBtn = doc.createElement('button');
offcanvasEl.appendChild(offBtn);
body.appendChild(offcanvasEl);

SUI.offcanvas.open('drawer-test', openA);
assert('SUI.offcanvas.open opens drawer, focuses first control, and locks body overflow',
  offcanvasEl.classList.contains('is-open') && doc.activeElement === offBtn && body.style.overflow === 'hidden'
);
doc.dispatchKey('Escape');
assert('Escape closes active Offcanvas, restores focus, and unlocks body overflow',
  !offcanvasEl.classList.contains('is-open') && doc.activeElement === openA && body.style.overflow === ''
);

const popPanel = doc.createElement('div');
popPanel.setAttribute('id', 'pop-test');
popPanel.classList.add('sui-popover-panel');
body.appendChild(popPanel);
SUI.popover.toggle('pop-test', openB);
assert('SUI.popover.toggle opens popover and Escape closes it',
  popPanel.classList.contains('is-open') && (doc.dispatchKey('Escape'), !popPanel.classList.contains('is-open'))
);

// Nested Offcanvas + Modal shared ScrollLock test
SUI.offcanvas.open('drawer-test', openA);
SUI.modal.open('modal-a', openB);
SUI.modal.close('modal-a');
const stillLockedAfterModal = body.style.overflow === 'hidden';
SUI.offcanvas.close('drawer-test');
const unlockedAfterBoth = body.style.overflow === '';
assert('Shared ScrollLock keeps body locked until both Modal and Offcanvas close', stillLockedAfterModal && unlockedAfterBoth);

// Toast positioning test
SUI.toast.setPosition('top-right');
assert('SUI.toast.setPosition applies .sui-toast-top-right class to toast container',
  doc.getElementById('sui-toast-container')?.classList.contains('sui-toast-top-right')
);

// Command Palette (Cmd+K) open, filter & Escape test
const cmdEl = doc.createElement('div');
cmdEl.setAttribute('id', 'cmd-test');
cmdEl.classList.add('sui-command');
const cmdInput = doc.createElement('input');
cmdInput.classList.add('sui-command-input');
const cmdItem1 = doc.createElement('button');
cmdItem1.classList.add('sui-command-item');
cmdItem1.textContent = 'Toggle Dark Mode';
const cmdItem2 = doc.createElement('button');
cmdItem2.classList.add('sui-command-item');
cmdItem2.textContent = 'Open Settings';
cmdEl.appendChild(cmdInput);
cmdEl.appendChild(cmdItem1);
cmdEl.appendChild(cmdItem2);
body.appendChild(cmdEl);

SUI.command.open('cmd-test', openA);
const cmdOpened = cmdEl.classList.contains('is-open') && doc.activeElement === cmdInput;
const filteredCount = SUI.command.filter(cmdEl, 'dark');
doc.dispatchKey('Escape');
const cmdClosed = !cmdEl.classList.contains('is-open') && doc.activeElement === openA && body.style.overflow === '';
assert('SUI.command opens, focuses input, filters items, and closes on Escape with focus restore',
  cmdOpened && filteredCount === 1 && cmdClosed
);

// Repeated SUI.init() safety (no duplicate listeners)
SUI.init();
SUI.init();
const themeBeforeRepeat = docRoot.getAttribute('data-theme');
doc.dispatchClick(themeBtn);
const themeAfterOneClick = docRoot.getAttribute('data-theme');
assert('Repeated SUI.init() does not duplicate click listeners', themeAfterOneClick !== themeBeforeRepeat);

// Theme system/auto mode
SUI.theme.set('system');
assert('SUI.theme.set("system") normalizes mode to "auto"', SUI.theme.getMode() === 'auto');
assert("dist/sui.min.css includes explicit [data-theme=light] and [data-theme=oled] blocks", distCss.includes("[data-theme=light]") && distCss.includes("[data-theme=oled]"));

// Verify stale localStorage dark theme does NOT hijack explicit <html data-theme="oled"> when page has no theme toggle
storage.set("sui-theme", "dark");
docRoot.setAttribute("data-theme", "oled");
body.removeChild(themeBtn);
SUI.destroy();
SUI.init();
const oledNotHijacked = docRoot.getAttribute("data-theme") === "oled";
body.appendChild(themeBtn);
storage.delete("sui-theme");
docRoot.setAttribute("data-theme", "light");
SUI.destroy();
SUI.init();
assert("Stale localStorage does not override explicit <html data-theme=oled> on pages without a theme toggle", oledNotHijacked);
SUI.theme.set('light');

// Dropdown Escape restores focus to trigger
const ddWrap = doc.createElement('div');
ddWrap.setAttribute('id', 'dd-verify');
ddWrap.classList.add('sui-dropdown');
const ddTrig = doc.createElement('button');
ddTrig.setAttribute('data-sui-dropdown-trigger', 'dd-verify');
ddWrap.appendChild(ddTrig);
body.appendChild(ddWrap);
ddTrig.focus();
doc.dispatchClick(ddTrig);
const ddIsOpen = ddWrap.classList.contains('is-open') && ddTrig.getAttribute('aria-expanded') === 'true';
doc.dispatchKey('Escape');
const ddRestored = !ddWrap.classList.contains('is-open') && doc.activeElement === ddTrig;
assert('Dropdown opens, closes on Escape, and restores focus to trigger', ddIsOpen && ddRestored);

// Dynamic form fragment: character counter + password reveal
const dynWrap = doc.createElement('div');
const dynCount = doc.createElement('span');
dynCount.setAttribute('id', 'dyn-cnt');
const dynInput = doc.createElement('input');
dynInput.setAttribute('maxlength', '20');
dynInput.setAttribute('data-sui-counter', 'dyn-cnt');
dynInput.value = 'Hello';
const dynPass = doc.createElement('input');
dynPass.setAttribute('id', 'dyn-pw');
dynPass.type = 'password';
const dynEye = doc.createElement('button');
dynEye.setAttribute('data-sui-toggle-password', 'dyn-pw');
dynWrap.appendChild(dynCount);
dynWrap.appendChild(dynInput);
dynWrap.appendChild(dynPass);
dynWrap.appendChild(dynEye);
body.appendChild(dynWrap);
SUI.init(dynWrap);
const initCountOk = dynCount.textContent === '5 / 20';
dynInput.value = 'Hello SUI';
doc.dispatchInput(dynInput);
const liveCountOk = dynCount.textContent === '9 / 20';
doc.dispatchClick(dynEye);
const pwToggleOk = dynPass.type === 'text' && dynEye.getAttribute('aria-pressed') === 'true';
assert('Dynamic fragment hydration updates character counter and password toggle', initCountOk && liveCountOk && pwToggleOk);

// Detached open modal cleanup prevents frozen body scroll
const tempModal = doc.createElement('div');
tempModal.setAttribute('id', 'temp-detach-modal');
tempModal.classList.add('sui-modal');
body.appendChild(tempModal);
SUI.modal.open('temp-detach-modal', openA);
body.removeChild(tempModal);
SUI.modal._handleDetached();
assert('Removing an open modal cleans up state and unlocks body scroll', body.style.overflow === '' && SUI.modal._stack.length === 0);

// SUI.destroy() cleans up all listeners & SUI.init() re-binds cleanly
SUI.modal.open('modal-a', openA);
SUI.destroy();
const destroyedClean = body.style.overflow === '' && (docListeners.click || []).length === 0;
SUI.init();
const reboundClean = SUI.modal.open('modal-a', openA) && SUI.modal.close('modal-a') && body.style.overflow === '';
assert('SUI.destroy() removes all global listeners & unlocks scroll; SUI.init() cleanly re-initializes', destroyedClean && reboundClean);

// New Bootstrap + Tailwind parity CSS checks
assert('dist/sui.min.css includes modal-fullscreen, navbar-expand-lg, outline color buttons, logical ms/me, stretched-link, vr, ratio',
  distCss.includes('.sui-modal-fullscreen') &&
  distCss.includes('.sui-navbar-expand-lg') &&
  distCss.includes('.sui-btn-outline-success') &&
  distCss.includes('.sui-ms-4') &&
  distCss.includes('.sui-stretched-link') &&
  distCss.includes('.sui-vr') &&
  distCss.includes('.sui-ratio-16x9') &&
  distCss.includes('.sui-flip-top')
);
assert('dist/sui.min.css includes transforms, filters, gap-x, col-span-full, bg-primary-10, 2xl, and @container utilities',
  distCss.includes('.sui-rotate-45') &&
  distCss.includes('.sui-blur-md') &&
  distCss.includes('.sui-gap-x-4') &&
  distCss.includes('.sui-col-span-full') &&
  distCss.includes('.sui-bg-primary-10') &&
  distCss.includes('.sui-2xl-grid') &&
  distCss.includes('.sui-cq-md-grid-cols-3')
);

// TypeScript definitions & CLI file checks
assert('dist/sui.d.ts exists and exports SuiRuntime',
  fs.existsSync(path.join(root, 'dist/sui.d.ts')) &&
  fs.readFileSync(path.join(root, 'dist/sui.d.ts'), 'utf8').includes('interface SuiRuntime')
);
assert('bin/sui-cli.mjs exists for tree-shaking and arbitrary-value JIT',
  fs.existsSync(path.join(root, 'bin/sui-cli.mjs'))
);

// Instance Registry + Cancelable before-close event test
const modalInst = SUI.modal.getOrCreateInstance('modal-a', { backdrop: 'static' });
assert('SUI.modal.getOrCreateInstance returns reusable instance and applies static backdrop option',
  Boolean(modalInst && modalInst === SUI.modal.getOrCreateInstance('modal-a') && modalA.getAttribute('data-sui-backdrop') === 'static')
);

let blockClose = true;
sandbox.addEventListener('sui:modal-before-close', (e) => {
  if (blockClose) e.preventDefault();
});
modalInst.open(openA);
const blocked = !modalInst.close() && modalA.classList.contains('is-open');
blockClose = false;
const closedAfterAllow = modalInst.close() && !modalA.classList.contains('is-open');
assert('Cancelable sui:modal-before-close blocks close when preventDefault() is called', blocked && closedAfterAllow);

// Smart Edge-Flip Positioner test
const edgePanel = doc.createElement('div');
edgePanel.getBoundingClientRect = () => ({ top: 600, bottom: 900, left: 950, right: 1200, width: 250, height: 220 });
SUI.positioner.adjust(edgePanel);
const flipped = edgePanel.classList.contains('sui-flip-top') && edgePanel.classList.contains('sui-flip-end');
SUI.positioner.reset(edgePanel);
assert('SUI.positioner.adjust flips panels overflowing bottom/right viewport edges', flipped && !edgePanel.classList.contains('sui-flip-top'));

// Docs CDN links, Copy buttons, Guide runtime, Sitemap, and CLI JIT checks
const docsHtmlContent = fs.readFileSync(path.join(root, "docs/index.html"), "utf8");
const docsJsContent = fs.readFileSync(path.join(root, "docs/docs.js"), "utf8");
const howToUseContent = fs.readFileSync(path.join(root, "how-to-use.html"), "utf8");
const sitemapContent = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

assert(
  "docs/index.html installation snippet uses jsDelivr @v3.0.1 CDN links (no local ./dist/ paths)",
  docsHtmlContent.includes("SUI-FRAMEWORK.CSS@v3.0.1/dist/sui.min.css") &&
  docsHtmlContent.includes("SUI-FRAMEWORK.CSS@v3.0.1/dist/sui.min.js") &&
  !docsHtmlContent.includes('"./dist/sui.min.css"') &&
  !docsHtmlContent.includes('"./dist/sui.min.js"')
);

const codeBarsCount = (docsHtmlContent.match(/class="docs-code-bar"/g) || []).length;
const copyBtnsCount = (docsHtmlContent.match(/btn-copy-code/g) || []).length;
assert(
  "All docs/index.html code bars have Copy buttons wired in docs/docs.js",
  codeBarsCount > 0 && copyBtnsCount === codeBarsCount && docsJsContent.includes(".btn-copy-code"),
  copyBtnsCount + "/" + codeBarsCount + " code bars"
);

assert(
  "how-to-use.html loads dist/sui.min.js and links to the actual repository",
  howToUseContent.includes("<script defer src=\"dist/sui.min.js\"></script>") &&
  howToUseContent.includes("Suman-11-web/SUI-FRAMEWORK.CSS") &&
  !/nav-github-btn" href="[^"]+\.com"/.test(howToUseContent)
);

const sitemapUrls = (sitemapContent.match(/<loc>/g) || []).length;
assert("sitemap.xml lists all 12 live HTML pages", sitemapUrls === 12, sitemapUrls + " URLs");

const tmpHtml = "/tmp/sui_verify_jit.html";
const tmpOut = "/tmp/sui_verify_jit.css";
fs.writeFileSync(
  tmpHtml,
  "<div class=\"sui-flex sui-md-w-1/2 sui-w-[342px] sui-hover:sui-bg-[#123456]\">Test</div>",
  "utf8"
);
execFileSync(process.execPath, [path.join(root, "bin/sui-cli.mjs"), "--content", tmpHtml, "--output", tmpOut], { cwd: root });
const jitOut = fs.readFileSync(tmpOut, "utf8");
assert(
  "bin/sui-cli.mjs purges unused utilities, keeps escaped sui-md-w-1/2, and compiles arbitrary JIT rules",
  jitOut.length < distCss.length &&
  jitOut.includes(".sui-md-w-1\\/2") &&
  jitOut.includes(".sui-w-\\[342px\\]{width:342px}") &&
  jitOut.includes(".sui-hover\\:sui-bg-\\[\\#123456\\]:hover{background-color:#123456}"),
  distCss.length + " B -> " + jitOut.length + " B"
);
fs.unlinkSync(tmpHtml);
fs.unlinkSync(tmpOut);

console.log(`\nSUI.css Automated Verification: ${checks.filter((c) => c.pass).length}/${checks.length} passed\n`);
for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
