# Reveal AI Chat

A sample app that turns plain-English questions into Reveal dashboards — React client, ASP.NET
host, and a PostgreSQL database in Docker, with five ready-made datasets (Retail, Automotive,
Manufacturing, Healthcare, Energy).

To run it you need an **OpenAI API key** and a **Reveal SDK license** — the app collects both
in a first-run dialog, so there's nothing to put in a file.

| | For | Needs |
| --- | --- | --- |
| **[Run it (Docker)](#run-it-docker)** | trying it · demos | Docker Desktop |
| **[Run from source](#run-from-source)** | editing · debugging | .NET 8 SDK + Node 18+ + Docker |

---

## Run it (Docker)

Docker is the only prerequisite. From the repo root:

```bash
docker compose -f docker-compose.app.yml up --build
```

The first run builds the image and seeds the database (a few minutes); after that it starts in
seconds. Then:

1. Open **<http://localhost:5111>**.
2. Paste your **Reveal SDK license** → **Save & start**. The app restarts itself once (a few
   seconds) and comes back.
3. Paste your **OpenAI API key** → **Save** — applies immediately, no restart.
4. Ask a question, e.g. *"Show total profit by region."*

Keys are saved encrypted in a Docker volume, so you only enter them once. Change dataset
(top-left) or model/key (the **gear** icon) anytime.

```bash
docker compose -f docker-compose.app.yml down       # stop — keeps keys + data
docker compose -f docker-compose.app.yml down -v    # stop + wipe everything
```

(Once the images are published you can skip the build: `docker compose -f docker-compose.app.yml pull`, then `up`.)

<details><summary><b>Provide keys up front instead (CI / unattended)</b></summary>

Uncomment the `RevealAI__*` / `Reveal__*` lines under `app:` in `docker-compose.app.yml`, then:

```bash
cp .env.example .env        # add your OpenAI key + Reveal license (.env is gitignored)
docker compose -f docker-compose.app.yml up --build
```
</details>

<details><summary><b>Maintainers — publish the images</b></summary>

```bash
docker build -t revealbi/reveal-ai-chat-sample:latest .
docker build -t revealbi/reveal-ai-chat-sample-db:latest db
docker push revealbi/reveal-ai-chat-sample:latest
docker push revealbi/reveal-ai-chat-sample-db:latest
```

Use `docker buildx` for multi-arch (amd64 + arm64) so Apple-Silicon users can run it.
</details>

---

## Run from source

The app runs on your machine; only Postgres runs in Docker, and the app starts it for you.

**Prerequisites:** [.NET 8 SDK](https://dotnet.microsoft.com/download) ·
[Node 18+](https://nodejs.org) ·
[Docker Desktop](https://www.docker.com/products/docker-desktop/) (running).

**Run it** — all three build the client, bring up + seed Postgres, and serve at
**<http://localhost:5111>**:

- **Visual Studio** — open `server/aspnet/RevealAIChat.Server.sln` and press **F5**.
- **VS Code** — open this folder and press **F5** (*Run Reveal AI Chat (ASP.NET)*).
- **CLI** — `dotnet run --project server/aspnet/RevealAIChat.Server`.

First run also seeds ~22k rows and runs `npm install`, so give it a minute. Keys come from the
same first-run dialog (saved under `.reveal-ai-chat-config/`, gitignored) — or set them with
user-secrets instead:

```bash
dotnet user-secrets --project server/aspnet/RevealAIChat.Server set "RevealAI:OpenAI:ApiKey" "sk-your-key"
dotnet user-secrets --project server/aspnet/RevealAIChat.Server set "Reveal:License" "your-license"   # if not already licensed
```

> Most dev boxes with the Reveal tooling are already licensed (`~/.revealbi-sdk/license.key`),
> so you'll usually only be asked for the OpenAI key.

---

## Debugging

- **Breakpoints** — F5 attaches the debugger to the ASP.NET host. Good places to start:
  - `Program.cs` — startup, key/license resolution, and Reveal + Reveal AI registration.
  - `Reveal/DataSourceProvider.cs` + `Reveal/AuthenticationProvider.cs` — where Reveal connects to Postgres.
  - `Setup/` — the controllers behind the first-run key dialogs.
- **API explorer** — Swagger UI is at **<http://localhost:5111/swagger>** (Development).
- **Client with hot reload** — `cd client && npm run dev` runs Vite on **:5173** against the API
  on :5111. Otherwise the server rebuilds the client into `wwwroot` whenever a client file changes.
- **Database** — connect any SQL client to `localhost:5432` (db `revealaichat`, user `reveal`,
  password `reveal_ai_chat`). Wipe + reseed with `docker compose -f docker-compose.yml down -v`.
- **AI metadata** — the tables the AI may use are listed in `Reveal/Metadata/catalog.json`. The
  SDK caches generated metadata per datasource under `%LOCALAPPDATA%/reveal/ai/metadata`; delete
  that folder to force a clean regenerate. Regenerate at runtime with
  `POST /api/reveal/ai/metadata/generate { "forceRegeneration": true }`.

---

## How it's wired

```
client/ (React + Vite)  ──build──▶  server/aspnet/RevealAIChat.Server  ──▶  Postgres (db/, Docker)
                                     serves wwwroot + the Reveal / Reveal AI APIs
```

- **One host, same origin.** The server build compiles `client/` into its `wwwroot`, so a single
  run serves both the UI and the APIs — no second port, no CORS. (In the Docker image this
  happens at image-build time.)
- **The database is automatic.** From source the server runs `docker compose up -d --wait` on
  startup (`Reveal/DevDatabase.cs`) and seeds it the first time; in the image, Postgres is the
  `db` service and the app waits for it to be healthy.
- **Keys are never committed.** They come from the encrypted first-run store, user-secrets, or
  env vars — never from source or the image.

## Changing the data

Seed scripts in `db/seed/*.sql` are generated from the Excel files in `db/source/*.xlsx`:

```bash
cd db
npm install && npm run gen                           # source/*.xlsx -> seed/*.sql
docker compose -f ../docker-compose.yml down -v      # wipe the dev volume
docker compose -f ../docker-compose.yml up -d        # reseed on next boot
```

(After changing the seed, rebuild the Docker images so `docker-compose.app.yml` picks it up.)
