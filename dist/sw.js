/* ===== Service Worker =====
 * 职责：
 *  1. 首次安装时自动打开数据填写页（options.html）
 *  2. 点击工具栏图标时，通知当前页面的内容脚本打开面板
 * ===== */

const FIRST_RUN_KEY = "jaf_installed";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.get([FIRST_RUN_KEY], (res) => {
      if (!res[FIRST_RUN_KEY]) {
        chrome.storage.local.set({ [FIRST_RUN_KEY]: true });
        chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
      }
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "JAF_TOGGLE_PANEL" });
  } catch (e) {
    // 内容脚本未注入（例如扩展刚安装、页面未刷新），提示用户刷新
    chrome.scripting
      ? chrome.scripting
          .executeScript({ target: { tabId: tab.id }, files: ["content.js"] })
          .catch(() => {})
      : null;
  }
});
