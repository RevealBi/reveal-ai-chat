using Microsoft.AspNetCore.DataProtection;
using Reveal.Sdk;
using Reveal.Sdk.AI;
using Reveal.Sdk.Data;
using RevealAIChat.Server.Reveal;
using RevealAIChat.Server.Setup;

var builder = WebApplication.CreateBuilder(args);

// Postgres connection (see docker-compose.yml); overridable via the "Database" section.
DbConfig.Load(builder.Configuration);

// ---------------------------------------------------------------------------
// Keys / first-run setup
//   Keys (Reveal license + LLM provider / model / API key) resolve in order:
//   explicit config (env / user-secrets) -> the encrypted store written by the in-app
//   Settings dialog -> (for the license only) the SDK's native ~/.revealbi-sdk/license.key.
//   If we don't end up with BOTH a license and an API key we boot in SETUP MODE: serve the
//   client + /api/setup only (no Reveal). The client shows the dialog; on submit we persist
//   (encrypted) and restart into full mode.
// ---------------------------------------------------------------------------
var configDir = builder.Configuration["Setup:ConfigDir"]
    ?? Path.Combine(builder.Environment.ContentRootPath, ".reveal-ai-chat-config");

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(configDir, "dp-keys")))
    .SetApplicationName("RevealAIChat");

var saved = new KeyStore(configDir, KeyStore.StartupProtector(configDir)).Load();
builder.Services.AddSingleton(sp =>
    new KeyStore(configDir, KeyStore.DiProtector(sp.GetRequiredService<IDataProtectionProvider>())));

string? license = Pick(builder.Configuration["Reveal:License"],
                       ReadFileOrNull(builder.Configuration["Reveal:LicenseFile"]),
                       saved.RevealLicense);
var nativeLicense = File.Exists(Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".revealbi-sdk", "license.key"));
// Full mode is gated on the LICENSE only. The AI provider / model / key are RUNTIME
// settings (swappable in the in-app Settings dialog with no restart) — seeded here from
// config or the encrypted store, then read live by RuntimeAiProvider on every call.
var runtimeAi = new RuntimeAiSettings(new AppKeys
{
    Provider = builder.Configuration["RevealAI:Provider"] ?? saved.Provider ?? "OpenAI",
    Model = builder.Configuration["RevealAI:OpenAI:Model"] ?? saved.Model ?? "gpt-4.1",
    ApiKey = Pick(builder.Configuration["RevealAI:OpenAI:ApiKey"], saved.ApiKey),
    Endpoint = builder.Configuration["RevealAI:OpenAI:Endpoint"] ?? saved.Endpoint,
});
builder.Services.AddSingleton(runtimeAi);

var configured = !string.IsNullOrWhiteSpace(license) || nativeLicense;
var licenseError = false;

var mvc = builder.Services.AddControllers(); // always — discovers SetupController

if (configured)
{
    try
    {
        // -- Reveal SDK: embedded analytics (data sources + dashboards) ----------------
        mvc.AddReveal(rb =>
        {
            rb.AddDataSourceProvider<DataSourceProvider>();
            rb.AddAuthenticationProvider<AuthenticationProvider>();
            // Connectors register lazily (first dashboard request) but AI metadata
            // generation runs at startup, so register Postgres up front.
            rb.DataSources.RegisterPostgreSQL();
            if (!string.IsNullOrWhiteSpace(license))
                rb.AddSettings(s => s.License = license); // else the SDK reads its native file
        });

        // -- Reveal AI: ONE governed engine behind Chat (Ask) AND Insights (Explain) ----
        // BYO key: the SDK calls YOUR model with YOUR key; it only ever sees governed query
        // results, never raw rows or SQL.
        var ai = builder.Services.AddRevealAI()
            .UseMetadataCatalogFile(Path.Combine(
                builder.Environment.ContentRootPath, "Reveal", "Metadata", "catalog.json"));

        // A single runtime provider, registered under the default key ("openai"). It reads
        // the live RuntimeAiSettings on EVERY call, so the Settings dialog can change the
        // provider / model / key at runtime with no restart. OpenAI here also covers local /
        // OpenAI-compatible endpoints (Ollama, LM Studio, vLLM).
        ai.AddProvider("openai", sp => new RuntimeAiProvider(sp.GetRequiredService<RuntimeAiSettings>()));
    }
    catch (Exception ex)
    {
        // Almost always an invalid license. Fall back to setup mode rather than crash-loop
        // on a persisted bad key — the dialog reappears with an error.
        configured = false;
        licenseError = true;
        Console.Error.WriteLine($"[setup] Reveal initialization failed; entering setup mode: {ex.Message}");
    }
}

builder.Services.AddSingleton(new SetupState(configured, licenseError));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Dev-only CORS so the Vite dev server (http://localhost:5173) can reach the API.
builder.Services.AddCors(o => o.AddPolicy("Dev",
    p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // F5 = everything up: bring the Postgres container up (+ seed it once) before serving.
    // Only in full mode — no point starting the DB while we're just collecting keys.
    if (configured)
        await DevDatabase.EnsureUpAsync(app.Environment.ContentRootPath, app.Logger);

    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("Dev");
}

// Reveal AI caches generated metadata per datasource under %LOCALAPPDATA%/reveal/ai/metadata,
// keyed by datasource id and NOT invalidated when the catalog's database changes. Drop any
// datasource whose cache points at a different database so it regenerates cleanly — otherwise the
// stale index is reused and chat fails with "The given key '<database>' was not present in the
// dictionary." Runs before the AI metadata generator (a hosted service) starts; no-op on a fresh
// machine or in the Docker image.
if (configured)
    MetadataCache.ClearStaleForDatabase(
        Path.Combine(app.Environment.ContentRootPath, "Reveal", "Metadata", "catalog.json"),
        DbConfig.Database, app.Logger);

// Serve the built React client (wwwroot) alongside the API — same origin.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

// SPA fallback: any non-API route returns index.html so client-side routing works.
app.MapFallbackToFile("index.html");

app.Run();

static string? Pick(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
static string? ReadFileOrNull(string? path) =>
    !string.IsNullOrWhiteSpace(path) && File.Exists(path) ? File.ReadAllText(path).Trim() : null;
