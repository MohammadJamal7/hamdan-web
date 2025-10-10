// Video Player JavaScript for Hamdan Web App

let player;
let courseId;
let watchInterval;
let currentPosition = 0;
let videoDuration = 0;
let lastSavedPosition = 0;

$(document).ready(function() {
    // Get course ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    courseId = urlParams.get('course');

    if (courseId) {
        // Load course details
        loadCourseDetails(courseId);

        // Initialize video player
        initializePlayer(courseId);
    } else {
        // No course ID provided
        $('#videoTitle').text('فيديو غير معروف');
        $('#videoDescription').text('لم يتم تحديد فيديو');
        $('.video-container').html('<div class="ratio ratio-16x9 bg-dark d-flex align-items-center justify-content-center"><p class="text-white">لم يتم تحديد فيديو</p></div>');
    }

    // Clean up on page unload
    $(window).on('beforeunload', function() {
        clearInterval(watchInterval);
        saveWatchProgress();
    });
});

// Load course details
async function loadCourseDetails(courseId) {
    try {
        // Fetch course details from API
        const response = await apiRequest(`/courses/${courseId}`);

        if (response.success && response.data) {
            const course = response.data;

            // Update course title and description
            $('#videoTitle').text(course.title);
            $('#videoDescription').text(course.description || 'لا يوجد وصف');
        } else {
            // Course not found
            $('#videoTitle').text('فيديو غير موجود');
            $('#videoDescription').text('لم يتم العثور على الفيديو المطلوب');
        }
    } catch (error) {
        console.error('Error loading course details:', error);
        $('#videoTitle').text('خطأ في التحميل');
        $('#videoDescription').text('حدث خطأ أثناء تحميل تفاصيل الفيديو');
    }
}

// Initialize video player
async function initializePlayer(courseId) {
    try {
        // Start or resume watching session
        await apiRequest(`/courses/${courseId}/watch`, 'POST');

        // Fetch course video URL and progress
        const videoResponse = await apiRequest(`/courses/${courseId}`);
        const progressResponse = await apiRequest(`/courses/${courseId}/progress`);

        if (videoResponse.success && videoResponse.data) {
            const course = videoResponse.data;
            let videoUrl = course.video;

            // If no video URL is provided, use a placeholder
            if (!videoUrl) {
                videoUrl = 'https://vjs.zencdn.net/v/oceans.mp4';
            }

            // Initialize video.js player
            player = videojs('my-video');

            // Set video source
            player.src({
                src: videoUrl,
                type: 'video/mp4'
            });

            // Set poster if available
            if (course.thumbnail) {
                player.poster(course.thumbnail);
            }

            // Set video duration
            videoDuration = course.duration || 0;

            // Set last position if available
            if (progressResponse.success && progressResponse.data) {
                const progress = progressResponse.data;
                currentPosition = progress.lastPosition || 0;
                lastSavedPosition = currentPosition; // Initialize lastSavedPosition

                // Set player to last position
                player.ready(function() {
                    player.currentTime(currentPosition);
                });
            }

            // Track video progress
            player.on('timeupdate', function() {
                currentPosition = player.currentTime();
                lastSavedPosition = currentPosition;
            });

            // Set up interval to save watch progress every 10 seconds
            watchInterval = setInterval(saveWatchProgress, 10000);

            // Save progress when video ends
            player.on('ended', function() {
                saveWatchProgress(true);
            });
        } else {
            // Video not found
            $('.video-container').html('<div class="ratio ratio-16x9 bg-dark d-flex align-items-center justify-content-center"><p class="text-white">لم يتم العثور على الفيديو المطلوب</p></div>');
        }
    } catch (error) {
        console.error('Error initializing video player:', error);
        $('.video-container').html('<div class="ratio ratio-16x9 bg-dark d-flex align-items-center justify-content-center"><p class="text-white">حدث خطأ أثناء تحميل الفيديو</p></div>');
    }
}

// Save watch progress
async function saveWatchProgress(completed = false) {
    if (!courseId || !player) return;
    try {
        const duration = player.duration() || videoDuration;
        // Use the most recent position tracked
        const currentPos = (typeof lastSavedPosition === 'number' ? lastSavedPosition : (player.currentTime() || currentPosition));
        if (currentPos > 0 && duration > 0) {
            await apiRequest(`/courses/${courseId}/watch`, 'PUT', {
                currentPosition: currentPos,
                duration: duration
            });
        }
    } catch (error) {
        console.error('Error saving watch progress:', error);
    }
}

// On page unload, always save the very last position (use sendBeacon if available)
window.addEventListener('beforeunload', function() {
    clearInterval(watchInterval);
    const duration = player && (player.duration() || videoDuration);
    const currentPos = (typeof lastSavedPosition === 'number' ? lastSavedPosition : (player && player.currentTime() || currentPosition));
    if (currentPos > 0 && duration > 0 && window.navigator.sendBeacon) {
        try {
            const token = localStorage.getItem('token');
            const headers = { type: 'application/json' };
            const body = JSON.stringify({ currentPosition: currentPos, duration: duration });
            // Use sendBeacon for reliability on unload
            const url = `${API_BASE_URL}/courses/${courseId}/watch`;
            // Custom sendBeacon with Authorization header workaround
            // (sendBeacon does not support custom headers, so fallback to async if needed)
            // If your backend requires Authorization, you may need to use a synchronous XHR as a fallback
            // Here, we attempt sendBeacon for best effort
            window.navigator.sendBeacon(url, body);
        } catch (e) {
            // Fallback to async save
            saveWatchProgress();
        }
    } else {
        saveWatchProgress();
    }
});

