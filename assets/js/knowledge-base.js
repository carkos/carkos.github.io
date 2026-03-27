// assets/js/knowledge-base.js

const KB_STORAGE_KEY = 'vizzle_knowledge_base';
const SERVER_KB_INDEX = 'assets/knowledge/file_list.json';

// Global Knowledge Base Object (exposed to window)
window.knowledgeBase = {
    files: [],       // Local user uploads
    serverFiles: [], // Pre-loaded server files
    lastUpdate: null,
    content: []      // Combined searchable content
};

// --- Core Functions ---

async function loadKnowledgeBase(callback) {
    // 1. Load LocalStorage Data
    const saved = localStorage.getItem(KB_STORAGE_KEY);
    let localContent = [];
    
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            window.knowledgeBase.files = parsed.files || [];
            window.knowledgeBase.lastUpdate = parsed.lastUpdate || null;
            localContent = parsed.content || [];
        } catch (e) {
            console.error("Failed to parse local knowledge base", e);
        }
    }

    // 2. Load Server Data
    try {
        const response = await fetch(SERVER_KB_INDEX);
        if (response.ok) {
            const fileList = await response.json();
            window.knowledgeBase.serverFiles = []; 
            
            // Fetch content for each file
            for (const fileMeta of fileList) {
                try {
                    const fileRes = await fetch(`assets/knowledge/${fileMeta.name}`);
                    if (fileRes.ok) {
                        let text = "";
                        // Handle text-based files
                        if (fileMeta.type.includes('text') || fileMeta.type.includes('json') || fileMeta.name.endsWith('.txt') || fileMeta.name.endsWith('.md')) {
                            text = await fileRes.text();
                        } else {
                            // Binary placeholder for AI context
                            text = `[SERVER_FILE: ${fileMeta.name} - ${fileMeta.desc || 'System File'}]`; 
                        }
                        
                        window.knowledgeBase.serverFiles.push({
                            name: fileMeta.name,
                            type: fileMeta.type,
                            size: text.length, 
                            uploadedAt: new Date().toISOString(), // Or fileMeta.date
                            isServer: true,
                            desc: fileMeta.desc,
                            text: text
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to load server file: ${fileMeta.name}`, err);
                }
            }
        }
    } catch (e) {
        console.log("Server knowledge sync skipped (local mode or missing index).");
    }

    // 3. Rebuild Content Index
    window.knowledgeBase.content = [...localContent];
    window.knowledgeBase.serverFiles.forEach(f => {
        window.knowledgeBase.content.push({
            filename: f.name,
            text: f.text
        });
    });

    if (callback) callback();
}

function saveKnowledgeBase(callback) {
    window.knowledgeBase.lastUpdate = new Date().toISOString();
    // Only save user files to localStorage, not server files
    const storageData = {
        files: window.knowledgeBase.files,
        lastUpdate: window.knowledgeBase.lastUpdate,
        // We need to filter content to only save local file content
        content: window.knowledgeBase.content.filter(c => !window.knowledgeBase.serverFiles.find(sf => sf.name === c.filename))
    };
    
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(storageData));
    
    // Rebuild index to ensure consistency
    loadKnowledgeBase(callback); 
}

function clearKnowledgeBaseData(callback) {
    // Only clear local files
    window.knowledgeBase.files = [];
    window.knowledgeBase.lastUpdate = null;
    saveKnowledgeBase(callback);
}

function removeFileFromKB(index, callback) {
    // Index handling is tricky now with two lists. 
    // Admin UI should pass the file object or specific ID.
    // For simplicity, we assume index refers to the local file list index.
    if (index >= 0 && index < window.knowledgeBase.files.length) {
        window.knowledgeBase.files.splice(index, 1);
        saveKnowledgeBase(callback);
    }
}

// --- Utility Functions ---

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(type) {
    const icons = {
        'application/pdf': 'fa-solid:file-pdf',
        'application/vnd.ms-excel': 'fa-solid:file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-solid:file-excel',
        'application/msword': 'fa-solid:file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-solid:file-word',
        'text/plain': 'fa-solid:file-lines',
        'text/html': 'fa-solid:file-code',
        'application/json': 'fa-solid:file-code',
        'text/csv': 'fa-solid:file-csv',
        // Images
        'image/jpeg': 'fa-solid:file-image',
        'image/png': 'fa-solid:file-image',
        'image/gif': 'fa-solid:file-image',
        'image/webp': 'fa-solid:file-image',
        'image/svg+xml': 'fa-solid:file-image',
        // Videos
        'video/mp4': 'fa-solid:file-video',
        'video/webm': 'fa-solid:file-video',
        'video/ogg': 'fa-solid:file-video',
        // Audio
        'audio/mpeg': 'fa-solid:file-audio',
        'audio/wav': 'fa-solid:file-audio',
        'audio/ogg': 'fa-solid:file-audio'
    };
    return icons[type] || 'fa-solid:file';
}

// --- File Processing (Async) ---

function readFileContent(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        console.log('readFileContent - File:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        // Text-based files - read as text for AI processing
        if ((file.type && file.type.match(/text.*/)) || (file.type && file.type.match(/.*json.*/)) || file.type === 'text/html' || file.type === 'text/csv') {
            console.log('readFileContent - Reading as text');
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file);
        } 
        // Image files - store as base64 DataURL for preview
        else if ((file.type && file.type.match(/image.*/)) || file.name.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)) {
            // Check file size limit (2MB for images in localStorage)
            if (file.size > 2 * 1024 * 1024) {
                console.log('readFileContent - Image too large');
                resolve(`[UPLOADED_FILE: ${file.name} - Image too large for preview (max 2MB)]`);
            } else {
                console.log('readFileContent - Reading image as DataURL');
                reader.onload = (e) => {
                    console.log('readFileContent - DataURL created, length:', e.target.result.length);
                    resolve(e.target.result); // Full DataURL
                };
                reader.onerror = (e) => {
                    console.error('readFileContent - Error reading image:', e);
                    resolve(`[UPLOADED_FILE: ${file.name} - Read error]`);
                };
                reader.readAsDataURL(file);
            }
        }
        // PDF files - store as base64 DataURL for preview
        else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            // Check file size limit (3MB for PDFs)
            if (file.size > 3 * 1024 * 1024) {
                resolve(`[UPLOADED_FILE: ${file.name} - PDF too large for preview (max 3MB)]`);
            } else {
                console.log('readFileContent - Reading PDF as DataURL');
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            }
        }
        // Video files - store as base64 DataURL for preview
        else if ((file.type && file.type.match(/video.*/)) || file.name.match(/\.(mp4|webm|ogg|mov)$/i)) {
            // Check file size limit (5MB for videos - localStorage limit consideration)
            if (file.size > 5 * 1024 * 1024) {
                resolve(`[UPLOADED_FILE: ${file.name} - Video too large for preview (max 5MB)]`);
            } else {
                console.log('readFileContent - Reading video as DataURL');
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            }
        }
        // Audio files
        else if ((file.type && file.type.match(/audio.*/)) || file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            if (file.size > 3 * 1024 * 1024) {
                resolve(`[UPLOADED_FILE: ${file.name} - Audio too large for preview (max 3MB)]`);
            } else {
                console.log('readFileContent - Reading audio as DataURL');
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            }
        }
        // Other binary files - just store placeholder
        else {
            console.log('readFileContent - Unknown file type, storing placeholder');
            resolve(`[UPLOADED_FILE: ${file.name}]`);
        }
    });
}

async function addFilesToKB(files, callback) {
    let addedCount = 0;
    // Get existing local content to append to
    const saved = localStorage.getItem(KB_STORAGE_KEY);
    let currentContent = saved ? (JSON.parse(saved).content || []) : [];

    for (const file of files) {
        try {
            const content = await readFileContent(file);
            window.knowledgeBase.files.push({
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
            currentContent.push({
                filename: file.name,
                text: content
            });
            addedCount++;
        } catch (e) {
            console.error("Error reading file", file.name, e);
        }
    }
    
    // Save directly to storage logic to bypass the filter in saveKnowledgeBase for this step
    window.knowledgeBase.lastUpdate = new Date().toISOString();
    const storageData = {
        files: window.knowledgeBase.files,
        lastUpdate: window.knowledgeBase.lastUpdate,
        content: currentContent
    };
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(storageData));
    
    // Reload to merge everything
    loadKnowledgeBase(() => {
        if (callback) callback(addedCount);
    });
}

// Make globally available
window.KB = {
    load: loadKnowledgeBase,
    save: saveKnowledgeBase,
    clear: clearKnowledgeBaseData,
    remove: removeFileFromKB,
    addFiles: addFilesToKB,
    utils: {
        formatSize: formatFileSize,
        getIcon: getFileIcon
    }
};