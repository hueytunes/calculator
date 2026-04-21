#!/usr/bin/env python3
"""Generate the Lab Calc app icon: coral rounded-square with a clean
white test tube (sage liquid inside)."""
from PIL import Image, ImageDraw


def make_icon(size: int, out_path: str) -> None:
    # --- Coral gradient background on a rounded square ---
    bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    top = (229, 106, 79)     # --coral
    bot = (201, 84, 53)      # --coral-deep
    draw_bg = ImageDraw.Draw(bg)
    for y in range(size):
        t = y / (size - 1)
        r = int(top[0] + (bot[0] - top[0]) * t)
        g = int(top[1] + (bot[1] - top[1]) * t)
        b = int(top[2] + (bot[2] - top[2]) * t)
        draw_bg.line([(0, y), (size, y)], fill=(r, g, b, 255))

    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size, size), radius=int(size * 0.22), fill=255
    )

    icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    icon.paste(bg, (0, 0), mask)

    # --- Test tube ---
    #   Vertical capsule. Sage liquid fills the bottom ~60%.
    d = ImageDraw.Draw(icon)
    cx = size // 2
    tube_w = int(size * 0.32)
    tube_top = int(size * 0.20)
    tube_bottom = int(size * 0.82)
    tube_left = cx - tube_w // 2
    tube_right = cx + tube_w // 2
    tube_radius = tube_w // 2

    WHITE = (255, 250, 243, 255)
    SAGE = (143, 166, 126, 255)

    # Rounded "capsule" body (wholly white to start)
    d.rounded_rectangle(
        (tube_left, tube_top, tube_right, tube_bottom),
        radius=tube_radius,
        fill=WHITE,
    )

    # Sage liquid: draw a rounded rectangle that fills the bottom portion,
    # then clip it to the tube shape by masking.
    liquid_top = int(size * 0.50)
    liquid_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(liquid_layer)
    # Square-top rectangle for the top edge of liquid (menicus-like)
    ld.rectangle(
        (tube_left, liquid_top, tube_right, tube_bottom),
        fill=SAGE,
    )
    # Round off the bottom of the liquid to match the tube base
    ld.rounded_rectangle(
        (tube_left, liquid_top + tube_radius - 2,
         tube_right, tube_bottom),
        radius=tube_radius,
        fill=SAGE,
    )

    # Clip liquid to tube shape
    tube_mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(tube_mask).rounded_rectangle(
        (tube_left, tube_top, tube_right, tube_bottom),
        radius=tube_radius, fill=255,
    )
    icon.paste(liquid_layer, (0, 0), tube_mask)

    # Redraw the top rim of the tube as a thick white cap
    rim_w = int(tube_w * 1.12)
    rim_h = int(size * 0.04)
    d2 = ImageDraw.Draw(icon)
    d2.rounded_rectangle(
        (cx - rim_w // 2, tube_top - rim_h // 2,
         cx + rim_w // 2, tube_top + rim_h // 2),
        radius=rim_h // 2,
        fill=WHITE,
    )

    # Two small bubbles in the liquid for life
    d2.ellipse(
        (cx - int(size * 0.05), liquid_top + int(size * 0.08),
         cx - int(size * 0.05) + int(size * 0.05),
         liquid_top + int(size * 0.08) + int(size * 0.05)),
        fill=(255, 255, 255, 180),
    )
    d2.ellipse(
        (cx + int(size * 0.04), liquid_top + int(size * 0.16),
         cx + int(size * 0.04) + int(size * 0.035),
         liquid_top + int(size * 0.16) + int(size * 0.035)),
        fill=(255, 255, 255, 150),
    )

    icon.save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path} ({size}x{size})")


if __name__ == "__main__":
    make_icon(180, "apple-touch-icon.png")
    make_icon(192, "icon-192.png")
    make_icon(512, "icon-512.png")
