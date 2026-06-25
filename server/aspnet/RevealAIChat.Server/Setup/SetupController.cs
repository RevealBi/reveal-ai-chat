using Microsoft.AspNetCore.Mvc;

namespace RevealAIChat.Server.Setup
{
    /// <summary>
    /// First-run setup. The Reveal license and the AI provider/key are both applied at startup
    /// (the SDK and its provider are configured during boot), so when either is missing the app
    /// runs in setup mode: the client shows one dialog and POSTs here. We persist the values
    /// (encrypted) and restart so Reveal + the chosen provider initialize. A license already
    /// supplied via env / a file / the native SDK license isn't asked for again.
    /// </summary>
    [ApiController]
    [Route("api/setup")]
    public sealed class SetupController : ControllerBase
    {
        private readonly KeyStore _store;
        private readonly SetupState _state;

        public SetupController(KeyStore store, SetupState state)
        {
            _store = store;
            _state = state;
        }

        [HttpGet("status")]
        public IActionResult Status() => Ok(new
        {
            configured = _state.Configured,
            licenseError = _state.LicenseError,
            licenseNeeded = _state.LicenseNeeded,
            provider = _state.Provider,
            model = _state.Model,
            endpoint = _state.Endpoint,
            deployment = _state.Deployment,
            hasKey = _state.HasKey,
        });

        [HttpPost]
        public IActionResult Save([FromBody] SetupRequest req)
        {
            var keys = _store.Load();

            // License: required only when the client was told it's needed and we don't already
            // have one stored. A blank value when a license already exists is fine — keep it.
            if (!string.IsNullOrWhiteSpace(req.License))
                keys.RevealLicense = req.License.Trim();
            if (_state.LicenseNeeded && string.IsNullOrWhiteSpace(keys.RevealLicense))
                return BadRequest(new { error = "A Reveal license is required." });

            // AI provider + connection settings.
            keys.Provider = string.IsNullOrWhiteSpace(req.Provider) ? "OpenAI" : req.Provider.Trim();
            keys.Model = string.IsNullOrWhiteSpace(req.Model) ? null : req.Model.Trim();
            keys.Endpoint = string.IsNullOrWhiteSpace(req.Endpoint) ? null : req.Endpoint.Trim();
            keys.Deployment = string.IsNullOrWhiteSpace(req.Deployment) ? null : req.Deployment.Trim();
            // A blank key keeps the existing one (so you can change model/endpoint without re-typing it).
            if (!string.IsNullOrWhiteSpace(req.ApiKey))
                keys.ApiKey = req.ApiKey.Trim();

            if (string.IsNullOrWhiteSpace(keys.ApiKey))
                return BadRequest(new { error = "An API key is required for the selected provider." });
            if (keys.Provider.Equals("AzureOpenAI", StringComparison.OrdinalIgnoreCase) &&
                (string.IsNullOrWhiteSpace(keys.Endpoint) || string.IsNullOrWhiteSpace(keys.Deployment)))
                return BadRequest(new { error = "Azure OpenAI needs an endpoint and a deployment name." });

            _store.Save(keys);

            // Reveal + the provider initialize at startup, so apply by restarting. Docker's
            // restart policy brings the container right back; the client polls status and reloads.
            _ = Task.Run(async () => { await Task.Delay(700); Environment.Exit(0); });
            return Ok(new { restarting = true });
        }
    }

    public sealed class SetupRequest
    {
        public string? License { get; set; }
        public string? Provider { get; set; }
        public string? ApiKey { get; set; }
        public string? Model { get; set; }
        public string? Endpoint { get; set; }
        public string? Deployment { get; set; }
    }
}
