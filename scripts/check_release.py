# -*- coding: utf-8 -*-
"""
发布前完整验收：产物完整性、manifest 合法性、构建结构、隐私、工程文件齐备。

用法：
    python scripts/check_release.py
退出码 0 = 全部通过，1 = 有失败项（可直接用于 CI）。
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")
ok = True
def chk(cond, msg):
    global ok
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: ok = False

print("【1】产物完整性")
for f in ["content.js", "manifest.json", "sw.js", "options.html",
          "icons/icon16.png", "icons/icon32.png", "icons/icon48.png", "icons/icon128.png"]:
    chk(os.path.exists(os.path.join(DIST, f)), "dist/" + f)

print("\n【2】manifest 校验")
m = json.load(io.open(os.path.join(DIST, "manifest.json"), encoding="utf-8"))
chk(m.get("manifest_version") == 3, "MV3")
chk(bool(m.get("name")), "有 name")
chk(bool(m.get("version")), "有 version: " + str(m.get("version")))
chk("icons" in m and len(m["icons"]) == 4, "4 个尺寸图标")
chk(m.get("options_ui", {}).get("page") == "options.html", "options_ui 指向 options.html")
chk(m.get("background", {}).get("service_worker") == "sw.js", "service worker")
for size, p in m.get("icons", {}).items():
    chk(os.path.exists(os.path.join(DIST, p)), "manifest 引用图标存在: " + p)

print("\n【3】content.js 结构")
s = io.open(os.path.join(DIST, "content.js"), encoding="utf-8").read()
chk(s.rstrip().endswith("})();"), "IIFE 闭合")
chk("==UserScript==" not in s, "无油猴头残留")
MODULES = ["core/config.js", "core/default-profile.js", "core/utils.js",
           "core/rules.js", "core/filler.js", "ui/panel.js", "content.js"]
missing_mod = [mm for mm in MODULES if ("/* ---------- " + mm + " ---------- */") not in s]
chk(not missing_mod, "7 个模块已按顺序拼接" + ("" if not missing_mod else " -> 缺: " + str(missing_mod)))
for fn in ["pickRule", "pickOption", "normalizeDateValue", "fillAll", "buildPanel", "readStorage"]:
    chk(("function " + fn) in s or (fn + " =") in s or (fn + "(") in s, "包含 " + fn)

print("\n【4】隐私")
BAD_PAT = [r"1[3-9]\d{9}", r"[\w.+-]+@[\w-]+\.[\w.]{2,}", r"\b\d{17}[\dXx]\b"]
leak = []
for base, _, files in os.walk(DIST):
    for fn in files:
        if not fn.endswith((".js", ".html", ".json")): continue
        p = os.path.join(base, fn)
        t = io.open(p, encoding="utf-8").read()
        for pat in BAD_PAT:
            for mt in re.finditer(pat, t):
                leak.append((os.path.relpath(p, ROOT), mt.group(0)))
chk(not leak, "dist 内无手机号/邮箱/身份证硬编码" + ("" if not leak else " -> " + str(leak[:3])))

print("\n【5】工程文件")
for f in ["README.md", "LICENSE", "PRIVACY.md", "CONTRIBUTING.md", "CHANGELOG.md",
          "package.json", ".gitignore", ".prettierrc", ".editorconfig",
          ".github/workflows/ci.yml",
          ".github/ISSUE_TEMPLATE/site-adapter.yml",
          ".github/ISSUE_TEMPLATE/feature_request.yml",
          "test/cases.js", "test/core.test.js", "test/browser-check.html",
          "docs/screenshots/options.png", "docs/screenshots/panel.png",
          "scripts/build.py", "scripts/make_icons.py", "scripts/check_no_pii.py"]:
    chk(os.path.exists(os.path.join(ROOT, f)), f)

print("\n【6】README 截图引用")
rd = io.open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
for img in re.findall(r"!\[[^\]]*\]\(([^)]+)\)", rd):
    chk(os.path.exists(os.path.join(ROOT, img)), "README 图片存在: " + img)

print("\n" + ("=" * 50))
print("验收结果：" + ("全部通过 ✅" if ok else "存在失败项 ❌"))
sys.exit(0 if ok else 1)
