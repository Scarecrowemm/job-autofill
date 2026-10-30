#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
构建脚本：把 src/ 下的模块拼装成 dist/ 里可直接加载的扩展。

用法：
    python scripts/build.py

为什么不用 webpack / rollup：
    本项目只需要「按顺序拼接 + 包一层 IIFE」，引入打包器会增加贡献者的环境成本。
    所有模块共享同一个作用域，顺序即依赖顺序，见下方 MODULES。
"""
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
DIST = os.path.join(ROOT, "dist")

# 拼接顺序 = 依赖顺序，不能随意调整
MODULES = [
    "core/config.js",
    "core/default-profile.js",
    "core/utils.js",
    "core/rules.js",
    "core/filler.js",
    "ui/panel.js",
    "content.js",
]

BANNER = """/*!
 * 岗位投递助手 (Job Application Autofill)
 * 自动填写招聘网站表单的浏览器扩展
 *
 * 本文件由 scripts/build.py 自动生成，请勿直接编辑。
 * 源码位于 src/ 目录。
 */
"""


def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()


def build():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST, exist_ok=True)

    chunks = [BANNER, "(function () {", '  "use strict";', ""]
    total = 0
    for rel in MODULES:
        path = os.path.join(SRC, rel)
        if not os.path.exists(path):
            sys.exit("缺少模块: %s" % rel)
        code = read(path).rstrip()
        total += len(code)
        chunks.append("  /* ---------- %s ---------- */" % rel)
        chunks.append(code)
        chunks.append("")
    chunks.append("})();")
    chunks.append("")

    out = os.path.join(DIST, "content.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(chunks))

    # 静态资源
    shutil.copy2(os.path.join(SRC, "manifest.json"), os.path.join(DIST, "manifest.json"))
    shutil.copy2(os.path.join(SRC, "sw.js"), os.path.join(DIST, "sw.js"))
    shutil.copy2(os.path.join(SRC, "options.html"), os.path.join(DIST, "options.html"))

    # 图标
    src_icons = os.path.join(ROOT, "icons")
    dst_icons = os.path.join(DIST, "icons")
    os.makedirs(dst_icons, exist_ok=True)
    for name in os.listdir(src_icons):
        if name.endswith(".png"):
            shutil.copy2(os.path.join(src_icons, name), os.path.join(dst_icons, name))

    # 校验 manifest 可解析
    with open(os.path.join(DIST, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)

    print("构建完成 ->", DIST)
    print("  manifest : v%s (%s)" % (manifest["version"], manifest["name"]))
    print("  content  : %d 模块, %d 字符, %.1f KB" % (len(MODULES), total, os.path.getsize(out) / 1024))
    print("  sw/options/icons : 已复制")
    print("\n在浏览器中加载：chrome://extensions -> 开发者模式 -> 加载已解压的扩展程序 -> 选择 dist/")


if __name__ == "__main__":
    build()
