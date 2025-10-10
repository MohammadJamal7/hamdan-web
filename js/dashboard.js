// Dashboard JavaScript for Hamdan Web App

$(document).ready(function() {
    // Load user data
    loadUserData();

    // Load playlists
    loadPlaylists();

    // Load recently watched courses
    loadRecentCourses();
});

// Load user data
async function loadUserData() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));

        if (user) {
            // Update user name and profile picture in the navbar
            $('.navbar .text-white.me-2').text(user.name);

            if (user.image) {
                $('.navbar img[alt="Profile"]').attr('src', user.image);
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load playlists
async function loadPlaylists() {
    try {
        // Show loading state
        $('.my-materials .row').html('<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جاري التحميل...</span></div></div>');

        // Fetch playlists from API
        const response = await apiRequest('/my-playlists');

        if (response.success && response.data && response.data.length > 0) {
            // Clear loading state
            $('.my-materials .row').empty();

            // Display playlists
            response.data.forEach(playlist => {
                const playlistHtml = `
                    <div class="col-12 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="card-title">${playlist.title}</h6>
                                        <p class="card-text text-muted small">${playlist.description || 'لا يوجد وصف'}</p>
                                    </div>
                                    <div class="text-end">
                                        <a href="courses.html?playlist=${playlist.id}" class="stretched-link"></a>
                                    </div>
                                </div>
                                <div class="progress mt-2" style="height: 5px;">
                                    <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                $('.my-materials .row').append(playlistHtml);
            });
        } else {
            // No playlists found
            $('.my-materials .row').html('<div class="col-12 text-center py-3"><p class="text-muted">لا توجد مواد متاحة حالياً</p></div>');
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
        $('.my-materials .row').html('<div class="col-12 text-center py-3"><p class="text-danger">حدث خطأ أثناء تحميل المواد</p></div>');
    }
}

// Load recently watched courses
async function loadRecentCourses() {
    try {
        // Show loading state
        $('.continue-watching .row').html('<div class="col-12 text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جاري التحميل...</span></div></div>');

        // Fetch watch history from API
        const response = await apiRequest('/watch-history');

        if (response.success && response.data && response.data.history && response.data.history.length > 0) {
            // Clear loading state
            $('.continue-watching .row').empty();

            // Display recently watched courses (limit to 4 for UI)
            response.data.history.slice(0, 4).forEach(record => {
                const course = record.course;
                const courseHtml = `
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="card-title">${course.title}</h6>
                                        <p class="card-text text-muted small">${course.description || 'لا يوجد وصف'}</p>
                                    </div>
                                    <div>
                                        <a href="video.html?course=${course.id}" class="btn btn-sm btn-outline-primary">
                                            <i class="fas fa-play"></i> مشاهدة
                                        </a>
                                    </div>
                                </div>
                                <div class="progress mt-2" style="height: 5px;">
                                    <div class="progress-bar" role="progressbar" style="width: ${record.completed ? 100 : (record.lastPosition && course.duration ? Math.round((record.lastPosition / course.duration) * 100) : 0)}%;" aria-valuenow="${record.completed ? 100 : (record.lastPosition && course.duration ? Math.round((record.lastPosition / course.duration) * 100) : 0)}" aria-valuemin="0" aria-valuemax="100"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                $('.continue-watching .row').append(courseHtml);
            });
        } else {
            // No recently watched courses found
            $('.continue-watching .row').html('<div class="col-12 text-center py-3"><p class="text-muted">لم تشاهد أي مواد بعد</p></div>');
        }
    } catch (error) {
        console.error('Error loading recently watched courses:', error);
        $('.continue-watching .row').html('<div class="col-12 text-center py-3"><p class="text-danger">حدث خطأ أثناء تحميل المواد المشاهدة مؤخراً</p></div>');
    }
}
