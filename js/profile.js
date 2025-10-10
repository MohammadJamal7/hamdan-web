// Profile JavaScript for Hamdan Web App

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    loadUserProfile();
    
    // Initialize support links functionality
    const supportLinksTrigger = document.querySelector('[data-bs-target="#supportLinksList"]');
    const supportLinksList = document.getElementById('supportLinksList');
    
    if (supportLinksTrigger && supportLinksList) {
        // Listen for the show.bs.collapse event (when the dropdown is about to be shown)
        supportLinksList.addEventListener('show.bs.collapse', async function() {
            const loadingElement = document.getElementById('supportLinksLoading');
            
            // Only load if we haven't loaded before
            if (supportLinksList.children.length <= 1) { // 1 for the loading element
                try {
                    console.log('Loading support links...');
                    await loadSupportLinks();
                } catch (error) {
                    console.error('Error loading support links:', error);
                    if (loadingElement) {
                        loadingElement.innerHTML = `
                            <div class="alert alert-danger m-2">
                                تعذر تحميل روابط الدعم. يرجى المحاولة مرة أخرى.
                            </div>
                        `;
                    }
                }
            }
        });
    }

    // Add event listener for delete account confirmation
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deleteAccount);
    }
});

async function loadSupportLinks() {
    const loadingElement = document.getElementById('supportLinksLoading');
    const linksList = document.getElementById('supportLinksList');
    
    if (!linksList) return;
    
    try {
        // Show loading state
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        // Make the API request
        const data = await apiRequest('/settings/support-links');
        
        // Hide loading state
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Render the links if we got data
        if (data && data.success && data.data) {
            renderSupportLinks(data.data);
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Failed to load support links:', error);
        // Show error message to user
        if (linksList) {
            linksList.innerHTML = `
                <div class="alert alert-danger m-2">
                    تعذر تحميل روابط الدعم. يرجى المحاولة مرة أخرى لاحقًا.
                </div>
            `;
        }
    }
}

function renderSupportLinks(links) {
    const linksList = document.getElementById('supportLinksList');
    const loadingElement = document.getElementById('supportLinksLoading');
    
    if (!linksList) return;
    
    // Hide loading element if it exists
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    let html = '';
    let hasLinks = false;
    
    // Add WhatsApp link if available
    if (links.whatsapp) {
        hasLinks = true;
        html += `
            <a href="${links.whatsapp}" target="_blank" class="text-decoration-none">
                <div class="card border-0 rounded-0 border-top">
                    <div class="card-body d-flex align-items-center">
                        <div class="rounded-circle bg-light p-2 me-3">
                            <i class="fab fa-whatsapp text-success"></i>
                        </div>
                        <span>واتساب</span>
                    </div>
                </div>
            </a>
        `;
    }

    // Add Telegram link if available
    if (links.telegram) {
        hasLinks = true;
        html += `
            <a href="${links.telegram}" target="_blank" class="text-decoration-none">
                <div class="card border-0 rounded-0 border-top">
                    <div class="card-body d-flex align-items-center">
                        <div class="rounded-circle bg-light p-2 me-3">
                            <i class="fab fa-telegram text-primary"></i>
                        </div>
                        <span>تيليجرام</span>
                    </div>
                </div>
            </a>
        `;
    }

    // Add Snapchat link if available
    if (links.snapchat) {
        hasLinks = true;
        html += `
            <a href="${links.snapchat}" target="_blank" class="text-decoration-none">
                <div class="card border-0 rounded-0 border-top">
                    <div class="card-body d-flex align-items-center">
                        <div class="rounded-circle bg-light p-2 me-3">
                            <i class="fab fa-snapchat-ghost text-warning"></i>
                        </div>
                        <span>سناب شات</span>
                    </div>
                </div>
            </a>
        `;
    }

    // If no links were found
    if (!hasLinks) {
        html = `
            <div class="p-3 text-center text-muted">
                لا توجد روابط دعم متاحة حاليًا.
            </div>
        `;
    }
    
    // Insert the HTML into the container
    linksList.innerHTML = `
        <div class="p-3">
            ${html}
        </div>
    `;
}

async function loadUserProfile() {
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                updateProfileUI(user);
            } catch (error) {
                localStorage.removeItem('user');
            }
        }
        const data = await apiRequest('/profile');
        if (data && data.success && data.data) {
            localStorage.setItem('user', JSON.stringify(data.data));
            updateProfileUI(data.data);
        }
    } catch (error) {
        // Optionally show a toast or fallback
    }
}

