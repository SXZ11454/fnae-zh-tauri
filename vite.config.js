import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const host = process.env.TAURI_DEV_HOST;

// 自定义插件：将未被 Vite 作为模块处理的经典脚本目录（js/）和游戏资源目录（assets/）
// 复制到构建产物中，使 Tauri 的 frontendDist 自包含、可独立运行。
function copyGameAssetsPlugin() {
  const root = process.cwd();
  const targets = [
    { from: "js", to: "js" },
    { from: "assets", to: "assets" },
  ];
  return {
    name: "copy-game-assets",
    apply: "build",
    closeBundle() {
      const outDir = resolve(root, "dist");
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
      for (const t of targets) {
        const from = resolve(root, t.from);
        const to = resolve(outDir, t.to);
        if (existsSync(from)) {
          cpSync(from, to, { recursive: true });
        }
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), copyGameAssetsPlugin()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
