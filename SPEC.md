# SPEC — «Календарь садовода» / posadu.ru

Единый продуктовый техдокумент проекта. Глубокая инженерная сводка (пайплайны,
хостинг, инциденты, runbook) — в [PROJECT.md](PROJECT.md). Правила работы
агента — в [CLAUDE.md](CLAUDE.md).

## 1. Цель и ценность

Справочник сезонных садово-огородных работ по регионам РФ, который отвечает на
вопрос «что делать в саду прямо сейчас» — на сайте и через ежемесячное
напоминание в Telegram. Пользователь не пропускает сроки (обработка, обрезка,
укрытие, посев) из-за того, что забыл о них.

## 2. Целевая аудитория

Дачники и садоводы РФ, преимущественно 40+. Регионы: Средняя полоса (базовый,
наиболее проработанный), Юг, Урал и Сибирь, Северо-Запад.

## 3. Состав продукта

| Часть | Где | Что делает |
|---|---|---|
| Календарь (главная) | `docs/index.html` + `docs/js/` + `docs/css/` | Фильтр по региону/месяцу/типу работ/способу выращивания; карточки-«записи дневника» по декадам |
| Статьи об агротехнике | `docs/articles/` (из `docs/articles-src/*.md`) | Разборы тем (компост, мульчирование, обрезка…) со ссылками на источники |
| SEO-страницы регионов | `docs/kalendar/<регион>.html` | Статические снимки для поисковых роботов без JS |
| Telegram-бот | `worker/` (Cloudflare Worker `garden-notify`) | Подписка по региону, рассылка месячного дайджеста 1-го числа |
| Промо-лендинг бота | `docs/bot/` | Конверсионная страница подписки на бота (Hero → Польза → Доверие → CTA) |

## 4. Технический стек

- **Календарь:** vanilla JS + Alpine.js (CDN) для интерактива; данные —
  `docs/data/bundle.<hash>.js` (`window.GARDEN_DATA`).
- **Статген:** Node-скрипты в `docs/build/` (`build-from-xlsx.js`,
  `build-articles.js`, `build-region-pages.js`, `build-sitemap.js`,
  `version-assets.js`). Зависимости: `marked`, `gray-matter`, `xlsx` (с CDN
  SheetJS), `@resvg/resvg-js`.
- **Бот:** Cloudflare Worker (JS), хранилище подписчиков — Cloudflare KV
  `SUBSCRIBERS`. Данные читает прямо с прод-сайта (`calendar.json`,
  `worktypes.json`).
- **CI:** GitHub Actions — `monthly-notify.yml` (рассылка + бэкап
  подписчиков), `refresh-calendar-snapshot.yml` (пересбор SEO-снимка),
  `deploy-smoke-check.yml` (контроль выката).

## 5. Источник данных

**`garden-data.xlsx`** — единственный источник истины для календаря. Листы:
`Calendar`, `Plants`, `Worktypes`, `Regions`, `Notes` (столбцы — в
[.claude/skills/garden-calendar-edit/sheets.md](.claude/skills/garden-calendar-edit/sheets.md)).
Пайплайн: правка xlsx → `node docs/build/build-from-xlsx.js` → `docs/data/*.json`
+ `bundle.<hash>.js`. JSON и bundle руками не редактируются.

## 6. Дизайн-система

Концепт **«Дневник садовода»** (storybook-акварель): лист бумаги с нарисованной
рамкой, рукописные акценты, приглушённая сезонная палитра.

- Шрифты (самохостинг, `docs/fonts/`): Caveat, Cormorant Garamond, Lora.
- Токены и сезонные палитры — `docs/css/style.css` (`--bg/--text/--primary/…`,
  `[data-season]`).
- Тёмная тема — `data-theme` на `<html>` из `localStorage['garden.theme']` /
  `prefers-color-scheme`, тумблер ☾/☀ в шапке, инлайн-скрипт в `<head>` без
  вспышки.
- Гусь-смотритель — маскот: 12 сезонных иллюстраций (`docs/img/goose/`) +
  сезонные мини-истории; на лендинге — `docs/img/bot-hero.jpg`.

## 7. Нефункциональные требования

- **SEO:** SSR-снимок рекомендаций текущего месяца вшит в `docs/index.html` и
  `docs/kalendar/*.html`; `sitemap.xml`; JSON-LD (`WebSite`, `Article`,
  `BreadcrumbList`). Хэширование `style/app/bundle` по содержимому от
  LF-нормализованного текста (одинаково на Windows и Linux-CI).
- **Достоверность:** перед любой агрономической правкой (данные или статья) —
  веб-поиск подтверждения; источник — в столбце `source` листа `Calendar` или
  в `sources` front-matter статьи.
- **Приватность:** репозиторий `jolanzuqin-web/garden` приватный; в артефактах
  GitHub Actions лежат ПДн подписчиков — допустимо только пока репо приватный.
  Секреты воркера — только через `wrangler secret put`.
- **Деплой:** сайт — push в `master` → автосборка Timeweb Cloud Apps (директория
  `docs`); бот — вручную `wrangler deploy`. Домен `posadu.ru` (reg.ru),
  Cloudflare в режиме DNS-only.

## 8. Рабочие процедуры (скиллы)

| Скилл | Когда |
|---|---|
| [garden-article](.claude/skills/garden-article/SKILL.md) | Новая/обновлённая статья об агротехнике |
| [garden-calendar-edit](.claude/skills/garden-calendar-edit/SKILL.md) | Правка данных календаря в `garden-data.xlsx` |
| [garden-release](.claude/skills/garden-release/SKILL.md) | «Коммить и публикуй» — commit + push в ветку деплоя |
