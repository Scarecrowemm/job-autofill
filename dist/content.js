/*!
 * 岗位投递助手 (Job Application Autofill)
 * 自动填写招聘网站表单的浏览器扩展
 *
 * 本文件由 scripts/build.py 自动生成，请勿直接编辑。
 * 源码位于 src/ 目录。
 */

(function () {
  "use strict";

  /* ---------- core/config.js ---------- */
/* ===== 全局常量 =====
 * 存储键、DOM id 等常量。
 * ===== */
const STORE_KEY = "resume_profile_v1";   // chrome.storage.local 中的键名
const PANEL_ID = "jaf-panel";            // 面板根节点 id
const BTN_ID = "jaf-btn";                // 浮动按钮 id

  /* ---------- core/default-profile.js ---------- */
/* ===== 默认简历数据 =====
 * 空模板。首次使用时由用户在选项页填写，数据存在 chrome.storage.local 的 jaf_profile 键下。
 *
 * 注意：本文件必须保持「空模板」状态，不要提交任何真实个人信息。
 * 用户自己的数据请放在选项页里，或使用 .gitignore 中排除的 简历数据*.json。
 * ===== */
const DEFAULT_PROFILE = {
  basic: {
    name: "",
    gender: "",
    birth: "",
    age: "",
    political: "",
    nation: "",
    native_place: "",
    id_card: "",
    marriage: "",
    phone: "",
    email: "",
    wechat: "",
    qq: "",
    address: "",
    postcode: "",
    emergency_name: "",
    emergency_relation: "",
    emergency_phone: ""
  },
  education: {
    school: "",
    school_en: "",
    college: "",
    major: "",
    degree: "",
    edu_level: "",
    start: "",
    end: "",
    gpa: "",
    rank: "",
    cet4: "",
    cet6: "",
    other_cert: "",
    courses: ""
  },
  intent: {
    position: "",
    position_game: "",
    industry: "",
    city: "",
    salary: "",
    available_date: "",
    accept_relocate: "是",
    accept_overtime: "是",
    job_type: "全职"
  },
  work: [
    {
      company: "",
      department: "",
      title: "",
      start: "",
      end: "",
      city: "",
      description: ""
    }
  ],
  projects: [
    {
      name: "",
      role: "",
      start: "",
      end: "",
      tech: "",
      description: ""
    },
    {
      name: "",
      role: "",
      start: "",
      end: "",
      tech: "",
      description: ""
    }
  ],
  skills: {
    programming: "",
    data: "",
    engineering: "",
    ai: "",
    language: ""
  },
  campus: {
    role: "",
    description: ""
  },
  self_eval_short: "",
  self_eval_long: "",
  qa: {
    self_intro: "",
    why_company: "",
    career_plan: "",
    strength: "",
    weakness: "",
    hardest_thing: "",
    why_you: "",
    salary_expect: "",
    available: ""
  }
};

  /* ---------- core/utils.js ---------- */
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

  /* ---------- core/rules.js ---------- */
/* ===== 字段匹配规则 =====
 * 字段识别规则表。数组顺序即优先级，越靠前越优先。贡献者新增站点适配时主要改这里。
 * ===== */
const RULES = [
    // —— 最优先：带"紧急"前缀的字段，必须先于通用电话/姓名规则，否则会被抢占 ——
    { path: "basic.emergency_phone", re: /紧急联系.{0,8}(电话|手机|号码)|紧急.{0,4}(电话|手机)/ },
    { path: "basic.emergency_name",  re: /紧急联系人(姓名|名字)?|紧急联络人/ },
    { path: "basic.emergency_relation", re: /与本人关系|与联系?人关系/ },

    // —— 强特征：证件/联系方式 ——
    { path: "basic.id_card",      re: /身份证|证件号码|id\s*card|idcard|证件号/ },
    { path: "basic.phone",        re: /手机|移动电话|联系电话|联系方式|phone|mobile|\btel\b/ },
    { path: "basic.email",        re: /邮箱|电子邮件|e-?mail/ },
    { path: "basic.wechat",       re: /微信|wechat/ },
    { path: "basic.qq",           re: /\bqq\b|qq号/ },
    { path: "basic.postcode",     re: /邮编|邮政编码|postcode|zip/ },
    { path: "basic.address",      re: /通讯地址|联系地址|家庭住址|现居住地|详细地址|address/ },
    { path: "basic.native_place", re: /籍贯|户籍|native\s*place/ },
    { path: "basic.marriage",     re: /婚姻|婚否|marital/ },
    { path: "basic.political",    re: /政治面貌|党派|political/ },
    { path: "basic.nation",       re: /民族(?!族)/ },
    { path: "basic.birth",        re: /出生(年月|日期|时间)?|生日|birth/ },
    { path: "basic.age",          re: /^年龄$|年龄/ },
    { path: "basic.gender",       re: /性别|gender|\bsex\b/ },
    { path: "basic.name",         re: /姓\s*名|真实姓名|real\s*name/ },

    // —— 教育 ——
    { path: "education.cet6",     re: /六级|cet\s*-?\s*6/ },
    { path: "education.cet4",     re: /四级|cet\s*-?\s*4/ },
    { path: "education.gpa",      re: /gpa|绩点|平均分|平均成绩/ },
    { path: "education.rank",     re: /专业排名|年级排名|班级排名|^排名$/ },
    { path: "education.school",   re: /毕业院校|毕业学校|院校名称|学校名称|就读院校|school|university/ },
    { path: "education.major",    re: /所学专业|专业名称|^专业$|major/ },
    { path: "education.college",  re: /院系|学院|所在院系|college|department/ },
    { path: "education.degree",   re: /学位(类别|名称)?|degree/ },
    { path: "education.edu_level", re: /学历|最高学历|education/ },
    { path: "education.start",    re: /入学(时间|年月|日期)?|开始时间|起始时间|起始日期/ },
    { path: "education.end",      re: /毕业(时间|年月|日期)|结束时间|截止时间/ },
    { path: "education.courses",  re: /主修课程|主要课程|专业课程|courses/ },

    // —— 求职意向 ——
    { path: "intent.salary",      re: /期望(薪资|月薪|年薪)|薪资要求|薪酬要求|salary/ },
    { path: "intent.city",        re: /期望(工作地|城市)|意向城市|期望地点|工作地点|期望工作地区/ },
    { path: "intent.position",    re: /应聘职位|应聘岗位|求职意向|期望职位|期望岗位|申请职位|目标岗位|position/ },
    { path: "intent.available_date", re: /到岗时间|可到岗|可入职|最快入职/ },

    // —— 经历 ——
    { path: "work.0.company",     re: /公司名称|工作单位|实习单位|单位名称|company/ },
    { path: "work.0.title",       re: /职位名称|担任职位|职务|job\s*title/ },
    { path: "work.0.description", re: /工作内容|工作描述|实习内容|职责描述|主要职责/, area: true },
    { path: "projects.0.name",    re: /项目名称|项目名/ },
    { path: "projects.0.role",    re: /项目角色|担任角色|项目职责/ },
    { path: "projects.0.description", re: /项目描述|项目内容|项目简介|项目经历/, area: true },

    // —— 主观题 / 大段文本 ——
    { path: "self_eval_short",    re: /自我评价|自我鉴定|个人评价|个人优势|self\s*-?\s*evaluation/, area: true },
    { path: "qa.self_intro",      re: /自我介绍|个人简介|个人陈述/, area: true },
    { path: "qa.career_plan",     re: /职业规划|职业发展|职业目标/, area: true },
    { path: "qa.strength",        re: /(你的|个人)?(优点|优势|长处)/, area: true },
    { path: "qa.weakness",        re: /(你的|个人)?(缺点|不足|劣势|短板)/, area: true },
    { path: "qa.hardest_thing",   re: /(最有|最难忘|最具挑战).{0,8}(一件事|挑战|困难|经历)/, area: true },
    { path: "qa.why_company",     re: /为什么(选择|应聘|加入)|对我司|对公司的了解/, area: true },
    { path: "qa.why_you",         re: /为什么(录用|选择)你|你的竞争力/, area: true },
    { path: "skills.programming", re: /(编程语言|掌握的?技术|技能特长|专业技能)/, area: true }
  ];

  /* ---------- core/filler.js ---------- */
/* ===== 填充引擎 =====
 * 把简历数据写入页面表单：文本、下拉、单选、日期控件。
 *
 * 设计说明：
 *  - pickRule / pickOption / normalizeDateValue 是纯函数，不碰 DOM，
 *    便于单元测试（见 test/core.test.js）。
 *  - fillAll 负责 DOM 遍历与写入。
 * ===== */

const SKIP_TYPES = /^(password|hidden|file|submit|reset|button|image|checkbox|search)$/i;

/* 给定字段的语义上下文，返回第一条命中的规则；无命中返回 null。
 * 内部统一转小写，调用方不必关心大小写（"CET-6" 与 "cet-6" 等价）。 */
function pickRule(context) {
  if (!context) return null;
  const ctx = String(context).toLowerCase();
  for (let i = 0; i < RULES.length; i++) {
    if (RULES[i].re.test(ctx)) return RULES[i];
  }
  return null;
}

/* 从下拉选项里挑出与目标值最匹配的一项。
 * options: [{ text, value }]，返回命中的 option 或 null。
 * 匹配优先级：文字/值精确 → 文字包含目标 → 目标包含文字。 */
function pickOption(options, value) {
  const v = String(value == null ? "" : value).trim().toLowerCase();
  if (!v || !options || !options.length) return null;

  const text = (o) => String(o.text || "").trim();
  const lowText = (o) => text(o).toLowerCase();

  // 1) 精确匹配（文字或 value）
  let hit = options.find((o) => lowText(o) === v || String(o.value).toLowerCase() === v);
  // 2) 选项文字包含目标（如 "本科" 命中 "本科及以上"）
  if (!hit) hit = options.find((o) => lowText(o) && lowText(o).includes(v));
  // 3) 目标包含选项文字（如 "广州 / 深圳" 命中 "广州"），要求选项文字有实际长度
  if (!hit && v.length > 2) {
    hit = options.find((o) => lowText(o).length > 1 && v.includes(lowText(o)));
  }
  return hit || null;
}

/* 把 "2027-06" / "2027/6" / "2027年6月" 归一化成控件需要的格式。
 * inputType: "date" | "month" | 其他 */
function normalizeDateValue(value, inputType) {
  const s = String(value == null ? "" : value).trim();
  const m = s.match(/^(\d{4})[-/年.]?(\d{1,2})?/);
  if (!m) return s;
  const y = m[1];
  const mo = (m[2] || "01").padStart(2, "0");
  if (inputType === "date") return y + "-" + mo + "-01";
  if (inputType === "month") return y + "-" + mo;
  return s;
}

/* 兼容旧调用点 */
function normalizeDate(value, el) {
  return normalizeDateValue(value, el && el.type);
}

function isVisible(el) {
  if (!el || el.disabled || el.readOnly) return false;
  if (el.type === "hidden") return false;
  const r = el.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return false;
  const cs = getComputedStyle(el);
  return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
}

function fillSelect(sel, value) {
  const opts = Array.from(sel.options || []).map((o) => ({ text: o.text, value: o.value }));
  const hit = pickOption(opts, value);
  if (hit) {
    setNativeValue(sel, hit.value);
    return true;
  }
  return false;
}

function fillRadioGroup(el, value) {
  const v = String(value).trim();
  const name = el.name;
  const group = name
    ? Array.from(document.querySelectorAll('input[type=radio][name="' + CSS.escape(name) + '"]'))
    : [el];

  for (const r of group) {
    const labelText = (() => {
      if (r.id) {
        try {
          const l = document.querySelector('label[for="' + CSS.escape(r.id) + '"]');
          if (l) return l.textContent || "";
        } catch (e) {}
      }
      const cl = r.closest("label");
      if (cl) return cl.textContent || "";
      return (r.parentElement && r.parentElement.textContent) || "";
    })();

    if (labelText.replace(/\s+/g, "").includes(v)) {
      if (!r.checked) r.click();
      return true;
    }
  }
  return false;
}

function fillAll(profile, opts) {
  opts = opts || {};
  const overwrite = !!opts.overwrite;
  const filled = [];
  const missed = [];
  const usedPaths = new Set();

  const candidates = Array.from(document.querySelectorAll("input, textarea, select")).filter((el) => {
    if (el.tagName === "INPUT" && SKIP_TYPES.test(el.type || "text")) return false;
    if (el.closest("#" + PANEL_ID)) return false;
    if (el.getAttribute("data-jaf-done")) return false;
    return isVisible(el);
  });

  for (const el of candidates) {
    const ctx = contextOf(el);
    if (!ctx) continue;

    const rule = pickRule(ctx);
    if (!rule) {
      if (!el.value) missed.push({ label: (ctx.split("|").pop() || "").trim().slice(0, 40), el });
      continue;
    }

    const value = getPath(profile, rule.path);
    // 该字段没有数据，跳过（留给用户补）
    if (!isReal(value)) continue;

    // 单选/复选：value 属性天然非空，要用 checked 判断是否已有值
    const alreadyHas =
      el.type === "radio" || el.type === "checkbox" ? el.checked : !!(el.value && el.value.trim());
    if (alreadyHas && !overwrite) {
      filled.push({ path: rule.path, skipped: true });
      continue;
    }

    let ok = false;
    try {
      if (el.tagName === "SELECT") {
        ok = fillSelect(el, value);
      } else if (el.tagName === "INPUT" && el.type === "radio") {
        ok = fillRadioGroup(el, value);
      } else if (el.tagName === "INPUT" && (el.type === "date" || el.type === "month")) {
        setNativeValue(el, normalizeDateValue(value, el.type));
        ok = true;
      } else if (el.tagName === "INPUT" && el.type === "number") {
        const num = String(value).replace(/[^\d.]/g, "");
        if (num) {
          setNativeValue(el, num);
          ok = true;
        }
      } else {
        setNativeValue(el, String(value));
        ok = true;
      }
    } catch (e) {
      ok = false;
    }

    if (ok) {
      el.setAttribute("data-jaf-done", "1");
      el.style.outline = "2px solid #27ae60";
      el.style.outlineOffset = "1px";
      setTimeout(() => {
        el.style.outline = "";
        el.style.outlineOffset = "";
      }, 2600);
      filled.push({ path: rule.path, value: String(value) });
      usedPaths.add(rule.path);
    }
  }

  // 未识别字段去重
  const seen = new Set();
  const missedUniq = missed
    .filter((m) => {
      const k = m.label;
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 40);

  return { filled, missed: missedUniq, usedPaths: Array.from(usedPaths) };
}

  /* ---------- ui/panel.js ---------- */
/* ===== 页内面板 UI =====
 * 页面右下角的浮动按钮与操作面板。
 * ===== */
function el(tag, attrs, style) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (style) n.style.cssText = style;
    return n;
  }

  function buildButton() {
    if (document.getElementById(BTN_ID)) return;
    const b = el("div", { id: BTN_ID }, `
      position:fixed;right:22px;bottom:22px;z-index:2147483646;
      background:#0d3b66;color:#fff;padding:10px 16px;border-radius:24px;
      font:600 13px/1 "Microsoft YaHei",sans-serif;cursor:pointer;
      box-shadow:0 4px 14px rgba(13,59,102,.35);user-select:none;`);
    b.textContent = "自动填表";
    b.title = "点击打开面板（快捷键 Ctrl+Shift+F）";
    b.onclick = togglePanel;
    document.body.appendChild(b);
  }

  function togglePanel() {
    const p = document.getElementById(PANEL_ID);
    if (p) { p.style.display = p.style.display === "none" ? "block" : "none"; return; }
    buildPanel();
  }

  function buildPanel() {
    const prof = loadProfile();
    const p = el("div", { id: PANEL_ID }, `
      position:fixed;right:22px;bottom:74px;z-index:2147483647;width:380px;max-height:78vh;
      background:#fff;border:1px solid #dbe4ee;border-radius:12px;
      box-shadow:0 10px 34px rgba(13,59,102,.22);overflow:hidden;
      font:13px/1.6 "Microsoft YaHei",sans-serif;color:#1f2937;display:flex;flex-direction:column;`);

    const head = el("div", {}, `
      background:#0d3b66;color:#fff;padding:10px 14px;font-weight:600;
      display:flex;align-items:center;justify-content:space-between;`);
    head.innerHTML = `<span>岗位投递助手</span>`;
    const close = el("span", {}, "cursor:pointer;font-size:16px;line-height:1;padding:0 4px;");
    close.textContent = "×";
    close.onclick = () => { p.style.display = "none"; };
    head.appendChild(close);

    const body = el("div", {}, "padding:12px 14px;overflow:auto;");

    // 数据状态
    const stat = el("div", {}, `
      background:#f8fbfe;border:1px solid #dbe4ee;border-radius:8px;
      padding:8px 10px;font-size:12px;color:#374151;margin-bottom:10px;`);
    const missing = [];
    if (!isReal(prof.basic.phone)) missing.push("手机号");
    if (!isReal(prof.basic.email)) missing.push("邮箱");
    if (!isReal(prof.basic.birth)) missing.push("出生年月");
    if (!isReal(prof.basic.id_card)) missing.push("身份证号");
    stat.innerHTML = missing.length
      ? `⚠️ 还缺：<b style="color:#b9770e">${missing.join("、")}</b><br><span style="color:#6b7280">可先在下方粘贴完整 JSON，或直接手动填</span>`
      : `✅ 核心信息已就绪`;

    // 按钮区
    const btns = el("div", {}, "display:flex;gap:8px;margin-bottom:10px;");
    const mkBtn = (text, primary, fn) => {
      const b = el("button", {}, `
        flex:1;padding:8px 10px;border-radius:7px;cursor:pointer;font:600 13px/1 "Microsoft YaHei",sans-serif;
        border:1px solid ${primary ? "#0d3b66" : "#c8d6e5"};
        background:${primary ? "#0d3b66" : "#fff"};color:${primary ? "#fff" : "#0d3b66"};`);
      b.textContent = text;
      b.onclick = fn;
      return b;
    };

    const result = el("div", {}, `
      font-size:12px;line-height:1.7;color:#374151;max-height:34vh;overflow:auto;
      border-top:1px solid #eef2f7;padding-top:10px;margin-top:4px;`);

    btns.appendChild(mkBtn("开始自动填写", true, () => {
      const res = fillAll(loadProfile(), { overwrite: false });
      const lines = [];
      lines.push(`<b style="color:#1e8449">已填 ${res.filled.filter(f => !f.skipped).length} 个字段</b>`);
      if (res.missed.length) {
        lines.push(`<div style="margin-top:6px;color:#b9770e"><b>未识别到数据的字段（请手动补充）：</b></div>`);
        lines.push(`<div style="color:#6b7280">` + res.missed.map(m => "· " + m.label).join("<br>") + `</div>`);
      } else {
        lines.push(`<div style="color:#6b7280;margin-top:6px">页面上没找到其他可填字段。</div>`);
      }
      lines.push(`<div style="margin-top:8px;color:#9ca3af;font-size:11px">提示：简历 PDF 需手动上传；提交前请逐项核对。</div>`);
      result.innerHTML = lines.join("");
    }));

    btns.appendChild(mkBtn("导出当前数据", false, () => {
      const blob = new Blob([JSON.stringify(loadProfile(), null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "简历数据.json";
      a.click();
      URL.revokeObjectURL(a.href);
    }));

    // JSON 编辑区
    const ta = el("textarea", { placeholder: "方式一：把「岗位投递助手.html」导出的 JSON 粘贴到这里，点下面保存\n方式二：点「选择 JSON 文件导入」，直接选下载好的 简历数据.json" }, `
      width:100%;min-height:92px;font:12px/1.5 Consolas,monospace;
      border:1px solid #dbe4ee;border-radius:7px;padding:8px;resize:vertical;box-sizing:border-box;`);

    // 隐藏的文件选择器（用于直接导入 JSON 文件）
    const fileInput = el("input", { type: "file", accept: ".json,application/json" }, "display:none;");

    function applyProfileObject(obj, srcName) {
      try {
        const merged = deepMerge(loadProfile(), obj);
        saveProfile(merged);
        // 保存后刷新面板里的状态提示
        const miss = [];
        if (!isReal(merged.basic.phone)) miss.push("手机号");
        if (!isReal(merged.basic.email)) miss.push("邮箱");
        if (!isReal(merged.basic.birth)) miss.push("出生年月");
        if (!isReal(merged.basic.id_card)) miss.push("身份证号");
        stat.innerHTML = miss.length
          ? `⚠️ 还缺：<b style="color:#b9770e">${miss.join("、")}</b>`
          : `✅ 核心信息已就绪`;
        result.innerHTML = `<b style="color:#1e8449">已导入${srcName ? "（" + srcName + "）" : ""}</b>`
          + `<div style="color:#6b7280;margin-top:4px">现在点「开始自动填写」即可。</div>`;
        alert("导入成功，点「开始自动填写」生效。");
      } catch (e) {
        alert("数据合并失败：" + e.message);
      }
    }

    fileInput.onchange = (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { applyProfileObject(JSON.parse(String(reader.result)), f.name); }
        catch (e) { alert("文件不是有效的 JSON：" + e.message); }
      };
      reader.readAsText(f, "utf-8");
      ev.target.value = "";
    };

    const saveRow = el("div", {}, "display:flex;gap:8px;margin-top:8px;");
    const saveBtn = el("button", {}, `
      flex:1;padding:8px;border-radius:7px;cursor:pointer;border:1px solid #0d3b66;
      background:#e8f0f8;color:#0d3b66;font:600 12px/1 "Microsoft YaHei",sans-serif;`);
    saveBtn.textContent = "保存粘贴的 JSON";
    saveBtn.onclick = () => {
      const txt = ta.value.trim();
      if (!txt) { alert("请先粘贴 JSON，或改用下面的「选择 JSON 文件导入」"); return; }
      try { applyProfileObject(JSON.parse(txt), "粘贴内容"); }
      catch (e) { alert("JSON 解析失败：" + e.message); }
    };

    const importBtn = el("button", {}, `
      flex:1;padding:8px;border-radius:7px;cursor:pointer;border:1px solid #1e8449;
      background:#eafaf1;color:#1e8449;font:600 12px/1 "Microsoft YaHei",sans-serif;`);
    importBtn.textContent = "选择 JSON 文件导入";
    importBtn.onclick = () => fileInput.click();

    saveRow.appendChild(saveBtn);
    saveRow.appendChild(importBtn);

    const tip = el("div", {}, `
      margin-top:10px;font-size:11px;color:#9ca3af;line-height:1.6;`);
    tip.innerHTML = `快捷键 Ctrl+Shift+F 开关本面板。数据只存在本机。`;

    body.appendChild(stat);
    body.appendChild(btns);
    body.appendChild(result);
    body.appendChild(ta);
    body.appendChild(saveRow);
    body.appendChild(fileInput);
    body.appendChild(tip);

    p.appendChild(head);
    p.appendChild(body);
    document.body.appendChild(p);
  }

  /* ---------- content.js ---------- */
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

})();
