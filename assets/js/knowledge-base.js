// assets/js/knowledge-base.js

const KB_STORAGE_KEY = 'vizzle_knowledge_base';

// Global Knowledge Base Object (exposed to window)
window.knowledgeBase = {
    files: [],
    lastUpdate: null,
    content: []
};

// --- Core Functions ---

function loadKnowledgeBase(callback) {
    const saved = localStorage.getItem(KB_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Update the global object properties instead of replacing the object reference
            // This ensures any other references to window.knowledgeBase stay valid
            window.knowledgeBase.files = parsed.files || [];
            window.knowledgeBase.lastUpdate = parsed.lastUpdate || null;
            window.knowledgeBase.content = parsed.content || [];
        } catch (e) {
            console.error("Failed to parse knowledge base", e);
        }
    }
    if (callback) callback();
}

function saveKnowledgeBase(callback) {
    window.knowledgeBase.lastUpdate = new Date().toISOString();
    localStorage.setItem(KB_STORAGE_KEY, JSON.stringify(window.knowledgeBase));
    if (callback) callback();
}

function clearKnowledgeBaseData(callback) {
    window.knowledgeBase.files = [];
    window.knowledgeBase.lastUpdate = null;
    window.knowledgeBase.content = [];
    saveKnowledgeBase(callback);
}

function removeFileFromKB(index, callback) {
    if (index >= 0 && index < window.knowledgeBase.files.length) {
        window.knowledgeBase.files.splice(index, 1);
        window.knowledgeBase.content.splice(index, 1);
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
        'text/html': 'fa-solid:file-code',
        'application/msword': 'fa-solid:file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-solid:file-word',
        'text/plain': 'fa-solid:file-lines',
        'application/json': 'fa-solid:file-code',
        'text/csv': 'fa-solid:file-csv'
    };
    return icons[type] || 'fa-solid:file';
}

// --- File Processing (Async) ---

function readFileContent(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        // Basic text extraction logic
        if (file.type.match(/text.*/) || file.type.match(/.*json.*/) || file.type === 'text/html' || file.type === 'text/csv') {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsText(file);
        } else if (file.type === 'application/pdf') {
             reader.onload = () => resolve(`[PDF_FILE:${file.name}:${file.size}]`);
             reader.readAsDataURL(file);
        } else if (file.type.includes('sheet') || file.type.includes('excel')) {
             reader.onload = () => resolve(`[EXCEL_FILE:${file.name}:${file.size}]`);
             reader.readAsDataURL(file);
        } else if (file.type.includes('word') || file.type.includes('document')) {
             reader.onload = () => resolve(`[WORD_FILE:${file.name}:${file.size}]`);
             reader.readAsDataURL(file);
        } else {
            // Fallback for binaries
            reader.onload = () => resolve(`[BINARY_FILE: ${file.name}]`);
            reader.readAsDataURL(file);
        }
    });
}

async function addFilesToKB(files, callback) {
    let addedCount = 0;
    for (const file of files) {
        try {
            const content = await readFileContent(file);
            window.knowledgeBase.files.push({
                name: file.name,
                type: file.type,
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
            window.knowledgeBase.content.push({
                filename: file.name,
                text: content
            });
            addedCount++;
        } catch (e) {
            console.error("Error reading file", file.name, e);
        }
    }
    saveKnowledgeBase(() => {
        if (callback) callback(addedCount);
    });
}

// Make utility functions globally available for Admin UI rendering
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