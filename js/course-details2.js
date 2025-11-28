// Global variables for video player and questions
let muxPlayer = null;
let courseQuestions = [];
let currentQuestion = null;
let answeredQuestions = [];
let isQuestionActive = false;
let questionCheckInterval = null;
let questionModal = null;

// Debug log helper function with enhanced production logging
function debugLog(message, data) {
  if (window.DEBUG_MODE) {
    console.log(`DEBUG: ${message}`, data || '');
  }
}

// Enhanced mobile environment detection with Android tablet detection
if (typeof window !== 'undefined') {
  (function detectMobileEnv() {
    const ua = navigator.userAgent || '';
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const smallScreen = Math.min(window.innerWidth, window.innerHeight) <= 768;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    window.isIOS = /iPad|iPhone|iPod/i.test(ua);
    window.isAndroid = /Android/i.test(ua);
    window.isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua) || (isTouch && smallScreen);
    
    // Detect Android tablets specifically
    window.isAndroidTablet = window.isAndroid && (
      // Screen size based detection (tablets typically have larger screens)
      (screenWidth >= 768 || screenHeight >= 768) ||
      // User agent based detection
      /Android.*Tablet|Android.*Pad/i.test(ua) ||
      // Touch points detection (tablets often have more touch points)
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
    );
    
    // Detect potential Widevine L3 devices (Android tablets)
    window.isWidevineL3Device = window.isAndroidTablet;
    
    enhancedDebugLog('DEVICE_DETECTION', 'Device detection results', {
      isAndroid: window.isAndroid,
      isAndroidTablet: window.isAndroidTablet,
      isWidevineL3Device: window.isWidevineL3Device,
      screenSize: `${screenWidth}x${screenHeight}`,
      userAgent: ua.substring(0, 100)
    });
  })();
}

// Test function for true/false questions
function testTrueFalseQuestion() {
  const testQuestion = {
    id: 'test-tf-' + Date.now(),
    type: 'true_false',
    question: 'هذا سؤال اختبار صح/خطأ. هل هذا صحيح؟',
    timestamp: 5, // 5 seconds into the video
    options: ['خطأ', 'صحيح'],
    correctAnswer: 1, // True is correct
    explanation: 'هذا شرح للإجابة الصحيحة لسؤال صح/خطأ.'
  };
  
  // Add to questions array if not already present
  if (!courseQuestions.some(q => q.id === testQuestion.id)) {
    courseQuestions.push(testQuestion);
    enhancedDebugLog('TEST', 'Added test true/false question', testQuestion);
    
    // Also add to the timeline if it exists
    if (typeof addQuestionMarkersToTimeline === 'function') {
      addQuestionMarkersToTimeline();
    }
  }
  
  // Show the question immediately
  showQuestion(testQuestion);
  
  return 'Test true/false question displayed';
}

// Enhanced debug logger with more visibility
function enhancedDebugLog(type, message, data) {
  const timestamp = new Date().toISOString().substring(11, 23);
  console.log(`%c[${timestamp}] [${type.toUpperCase()}] ${message}`, 
              'background: #333; color: #bada55; padding: 2px 4px; border-radius: 2px;', 
              data || '');
}

// Helper: build absolute URL for images when backend returns relative paths
function buildImageUrl(p) {
  if (!p) return '';
  // If already absolute, return as-is
  if (/^https?:\/\//i.test(p)) return p;
  // Ensure no leading slash duplication
  const clean = p.replace(/^\/+/, '');
  // Extract the base URL without the /api path
  const baseUrl = window.API_BASE_URL.replace(/\/api$/, '');
  return `${baseUrl}/${clean}`;
}

// Helper function to exit fullscreen mode
function exitFullscreen() {
  let wasInFullscreen = false;
  
  // Check if we're in fullscreen mode
  if (document.fullscreenElement || document.webkitFullscreenElement || 
      document.mozFullScreenElement || document.msFullscreenElement) {
    wasInFullscreen = true;
    
    // Exit fullscreen
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    } catch (err) {
      console.log('Error exiting fullscreen:', err);
    }
  }
  
  // Also check if the video player has its own fullscreen method
  if (window.muxPlayer && typeof window.muxPlayer.exitFullscreen === 'function') {
    try {
      window.muxPlayer.exitFullscreen();
    } catch (err) {
      console.log('Error exiting video fullscreen:', err);
    }
  }
  
  return wasInFullscreen;
}

// Wait for fullscreen to exit, then run callback (with timeout fallback)
function waitForFullscreenExit(callback, timeoutMs = 1200) {
  let done = false;
  const cleanup = () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
    document.removeEventListener('mozfullscreenchange', onChange);
    document.removeEventListener('MSFullscreenChange', onChange);
  };
  const onChange = () => {
    const active = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (!active && !done) {
      done = true;
      cleanup();
      try { callback(); } catch (e) { console.error(e); }
    }
  };
  document.addEventListener('fullscreenchange', onChange, { once: false });
  document.addEventListener('webkitfullscreenchange', onChange, { once: false });
  document.addEventListener('mozfullscreenchange', onChange, { once: false });
  document.addEventListener('MSFullscreenChange', onChange, { once: false });

  // Fallback in case the event doesn't fire
  setTimeout(() => {
    if (!done) {
      done = true;
      cleanup();
      try { callback(); } catch (e) { console.error(e); }
    }
  }, timeoutMs);
}

// Questions functionality
async function loadCourseQuestions(courseId) {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token available for loading questions');
      return;
    }

    const response = await fetch(`${window.API_BASE_URL}/courses/${courseId}/questions`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        courseQuestions = result.data.sort((a, b) => a.timestamp - b.timestamp);
        enhancedDebugLog('QUESTIONS', `Loaded ${courseQuestions.length} questions`, courseQuestions.map(q => ({ id: q.id, timestamp: q.timestamp })));
        
        // Reset answered questions on each page load
        // This ensures questions appear every time the video is watched
        answeredQuestions = [];
        
        // Clear any stored answered questions from localStorage
        // to ensure questions always appear on page reload
        const answeredKey = `course_${courseId}_answered_questions`;
        localStorage.removeItem(answeredKey);
        
        enhancedDebugLog('QUESTIONS', 'Reset answered questions for new session - questions will appear every time');
      }
    } else {
      console.log('Failed to load questions:', response.status);
    }
  } catch (error) {
    console.error('Error loading course questions:', error);
  }
}

// Track recently shown questions to prevent duplicates
let recentlyShownQuestions = [];
let lastQuestionTime = 0;

// Refresh marker styles on the custom timeline according to answeredQuestions
function refreshTimelineMarkers() {
  try {
    const markers = document.querySelectorAll('#custom-question-timeline .timeline-marker');
    if (!markers || !markers.length) return;
    markers.forEach((marker, idx) => {
      const q = courseQuestions[idx];
      if (!q) return;
      const isAnswered = answeredQuestions.includes(String(q.id));
      marker.classList.toggle('answered', isAnswered);
      marker.classList.toggle('upcoming', !isAnswered);
      const tt = marker.querySelector('.timeline-tooltip');
      if (tt) {
        const timeLabel = `${Math.floor((q.timestamp||0) / 60)}:${String(Math.floor((q.timestamp||0) % 60)).padStart(2, '0')}`;
        tt.textContent = `سؤال ${idx + 1} • ${timeLabel}`;
      }
    });
  } catch (e) {
    console.warn('refreshTimelineMarkers failed', e);
  }
}

