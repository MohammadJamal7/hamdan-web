// Edit Profile JavaScript for Hamdan Web App

document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    loadUserProfile();

    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', updateProfile);
    }
});

function populateProfileForm(user) {
    const nameParts = user.name ? user.name.split(' ') : ['', ''];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    document.getElementById('firstName').value = firstName;
    document.getElementById('lastName').value = lastName;
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('email').value = user.email || '';
    const profilePictures = document.querySelectorAll('img[alt="Profile"], #profileImage');
    if (user.image) {
        let imgUrl = user.image;
        if (!/^https?:\/\//.test(imgUrl)) {
            imgUrl = 'http://localhost:3000/' + imgUrl.replace(/^\/*/, '');
        }
        profilePictures.forEach(img => {
            img.src = imgUrl;
        });
    }
}

async function loadUserProfile() {
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                populateProfileForm(user);
            } catch (error) {
                localStorage.removeItem('user');
            }
        }
        const data = await apiRequest('/profile');
        if (data && data.success && data.data) {
            localStorage.setItem('user', JSON.stringify(data.data));
            populateProfileForm(data.data);
        } else {
            showToast('فشل تحميل بيانات الملف الشخصي', 'danger');
        }
    } catch (error) {
        showToast('حدث خطأ أثناء تحميل بيانات الملف الشخصي', 'danger');
    }
}

function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = 1100;
        document.body.appendChild(toastContainer);
    }
    const toastId = `toast-${Date.now()}`;
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    const toastEl = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
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
        //const response = await fetch(`http://localhost:3000/api${endpoint}`, options);
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
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

async function updateProfile(e) {
    e.preventDefault();
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const imageFile = document.getElementById('profilePicture').files[0];
    if (!firstName || !lastName || !phone || !email) {
        showToast('يرجى ملء جميع الحقول المطلوبة', 'danger');
        return;
    }
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحميل...';
    submitBtn.disabled = true;
    // Show loading overlay
    document.getElementById('loadingOverlay').style.display = 'flex';
    const formData = new FormData();
    formData.append('name', `${firstName} ${lastName}`);
    formData.append('phone', phone);
    formData.append('email', email);
    if (imageFile) {
        formData.append('image', imageFile);
    }
    try {
        const data = await apiRequest('/profile', 'PUT', formData);
        if (data && data.success) {
            localStorage.setItem('user', JSON.stringify(data.data));
            showToast('تم تحديث الملف الشخصي بنجاح', 'success');
            // Update image preview
            if (data.data.image) {
                const profilePictures = document.querySelectorAll('img[alt="Profile"], #profileImage');
                let imgUrl = data.data.image;
                if (!/^https?:\/\//.test(imgUrl)) {
                    imgUrl = 'https://api.hamdan.help/' + imgUrl.replace(/^\/*/, '');
                }
                profilePictures.forEach(img => {
                    img.src = imgUrl;
                });
            }
        } else {
            showToast(data?.message || 'فشل تحديث الملف الشخصي', 'danger');
        }
    } catch (error) {
        showToast('فشل تحديث الملف الشخصي', 'danger');
    } finally {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';
    }
} 