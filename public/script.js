/* =====================
   CLUSTERSEO PRO - FRONTEND
===================== */
class KeywordAnalyzer {
    constructor() {
        this.keywordsByIntent = {};
        this.stats = {};
        this.activeIntent = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.setupTabNavigation();
        this.updateKeywordCount();
        console.log('✅ Keyword Analyzer initialized');
    }

    cacheElements() {
        this.elements = {
            // Tabs
            navTabs: document.querySelectorAll('.nav-tab'),
            tabContents: document.querySelectorAll('.tab-content'),
            
            // File upload
            fileInput: document.getElementById('fileInput'),
            uploadZone: document.getElementById('uploadZone'),
            processFileBtn: document.getElementById('processFileBtn'),
            fileName: document.getElementById('fileName'),
            fileStats: document.getElementById('fileStats'),
            filePreview: document.getElementById('filePreview'),
            
            // Manual input
            keywordsInput: document.getElementById('keywordsInput'),
            keywordCount: document.getElementById('keywordCount'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            
            // Results
            resultsTab: document.getElementById('resultsTab'),
            totalClusters: document.getElementById('totalClusters'),
            totalKeywords: document.getElementById('totalKeywords'),
            totalVolume: document.getElementById('totalVolume'),
            clustersContainer: document.getElementById('clustersContainer'),
            intentDistribution: document.getElementById('intentDistribution'),
            
            // Intent counts
            infoCount: document.getElementById('infoCount'),
            transCount: document.getElementById('transCount'),
            commCount: document.getElementById('commCount'),
            navCount: document.getElementById('navCount'),
            
            // UI elements
            loadingOverlay: document.getElementById('loadingOverlay'),
            loadingMessage: document.getElementById('loadingMessage'),
            errorModal: document.getElementById('errorModal'),
            errorMessage: document.getElementById('errorMessage'),
            helpModal: document.getElementById('helpModal')
        };
    }

    bindEvents() {
        // File events
        this.elements.fileInput.addEventListener('change', e => this.handleFileSelect(e));
        this.elements.uploadZone.addEventListener('dragover', e => this.handleDragOver(e));
        this.elements.uploadZone.addEventListener('dragleave', e => this.handleDragLeave(e));
        this.elements.uploadZone.addEventListener('drop', e => this.handleDrop(e));
        
        // Analyze buttons
        this.elements.analyzeBtn.addEventListener('click', () => this.analyzeKeywords());
        this.elements.processFileBtn.addEventListener('click', () => this.processUploadedFile());
        
        // Keyword input event
        this.elements.keywordsInput.addEventListener('input', () => this.updateKeywordCount());
        
        // Intent click events
        this.setupIntentClickHandlers();
    }

    setupIntentClickHandlers() {
        const intentCards = this.elements.intentDistribution.querySelectorAll('.intent-stat-card');
        
        intentCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const intent = card.dataset.intent;
                console.log(`Clicked ${intent} card`);
                this.showIntentKeywords(intent);
            });
        });
    }

    setupTabNavigation() {
        this.elements.navTabs.forEach(tab => {
            tab.addEventListener('click', e => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        this.elements.navTabs.forEach(tab =>
            tab.classList.toggle('active', tab.dataset.tab === tabId)
        );

        this.elements.tabContents.forEach(content =>
            content.classList.toggle('active', content.id === tabId + 'Tab')
        );
    }

    updateKeywordCount() {
        const lines = this.elements.keywordsInput.value.split('\n').filter(line => line.trim());
        this.elements.keywordCount.textContent = `${lines.length} keywords`;
    }

    /* ================= FILE HANDLING ================= */
    handleDragOver(e) {
        e.preventDefault();
        this.elements.uploadZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.elements.uploadZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.elements.uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            this.handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
    }

    async handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            this.elements.fileName.textContent = file.name;
            
            // Count lines (excluding empty lines)
            const lines = text.split('\n').filter(line => line.trim());
            const keywordCount = Math.max(0, lines.length - 1); // Subtract 1 for header
            
            this.elements.fileStats.textContent = `${keywordCount} keywords`;
            this.elements.filePreview.style.display = 'flex';
            this.elements.processFileBtn.disabled = false;

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ================= ANALYSIS ================= */
    async analyzeKeywords() {
        const text = this.elements.keywordsInput.value.trim();
        if (!text) {
            this.showError("Please enter some keywords first.");
            return;
        }
        
        this.showLoading("Analyzing keywords...");
        
        try {
            // Parse keywords
            const lines = text.split('\n').filter(line => line.trim());
            const keywords = [];
            const volumes = [];
            
            lines.forEach(line => {
                const parts = line.split(',').map(part => part.trim());
                if (parts[0]) {
                    keywords.push(parts[0]);
                    volumes.push(parts[1] ? parseInt(parts[1]) || 0 : 0);
                }
            });
            
            console.log(`Sending ${keywords.length} keywords to server`);
            
            const response = await fetch('/api/process-keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords, volumes })
            });
            
            const data = await response.json();
            console.log('Server response:', data);
            
            if (data.success) {
                this.processResults(data);
            } else {
                this.showError(data.error || "Analysis failed");
            }
        } catch (err) {
            console.error('Error:', err);
            this.showError("Network error: " + err.message);
        } finally {
            this.hideLoading();
        }
    }

    async processUploadedFile() {
        const fileInput = this.elements.fileInput;
        if (!fileInput.files || !fileInput.files[0]) {
            this.showError("Please select a file first");
            return;
        }
        
        this.showLoading("Processing file...");
        
        try {
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            const response = await fetch('/api/process-csv', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            console.log('File processing response:', data);
            
            if (data.success) {
                this.processResults(data);
            } else {
                this.showError(data.error || "Failed to process file");
            }
        } catch (err) {
            console.error('Error:', err);
            this.showError("Network error: " + err.message);
        } finally {
            this.hideLoading();
        }
    }

    processResults(data) {
        console.log('Processing results:', data);
        
        // Store data
        this.keywordsByIntent = data.keywordsByIntent || {};
        this.stats = data.stats || {};
        
        console.log('Keywords by intent:', this.keywordsByIntent);
        console.log('Informational count:', this.keywordsByIntent.Informational?.length || 0);
        console.log('Commercial count:', this.keywordsByIntent.Commercial?.length || 0);
        
        // Update UI
        this.updateStatsDisplay();
        
        // Enable results tab and switch to it
        this.elements.resultsTab.disabled = false;
        this.switchTab("results");
        
        // Show all keywords
        this.showAllKeywords();
    }

    updateStatsDisplay() {
        // Update main stats
        this.elements.totalClusters.textContent = this.stats.totalClusters || 0;
        this.elements.totalKeywords.textContent = this.stats.totalKeywords || 0;
        this.elements.totalVolume.textContent = this.formatNumber(this.stats.totalVolume || 0);
        
        // Update intent counts
        const distribution = this.stats.intentDistribution || {};
        this.elements.infoCount.textContent = distribution.Informational || 0;
        this.elements.transCount.textContent = distribution.Transactional || 0;
        this.elements.commCount.textContent = distribution.Commercial || 0;
        this.elements.navCount.textContent = distribution.Navigational || 0;
        
        console.log('Stats updated:', {
            Informational: distribution.Informational,
            Commercial: distribution.Commercial
        });
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    /* ================= DISPLAY FUNCTIONS ================= */
    showAllKeywords() {
        this.activeIntent = null;
        this.renderAllKeywordsView();
        
        // Reset active states
        document.querySelectorAll('.intent-stat-card').forEach(card => {
            card.classList.remove('active');
        });
    }

    showIntentKeywords(intent) {
        console.log(`Showing ${intent} keywords...`);
        console.log(`Available:`, this.keywordsByIntent[intent]);
        
        this.activeIntent = intent;
        const keywords = this.keywordsByIntent[intent] || [];
        
        console.log(`Found ${keywords.length} ${intent} keywords`);
        
        if (keywords.length === 0) {
            this.renderEmptyIntentView(intent);
        } else {
            this.renderIntentKeywordsView(intent, keywords);
        }
        
        // Update active state
        document.querySelectorAll('.intent-stat-card').forEach(card => {
            card.classList.remove('active');
            if (card.dataset.intent === intent) {
                card.classList.add('active');
            }
        });
    }

    renderAllKeywordsView() {
        const container = this.elements.clustersContainer;
        container.innerHTML = '';
        
        // Header
        const header = document.createElement('div');
        header.className = 'clusters-header';
        header.innerHTML = `
            <h2>Keyword Analysis Results</h2>
            <div class="clusters-summary">
                <span><i class="fas fa-key"></i> ${this.stats.totalKeywords || 0} total keywords</span>
                <span><i class="fas fa-chart-bar"></i> ${this.formatNumber(this.stats.totalVolume || 0)} total volume</span>
            </div>
            <p class="instructions"><i class="fas fa-mouse-pointer"></i> Click on any intent type below to view its keywords</p>
        `;
        container.appendChild(header);
        
        // Show intent sections
        const intents = ['Informational', 'Transactional', 'Commercial', 'Navigational'];
        let hasData = false;
        
        intents.forEach(intent => {
            const keywords = this.keywordsByIntent[intent] || [];
            if (keywords.length > 0) {
                hasData = true;
                const section = this.createIntentSection(intent, keywords);
                container.appendChild(section);
            }
        });
        
        if (!hasData) {
            this.showEmptyMessage();
        }
    }

    createIntentSection(intent, keywords) {
        const section = document.createElement('div');
        section.className = 'intent-section';
        
        const totalVolume = keywords.reduce((sum, item) => sum + (item.volume || 0), 0);
        const intentColor = this.getIntentColor(intent);
        
        section.innerHTML = `
            <div class="intent-section-header" onclick="app.showIntentKeywords('${intent}')" 
                 style="cursor: pointer; border-left-color: ${intentColor};">
                <div class="intent-section-title">
                    <div class="intent-icon" style="color: ${intentColor};">
                        <i class="fas ${this.getIntentIcon(intent)}"></i>
                    </div>
                    <div>
                        <h3>${intent}</h3>
                        <div class="intent-stats">
                            <span><i class="fas fa-key"></i> ${keywords.length} keywords</span>
                            <span><i class="fas fa-chart-bar"></i> ${this.formatNumber(totalVolume)} volume</span>
                        </div>
                    </div>
                </div>
                <div class="intent-section-arrow">
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            <div class="intent-section-preview">
                <div class="preview-keywords">
                    ${keywords.slice(0, 3).map(item => `
                        <div class="preview-keyword">
                            <span>${item.keyword}</span>
                            <span class="preview-volume">${item.volume}</span>
                        </div>
                    `).join('')}
                    ${keywords.length > 3 ? `
                        <div class="preview-more">
                            + ${keywords.length - 3} more keywords
                        </div>
                    ` : ''}
                </div>
                <button class="btn btn-sm btn-outline" onclick="app.showIntentKeywords('${intent}')">
                    View All <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        
        return section;
    }

    renderIntentKeywordsView(intent, keywords) {
        const container = this.elements.clustersContainer;
        container.innerHTML = '';
        
        const totalVolume = keywords.reduce((sum, item) => sum + (item.volume || 0), 0);
        const avgVolume = keywords.length > 0 ? Math.round(totalVolume / keywords.length) : 0;
        const intentColor = this.getIntentColor(intent);
        
        // Header with back button
        const header = document.createElement('div');
        header.className = 'clusters-header';
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <button class="btn btn-outline btn-sm" onclick="app.showAllKeywords()">
                    <i class="fas fa-arrow-left"></i> Back to All
                </button>
                <div class="intent-title" style="display: flex; align-items: center; gap: 10px;">
                    <div class="intent-icon-large" style="color: ${intentColor};">
                        <i class="fas ${this.getIntentIcon(intent)}"></i>
                    </div>
                    <h2 style="margin: 0;">${intent} Keywords</h2>
                </div>
            </div>
            <div class="intent-summary">
                <span><i class="fas fa-key"></i> ${keywords.length} keywords</span>
                <span><i class="fas fa-chart-bar"></i> ${this.formatNumber(totalVolume)} total volume</span>
                <span><i class="fas fa-calculator"></i> Avg: ${this.formatNumber(avgVolume)}</span>
            </div>
        `;
        container.appendChild(header);
        
        // Create HTML table with 3 columns
        const table = document.createElement('table');
        table.className = 'keywords-html-table';
        
        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>S.N.</th>
                <th>Keywords</th>
                <th>Volume</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Table body
        const tbody = document.createElement('tbody');
        
        keywords.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="serial-cell">${index + 1}</td>
                <td class="keyword-cell">${item.keyword}</td>
                <td class="volume-cell">${this.formatNumber(item.volume)}</td>
            `;
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        container.appendChild(table);
    }

    renderEmptyIntentView(intent) {
        const container = this.elements.clustersContainer;
        container.innerHTML = '';
        
        const intentColor = this.getIntentColor(intent);
        
        const header = document.createElement('div');
        header.className = 'clusters-header';
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                <button class="btn btn-outline btn-sm" onclick="app.showAllKeywords()">
                    <i class="fas fa-arrow-left"></i> Back to All
                </button>
                <div class="intent-title" style="display: flex; align-items: center; gap: 10px;">
                    <div class="intent-icon-large" style="color: ${intentColor};">
                        <i class="fas ${this.getIntentIcon(intent)}"></i>
                    </div>
                    <h2 style="margin: 0;">${intent} Keywords</h2>
                </div>
            </div>
        `;
        container.appendChild(header);
        
        const message = document.createElement('div');
        message.className = 'empty-message';
        message.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-search" style="font-size: 3em; color: #dee2e6; margin-bottom: 20px;"></i>
                <h3 style="color: #6c757d; margin-bottom: 10px;">No ${intent} Keywords Found</h3>
                <p style="color: #868e96; margin-bottom: 20px;">This intent type is not present in your keyword list.</p>
                <button class="btn btn-primary" onclick="app.showAllKeywords()">
                    <i class="fas fa-arrow-left"></i> View All Keywords
                </button>
            </div>
        `;
        container.appendChild(message);
    }

    showEmptyMessage() {
        const container = this.elements.clustersContainer;
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Data Available</h3>
                <p>Analyze some keywords or load test data to see results.</p>
                <button class="btn btn-primary" onclick="app.loadTestData()">
                    <i class="fas fa-vial"></i> Load Test Data
                </button>
            </div>
        `;
    }

    getIntentColor(intent) {
        const colors = {
            'Informational': '#3498db',
            'Transactional': '#e74c3c',
            'Commercial': '#2ecc71',
            'Navigational': '#f39c12'
        };
        return colors[intent] || '#7f8c8d';
    }

    getIntentIcon(intent) {
        const icons = {
            'Informational': 'fa-info-circle',
            'Transactional': 'fa-shopping-cart',
            'Commercial': 'fa-chart-line',
            'Navigational': 'fa-compass'
        };
        return icons[intent] || 'fa-circle';
    }

    /* ================= UTILITIES ================= */
    showLoading(message) {
        this.elements.loadingMessage.textContent = message;
        this.elements.loadingOverlay.style.display = "flex";
    }

    hideLoading() {
        this.elements.loadingOverlay.style.display = "none";
    }

    showError(msg) {
        this.elements.errorMessage.textContent = msg;
        this.elements.errorModal.style.display = "flex";
    }
}

/* ================= INITIALIZE APP ================= */
let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new KeywordAnalyzer();
});

/* ================= GLOBAL FUNCTIONS ================= */
function showHelp() {
    document.getElementById("helpModal").style.display = "flex";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function removeFile() {
    if (app) {
        app.elements.fileInput.value = "";
        app.elements.filePreview.style.display = "none";
        app.elements.processFileBtn.disabled = true;
    }
}

function clearKeywords() {
    if (app) {
        app.elements.keywordsInput.value = "";
        app.updateKeywordCount();
    }
}

function analyzeKeywords() {
    if (app) {
        app.analyzeKeywords();
    }
}

function processUploadedFile() {
    if (app) {
        app.processUploadedFile();
    }
}

function copyResults() {
    if (!app || !app.keywordsByIntent) {
        alert("No results to copy");
        return;
    }
    
    let text = "Keyword Analysis Results\n";
    text += "=====================\n\n";
    
    ['Informational', 'Transactional', 'Commercial', 'Navigational'].forEach(intent => {
        const keywords = app.keywordsByIntent[intent] || [];
        if (keywords.length > 0) {
            text += `${intent} (${keywords.length}):\n`;
            keywords.forEach((item, index) => {
                text += `  ${index + 1}. ${item.keyword} - ${item.volume}\n`;
            });
            text += "\n";
        }
    });
    
    navigator.clipboard.writeText(text)
        .then(() => alert("Results copied to clipboard!"))
        .catch(err => alert("Failed to copy: " + err));
}

function exportResults() {
    if (!app || !app.keywordsByIntent) {
        alert("No results to export");
        return;
    }
    
    let csv = "S.N.,Keyword,Volume,Intent\n";
    
    ['Informational', 'Transactional', 'Commercial', 'Navigational'].forEach(intent => {
        const keywords = app.keywordsByIntent[intent] || [];
        keywords.forEach((item, index) => {
            csv += `${index + 1},"${item.keyword}",${item.volume},"${intent}"\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    alert("CSV file downloaded!");
}












// Simple fix - Add this at the bottom of your script.js file
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('clusterThreshold');
    const valueDisplay = document.getElementById('thresholdValue');
    
    if (slider && valueDisplay) {
        // Update on slider move
        slider.addEventListener('input', function() {
            const value = Math.round(this.value * 100);
            valueDisplay.textContent = `${value}%`;
        });
        
        // Set initial value
        const initialValue = Math.round(slider.value * 100);
        valueDisplay.textContent = `${initialValue}%`;
    }
});