// Check if any questions should be shown at current video time
function checkForQuestions() {
  if (!window.muxPlayer || !courseQuestions.length || isQuestionActive) {
    return;
  }

  try {
    const currentTime = window.muxPlayer.currentTime;
    if (typeof currentTime !== 'number' || isNaN(currentTime)) {
      return;
    }
    
    // Don't check for questions too frequently at the same timestamp
    // This prevents multiple triggers at the same position
    if (Math.abs(currentTime - lastQuestionTime) < 0.5) {
      return;
    }

    // Find questions that should trigger at current time (within 1 second tolerance)
    const questionsToShow = courseQuestions.filter(q => {
      const questionTime = q.timestamp;
      const timeDiff = Math.abs(currentTime - questionTime);
      
      // Multiple conditions to prevent showing a question:
      // 1. Question already answered
      // 2. Question was recently shown (within last 10 seconds)
      // 3. Time difference is more than 1 second
      const alreadyAnswered = answeredQuestions.includes(String(q.id));
      const recentlyShown = recentlyShownQuestions.includes(q.id);
      const shouldShow = timeDiff <= 1 && !alreadyAnswered && !recentlyShown;
      
      if (shouldShow) {
        enhancedDebugLog('QUESTION_TRIGGER', `Question ${q.id} triggered`, {
          currentTime,
          questionTime,
          timeDiff,
          question: q.question.substring(0, 50)
        });
      }
      
      return shouldShow;
    });

    if (questionsToShow.length > 0) {
      // Show the first question
      const questionToShow = questionsToShow[0];
      showQuestion(questionToShow);
      
      // Add to recently shown questions to prevent showing again
      recentlyShownQuestions.push(questionToShow.id);
      lastQuestionTime = currentTime;
      
      // Remove from recently shown after 10 seconds
      // This is a safety measure in case the answer submission fails
      setTimeout(() => {
        recentlyShownQuestions = recentlyShownQuestions.filter(id => id !== questionToShow.id);
      }, 10000);
    }
  } catch (error) {
    console.error('Error checking for questions:', error);
  }
}

// Create mobile-optimized question modal HTML
function createQuestionModalHTML() {
  return `
    <div class="modal fade" id="questionModal" tabindex="-1" aria-labelledby="questionModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content question-modal-content">
          <div class="modal-header question-modal-header">
            <h5 class="modal-title" id="questionModalLabel">
              <i class="fas fa-question-circle text-primary"></i>
              سؤال تفاعلي
            </h5>
          </div>
          <div class="modal-body question-modal-body">
            <!-- Question Image -->
            <div id="questionImageWrapper" class="question-image-wrapper mb-3" style="display: none;">
              <img id="questionImage" class="question-image" alt="صورة السؤال">
            </div>
            
            <!-- Question Text -->
            <div class="question-text-container mb-4">
              <p id="questionText" class="question-text"></p>
            </div>
            
            <!-- Question Options -->
            <div id="questionOptions" class="question-options mb-3"></div>
            
            <!-- Text Answer Section -->
            <div id="textAnswerSection" class="text-answer-section mb-3" style="display: none;">
              <div class="form-group">
                <label for="textAnswer" class="form-label">إجابتك:</label>
                <textarea id="textAnswer" class="form-control text-answer-input" rows="3" placeholder="اكتب إجابتك هنا..."></textarea>
              </div>
            </div>
            
            <!-- Question Explanation -->
            <div id="questionExplanation" class="question-explanation" style="display: none;"></div>
          </div>
          <div class="modal-footer question-modal-footer">
            <button type="button" id="continueBtn" class="btn btn-secondary btn-lg w-100" disabled>
              الإجابة للمتابعة
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <style>
      .question-modal-content {
        border-radius: 16px;
        border: none;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      }
      
      .question-modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 16px 16px 0 0;
        padding: 1.25rem;
        border-bottom: none;
      }
      
      .question-modal-body {
        padding: 1.5rem;
        max-height: 70vh;
        overflow-y: auto;
      }
      
      .question-text {
        font-size: 1.1rem;
        font-weight: 500;
        line-height: 1.6;
        color: #333;
        margin-bottom: 0;
      }
      
      .question-image {
        width: 100%;
        max-height: 200px;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .question-options {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      
      .question-option {
        padding: 1rem;
        border: 2px solid #e9ecef;
        border-radius: 12px;
        background: #f8f9fa;
        transition: all 0.3s ease;
        font-size: 1rem;
        font-weight: 500;
        text-align: right;
        cursor: pointer;
      }
      
      .question-option:hover {
        border-color: #007bff;
        background: #e3f2fd;
        transform: translateY(-1px);
      }
      
      .question-option.selected {
        border-color: #007bff;
        background: #007bff;
        color: white;
      }
      
      .question-option.correct {
        border-color: #28a745;
        background: #28a745;
        color: white;
      }
      
      .question-option.incorrect {
        border-color: #dc3545;
        background: #dc3545;
        color: white;
      }
      
      .text-answer-input {
        border-radius: 8px;
        border: 2px solid #e9ecef;
        padding: 0.75rem;
        font-size: 1rem;
        resize: vertical;
        min-height: 80px;
      }
      
      .text-answer-input:focus {
        border-color: #007bff;
        box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
      }
      
      .question-explanation {
        padding: 1rem;
        border-radius: 8px;
        margin-top: 1rem;
      }
      
      .question-modal-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e9ecef;
        border-radius: 0 0 16px 16px;
      }
      
      #continueBtn {
        border-radius: 12px;
        padding: 0.875rem 1.5rem;
        font-weight: 600;
        font-size: 1.1rem;
        transition: all 0.3s ease;
      }
      
      #continueBtn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      #continueBtn.btn-success {
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        border: none;
      }
      
      #continueBtn.btn-success:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(40,167,69,0.3);
      }
      
      /* Mobile optimizations */
      @media (max-width: 768px) {
        .modal-dialog {
          margin: 0.5rem;
          max-width: calc(100% - 1rem);
        }
        
        .question-modal-body {
          padding: 1rem;
          max-height: 60vh;
        }
        
        .question-text {
          font-size: 1rem;
        }
        
        .question-option {
          padding: 0.875rem;
          font-size: 0.95rem;
        }
        
        .question-image {
          max-height: 150px;
        }
        
        #continueBtn {
          font-size: 1rem;
          padding: 0.75rem 1rem;
        }
      }
      
      /* Extra small screens */
      @media (max-width: 576px) {
        .modal-dialog {
          margin: 0.25rem;
          max-width: calc(100% - 0.5rem);
        }
        
        .question-modal-header {
          padding: 1rem;
        }
        
        .question-modal-body {
          padding: 0.875rem;
        }
        
        .question-text {
          font-size: 0.95rem;
        }
        
        .question-option {
          padding: 0.75rem;
          font-size: 0.9rem;
        }
      }
    </style>
  `;
}

