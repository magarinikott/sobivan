# Управление афишами и релизами SOBIVAN

## Афиши
Источник данных: `posters/posters.json`. Изображения: `posters/assets/`.

- Новая афиша получает `status: active` и ставится первой.
- Прошедшую/указанную пользователем афишу не удалять: менять статус на `archive`.
- Если добавляются две новые афиши, обе остаются `active`; порядок на главной совпадает с порядком в JSON.
- Не архивировать афишу по догадке. Архивировать только указанную пользователем либо уже прошедшую дату после подтверждения.

```bash
python3 automation/site/poster_manager.py list
python3 automation/site/poster_manager.py archive --match "15 ноября"
python3 automation/site/poster_manager.py add \
  --image "/путь/к/афише.jpg" \
  --title "дата • название" \
  --subtitle "площадка • город • время" \
  --alt "Полное понятное описание афиши" \
  --archive "15 ноября"
```

## Новый релиз
Файл данных: `latest-release.json`. Обложки: `covers/releases/`.

Нужно найти точный релиз SOBIVAN:
1. На официальной карточке артиста SOBIVAN в Яндекс Музыке открыть конкретный релиз и скопировать прямую ссылку.
2. На странице артиста SOBIVAN в VK Музыке открыть тот же релиз и скопировать прямую ссылку.
3. Проверить точное совпадение артиста и названия.
4. Взять официальную обложку именно из карточки релиза.
5. Не использовать ссылки на поиск, общую страницу артиста или случайную перезаливку.

```bash
python3 automation/site/release_manager.py \
  --title "Название релиза" \
  --meta "single" \
  --yandex-url "https://music.yandex.ru/..." \
  --vk-url "https://vk.ru/..." \
  --cover "/путь/к/официальной-обложке.jpg"
```

## Проверка и публикация
```bash
python3 automation/site/validate.py
bash automation/site/publish.sh "content: add poster and release"
```

Git хранит историю: любую публикацию можно откатить.
