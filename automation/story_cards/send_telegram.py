#!/usr/bin/env python3
"""Send generated PNG cards to Telegram as separate documents."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import secrets
import sys
import urllib.request
from pathlib import Path


def post_document(token: str, chat_id: str, path: Path, caption: str | None = None) -> dict:
    boundary = f"----sobivan-{secrets.token_hex(16)}"
    chunks: list[bytes] = []

    def field(name: str, value: str) -> None:
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )

    field("chat_id", chat_id)
    if caption:
        field("caption", caption)

    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="document"; filename="{path.name}"\r\n'.encode(),
            f"Content-Type: {mime}\r\n\r\n".encode(),
            path.read_bytes(),
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/sendDocument",
        data=b"".join(chunks),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        result = json.load(response)
    if not result.get("ok"):
        raise RuntimeError(result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("directory", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    selection = json.loads((args.directory / "selection.json").read_text(encoding="utf-8"))
    files = [args.directory / item["file"] for item in selection["quotes"]]
    if len(files) != 5:
        raise RuntimeError(f"ожидалось 5 карточек, найдено {len(files)}")
    for path in files:
        if not path.is_file():
            raise FileNotFoundError(path)

    if args.dry_run:
        print("\n".join(str(path) for path in files))
        return 0

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        raise RuntimeError("нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID")

    for index, path in enumerate(files):
        caption = "Шум между строк · новый пак" if index == 0 else None
        post_document(token, chat_id, path, caption)
        print(f"отправлено: {path.name}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
