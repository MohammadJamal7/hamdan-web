// Notifications JavaScript for Hamdan Web App

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
        return;
    }

    // Load notifications
    loadNotifications();

    // Handle logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
});

// Load notifications
async function loadNotifications() {
    try {
        // Show loading state
        const container = document.querySelector('.container');
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'text-center py-5 loading-spinner';
        loadingDiv.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">جاري التحميل...</span></div>';
        container.appendChild(loadingDiv);

        // Fetch notifications from API
        const token = localStorage.getItem('token');
        // Using the correct endpoint from the API
        const response = await fetch('https://api.hamdan.help/notifications/student', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // Check if unauthorized
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        // Handle other HTTP errors
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Notifications response:', data);

        // Remove loading spinner
        const loadingSpinner = document.querySelector('.loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.remove();
        }

        // Clear existing content
        container.innerHTML = '<h5 class="mb-4">الإشعارات</h5>';

        // Check if the response is successful but data is empty or not an array
        if (!data.data || !Array.isArray(data.data)) {
            console.log('No notifications data or invalid format');
            displayEmptyState();
            return;
        }

        if (data.success && data.data.length > 0) {
            // Group notifications by date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const todayNotifications = [];
            const yesterdayNotifications = [];
            const olderNotifications = [];

            data.data.forEach(notification => {
                const notificationDate = new Date(notification.createdAt);
                notificationDate.setHours(0, 0, 0, 0);

                if (notificationDate.getTime() === today.getTime()) {
                    todayNotifications.push(notification);
                } else if (notificationDate.getTime() === yesterday.getTime()) {
                    yesterdayNotifications.push(notification);
                } else {
                    olderNotifications.push(notification);
                }
            });

            // Display today's notifications
            if (todayNotifications.length > 0) {
                displayNotificationGroup('اليوم', todayNotifications);
            }

            // Display yesterday's notifications
            if (yesterdayNotifications.length > 0) {
                displayNotificationGroup('الأمس', yesterdayNotifications);
            }

            // Display older notifications
            if (olderNotifications.length > 0) {
                displayNotificationGroup('الأقدم', olderNotifications);
            }
        } else {
            // No notifications found
            console.log('No notifications found');
            displayEmptyState();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);

        // Remove loading spinner
        const loadingSpinner = document.querySelector('.loading-spinner');
        if (loadingSpinner) {
            loadingSpinner.remove();
        }

        // Show error message
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-circle text-danger fa-3x mb-3"></i>
                <h5 class="text-danger">حدث خطأ أثناء تحميل الإشعارات</h5>
                <p class="text-muted">يرجى المحاولة مرة أخرى لاحقاً</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">إعادة المحاولة</button>
            </div>
        `;
    }
}

// Display a group of notifications
function displayNotificationGroup(title, notifications) {
    const container = document.querySelector('.container');

    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'notifications-section';

    const titleElement = document.createElement('h6');
    titleElement.className = 'section-title';
    titleElement.textContent = title;

    sectionDiv.appendChild(titleElement);
    container.appendChild(sectionDiv);

    // Add notifications to the group
    notifications.forEach(notification => {
        // Determine icon based on notification type
        let iconClass = 'fa-bell';
        let typeClass = 'general';

        if (notification.type === 'welcome') {
            iconClass = 'fa-hand-peace';
            typeClass = 'welcome';
        } else if (notification.type === 'course') {
            iconClass = 'fa-book';
            typeClass = 'course';
        }

        const notificationCard = document.createElement('div');
        notificationCard.className = 'card notification-card';
        notificationCard.innerHTML = `
            <div class="card-body">
                <div class="d-flex">
                    <div class="notification-icon ${typeClass} text-white">
                        <i class="fas ${iconClass}"></i>
                    </div>
                    <div class="notification-content flex-grow-1">
                        <h6 class="notification-title">${notification.title || 'رسالة توجيه'}</h6>
                        <p class="notification-text">${notification.message || notification.content || 'إشعار جديد'}</p>
                        <small class="notification-time">${notification.createdAgo || formatDate(notification.createdAt)}</small>
                    </div>
                </div>
            </div>
        `;

        sectionDiv.appendChild(notificationCard);
    });
}

// Display empty state when no notifications
function displayEmptyState() {
    const container = document.querySelector('.container');

    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'no-notifications';
    emptyDiv.innerHTML = `
        <i class="fas fa-bell-slash d-block mb-3"></i>
        <h5>لا توجد إشعارات</h5>
        <p class="text-muted">ستظهر هنا الإشعارات الجديدة عند وصولها</p>
    `;

    container.appendChild(emptyDiv);
}

// Format date to a readable format
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if date is today
    if (date.toDateString() === now.toDateString()) {
        return `اليوم ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // Check if date is yesterday
    if (date.toDateString() === yesterday.toDateString()) {
        return `الأمس ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    }

    // Otherwise, return full date
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}
