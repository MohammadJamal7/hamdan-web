// Ramadan Greeting Card Generator
class RamadanGreetingCard {
    constructor() {
        this.canvas = document.getElementById('greetingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.userName = '';
        this.selectedGreeting = '';
        this.selectedTemplateId = null; // Store selected template ID
        this.baseImage = null;
        this.imageLoaded = false;
        this.greetings = {};
        this.templates = []; // Store all templates
        this.settings = null;
        
        // API Configuration
        this.apiBase = 'https://api.hamdan.help/api';
        //this.apiBase = 'http://localhost:3000/api';
        
        // Load data from backend
        this.loadData();
    }

    async loadData() {
        try {
            // Load greetings and settings in parallel
            const [greetingsResponse, settingsResponse] = await Promise.all([
                fetch(`${this.apiBase}/ramadan/greetings`),
                fetch(`${this.apiBase}/ramadan/settings`)
            ]);

            const greetingsData = await greetingsResponse.json();
            const settingsData = await settingsResponse.json();

            // Check if greetings are enabled in admin settings
            let greetingsEnabled = true;
            if (settingsData.success && settingsData.data) {
                this.settings = settingsData.data;
                console.log('[Ramadan Greeting] Settings loaded:', {
                    isActive: this.settings.isActive,
                    userNameColor: this.settings.userNameColor,
                    userNameFont: this.settings.userNameFont,
                    userNameFontSize: this.settings.userNameFontSize,
                    hasTemplates: this.settings.templates?.length || 0
                });
                // If admin disabled greetings, set greetingsEnabled to false
                if (this.settings.isActive === false) {
                    greetingsEnabled = false;
                    console.log('[Ramadan Greeting] Greetings are disabled by admin');
                }
            }

            // Only populate greetings if enabled
            if (greetingsEnabled && greetingsData.success && greetingsData.data && greetingsData.data.length > 0) {
                console.log('[Ramadan Greeting] Populating greetings:', greetingsData.data.length);
                // Convert greetings array to object for dropdown
                this.greetings = {};
                greetingsData.data.forEach((greeting, index) => {
                    this.greetings[`greeting${index + 1}`] = greeting.text;
                });
                this.populateGreetingDropdown();
                this.enableGreetingInput();
            } else {
                console.log('[Ramadan Greeting] Greetings disabled, hiding dropdown');
                // Hide greeting phrase dropdown if greetings are disabled
                this.hideGreetingDropdown();
            }

            if (this.settings && this.settings.templates && this.settings.templates.length > 0) {
                this.templates = this.settings.templates;
                // Set the first template as selected by default
                this.selectedTemplateId = this.templates[0]._id;
                this.populateTemplateDropdown();
            } else if (this.settings) {
                // Use defaults
                this.templates = this.settings.templates;
                this.selectedTemplateId = this.templates[0]._id;
                this.populateTemplateDropdown();
            }

            // Now load the template image
            this.loadBaseImage();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error loading data from backend:', error);
            // Fallback to defaults
            this.settings = this.getDefaultSettings();
            this.greetings = this.getDefaultGreetings();
            this.templates = this.settings.templates;
            this.selectedTemplateId = this.templates[0]._id;
            this.populateGreetingDropdown();
            this.populateTemplateDropdown();
            this.loadBaseImage();
            this.setupEventListeners();
        }
    }

    hideGreetingDropdown() {
        // Hide the greeting phrase dropdown and label
        const greetingSelect = document.getElementById('greetingSelect');
        if (greetingSelect) {
            greetingSelect.disabled = true;
            greetingSelect.setAttribute('data-greetings-disabled', 'true');
            const greetingGroup = greetingSelect.closest('.form-group');
            if (greetingGroup) {
                greetingGroup.style.display = 'none';
                greetingGroup.setAttribute('data-greetings-disabled', 'true');
            }
        }
        // Also clear any selected greeting
        this.selectedGreeting = '';
    }

    enableGreetingInput() {
        // Enable the greeting phrase dropdown
        const greetingSelect = document.getElementById('greetingSelect');
        if (greetingSelect) {
            greetingSelect.disabled = false;
            greetingSelect.removeAttribute('data-greetings-disabled');
            const greetingGroup = greetingSelect.closest('.form-group');
            if (greetingGroup) {
                greetingGroup.style.display = '';
                greetingGroup.removeAttribute('data-greetings-disabled');
            }
        }
    }

    hideGreetingUI() {
        // Hide the main container or show a message
        const container = document.querySelector('.ramadan-container');
        if (container) {
            container.innerHTML = '<div class="alert alert-warning text-center mt-5">تهنئة رمضان غير متاحة حالياً.</div>';
        }
    }

    getDefaultSettings() {
        return {
            templates: [{
                _id: 'default',
                url: 'images/temp.png',
                name: 'Default Template'
            }],
            activeTemplateId: 'default',
            greetingFont: 'Traditional Arabic',
            greetingFontSize: 28,
            greetingColor: '#7a461f',
            userNameFont: 'Traditional Arabic',
            userNameFontSize: 24,
            userNameColor: '#004052',
            greetingPositionX: 85,
            greetingPositionY: 52,
            isActive: true
        };
    }

    getDefaultGreetings() {
        return {
            greeting1: 'نتمنى لكم شهرًا مباركًا.. مليئًا بالخير والطمأنينة وقبول الأعمال',
            greeting2: 'شهر مبارك، تقبّل الله منا ومنكم صالح الأعمال',
            greeting3: 'صومًا مقبولًا وذنبًا مغفوراً',
            greeting4: 'كل عام وأنتم بألف خير',
            greeting5: 'رمضان كريم 🌙',
            greeting6: 'تقبل الله منا ومنكم',
            greeting7: 'عسى أن يكون رمضان شهر خير وبركة',
            greeting8: 'رمضان مبارك، أعاده الله عليكم بالخير واليمن والبركات',
            greeting9: 'أهلا وسهلا برمضان'
        };
    }

    populateGreetingDropdown() {
        const select = document.getElementById('greetingSelect');
        if (!select) return;

        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add greetings from backend
        Object.entries(this.greetings).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.text = value;
            select.appendChild(option);
        });
    }

    populateTemplateDropdown() {
        const container = document.getElementById('templateCards');
        if (!container) return;

        container.innerHTML = '';

        // Add templates as cards
        if (this.templates && this.templates.length > 0) {
            this.templates.forEach(template => {
                const card = document.createElement('div');
                card.className = 'template-card' + (template._id === this.selectedTemplateId ? ' active' : '');
                card.innerHTML = `
                    <img src="${this.getAbsoluteImageUrl(template.url)}" alt="${template.name}" loading="lazy">
                    <div class="template-name">${template.name || 'Template'}</div>
                `;
                
                card.addEventListener('click', () => {
                    this.selectTemplate(template._id);
                });
                
                container.appendChild(card);
            });
        }
    }

    getAbsoluteImageUrl(url) {
        if (!url.startsWith('/')) return url;
        return this.apiBase.replace('/api', '') + url;
    }

    selectTemplate(templateId) {
        this.selectedTemplateId = templateId;
        // Update active card styling
        document.querySelectorAll('.template-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Find and mark the selected card as active
        const templateCards = document.getElementById('templateCards');
        if (templateCards) {
            const cards = templateCards.querySelectorAll('.template-card');
            const templateIndex = this.templates.findIndex(t => t._id === templateId);
            if (templateIndex >= 0 && cards[templateIndex]) {
                cards[templateIndex].classList.add('active');
            }
        }
        
        this.loadBaseImage();
    }

    loadBaseImage() {
        const img = new Image();
        // Allow cross-origin image loading
        img.crossOrigin = 'anonymous';
        
        // Get the selected template
        let imageUrl = 'images/temp.png';
        if (this.templates && this.selectedTemplateId) {
            const selectedTemplate = this.templates.find(t => t._id === this.selectedTemplateId);
            if (selectedTemplate && selectedTemplate.url) {
                imageUrl = selectedTemplate.url;
                // Convert relative URL to absolute API URL
                if (imageUrl.startsWith('/')) {
                    imageUrl = this.apiBase.replace('/api', '') + imageUrl;
                }
            }
        }
        
        // Add cache-busting parameter to force reload
        img.src = imageUrl + (imageUrl.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        
        img.onload = () => {
            this.baseImage = img;
            this.imageLoaded = true;
            
            // Set canvas size to match image
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            
            // Draw initial template
            this.drawGreeting();
        };

        img.onerror = () => {
            console.error('Failed to load base image:', img.src);
            this.imageLoaded = false;
            // Try loading local default image on error
            const localImg = new Image();
            localImg.src = 'images/temp.png';
            localImg.crossOrigin = 'anonymous';
            localImg.onload = () => {
                this.baseImage = localImg;
                this.imageLoaded = true;
                this.resizeCanvas();
                this.drawGreeting();
            };
            localImg.onerror = () => {
                alert('فشل تحميل الصورة الأساسية');
            };
        };
    }

    resizeCanvas() {
        if (!this.baseImage || !this.imageLoaded) return;
        
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const maxWidth = Math.min(500, rect.width);
        
        // Calculate dimensions based on image aspect ratio
        const aspectRatio = this.baseImage.height / this.baseImage.width;
        const height = maxWidth * aspectRatio;
        
        // Set canvas size (2x for better quality)
        this.canvas.width = maxWidth * 2;
        this.canvas.height = height * 2;
        
        // Scale context for drawings
        this.ctx.scale(2, 2);
        
        // Redraw after resizing
        this.drawGreeting();
    }

    setupEventListeners() {
        // Clear name input on page load to prevent auto-fill
        const userNameInput = document.getElementById('userName');
        if (userNameInput) {
            userNameInput.value = '';
            this.userName = '';
        }

        // Greeting selection
        document.getElementById('greetingSelect').addEventListener('change', (e) => {
            this.selectedGreeting = this.greetings[e.target.value] || '';
            this.drawGreeting();
        });

        // User name input
        document.getElementById('userName').addEventListener('input', (e) => {
            this.userName = e.target.value;
            this.drawGreeting();
        });

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadImage();
        });
    }

    drawGreeting() {
        if (!this.imageLoaded || !this.baseImage) return;

        const width = this.canvas.width / 2;
        const height = this.canvas.height / 2;
        
        // Clear canvas
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, width, height);

        // Draw base image
        this.ctx.drawImage(this.baseImage, 0, 0, width, height);

        // Draw text overlay
        this.drawTextOverlay(width, height);
    }

    drawTextOverlay(width, height) {
        // Only draw greeting text if enabled and selected
        if (this.selectedGreeting) {
            this.drawGreetingText(width, height);
        }
        // Always allow user name
        if (this.userName) {
            this.drawUserNameSmall(width, height);
        }
    }

    drawGreetingText(width, height) {
        if (!this.settings) return;

        // Use position from settings
        const positionX = (this.settings.greetingPositionX || 85) / 100;
        const positionY = (this.settings.greetingPositionY || 52) / 100;
        
        const textX = width * positionX;
        const textY = height * positionY;

        // Split long greetings into multiple lines
        const maxCharsPerLine = 20;
        const lines = this.splitArabicText(this.selectedGreeting, maxCharsPerLine);

        const fontSize = this.settings.greetingFontSize || 28;
        const fontFamily = this.settings.greetingFont || 'Traditional Arabic';
        
        this.ctx.font = `bold ${fontSize}px '${fontFamily}', 'Kufi Arabic', serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = this.settings.greetingColor || '#7a461f';
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        const lineHeight = fontSize + 10;
        const totalHeight = (lines.length - 1) * lineHeight;
        const startY = textY - totalHeight / 2;

        lines.forEach((line, index) => {
            this.ctx.fillText(line, textX, startY + (index * lineHeight));
        });

        this.ctx.shadowColor = 'transparent';
    }

    drawUserNameSmall(width, height) {
        if (!this.settings) {
            console.warn('[Ramadan Greeting] No settings available for username drawing');
            return;
        }

        const positionX = (this.settings.greetingPositionX || 85) / 100;
        const positionY = (this.settings.greetingPositionY || 52) / 100;

        const textX = width * positionX;
        const nameY = height * positionY + 50;

        const fontSize = this.settings.userNameFontSize || 24;
        const fontFamily = this.settings.userNameFont || 'Traditional Arabic';
        const userColor = this.settings.userNameColor || '#004052';

        console.log('[Ramadan Greeting] Drawing username:', {
            userName: this.userName,
            color: userColor,
            font: fontFamily,
            fontSize: fontSize,
            position: { x: textX, y: nameY }
        });

        this.ctx.font = `italic ${fontSize}px '${fontFamily}', 'Kufi Arabic', serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = userColor;
        this.ctx.globalAlpha = 0.95;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        this.ctx.fillText(this.userName, textX, nameY);

        this.ctx.shadowColor = 'transparent';
        this.ctx.globalAlpha = 1;
    }

    splitArabicText(text, maxCharsPerLine) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        words.forEach(word => {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            
            if (testLine.length > maxCharsPerLine && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines.length > 0 ? lines : [text];
    }

    downloadImage() {
        // Only require greeting if greetings are enabled
        const greetingsEnabled = this.settings && this.settings.isActive !== false;
        if (greetingsEnabled && !this.selectedGreeting.trim()) {
            alert('الرجاء اختيار عبارة التهنئة أولاً');
            return;
        }

        try {
            // Attempt blob-based download
            this.canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        throw new Error('Failed to create blob from canvas');
                    }
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `تهنئة_رمضان_${this.userName || 'بدون_اسم'}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Show success message
                    this.showSuccessMessage();
                    
                    // Clean up the blob URL
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                },
                'image/png',
                0.95
            );
        } catch (error) {
            console.error('Canvas to blob error:', error);
            // Fallback: try data URL approach
            try {
                const link = document.createElement('a');
                link.href = this.canvas.toDataURL('image/png');
                link.download = `تهنئة_رمضان_${this.userName || 'بدون_اسم'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.showSuccessMessage();
            } catch (fallbackError) {
                console.error('Fallback download error:', fallbackError);
                alert('عذراً، لا يمكن تحميل الصورة. الرجاء استخدام متصفح آخر أو جرب لاحقاً.');
            }
        }
    }

    showSuccessMessage() {
        const messageEl = document.getElementById('successMessage');
        messageEl.style.display = 'block';
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const card = new RamadanGreetingCard();
});
