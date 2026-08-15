// Tauri 平台适配
// 1. 全屏（Tauri 窗口级系统全屏）+ 横屏锁定（移动端）
// 2. 按 ESC 默认退出程序；当作弊菜单等弹层打开时，ESC 先关弹层，不退出
// 3. 所有资源均内置（frontendDist），无需网络
//
// 注意：不使用浏览器 requestFullscreen()，因为那是浏览器级全屏，
// 浏览器原生规定按 ESC 会退出全屏且无法阻止，会与"ESC 退出程序"冲突。
// Tauri 窗口已通过 tauri.conf.json 的 fullscreen:true 实现系统级全屏，
// 系统/WebView 全屏下 ESC 不会自动退出，由本脚本统一接管。

(function () {
    // 检测是否运行在 Tauri 环境中
    const isTauri = typeof window !== 'undefined' &&
        (window.__TAURI_INTERNALS__ || window.__TAURI__);

    // 懒加载 Tauri 窗口 API
    let currentWindow = null;
    async function getTauriWindow() {
        if (!isTauri) return null;
        if (currentWindow) return currentWindow;
        try {
            // Tauri v2 模块路径
            const mod = await import('@tauri-apps/api/window');
            currentWindow = mod.getCurrentWindow();
            return currentWindow;
        } catch (e) {
            console.warn('Tauri window API 不可用:', e);
            return null;
        }
    }

    // 锁定横屏方向（移动端 / 支持 screen.orientation 的设备）
    async function lockLandscape() {
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
            }
        } catch (e) {
            // 桌面端或不支持时忽略
        }
    }

    // 通过 Tauri 确保窗口级全屏（系统全屏，ESC 不会自动退出）
    async function ensureTauriFullscreen() {
        const win = await getTauriWindow();
        if (win) {
            try {
                await win.setFullscreen(true);
            } catch (e) {
                // 忽略
            }
        }
    }

    // 关闭程序（退出）
    async function exitApp() {
        const win = await getTauriWindow();
        if (win) {
            try {
                await win.close();
                return;
            } catch (e) {
                console.warn('窗口关闭失败:', e);
            }
        }
    }

    // 判断是否处于"拦截退出"的状态：当作弊菜单等弹层打开时，ESC 优先用于关闭弹层
    function hasBlockingOverlay() {
        // 作弊菜单是 InputHandler 动态插入的 #mobile-cheat-menu，关闭时直接 remove
        if (document.getElementById('mobile-cheat-menu')) return true;
        // 也可扩展其他需要 ESC 优先关闭的弹层
        return false;
    }

    // 初始化
    async function init() {
        // 锁定横屏（移动端）+ 确保窗口级全屏（系统全屏）
        await lockLandscape();
        await ensureTauriFullscreen();

        // 首次用户交互时再次尝试横屏锁定（移动端部分浏览器需要用户手势）
        const lockAgain = async () => {
            await lockLandscape();
        };
        document.addEventListener('click', lockAgain, { once: true });
        document.addEventListener('keydown', lockAgain, { once: true });
        document.addEventListener('touchend', lockAgain, { once: true });

        // ESC 键处理：默认退出程序。
        // 仅当作弊菜单等弹层打开时，ESC 先关闭弹层（交由游戏自身逻辑）。
        document.addEventListener('keydown', async (e) => {
            if (e.key === 'Escape') {
                if (hasBlockingOverlay()) {
                    // 不退出，交由 InputHandler 关闭作弊菜单
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                await exitApp();
            }
        }, true); // 使用捕获阶段，优先于游戏内 ESC 处理
    }

    // 等待 DOM 就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 暴露给外部调试（可选）
    window.__FNAE_Tauri = { exitApp, hasBlockingOverlay };
})();
