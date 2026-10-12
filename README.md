# ticketdesk

A help desk ticketing app: a React + TypeScript front end over an Express + TypeScript REST API backed by SQLite.
Built to model the workflow I used daily during two years of campus IT support: tickets come in with a priority,
get assigned and worked, collect comments, and move through a fixed status lifecycle.

## Features

- Create, search, filter, and paginate tickets by status, priority, assignee, and free text
- Enforced status workflow (`open → in_progress → resolved → closed`, with reopen) that returns `409` on illegal moves
- Threaded comments per ticket, with cascade delete
- Live stats by status and priority
- Input validation with field-level error messages (Zod), surfaced inline in the form
- 16 automated tests (API integration tests with supertest against an in-memory database, plus client unit tests)
- Zero native dependencies: storage uses Node's built-in `node:sqlite` module

## Stack

| Layer    | Choice                                   |
| -------- | ---------------------------------------- |
| Client   | React 19, TypeScript, Vite               |
| API      | Node 22+, Express 5, TypeScript, Zod     |
| Database | SQLite via `node:sqlite` (WAL mode)      |
| Tests    | Vitest, supertest                        |
| CI       | GitHub Actions (lint, test, build)       |

## Run it

Requires Node 22.13 or newer.

```bash
npm install
npm run dev          # API on :3001, client on :5173 (proxies /api)
```

Seed a few sample tickets for local development:

```bash
npm run seed -w server
```

Other commands:

```bash
npm test             # all tests
npm run lint         # typecheck server, lint client
npm run build        # compile server to server/dist, bundle client to client/dist
```

## API

| Method | Path                         | Notes                                              |
| ------ | ---------------------------- | -------------------------------------------------- |
| GET    | `/api/tickets`               | `?status=&priority=&assignee=&q=&limit=&offset=`   |
| POST   | `/api/tickets`               | `title`, `requester` required                      |
| GET    | `/api/tickets/stats`         | counts by status and priority                      |
| GET    | `/api/tickets/:id`           |                                                    |
| PATCH  | `/api/tickets/:id`           | partial update; `status` must be a legal transition|
| DELETE | `/api/tickets/:id`           | removes comments too                               |
| GET    | `/api/tickets/:id/comments`  |                                                    |
| POST   | `/api/tickets/:id/comments`  | `author`, `body`                                   |

Errors are JSON: `400` validation (`details` keyed by field), `404` not found, `409` illegal status transition.

## Design notes

- `createApp(db)` is a factory, so every test gets its own in-memory database and the suite runs in well under a second.
- The repository layer (`server/src/tickets.ts`) owns all SQL; routes only parse, call, and respond.
- The client mirrors the transition table so it only offers legal status moves, but the API is the source of truth.
- Search is debounced on the client so typing does not flood the API.

## Project layout

```
server/src/   app.ts (routes) · tickets.ts (repository) · schemas.ts (validation) · db.ts (schema) · seed.ts
server/test/  tickets.test.ts
client/src/   App.tsx · api.ts · types.ts · components/{StatsBar,TicketList,TicketForm,TicketDetail}.tsx
```
