# Reveal AI Chat

A sample app that turns plain-English questions into Reveal dashboards — React client, ASP.NET
host, and a PostgreSQL database in Docker, with five ready-made datasets (Retail, Automotive,
Manufacturing, Healthcare, Energy).

To run it you need an **AI provider key** (OpenAI, Anthropic, or Azure OpenAI) and a **Reveal SDK
license** — the app collects both in a first-run dialog, so there's nothing to put in a file.

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

The images aren't published anywhere, so Compose builds the app from source on the first run (a few
minutes, plus a one-time database seed); after that it starts in seconds. Then:

1. Open **<http://localhost:8111>** — a setup dialog appears.
2. Pick your **AI provider** (OpenAI, Anthropic, or Azure OpenAI), enter its **API key** and your
   **Reveal SDK license**, then **Save** — the app applies them and restarts once (a few seconds).
3. Ask a question, e.g. *"Show total profit by region."*

Keys are saved encrypted in a Docker volume, so you only enter them once. Change dataset (top-left)
or model/key (the **gear** icon) anytime.

```bash
docker compose -f docker-compose.app.yml down       # stop — keeps keys + data
docker compose -f docker-compose.app.yml down -v    # stop + wipe everything
```

---

## Run from source

Three parts run independently and stay decoupled — the **database** (Docker), the **client** (Vite
dev server), and the **server** (ASP.NET, where you debug). Start each once, in its own terminal.

**Prerequisites:** [.NET 8 SDK](https://dotnet.microsoft.com/download) ·
[Node 18+](https://nodejs.org) ·
[Docker Desktop](https://www.docker.com/products/docker-desktop/) (running).

**1 — Database** (Postgres in Docker; seeds ~22k rows on first run, instant after):

```bash
docker compose -f docker-compose.db.yml up -d
```

**2 — Server** (ASP.NET API on **:7654**, with the debugger). Pick one:

- **Visual Studio** — open `server/aspnet/RevealAIChat.Server.sln` and press **F5**.
- **VS Code** — open this folder and press **F5** (*Run Reveal AI Chat (ASP.NET server)*).
- **CLI** — `dotnet run --project server/aspnet/RevealAIChat.Server`.

F5 builds and runs **only the server** — set breakpoints and they hit on the next request.

**3 — Client** (Vite dev server with hot reload, on **<http://localhost:5173>**):

```bash
cd client
npm install        # first time only
npm run dev
```

**Open <http://localhost:5173>** — that's the app. It calls the server directly at
**<http://localhost:7654>** (cross-origin, allowed in Development), and client edits hot-reload here
instantly with no server restart. Paste your keys in the first-run dialog (saved encrypted under
`.reveal-ai-chat-config/`, gitignored).

<details><summary><b>Provide keys via user-secrets instead of the dialog</b></summary>

```bash
dotnet user-secrets --project server/aspnet/RevealAIChat.Server set "RevealAI:ApiKey" "your-api-key"
dotnet user-secrets --project server/aspnet/RevealAIChat.Server set "RevealAI:Provider" "OpenAI"        # or Anthropic / AzureOpenAI
dotnet user-secrets --project server/aspnet/RevealAIChat.Server set "Reveal:License" "your-license"     # if not already licensed
```

Most dev boxes with the Reveal tooling are already licensed (`~/.revealbi-sdk/license.key`), so
you'll usually only need the AI provider key.
</details>

---

## Debugging

- **Breakpoints** — F5 attaches the debugger to the ASP.NET host. Good places to start:
  - `Program.cs` — startup, key/license resolution, and Reveal + Reveal AI registration.
  - `Reveal/DataSourceProvider.cs` + `Reveal/AuthenticationProvider.cs` — where Reveal connects to Postgres.
  - `Setup/` — the controllers behind the first-run key dialogs.
- **API explorer** — Swagger UI is at **<http://localhost:7654/swagger>** (Development).
- **Client hot reload** — the Vite dev server (`npm run dev`, step 3 above) hot-reloads client edits
  on :5173 with no server restart. It connects to the server at the URL in
  `client/src/lib/serverUrl.ts` (default :7654 — must match the server's `applicationUrl`). Override
  it with `VITE_SERVER_URL` (e.g. for the coming Node/Java hosts) without editing the file.
- **Database** — connect any SQL client to `localhost:5432` (db `revealaichat`, user `reveal`,
  password `reveal_ai_chat`). Wipe + reseed with `docker compose -f docker-compose.db.yml down -v`.
- **AI metadata** — the tables the AI may use are listed in `Reveal/Metadata/catalog.json`. The
  SDK caches generated metadata per datasource under `%LOCALAPPDATA%/reveal/ai/metadata`; delete
  that folder to force a clean regenerate. Regenerate at runtime with
  `POST /api/reveal/ai/metadata/generate { "forceRegeneration": true }`.

---

## How it's wired

In **development** the three parts run side by side and stay decoupled:

```
client/ (Vite dev, :5173)  ──cross-origin──▶  server/aspnet (ASP.NET, :7654)  ──▶  Postgres (db/, Docker)
   the UI, hot-reloaded                         Reveal / Reveal AI APIs              docker-compose.db.yml
```

- **Dev: separate processes.** F5 builds and runs only the server. The client (`npm run dev`) and
  Postgres (`docker compose -f docker-compose.db.yml up -d`) are started separately; the client calls the server directly at
  its URL (cross-origin, allowed by the server's Development CORS policy).
- **Packaged: one host, same origin.** The Docker image builds `client/` into the server's `wwwroot`
  at image-build time, so the shipped app is a single container serving UI + APIs — no second port,
  no CORS.
- **Keys are never committed.** They come from the encrypted first-run store, user-secrets, or
  env vars — never from source or the image.

## Changing the data

Seed scripts in `db/seed/*.sql` are generated from the Excel files in `db/source/*.xlsx`:

```bash
cd db
npm install && npm run gen                           # source/*.xlsx -> seed/*.sql
docker compose -f ../docker-compose.db.yml down -v      # wipe the dev volume
docker compose -f ../docker-compose.db.yml up -d        # reseed on next boot
```

(After changing the seed, rebuild the Docker images so `docker-compose.app.yml` picks it up.)
