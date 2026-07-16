"""Placeholder brand art for Socratiq (indigo/violet/gold, abstract light-being Sage + crystal boss).
Generated with PIL so the app never ships broken <Image> tags while AI art is pending.
Safe to overwrite with real generated art later — filenames match what the app references.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "public")
INDIGO = (13, 10, 31)
INDIGO_2 = (23, 17, 48)
VIOLET = (139, 92, 246)
GOLD = (251, 191, 36)
WHITE = (255, 250, 240)


def radial_bg(size, center=None, colors=(INDIGO_2, INDIGO), radius_frac=1.0):
    w, h = size
    if center is None:
        center = (w / 2, h * 0.35)
    base = Image.new("L", (w, h), 0)
    dr = ImageDraw.Draw(base)
    max_r = math.hypot(max(center[0], w - center[0]), max(center[1], h - center[1])) * radius_frac
    steps = 40
    for i in range(steps, 0, -1):
        t = i / steps
        r = max_r * t
        v = int(255 * (1 - t))
        dr.ellipse([center[0] - r, center[1] - r, center[0] + r, center[1] + r], fill=v)
    grad = Image.new("RGB", (w, h), colors[1])
    solid = Image.new("RGB", (w, h), colors[0])
    return Image.composite(solid, grad, base)


def stars(canvas, n=80, seed=7):
    random.seed(seed)
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    w, h = canvas.size
    for _ in range(n):
        x, y = random.uniform(0, w), random.uniform(0, h * 0.7)
        r = random.uniform(0.5, 1.6)
        a = random.randint(50, 170)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def soft_glow(canvas, center, radius, color, peak_alpha=140, steps=24):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = center
    for i in range(steps, 0, -1):
        t = i / steps
        r = radius * t
        a = int(peak_alpha * (1 - t) ** 1.6)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def wing_arc(draw, center, radius, start_deg, end_deg, width, color, alpha):
    cx, cy = center
    bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
    for i in range(width):
        r = radius - i
        bbox_i = [cx - r, cy - r, cx + r, cy + r]
        a = int(alpha * (1 - i / width) ** 0.7)
        draw.arc(bbox_i, start_deg, end_deg, fill=(*color, a), width=2)


def draw_sage(canvas: Image.Image, center, scale=1.0):
    """Abstract 'being of light': layered glow halo + bright core + two swept wing arcs + orbiting motes."""
    cx, cy = center
    soft_glow(canvas, center, 190 * scale, VIOLET, peak_alpha=110)
    soft_glow(canvas, center, 90 * scale, GOLD, peak_alpha=130)

    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Swept wing arcs, mirrored either side of the core.
    wing_arc(draw, (cx - 60 * scale, cy), 130 * scale, -70, 70, 26, VIOLET, 150)
    wing_arc(draw, (cx + 60 * scale, cy), 130 * scale, 110, 250, 26, VIOLET, 150)

    # Bright core.
    r = 22 * scale
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*WHITE, 235))
    r2 = 34 * scale
    draw.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=(*GOLD, 200), width=max(1, int(2 * scale)))

    # Orbiting motes.
    random.seed(int(cx + cy))
    for i in range(7):
        ang = random.uniform(0, math.pi * 2)
        dist = random.uniform(70, 170) * scale
        mx, my = cx + math.cos(ang) * dist, cy + math.sin(ang) * dist * 0.6
        mr = random.uniform(2, 5) * scale
        color = GOLD if i % 2 == 0 else VIOLET
        draw.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=(*color, 210))

    overlay = overlay.filter(ImageFilter.GaussianBlur(0.8))
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"), (0, 0))


def draw_crystal(canvas: Image.Image, center, size, hp_frac=1.0):
    overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = center
    pts = [
        (cx, cy - size), (cx + size * 0.8, cy - size * 0.35), (cx + size, cy + size * 0.5),
        (cx, cy + size), (cx - size, cy + size * 0.5), (cx - size * 0.8, cy - size * 0.35),
    ]
    fill_a = int(70 + 90 * hp_frac)
    draw.polygon(pts, fill=(*VIOLET, fill_a), outline=(*GOLD, 210))
    draw.line([pts[0], (cx, cy)], fill=(*GOLD, 150), width=2)
    draw.line([pts[3], (cx, cy)], fill=(*GOLD, 110), width=1)
    draw.line([pts[2], (cx, cy - size * 0.1)], fill=(*WHITE, 90), width=1)
    canvas.paste(Image.alpha_composite(canvas.convert("RGBA"), overlay).convert("RGB"), (0, 0))
    soft_glow(canvas, center, size * 1.4, VIOLET, peak_alpha=60)


# 1. logo-mark.png — 512x512 square icon
logo = radial_bg((512, 512), center=(256, 230), radius_frac=1.05)
stars(logo, 24)
draw_sage(logo, (256, 260), scale=1.1)
logo.save(os.path.join(OUT, "logo-mark.png"))

# 2. hero-illustration.png — 1600x900 wide scene, Sage + cracking crystal
hero = radial_bg((1600, 900), center=(750, 300), radius_frac=1.25)
stars(hero, 150)
draw_crystal(hero, (1080, 480), 180, hp_frac=0.4)
draw_sage(hero, (520, 420), scale=2.3)
hero.save(os.path.join(OUT, "hero-illustration.png"))

# 3. sage-mascot.png — 512x512 transparent, Sage close-up
mascot_rgb = Image.new("RGB", (512, 512), INDIGO)
draw_sage(mascot_rgb, (256, 270), scale=1.5)
mascot = mascot_rgb.convert("RGBA")
px = mascot.load()
for y in range(512):
    for x in range(512):
        r, g, b, a = px[x, y]
        if abs(r - INDIGO[0]) < 3 and abs(g - INDIGO[1]) < 3 and abs(b - INDIGO[2]) < 3:
            px[x, y] = (r, g, b, 0)
mascot.save(os.path.join(OUT, "sage-mascot.png"))

# 4. og-image.png — 1200x630 social card
og = radial_bg((1200, 630), center=(560, 220), radius_frac=1.15)
stars(og, 90)
draw_crystal(og, (900, 430), 120, hp_frac=0.6)
draw_sage(og, (400, 350), scale=1.7)
og.save(os.path.join(OUT, "og-image.png"))

print("done")
