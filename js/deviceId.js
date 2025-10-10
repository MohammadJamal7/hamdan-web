// Device ID generation for web browsers
function generateDeviceId() {
    // Try to get existing device ID from localStorage
    let deviceId = localStorage.getItem('deviceId');
    
    if (!deviceId) {
        // Generate a new device ID using browser fingerprinting
        const components = [
            navigator.userAgent,
            navigator.language,
            navigator.platform,
            screen.colorDepth,
            new Date().getTimezoneOffset(),
            navigator.hardwareConcurrency,
            navigator.deviceMemory,
            navigator.maxTouchPoints
        ];
        
        // Create a hash of the components
        const hash = components.join('|');
        deviceId = btoa(hash).replace(/[^a-zA-Z0-9]/g, '');
        
        // Store the device ID
        localStorage.setItem('deviceId', deviceId);
    }
    
    return deviceId;
}

// Export the function
window.getDeviceId = generateDeviceId; 