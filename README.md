# Reveal AI Chat

A conversational analytics app built on the **Reveal AI SDK**: ask a question in plain
language and get back a governed dashboard — rendered inline, with an explanation. One
ASP.NET host serves both the React client and the Reveal + Reveal AI APIs; the data lives
in a PostgreSQL database that runs in Docker.

Five verticals ship out of the box — **Retail, Automotive, Manufacturing, Healthcare,
Energy** — each backed by its own table.

> You'll need an **OpenAI API key** (the SDK calls *your* model with *your* key — the model
> never sees raw rows or SQL) and a **Reveal SDK license**. Both are supplied at runtime;
> neither is baked into the image. **Docker** hosts the database.

---

## Two ways to run it

| | For | Needs |
| --- | --- | --- |
| **[Run with Docker](#run-with-docker)** | trying it · demos | Docker + your keys |
| **[Run from source](#run-from-source)** | reading · debugging · adapting | .NET 8 SDK + Node 18+ + Docker + your keys |

---

## Run with Docker

The fastest way to see it — no .NET SDK, Node, or source on your machine. From the
repo root:

```bash
cp .env.example .env        # then put your OpenAI key + Reveal license in it
docker compose -f docker-compose.app.yml up        # add --build to build from source
```

Open <http://localhost:5111>. The image is key-free; `.env` supplies `OPENAI_API_KEY` and
`REVEAL_LICENSE` at runtime. The first run seeds the database (and, with `--build`, compiles
the client + server), so it takes a minute; after that it's quick.

**From published images** (only `docker-compose.app.yml` + `.env` needed — no source):

```bash
docker compose -f docker-compose.app.yml pull
docker compose -f docker-compose.app.yml up
```

**Stop / reset:**

```bash
docker compose -f docker-compose.app.yml down       # stop, keep data
docker compose -f docker-compose.app.yml down -v    # stop + wipe data
```

<details><summary><b>Maintainers — publish the images</b></summary>

Build directly (no keys needed at build time) and push:

```bash
docker build -t revealbi/reveal-ai-chat-sample:latest .
docker build -t revealbi/reveal-ai-chat-sample-db:latest db
docker push revealbi/reveal-ai-chat-sample:latest
docker push revealbi/reveal-ai-chat-sample-db:latest
```

Build multi-arch (amd64 + arm64) with `docker buildx` so Apple-Silicon users can run it.
</details>

---

## Run from source

For reading the code, F5-debugging, and adapting it. The app runs on your machine; only the
database runs in Docker — and the app brings it up for you.

### Prerequisites

[.NET 8 SDK](https://dotnet.microsoft.com/download) ·
[Node 18+](https://nodejs.org) ·
[Docker Desktop](https://www.docker.com/products/docker-desktop/) (running) ·
an OpenAI key + a Reveal license.

### 1. Configure your keys

```bash
dotnet user-secrets --project server/aspnet/RevealAIChat.Server \
  set "RevealAI:OpenAI:ApiKey" "sk-your-key"
```

If your machine isn't already Reveal-licensed (most dev boxes with the Reveal tooling are),
also set the license:

```bash
dotnet user-secrets --project server/aspnet/RevealAIChat.Server \
  set "Reveal:License" "your-reveal-sdk-license-key"
```

Optional: `RevealAI:OpenAI:Model` (default `gpt-4.1`); `RevealAI:OpenAI:Endpoint` for a
local model (e.g. `http://localhost:11434/v1`).

### 2. Run it

All three do the same thing — build the client, bring up Postgres (creating + seeding it the
first time), and serve at **http://localhost:5111**:

- **Visual Studio** — open `server/aspnet/RevealAIChat.Server.sln` and press **F5**.
- **VS Code** — open this folder and press **F5** (*Run Reveal AI Chat (ASP.NET)*).
- **CLI** — `dotnet run --project server/aspnet/RevealAIChat.Server`.

> First run pulls Postgres, seeds ~22k rows, and runs `npm install` — give it a minute. For
> live client work with hot reload, run `npm run dev` in `client` instead.

---

## How it works

```
React client (Vite/Tailwind)  ──built into──▶  ASP.NET host  ──▶  Postgres (Docker)
  client                              server/aspnet     docker-compose.yml
     chat UI, 5 verticals             Reveal SDK + Reveal AI (Chat & Insights)   5 seeded tables
```

- **Client build is automatic.** The server project builds `client` into its
  `wwwroot` whenever a client file changed, so running the server always serves the current
  UI. (In the Docker image this happens at image-build time.)
- **Database is automatic.** From source, the server runs `docker compose up -d --wait` on
  startup (see `DevDatabase`), so Postgres is up + seeded before it serves. In the Docker
  image, Postgres is the `db` service and the app waits for it to be healthy.
- **Keys come from config.** The OpenAI key and Reveal license are read from configuration
  (user-secrets for source, env vars for Docker) — never committed, never in the image.
- **AI is governed.** `DataSourceProvider` / `AuthenticationProvider` point Reveal at
  Postgres; `Reveal/Metadata/catalog.json` lists the five tables the AI may use. The model
  only ever sees governed query results — never raw rows or SQL.

## The data

Seed scripts in `db/seed/*.sql` are generated from curated Excel in `db/source/*.xlsx` by
`db/gen-seed.mjs`. To change the data:

```bash
cd db
npm install && npm run gen                           # source/*.xlsx -> seed/*.sql
docker compose -f ../docker-compose.yml down -v      # wipe the dev volume
docker compose -f ../docker-compose.yml up -d        # reseed on next boot
```

(After changing the seed, rebuild the Docker images so `docker-compose.app.yml` picks it up.)
