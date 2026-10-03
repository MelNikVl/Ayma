# AYMA — маркетплейс ИИ-стартапов

[![CI/CD](https://github.com/MelNikVl/Ayma/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/MelNikVl/Ayma/actions/workflows/ci-cd.yml)

Open Source маркетплейс ИИ-стартапов из Казахстана и СНГ с функцией **предзаказа услуг**.

Фаундер выставляет проект (GitHub, демо, описание) и открывает предзаказ — например, «Годовая подписка за 5 000 ₸» или «Кастомная доработка за 50 000 ₸». Спонсор нажимает «Стать спонсором» и оформляет предзаказ. Юридически это **купля-продажа будущей услуги, а не инвестиции**: спонсор не получает долю.

## Возможности

- Каталог с поиском, фильтром по тегам, сортировкой (популярные / новые / по звёздам) и пагинацией
- Карточки в стиле маркетплейса: логотип, теги, GitHub-бейдж «⭐ 1.2k · обновлено 2 дня назад», цена, кнопка спонсорства
- Страница стартапа: Markdown-описание, live-данные GitHub (звёзды, форки, язык, последние коммиты), sticky-блок предзаказа с прогресс-баром, список спонсоров, нижняя панель на мобильных
- Вход через **Telegram Login Widget** (с проверкой HMAC-подписи), сессия — подписанный JWT в httpOnly-cookie
- Оформление предзаказа → уведомление фаундеру в Telegram → оплата по ссылке фаундера (Kaspi Pay, Stripe Link…) → фаундер подтверждает оплату в кабинете → спонсор появляется на странице
- Личный кабинет: мои стартапы, входящие предзаказы (оплачен / отменить), мои предзаказы
- Модерация для администраторов (одобрить / отклонить, уведомления в Telegram)
- Светлая тема по умолчанию + тёмная через CSS-переменные; mobile-first вёрстка
- Docker Compose: Postgres + миграции + сид + приложение одной командой; CI на GitHub Actions

## Стек

Next.js 14 (App Router, Server Actions) · TypeScript strict · Prisma 5 + PostgreSQL 15 · Tailwind CSS · zod · jose · Docker

## Быстрый старт (Docker)

```bash
cp .env.example .env
# минимум: задайте SESSION_SECRET (openssl rand -base64 48)
docker compose up -d --build
```

Откройте http://localhost:3000. Сервис `migrate` применит миграции и зальёт теги + демо-стартапы (отключить: `SEED_DEMO=false`).

## Локальная разработка

```bash
npm install
cp .env.example .env            # пропишите DATABASE_URL и SESSION_SECRET
docker compose up -d db         # или свой Postgres
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Telegram-виджет не работает на `localhost`, поэтому для разработки включите `ENABLE_DEV_LOGIN="true"` — на странице `/login` появится вход без Telegram (в т.ч. с ролью администратора). В продакшене (`NODE_ENV=production`) dev-вход отключён принудительно.

## Настройка Telegram

1. Создайте бота у [@BotFather](https://t.me/BotFather) → получите токен.
2. `/setdomain` → укажите домен сайта (например, `aimarket.kz`). Для тестов подойдёт туннель (ngrok, cloudflared).
3. В `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (без `@`), `APP_URL`.
4. Свой Telegram ID (узнать у [@userinfobot](https://t.me/userinfobot)) добавьте в `ADMIN_TELEGRAM_IDS` — при входе получите роль ADMIN.

Виджет запрашивает право писать пользователю (`request-access=write`), поэтому бот может присылать уведомления о предзаказах и модерации.

## Переменные окружения

| Переменная | Обязательна | Описание |
|---|---|---|
| `DATABASE_URL` | да | Строка подключения PostgreSQL |
| `SESSION_SECRET` | да | Секрет подписи сессий, ≥ 32 символов |
| `APP_URL` | да | Публичный URL без `/` в конце |
| `TELEGRAM_BOT_TOKEN` | для входа | Токен бота |
| `TELEGRAM_BOT_USERNAME` | для входа | Username бота без `@` |
| `ADMIN_TELEGRAM_IDS` | нет | ID администраторов через запятую |
| `GITHUB_TOKEN` | нет | Повышает лимит GitHub API с 60 до 5000 запросов/час |
| `AUTO_APPROVE` | нет | `true` — публикация без модерации |
| `ENABLE_DEV_LOGIN` | нет | `true` — вход без Telegram (только dev) |
| `CRON_SECRET` | нет | Защищает `/api/cron/github` |
| `SEED_DEMO` | нет | `false` — сид только с тегами |

## CI/CD

`.github/workflows/ci-cd.yml`:

1. **check** (каждый push и PR) — `lint`, `typecheck`, миграции и сид на Postgres, `next build`.
2. **image** (push в `main`) — Docker-образ → `ghcr.io/melnikvl/ayma:latest` и `:<sha>`.
3. **deploy** (если задана переменная репозитория `DEPLOY_HOST`) — по SSH: `git pull` + `docker compose ... pull && up -d`.

Для деплоя на свой VPS: Settings → Secrets and variables → Actions → Variables `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`; Secret `DEPLOY_SSH_KEY`. На сервере: клон репо, `.env`, `docker login ghcr.io` (если пакет приватный).

## Обновление данных GitHub

Звёзды и дата последнего коммита сохраняются в БД при создании/редактировании и по кнопке «Обновить GitHub» в кабинете. Для регулярного обновления повесьте cron:

```bash
# каждые 6 часов
0 */6 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/github
```

## Как устроены деньги

Платформа **не принимает платежи** и не является стороной сделки — это снимает необходимость лицензии платёжной организации. Фаундер указывает свою ссылку на оплату; спонсор платит напрямую; фаундер подтверждает оплату в кабинете. Шаблон условий — на странице `/terms`, адаптируйте его с юристом.

Хотите встроенный эквайринг? Добавьте провайдера в `src/app/actions/preorder.ts` (создание счёта) и webhook-роут, который переводит `PreOrder.status` в `PAID`.

## Структура

```
prisma/
  schema.prisma          схема БД
  migrations/            SQL-миграции
  seed.ts                теги + демо-данные
src/
  app/
    page.tsx             каталог
    startup/new          создание стартапа
    startup/[slug]       страница стартапа (+ /edit, /sponsor)
    dashboard            личный кабинет
    admin                модерация
    login, terms
    actions/             server actions (стартапы, предзаказы, модерация)
    api/auth/*           Telegram-callback, logout, dev-вход
    api/cron/github      обновление звёзд
    api/health           healthcheck
  components/            UI-компоненты
  lib/                   prisma, сессии, Telegram, GitHub, валидация, форматирование
```

## Отличия от исходной схемы

В модель `Startup` добавлено поле `paymentUrl` (ссылка фаундера на оплату) — она копируется в `PreOrder.paymentLink` при оформлении. Добавлены индексы на `PreOrder` и каскадное удаление предзаказов вместе со стартапом.

## Roadmap

- [ ] Загрузка логотипов в S3-совместимое хранилище (сейчас — URL)
- [ ] Встроенная оплата (Kaspi Pay / CloudPayments / Stripe) с webhook
- [ ] Несколько тарифов предзаказа у одного стартапа
- [ ] Комментарии и апдейты фаундера
- [ ] i18n: казахский / английский

## Участие

PR приветствуются. Перед отправкой: `npm run lint && npm run typecheck && npm run build`.

## Лицензия

MIT
