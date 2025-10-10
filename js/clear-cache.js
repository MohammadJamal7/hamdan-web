// Helper script to clear caches and unregister service workers
function clearCachesAndServiceWorker() {
  console.log('Attempting to clear caches and unregister service worker...');
  
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        console.log('Deleting cache:', cacheName);
        caches.delete(cacheName).then(function(success) {
          console.log(`Cache ${cacheName} ${success ? 'deleted' : 'deletion failed'}`);
        });
      });
    });
  }
  
  // Unregister service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        console.log('Unregistering service worker:', registration);
        registration.unregister().then(function(success) {
          console.log(`Service worker unregistration ${success ? 'successful' : 'failed'}`);
        });
      }
    });
  }
  
  console.log('Cache clearing complete. Please reload the page.');
  alert('Cache cleared successfully! Please reload the page to load the latest version.');
}

// Add a button to the page for easy cache clearing
function addClearCacheButton() {
  const button = document.createElement('button');
  button.textContent = 'Clear Cache & Reload';
  button.style.position = 'fixed';
  button.style.bottom = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '8px 12px';
  button.style.backgroundColor = '#dc3545';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', function() {
    clearCachesAndServiceWorker();
    setTimeout(() => {
      window.location.reload(true);
    }, 1000);
  });
  
  document.body.appendChild(button);
}

// Execute when the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addClearCacheButton);
} else {
  addClearCacheButton();
}
