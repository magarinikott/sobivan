#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 automation/site/validate.py
unexpected="$(git status --porcelain | awk '{print $2}' | grep -Ev '^(posters/posters\.json|posters/assets/|latest-release\.json|covers/releases/)' || true)"
if [[ -n "$unexpected" ]]; then
  echo "Отмена: есть посторонние изменения:" >&2
  echo "$unexpected" >&2
  exit 1
fi
git add posters/posters.json posters/assets latest-release.json covers/releases
git diff --cached --check
if git diff --cached --quiet; then echo "Нет изменений для публикации."; exit 0; fi
git config user.name "SOBIVAN Site Agent"
git config user.email "agent@sobivan.ru"
git commit -m "${1:-content: update SOBIVAN site}"
git push origin main
echo "Опубликовано. GitHub Pages обновится обычно в течение нескольких минут."
