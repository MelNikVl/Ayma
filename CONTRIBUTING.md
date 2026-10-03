# Как участвовать в разработке AYMA

Спасибо, что хотите помочь! AYMA — открытый проект (MIT), любые улучшения приветствуются: от опечатки до новой фичи.

## С чего начать

1. Посмотрите [issues](https://github.com/MelNikVl/Ayma/issues) с метками `good first issue` и `help wanted`.
2. Напишите в issue, что берёте задачу, — так двое не будут делать одно и то же.
3. Для крупных изменений (новая сущность в БД, смена архитектуры) сначала откройте issue с описанием идеи.

## Локальный запуск

```bash
git clone https://github.com/<ваш-логин>/Ayma.git && cd Ayma
cp .env.example .env            # SESSION_SECRET, ENABLE_DEV_LOGIN="true", SEED_DEMO="true"
docker compose up -d db
npm install
npx prisma migrate deploy && npm run db:seed
npm run dev                     # http://localhost:3000, вход — «тестовый вход» на /login
```

Реальные проекты для каталога: `npm run db:import`.

## Процесс

1. Сделайте форк и ветку от `main`: `feat/…`, `fix/…`, `docs/…`.
2. Коммиты — коротко и по делу, лучше в стиле [Conventional Commits](https://www.conventionalcommits.org/ru/): `feat: загрузка обложки проекта`.
3. Перед PR: `npm run lint && npm run typecheck && npm run build`.
4. Изменили схему БД — добавьте миграцию (`npx prisma migrate dev --name …`) и закоммитьте её.
5. Откройте PR в `main`, заполните шаблон. CI должен быть зелёным, нужен один апрув мейнтейнера.

## Правила кода

- TypeScript strict, без `any`.
- Серверная логика — в `src/app/actions` (Server Actions) и `src/lib`; проверка прав — через `src/lib/access.ts`.
- Пользовательский ввод валидируется zod-схемами (`src/lib/validation.ts`).
- Тексты интерфейса — только через словари `src/i18n/dictionaries` (kk, ru, en). Добавили ключ в `ru.ts` — добавьте перевод в `kk.ts` и `en.ts`, иначе сборка упадёт.
- Секреты не коммитим. Нашли уязвимость — напишите мейнтейнеру лично, а не в публичный issue.

## Структура

```
prisma/            схема, миграции, сид, импорт каталога
src/app/           страницы (App Router), API-роуты, server actions
src/components/    UI-компоненты
src/lib/           БД, сессии, GitHub, Telegram, права, загрузки
```
