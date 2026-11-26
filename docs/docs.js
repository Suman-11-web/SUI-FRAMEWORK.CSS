document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('docsMenuToggle');
  const closeBtn = document.getElementById('docsSidebarClose');
  const sidebar = document.getElementById('docsSidebar');
  const backdrop = document.getElementById('docsBackdrop');

  function openSidebar() {
    sidebar?.classList.add('is-open');
    backdrop?.classList.add('is-open');
    toggleBtn?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    sidebar?.classList.remove('is-open');
    backdrop?.classList.remove('is-open');
    toggleBtn?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggleBtn?.addEventListener('click', () => {
    if (sidebar?.classList.contains('is-open')) closeSidebar();
    else openSidebar();
  });
  closeBtn?.addEventListener('click', closeSidebar);
  backdrop?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar?.classList.contains('is-open')) closeSidebar();
  });

  document.querySelectorAll('#docsNav a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 992) closeSidebar();
    });
  });

  const searchInput = document.getElementById('docsSearch');
  searchInput?.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    document.querySelectorAll('#docsNav .docs-nav-link').forEach((link) => {
      const match = !q || link.textContent.toLowerCase().includes(q);
      link.style.display = match ? '' : 'none';
    });
  });

  const hueSlider = document.getElementById('hueSlider');
  const hueValue = document.getElementById('hueValue');
  hueSlider?.addEventListener('input', () => {
    document.documentElement.style.setProperty('--sui-brand-hue', hueSlider.value);
    if (hueValue) hueValue.textContent = hueSlider.value;
  });

  document.querySelectorAll('[data-demo-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.SUI?.theme.set(btn.getAttribute('data-demo-theme'));
    });
  });

  document.querySelectorAll('[data-demo-toast]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.getAttribute('data-demo-toast');
      const messages = {
        success: ['Changes saved to disk!', 'Saved'],
        info: ['SUI.css v3.0.0 is active.', 'Info'],
        warning: ['Check your CDN tag.', 'Warning'],
        error: ['Connection failed.', 'Error']
      };
      const [msg, title] = messages[kind] || ['Hello from SUI.css', 'Notice'];
      window.SUI?.toast[kind]?.(msg, title);
    });
  });

  document.getElementById('demoForm')?.addEventListener('submit', (e) => e.preventDefault());
});
