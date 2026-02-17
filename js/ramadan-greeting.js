// Ramadan Greeting Card Generator
class RamadanGreetingCard {
    constructor() {
        this.canvas = document.getElementById('greetingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.userName = '';
        this.selectedGreeting = '';
        this.baseImage = null;
        this.imageLoaded = false;
        
        // Greeting color - brown tone
        this.textColor = '#7a461f';
        // Kuwait Kufi font or Arabic fonts
        this.arabicFont = "'Traditional Arabic', 'Segoe UI', 'Courier New', monospace";
        
        // Ramadan greetings
        this.greetings = {
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
        
        // Load the base image
        this.loadBaseImage();
        
        // Initialize event listeners
        this.setupEventListeners();
    }

    loadBaseImage() {
        const img = new Image();
        // Add cache-busting parameter to force reload
        img.src = 'images/temp.png?' + new Date().getTime();
        
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
            console.error('Failed to load base image');
            this.imageLoaded = false;
            alert('فشل تحميل الصورة الأساسية');
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
        if (this.selectedGreeting) {
            this.drawGreetingText(width, height);
        }
        
        if (this.userName) {
            this.drawUserNameSmall(width, height);
        }
    }

    drawGreetingText(width, height) {
        // Move both greeting and name just a little lower
        const slightlyLowerY = height * 0.52; // Slightly below center
        const rightX = width * 0.85;

        // Split long greetings into multiple lines
        const maxCharsPerLine = 20;
        const lines = this.splitArabicText(this.selectedGreeting, maxCharsPerLine);

        this.ctx.font = "bold 28px 'Traditional Arabic', 'Kufi Arabic', serif";
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#7a461f'; // Greeting color
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        const lineHeight = 38;
        const totalHeight = (lines.length - 1) * lineHeight;
        const startY = slightlyLowerY - totalHeight;

        lines.forEach((line, index) => {
            this.ctx.fillText(line, rightX, startY + (index * lineHeight));
        });

        this.ctx.shadowColor = 'transparent';
    }

    drawUserNameSmall(width, height) {
        // Place user name just below the greeting
        const rightX = width * 0.85;
        const nameY = height * 0.52 + 38; // Just below greeting

        this.ctx.font = "italic 24px 'Traditional Arabic', 'Kufi Arabic', serif";
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#004052'; // User name color (old dark blue)
        this.ctx.globalAlpha = 0.95;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        this.ctx.shadowBlur = 6;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 1;

        this.ctx.fillText(this.userName, rightX, nameY);

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
        if (!this.selectedGreeting.trim()) {
            alert('الرجاء اختيار عبارة التهنئة أولاً');
            return;
        }

        const link = document.createElement('a');
        link.href = this.canvas.toDataURL('image/png');
        link.download = `تهنئة_رمضان_${this.userName || 'بدون_اسم'}.png`;
        link.click();

        // Show success message
        this.showSuccessMessage();
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