// Show question modal with mobile optimization
function showQuestion(question) {
  currentQuestion = question;
  // Expose on window for handlers that access it
  window.currentQuestion = question;
  isQuestionActive = true;
  
  enhancedDebugLog('QUESTION_SHOW', 'Showing question', {
    id: question.id,
    type: question.type,
    timestamp: question.timestamp
  });
  
  // Pause video
  if (window.muxPlayer) {
    try {
      window.muxPlayer.pause();
    } catch (err) {
      console.log('Error pausing video:', err);
    }
  }
  
  // Exit fullscreen if active
  const wasInFullscreen = exitFullscreen();
  
  // Create modal if it doesn't exist
  if (!document.getElementById('questionModal')) {
    $('body').append(createQuestionModalHTML());
  }
  
  // Initialize Bootstrap modal
  try {
    if (!questionModal) {
      questionModal = new bootstrap.Modal(document.getElementById('questionModal'), {
        backdrop: 'static',
        keyboard: false
      });
      window.questionModal = questionModal;
    }
  } catch (e) {
    console.error('Error initializing modal:', e);
    // Fallback to jQuery modal
    setTimeout(() => {
      $('#questionModal').modal({
        backdrop: 'static',
        keyboard: false
      });
    }, 100);
  }
  
  // Prepare and show modal with better handling on mobile
  if (window.isMobile) {
    if (wasInFullscreen) {
      // Wait for actual fullscreen exit event, then show immediately
      waitForFullscreenExit(() => prepareAndShowQuestionModal(question, wasInFullscreen));
    } else {
      setTimeout(() => prepareAndShowQuestionModal(question, wasInFullscreen), 250);
    }
  } else {
    prepareAndShowQuestionModal(question, wasInFullscreen);
  }
}

// Prepare question modal content
function prepareAndShowQuestionModal(question, wasInFullscreen = false) {
  // Clear previous content
  $('#questionOptions').empty();
  $('#textAnswerSection').hide();
  $('#textAnswer').val('');
  $('#questionExplanation').hide();
  
  // Set question image if exists
  if (question.imagePath || question.imageUrl) {
    const imageUrl = question.imageUrl || buildImageUrl(question.imagePath);
    $('#questionImage').attr('src', imageUrl);
    $('#questionImageWrapper').show();
  } else {
    $('#questionImageWrapper').hide();
  }
  
  // Set question text
  $('#questionText').text(question.question || question.text || '');
  
  // Setup question based on type
  if (question.type === 'multiple_choice') {
    setupMultipleChoiceQuestion(question);
  } else if (question.type === 'true_false') {
    setupTrueFalseQuestion(question);
  } else if (question.type === 'text') {
    setupTextQuestion(question);
  }
  
  // Setup continue button
  setupContinueButton(question);
  
  // Show modal
  try {
    if (questionModal) {
      questionModal.show();
    } else {
      $('#questionModal').modal('show');
    }
  } catch (e) {
    console.error('Error showing modal:', e);
    $('#questionModal').modal('show');
  }

  // Ensure visibility on mobile after exiting fullscreen
  if (window.isMobile) {
    setTimeout(() => {
      try {
        const modalEl = document.getElementById('questionModal');
        if (modalEl && typeof modalEl.scrollIntoView === 'function') {
          modalEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (_) {}
    }, wasInFullscreen ? 150 : 50);
  }
}

// Setup multiple choice question
function setupMultipleChoiceQuestion(question) {
  if (!question.options || question.options.length === 0) {
    console.error('Multiple choice question has no options');
    return;
  }
  
  question.options.forEach((option, index) => {
    const optionBtn = $(`
      <button class="question-option" data-index="${index}">
        ${option}
      </button>
    `);
    
    optionBtn.on('click', function() {
      $('.question-option').removeClass('selected');
      $(this).addClass('selected');
      $('#continueBtn').prop('disabled', false).removeClass('btn-secondary').addClass('btn-primary');
    });
    
    $('#questionOptions').append(optionBtn);
  });
}

// Setup true/false question
function setupTrueFalseQuestion(question) {
  // Add a special class to the options container for true/false styling
  $('#questionOptions').addClass('true-false-options');
  
  // Arabic labels for true/false
  const options = ['خطأ', 'صحيح'];
  const icons = ['fas fa-times', 'fas fa-check'];
  const colors = ['btn-outline-danger', 'btn-outline-success'];
  
  // Add style for true/false buttons if not already added
  if (!document.getElementById('true-false-styles')) {
    const tfStyles = `
      <style id="true-false-styles">
        .true-false-options {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 20px 0;
        }
        
        .true-false-options .question-option {
          min-width: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 15px;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .true-false-options .question-option i {
          font-size: 24px;
          margin-bottom: 8px;
        }
        
        .true-false-options .question-option.selected {
          transform: scale(1.05);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        @media (max-width: 576px) {
          .true-false-options .question-option {
            min-width: 100px;
            padding: 12px;
          }
        }
      </style>
    `;
    $('head').append(tfStyles);
  }
  
  // Create the true/false buttons
  options.forEach((option, index) => {
    const optionBtn = $(`
      <button class="question-option ${colors[index]}" data-index="${index}">
        <i class="${icons[index]}"></i>
        <span>${option}</span>
      </button>
    `);
    
    optionBtn.on('click', function() {
      // Remove selected state from all options
      $('.question-option').removeClass('selected btn-danger btn-success')
        .addClass(index => $(this).data('index') === 0 ? 'btn-outline-danger' : 'btn-outline-success');
      
      // Add selected state to this option
      $(this).addClass('selected').removeClass('btn-outline-danger btn-outline-success');
      if (index === 0) {
        $(this).addClass('btn-danger');
      } else {
        $(this).addClass('btn-success');
      }
      
      // Enable continue button
      $('#continueBtn').prop('disabled', false).removeClass('btn-secondary').addClass('btn-primary');
      
      enhancedDebugLog('TRUE_FALSE', `Selected ${option} (${index})`);
    });
    
    $('#questionOptions').append(optionBtn);
  });
}

// Setup text question
function setupTextQuestion(question) {
  $('#textAnswerSection').show();
  $('#textAnswer').focus();
  
  $('#textAnswer').off('input').on('input', function() {
    const hasText = $(this).val().trim() !== '';
    $('#continueBtn').prop('disabled', !hasText);
    if (hasText) {
      $('#continueBtn').removeClass('btn-secondary').addClass('btn-primary');
    } else {
      $('#continueBtn').removeClass('btn-primary').addClass('btn-secondary');
    }
  });
}

// Setup continue button
function setupContinueButton(question) {
  const continueBtn = $('#continueBtn');
  
  // Check if already answered
  if (answeredQuestions.includes(String(question.id))) {
    continueBtn.prop('disabled', false)
      .removeClass('btn-secondary btn-primary')
      .addClass('btn-success')
      .text('متابعة الفيديو');
  } else {
    continueBtn.prop('disabled', true)
      .removeClass('btn-success btn-primary')
      .addClass('btn-secondary')
      .text('الإجابة للمتابعة');
  }
  
  // Remove previous event handlers
  continueBtn.off('click');
  
  // Add click handler
  continueBtn.on('click', function() {
    if (answeredQuestions.includes(String(question.id))) {
      // Already answered, just continue
      hideQuestionModal();
    } else {
      // Submit answer first
      handleAnswerSubmission(question);
    }
  });
}

// Handle answer submission
function handleAnswerSubmission(question) {
  let selectedAnswer = null;
  
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    const selectedOption = $('.question-option.selected');
    if (selectedOption.length === 0) {
      return; // No option selected
    }
    selectedAnswer = selectedOption.data('index').toString();
  } else if (question.type === 'text') {
    selectedAnswer = $('#textAnswer').val().trim();
    if (!selectedAnswer) {
      return; // No text entered
    }
  }
  
  // Submit answer to backend
  submitQuestionAnswer(question.id, selectedAnswer);
}

// Show the correct answer without submitting to backend
function showCorrectAnswer(question) {
  // Mark as answered locally
  if (!answeredQuestions.includes(String(question.id))) {
    answeredQuestions.push(String(question.id));
    // Update timeline marker states
    refreshTimelineMarkers();
  }
  
  // Get the correct answer from the question object
  let correctAnswerText = '';
  let userSelectedAnswer = null;
  
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    const selectedOption = $('.question-option.selected');
    if (selectedOption.length > 0) {
      userSelectedAnswer = parseInt(selectedOption.data('index'));
    }
    
    // Get the correct answer text (support both index and direct text)
    const correctIndex = parseInt(question.correctAnswer);
    if (Array.isArray(question.options) && !isNaN(correctIndex) && question.options[correctIndex] !== undefined) {
      correctAnswerText = question.options[correctIndex];
    } else if (typeof question.correctAnswer === 'string') {
      correctAnswerText = question.correctAnswer;
    } else {
      correctAnswerText = '';
    }
    
    // For true/false questions, convert 0/1 to readable text
    if (question.type === 'true_false') {
      correctAnswerText = correctIndex === 1 ? 'صحيح' : 'خطأ';
    }
  } else if (question.type === 'text') {
    userSelectedAnswer = $('#textAnswer').val().trim();
    // Normalize correct answers: can be string (comma-separated) or array
    let normalizedCorrect = [];
    if (Array.isArray(question.correctAnswer)) {
      normalizedCorrect = question.correctAnswer;
    } else if (typeof question.correctAnswer === 'string') {
      normalizedCorrect = question.correctAnswer.split(',');
    } else if (typeof question.correctAnswer === 'number') {
      normalizedCorrect = [String(question.correctAnswer)];
    } else if (Array.isArray(question.correctAnswers)) {
      // fallback alternate field name
      normalizedCorrect = question.correctAnswers;
    }
    // For display
    correctAnswerText = Array.isArray(normalizedCorrect) ? normalizedCorrect.join('، ') : (question.correctAnswer || '');
  }
  
  // Check if the user's answer is correct
  let isCorrect = false;
  if (question.type === 'multiple_choice' || question.type === 'true_false') {
    isCorrect = userSelectedAnswer === parseInt(question.correctAnswer);
  } else if (question.type === 'text') {
    // For text questions, check if the answer matches any acceptable answers
    let acceptableAnswers = [];
    if (Array.isArray(question.correctAnswer)) {
      acceptableAnswers = question.correctAnswer;
    } else if (typeof question.correctAnswer === 'string') {
      acceptableAnswers = question.correctAnswer.split(',');
    } else if (typeof question.correctAnswer === 'number') {
      acceptableAnswers = [String(question.correctAnswer)];
    } else if (Array.isArray(question.correctAnswers)) {
      acceptableAnswers = question.correctAnswers;
    }
    acceptableAnswers = acceptableAnswers.map(ans => String(ans).trim().toLowerCase()).filter(Boolean);
    isCorrect = acceptableAnswers.includes(String(userSelectedAnswer || '').trim().toLowerCase());
  }
  
  // Show the feedback with correct answer
  showAnswerFeedback(isCorrect, question.explanation, correctAnswerText, question);
  
  enhancedDebugLog('ANSWER_SHOWN', 'Showing answer feedback', {
    questionId: question.id,
    questionType: question.type,
    isCorrect: isCorrect,
    correctAnswer: correctAnswerText
  });
}

