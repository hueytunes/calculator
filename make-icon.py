#!/usr/bin/env python3
"""Generate Lab Calc app icon: coral gradient rounded-square with
the 🧪 test tube emoji centered.

Uses Apple Color Emoji (built into macOS) — the same emoji you'd
see typed on an iPhone. Outputs a perfectly square PNG so iOS
accepts it as a home-screen icon without rejecting it for bad
dimensions.
"""
from PIL import Image, ImageDraw, ImageFont

EMOJI_FONT = "/System/Library/Fonts/Apple Color Emoji.ttc"
# Apple Color Emoji is a bitmap font and only renders at specific sizes:
# 20, 32, 40, 48, 64, 96, 128, 160. We render at 160 and scale down to fit.
EMOJI_RENDER_SIZE = 160


def render_emoji_square(char: str) -> Image.Image:
    """Render the emoji onto a transparent 160x160 canvas."""
    im = Image.new("RGBA", (EMOJI_RENDER_SIZE + 20, EMOJI_RENDER_SIZE + 20), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    font = ImageFont.truetype(EMOJI_FONT, EMOJI_RENDER_SIZE)
    draw.text((10, 10), char, font=font, embedded_color=True)
    # Trim fully-transparent border
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def make_icon(size: int, out_path: str) -> None:
    # --- Background: coral gradient, rounded square ---
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    top = (229, 106, 79)
    bot = (201, 84, 53)
    d = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / (size - 1)
        r = int(top[0] + (bot[0] - top[0]) * t)
        g = int(top[1] + (bot[1] - top[1]) * t)
        b = int(top[2] + (bot[2] - top[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size, size), radius=int(size * 0.22), fill=255
    )

    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(bg, (0, 0), mask)

    # --- Overlay the emoji, scaled to ~65% of the icon ---
    emoji = render_emoji_square("🧪")
    target = int(size * 0.65)
    emoji = emoji.resize((target, target), Image.LANCZOS)
    ex = (size - target) // 2
    ey = (size - target) // 2
    icon.paste(emoji, (ex, ey), emoji)

    icon.save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path} ({size}x{size})")


if __name__ == "__main__":
    make_icon(180, "apple-touch-icon.png")
    make_icon(192, "icon-192.png")
    make_icon(512, "icon-512.png")
