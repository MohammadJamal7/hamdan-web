// Top Navigation Web Component
class TopNav extends HTMLElement {
    connectedCallback() {
        const pageTitle = this.getAttribute('page-title');
        const backUrl = this.getAttribute('back-url');
        const hideSupport = this.hasAttribute('hide-support');
        
        let leftContent = `
            <a href="notifications.html" class="text-white position-relative" title="الإشعارات">
                <i class="fas fa-bell fa-lg"></i>
                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="navNotificationBadge" style="display: none;">.</span>
            </a>
        `;
        
        if (backUrl) {
            leftContent = `
                <a href="${backUrl}" class="text-white" title="رجوع">
                    <i class="fas fa-arrow-right fa-lg"></i>
                </a>
            `;
        }

        let titleContent = '';
        if (pageTitle) {
            titleContent = `<h5 class="text-white mb-0 mx-2 text-center text-truncate flex-grow-1">${pageTitle}</h5>`;
        }

        let rightActions = `
            <!-- Theme Toggle Button -->
            <button class="btn btn-sm btn-outline-light" data-theme-toggle title="تبديل الوضع">
                <i class="fas fa-moon"></i>
            </button>
            <!-- PWA Install Button -->
            <button id="installBtnNav" class="btn btn-sm btn-outline-light d-none" title="ثبت التطبيق">
                <i class="fas fa-download"></i> <span class="d-none d-md-inline">ثبت التطبيق</span>
            </button>
        `;

        if (!hideSupport) {
            rightActions += `
            <!-- Support Button -->
            <a href="https://t.me/hamdan2S" class="btn btn-sm btn-outline-light" title="التواصل مع الدعم" target="_blank">
                <i class="fas fa-headset me-1"></i> <span class="d-none d-sm-inline">التواصل مع الدعم</span>
            </a>
            `;
        }

        this.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark custom-gradient-navbar" style="background: linear-gradient(90deg, #213f63 0%, #051a23 100%) !important;">
            <div class="container">
                <div class="d-flex justify-content-between w-100 align-items-center">
                    <!-- Left Side -->
                    <div class="d-flex align-items-center">
                        ${leftContent}
                    </div>

                    <!-- Center Title -->
                    ${titleContent}

                    <!-- Right side - Actions -->
                    <div class="d-flex align-items-center gap-2">
                        ${rightActions}
                    </div>
                </div>
            </div>
        </nav>
        `;

        // Attach click handler to theme toggle button directly
        const themeToggleBtn = this.querySelector('[data-theme-toggle]');
        if (themeToggleBtn && window.themeManager) {
            themeToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Theme toggle button clicked');
                window.themeManager.toggleTheme();
            });
            // Update the button appearance with current theme
            window.themeManager.updateToggleButton(window.themeManager.getCurrentTheme());
        }

        // Also re-initialize the theme manager toggle buttons as backup
        if (window.themeManager && typeof window.themeManager.addToggleListeners === 'function') {
            window.themeManager.addToggleListeners();
        }
    }
}
customElements.define('top-nav', TopNav);
