// Input handler
class InputHandler {
    constructor(game) {
        this.game = game;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;

        // 双指双击作弊菜单状态
        this.lastTwoFingerTap = 0;
        this.cheatMenu = null;

        this.bindEvents();
        this.initCheatPanel();
    }

    bindEvents() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Mouse movement view control - edge trigger
        const gameScreen = document.getElementById('game-screen');
        gameScreen.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Touch controls for mobile (game screen swipe)
        gameScreen.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        gameScreen.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        gameScreen.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // 全局双指双击检测（document 级别，确保主菜单/游戏结束等界面也能触发）
        document.addEventListener('touchstart', (e) => this.handleCheatGesture(e), { passive: true });

        // 点击菜单外部关闭菜单
        document.addEventListener('click', (e) => {
            if (this.cheatMenu && !this.cheatMenu.contains(e.target)) {
                this.closeCheatMenu();
            }
        });
        document.addEventListener('touchend', (e) => {
            if (this.cheatMenu && e.touches.length === 0) {
                // 延迟检测，让按钮点击先处理
                setTimeout(() => {
                    if (this.cheatMenu && !this.cheatMenu.contains(e.target)) {
                        this.closeCheatMenu();
                    }
                }, 50);
            }
        }, { passive: true });

        // Escape 关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCheatMenu();
                this.closeCheatPanel();
            }
        });
    }

    // ==================== 作弊逻辑（提取为独立方法） ====================

    // ==================== 作弊面板按钮（右上角入口） ====================

    initCheatPanel() {
        const btn = document.getElementById('cheat-btn');
        const panel = document.getElementById('cheat-panel');
        const closeBtn = document.getElementById('cheat-panel-close');
        if (!btn || !panel) return;

        // 打开/关闭面板（切换）
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (panel.classList.contains('hidden')) {
                this.openCheatPanel();
            } else {
                this.closeCheatPanel();
            }
        });

        // 关闭按钮
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeCheatPanel();
        });

        // 点击面板内部不触发外部关闭逻辑
        panel.addEventListener('click', (e) => e.stopPropagation());

        // 游戏内作弊按钮
        const wire = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn.call(this); });
        };
        wire('cheat-trump-vent', this.cheatTrumpVent);
        wire('cheat-time-skip', this.cheatTimeSkip);
        wire('cheat-skip-night', this.cheatSkipNight);
        wire('cheat-unlock-custom', this.cheatUnlockCustomNight);
        wire('cheat-unlock-special', this.cheatUnlockSpecialNight);

        // 跳转关卡按钮（1~6）
        document.querySelectorAll('.cheat-jump-btn').forEach(b => {
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                this.cheatJumpToNight(parseInt(b.dataset.night));
            });
        });
    }

    openCheatPanel() {
        const panel = document.getElementById('cheat-panel');
        if (!panel) return;
        const isRunning = this.game.state.isGameRunning;
        const isMainMenu = this.game.mainMenu && !this.game.mainMenu.classList.contains('hidden');

        // 游戏内作弊按钮：仅游戏中启用
        ['cheat-trump-vent', 'cheat-time-skip', 'cheat-skip-night'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !isRunning;
        });
        // 跳转关卡按钮：仅主菜单启用
        document.querySelectorAll('.cheat-jump-btn').forEach(b => {
            b.disabled = !isMainMenu;
        });

        panel.classList.remove('hidden');
    }

    closeCheatPanel() {
        const panel = document.getElementById('cheat-panel');
        if (panel) panel.classList.add('hidden');
    }

    cheatTrumpVent() {
        if (this.game.state.isGameRunning && this.game.enemyAI.trump.hasSpawned) {
            console.log('🎮 CHEAT: Forcing Trump to crawl into vents...');
            this.showCheatNotification('特朗普正在进入通风管！');

            // 强制特朗普从 cam1 开始爬行
            this.game.enemyAI.trump.currentLocation = 'cam1';
            
            // 立即播放音效（不等待延迟）- 音量改为1.0（最大值）
            console.log('Playing crawling sound immediately...');
            this.game.assets.playSound('ventCrawling', true, 1.0);
            
            // 10秒后停止音效
            setTimeout(() => {
                console.log('Stopping crawling sound...');
                this.game.assets.stopSound('ventCrawling');
            }, 10000);
        } else if (this.game.state.isGameRunning) {
            this.showCheatNotification('特朗普还没出场！');
        }
    }

    cheatTimeSkip() {
        if (this.game.state.isGameRunning) {
            this.game.state.currentTime += 1;
            this.game.ui.update();
            this.showCheatNotification(`时间：${this.game.state.currentTime} AM`);
            
            if (this.game.state.currentTime >= 6) {
                this.game.winNight();
            }
        }
    }

    cheatUnlockCustomNight() {
        console.log('🎮 CHEAT: Unlocking Custom Night...');
        localStorage.setItem('night6Completed', 'true');
        this.showCheatNotification('自定义夜晚已解锁！');
        
        // 如果在主菜单，立即更新按钮显示
        if (this.game.mainMenu && !this.game.mainMenu.classList.contains('hidden')) {
            this.game.updateContinueButton();
        }
    }

    cheatSkipNight() {
        if (this.game.state.isGameRunning) {
            console.log('🎮 CHEAT: Skipping current night...');
            this.showCheatNotification('跳过第 ' + this.game.state.currentNight + ' 夜');
            
            setTimeout(() => {
                this.game.winNight();
            }, 500);
        }
    }

    cheatUnlockSpecialNight() {
        console.log('🎮 CHEAT: Unlocking Special Night...');
        localStorage.setItem('night6Unlocked', 'true');
        this.showCheatNotification('特别之夜已解锁！');
        
        // 如果在主菜单，立即更新按钮显示
        if (this.game.mainMenu && !this.game.mainMenu.classList.contains('hidden')) {
            this.game.updateContinueButton();
        }
    }

    cheatJumpToNight(night) {
        if (this.game.mainMenu && !this.game.mainMenu.classList.contains('hidden')) {
            console.log(`🎮 CHEAT: Jumping to Night ${night}...`);
            this.game.state.currentNight = night;
            this.showCheatNotification(`直接进入第 ${night} 夜`);
            
            if (night === 6) {
                localStorage.setItem('night6Unlocked', 'true');
                setTimeout(() => this.game.startSpecialNight(), 500);
            } else {
                setTimeout(() => this.game.initGame(), 500);
            }
            
            this.game.mainMenu.classList.add('hidden');
            const menuMusic = document.getElementById('menu-music');
            if (menuMusic) {
                menuMusic.pause();
                menuMusic.currentTime = 0;
            }
        }
    }

    // ==================== 键盘处理 ====================

    handleKeyPress(e) {
        // ==================== 作弊键（生产环境请注释掉） ====================
        
        if (e.key === 'F6') {
            e.preventDefault();
            this.cheatTrumpVent();
            return;
        }
        
        if (e.key === 'F9') {
            e.preventDefault();
            this.cheatSkipNight();
            return;
        }
        
        if (e.key === 'F10') {
            e.preventDefault();
            this.cheatUnlockSpecialNight();
            return;
        }
        
        if (e.key === 'F8') {
            e.preventDefault();
            this.cheatUnlockCustomNight();
            return;
        }
        
        if (e.key === 'F7') {
            e.preventDefault();
            this.cheatTimeSkip();
            return;
        }
        
        if (e.key >= '1' && e.key <= '6') {
            if (this.game.mainMenu && !this.game.mainMenu.classList.contains('hidden')) {
                e.preventDefault();
                this.cheatJumpToNight(parseInt(e.key));
            }
            return;
        }
        
        // ==================== 作弊键结束 ====================
        
        if (!this.game.state.isGameRunning) return;
        
        switch(e.key.toLowerCase()) {
            case 'v': 
                this.game.toggleVents(); 
                break;
            case ' ': 
                e.preventDefault();
                this.game.toggleCamera();
                break;
        }
    }

    // ==================== 移动端作弊菜单 ====================

    handleCheatGesture(e) {
        if (e.touches.length >= 2) {
            const now = Date.now();
            if (now - this.lastTwoFingerTap < 400) {
                // 双指双击确认 — 打开菜单
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const midX = (t1.clientX + t2.clientX) / 2;
                const midY = (t1.clientY + t2.clientY) / 2;
                this.showCheatMenu(midX, midY);
                this.lastTwoFingerTap = 0; // 重置防止连续触发
            } else {
                this.lastTwoFingerTap = now;
            }
        }
    }

    showCheatMenu(x, y) {
        // 关闭已有菜单
        this.closeCheatMenu();

        const isRunning = this.game.state.isGameRunning;
        const isMainMenu = this.game.mainMenu && !this.game.mainMenu.classList.contains('hidden');

        const menu = document.createElement('div');
        menu.id = 'mobile-cheat-menu';

        // 构建菜单内容
        const sections = [
            {
                title: '游戏内作弊',
                items: [
                    { label: '特朗普进入管道 (F6)', action: () => this.cheatTrumpVent(), enabled: isRunning },
                    { label: '时间 +1小时 (F7)', action: () => this.cheatTimeSkip(), enabled: isRunning },
                    { label: '跳过本夜 (F9)', action: () => this.cheatSkipNight(), enabled: isRunning },
                ]
            },
            {
                title: '解锁功能',
                items: [
                    { label: '解锁自定义夜晚 (F8)', action: () => this.cheatUnlockCustomNight(), enabled: true },
                    { label: '解锁特别之夜 (F10)', action: () => this.cheatUnlockSpecialNight(), enabled: true },
                ]
            },
            {
                title: '跳转关卡',
                items: [1,2,3,4,5,6].map(n => ({
                    label: `第 ${n} 夜`,
                    action: () => this.cheatJumpToNight(n),
                    enabled: isMainMenu,
                }))
            }
        ];

        sections.forEach(section => {
            const header = document.createElement('div');
            header.className = 'cheat-menu-section';
            header.textContent = section.title;
            menu.appendChild(header);

            section.items.forEach(item => {
                const btn = document.createElement('button');
                btn.className = 'cheat-menu-btn';
                btn.textContent = item.label;
                if (!item.enabled) {
                    btn.disabled = true;
                } else {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        item.action();
                        this.closeCheatMenu();
                    });
                    btn.addEventListener('touchend', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        item.action();
                        this.closeCheatMenu();
                    });
                }
                menu.appendChild(btn);
            });
        });

        document.body.appendChild(menu);
        this.cheatMenu = menu;

        // 计算位置（确保不超出屏幕）
        const rect = menu.getBoundingClientRect();
        let finalX = x;
        let finalY = y;

        if (finalX + rect.width > window.innerWidth) {
            finalX = window.innerWidth - rect.width - 10;
        }
        if (finalY + rect.height > window.innerHeight) {
            finalY = window.innerHeight - rect.height - 10;
        }
        finalX = Math.max(10, finalX);
        finalY = Math.max(10, finalY);

        menu.style.left = finalX + 'px';
        menu.style.top = finalY + 'px';
    }

    closeCheatMenu() {
        if (this.cheatMenu) {
            this.cheatMenu.remove();
            this.cheatMenu = null;
        }
    }
    
    // ==================== 作弊通知 ====================

    showCheatNotification(message) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '10px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.background = 'rgba(255, 215, 0, 0.9)';
        notification.style.color = '#000';
        notification.style.padding = '10px 20px';
        notification.style.fontSize = '20px';
        notification.style.fontWeight = 'bold';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '99999';
        notification.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        notification.textContent = '🎮 作弊：' + message;
        
        document.body.appendChild(notification);
        
        // 1秒后移除
        setTimeout(() => {
            notification.remove();
        }, 1000);
    }

    // ==================== 鼠标与触摸控制 ====================

    handleMouseMove(e) {
        if (!this.game.state.isGameRunning || this.game.state.cameraOpen) return;
        
        // 悬停在 UI 控件上时不触发边缘自动旋转
        const target = e.target;
        if (target && (target.closest('.rotation-button') || target.closest('#touch-toggle-btn') ||
            target.closest('.control-panel-button') || target.closest('.camera-button') ||
            target.closest('#control-panel-popup'))) {
            this.game.isRotatingLeft = false;
            this.game.isRotatingRight = false;
            return;
        }
        
        const edgeThreshold = 100;
        const mouseX = e.clientX;
        const screenWidth = window.innerWidth;
        
        // Check if at left edge
        if (mouseX < edgeThreshold) {
            this.game.isRotatingLeft = true;
            this.game.isRotatingRight = false;
        }
        // Check if at right edge
        else if (mouseX > screenWidth - edgeThreshold) {
            this.game.isRotatingRight = true;
            this.game.isRotatingLeft = false;
        }
        // In middle area, stop rotation
        else {
            this.game.isRotatingLeft = false;
            this.game.isRotatingRight = false;
        }
    }
    
    handleTouchStart(e) {
        if (!this.game.state.isGameRunning || this.game.state.cameraOpen) return;
        
        // Don't prevent default if touching UI elements
        const target = e.target;
        if (target.closest('.hotspot') || target.closest('.control-panel-button') || 
            target.closest('.camera-button') || target.closest('.rotation-button') ||
            target.closest('#touch-toggle-btn') ||
            target.closest('#control-panel-popup')) {
            return;
        }
        
        e.preventDefault();
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
        this.isTouching = true;
    }
    
    handleTouchMove(e) {
        if (!this.game.state.isGameRunning || this.game.state.cameraOpen || !this.isTouching) return;
        
        // Don't prevent default if touching UI elements
        const target = e.target;
        if (target.closest('.hotspot') || target.closest('.control-panel-button') || 
            target.closest('.camera-button') || target.closest('.rotation-button') ||
            target.closest('#touch-toggle-btn') ||
            target.closest('#control-panel-popup')) {
            return;
        }
        
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = Math.abs(touch.clientY - this.touchStartY);
        
        // Only rotate if horizontal swipe (not vertical)
        if (deltaY < 50) {
            const sensitivity = 0.002;
            // Reverse the direction: swipe right = view right, swipe left = view left
            const movement = -deltaX * sensitivity;
            
            // Update view position directly
            this.game.viewPosition += movement;
            this.game.viewPosition = Math.max(0, Math.min(1, this.game.viewPosition));
            this.game.ui.updateViewPosition(this.game.viewPosition);
            
            // Update touch start position for smooth continuous movement
            this.touchStartX = touch.clientX;
            this.touchStartY = touch.clientY;
        }
    }
    
    handleTouchEnd(e) {
        if (!this.game.state.isGameRunning) return;
        
        this.isTouching = false;
        this.game.isRotatingLeft = false;
        this.game.isRotatingRight = false;
    }
}