// Submit answer to backend - DISABLED, using local validation instead
async function submitQuestionAnswer(questionId, answer) {
  try {
    // Get the current question
    const currentQuestion = window.currentQuestion;
    if (!currentQuestion) {
      console.error('No current question found');
      return;
    }
    
    // Show the correct answer directly without API call
    showCorrectAnswer(currentQuestion);
    
  } catch (error) {
    console.error('Error processing answer:', error);
    // Still allow continuation on error
    hideQuestionModal();
  }
}

// Show answer feedback
function showAnswerFeedback(isCorrect, explanation, correctAnswerText, question) {
  const explanationDiv = $('#questionExplanation');
  const currentQuestion = question || window.currentQuestion;
  let feedbackTitle = isCorrect ? 'إجابة صحيحة! 🎉' : 'إجابة خاطئة 😔';

  // Ensure we have correctAnswerText; compute from question if missing
  if (!correctAnswerText && currentQuestion) {
    try {
      if (currentQuestion.type === 'multiple_choice') {
        const idx = parseInt(currentQuestion.correctAnswer);
        if (Array.isArray(currentQuestion.options) && currentQuestion.options[idx] !== undefined) {
          correctAnswerText = currentQuestion.options[idx];
        }
      } else if (currentQuestion.type === 'true_false') {
        const idx = parseInt(currentQuestion.correctAnswer);
        correctAnswerText = idx === 1 ? 'صحيح' : 'خطأ';
      } else if (currentQuestion.type === 'text') {
        correctAnswerText = currentQuestion.correctAnswer || '';
      }
    } catch (e) {
      console.warn('Could not compute correctAnswerText from question', e);
    }
  }
  
  // Add feedback styles if not already added
  if (!document.getElementById('feedback-styles')) {
    const feedbackStyles = `
      <style id="feedback-styles">
        .feedback-icon {
          font-size: 1.5rem;
          margin-right: 0.5rem;
          vertical-align: middle;
        }
        
        .feedback-text {
          font-weight: bold;
          font-size: 1.2rem;
        }
        
        .explanation-content {
          margin-top: 1rem;
          padding: 0.75rem;
          border-radius: 8px;
          background-color: rgba(255,255,255,0.15);
          font-size: 1.05rem;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .correct-answer {
          margin-top: 0.75rem;
          padding: 0.5rem 0.75rem;
          background-color: rgba(0,0,0,0.1);
          border-radius: 6px;
          font-weight: bold;
          border-right: 3px solid #17a2b8;
          color: #17a2b8;
        }
        
        .alert.alert-success {
          background-color: rgba(40, 167, 69, 0.2) !important;
          border: 2px solid rgba(40, 167, 69, 0.5) !important;
        }
        
        .alert.alert-danger {
          background-color: rgba(220, 53, 69, 0.2) !important;
          border: 2px solid rgba(220, 53, 69, 0.5) !important;
        }
      </style>
    `;
    $('head').append(feedbackStyles);
  }
  
  // Special feedback for true/false questions
  if (currentQuestion && currentQuestion.type === 'true_false') {
    const tfFeedback = isCorrect ? 
      '<i class="fas fa-check-circle feedback-icon" style="font-size: 1.8rem; color: #28a745;"></i> <span class="feedback-text">إجابة صحيحة! 🎉</span>' : 
      '<i class="fas fa-times-circle feedback-icon" style="font-size: 1.8rem; color: #dc3545;"></i> <span class="feedback-text">إجابة خاطئة 😔</span>';
    feedbackTitle = tfFeedback;
  } else if (currentQuestion && currentQuestion.type === 'multiple_choice') {
    // Enhanced feedback for multiple choice
    const mcqFeedback = isCorrect ? 
      '<i class="fas fa-check-circle feedback-icon" style="color: #28a745;"></i> <span class="feedback-text">إجابة صحيحة! 🎉</span>' : 
      '<i class="fas fa-times-circle feedback-icon" style="color: #dc3545;"></i> <span class="feedback-text">إجابة خاطئة 😔</span>';
    feedbackTitle = mcqFeedback;
  } else if (currentQuestion && currentQuestion.type === 'text') {
    // Enhanced feedback for text questions
    const textFeedback = isCorrect ? 
      '<i class="fas fa-check-circle feedback-icon" style="color: #28a745;"></i> <span class="feedback-text">إجابة صحيحة! 🎉</span>' : 
      '<i class="fas fa-times-circle feedback-icon" style="color: #dc3545;"></i> <span class="feedback-text">إجابة خاطئة 😔</span>';
    feedbackTitle = textFeedback;
  }
  
  // Make the explanation div more prominent for all question types
  explanationDiv.css({
    'padding': '1.2rem',
    'border-radius': '12px',
    'margin-top': '15px',
    'margin-bottom': '15px',
    'box-shadow': '0 4px 8px rgba(0,0,0,0.1)'
  });
  
  // Prepare the correct answer display
  let correctAnswerHtml = '';
  if (typeof correctAnswerText === 'number') correctAnswerText = String(correctAnswerText);
  if (correctAnswerText) {
    correctAnswerHtml = `
      <div class="correct-answer">
        <i class="fas fa-info-circle"></i> الإجابة الصحيحة: ${correctAnswerText}
      </div>
    `;
  }
  
  explanationDiv.removeClass('alert-success alert-danger')
    .addClass(isCorrect ? 'alert-success' : 'alert-danger')
    .addClass('alert')
    .html(`
      <strong>${feedbackTitle}</strong>
      ${correctAnswerHtml}
      <div class="explanation-content">
        ${explanation || 'لا يوجد شرح متاح.'}
      </div>
    `)
    .hide()
    .fadeIn(400)
    .show();
  
  // Temporarily disable continue button to ensure feedback is seen
  $('#continueBtn').prop('disabled', true);
  
  // Enable continue button after a short delay for all question types
  setTimeout(() => {
    $('#continueBtn')
      .prop('disabled', false)
      .removeClass('btn-primary btn-secondary')
      .addClass('btn-success')
      .text('متابعة الفيديو');

    // Ensure the next click closes the modal (one-time)
    $('#continueBtn').off('click').one('click', function() {
      hideQuestionModal();
    });
  }, 1500); // 1.5 second delay
  
  // Log feedback shown
  enhancedDebugLog('FEEDBACK_SHOWN', `Showing ${isCorrect ? 'correct' : 'incorrect'} answer feedback`, {
    questionType: currentQuestion ? currentQuestion.type : 'unknown',
    hasExplanation: !!explanation,
    correctAnswer: correctAnswerText
  });
}

