// Courses JavaScript for Hamdan Web App

let coursesLoaded = false; // Flag to prevent duplicate loads

document.addEventListener('DOMContentLoaded', function() {
    // Prevent duplicate execution
    if (coursesLoaded) {
        console.warn('Courses already loaded, skipping duplicate load');
        return;
    }
    coursesLoaded = true;
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
        return;
    }
    
    // Get playlist ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const playlistId = urlParams.get('playlist');
    
    if (playlistId) {
        // Load playlist details
        loadPlaylistDetails(playlistId);
        
        // Load courses for this playlist
        loadCourses(playlistId);
    } else {
        // No playlist ID provided
        document.getElementById('playlistTitle').textContent = 'قائمة غير معروفة';
        document.getElementById('playlistDescription').textContent = 'لم يتم تحديد قائمة';
        document.querySelector('.courses').innerHTML = '<div class="text-center py-3"><p class="text-danger">لم يتم تحديد قائمة</p></div>';
    }
    
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

// Load playlist details
async function loadPlaylistDetails(playlistId) {
    console.log('Loading playlist details for ID:', playlistId);
    try {
        // Fetch playlist details from API
        const token = localStorage.getItem('token');
        const response = await fetch(`https://api.hamdan.help/api/playlists-simple/${playlistId}`, {
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
        
        const data = await response.json();
        console.log('Playlist details response:', data);
        
        if (data.success && data.data) {
            // Update playlist title and description
            document.getElementById('playlistTitle').textContent = data.data.title;
            document.getElementById('playlistDescription').textContent = data.data.description || 'لا يوجد وصف';
        } else {
            // Playlist not found
            document.getElementById('playlistTitle').textContent = 'قائمة غير موجودة';
            document.getElementById('playlistDescription').textContent = 'لم يتم العثور على القائمة المطلوبة';
        }
    } catch (error) {
        console.error('Error loading playlist details:', error);
        document.getElementById('playlistTitle').textContent = 'خطأ في التحميل';
        document.getElementById('playlistDescription').textContent = 'حدث خطأ أثناء تحميل تفاصيل القائمة';
    }
}

// Load courses for a playlist
async function loadCourses(playlistId) {
    try {
        const coursesContainer = document.querySelector('.courses');
        coursesContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جاري التحميل...</span></div></div>';
        
        // Fetch courses from API
        const token = localStorage.getItem('token');
        const response = await fetch(`https://api.hamdan.help/api/playlist/${playlistId}/courses`, {
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
        
        const data = await response.json();
        console.log('Courses response:', data);
        console.log(`Total courses from API: ${data.data?.length || 0}`);
        
        if (data.success && data.data && data.data.length > 0) {
            // Clear loading state
            coursesContainer.innerHTML = '';
            
            // Filter out locked courses - only show unlocked courses
            const unlockedCourses = data.data.filter(course => !course.isLocked);
            console.log(`Unlocked courses: ${unlockedCourses.length}`);
            
            // Remove duplicate courses (same ID appearing multiple times)
            const seenIds = new Set();
            const uniqueCourses = unlockedCourses.filter(course => {
                if (seenIds.has(course.id)) {
                    console.warn(`Duplicate course detected: ${course.id} (${course.title})`);
                    return false;
                }
                seenIds.add(course.id);
                return true;
            });
            console.log(`Unique courses after deduplication: ${uniqueCourses.length}`);

            if (uniqueCourses.length === 0) {
                coursesContainer.innerHTML = '<div class="text-center py-3"><p class="text-muted">لا توجد مواد متاحة في هذه القائمة</p></div>';
                return;
            }

            // Sort courses by order field (ascending)
            const sortedCourses = uniqueCourses.sort((a, b) => {
                const orderA = a.order || 0;
                const orderB = b.order || 0;
                return orderA - orderB;
            });
            console.log("Sorted unlocked courses (ascending order):", sortedCourses);

            // Display courses in ascending order
            let coursesHtml = '';
            for (let i = 0; i < sortedCourses.length; i++) {
                const course = sortedCourses[i];
                const orderNumber = course.order || (i + 1); // Use original order number
                const courseHtml = `
                    <div class="card mb-3 course-card" style="border-left: 4px solid #007bff;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div class="d-flex align-items-start">
                                    <div class="order-badge me-3" style="background: linear-gradient(135deg, #007bff, #0056b3); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; flex-shrink: 0;">
                                        ${orderNumber}
                                    </div>
                                    <div>
                                        <h6 class="card-title mb-1" style="color: #2c3e50; font-weight: 600;">${course.title}</h6>
                                        <p class="card-text text-muted small mb-0">${course.description || 'لا يوجد وصف'}</p>
                                        ${course.duration ? `<small class="text-primary"><i class="fas fa-clock me-1"></i>${course.duration}</small>` : ''}
                                    </div>
                                </div>
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-chevron-left text-muted"></i>
                                    <a href="course-details.html?course=${course.id}" class="stretched-link"></a>
                                </div>
                            </div>
                            <div class="progress mt-3" style="height: 6px; border-radius: 10px; background-color: #e9ecef;">
                                <div class="progress-bar" role="progressbar" style="width: ${course.progress || 0}%; background: linear-gradient(90deg, #28a745, #20c997); border-radius: 10px;" aria-valuenow="${course.progress || 0}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            ${course.progress ? `<small class="text-muted mt-1 d-block">مكتمل ${course.progress}%</small>` : ''}
                        </div>
                    </div>
                `;
                
                coursesHtml += courseHtml;
            }
            
            // Set all HTML at once instead of appending incrementally
            coursesContainer.innerHTML = coursesHtml;
        } else {
            // No courses found
            coursesContainer.innerHTML = '<div class="text-center py-3"><p class="text-muted">لا توجد مواد في هذه القائمة</p></div>';
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        document.querySelector('.courses').innerHTML = '<div class="text-center py-3"><p class="text-danger">حدث خطأ أثناء تحميل المواد</p></div>';
    }
 }