async function loadCourseVideo(courseId) {
  try {
    const token = localStorage.getItem("token") || "";
    // Start watching session
    await fetch(`${API_BASE_URL}/courses/${courseId}/watch`, {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    // Get course details and watch progress
    const [courseRes, progressRes] = await Promise.all([
      fetch(`${API_BASE_URL}/courses/${courseId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      }),
      fetch(`${API_BASE_URL}/courses/${courseId}/progress`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
    ]);
    const courseData = await courseRes.json();
    const progressData = await progressRes.json();
    if (courseData.success && courseData.data) {
      const course = courseData.data;
      const progress = progressData.success ? progressData.data : null;
      $("#courseTitle").text(course.title);
      $("#courseDescription").text(course.description || "");
      // Mux integration
      const playbackId = course.muxPlaybackId || (course.playback_ids && course.playback_ids[0]?.id) || course.playback_id;
      const playbackPolicy = course.muxPlaybackPolicy || (course.playback_ids && course.playback_ids[0]?.policy) || course.playback_policy;
      if (playbackId) {
        // Fetch tokens from backend
        const tokenEndpoints = [
          { attr: 'playback-token', url: `${API_BASE_URL}/mux/playback-token?playbackId=${playbackId}` },
          { attr: 'drm-token', url: `${API_BASE_URL}/mux/drm-token?playbackId=${playbackId}` },
          { attr: 'thumbnail-token', url: `${API_BASE_URL}/mux/thumbnail-token?playbackId=${playbackId}` },
          { attr: 'storyboard-token', url: `${API_BASE_URL}/mux/storyboard-token?playbackId=${playbackId}` },
        ];
        const headers = { Authorization: `Bearer ${token}` };
        const tokenFetches = tokenEndpoints.map(e => fetch(e.url, { headers }).then(r => r.json()));
        const tokens = await Promise.all(tokenFetches);
        // Create mux-player element
        const muxPlayer = document.createElement('mux-player');
        muxPlayer.setAttribute('playback-id', playbackId);
        muxPlayer.setAttribute('style', 'width: 100%; aspect-ratio: 16/9; background: #000;');
        
        // Add Widevine L3 compatibility for Android tablets
        const isAndroidTablet = /Android/i.test(navigator.userAgent) && 
          (window.innerWidth >= 768 || window.innerHeight >= 768 || 
           /Android.*Tablet|Android.*Pad/i.test(navigator.userAgent));
        
        if (isAndroidTablet) {
          muxPlayer.setAttribute('max-resolution', '480p');
          muxPlayer.setAttribute('prefer-mse', 'true');
          console.log('[VideoPlayer] Configured for Widevine L3 compatibility');
        }
        // Set tokens based on playback policy
        if (playbackPolicy === 'drm') {
          if (tokens[0].success && tokens[0].token) {
            muxPlayer.setAttribute('playback-token', tokens[0].token);
          }
          if (tokens[1].success && tokens[1].token) {
            muxPlayer.setAttribute('drm-token', tokens[1].token);
          }
        } else if (playbackPolicy === 'signed') {
          if (tokens[0].success && tokens[0].token) {
            muxPlayer.setAttribute('playback-token', tokens[0].token);
          }
        } else if (playbackPolicy === 'public') {
          // No token needed
        } else if (Array.isArray(course.playback_ids) && course.playback_ids[0]?.policy && course.playback_ids.length > 1) {
          if (tokens[0].success && tokens[0].token) {
            muxPlayer.setAttribute('playback-token', tokens[0].token);
          }
          if (tokens[1].success && tokens[1].token) {
            muxPlayer.setAttribute('drm-token', tokens[1].token);
          }
        }
        // Always set thumbnail and storyboard tokens if available
        if (tokens[2].success && tokens[2].token) {
          muxPlayer.setAttribute('thumbnail-token', tokens[2].token);
        }
        if (tokens[3].success && tokens[3].token) {
          muxPlayer.setAttribute('storyboard-token', tokens[3].token);
        }
        muxPlayer.setAttribute('metadata-title', course.title);
        muxPlayer.setAttribute('metadata-description', course.description || '');
        // Insert mux-player into the container
        const container = document.getElementById("videoContainer");
        container.innerHTML = '';
        container.appendChild(muxPlayer);
        // Progress tracking (optional, can be added if needed)
      } else {
        $("#videoContainer").html(
          '<div class="text-danger text-center py-5">رابط الفيديو غير متوفر</div>'
        );
      }
    } else {
      $("#videoContainer").html(
        '<div class="text-danger text-center py-5">لم يتم العثور على الفيديو</div>'
      );
    }
  } catch (error) {
    console.error("Error loading video:", error);
    $("#videoContainer").html(
      '<div class="text-danger text-center py-5">حدث خطأ أثناء تحميل الفيديو</div>'
    );
  }
}
