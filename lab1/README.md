# Quotes Scraper

Скрапер цитат с сайта [quotes.toscrape.com/scroll](https://quotes.toscrape.com/scroll).
Открывает страницу в Chromium через Playwright, прокручивает её до конца и сохраняет
все цитаты (текст, автор, теги) в `out/result.json`.

Браузер нужен потому, что цитаты подгружаются JavaScript'ом при прокрутке:
в исходном HTML страницы их нет, обычный HTTP-запрос вернёт пустой список.

Проект упакован в Docker-образ, собирается и запускается через `make`.

## Структура

```
.
├─ src/index.js               # код скрапера
├─ package.json               # зависимости (playwright) и скрипт npm start
├─ package-lock.json          # точные версии зависимостей
├─ Dockerfile                 # multistage-сборка образа
├─ .dockerignore              # что не отправлять в контекст сборки
├─ Makefile                   # команды build / run / clean / ci
├─ .github/workflows/ci.yml   # CI в GitHub Actions
└─ out/                       # результат (создаётся при запуске, в git не попадает)
```

## Локальная разработка

Требования: Node.js 22 (как в образе), npm.

```bash
npm ci                            # поставить зависимости строго по package-lock.json
npx playwright install chromium   # скачать браузер для Playwright
npm start                         # запустить скрапер
```

Результат появится в `out/result.json`:

```json
[
  {
    "text": "“The world as we have created it is a process of our thinking...”",
    "author": "Albert Einstein",
    "tags": ["change", "deep-thoughts", "thinking", "world"]
  }
]
```

## Продакшн-образ

Требования: Docker (с BuildKit) и make. Все действия выполняются только через `make`.

| Команда      | Что делает |
|--------------|------------|
| `make build` | Собирает образ `quotes-scraper` |
| `make run`   | Собирает образ (если нужно) и запускает скрапер в контейнере; папка `out/` подключается в контейнер через bind mount, результат появляется в `out/result.json` |
| `make clean` | Удаляет образ и папку `out/` |
| `make ci`    | `make run` + проверка, что `out/result.json` — валидный непустой JSON. Эту команду вызывает CI |

### Как устроен Dockerfile

Образ собирается от `node:22-bookworm` в несколько стадий:

| Стадия    | Что делает | Когда пересобирается |
|-----------|------------|----------------------|
| `base`    | Node 22 на Debian, рабочая папка `/app`, путь к браузеру `/ms-playwright` | Почти никогда |
| `browser` | Системные библиотеки для Chromium и сам Chromium нужной версии Playwright | Только при смене версии Playwright |
| `deps`    | `npm ci` по `package.json` и `package-lock.json` (npm-кеш вынесен в cache mount) | Только при изменении зависимостей |
| `runtime` | Финальный образ: стадия `browser` + `node_modules` из `deps` + код из `src/` | При любой правке кода, но пересобирается только последний слой `COPY src` |

Код копируется последним шагом, поэтому правка кода не пересобирает ни браузер, ни зависимости.
Кеш сборки хранится отдельно от образа, поэтому после `make clean` повторный `make build`
не скачивает браузер заново.
