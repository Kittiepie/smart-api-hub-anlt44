# Smart API Hub

A dynamic REST API platform that auto-generates CRUD endpoints from a `schema.json` file — define your tables once, and get full REST routes, filtering, pagination, relationships, and auth for free.

## Tech Stack

- Node.js 20, TypeScript, Express 5
- PostgreSQL 16, Knex.js
- Zod, JWT, bcryptjs
- Vitest + Supertest
- Docker / Docker Compose

## Architecture

You can visit this site to view the architecture
https://mermaid.ai/d/6dd967c0-6291-4c6b-8b07-748c91866dc1

## Getting Started

1. Clone the repo:
   `
   git clone <your-repo-url>
   cd smart-api-hub-anlt44
   `

2. Copy the example environment file and fill in a real JWT secret:
   `
   cp .env.example .env
   `
   Generate a secret:
   `
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   `

3. Define your tables in `schema.json` (sample-row format — see the existing file for reference). Types are inferred automatically from each sample value.

4. Start everything:
   `
   docker compose up --build
   `
   This builds the app image, starts PostgreSQL, waits for it to be healthy, then runs migrations automatically and starts the API on `http://localhost:3000`.

5. (Optional - if needed) Seed sample data:
   `
   docker compose exec app npm run seed
   `

## API Docs

- Swagger UI: `http://localhost:3000/docs`
- Postman collection: `postman/smart-api-hub.postman_collection.json` (import into Postman)

## Authentication

| Action | Requirement |
|---|---|
| GET (read) | Public, no token needed |
| POST / PUT / PATCH (write) | Requires `Authorization: Bearer <token>` |
| DELETE | Requires token **and** `role: admin` |

`
To get admin role for an user:
docker compose exec postgres psql -U appuser -d mydb -c "UPDATE users SET role='admin' WHERE email='test@x.com';"
`

`
# Register
curl -X POST http://localhost:3000/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"a@test.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"a@test.com","password":"secret123"}'
`

## Dynamic Query Reference

| Param | Example | Purpose |
|---|---|---|
| `_fields` | `?_fields=title,content` | Select specific columns |
| `_page` / `_limit` | `?_page=1&_limit=10` | Pagination (see `X-Total-Count` response header) |
| `_sort` / `_order` | `?_sort=created_at&_order=desc` | Sorting |
| `{col}_gte` / `_lte` / `_ne` / `_like` | `?user_id_gte=2` | Filtering |
| `q` | `?q=docker` | Full-text search across text columns |
| `_expand` | `?_expand=user` | Attach parent row via `{field}_id` FK convention |
| `_embed` | `?_embed=posts` | Attach child rows referencing this row |

## Running Tests

`
docker compose exec app npm test
`


## Project Structure

`
src/
  app.ts             # Express app definition (no listen — testable)
  index.ts           # Entry point: runs migrations, starts server
  migrate.ts         # Reads schema.json, creates tables, detects drift
  db.ts               # Knex/Postgres connection
  env.ts              # Validated environment variables
  openapi.ts          # Swagger/OpenAPI spec
  routes/
    auth.ts           # /auth/register, /auth/login
    resource.ts        # Generic dynamic CRUD
  middleware/
    auth.ts             # authenticate, requireRole
    autoCreateResource     # create schema if post on non-exist resource
    errorHandler.ts
    validate.ts
    validateResource.ts
    validateResourceBody.ts
  utils/
    AppError.ts           # global error class
    columnInfo.ts
    dynamicSchema.ts
    jwt.ts
    parseFields.ts
    password.ts
    queryHelpers.ts
    relations.ts
    schemaInference.ts
    tableWhitelist.ts
tests/
  auth.test.ts
  resource.test.ts
`