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
