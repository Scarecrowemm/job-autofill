/* ===== 工具函数 =====
 * 通用工具：路径取值/赋值、占位符判断、存储读写、对象深合并、DOM 语义上下文采集。
 * ===== */

const getPath = (o, p) => p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);

/* 按 "a.b.0.c" 形式的路径写值，中间缺失的层级自动创建（数字下标创建数组） */
function setPath(obj, p, value) {
  const keys = String(p).split(".");
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (cur[k] == null) {
      cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    }
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return obj;
}

/* 判断一个值是否算"真的填了"：空串、纯空格、{{占位符}} 都不算 */
const isReal = (v) => {
  const s = String(v == null ? "" : v).trim();
  return !!s && !/^\{\{.*\}\}$/.test(s);
};

/* ---------- 存储层 ----------
 * 优先 chrome.storage.local（扩展环境），其次 GM_*（油猴），最后 localStorage（本地调试）。
 */
let __PROFILE_CACHE__ = null;

function hasChromeStorage() {
  try {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  } catch (e) {
    return false;
  }
}

function readStorage(cb) {
  if (hasChromeStorage()) {
    try {
      chrome.storage.local.get(["jaf_profile"], (res) => {
        __PROFILE_CACHE__ = res && res.jaf_profile ? res.jaf_profile : null;
        cb();
      });
      return;
    } catch (e) {
      /* 落到下面的兜底 */
    }
  }
  try {
    const raw =
      typeof GM_getValue === "function" ? GM_getValue(STORE_KEY, null) : localStorage.getItem(STORE_KEY);
    if (raw) __PROFILE_CACHE__ = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (e) {
    __PROFILE_CACHE__ = null;
  }
  cb();
}

function loadProfile() {
  const base = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  return __PROFILE_CACHE__ ? deepMerge(base, __PROFILE_CACHE__) : base;
}

function saveProfile(obj) {
  __PROFILE_CACHE__ = JSON.parse(JSON.stringify(obj));
  if (hasChromeStorage()) {
    try {
      chrome.storage.local.set({ jaf_profile: __PROFILE_CACHE__ });
      return;
    } catch (e) {
      /* 落到下面的兜底 */
    }
  }
  const s = JSON.stringify(obj);
  try {
    if (typeof GM_setValue === "function") GM_setValue(STORE_KEY, s);
    else localStorage.setItem(STORE_KEY, s);
  } catch (e) {
    try {
      localStorage.setItem(STORE_KEY, s);
    } catch (e2) {}
  }
}

/* 深合并：对象递归合并，数组整体替换，不修改入参 */
function deepMerge(base, patch) {
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const k in patch) {
    if (
      patch[k] &&
      typeof patch[k] === "object" &&
      !Array.isArray(patch[k]) &&
      base[k] &&
      typeof base[k] === "object" &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k], patch[k]);
    } else {
      out[k] = patch[k];
    }
  }
  return out;
}

/* React / Vue 受控组件必须用原生 setter 再派发事件，否则值填进去但框架状态不更新 */
function setNativeValue(el, value) {
  const proto =
    el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : el.tagName === "SELECT"
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

/* 收集一个输入框的"语义上下文"。
 *
 * 关键：只取它自己的 label / placeholder / name / id，以及最近一层表单项的 label 文字。
 * 绝不能把祖先容器（form/body）的整段文字算进来——否则「性别」「姓名」这类词会污染所有字段。
 * 这是 v1 踩过的坑，见 CHANGELOG。
 */
function contextOf(el) {
  const parts = [];
  const push = (v) => {
    if (v) parts.push(String(v).replace(/\s+/g, " ").trim());
  };

  push(el.name);
  push(el.id);
  push(el.placeholder);
  push(el.getAttribute("aria-label"));
  push(el.getAttribute("title"));
  push(el.getAttribute("data-label"));

  // 1) label[for=id]
  if (el.id) {
    try {
      const lab = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (lab) push(lab.textContent);
    } catch (e) {}
  }

  // 2) 被 label 包裹
  const ancLabel = el.closest("label");
  if (ancLabel) push(ancLabel.textContent);

  // 3) 同一父节点下的 label 兄弟（<label>姓名</label><input> 这种）
  const par = el.parentElement;
  if (par) {
    const sib = par.querySelector(
      ":scope > label, :scope > .label, :scope > .form-label, :scope > .field-label, " +
        ":scope > .ant-form-item-label, :scope > .el-form-item__label"
    );
    if (sib) push(sib.textContent);
  }

  // 4) 最近一层表单项容器里的 label
  const wrap = el.closest(
    ".ant-form-item, .el-form-item, .arco-form-item, .form-item, .form-group, .form-row, .field, .input-item"
  );
  if (wrap) {
    const lb = wrap.querySelector(
      "label, .label, .form-label, .field-label, .ant-form-item-label, .el-form-item__label"
    );
    if (lb) push(lb.textContent);
  }

  // 5) 紧邻的前一个兄弟元素文字（老式表单常见：<div>姓名</div><input>）
  const prev = el.previousElementSibling;
  if (prev && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(prev.tagName)) {
    push((prev.textContent || "").slice(0, 30));
  }

  return parts.join(" | ").toLowerCase();
}
