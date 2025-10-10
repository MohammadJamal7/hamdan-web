// Playlists JavaScript for Hamdan Web App

// Global variables
let allPlaylists = []; // Store all playlists for filtering

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
        return;
    }

    // Load playlists
    loadPlaylists();

    // Handle logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    // Add refresh button to the page
    // const navContainer = document.querySelector('.navbar .container .d-flex');
    // if (navContainer) {
    //     const refreshButton = document.createElement('button');
    //     refreshButton.className = 'btn btn-sm btn-primary ms-2';
    //     refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>';
    //     refreshButton.addEventListener('click', function() {
    //         loadPlaylists();
    //     });
    //     navContainer.appendChild(refreshButton);
    // }

    // // Handle search functionality
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

    if (searchInput && searchButton) {
        // Search on button click
        searchButton.addEventListener('click', function() {
            filterPlaylists(searchInput.value);
        });

        // Search on Enter key press
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                filterPlaylists(searchInput.value);
            }
        });
    }
});

// Load playlists
async function loadPlaylists() {
    try {
        // Show loading state
        const playlistsContainer = document.querySelector('.playlists');
        playlistsContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">جاري التحميل...</span></div></div>';

        // Update notification count
        updateNotificationCount();

        // Fetch playlists from 
        const token = localStorage.getItem('token');
        console.log('Fetching playlists with token:', token);

        // Log the token for debugging
        if (!token) {
            console.warn('No token found in localStorage!');
        }

         const response = await fetch('https://api.hamdan.help/api/my-playlists', {
        //const response = await fetch('http://localhost:3000/api/my-playlists', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);

        // Check if unauthorized
        if (response.status === 401) {
            console.log('Unauthorized - redirecting to login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }

        // Get response text for debugging
        const responseText = await response.text();
        console.log('Raw response from /api/my-playlists:', responseText);

        // Parse JSON
        let data;
        try {
            data = JSON.parse(responseText);
            console.log('Parsed playlists response:', data);
        } catch (error) {
            console.error('Error parsing JSON:', error);
            playlistsContainer.innerHTML = '<div class="text-center py-3"><p class="text-danger">خطأ في تنسيق البيانات</p></div>';
            return;
        }

        if (data.success && data.data && data.data.length > 0) {
            // Store all playlists in global variable
            allPlaylists = data.data;

            // Clear loading state
            playlistsContainer.innerHTML = '';

            // Display playlists
            displayPlaylists(allPlaylists);

            // Clear search input
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
            }
        } else {
            // No playlists found
            allPlaylists = [];
            playlistsContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-list fa-3x text-muted mb-3"></i>
                    <h5>لا توجد مواد متاحة حالياً</h5>
                    <p class="text-muted">سيتم إضافة مواد جديدة قريباً</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading playlists:', error);
        document.querySelector('.playlists').innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
                <h5>حدث خطأ أثناء تحميل المواد</h5>
                <p class="text-muted">${error.message}</p>
                <button class="btn btn-primary mt-3" onclick="loadPlaylists()">إعادة المحاولة</button>
            </div>
        `;

    }
}

// Display playlists
function displayPlaylists(playlists) {
    const playlistsContainer = document.querySelector('.playlists');

    if (!playlists || playlists.length === 0) {
        playlistsContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5>لا توجد نتائج</h5>
                <p class="text-muted">حاول البحث بكلمات مختلفة</p>
                <button class="btn btn-primary mt-3" onclick="loadPlaylists()">عرض جميع المواد</button>
            </div>
        `;
        return;
    }

    // Clear container
    playlistsContainer.innerHTML = '';

    // Sort playlists by order in descending order (highest order first)
    playlists.sort((a, b) => (b.order || 0) - (a.order || 0)).forEach(playlist => {
        console.log(`Playlist: ${playlist.title}, Order: ${playlist.order}`);
        // Calculate progress (random for now if not provided)
        const progress = playlist.progress || Math.floor(Math.random() * 100);

        // Format the image URL - fix duplicate domain issue
        const imageUrl = playlist.image.replace('https://api.hamdan.helphttps://api.hamdan.help', 'https://api.hamdan.help');

        // Create playlist card with image
        const playlistHtml = `
            <div class="card mb-3">
                <div class="row g-0">
                    <div class="col-4">
                        <img src="${imageUrl}"
                             class="img-fluid rounded-start h-100 w-100 object-fit-cover"
                             alt="${playlist.title}"
                             onerror="this.src='images/course.jpg'">
                    </div>
                    <div class="col-8">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">${playlist.title}</h6>
                                    <p class="card-text text-muted small">${playlist.description || 'لا يوجد وصف'}</p>
                                    <div class="d-flex align-items-center mt-2">
                                        <i class="fas fa-video me-1 text-muted"></i>
                                        <small class="text-muted">${playlist.videoLength || '00:00'}</small>
                                        <i class="fas fa-users ms-3 me-1 text-muted"></i>
                                        <small class="text-muted">${playlist.studentCount || 0}</small>
                                    </div>
                                </div>
                            </div>
                            <div class="progress mt-2" style="height: 5px;">
                                <div class="progress-bar" role="progressbar" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"></div>
                            </div>
                            <a href="courses.html?playlist=${playlist.id}" class="stretched-link"></a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        playlistsContainer.innerHTML += playlistHtml;
    });

    // Show result count
    const resultCount = document.createElement('div');
    resultCount.className = 'text-muted mb-3';
    resultCount.textContent = `عدد النتائج: ${playlists.length}`;
    playlistsContainer.prepend(resultCount);
}

// Filter playlists based on search query
function filterPlaylists(query) {
    if (!query || query.trim() === '') {
        // If query is empty, show all playlists
        displayPlaylists(allPlaylists);
        return;
    }

    // Convert query to lowercase for case-insensitive search
    const searchQuery = query.toLowerCase().trim();

    // Filter playlists based on title and description
    const filteredPlaylists = allPlaylists.filter(playlist => {
        const title = playlist.title ? playlist.title.toLowerCase() : '';
        const description = playlist.description ? playlist.description.toLowerCase() : '';

        return title.includes(searchQuery) || description.includes(searchQuery);
    });

    // Display filtered playlists
    displayPlaylists(filteredPlaylists);
}

// Update notification count
function updateNotificationCount() {
    // Get notification count from localStorage or set to 0
    const notificationCount = localStorage.getItem('notificationCount') || 0;

    // Update notification badge
    const notificationBadge = document.querySelector('.fa-bell + .badge');
    if (notificationBadge) {
        notificationBadge.textContent = notificationCount;

        // Hide badge if count is 0
        if (notificationCount == 0) {
            notificationBadge.style.display = 'none';
        } else {
            notificationBadge.style.display = 'inline-block';
        }
    }
}
