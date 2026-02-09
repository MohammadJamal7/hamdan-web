// Main JavaScript for Hamdan Web App

// Base API URL - Update this to your actual API URL
 const API_BASE_URL = 'https://api.hamdan.help/api'; // Production API URL
 //const API_BASE_URL = 'http://localhost:3000/api'; // development API URL

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if not on login or register page
        if (!window.location.pathname.includes('index.html') &&
            !window.location.pathname.includes('register.html')) {
            window.location.href = 'index.html';
        }
    } else {
        // Redirect to dashboard if on login or register page
        if (window.location.pathname.includes('index.html') ||
            window.location.pathname.includes('register.html')) {
            window.location.href = 'dashboard.html';
        }
    }
}

// Toggle password visibility
function setupPasswordToggles() {
    $('.toggle-password').on('click', function() {
        const passwordInput = $(this).siblings('input');
        const icon = $(this).find('i');

        if (passwordInput.attr('type') === 'password') {
            passwordInput.attr('type', 'text');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            passwordInput.attr('type', 'password');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });
}

// Format date to time ago
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' سنوات مضت';
    if (interval === 1) return 'سنة مضت';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' أشهر مضت';
    if (interval === 1) return 'شهر مضى';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' أيام مضت';
    if (interval === 1) return 'يوم مضى';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' ساعات مضت';
    if (interval === 1) return 'ساعة مضت';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' دقائق مضت';
    if (interval === 1) return 'دقيقة مضت';

    if (seconds < 10) return 'الآن';

    return Math.floor(seconds) + ' ثوان مضت';
}

// API request helper
async function apiRequest(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers
    };

    if (data && (method === 'POST' || method === 'PUT')) {
        config.body = JSON.stringify(data);
    }

    try {
        console.log(`API Request: ${method} ${API_BASE_URL}${endpoint}`, data);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        let result;

        try {
            result = await response.json();
        } catch (e) {
            console.error('Error parsing JSON response:', e);
            result = { success: false, message: 'Invalid JSON response from server' };
        }

        console.log(`API Response: ${response.status}`, result);

        if (!response.ok) {
            // Handle token expiration
            if (response.status === 401) {
                // Clear token and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');

                // Only redirect if not already on login page
                if (!window.location.pathname.includes('index.html')) {
                    showToast('انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.', 'danger');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 2000);
                }
            }

            throw new Error(result.message || 'حدث خطأ ما');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    if (!$('#toastContainer').length) {
        $('body').append('<div id="toastContainer" class="position-fixed top-0 end-0 p-3" style="z-index: 1100;"></div>');
    }

    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    // Add toast to container
    $('#toastContainer').append(toastHtml);

    // Initialize and show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    // Remove toast after it's hidden
    $(toastElement).on('hidden.bs.toast', function() {
        $(this).remove();
    });
}

// Periodic token validity check - detect force logout immediately
function startTokenValidationCheck() {
    // Function to validate token
    async function validateToken() {
        const token = localStorage.getItem('token');
        
        // Only check if user is logged in and not on auth pages
        if (!token || window.location.pathname.includes('index.html') || window.location.pathname.includes('register.html')) {
            return;
        }
        
        try {
            console.log('🔍 Validating token...');
            
            // Make a simple API call to check if token is still valid
            const response = await fetch(`${API_BASE_URL}/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('✓ Token validation response:', response.status);
            
            // If we get 401, token has been revoked - logout immediately
            if (response.status === 401) {
                console.log('🔴 Token has been revoked - Force logout detected!');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                showToast('انتهت صلاحية جلستك. تم تسجيل خروجك.', 'danger');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            }
        } catch (error) {
            // Silently ignore network errors - don't want to spam logs
            console.debug('Token validation check failed (network):', error.message);
        }
    }
    
    // Check immediately on page load
    validateToken();
    
    // Then check every 10 seconds
    setInterval(validateToken, 10000);
}

// Document ready
$(document).ready(function() {
    // Check authentication
    checkAuth();

    // Setup password toggles
    setupPasswordToggles();
    
    // Start periodic token validation (detects force logout)
    startTokenValidationCheck();

    // Logout button handler
    $('#logoutBtn').on('click', function() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
});
