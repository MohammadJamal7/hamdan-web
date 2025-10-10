// Authentication JavaScript for Hamdan Web App

$(document).ready(function() {
    // Login form submission
    $('#loginForm').on('submit', async function(e) {
        e.preventDefault();

        const email = $('#username').val();
        const password = $('#password').val();
        const rememberMe = $('#rememberMe').is(':checked');

        // Validate inputs
        if (!email || !password) {
            showToast('يرجى ملء جميع الحقول المطلوبة', 'danger');
            return;
        }

        const loginPayload = {
            email,
            password,
            deviceId: 'web-browser'
        };

        try {
            // Show loading state
            const submitBtn = $(this).find('button[type="submit"]');
            const originalBtnText = submitBtn.html();
            submitBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحميل...');
            submitBtn.prop('disabled', true);

            // Make login request
            const response = await apiRequest('/login', 'POST', loginPayload);

            // Handle successful login
            if (response.success && response.data.token) {
                // Save token and user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.student));

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                showToast(response.message || 'فشل تسجيل الدخول', 'danger');

                // Reset button
                submitBtn.html(originalBtnText);
                submitBtn.prop('disabled', false);
            }
        } catch (error) {
            showToast(error.message || 'فشل تسجيل الدخول', 'danger');

            // Reset button
            const submitBtn = $(this).find('button[type="submit"]');
            const originalBtnText = submitBtn.html();
            submitBtn.html(originalBtnText);
            submitBtn.prop('disabled', false);
        }
    });

    // Register form submission
    $('#registerForm').on('submit', async function(e) {
        e.preventDefault();

        const firstName = $('#firstName').val();
        const lastName = $('#lastName').val();
        const username = $('#username').val();
        const email = $('#email').val();
        const phone = $('#phone').val();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();

        // Validate inputs
        if (!firstName || !lastName || !username || !email || !phone || !password || !confirmPassword) {
            showToast('يرجى ملء جميع الحقول المطلوبة', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            showToast('كلمات المرور غير متطابقة', 'danger');
            return;
        }

        try {
            // Show loading state
            const submitBtn = $(this).find('button[type="submit"]');
            const originalBtnText = submitBtn.html();
            submitBtn.html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> جاري التحميل...');
            submitBtn.prop('disabled', true);

            // Make register request
            const response = await apiRequest('/add-student', 'POST', {
                name: `${firstName} ${lastName}`,
                username,
                email,
                phone,
                password,
                deviceId: 'web-browser' // Identify this as a web browser registration
            });

            // Handle successful registration
            if (response.success && response.data.token) {
                // Save token and user data
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.student));

                // Show success message
                showToast('تم التسجيل بنجاح', 'success');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                showToast(response.message || 'فشل التسجيل', 'danger');

                // Reset button
                submitBtn.html(originalBtnText);
                submitBtn.prop('disabled', false);
            }
        } catch (error) {
            showToast(error.message || 'فشل التسجيل', 'danger');

            // Reset button
            const submitBtn = $(this).find('button[type="submit"]');
            const originalBtnText = submitBtn.html();
            submitBtn.html(originalBtnText);
            submitBtn.prop('disabled', false);
        }
    });
});
