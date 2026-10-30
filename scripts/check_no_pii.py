#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
发布前隐私自检：确认默认数据模板里没有任何非空内容。

原理：default-profile.js 是空模板，所有字符串值都应为空，
      只有少量枚举值（是否、求职类型）允许非空。

用法：
    python scripts/check_no_pii.py
退出码 0 = 通过，1 = 发现疑似个人信息。
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, "src", "core", "default-profile.js")

# 允许非空的枚举值
ALLOWED = {"是", "否", "全职", "实习", "兼职"}

# 额外扫描：这些文件里不应出现任何硬编码的个人标识
SCAN_FILES = ["src/core/default-profile.js", "src/options.html", "src/ui/panel.js", "src/content.js"]


def strip_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    src = re.sub(r"//[^\n]*", "", src)
    return src


def main():
    if not os.path.exists(TARGET):
        print("找不到 %s" % TARGET)
        return 1

    code = strip_comments(open(TARGET, encoding="utf-8").read())
    strings = re.findall(r'"([^"\\]*)"|\'([^\'\\]*)\'', code)
    values = [a or b for a, b in strings]

    bad = [v for v in values if v.strip() and v not in ALLOWED]
    if bad:
        print("✗ default-profile.js 中发现非空内容（疑似个人信息）：")
        for v in sorted(set(bad)):
            print("    %r" % v)
        return 1

    print("✓ default-profile.js 为空模板（%d 个字符串字面量均为空或枚举值）" % len(values))

    # 粗查：手机号 / 邮箱 / 身份证 形态
    patterns = [
        (r"1[3-9]\d{9}", "疑似手机号"),
        (r"[\w.+-]+@[\w-]+\.[\w.]+", "疑似邮箱"),
        (r"\b\d{17}[\dXx]\b", "疑似身份证号"),
    ]
    found = False
    for rel in SCAN_FILES:
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            continue
        text = strip_comments(open(p, encoding="utf-8").read())
        for pat, desc in patterns:
            for m in re.finditer(pat, text):
                print("✗ %s: %s -> %s" % (rel, desc, m.group(0)))
                found = True
    if found:
        return 1

    print("✓ 未发现手机号 / 邮箱 / 身份证号形态的硬编码")
    return 0


if __name__ == "__main__":
    sys.exit(main())
