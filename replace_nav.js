const fs = require('fs');
const path = require('path');

const dir = 'd:\\workspace\\Hamdan-project\\hamdan-web';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let changed = false;

    // First check if the file has a custom-gradient-navbar
    if (content.includes('custom-gradient-navbar')) {
        // Find the full <nav> element
        // Using a regex to match from <nav to </nav> where the opening tag includes custom-gradient-navbar
        const navRegex = /<nav[^>]*custom-gradient-navbar[^>]*>[\s\S]*?<\/nav>/;
        
        const match = content.match(navRegex);
        if (match) {
            let navContent = match[0];
            
            // Analyze the nav to understand what properties to set on <top-nav>
            let props = '';

            // Check if there is a back button
            const backMatch = navContent.match(/href="([^"]*javascript:history\.back\(\)[^"]*)"/);
            if (backMatch) {
                props += ` back-url="${backMatch[1]}"`;
            }

            // Check if there is a header/title (usually in h5)
            const titleMatch = navContent.match(/<h5[^>]*>([^<]+)<\/h5>/);
            if (titleMatch) {
                // remove unicode direction characters if any
                const titleText = titleMatch[1].trim();
                props += ` page-title="${titleText}"`;
            }

            // Create the replacement tag
            const replacement = `<top-nav${props}></top-nav>`;

            // Replace the nav block
            content = content.replace(navRegex, replacement);
            changed = true;
        }

        // Also inject the script tag into HEAD
        if (!content.includes('js/components/top-nav.js')) {
            // Find theme-manager.js as an anchor, or just before </head>
            if (content.includes('js/theme-manager.js')) {
                content = content.replace(
                    /<script\s+src="js\/theme-manager\.js"[^>]*><\/script>/, 
                    '$&\n    <script src="js/components/top-nav.js"></script>'
                );
            } else {
                content = content.replace(
                    /<\/head>/i,
                    '    <script src="js/components/top-nav.js"></script>\n</head>'
                );
            }
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
