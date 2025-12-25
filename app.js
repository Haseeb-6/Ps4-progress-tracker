// PS4 Game Tracker - Main Application Logic
class GameTracker {
    constructor() {
        this.games = this.loadGames();
        this.currentFilter = 'all';
        this.editingId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStats();
        this.renderGames();
        this.setupOfflineDetection();
        this.loadDemoData();
    }

    bindEvents() {
        // Modal controls
        document.getElementById('addGameBtn').addEventListener('click', () => this.showModal());
        document.getElementById('closeModal').addEventListener('click', () => this.hideModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideModal());
        
        // Form submission
        document.getElementById('saveGameBtn').addEventListener('click', () => this.saveGame());
        
        // Progress slider
        const progressSlider = document.getElementById('gameProgress');
        const progressValue = document.getElementById('progressValue');
        progressSlider.addEventListener('input', (e) => {
            progressValue.textContent = `${e.target.value}%`;
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderGames();
            });
        });
        
        // Sync button
        document.getElementById('syncBtn').addEventListener('click', () => this.syncData());
        
        // Close modal on outside click
        document.querySelector('.modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal();
            }
        });
    }

    showModal(game = null) {
        const modal = document.getElementById('addGameModal');
        modal.classList.add('active');
        
        if (game) {
            // Editing existing game
            this.editingId = game.id;
            document.getElementById('gameTitle').value = game.title;
            document.getElementById('gameStatus').value = game.status;
            document.getElementById('gameProgress').value = game.progress;
            document.getElementById('progressValue').textContent = `${game.progress}%`;
            document.getElementById('gameNotes').value = game.notes || '';
            document.getElementById('gameHours').value = game.hours || 0;
            document.querySelector('.modal-header h2').textContent = 'Edit Game';
        } else {
            // Adding new game
            this.editingId = null;
            document.getElementById('gameTitle').value = '';
            document.getElementById('gameStatus').value = 'playing';
            document.getElementById('gameProgress').value = 0;
            document.getElementById('progressValue').textContent = '0%';
            document.getElementById('gameNotes').value = '';
            document.getElementById('gameHours').value = '';
            document.querySelector('.modal-header h2').textContent = 'Add PS4 Game';
        }
    }

    hideModal() {
        document.getElementById('addGameModal').classList.remove('active');
        this.editingId = null;
    }

    saveGame() {
        const title = document.getElementById('gameTitle').value.trim();
        if (!title) {
            alert('Please enter a game title');
            return;
        }

        const game = {
            id: this.editingId || Date.now(),
            title: title,
            status: document.getElementById('gameStatus').value,
            progress: parseInt(document.getElementById('gameProgress').value),
            notes: document.getElementById('gameNotes').value,
            hours: parseFloat(document.getElementById('gameHours').value) || 0,
            lastUpdated: new Date().toISOString()
        };

        if (this.editingId) {
            // Update existing game
            const index = this.games.findIndex(g => g.id === this.editingId);
            if (index !== -1) {
                this.games[index] = game;
            }
        } else {
            // Add new game
            this.games.push(game);
        }

        this.saveGames();
        this.updateStats();
        this.renderGames();
        this.hideModal();
        
        // Show confirmation
        this.showNotification(`${title} ${this.editingId ? 'updated' : 'added'}!`);
    }

    deleteGame(id) {
        if (confirm('Are you sure you want to delete this game?')) {
            this.games = this.games.filter(game => game.id !== id);
            this.saveGames();
            this.updateStats();
            this.renderGames();
            this.showNotification('Game deleted');
        }
    }

    renderGames() {
        const container = document.getElementById('gameList');
        let filteredGames = this.games;
        
        if (this.currentFilter !== 'all') {
            filteredGames = this.games.filter(game => game.status === this.currentFilter);
        }
        
        if (filteredGames.length === 0) {
            container.innerHTML = `
                <div class="no-games">
                    <i class="fas fa-gamepad"></i>
                    <h3>No games found</h3>
                    <p>${this.currentFilter === 'all' ? 'Add your first PS4 game!' : 'No games with this status'}</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredGames.map(game => `
            <div class="game-card ${game.status}" data-id="${game.id}">
                <div class="game-header">
                    <h3 class="game-title">${game.title}</h3>
                    <span class="game-status status-${game.status}">${game.status}</span>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill progress-${game.status}" style="width: ${game.progress}%"></div>
                </div>
                
                <div class="game-progress">
                    <span class="progress-text">${game.progress}% Complete</span>
                    ${game.hours ? `<span class="hours">${game.hours} hours</span>` : ''}
                </div>
                
                ${game.notes ? `<div class="game-notes"><p>${game.notes}</p></div>` : ''}
                
                <div class="game-meta">
                    <span class="last-updated">Updated: ${new Date(game.lastUpdated).toLocaleDateString()}</span>
                </div>
                
                <div class="game-actions">
                    <button class="btn-edit" onclick="gameTracker.editGame(${game.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="gameTracker.deleteGame(${game.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    editGame(id) {
        const game = this.games.find(g => g.id === id);
        if (game) {
            this.showModal(game);
        }
    }

    updateStats() {
        const counts = {
            playing: this.games.filter(g => g.status === 'playing').length,
            completed: this.games.filter(g => g.status === 'completed').length,
            backlog: this.games.filter(g => g.status === 'backlog').length,
            dropped: this.games.filter(g => g.status === 'dropped').length
        };
        
        document.getElementById('playingCount').textContent = counts.playing;
        document.getElementById('completedCount').textContent = counts.completed;
        document.getElementById('backlogCount').textContent = counts.backlog;
        document.getElementById('droppedCount').textContent = counts.dropped;
        
        // Update last sync time
        document.getElementById('lastSync').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
    }

    loadGames() {
        const saved = localStorage.getItem('ps4_games');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Error loading games:', e);
                return [];
            }
        }
        return [];
    }

    saveGames() {
        localStorage.setItem('ps4_games', JSON.stringify(this.games));
    }

    loadDemoData() {
        if (this.games.length === 0) {
            const demoGames = [
                {
                    id: 1,
                    title: "God of War",
                    status: "completed",
                    progress: 100,
                    hours: 35,
                    notes: "Amazing story, perfect combat",
                    lastUpdated: "2024-01-15T10:30:00Z"
                },
                {
                    id: 2,
                    title: "Marvel's Spider-Man",
                    status: "playing",
                    progress: 65,
                    hours: 25,
                    notes: "Just unlocked all suits",
                    lastUpdated: "2024-01-20T14:45:00Z"
                },
                {
                    id: 3,
                    title: "Horizon Zero Dawn",
                    status: "backlog",
                    progress: 0,
                    hours: 0,
                    notes: "Waiting for free weekend",
                    lastUpdated: "2024-01-10T09:15:00Z"
                },
                {
                    id: 4,
                    title: "The Last of Us Part II",
                    status: "dropped",
                    progress: 40,
                    hours: 18,
                    notes: "Too intense, might return later",
                    lastUpdated: "2024-01-05T16:20:00Z"
                }
            ];
            
            this.games = demoGames;
            this.saveGames();
            this.renderGames();
            this.updateStats();
        }
    }

    syncData() {
        // In future, this could sync with a backend
        this.showNotification('Data synced locally!');
        this.updateStats();
        
        // Animate sync button
        const syncBtn = document.getElementById('syncBtn');
        syncBtn.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            syncBtn.style.transform = 'rotate(0deg)';
        }, 500);
    }

    setupOfflineDetection() {
        const onlineStatus = document.getElementById('onlineStatus');
        const offlineNotice = document.getElementById('offlineNotice');
        
        const updateOnlineStatus = () => {
            if (navigator.onLine) {
                onlineStatus.innerHTML = '<i class="fas fa-wifi"></i>';
                onlineStatus.style.background = '#2ecc71';
                offlineNotice.style.display = 'none';
            } else {
                onlineStatus.innerHTML = '<i class="fas fa-wifi-slash"></i>';
                onlineStatus.style.background = '#e74c3c';
                offlineNotice.style.display = 'block';
                this.showNotification('You are offline - working locally');
            }
        };
        
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--ps4-blue);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize the app
const gameTracker = new GameTracker();
