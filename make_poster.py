from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "photo_2026-03-29 17.54.44.jpeg"
OUTPUT = ROOT / "sobivan_baumana_poster.png"
OUTPUT_JPG = ROOT / "sobivan_baumana_poster.jpg"

WIDTH = 1080
HEIGHT = 1350

ACCENT = "#F04D36"
TEXT = "#F6EADB"
PANEL = "#121212"
PANEL_SOFT = "#1C1B1B"

FONT_DISPLAY = "/System/Library/Fonts/Avenir Next Condensed.ttc"
FONT_TEXT = "/System/Library/Fonts/Supplemental/PTSans.ttc"


def load_font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size, index=index)


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    src_w, src_h = image.size
    dst_w, dst_h = size
    scale = max(dst_w / src_w, dst_h / src_h)
    resized = image.resize((int(src_w * scale), int(src_h * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - dst_w) // 2
    top = (resized.height - dst_h) // 2
    return resized.crop((left, top, left + dst_w, top + dst_h))


def contain(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    src_w, src_h = image.size
    dst_w, dst_h = size
    scale = min(dst_w / src_w, dst_h / src_h)
    resized = image.resize((int(src_w * scale), int(src_h * scale)), Image.Resampling.LANCZOS)
    return resized


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def vertical_gradient(size: tuple[int, int], top_rgba: tuple[int, int, int, int], bottom_rgba: tuple[int, int, int, int]) -> Image.Image:
    gradient = Image.new("RGBA", size)
    pixels = gradient.load()
    for y in range(size[1]):
        t = y / max(size[1] - 1, 1)
        rgba = tuple(int(top_rgba[i] * (1 - t) + bottom_rgba[i] * t) for i in range(4))
        for x in range(size[0]):
            pixels[x, y] = rgba
    return gradient


def fit_text(draw: ImageDraw.ImageDraw, text: str, font_path: str, max_size: int, min_size: int, max_width: int, index: int = 0):
    for size in range(max_size, min_size - 1, -2):
        font = load_font(font_path, size, index=index)
        bbox = draw.textbbox((0, 0), text, font=font)
        if bbox[2] - bbox[0] <= max_width:
            return font
    return load_font(font_path, min_size, index=index)


def main() -> None:
    base = Image.new("RGBA", (WIDTH, HEIGHT), PANEL)
    source = Image.open(SOURCE).convert("RGB")

    bg = cover(source, (WIDTH, HEIGHT))
    bg = bg.filter(ImageFilter.GaussianBlur(18))
    bg = ImageEnhance.Color(bg).enhance(0.85)
    bg = ImageEnhance.Brightness(bg).enhance(0.62)
    base.alpha_composite(bg.convert("RGBA"))

    overlay = vertical_gradient((WIDTH, HEIGHT), (8, 8, 8, 150), (10, 10, 10, 220))
    base.alpha_composite(overlay)

    hero_area = (80, 90, 1000, 1095)
    hero_w = hero_area[2] - hero_area[0]
    hero_h = hero_area[3] - hero_area[1]
    hero = contain(source, (hero_w, hero_h))
    hero = ImageEnhance.Contrast(hero).enhance(1.05)
    hero = ImageEnhance.Color(hero).enhance(0.95)

    hero_canvas = Image.new("RGBA", (hero_w, hero_h), PANEL_SOFT)
    paste_x = (hero_w - hero.width) // 2 + 55
    paste_y = hero_h - hero.height
    hero_canvas.paste(hero, (paste_x, paste_y))

    shadow = Image.new("RGBA", (hero_w + 36, hero_h + 36), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((18, 18, hero_w + 18, hero_h + 18), radius=44, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    base.alpha_composite(shadow, (hero_area[0] - 18, hero_area[1] - 8))

    hero_mask = rounded_mask((hero_w, hero_h), 42)
    hero_card = hero_canvas.copy()
    hero_card.putalpha(hero_mask)
    base.alpha_composite(hero_card, (hero_area[0], hero_area[1]))

    tint = vertical_gradient((hero_w, hero_h), (240, 77, 54, 20), (0, 0, 0, 0))
    tint_alpha = ImageChops.multiply(tint.getchannel("A"), hero_mask)
    tint.putalpha(tint_alpha)
    base.alpha_composite(tint, (hero_area[0], hero_area[1]))

    draw = ImageDraw.Draw(base)
    title_font = fit_text(draw, "SOBIVAN", FONT_DISPLAY, 158, 118, hero_w - 80, index=0)
    label_font = load_font(FONT_TEXT, 42, index=0)
    city_font = load_font(FONT_TEXT, 58, index=0)
    info_font = load_font(FONT_TEXT, 32, index=0)
    note_font = load_font(FONT_TEXT, 28, index=0)

    title_x = 120
    title_y = 770
    draw.text((title_x + 5, title_y + 5), "SOBIVAN", font=title_font, fill=(0, 0, 0, 140))
    draw.text((title_x, title_y), "SOBIVAN", font=title_font, fill=TEXT)

    stripe_y = 920
    draw.rounded_rectangle((120, stripe_y, 575, stripe_y + 72), radius=20, fill=ACCENT)
    draw.text((148, stripe_y + 12), "УЛИЧНОЕ ВЫСТУПЛЕНИЕ", font=label_font, fill="white")

    panel_y = 1035
    panel_h = 225
    draw.rounded_rectangle((80, panel_y, 1000, panel_y + panel_h), radius=34, fill=(18, 18, 18, 235))

    draw.text((120, panel_y + 38), "КАЗАНЬ", font=city_font, fill=TEXT)
    draw.text((120, panel_y + 102), "УЛИЦА БАУМАНА", font=city_font, fill=ACCENT)

    info_x = 670
    draw.line((640, panel_y + 34, 640, panel_y + panel_h - 34), fill=(255, 255, 255, 45), width=2)
    draw.text((info_x, panel_y + 46), "ДАТА И ВРЕМЯ", font=info_font, fill=(255, 255, 255, 180))
    draw.text((info_x, panel_y + 88), "СКОРО", font=city_font, fill=TEXT)
    draw.text((info_x, panel_y + 154), "Следите за анонсом", font=note_font, fill=(255, 255, 255, 180))

    draw.rounded_rectangle((120, 120, 255, 176), radius=16, fill=(246, 234, 219, 230))
    draw.text((144, 129), "LIVE", font=load_font(FONT_DISPLAY, 38), fill=PANEL)

    draw.line((120, 735, 340, 735), fill=ACCENT, width=8)

    result = base.convert("RGB")
    result.save(OUTPUT, quality=95)
    result.save(OUTPUT_JPG, quality=95)
    print(OUTPUT)


if __name__ == "__main__":
    main()
