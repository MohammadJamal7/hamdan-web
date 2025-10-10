// Profile JavaScript for Hamdan Web App

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
        return;
    }

    // Load user profile data
    loadUserProfile();

    // Handle logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Handle change password button
    const savePasswordBtn = document.getElementById('savePasswordBtn');
    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', changePassword);
    }

    // Handle delete account button
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', deleteAccount);
    }

    // Handle profile picture change
    const saveProfilePicBtn = document.getElementById('saveProfilePicBtn');
    if (saveProfilePicBtn) {
        saveProfilePicBtn.addEventListener('click', updateProfilePicture);
    }

    // Toggle password visibility
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.closest('.input-group').querySelector('input');
            if (input.type === 'password') {
                input.type = 'text';
                this.querySelector('i').classList.remove('fa-eye-slash');
                this.querySelector('i').classList.add('fa-eye');
            } else {
                input.type = 'password';
                this.querySelector('i').classList.remove('fa-eye');
                this.querySelector('i').classList.add('fa-eye-slash');
            }
        });
    });
});

// Load user profile data
async function loadUserProfile() {
    try {
        // Show loading state
        const profileName = document.getElementById('profileName');
        const originalText = profileName.textContent;
        profileName.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحميل...';

        // Try to get user data from localStorage first for immediate display
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            updateProfileUI(user);
        }

        // Then fetch the latest data from the API
        const token = localStorage.getItem('token');
        console.log('Token:', token);

        console.log('Fetching profile from:', 'https://api.hamdan.help/api/profile');
        const response = await fetch('https://api.hamdan.help/api/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Response status:', response.status);

        // Check if unauthorized
        if (response.status === 401) {
            console.log('Unauthorized access');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        const responseText = await response.text();
        console.log('Response text:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
            console.log('Profile response:', data);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            throw new Error('Invalid JSON response');
        }

        if (data.success && data.data) {
            // Update localStorage with the latest user data
            localStorage.setItem('user', JSON.stringify(data.data));

            // Update the UI with the latest data
            updateProfileUI(data.data);
        } else {
            console.error('Failed to load profile data:', data.message);
            profileName.textContent = originalText;
            alert('فشل تحميل بيانات الملف الشخصي');
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
        document.getElementById('profileName').textContent = 'اسم المستخدم';
        alert('حدث خطأ أثناء تحميل بيانات الملف الشخصي');
    }
}

// Update profile UI with user data
function updateProfileUI(user) {
    // Update profile name
    const profileName = document.getElementById('profileName');
    if (profileName) {
        profileName.textContent = user.name || user.username || 'المستخدم';
    }

    // Update profile picture if available
    if (user.image) {
        const profilePictures = document.querySelectorAll('img[alt="Profile"]');
        profilePictures.forEach(img => {
            img.src = user.image;
        });
    }
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Change password
async function changePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    // Validate inputs
    if (!newPassword || !confirmNewPassword) {
        alert('يرجى ملء جميع الحقول المطلوبة');
        return;
    }

    if (newPassword !== confirmNewPassword) {
        alert('كلمات المرور غير متطابقة');
        return;
    }

    try {
        // Show loading state
        const saveBtn = document.getElementById('savePasswordBtn');
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحميل...';
        saveBtn.disabled = true;

        // Make change password request
        const token = localStorage.getItem('token');
        const response = await fetch('https://api.hamdan.help/api/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                newPassword
            })
        });

        // Check if unauthorized
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            // Show success message
            alert('تم تغيير كلمة المرور بنجاح');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            if (modal) {
                modal.hide();
            }

            // Reset form
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
        } else {
            // Show error message
            alert(data.message || 'فشل تغيير كلمة المرور');
        }

        // Reset button
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    } catch (error) {
        console.error('Error changing password:', error);

        // Show error message
        alert('حدث خطأ أثناء تغيير كلمة المرور');

        // Reset button
        const saveBtn = document.getElementById('savePasswordBtn');
        saveBtn.innerHTML = 'حفظ التغييرات';
        saveBtn.disabled = false;
    }
}

// Delete account
async function deleteAccount() {
    try {
        // Show loading state
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        const originalBtnText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحميل...';
        deleteBtn.disabled = true;

        // Make delete account request
        const token = localStorage.getItem('token');
        const response = await fetch('https://api.hamdan.help/api/delete-account', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Show success message
            alert('تم حذف الحساب بنجاح');

            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login page
            window.location.href = 'login.html';
        } else {
            // Show error message
            alert(data.message || 'فشل حذف الحساب');

            // Reset button
            deleteBtn.innerHTML = originalBtnText;
            deleteBtn.disabled = false;

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteAccountModal'));
            if (modal) {
                modal.hide();
            }
        }
    } catch (error) {
        console.error('Error deleting account:', error);

        // Show error message
        alert('حدث خطأ أثناء حذف الحساب');

        // Reset button
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        deleteBtn.innerHTML = 'تأكيد الحذف';
        deleteBtn.disabled = false;

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteAccountModal'));
        if (modal) {
            modal.hide();
        }
    }
}

// Update profile picture
async function updateProfilePicture() {
    const profilePicture = document.getElementById('profilePicture').files[0];

    if (!profilePicture) {
        alert('يرجى اختيار صورة');
        return;
    }

    try {
        // Show loading state
        const saveBtn = document.getElementById('saveProfilePicBtn');
        const originalBtnText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحميل...';
        saveBtn.disabled = true;

        // Create form data
        const formData = new FormData();
        formData.append('image', profilePicture);

        // Make upload image request
        const token = localStorage.getItem('token');
        const response = await fetch('https://api.hamdan.help/api/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        // Check if unauthorized
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            // Update user data in local storage
            const user = JSON.parse(localStorage.getItem('user'));
            user.image = data.data.image;
            localStorage.setItem('user', JSON.stringify(user));

            // Show success message
            alert('تم تغيير الصورة الشخصية بنجاح');

            // Update profile picture on page
            const profilePictures = document.querySelectorAll('img[alt="Profile"]');
            profilePictures.forEach(img => {
                img.src = data.data.image;
            });

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('changeProfilePicModal'));
            if (modal) {
                modal.hide();
            }

            // Reset form
            document.getElementById('profilePicture').value = '';
        } else {
            // Show error message
            alert(data.message || 'فشل تغيير الصورة الشخصية');
        }

        // Reset button
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    } catch (error) {
        console.error('Error updating profile picture:', error);

        // Show error message
        alert('حدث خطأ أثناء تغيير الصورة الشخصية');

        // Reset button
        const saveBtn = document.getElementById('saveProfilePicBtn');
        saveBtn.innerHTML = 'حفظ التغييرات';
        saveBtn.disabled = false;
    }
}
