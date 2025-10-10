(function(){
  // Service worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('sw.js')
        .then(function(reg) { /* SW registered */ })
        .catch(function(err) { /* SW registration failed */ });
    });
  }

  // Custom install prompt handling
  let deferredPrompt = null;
  let installed = false;

  function showElement(el) { if (el) el.classList.remove('d-none'); }
  function hideElement(el) { if (el) el.classList.add('d-none'); }

  // Helper: wire a button by selector to trigger install
  window.initPWAInstallButton = function(selector){
    const btn = document.querySelector(selector);
    if (!btn) return;
    if (deferredPrompt && !installed) {
      showElement(btn);
    } else {
      hideElement(btn);
    }
    btn.addEventListener('click', async function(){
      if (!deferredPrompt) return;
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          deferredPrompt = null;
          hideElement(btn);
        }
      } catch (e) { /* ignore */ }
    });
  }

  // Fallback: inject a floating install button if none exists (opt-in only)
  function ensureFloatingButton(){
    if (!window.PWA_ALLOW_FAB) return null;
    if (document.querySelector('#pwaInstallFab')) return;
    const fab = document.createElement('button');
    fab.id = 'pwaInstallFab';
    fab.textContent = 'تثبيت التطبيق';
    fab.className = 'btn btn-primary d-none';
    fab.style.position = 'fixed';
    fab.style.bottom = '16px';
    fab.style.left = '16px';
    fab.style.zIndex = '1050';
    fab.style.borderRadius = '999px';
    fab.style.padding = '10px 14px';
    document.body.appendChild(fab);
    fab.addEventListener('click', async function(){
      if (!deferredPrompt) return;
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch(e) { /* ignore */ }
    });
    return fab;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    // Notify page scripts
    window.dispatchEvent(new CustomEvent('pwa-install-available'));

    // Try to show known buttons
    const indexBtn = document.querySelector('#installBtn');
    const navBtn = document.querySelector('#installBtnNav');
    const anyBtn = indexBtn || navBtn;
    if (anyBtn) { showElement(anyBtn); }
    else {
      const fab = ensureFloatingButton();
      if (fab) showElement(fab);
    }
  });

  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredPrompt = null;
    // Hide any install buttons
    const btns = document.querySelectorAll('#installBtn, #installBtnNav, #pwaInstallFab');
    btns.forEach(hideElement);
  });
})();
