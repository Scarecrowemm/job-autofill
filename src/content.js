/* ===== 启动 =====
 * 内容脚本入口：
 *  1. 从 chrome.storage 读出简历数据
 *  2. 在页面右下角挂载浮动按钮
 *  3. 监听工具栏图标发来的消息，打开/关闭面板
 * ===== */

function boot() {
  if (!document.body) return;
  // 只在可能有表单的页面显示按钮，避免在普通页面打扰用户
  const hasForm = document.querySelector("form, input, textarea, select");
  if (!hasForm) return;
  buildButton();
}

// 快捷键：Ctrl + Shift + F
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === "F" || e.key === "f")) {
    e.preventDefault();
    togglePanel();
  }
});

// 工具栏图标点击 -> 打开面板
try {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "JAF_TOGGLE_PANEL") togglePanel();
  });
} catch (e) {
  /* 非扩展环境（例如直接注入测试）忽略 */
}

function start() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // 应对 SPA 路由切换：URL 变化后重新挂载按钮
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const old = document.getElementById(BTN_ID);
      if (old) old.remove();
      setTimeout(boot, 800);
    }
  }, 1200);
}

// 先把存储里的数据读进内存，再启动 UI
readStorage(start);