// Hide question modal and resume video
function hideQuestionModal() {
  isQuestionActive = false;
  currentQuestion = null;
  window.currentQuestion = null;
  
  try {
    if (questionModal) {
      questionModal.hide();
    } else {
      $('#questionModal').modal('hide');
    }
  } catch (e) {
    console.error('Error hiding modal:', e);
    $('#questionModal').modal('hide');
  }
  
  // Resume video playback after modal is hidden
  $('#questionModal').on('hidden.bs.modal', function () {
    // Clean up any special question type classes
    $('#questionOptions').removeClass('true-false-options');
    
    if (window.muxPlayer) {
      try {
        window.muxPlayer.play();
      } catch (err) {
        console.log('Error resuming playback:', err);
      }
    }
    // Remove event listener
    $('#questionModal').off('hidden.bs.modal');
  });
}

// Start question checking interval
function startQuestionChecking() {
  if (questionCheckInterval) {
    clearInterval(questionCheckInterval);
  }
  
  questionCheckInterval = setInterval(checkForQuestions, 1000);
  enhancedDebugLog('QUESTIONS', 'Started question checking interval');
}

// Stop question checking interval
function stopQuestionChecking() {
  if (questionCheckInterval) {
    clearInterval(questionCheckInterval);
    questionCheckInterval = null;
    enhancedDebugLog('QUESTIONS', 'Stopped question checking interval');
  }
}

