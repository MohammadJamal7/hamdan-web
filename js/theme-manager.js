// Theme Manager - Handle Light/Dark Mode Toggle
class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'hamdan-theme-mode';
        this.THEME_ATTRIBUTE = 'data-theme';
        // Apply theme synchronously during construction
        this.init();
    }

    init() {
        // Load saved theme or detect system preference IMMEDIATELY
        const savedTheme = this.getSavedTheme();
        const systemTheme = this.getSystemTheme();
        const themeToApply = savedTheme || systemTheme || 'dark';
        
        // Apply theme immediately without transitions
        this.applyThemeImmediately(themeToApply);
        
        // Wait for DOM to be fully loaded before adding event listeners
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.addToggleListeners();
                this.updateToggleButton(this.getCurrentTheme());
            });
        } else {
            this.addToggleListeners();
            this.updateToggleButton(this.getCurrentTheme());
        }
    }

    applyThemeImmediately(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            theme = 'dark';
        }
        
        // Apply without transitions to avoid flash
        document.documentElement.classList.add('theme-switching');
        document.documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        
        // Force repaint immediately
        requestAnimationFrame(() => {
            this.forceStyleUpdate();
        });
        
        // Remove switching class
        setTimeout(() => {
            document.documentElement.classList.remove('theme-switching');
        }, 80);
    }

    getSavedTheme() {
        return localStorage.getItem(this.STORAGE_KEY);
    }

    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'dark'; // Default to dark if no system preference
    }

    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            theme = 'dark';
        }
        
        // Add switching class to disable transitions temporarily
        document.documentElement.classList.add('theme-switching');
        
        // Set the data-theme attribute
        document.documentElement.setAttribute(this.THEME_ATTRIBUTE, theme);
        
        // Store preference
        localStorage.setItem(this.STORAGE_KEY, theme);
        
        // Update toggle button
        this.updateToggleButton(theme);
        
        // Force thorough repaint on next frame
        requestAnimationFrame(() => {
            this.forceStyleUpdate();
        });
        
        // Remove the switching class after the paint occurs
        setTimeout(() => {
            document.documentElement.classList.remove('theme-switching');
        }, 80);
    }
    
    forceStyleUpdate() {
        // Force massive repaint by briefly hiding and showing
        try {
            document.documentElement.style.display = 'none';
            // eslint-disable-next-line no-unused-expressions
            document.documentElement.offsetHeight;
            document.documentElement.style.display = '';
        } catch (e) {
            console.error(e);
        }
        
        // Specifically target and force repaint on bottom nav MULTIPLE TIMES
        try {
            const bottomNav = document.querySelector('nav.navbar.fixed-bottom');
            if (bottomNav) {
                // First repaint
                bottomNav.style.display = 'none';
                // eslint-disable-next-line no-unused-expressions
                bottomNav.offsetHeight;
                bottomNav.style.display = '';
                
                // Force recalculation on all nav links
                const navLinks = bottomNav.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    // eslint-disable-next-line no-unused-expressions
                    link.offsetHeight;
                });
                
                // Additional repaint trigger
                setTimeout(() => {
                    bottomNav.style.display = 'none';
                    // eslint-disable-next-line no-unused-expressions
                    bottomNav.offsetHeight;
                    bottomNav.style.display = '';
                }, 10);
            }
        } catch (e) {
            console.error(e);
        }
    }

    getCurrentTheme() {
        return document.documentElement.getAttribute(this.THEME_ATTRIBUTE) || 'dark';
    }

    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
        return newTheme;
    }

    addToggleListeners() {
        // Find all theme toggle buttons
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        console.log('Found toggle buttons:', toggleButtons.length);
        
        toggleButtons.forEach((button, index) => {
            // Remove any existing listeners by cloning and replacing
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add new listener to the cloned button
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Toggle button clicked (index:', index, ')');
                this.toggleTheme();
            });
        });

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
                if (!this.getSavedTheme()) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    updateToggleButton(theme) {
        const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
        toggleButtons.forEach(button => {
            const icon = button.querySelector('i');
            if (icon) {
                if (theme === 'dark') {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                    button.setAttribute('title', 'Switch to Light Mode');
                } else {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                    button.setAttribute('title', 'Switch to Dark Mode');
                }
            }
        });
    }
}

// Initialize theme manager immediately so it applies before rendering
window.themeManager = new ThemeManager();
