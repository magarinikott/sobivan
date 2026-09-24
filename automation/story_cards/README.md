# SOBIVAN · «Шум между строк»

Облачная сборка еженедельного пака из пяти story-карточек 1080×1920.

## Как это работает

1. `quote_bank.json` хранит только отобранные цитаты.
2. `state.json` хранит ID уже отправленных цитат.
3. `generate.py` берёт первые пять новых, проверяет их по текстам на сайте и рисует PNG.
4. `send_telegram.py` отправляет пять PNG через `@myCamomile_bot` как отдельные файлы. ZIP не отправляется.
5. Только после успешной отправки GitHub коммитит новое состояние. Повторы не возникают.

Если новых цитат осталось меньше пяти, workflow завершится ошибкой, а не начнёт повторяться. Это специально.

## Проверка локально

```bash
python3 -m pip install -r automation/story_cards/requirements.txt
python3 automation/story_cards/generate.py --output /tmp/sobivan-story-cards
python3 automation/story_cards/send_telegram.py /tmp/sobivan-story-cards --dry-run
```

## GitHub Secrets

- `TELEGRAM_BOT_TOKEN` — токен `@myCamomile_bot`.
- `TELEGRAM_CHAT_ID` — ID чата-получателя.

Секреты не хранятся в Git и не печатаются в логах.

## Важно

Сейчас workflow запускается **только вручную**. Еженедельное расписание включается после облачного теста. Так мы не получим дубли из-за одновременной работы старого локального cron.
