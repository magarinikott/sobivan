#!/usr/bin/env python3
"""Generate a five-card SOBIVAN story pack from the reviewed quote bank."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BANK_PATH = HERE / "usable_quote_bank.json"
STATE_PATH = HERE / "state.json"
FONTS = REPO / "assets" / "fonts"

W, H = 1080, 1920
BG = "#050505"
TEXT = "#F4F1EB"
MUTED = "#BDB4A7"
LIME = "#98FF1D"
RED = "#FF3535"
VIOLET = "#8352A8"
LEFT = 96
COLUMN_RIGHT = 826
QUOTE_TOP = 690
QUOTE_BOTTOM = 1370
LINE_SPACING = 10


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def parse_songs(index_path: Path) -> dict[str, dict]:
    html = index_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'"([^"\\]+)":\s*\{\s*title:\s*"([^"\\]+)",\s*text:\s*`(.*?)`\s*,?\s*\}',
        re.S,
    )
    songs = {}
    for match in pattern.finditer(html):
        songs[match.group(1)] = {"title": match.group(2), "text": match.group(3)}
    if not songs:
        raise RuntimeError(f"не удалось извлечь тексты песен из {index_path}")
    return songs


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).replace("ё", "е").lower()


def validate_bank(bank: dict, songs: dict[str, dict]) -> None:
    ids: set[str] = set()
    problems: list[str] = []
    for quote in bank["quotes"]:
        quote_id = quote["id"]
        if quote_id in ids:
            problems.append(f"{quote_id}: дублирующийся id")
        ids.add(quote_id)
        song_id = quote["song_id"]
        if song_id not in songs:
            problems.append(f"{quote_id}: нет песни {song_id} на сайте")
            continue
        if normalize(quote["song"]) not in normalize(songs[song_id]["title"]):
            problems.append(f"{quote_id}: название песни не совпадает")
        source_lines = {normalize(line) for line in songs[song_id]["text"].splitlines() if line.strip()}
        for line in quote["lines"]:
            if normalize(line) not in source_lines:
                problems.append(f'{quote_id}: строка не найдена: "{line}"')
    if problems:
        raise RuntimeError("банк цитат не прошёл проверку:\n- " + "\n- ".join(problems))


def text_width(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> int:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


def wrap_source_lines(
    draw: ImageDraw.ImageDraw,
    source_lines: list[str],
    font: ImageFont.FreeTypeFont,
    max_width: int,
) -> list[str]:
    wrapped: list[str] = []
    for source in source_lines:
        words = source.split()
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            if text_width(draw, candidate, font) <= max_width:
                current = candidate
            else:
                if not current:
                    raise RuntimeError(f'слово не помещается в колонку: "{word}"')
                wrapped.append(current)
                current = word
        if current:
            wrapped.append(current)
    return wrapped


def add_texture(image: Image.Image, seed: str) -> None:
    rng = random.Random(int(hashlib.sha256(seed.encode()).hexdigest()[:16], 16))
    pixels = image.load()
    shades = [(9, 9, 9), (13, 13, 13), (17, 16, 16), (7, 7, 8)]
    for _ in range(34_000):
        x = rng.randrange(W)
        y = rng.randrange(H)
        pixels[x, y] = (*rng.choice(shades), 255)


def render_card(quote: dict, output_path: Path) -> None:
    title_big = ImageFont.truetype(FONTS / "Oswald-Bold.ttf", 116)
    title_small = ImageFont.truetype(FONTS / "Oswald-Bold.ttf", 94)
    quote_font = ImageFont.truetype(FONTS / "Inter-Bold.ttf", 62)
    meta_font = ImageFont.truetype(FONTS / "Inter-Medium.ttf", 30)

    image = Image.new("RGBA", (W, H), BG)
    add_texture(image, quote["id"])
    draw = ImageDraw.Draw(image)

    draw.rectangle((1018, 0, 1040, H), fill=VIOLET)
    draw.text((LEFT, 245), "ШУМ", fill=LIME, font=title_big)
    draw.text((LEFT + 279, 270), "МЕЖДУ СТРОК", fill=TEXT, font=title_small)
    draw.rectangle((LEFT, 504, COLUMN_RIGHT, 516), fill=RED)

    lines = wrap_source_lines(draw, quote["lines"], quote_font, COLUMN_RIGHT - LEFT)
    bbox = draw.multiline_textbbox((0, 0), "\n".join(lines), font=quote_font, spacing=LINE_SPACING)
    quote_height = bbox[3] - bbox[1]
    available = QUOTE_BOTTOM - QUOTE_TOP
    if quote_height > available:
        raise RuntimeError(f"{quote['id']}: цитата выше допустимой области")
    y = QUOTE_TOP + (available - quote_height) // 2
    draw.multiline_text((LEFT, y), "\n".join(lines), fill=TEXT, font=quote_font, spacing=LINE_SPACING)

    base_y = 1630
    draw.rectangle((LEFT, base_y, LEFT + 74, base_y + 8), fill=LIME)
    draw.rectangle((LEFT + 74, base_y, COLUMN_RIGHT, base_y + 8), fill="#292929")
    song_label = "ДКМСВ" if quote["song_id"] == "dkmsv" else quote["song"].upper()
    draw.text((LEFT, 1678), f"SOBIVAN / {song_label}", fill=MUTED, font=meta_font)
    site = "SOBIVAN.RU"
    draw.text((COLUMN_RIGHT - text_width(draw, site, meta_font), 1740), site, fill=MUTED, font=meta_font)

    image.convert("RGB").save(output_path, "PNG", optimize=True)


def make_preview(paths: list[Path], output_path: Path) -> None:
    thumb_w = 270
    thumb_h = 480
    canvas = Image.new("RGB", (thumb_w * len(paths), thumb_h), "#111111")
    for index, path in enumerate(paths):
        card = Image.open(path).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        canvas.paste(card, (index * thumb_w, 0))
    canvas.save(output_path, "JPEG", quality=90)


def select_quotes(bank: dict, state: dict, count: int, include_used: bool = False) -> list[dict]:
    used = set() if include_used else set(state.get("used_quote_ids", []))
    available = [q for q in bank["quotes"] if q.get("enabled", False) and q["id"] not in used]
    if len(available) < count:
        raise RuntimeError(
            f"в банке только {len(available)} новых цитат; нужно {count}. "
            "Автоматика остановлена, чтобы не было повторов."
        )
    # Не даём одной песне заполнить весь пак и не складываем вместе несколько
    # explicit/политических карточек. Выбор детерминирован состоянием Git, а не случаен.
    used_by_song: dict[str, int] = {}
    for quote in bank["quotes"]:
        if quote["id"] in used:
            used_by_song[quote["song_id"]] = used_by_song.get(quote["song_id"], 0) + 1

    song_order = list(dict.fromkeys(q["song_id"] for q in bank["quotes"]))
    rotation = len(state.get("packs", [])) % max(1, len(song_order))
    rotated = song_order[rotation:] + song_order[:rotation]
    rank = {song_id: index for index, song_id in enumerate(rotated)}
    songs = sorted(
        {q["song_id"] for q in available},
        key=lambda song_id: (used_by_song.get(song_id, 0), rank.get(song_id, 9999)),
    )

    selected: list[dict] = []
    explicit_count = 0
    political_count = 0
    for song_id in songs:
        for quote in available:
            if quote["song_id"] != song_id:
                continue
            if quote.get("explicit", False) and explicit_count >= 1:
                continue
            if quote.get("political", False) and political_count >= 1:
                continue
            selected.append(quote)
            explicit_count += int(quote.get("explicit", False))
            political_count += int(quote.get("political", False))
            break
        if len(selected) == count:
            return selected

    # Запасной проход на случай когда в банке остались только explicit/политические фразы.
    for quote in available:
        if quote not in selected:
            selected.append(quote)
        if len(selected) == count:
            return selected
    raise RuntimeError("не удалось собрать полный пак")


def finalize(selection_path: Path, state_path: Path) -> None:
    selection = load_json(selection_path)
    state = load_json(state_path)
    used = list(state.get("used_quote_ids", []))
    for quote in selection["quotes"]:
        if quote["id"] not in used:
            used.append(quote["id"])
    state["used_quote_ids"] = used
    state.setdefault("packs", []).append(
        {
            "generated_at": selection["generated_at"],
            "quote_ids": [q["id"] for q in selection["quotes"]],
        }
    )
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=HERE / "output")
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--include-used", action="store_true", help="для теста: можно брать уже использованные")
    parser.add_argument("--finalize", type=Path, help="отметить отправленные цитаты в state.json")
    args = parser.parse_args()

    if args.finalize:
        finalize(args.finalize, STATE_PATH)
        return 0

    bank = load_json(BANK_PATH)
    state = load_json(STATE_PATH)
    songs = parse_songs(REPO / "index.html")
    validate_bank(bank, songs)
    selected = select_quotes(bank, state, args.count, args.include_used)

    args.output.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for index, quote in enumerate(selected, start=1):
        path = args.output / f"{index:02d}-{quote['id']}.png"
        render_card(quote, path)
        paths.append(path)

    generated_at = datetime.now(timezone.utc).isoformat()
    selection = {
        "series": bank["series"],
        "generated_at": generated_at,
        "quotes": [
            {
                "id": quote["id"],
                "song": quote["song"],
                "lines": quote["lines"],
                "file": path.name,
            }
            for quote, path in zip(selected, paths)
        ],
    }
    (args.output / "selection.json").write_text(
        json.dumps(selection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    make_preview(paths, args.output / "preview.jpg")
    print(args.output.resolve())
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
