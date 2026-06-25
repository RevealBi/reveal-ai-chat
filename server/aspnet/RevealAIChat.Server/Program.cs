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
builder.Services.AddSingleton(sp => new KeyStore(configDir, KeyStore.DiProtector(sp.GetRequiredService<IDataProtectionProvider>())));

string? license = Pick(builder.Configuration["Reveal:License"],
                       ReadFileOrNull(builder.Configuration["Reveal:LicenseFile"]),
                       saved.RevealLicense);
var nativeLicense = File.Exists(Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".revealbi-sdk", "license.key"));
// The AI provider + key are captured in the same first-run setup dialog as the license and
// applied at startup (the SDK configures the provider during boot). Resolve them from config
// or the encrypted store. Provider = "OpenAI" | "Anthropic" | "AzureOpenAI".
var aiKeys = new AppKeys
{
    Provider   = Pick(builder.Configuration["RevealAI:Provider"], saved.Provider) ?? "OpenAI",
    Model      = Pick(builder.Configuration["RevealAI:Model"], saved.Model),
    ApiKey     = Pick(builder.Configuration["RevealAI:ApiKey"], saved.ApiKey),
    Endpoint   = Pick(builder.Configuration["RevealAI:Endpoint"], saved.Endpoint),
    Deployment = Pick(builder.Configuration["RevealAI:Deployment"], saved.Deployment),
};

var haveLicense = !string.IsNullOrWhiteSpace(license) || nativeLicense;
var haveAiKey = !string.IsNullOrWhiteSpace(aiKeys.ApiKey);
// Full mode needs BOTH a Reveal license and an AI provider key.
var configured = haveLicense && haveAiKey;
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
            rb.DataSources.RegisterPostgreSQL();
            if (!string.IsNullOrWhiteSpace(license))
                rb.AddSettings(s => s.License = license); // else the SDK reads its native file
        });

        // -- Reveal AI: ONE governed engine behind Chat (Ask) and Insights (Explain) --------
        // The chosen provider is wired with the SDK's own built-in extension — that single call
        // is the whole integration. Only the active provider is configured; switching providers
        // re-runs this at startup (the setup dialog restarts the app).
        var revealAi = builder.Services.AddRevealAI()
            .UseMetadataCatalogFile(Path.Combine(builder.Environment.ContentRootPath, "Reveal", "Metadata", "catalog.json"));

        switch ((aiKeys.Provider ?? "OpenAI").ToLowerInvariant())
        {
            case "anthropic":
                revealAi.AddAnthropic(s => { s.ApiKey = aiKeys.ApiKey!; s.Model = aiKeys.Model ?? "claude-sonnet-4-6"; s.MaxTokens = 8000; });
                break;
            case "azureopenai":
            case "azure":
                revealAi.AddAzureOpenAI(s => { s.ApiKey = aiKeys.ApiKey!; s.Endpoint = aiKeys.Endpoint!; s.DeploymentName = (aiKeys.Deployment ?? aiKeys.Model)!; });
                break;
            default: // OpenAI — also local / OpenAI-compatible endpoints via Endpoint
                revealAi.AddOpenAI(s => { s.ApiKey = aiKeys.ApiKey!; s.Model = aiKeys.Model ?? "gpt-5.5"; if (!string.IsNullOrWhiteSpace(aiKeys.Endpoint)) s.Endpoint = aiKeys.Endpoint; });
                break;
        }
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

builder.Services.AddSingleton(new SetupState(
    Configured: configured,
    LicenseError: licenseError,
    LicenseNeeded: !haveLicense,
    Provider: aiKeys.Provider ?? "OpenAI",
    Model: aiKeys.Model,
    Endpoint: aiKeys.Endpoint,
    Deployment: aiKeys.Deployment,
    HasKey: haveAiKey));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Dev-only CORS so the Vite dev server (http://localhost:5173) can reach the API.
builder.Services.AddCors(o => o.AddPolicy("Dev", p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));

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

// Serve the built React client (wwwroot) alongside the API — same origin.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthorization();
app.MapControllers();

// SPA fallback: any non-API route returns index.html so client-side routing works.
app.MapFallbackToFile("index.html");

app.Run();

static string? Pick(params string?[] values) => values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));
static string? ReadFileOrNull(string? path) => !string.IsNullOrWhiteSpace(path) && File.Exists(path) ? File.ReadAllText(path).Trim() : null;
