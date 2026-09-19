// src/sui.js
// Sui.css Interactive Component Engine v1.0

document.addEventListener('DOMContentLoaded', () => {
  
  /* --------------------------------------------------------------------------
     1. SCROLL ANIMATIONS (Intersection Observer)
     Triggers luxury entry animations exactly when elements enter the viewport.
     -------------------------------------------------------------------------- */
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        // Add a class to finalize the state if needed
        entry.target.classList.add('sui-animated');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Pause animations initially so they only run when scrolled into view
  document.querySelectorAll('[class*="sui-animate-"]').forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });


  /* --------------------------------------------------------------------------
     2. THEME ENGINE (Dark/Light Mode Toggle)
     -------------------------------------------------------------------------- */
  const themeToggles = document.querySelectorAll('.sui-theme-toggle');
  
  // Check local storage or OS preference
  const currentTheme = localStorage.getItem('sui-theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  
  if (currentTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  themeToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const newTheme = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('sui-theme', newTheme);
    });
  });


  /* --------------------------------------------------------------------------
     3. TAB SWITCHER
     -------------------------------------------------------------------------- */
  document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
      const parent = button.closest('.showcase-block, .sui-tabs-container');
      if (!parent) return;

      parent.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      parent.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
      
      button.classList.add('active');
      const targetId = button.getAttribute('data-target');
      const targetPanel = document.getElementById(targetId);
      if(targetPanel) targetPanel.classList.add('active');
    });
  });


  /* --------------------------------------------------------------------------
     4. MODALS & DIALOGS
     -------------------------------------------------------------------------- */
  const openModalBtns = document.querySelectorAll('[data-sui-modal-target]');
  const closeModalBtns = document.querySelectorAll('[data-sui-modal-close]');

  openModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-sui-modal-target');
      document.getElementById(modalId).classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    });
  });

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.sui-dialog-overlay');
      if(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  });

  // Close modal on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.sui-dialog-overlay.active').forEach(modal => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
  });


  /* --------------------------------------------------------------------------
     5. DISMISSIBLE ALERTS & TOASTS
     -------------------------------------------------------------------------- */
  document.querySelectorAll('.sui-dismiss').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const element = e.target.closest('.sui-toast, .sui-alert');
      if (element) {
        element.style.opacity = '0';
        setTimeout(() => element.remove(), 300); // Wait for fade out
      }
    });
  });


  /* --------------------------------------------------------------------------
     6. FORM UTILITIES (OTP Auto-Advance & Validation)
     -------------------------------------------------------------------------- */
  document.querySelectorAll('.sui-otp-group').forEach(group => {
    const inputs = group.querySelectorAll('input');
    inputs.forEach((input, index) => {
      input.addEventListener('keyup', (e) => {
        if (e.key >= 0 && e.key <= 9 && index < inputs.length - 1) {
          inputs[index + 1].focus();
        } else if (e.key === 'Backspace' && index > 0) {
          inputs[index - 1].focus();
        }
      });
    });
  });

  /* --------------------------------------------------------------------------
     7. MOBILE RESPONSIVENESS (Menu Toggles)
     -------------------------------------------------------------------------- */
  document.querySelectorAll('.sui-mobile-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const targetMenu = document.getElementById(targetId);
      if(targetMenu) {
        targetMenu.classList.toggle('active');
        btn.classList.toggle('is-open');
      }
    });
  });

});

/* --------------------------------------------------------------------------
     8. SUI NATIVE SYNTAX HIGHLIGHTER (Auto-Detect Engine)
     -------------------------------------------------------------------------- */
  document.querySelectorAll('pre code').forEach(block => {
    let code = block.innerHTML;

    // Auto-detect language based on content brackets
    const isHTML = code.includes('&lt;') || code.includes('<');

    if (!isHTML) {
      // Parse CSS
      code = code
        .replace(/(\/\*[\s\S]*?\*\/)/g, '§COMMENT§$1§END§')
        .replace(/([a-zA-Z0-9\-\.\:]+)(?=\s*\{)/g, '§SELECTOR§$1§END§')
        .replace(/(--[a-zA-Z0-9\-]+|[a-zA-Z\-]+)(?=\s*:)/g, '§PROP§$1§END§')
        .replace(/(oklch|clamp|var|calc)(?=\()/g, '§FUNC§$1§END§')
        .replace(/(:?\s*)([0-9\.]+[a-zA-Z%]*|#[0-9a-fA-F]+)(?=[;\s}])/g, '$1§VAL§$2§END§');
    } else {
      // Parse HTML
      code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Ensure safety
      code = code
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '§COMMENT§$1§END§')
        .replace(/("[^"]*")/g, '§VALUE§$1§END§')
        .replace(/(&lt;\/?)([a-zA-Z0-9\-]+)/g, '$1§TAG§$2§END§')
        .replace(/([a-zA-Z\-]+)(?=\=)/g, '§ATTR§$1§END§')
        .replace(/(&lt;|&gt;)/g, '§PUNC§$1§END§');
    }

    // Render DOM Spans
    code = code
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

    block.innerHTML = code;
  });