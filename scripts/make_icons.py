#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成扩展图标（16/32/48/128 PNG）。

设计：深蓝圆角方块 + 白色「投」字 + 右下角绿色对勾。
先用 512px 超采样绘制，再 LANCZOS 缩放，保证小尺寸也清晰。

注意：
    本脚本依赖系统中文字体。Windows 上通常有微软雅黑；Linux / CI 环境一般没有，
    此时会退化为「无文字」的几何图标（文档 + 对勾），并打印提示，绝不会渲染出豆腐块。

依赖：Pillow
用法：
    python scripts/make_icons.py
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")
os.makedirs(OUT, exist_ok=True)

S = 512  # 超采样尺寸
BG = (13, 59, 102)  # #0d3b66
FG = (255, 255, 255)
ACCENT = (39, 174, 96)  # #27ae60

# 只列出确定包含中文字形的字体
FONT_CANDIDATES = [
    # Windows
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    # macOS
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    # Linux
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]


def pick_font(size):
    """返回可用的中文字体；找不到时返回 None（由调用方决定如何退化）。"""
    for path in FONT_CANDIDATES:
        if not os.path.exists(path):
            continue
        try:
            font = ImageFont.truetype(path, size)
        except Exception:
            continue
        # 用 getmask 粗验是否真的能渲染出字形（部分字体缺失 CJK 时会返回空 bitmap）
        try:
            mask = font.getmask("投")
            if mask.size[0] > 0 and mask.size[1] > 0:
                return font
        except Exception:
            continue
    return None


def draw_check(d, cx, cy, cr):
    """右下角绿色圆点 + 白色对勾"""
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=ACCENT)
    lw = max(2, int(S * 0.045))
    d.line([(cx - cr * 0.42, cy + cr * 0.02), (cx - cr * 0.10, cy + cr * 0.38)], fill=FG, width=lw)
    d.line([(cx - cr * 0.10, cy + cr * 0.38), (cx + cr * 0.46, cy - cr * 0.36)], fill=FG, width=lw)


def draw_text_icon(font):
    """主方案：圆角方块 + 「投」+ 对勾"""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BG)

    text = "投"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (S - tw) / 2 - bbox[0] - int(S * 0.05)
    ty = (S - th) / 2 - bbox[1] - int(S * 0.07)
    d.text((tx, ty), text, font=font, fill=FG)

    draw_check(d, int(S * 0.755), int(S * 0.755), int(S * 0.19))
    return img


def draw_geometric_fallback():
    """退路：无中文字体时用「文档 + 对勾」，不依赖任何字体"""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=BG)

    # 文档轮廓
    x0, y0, x1, y1 = int(S * 0.24), int(S * 0.17), int(S * 0.70), int(S * 0.70)
    d.rounded_rectangle([x0, y0, x1, y1], radius=int(S * 0.05), outline=FG, width=max(2, int(S * 0.038)))

    # 三条文本行
    lw = max(2, int(S * 0.035))
    for i in range(3):
        y = y0 + int((y1 - y0) * (0.26 + i * 0.22))
        d.line([(x0 + int(S * 0.07), y), (x1 - int(S * 0.07), y)], fill=FG, width=lw)

    draw_check(d, int(S * 0.755), int(S * 0.755), int(S * 0.19))
    return img


def main():
    font = pick_font(int(S * 0.52))
    if font is not None:
        base = draw_text_icon(font)
        print("使用中文字体渲染图标")
    else:
        base = draw_geometric_fallback()
        print(
            "⚠️  未找到可用的中文字体，已改用无文字的几何图标。\n"
            "    如需「投」字图标，请在装有微软雅黑 / 苹方 / Noto Sans CJK 的环境运行本脚本。",
            file=sys.stderr,
        )

    for size in (16, 32, 48, 128):
        path = os.path.join(OUT, "icon%d.png" % size)
        base.resize((size, size), Image.LANCZOS).save(path, "PNG")
        print("  生成", os.path.relpath(path, ROOT), "%dx%d" % (size, size))

    docs = os.path.join(ROOT, "docs")
    os.makedirs(docs, exist_ok=True)
    base.resize((256, 256), Image.LANCZOS).save(os.path.join(docs, "icon-256.png"), "PNG")
    print("  生成 docs/icon-256.png")


if __name__ == "__main__":
    main()
