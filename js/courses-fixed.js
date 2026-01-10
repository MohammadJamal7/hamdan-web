// Courses JavaScript for Hamdan Web App - WITH CATEGORY SUPPORT

let coursesLoaded = false; // Flag to prevent duplicate loads
let currentPlaylistId = null; // Store current playlist ID

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
    currentPlaylistId = playlistId;
    
    if (playlistId) {
        // Load playlist details
        loadPlaylistDetails(playlistId);
        
        // Load courses for this playlist (with categories)
        loadCoursesWithCategories(playlistId);
    } else {
        // No playlist ID provided
        document.getElementById('playlistTitle').textContent = 'قائمة غير معروفة';
        document.getElementById('playlistDescription').textContent = 'لم يتم تحديد قائمة';
        const categoriesSection = document.getElementById('categoriesSection');
        if (categoriesSection) {
            categoriesSection.innerHTML = '<div class="text-center py-3"><p class="text-danger">لم يتم تحديد قائمة</p></div>';
        }
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

// Load courses with categories
async function loadCoursesWithCategories(playlistId) {
    try {
        const categoriesSection = document.getElementById('categoriesSection');
        if (!categoriesSection) {
            console.error('categoriesSection element not found');
            return;
        }
        
        categoriesSection.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جاري التحميل...</span></div></div>';
        
        // Fetch playlist with categories from API
        const token = localStorage.getItem('token');
        const response = await fetch(`https://api.hamdan.help/api/playlists/${playlistId}`, {
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
        console.log('Playlist with categories response:', data);
        
        if (data.success && data.data) {
            const playlist = data.data;
            
            console.log('[COURSES] Playlist categories count:', playlist.categories?.length || 0);
            console.log('[COURSES] All categories:', playlist.categories);
            
            if (playlist.categories && playlist.categories.length > 0) {
                // Display categories with courses
                displayCategoriesWithCourses(playlist.categories);
            } else {
                // No categories found
                categoriesSection.innerHTML = '<div class="text-center py-3"><p class="text-muted">لا توجد مواد متاحة في هذه القائمة</p></div>';
            }
        } else {
            // Error loading playlist
            categoriesSection.innerHTML = '<div class="text-center py-3"><p class="text-danger">خطأ في تحميل المواد</p></div>';
        }
    } catch (error) {
        console.error('Error loading courses with categories:', error);
        const categoriesSection = document.getElementById('categoriesSection');
        if (categoriesSection) {
            categoriesSection.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                    <h5>حدث خطأ أثناء تحميل المواد</h5>
                    <p class="text-muted">${error.message}</p>
                    <button class="btn btn-primary mt-3" onclick="location.reload()">إعادة المحاولة</button>
                </div>
            `;
        }
    }
}

// Display categories with courses
function displayCategoriesWithCourses(categories) {
    const categoriesSection = document.getElementById('categoriesSection');
    categoriesSection.innerHTML = '';
    
    console.log('[DISPLAY CATEGORIES] Total categories received:', categories.length);
    
    if (!categories || categories.length === 0) {
        categoriesSection.innerHTML = '<div class="text-center py-3"><p class="text-muted">لا توجد مواد متاحة</p></div>';
        return;
    }
    
    // Sort categories: non-default first, default last
    const sortedCategories = [...categories].sort((a, b) => {
        if (a.isDefault === b.isDefault) return 0;
        return a.isDefault ? 1 : -1;
    });
    
    console.log('[DISPLAY CATEGORIES] Sorted categories:', sortedCategories.map(c => ({
        id: c.id,
        title: c.title,
        isDefault: c.isDefault,
        courseCount: c.courses?.length || 0
    })));
    
    // Track if we have any visible categories
    let hasVisibleCategories = false;
    
    // Render each category
    sortedCategories.forEach((category, index) => {
        const categoryElement = createCategoryElement(category, index === 0);
        
        // Check if category has visible courses
        if (categoryElement.style.display !== 'none') {
            hasVisibleCategories = true;
        }
        
        categoriesSection.appendChild(categoryElement);
    });
    
    console.log('[DISPLAY CATEGORIES] Has visible categories:', hasVisibleCategories);
    
    // If no visible categories, show message
    if (!hasVisibleCategories) {
        categoriesSection.innerHTML = '<div class="text-center py-3"><p class="text-muted">لا توجد مواد متاحة</p></div>';
    }
}

// Create category HTML element
function createCategoryElement(category, shouldBeOpen = false) {
    const container = document.createElement('div');
    container.className = 'category-wrapper';
    container.setAttribute('data-category-id', category.id);
    
    // Show all courses regardless of locked/unlocked status
    const visibleCourses = category.courses || [];
    
    console.log(`[CREATE CATEGORY] Category: ${category.title} (isDefault: ${category.isDefault})`, {
        totalCourses: visibleCourses.length,
        courses: visibleCourses.map(c => ({
            id: c.id,
            title: c.title,
            isLocked: c.isLocked,
            hasBunnyVideoId: !!c.bunnyVideoId,
            thumbnail: c.thumbnail,
            video: c.video?.substring(0, 50)
        }))
    });
    
    // Skip categories with no courses
    if (visibleCourses.length === 0) {
        console.log(`[CREATE CATEGORY] Skipping category with no courses: ${category.title}`);
        container.style.display = 'none';
        return container;
    }
    
    // Create category header
    const header = document.createElement('div');
    header.className = `category-header ${!shouldBeOpen ? 'collapsed' : ''}`;
    header.onclick = () => toggleCategory(container);
    
    // Category icon based on type
    const icon = category.isDefault ? 'fa-bookmark' : 'fa-folder';
    const categoryClass = category.isDefault ? 'default-category' : '';
    
    // If default category, show as 'عام / الافتراضي' for students
    let displayTitle = category.title;
    if (category.isDefault) {
        displayTitle = '  الافتراضي';
    }
    header.innerHTML = `
        <div class="category-title">
            <i class="fas ${icon}"></i>
            <span>${displayTitle}</span>
            <span class="category-badge">${visibleCourses.length} فيديو</span>
        </div>
        <i class="fas fa-chevron-left category-chevron ${!shouldBeOpen ? 'collapsed' : ''}"></i>
    `;
    
    // Only add class if it's not empty
    if (categoryClass) {
        header.classList.add(categoryClass);
    }
    
    // Create courses container
    const coursesContainer = document.createElement('div');
    coursesContainer.className = `category-courses ${!shouldBeOpen ? 'hidden' : ''}`;
    coursesContainer.setAttribute('data-category-id', category.id);
    
    if (visibleCourses.length === 0) {
        coursesContainer.innerHTML = '<p class="text-muted text-center py-3">لا توجد مواد متاحة</p>';
    } else {
        // Render courses
        visibleCourses.forEach((course, index) => {
            const courseCard = createCourseCard(course, index);
            coursesContainer.appendChild(courseCard);
        });
    }
    
    container.appendChild(header);
    container.appendChild(coursesContainer);
    
    return container;
}

// Create course card element
function createCourseCard(course, index) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.setAttribute('data-course-id', course.id);
    
    const progress = course.progress || 0;
    
    // Log thumbnail URL to console
    console.log(`[COURSE THUMBNAIL URL] ${course.title}: ${course.thumbnail || 'NO THUMBNAIL'}`);
    
    // Create thumbnail HTML if available
    const thumbnailHTML = course.thumbnail ? `
        <div class="course-thumbnail">
            <img src="${course.thumbnail}" alt="${course.title}">
        </div>
    ` : '';
    
    const courseInfoHTML = `
        ${thumbnailHTML}
        <div class="course-info">
            <div style="flex: 1;">
                <div class="course-title">${index + 1}. ${course.title}</div>
                <div class="course-description">${course.description || 'لا يوجد وصف'}</div>
                ${course.duration ? `<small class="text-muted"><i class="fas fa-clock me-1"></i>${formatDuration(course.duration)}</small>` : ''}
                <div class="course-progress mt-2">
                    <div class="course-progress-bar" style="width: ${progress}%"></div>
                </div>
            </div>
        </div>
    `;
    
    card.innerHTML = courseInfoHTML;
    card.style.position = 'relative';
    
    // Add stretched link
    const link = document.createElement('a');
    link.href = `course-details.html?course=${course.id}`;
    link.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10;';
    link.className = 'stretched-link';
    card.appendChild(link);
    
    return card;
}

// Toggle category expansion
function toggleCategory(categoryElement) {
    const header = categoryElement.querySelector('.category-header');
    const coursesContainer = categoryElement.querySelector('.category-courses');
    const chevron = header.querySelector('.category-chevron');
    
    header.classList.toggle('collapsed');
    chevron.classList.toggle('collapsed');
    coursesContainer.classList.toggle('hidden');
}

// Format duration from seconds
function formatDuration(seconds) {
    if (!seconds) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}
