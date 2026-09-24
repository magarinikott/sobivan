#!/usr/bin/env python3
"""Build an exhaustive, review-only quote candidate bank from every site lyric."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

from generate import BANK_PATH, HERE, REPO, normalize, parse_songs


OUTPUT = HERE / "candidate_bank.json"
SECTION_RE = re.compile(
    r"^(?:куплет|припев|бридж|аутро|интро|вступление|финал|проигрыш|"
    r"предприпев|пре-припев|постприпев|часть)(?:\s|$)",
    re.I,
)
CHORD = r"[A-H](?:#|b)?(?:m|maj|min|sus|dim|aug|add)?\d*(?:/[A-H](?:#|b)?)?"
CHORD_LINE_RE = re.compile(rf"^(?:{CHORD})(?:\s+(?:{CHORD}))*$")


def lyric_paragraphs(text: str) -> list[list[str]]:
    paragraphs: list[list[str]] = []
    current: list[str] = []
    for raw in [*text.splitlines(), ""]:
        line = raw.strip()
        if not line:
            if current:
                paragraphs.append(current)
                current = []
            continue
        if SECTION_RE.match(line):
            if current:
                paragraphs.append(current)
                current = []
            continue
        if CHORD_LINE_RE.fullmatch(line):
            continue
        current.append(line)
    return paragraphs


def main() -> None:
    songs = parse_songs(REPO / "index.html")
    curated = json.loads(BANK_PATH.read_text(encoding="utf-8"))["quotes"]
    curated_text = {
        (quote["song_id"], normalize(" ".join(quote["lines"]))): quote["id"] for quote in curated
    }

    candidates: list[dict] = []
    stats: dict[str, int] = {}
    for song_id, song in songs.items():
        seen: set[str] = set()
        serial = 0
        for paragraph in lyric_paragraphs(song["text"]):
            # Все непрерывные отрывки от одной до четырёх строк.
            # Ограничение по длине — это физический предел утверждённого макета.
            for size in range(1, 5):
                for start in range(0, len(paragraph) - size + 1):
                    lines = paragraph[start : start + size]
                    character_count = sum(len(line) for line in lines)
                    if character_count < 28 or character_count > 220:
                        continue
                    key = normalize(" ".join(lines))
                    if key in seen:
                        continue
                    seen.add(key)
                    serial += 1
                    digest = hashlib.sha1(key.encode("utf-8")).hexdigest()[:8]
                    curated_id = curated_text.get((song_id, key))
                    candidates.append(
                        {
                            "id": f"{song_id}-candidate-{serial:03d}-{digest}",
                            "song_id": song_id,
                            "song": song["title"],
                            "lines": lines,
                            "status": "already_curated" if curated_id else "pending_review",
                            "curated_quote_id": curated_id,
                        }
                    )
        stats[song_id] = serial

    payload = {
        "version": 1,
        "purpose": "Исчерпывающий банк кандидатов. В автопубликацию не попадает без ручного отбора.",
        "rules": {
            "source": "index.html / все 22 песни",
            "windows": "все непрерывные отрывки из 1–4 строк",
            "length": "28–220 символов",
            "excluded": "аккорды, заголовки частей песни, точные повторы",
        },
        "source_sha256": hashlib.sha256((REPO / "index.html").read_bytes()).hexdigest(),
        "song_counts": stats,
        "total": len(candidates),
        "candidates": candidates,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(candidates)} кандидата из {len(songs)} песен -> {OUTPUT}")


if __name__ == "__main__":
    main()