// Create a custom timeline with question markers directly below the video player
function addQuestionMarkersToTimeline() {
  console.log('[TIMELINE] Starting to add question markers');
  if (!window.muxPlayer || !courseQuestions.length) {
    console.log('[TIMELINE] Cannot add markers: player or questions not available', {
      playerExists: !!window.muxPlayer,
      questionsCount: courseQuestions?.length || 0
    });
    return;
  }
  
  try {
    // Get video duration
    const duration = window.muxPlayer.duration;
    if (!duration || isNaN(duration) || duration <= 0) {
      // Try again later if duration is not available yet
      console.log('[TIMELINE] Video duration not available yet, retrying in 1s');
      setTimeout(addQuestionMarkersToTimeline, 1000);
      return;
    }
    
    console.log(`[TIMELINE] Adding ${courseQuestions.length} markers to timeline (video duration: ${duration}s)`);
    
    // Remove any existing custom timeline
    const existingTimeline = document.getElementById('custom-question-timeline');
    if (existingTimeline) {
      existingTimeline.remove();
    }
    
    // Create a completely separate timeline below the video player
    const videoContainer = window.muxPlayer.closest('.video-container') || window.muxPlayer.parentElement;
    
    // Create the custom timeline container
    const customTimeline = document.createElement('div');
    customTimeline.id = 'custom-question-timeline';
    customTimeline.style.cssText = `
      width: 100%;
      height: 30px;
      background-color: #2a2a2a;
      position: relative;
      margin-top: 10px;
      border-radius: 4px;
      overflow: hidden;
    `;
    
    // Add a progress bar to the timeline
    const progressBar = document.createElement('div');
    progressBar.id = 'timeline-progress';
    progressBar.style.cssText = `
      position: absolute;
      left: 0;
      height: 100%;
      background: linear-gradient(90deg, #4e54c8 0%, #8f94fb 100%);
      width: 0%;
      transition: width 0.1s linear;
      opacity: 0.35;
    `;
    customTimeline.appendChild(progressBar);
    
    // Add a label to explain what this is (for RTL)
    const timelineLabel = document.createElement('div');
    timelineLabel.style.cssText = `
      position: absolute;
      right: 10px;
      top: 5px;
      color: white;
      font-size: 12px;
      z-index: 2;
    `;
    timelineLabel.textContent = 'أسئلة الفيديو:'; // "Video Questions" in Arabic
    customTimeline.appendChild(timelineLabel);
    
    // Add CSS for the timeline and markers
    const style = document.createElement('style');
    style.textContent = `
      #custom-question-timeline {
        user-select: none;
        background: linear-gradient(180deg, #1f1f1f 0%, #222 100%);
        border: 1px solid rgba(255,255,255,0.08);
      }
      
      /* Subtle stripe for the base track */
      #custom-question-timeline::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.04) 75%, rgba(255,255,255,0.02) 75%);
        background-size: 12px 100%;
        pointer-events: none;
      }
      
      .timeline-marker {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 6;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
      }
      
      .timeline-marker::after {
        content: '';
        position: absolute;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 60%);
        opacity: 0.35;
        pointer-events: none;
      }
      
      /* States */
      .timeline-marker.upcoming { background-color: #ff7043; box-shadow: 0 0 10px rgba(255,112,67,0.7); }
      .timeline-marker.answered { background-color: #2ecc71; box-shadow: 0 0 10px rgba(46,204,113,0.6); opacity: 0.85; }
      .timeline-marker.active { background-color: #ffd54f; box-shadow: 0 0 14px rgba(255,213,79,0.9); transform: translate(-50%, -50%) scale(1.1); }
      
      .timeline-marker:hover, .timeline-marker:focus { transform: translate(-50%, -50%) scale(1.15); outline: none; }
      
      /* Tooltip */
      .timeline-tooltip {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(4px);
        color: #fff;
        padding: 6px 10px;
        border-radius: 8px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
        z-index: 10;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .timeline-tooltip::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 6px 6px 0 6px;
        border-style: solid;
        border-color: rgba(0,0,0,0.85) transparent transparent transparent;
      }
      
      .timeline-marker:hover .timeline-tooltip,
      .timeline-marker:focus .timeline-tooltip {
        opacity: 1;
        transform: translateX(-50%) translateY(-2px);
      }
      
      #custom-question-timeline:hover { cursor: pointer; }
      
      /* Mobile: increase touch target */
      @media (max-width: 768px) {
        .timeline-marker { width: 22px; height: 22px; }
        .timeline-tooltip { font-size: 13px; bottom: 36px; }
      }
    `;
    document.head.appendChild(style);
    
    // Add markers for each question
    courseQuestions.forEach((question, index) => {
      if (!question.timestamp || isNaN(question.timestamp)) return;
      
      // Calculate position as percentage of video duration
      const position = (question.timestamp / duration) * 100;
      
      const marker = document.createElement('div');
      const isAnswered = answeredQuestions.includes(String(question.id));
      marker.className = `timeline-marker ${isAnswered ? 'answered' : 'upcoming'}`;
      // Position from the left to match video player timeline
      marker.style.left = `${position}%`;
      
      // Add tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'timeline-tooltip';
      const timeLabel = `${Math.floor(question.timestamp / 60)}:${String(Math.floor(question.timestamp % 60)).padStart(2, '0')}`;
      tooltip.textContent = `سؤال ${index + 1} • ${timeLabel}`;
      marker.appendChild(tooltip);
      
      // Accessibility
      marker.setAttribute('role', 'button');
      marker.setAttribute('tabindex', '0');
      marker.setAttribute('aria-label', `سؤال ${index + 1} عند ${timeLabel}${isAnswered ? ' (تمت الإجابة)' : ''}`);
      
      // Make marker clickable
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.muxPlayer) {
          console.log(`[TIMELINE] Jumping to question at ${question.timestamp}s`);
          window.muxPlayer.currentTime = question.timestamp;
        }
      });
      // Keyboard support
      marker.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          marker.click();
        }
      });
      
      customTimeline.appendChild(marker);
    });
    
    // Make the entire timeline clickable to seek (with question gate)
    customTimeline.addEventListener('click', (e) => {
      const rect = customTimeline.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const seekTime = duration * clickPosition;

      if (!window.muxPlayer) return;

      const current = window.muxPlayer.currentTime || 0;
      const gate = findNextUnansweredQuestionBetween(current, seekTime);
      if (seekTime > current && gate) {
        // Snap to just before the question and pause
        window.muxPlayer.currentTime = Math.max(gate.timestamp - 0.2, 0);
        window.muxPlayer.pause();
        enhancedDebugLog('GUARD', `Blocked skip over question @${gate.timestamp}s via custom timeline`);
        return;
      }

      window.muxPlayer.currentTime = seekTime;
    });
    
    // Update progress bar as video plays
    function updateProgress() {
      if (window.muxPlayer && progressBar) {
        const progress = (window.muxPlayer.currentTime / duration) * 100;
        progressBar.style.width = `${progress}%`;
        requestAnimationFrame(updateProgress);
      }
    }
    
    // Insert the custom timeline after the video player
    videoContainer.insertAdjacentElement('afterend', customTimeline);
    
    // Start updating progress
    updateProgress();
    
    console.log('[TIMELINE] Custom question timeline added successfully');
    
  } catch (error) {
    console.error('[TIMELINE] Error adding question timeline:', error);
  }
}

