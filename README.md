# mainline - серверная часть

Социальная сеть для инженеров. В ленте четыре вида записей - обычная запись, вакансия,
событие и задача. Есть профили с работами, компании с отделами и командами, проекты
с доской задач, отклики и приглашения, уведомления и чаты.

Здесь API и работа с базой. Клиентская часть в `mainline-front`.

## Стек

| Что             | Чем                                                                                 |
| --------------- | ----------------------------------------------------------------------------------- |
| Язык            | TypeScript 6                                                                        |
| Каркас          | NestJS 11 на Express                                                                |
| База            | PostgreSQL 18, TypeORM 1                                                            |
| Проверка данных | zod 4 через `nestjs-zod`, одна схема проверяет запрос и попадает в описание OpenAPI |
| Вход и сессии   | JWT в cookie с флагом httpOnly, пароли через argon2id                               |
| Сообщения       | Socket.IO                                                                           |
| Журнал          | pino                                                                                |
| Пакеты          | pnpm, Node 24                                                                       |

## Запуск

Для запуска требуется Node 24, pnpm и PostgreSQL 18.

```bash
psql -U postgres -c "CREATE ROLE mainline LOGIN PASSWORD 'mainline';"
psql -U postgres -c "CREATE DATABASE mainline_app OWNER mainline;"

cp .env.example .env    # секреты не короче 32 знаков
pnpm install
pnpm migration:run
pnpm seed               # примеры данных, пароль у всех Password1
pnpm start:dev
```

Сервер отвечает на `http://localhost:3000/api`. Проверка состояния - `/api/health`,
описание методов - `/api/docs` и `/api/openapi.json`.

## Каталоги

```
src/
  auth/            вход, регистрация, обновление сессии
  users/           профили
  posts/           записи, лайки, задачи, комментарии
  portfolio/       работы в профиле
  companies/       компании, отделы, команды
  invites/         приглашения в компанию, отдел и команду
  projects/        проекты и колонки доски
  chats/           чаты и сообщения
  interactions/    отклики и приглашения на вакансии и события
  notifications/   уведомления
  common/          ошибки, проверка полей, постраничная выборка
  infra/           подключение к базе и Socket.IO
  migrations/      миграции
  scripts/         заполнение базы примерами
```

## Команды

| Команда                                                         | Что делает                  |
| --------------------------------------------------------------- | --------------------------- |
| `pnpm start:dev`                                                | запуск в watch режиме       |
| `pnpm build`                                                    | сборка в `dist/`            |
| `pnpm start:prod`                                               | запуск собранного           |
| `pnpm typecheck`                                                | проверка типов              |
| `pnpm lint`, `pnpm lint:fix`                                    | линтер, фикс                |
| `pnpm format`                                                   | форматирование              |
| `pnpm migration:run`                                            | применить миграции          |
| `pnpm migration:generate`, `migration:revert`, `migration:show` | создать, откатить, показать |
| `pnpm seed`                                                     | заполнить базу примерами    |
