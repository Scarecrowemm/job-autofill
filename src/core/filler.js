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