function updateProfileUI(user) {
    // Update profile name
    const profileName = document.getElementById('profileName');
    if (profileName) {
        profileName.textContent = user.name || user.username || 'المستخدم';
    }
    // Update profile picture if available
    const profilePictures = document.querySelectorAll('img[alt="Profile"], #profileImage');
    if (user.image) {
        let imgUrl = user.image;
        if (!/^https?:\/\//.test(imgUrl)) {
            imgUrl = 'https://api.hamdan.help/' + imgUrl.replace(/^\//, '');
        }
        profilePictures.forEach(img => {
            img.src = imgUrl;
        });
    }
}

// Delete Account Function
async function deleteAccount() {
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const token = localStorage.getItem('token');
    
    if (!confirmDeleteBtn || !token) {
        alert('خطأ في التحقق من الهوية. يرجى تسجيل الدخول مرة أخرى.');
        window.location.href = 'login.html';
        return;
    }
    
    // Show loading state
    confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحذف...';
    confirmDeleteBtn.disabled = true;
    
    try {
        const response = await fetch('https://api.hamdan.help/api/delete-account', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                
                localStorage.clear();
                window.location.href = 'login.html';
            } else {
                throw new Error(result.message || 'فشل في حذف الحساب');
            }
        } else {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = 'حدث خطأ أثناء حذف الحساب.';
            if (response.status === 401) {
                errorMessage = 'انتهت صلاحية جلسة الدخول. يرجى تسجيل الدخول مرة أخرى.';
                localStorage.clear();
                window.location.href = 'login.html';
            } else if (response.status === 404) {
                errorMessage = 'الخدمة غير متوفرة حالياً. يرجى المحاولة لاحقاً.';
            } else if (errorData.message) {
                errorMessage = errorData.message;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Delete account error:', error);
        alert(error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    } finally {
        // Reset button state
        confirmDeleteBtn.innerHTML = 'تأكيد الحذف';
        confirmDeleteBtn.disabled = false;
    }
}

async function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        console.error('Toast container not found. Please add <div class="toast-container"></div> to your HTML.');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type} show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    const iconColor = type === 'success' ? '#28a745' : '#dc3545';

    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-${icon} toast-icon" style="color: ${iconColor}"></i>
            <strong class="me-auto">${type === 'success' ? 'نجاح' : 'خطأ'}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    toastContainer.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function apiRequest(endpoint, method = 'GET', data = null) {
    try {
        const token = localStorage.getItem('token');
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        };
        if (data && method !== 'GET') {
            if (data instanceof FormData) {
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }
        const response = await fetch(`https://api.hamdan.help/api${endpoint}`, options);
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return null;
        }
        const responseData = await response.json();
        return responseData;
    } catch (error) {
        // Optionally show a toast or fallback
        throw error;
    }
}

// Password visibility toggle functionality
$(document).ready(async function() {
    $('.toggle-password').on('click', function() {
        const button = $(this);
        const input = button.siblings('input');
        const icon = button.find('i');
        
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        } else {
            input.attr('type', 'password');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        }
    });

    // Password change functionality
    $('#savePasswordBtn').on('click', async function() {
        const newPassword = $('#newPassword').val();
        const confirmNewPassword = $('#confirmNewPassword').val();
        
        // Validation
        if (!newPassword || !confirmNewPassword) {
            alert('يرجى ملء جميع الحقول');
            return;
        }
        
        if (newPassword.length < 6) {
            alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }
        
        if (newPassword !== confirmNewPassword) {
            alert('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
            return;
        }
        
        try {
            const data = await apiRequest('/change-password', 'POST', { newPassword });
            
            if (data.success) {
                showToast('تم تغيير كلمة المرور بنجاح!', 'success');
                $('#changePasswordModal').modal('hide');
                $('#newPassword').val('');
                $('#confirmNewPassword').val('');
            } else {
                showToast(data.message || 'فشل تغيير كلمة المرور.', 'error');
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('حدث خطأ أثناء تغيير كلمة المرور');
        }
    });
});