$(document).ready(function () {
  // Force using production API to prevent localhost connection errors
  window.API_BASE_URL = 'https://api.hamdan.help/api';
  //window.API_BASE_URL = 'http://localhost:3000/api';
  
  // Detect if user is on mobile
  window.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Global reference to the video player
  window.muxPlayer = null;
  
  // Add viewport height fix for mobile browsers
  function setMobileViewportHeight() {
    if (window.isMobile) {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
  }
  
  // Handle fullscreen change events for mobile video
  function setupFullscreenChangeHandlers() {
    // Listen for fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Handle orientation changes on mobile devices
    if (window.isMobile) {
      window.addEventListener('orientationchange', handleOrientationChange);
      // Also listen for resize events which happen on orientation change
      window.addEventListener('resize', debounce(handleOrientationChange, 300));
    }
  }
  
  // Debounce function to prevent multiple rapid calls
  function debounce(func, wait) {
    let timeout;
    return function() {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }
  
  // Handle device orientation changes
  function handleOrientationChange() {
    console.log('[VideoPlayer] Orientation or size changed');
    
    // Fix video player visibility after orientation change
    setTimeout(() => {
      if (window.muxPlayer) {
        // Force display properties
        window.muxPlayer.style.display = 'block';
        window.muxPlayer.style.opacity = '1';
        window.muxPlayer.style.visibility = 'visible';
        window.muxPlayer.style.width = '100%';
        
        // Force redraw
        window.muxPlayer.style.transform = 'translateZ(0)';
        setTimeout(() => {
          if (window.muxPlayer) window.muxPlayer.style.transform = '';
        }, 50);
      }
    }, 500);
  }
  
  // Handle fullscreen change events
  function handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                          document.mozFullScreenElement || document.msFullscreenElement);
    
    console.log(`[VideoPlayer] Fullscreen state changed: ${isFullscreen ? 'entered' : 'exited'}`);
    
    // If exiting fullscreen
    if (!isFullscreen && window.muxPlayer) {
      // Apply fixes for video visibility
      setTimeout(() => {
        if (window.muxPlayer) {
          window.muxPlayer.style.display = 'block';
          window.muxPlayer.style.opacity = '1';
          window.muxPlayer.style.visibility = 'visible';
          window.muxPlayer.style.width = '100%';
          
          // Force redraw
          window.muxPlayer.style.transform = 'translateZ(0)';
          window.muxPlayer.style.transform = '';
        }
      }, window.isMobile ? 500 : 100);
    }
  }
  
  // Set initial viewport height and update on resize
  setMobileViewportHeight();
  window.addEventListener('resize', setMobileViewportHeight);
  
  // Setup fullscreen change handlers for video
  setupFullscreenChangeHandlers();

  // Helper: build absolute URL for images when backend returns relative paths (e.g., uploads/images/..)
  function buildImageUrl(p) {
    if (!p) return '';
    // If already absolute, return as-is
    if (/^https?:\/\//i.test(p)) return p;
    // Ensure no leading slash duplication
    const clean = p.replace(/^\/+/, '');
    // Extract the base URL without the /api path
    const baseUrl = window.API_BASE_URL.replace(/\/api$/, '');
    return `${baseUrl}/${clean}`;
  }
  
  // Get platform icon
  function getPlatformIcon(platform) {
    const platformLower = platform.toLowerCase();
    if (platformLower.includes('facebook')) return 'fab fa-facebook-f';
    if (platformLower.includes('twitter')) return 'fab fa-twitter';
    if (platformLower.includes('instagram')) return 'fab fa-instagram';
    if (platformLower.includes('youtube')) return 'fab fa-youtube';
    if (platformLower.includes('linkedin')) return 'fab fa-linkedin-in';
    if (platformLower.includes('telegram')) return 'fab fa-telegram-plane';
    if (platformLower.includes('whatsapp')) return 'fab fa-whatsapp';
    if (platformLower.includes('snapchat')) return 'fab fa-snapchat-ghost';
    if (platformLower.includes('tiktok')) return 'fab fa-tiktok';
    if (platformLower.includes('website') || platformLower.includes('site')) return 'fas fa-globe';
    if (platformLower.includes('email')) return 'fas fa-envelope';
    if (platformLower.includes('phone')) return 'fas fa-phone';
    return 'fas fa-link'; // Default icon
  }
  
  const courseId = new URLSearchParams(window.location.search).get('course');
  if (!courseId) {
    $('#course-details').html('<p class="text-danger text-center">لم يتم تحديد المادة</p>');
    return;
  }
  
  const token = localStorage.getItem('token');
  if (!token) {
    $('#course-details').html('<p class="text-danger text-center">الرجاء تسجيل الدخول أولاً</p>');
    return;
  }
  
  fetch(`${window.API_BASE_URL}/courses/${courseId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('فشل في جلب البيانات');
      }
      return res.json();
    })
    .then(res => {
      if (res.success && res.data) {
        const course = res.data;
        // Social media section
        let socialMediaHtml = '';
        if (course.socialMedia && course.socialMedia.length > 0) {
          const sortedSocialMedia = [...course.socialMedia].sort((a, b) => (a.order || 0) - (b.order || 0));
          socialMediaHtml = `
            <div class="social-media-section mt-4">
              <div class="social-media-title">
                <i class="fas fa-share-alt"></i> روابط التواصل الاجتماعي
              </div>
              <div class="social-media-links">
                ${sortedSocialMedia.map(media => `
                  <a href="${media.url}" target="_blank" class="social-link ${media.platform.toLowerCase()}-link">
                    <i class="${getPlatformIcon(media.platform)}"></i>
                    <span>${media.label || media.platform}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }
        
        // Video logic with Bunny support and continue watching
        const playbackId = course.muxPlaybackId || (course.playback_ids && course.playback_ids[0]?.id) || course.playback_id;
        const playbackPolicy = course.muxPlaybackPolicy || (course.playback_ids && course.playback_ids[0]?.policy) || course.playback_policy;
        
        async function getBunnyPlayerHtml() {
          // Try to get Bunny video ID from course data
          let videoId = course.bunnyVideoId;
          
          // If no bunnyVideoId, try to extract from video URL
          if (!videoId && course.video) {
            // Extract video ID from URL like: https://vz-543301.b-cdn.net/{videoId}/playlist.m3u8
            const match = course.video.match(/\/([a-f0-9-]+)\/playlist\.m3u8/);
            if (match) {
              videoId = match[1];
            }
          }
          
          // If we have a Bunny video ID, show Bunny player
          if (videoId) {
            const lastPosition = localStorage.getItem(`course_${courseId}_position`);
            const startTime = lastPosition ? `&start=${Math.floor(lastPosition)}` : '';
            
            return `
              <div style="position:relative;padding-top:56.25%;width:100%;border-radius:12px;overflow:hidden;background:#000;">
                <iframe 
                  id="bunnyPlayer"
                  src="https://iframe.mediadelivery.net/embed/543301/${videoId}?autoplay=false&loop=false&muted=false&preload=true&responsive=true${startTime}" 
                  loading="lazy" 
                  style="border:0;position:absolute;top:0;height:100%;width:100%;" 
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture;" 
                  allowfullscreen="true"
                ></iframe>
              </div>
            `;
          }
          
          // Fallback: If no Bunny video, try Mux (commented for later use)
          return await getMuxPlayerHtml();
        }
        
        async function getMuxPlayerHtml() {
          // ===== MUX PLAYER CODE (ENABLED) =====
          if (playbackId) {
            // Fetch tokens from backend
            const tokenEndpoints = [
              { attr: 'playback-token', url: `${window.API_BASE_URL}/mux/playback-token?playbackId=${playbackId}` },
              { attr: 'drm-token', url: `${window.API_BASE_URL}/mux/drm-token?playbackId=${playbackId}` },
              { attr: 'thumbnail-token', url: `${window.API_BASE_URL}/mux/thumbnail-token?playbackId=${playbackId}` },
              { attr: 'storyboard-token', url: `${window.API_BASE_URL}/mux/storyboard-token?playbackId=${playbackId}` },
            ];
            const headers = { Authorization: `Bearer ${token}` };
            const tokenFetches = tokenEndpoints.map(e => fetch(e.url, { headers }).then(r => r.json()));
            const tokens = await Promise.all(tokenFetches);

            // Add mobile-specific attributes for better playback
            let mobileAttrs = window.isMobile ? 'preload="auto" playsinline="true"' : '';

            // Add Widevine L3 compatibility attributes for Android tablets
            let l3Attrs = '';
            if (window.isWidevineL3Device) {
              l3Attrs = 'max-resolution="480p" prefer-mse="true"';
              enhancedDebugLog('WIDEVINE_L3', 'Configuring player for Widevine L3 compatibility', {
                playbackId: playbackId,
                playbackPolicy: playbackPolicy
              });
            }

            let attrs = `playback-id="${playbackId}" style="width:100%;aspect-ratio:16/9;background:#000;border-radius:12px;" metadata-title="${course.title}" metadata-description="${course.description || ''}" stream-type="on-demand" controls ${mobileAttrs} ${l3Attrs}`;
            if (playbackPolicy === 'drm') {
              if (tokens[0].success && tokens[0].token) attrs += ` playback-token="${tokens[0].token}"`;
              if (tokens[1].success && tokens[1].token) attrs += ` drm-token="${tokens[1].token}"`;
            } else if (playbackPolicy === 'signed') {
              if (tokens[0].success && tokens[0].token) attrs += ` playback-token="${tokens[0].token}"`;
            } else if (playbackPolicy === 'public') {
              // No token needed
            } else if (Array.isArray(course.playback_ids) && course.playback_ids[0]?.policy && course.playback_ids.length > 1) {
              if (tokens[0].success && tokens[0].token) attrs += ` playback-token="${tokens[0].token}"`;
            }

            // Add storyboard token if available
            if (tokens[3].success && tokens[3].token) {
              attrs += ` storyboard-token="${tokens[3].token}"`;
            }

            // Add thumbnail token if available
            if (tokens[2].success && tokens[2].token) {
              attrs += ` thumbnail-token="${tokens[2].token}"`;
            }

            // Add continue watching functionality
            const lastPosition = localStorage.getItem(`course_${courseId}_position`);
            if (lastPosition) {
              attrs += ` start-time="${lastPosition}"`;
            }

            return `<mux-player id="muxPlayer" ${attrs}></mux-player>`;
          } else {
            return '<div class="alert alert-warning">لا يوجد فيديو متاح لهذه المادة</div>';
          }
        }
        
        // Get platform icon
        function getPlatformIcon(platform) {
          const platformLower = platform.toLowerCase();
          if (platformLower.includes('facebook')) return 'fab fa-facebook-f';
          if (platformLower.includes('twitter')) return 'fab fa-twitter';
          if (platformLower.includes('instagram')) return 'fab fa-instagram';
          if (platformLower.includes('youtube')) return 'fab fa-youtube';
          if (platformLower.includes('linkedin')) return 'fab fa-linkedin-in';
          if (platformLower.includes('telegram')) return 'fab fa-telegram-plane';
          if (platformLower.includes('whatsapp')) return 'fab fa-whatsapp';
          if (platformLower.includes('snapchat')) return 'fab fa-snapchat-ghost';
          if (platformLower.includes('tiktok')) return 'fab fa-tiktok';
          if (platformLower.includes('website') || platformLower.includes('site')) return 'fas fa-globe';
          if (platformLower.includes('email')) return 'fas fa-envelope';
          if (platformLower.includes('phone')) return 'fas fa-phone';
          return 'fas fa-link'; // Default icon
        }
        
        // Render course details in a two-column layout (right: title+video, left: details)
        const courseDetailsHtml = `
          <div class="course-layout">
            <div class="course-right">
              <div class="course-header">
                <h1 class="course-title">${course.title}</h1>
                <div class="course-meta">
                  <span class="course-duration">${course.duration || 'مدة غير محددة'}</span>
                </div>
              </div>
              <div class="course-video-container mb-4">
                <div id="mux-player-container">
                  <div class="loading-spinner">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">جاري التحميل...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="course-left">
              <div class="course-description">
                <h3>وصف المادة</h3>
                <div class="description-content">
                  ${course.description || 'لا يوجد وصف متاح لهذه المادة.'}
                </div>
              </div>
              ${socialMediaHtml}
            </div>
          </div>
        `;
        
        $('#course-details').html(courseDetailsHtml);
        
        // Initialize Bunny Player (or Mux as fallback)
        getBunnyPlayerHtml().then(html => {
          $('#mux-player-container').html(html);
          
          // Check if Bunny player was loaded (iframe exists)
          const bunnyPlayer = document.querySelector('#bunnyPlayer');
          if (bunnyPlayer) {
            // Bunny player loaded successfully
            enhancedDebugLog('BUNNY', 'Bunny player loaded successfully', { videoId: course.bunnyVideoId });
            
            // Start watching session
            fetch(`${window.API_BASE_URL}/courses/${courseId}/watch`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }).catch(err => console.error('Error starting watch session:', err));
            
            // For Bunny player, we track watch progress differently
            // Note: Bunny iframe doesn't expose playback position directly, so we track via timer
            setInterval(async () => {
              // Send heartbeat to API for watch history tracking
              try {
                await fetch(`${window.API_BASE_URL}/courses/${courseId}/watch`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    currentPosition: 0, // Bunny iframe doesn't expose position
                    duration: course.duration || 0
                  })
                });
              } catch (err) {
                console.error('Error saving watch progress:', err);
              }
            }, 10000);
            
            // Load questions for this course
            loadCourseQuestions(courseId);
          } else {
            // Wait for Mux Player to be defined (fallback)
            const checkMuxInterval = setInterval(() => {
              if (document.querySelector('mux-player')) {
                clearInterval(checkMuxInterval);
                
                // Get reference to the player
                window.muxPlayer = document.querySelector('mux-player');
                muxPlayer = window.muxPlayer;
                
                /* ===== MUX PLAYER CONFIGURATION (HIDDEN FOR LATER USE) =====
                // Configure player for Widevine L3 devices
                if (window.isWidevineL3Device && muxPlayer) {
                  try {
                    // Configure adaptive bitrate to allow SD renditions
                    muxPlayer.configure({
                      abr: {
                        restrictions: {
                          maxHeight: 480, // Allow SD for L3 devices
                          maxWidth: 854   // 480p width
                        }
                      }
                    });
                    
                    enhancedDebugLog('WIDEVINE_L3', 'Applied ABR restrictions for L3 device', {
                      maxHeight: 480,
                      maxWidth: 854
                    });
                  } catch (error) {
                    enhancedDebugLog('WIDEVINE_L3', 'Failed to configure ABR restrictions', error);
                  }
                }
                ===== END MUX PLAYER CONFIGURATION (HIDDEN) ===== */
                
                // Start watching session
                fetch(`${window.API_BASE_URL}/courses/${courseId}/watch`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }).catch(err => console.error('Error starting watch session:', err));

                // Save playback position every 10 seconds and send to API
                if (muxPlayer) {
                  setInterval(async () => {
                    if (muxPlayer && typeof muxPlayer.currentTime === 'number' && typeof muxPlayer.duration === 'number') {
                      const currentTime = muxPlayer.currentTime;
                      const duration = muxPlayer.duration;
                      if (currentTime > 0 && duration > 0) {
                        // Save to localStorage for continue watching
                        localStorage.setItem(`course_${courseId}_position`, currentTime);
                        
                        // Send to API for watch history tracking
                        try {
                          await fetch(`${window.API_BASE_URL}/courses/${courseId}/watch`, {
                            method: 'PUT',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              currentPosition: currentTime,
                              duration: duration
                            })
                          });
                        } catch (err) {
                          console.error('Error saving watch progress:', err);
                        }
                      }
                    }
                  }, 10000);
                  
                  // Load questions for this course
                  loadCourseQuestions(courseId);
                }
              }
            }, 100);
            
            setTimeout(() => clearInterval(checkMuxInterval), 2000);
          }
        });
      } else {
        $('#course-details').html('<p class="text-danger text-center">لم يتم العثور على المادة</p>');
      }
    })
    .catch(error => {
      console.error('Error fetching course details:', error);
      $('#course-details').html(`<p class="text-danger text-center">حدث خطأ أثناء جلب البيانات: ${error.message}</p>`);
    });
});
