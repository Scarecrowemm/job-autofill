#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成扩展图标（16/32/48/128 PNG）。

设计：深蓝圆角方块 + 白色「投」字 + 右下角绿色对勾。
先用 512px 超采样绘制，再 LANCZOS 缩放，保证小尺寸也清晰。

依赖：Pillow
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")
os.makedirs(OUT, exist_ok=True)

S = 512  # 超采样尺寸
BG = (13, 59, 102)        # #0d3b66
FG = (255, 255, 255)
ACCENT = (39, 174, 96)    # #27ae60

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
]


def pick_font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_base():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(S * 0.22)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=BG)

    # 「投」字，略微偏左上，给右下角对勾留位
    font = pick_font(int(S * 0.52))
    text = "投"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (S - tw) / 2 - bbox[0] - int(S * 0.05)
    ty = (S - th) / 2 - bbox[1] - int(S * 0.07)
    d.text((tx, ty), text, font=font, fill=FG)

    # 右下角绿色对勾圆点
    cr = int(S * 0.19)
    cx, cy = int(S * 0.755), int(S * 0.755)
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=ACCENT)
    lw = max(2, int(S * 0.045))
    d.line([(cx - cr * 0.42, cy + cr * 0.02), (cx - cr * 0.10, cy + cr * 0.38)], fill=FG, width=lw)
    d.line([(cx - cr * 0.10, cy + cr * 0.38), (cx + cr * 0.46, cy - cr * 0.36)], fill=FG, width=lw)
    return img


base = draw_base()
for size in (16, 32, 48, 128):
    out = os.path.join(OUT, "icon%d.png" % size)
    base.resize((size, size), Image.LANCZOS).save(out, "PNG")
    print("生成", out, "%dx%d" % (size, size))

# 顺带导出一张 256 用于商店/README
base.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "docs", "icon-256.png"), "PNG")
print("生成 docs/icon-256.png")
